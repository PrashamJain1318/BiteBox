import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load canonical products database
let canonicalProducts = [];
try {
  const productsFile = path.join(__dirname, '../data/products.json');
  if (fs.existsSync(productsFile)) {
    canonicalProducts = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
  }
} catch (err) {
  console.warn('⚠️ Could not load canonical products.json, using payload fallback:', err.message);
}

/**
 * Calculates and validates server-side pricing for an order or cart items.
 *
 * @param {Array} items - List of items in the cart [{ productId, quantity, name, price, img, ... }]
 * @param {Object} [coupon] - Coupon object if applied { code, discountType, discountValue, maxDiscount, ... }
 * @returns {Object} { sanitizedItems, pricing: { itemTotal, packagingCharges, deliveryFee, taxes, discount, grandTotal } }
 */
export function calculateOrderPricing(items = [], coupon = null) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      sanitizedItems: [],
      pricing: {
        itemTotal: 0,
        packagingCharges: 0,
        deliveryFee: 0,
        taxes: 0,
        discount: 0,
        grandTotal: 0,
      },
    };
  }

  let itemTotal = 0;
  const sanitizedItems = items.map((item) => {
    const rawId = String(item.productId || item.id || '');
    const canonical = canonicalProducts.find(
      (p) => String(p.id) === rawId || (p.name && item.name && p.name.toLowerCase() === item.name.toLowerCase())
    );

    // Prioritize canonical verified price to prevent client tampering
    const unitPrice = canonical ? Number(canonical.price) : Math.max(0, Number(item.price) || 0);
    const quantity = Math.max(1, Math.floor(Number(item.quantity || item.qty) || 1));
    const lineTotal = unitPrice * quantity;
    itemTotal += lineTotal;

    return {
      productId: rawId || (canonical ? String(canonical.id) : 'custom-item'),
      name: canonical ? canonical.name : (item.name || 'BiteBox Food Item'),
      price: unitPrice,
      quantity,
      image: canonical ? canonical.img : (item.image || item.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'),
      restaurantName: item.restaurantName || (canonical && canonical.restaurant) || 'BiteBox Partner Kitchen',
      itemTotal: lineTotal,
    };
  });

  // Base charges
  const packagingCharges = itemTotal > 0 ? 25 : 0;
  let deliveryFee = itemTotal >= 500 || itemTotal === 0 ? 0 : 40;
  const taxes = Math.round(itemTotal * 0.05); // 5% GST

  let discount = 0;
  let freeDeliveryDiscount = 0;

  if (coupon && itemTotal > 0) {
    if (coupon.discountType === 'free_delivery') {
      // Free delivery coupon cancels the delivery fee
      freeDeliveryDiscount = deliveryFee;
      discount = freeDeliveryDiscount;
      deliveryFee = 0;
    } else if (coupon.discountType === 'percentage') {
      let rawDiscount = (itemTotal * (Number(coupon.discountValue) || 0)) / 100;
      if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
        rawDiscount = Math.min(rawDiscount, Number(coupon.maxDiscount));
      }
      discount = Math.min(Math.round(rawDiscount), itemTotal);
    } else if (coupon.discountType === 'flat') {
      const flatVal = Number(coupon.discountValue) || 0;
      discount = Math.min(flatVal, itemTotal);
    }
  }

  const grandTotal = Math.max(
    0,
    itemTotal + packagingCharges + deliveryFee + taxes - discount
  );

  return {
    sanitizedItems,
    pricing: {
      itemTotal,
      packagingCharges,
      deliveryFee,
      taxes,
      discount,
      grandTotal,
    },
  };
}
