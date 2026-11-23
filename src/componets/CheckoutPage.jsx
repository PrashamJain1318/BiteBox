import { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartContext } from '../context/cartContext'
import { useAuth } from '../context/AuthContext'
import '../style.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

// Helper to dynamically load Razorpay checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true)
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const { cart, setCart } = useContext(CartContext)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Addresses
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)
  const [newAddress, setNewAddress] = useState({
    fullName: user?.name || '',
    phone: '',
    tag: 'Home',
    addressLine: '',
    area: '',
    city: 'Mumbai',
    pincode: '',
    isDefault: true,
  })

  // Payment Method Selection
  // 'upi_qr' | 'upi_app' | 'card' | 'netbanking' | 'cod'
  const [paymentMethod, setPaymentMethod] = useState('upi_qr')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Applied Coupon from session
  const appliedCoupon = (() => {
    try {
      const saved = sessionStorage.getItem('bitebox_applied_coupon')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })()

  // Calculate prices
  const itemTotal = cart.reduce((total, item) => total + item.price * (item.qty || 1), 0)
  const totalItems = cart.reduce((total, item) => total + (item.qty || 1), 0)
  const packagingCharges = itemTotal > 0 ? 25 : 0
  const isFreeDelivery = itemTotal >= 500
  let deliveryFee = itemTotal === 0 || isFreeDelivery ? 0 : 40

  let discountAmount = 0
  if (appliedCoupon && itemTotal > 0) {
    if (appliedCoupon.discountType === 'free_delivery') {
      discountAmount = deliveryFee
      deliveryFee = 0
    } else if (appliedCoupon.discountType === 'percentage') {
      const raw = (itemTotal * (appliedCoupon.discountValue || 0)) / 100
      discountAmount = appliedCoupon.maxDiscount
        ? Math.min(Math.round(raw), appliedCoupon.maxDiscount)
        : Math.round(raw)
      discountAmount = Math.min(discountAmount, itemTotal)
    } else if (appliedCoupon.discountType === 'flat') {
      discountAmount = Math.min(appliedCoupon.discountValue || 0, itemTotal)
    }
  }

  const taxes = Math.round(itemTotal * 0.05)
  const grandTotal = Math.max(0, itemTotal + packagingCharges + deliveryFee + taxes - discountAmount)

  // Fetch saved delivery addresses
  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/addresses`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
          setAddresses(data.addresses)
          const defaultAddr = data.addresses.find((a) => a.isDefault) || data.addresses[0]
          setSelectedAddressId(defaultAddr._id || defaultAddr.id)
        } else {
          // Provide sample preset addresses for instant testing
          const demoAddrs = [
            {
              _id: 'demo-addr-1',
              fullName: user?.name || 'Prasham Jain',
              phone: '9876543210',
              tag: 'Home',
              addressLine: 'A-402, Sunshine Heights, Linking Road',
              area: 'Bandra West',
              city: 'Mumbai',
              pincode: '400050',
              isDefault: true,
            },
            {
              _id: 'demo-addr-2',
              fullName: user?.name || 'Prasham Jain',
              phone: '9876543210',
              tag: 'Work',
              addressLine: 'Tech Hub Office, 7th Floor, BKC Avenue',
              area: 'Bandra Kurla Complex',
              city: 'Mumbai',
              pincode: '400051',
              isDefault: false,
            },
          ]
          setAddresses(demoAddrs)
          setSelectedAddressId('demo-addr-1')
        }
      })
      .catch(() => {
        // Fallback default address
        const fallback = [
          {
            _id: 'fallback-1',
            fullName: user?.name || 'Customer',
            phone: '9876543210',
            tag: 'Home',
            addressLine: 'Flat 12B, Palm View Apts',
            area: 'Andheri West',
            city: 'Mumbai',
            pincode: '400053',
            isDefault: true,
          },
        ]
        setAddresses(fallback)
        setSelectedAddressId('fallback-1')
      })
  }, [user])

  // Save new address handler
  async function handleSaveNewAddress(e) {
    e.preventDefault()
    if (!newAddress.fullName || !newAddress.phone || !newAddress.addressLine || !newAddress.area || !newAddress.pincode) {
      alert('Please fill in all address fields.')
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newAddress),
      })
      const data = await res.json()
      if (data.success && data.addresses) {
        setAddresses(data.addresses)
        const added = data.addresses[data.addresses.length - 1]
        setSelectedAddressId(added._id || added.id)
      } else {
        const localNew = { ...newAddress, _id: `local-addr-${Date.now()}` }
        setAddresses([...addresses, localNew])
        setSelectedAddressId(localNew._id)
      }
      setShowAddAddressModal(false)
    } catch {
      const localNew = { ...newAddress, _id: `local-addr-${Date.now()}` }
      setAddresses([...addresses, localNew])
      setSelectedAddressId(localNew._id)
      setShowAddAddressModal(false)
    }
  }

  // Selected address object
  const activeAddress = addresses.find((a) => (a._id || a.id) === selectedAddressId) || addresses[0]

  // Main Place Order & Payment Handler
  async function handlePlaceOrder() {
    if (cart.length === 0) {
      navigate('/cart')
      return
    }

    if (!activeAddress) {
      setErrorMessage('Please select or add a delivery address.')
      return
    }

    setIsProcessing(true)
    setErrorMessage('')

    try {
      // 1. Create order on backend
      const res = await fetch(`${API_BASE_URL}/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.id,
            quantity: i.qty || 1,
            name: i.name,
            price: i.price,
            image: i.img,
            restaurantName: i.restaurantName,
          })),
          deliveryAddress: activeAddress,
          couponCode: appliedCoupon?.code,
          paymentMethod,
        }),
      })

      const data = await res.json()

      if (!data.success || !data.order) {
        setErrorMessage(data.message || 'Failed to place order. Please try again.')
        setIsProcessing(false)
        return
      }

      const order = data.order

      // 2A. Cash on Delivery (COD) Flow
      if (paymentMethod === 'cod') {
        // Clear cart
        setCart([])
        localStorage.removeItem('bitebox_cart')
        sessionStorage.removeItem('bitebox_applied_coupon')
        navigate(`/order-success/${order.orderId}`, { state: { order } })
        return
      }

      // 2B. Online Payment via Razorpay (UPI, QR, Cards, NetBanking)
      const isScriptLoaded = await loadRazorpayScript()

      if (!isScriptLoaded || !window.Razorpay) {
        console.warn('⚠️ Razorpay SDK script failed to load from CDN. Using test mode confirmation.')
        // Test simulated verification fallback
        handleSimulatedVerification(order)
        return
      }

      const razorpayOrder = data.razorpayOrder || {
        id: `order_test_${Date.now()}`,
        amount: Math.round(grandTotal * 100),
        currency: 'INR',
        keyId: import.meta.env.VITE_RAZORPAY_KEY_ID,
      }

      const options = {
        key: razorpayOrder.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'BiteBox Food Ordering',
        description: `Order ${order.orderId} Payment (${paymentMethod.toUpperCase()})`,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80',
        order_id: razorpayOrder.id,
        handler: async function (response) {
          // Cryptographic verification on backend
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/v1/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                orderId: order.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()

            if (verifyData.success) {
              setCart([])
              localStorage.removeItem('bitebox_cart')
              sessionStorage.removeItem('bitebox_applied_coupon')
              navigate(`/order-success/${order.orderId}`, { state: { order: verifyData.order || order } })
            } else {
              navigate(`/payment-status?status=failed&orderId=${order.orderId}&error=${encodeURIComponent(verifyData.message)}`)
            }
          } catch (vErr) {
            navigate(`/payment-status?status=failed&orderId=${order.orderId}&error=VerificationNetworkError`)
          }
        },
        prefill: {
          name: activeAddress.fullName || user?.name || 'BiteBox Customer',
          email: user?.email || 'customer@bitebox.com',
          contact: activeAddress.phone || '9876543210',
        },
        notes: {
          biteboxOrderId: order.orderId,
          paymentMethod,
        },
        theme: {
          color: '#FC8019',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
          },
        },
      }

      const rzpInstance = new window.Razorpay(options)

      rzpInstance.on('payment.failed', function (response) {
        setIsProcessing(false)
        navigate(
          `/payment-status?status=failed&orderId=${order.orderId}&error=${encodeURIComponent(
            response.error.description || 'Payment was declined.'
          )}`
        )
      })

      rzpInstance.open()
    } catch (err) {
      console.error('Checkout error:', err)
      setErrorMessage('Network or server error during checkout. Please try again.')
      setIsProcessing(false)
    }
  }

  // Simulated verification for test environments
  async function handleSimulatedVerification(order) {
    try {
      const verifyRes = await fetch(`${API_BASE_URL}/v1/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: order.orderId,
          razorpay_order_id: order.razorpayOrderId || `order_test_${Date.now()}`,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'simulated_test_signature',
        }),
      })
      const verifyData = await verifyRes.json()
      if (verifyData.success) {
        setCart([])
        localStorage.removeItem('bitebox_cart')
        sessionStorage.removeItem('bitebox_applied_coupon')
        navigate(`/order-success/${order.orderId}`, { state: { order: verifyData.order || order } })
      } else {
        navigate(`/payment-status?status=failed&orderId=${order.orderId}`)
      }
    } catch {
      setIsProcessing(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-empty">
          <h2>No items in cart</h2>
          <p>Please add delicious food to your cart before proceeding to checkout.</p>
          <Link to="/" className="cart-empty__btn">
            Browse Menu
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page-container">
      {/* Checkout Steps Progress Banner */}
      <div className="checkout-stepper-header">
        <div className="step-item completed">
          <span className="step-num">1</span>
          <span className="step-text">Cart Summary</span>
        </div>
        <div className="step-sep active" />
        <div className="step-item active">
          <span className="step-num">2</span>
          <span className="step-text">Delivery & Payment</span>
        </div>
        <div className="step-sep" />
        <div className="step-item pending">
          <span className="step-num">3</span>
          <span className="step-text">Order Confirmed</span>
        </div>
      </div>

      <div className="checkout-layout-grid">
        {/* Left Column: Address & Payment Selection */}
        <div className="checkout-main-content">
          {/* SECTION 1: DELIVERY ADDRESS */}
          <section className="checkout-card address-card">
            <div className="checkout-card-header">
              <div className="card-header-title">
                <span className="step-badge">1</span>
                <h3>Select Delivery Address</h3>
              </div>
              <button
                type="button"
                className="add-new-addr-btn"
                onClick={() => setShowAddAddressModal(true)}
              >
                + Add New Address
              </button>
            </div>

            <div className="address-options-grid">
              {addresses.map((addr) => {
                const isSelected = (addr._id || addr.id) === selectedAddressId
                return (
                  <div
                    key={addr._id || addr.id}
                    className={`address-option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedAddressId(addr._id || addr.id)}
                  >
                    <div className="addr-tag-row">
                      <span className={`addr-tag ${addr.tag?.toLowerCase() || 'home'}`}>
                        {addr.tag === 'Work' ? '🏢 Work' : addr.tag === 'Other' ? '📍 Other' : '🏠 Home'}
                      </span>
                      {isSelected && <span className="selected-check">✓ Delivering Here</span>}
                    </div>
                    <h4 className="addr-recipient">{addr.fullName}</h4>
                    <p className="addr-line">{addr.addressLine}, {addr.area}</p>
                    <p className="addr-city">{addr.city} - {addr.pincode}</p>
                    <p className="addr-phone">📞 {addr.phone}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* SECTION 2: PAYMENT METHOD SELECTION */}
          <section className="checkout-card payment-card">
            <div className="checkout-card-header">
              <div className="card-header-title">
                <span className="step-badge">2</span>
                <h3>Select Payment Method</h3>
              </div>
              <span className="secure-gateway-tag">🔒 Razorpay Secure</span>
            </div>

            <div className="payment-options-list">
              {/* Option 1: UPI QR Code */}
              <label className={`payment-method-row ${paymentMethod === 'upi_qr' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi_qr"
                  checked={paymentMethod === 'upi_qr'}
                  onChange={() => setPaymentMethod('upi_qr')}
                />
                <div className="payment-method-icon qr-icon">📱</div>
                <div className="payment-method-info">
                  <div className="payment-method-title">
                    <strong>UPI QR Code</strong>
                    <span className="recommended-badge">Fastest</span>
                  </div>
                  <p className="payment-method-desc">
                    Scan dynamic Razorpay QR with Google Pay, PhonePe, Paytm or BHIM app
                  </p>
                </div>
              </label>

              {/* Option 2: UPI Apps */}
              <label className={`payment-method-row ${paymentMethod === 'upi_app' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi_app"
                  checked={paymentMethod === 'upi_app'}
                  onChange={() => setPaymentMethod('upi_app')}
                />
                <div className="payment-method-icon">⚡</div>
                <div className="payment-method-info">
                  <div className="payment-method-title">
                    <strong>UPI App (GPay / PhonePe / Paytm / BHIM)</strong>
                  </div>
                  <p className="payment-method-desc">
                    Instant app-to-app UPI payment authorization via secure gateway
                  </p>
                </div>
              </label>

              {/* Option 3: Credit Card */}
              <label className={`payment-method-row ${paymentMethod === 'card' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <div className="payment-method-icon">💳</div>
                <div className="payment-method-info">
                  <div className="payment-method-title">
                    <strong>Credit / Debit Card</strong>
                  </div>
                  <p className="payment-method-desc">
                    Visa, MasterCard, RuPay, Maestro. Secured via 256-bit Razorpay encryption.
                  </p>
                </div>
              </label>

              {/* Option 4: Net Banking */}
              <label className={`payment-method-row ${paymentMethod === 'netbanking' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="netbanking"
                  checked={paymentMethod === 'netbanking'}
                  onChange={() => setPaymentMethod('netbanking')}
                />
                <div className="payment-method-icon">🏛️</div>
                <div className="payment-method-info">
                  <div className="payment-method-title">
                    <strong>Net Banking</strong>
                  </div>
                  <p className="payment-method-desc">
                    HDFC, ICICI, SBI, Axis, Kotak and 50+ supported Indian banks
                  </p>
                </div>
              </label>

              {/* Option 5: Cash on Delivery (COD) */}
              <label className={`payment-method-row ${paymentMethod === 'cod' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div className="payment-method-icon">💵</div>
                <div className="payment-method-info">
                  <div className="payment-method-title">
                    <strong>Cash on Delivery (COD)</strong>
                  </div>
                  <p className="payment-method-desc">
                    Pay in cash or via UPI to our delivery partner upon food delivery
                  </p>
                </div>
              </label>
            </div>

            {errorMessage && (
              <div className="checkout-error-banner">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Place Order CTA Button */}
            <button
              type="button"
              className="place-order-btn"
              disabled={isProcessing}
              onClick={handlePlaceOrder}
            >
              {isProcessing
                ? 'Processing Payment...'
                : paymentMethod === 'cod'
                ? `Place Order (Cash on Delivery) • ₹${grandTotal}`
                : `Pay ₹${grandTotal} via ${
                    paymentMethod === 'upi_qr'
                      ? 'UPI QR Code'
                      : paymentMethod === 'upi_app'
                      ? 'UPI'
                      : paymentMethod === 'card'
                      ? 'Card'
                      : 'Net Banking'
                  }`}
            </button>
          </section>
        </div>

        {/* Right Column: Order Summary Card */}
        <aside className="checkout-summary-sidebar">
          <div className="checkout-summary-card">
            <h3 className="summary-title">Order Summary ({totalItems} items)</h3>

            <div className="checkout-items-preview">
              {cart.map((item) => (
                <div key={item.id} className="preview-item-row">
                  <div className="preview-item-left">
                    <img src={item.img} alt={item.name} className="preview-item-thumb" />
                    <div>
                      <h5 className="preview-item-name">{item.name}</h5>
                      <span className="preview-item-qty">Qty: {item.qty || 1} × ₹{item.price}</span>
                    </div>
                  </div>
                  <span className="preview-item-price">₹{item.price * (item.qty || 1)}</span>
                </div>
              ))}
            </div>

            <div className="summary-divider" />

            <div className="summary-line-row">
              <span>Item Total</span>
              <span>₹{itemTotal}</span>
            </div>

            <div className="summary-line-row">
              <span>Restaurant Packaging</span>
              <span>₹{packagingCharges}</span>
            </div>

            <div className="summary-line-row">
              <span>Delivery Fee</span>
              {deliveryFee === 0 ? (
                <span className="free-badge">FREE</span>
              ) : (
                <span>₹{deliveryFee}</span>
              )}
            </div>

            <div className="summary-line-row">
              <span>Taxes (GST 5%)</span>
              <span>₹{taxes}</span>
            </div>

            {discountAmount > 0 && (
              <div className="summary-line-row discount">
                <span>Coupon ({appliedCoupon?.code})</span>
                <span className="discount-tag">-₹{discountAmount}</span>
              </div>
            )}

            <div className="summary-divider" />

            <div className="summary-line-row grand-total">
              <strong>Grand Total</strong>
              <strong className="grand-price">₹{grandTotal}</strong>
            </div>

            {discountAmount > 0 && (
              <div className="checkout-savings-pill">
                ✨ Total Savings on this Order: ₹{discountAmount}
              </div>
            )}

            <div className="delivery-destination-box">
              <span className="dest-icon">📍</span>
              <div>
                <strong>Delivering to:</strong>
                <p>{activeAddress ? `${activeAddress.addressLine}, ${activeAddress.area}, ${activeAddress.city}` : 'Select an address'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Add New Address Modal */}
      {showAddAddressModal && (
        <div className="modal-backdrop">
          <div className="modal-content address-modal">
            <div className="modal-header">
              <h3>Add New Delivery Address</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowAddAddressModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNewAddress} className="address-modal-form">
              <div className="form-group">
                <label>Recipient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prasham Jain"
                  value={newAddress.fullName}
                  onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Mobile Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Address Tag</label>
                <div className="tag-picker">
                  {['Home', 'Work', 'Other'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`tag-choice-btn ${newAddress.tag === t ? 'active' : ''}`}
                      onClick={() => setNewAddress({ ...newAddress, tag: t })}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Flat / House No. / Building</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Sunshine Heights"
                  value={newAddress.addressLine}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Locality / Area</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bandra West"
                    value={newAddress.area}
                    onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Postal Pincode</label>
                <input
                  type="text"
                  required
                  placeholder="6-digit pincode e.g. 400050"
                  maxLength={6}
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddAddressModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save & Deliver Here
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
