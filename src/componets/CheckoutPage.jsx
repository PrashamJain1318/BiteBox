import { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartContext } from '../context/cartContext'
import { useAuth } from '../context/AuthContext'
import { useCity } from '../context/CityContext'
import { matchSupportedCity } from '../data/cities'
import { apiFetch } from '../api/apiConfig'
import DeliveryLocationPicker from '../components/maps/DeliveryLocationPicker'
import '../style.css'

// Helper: Haversine distance in km
function calculateDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

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

// Helper to normalize address objects ensuring all required fields exist
function normalizeFrontendAddress(addr, defaultUser = null) {
  if (!addr) return null
  const fullName = String(addr.fullName || addr.recipientName || defaultUser?.name || 'Customer').trim()
  const recipientName = fullName
  const phone = String(addr.phone || '').trim()
  const label = addr.label || addr.tag || 'Home'
  const tag = ['Home', 'Work', 'College', 'Other'].includes(label) ? label : 'Home'
  const houseNumber = String(addr.houseNumber || '').trim()
  const apartment = String(addr.apartment || '').trim()
  const landmark = String(addr.landmark || '').trim()

  let addressLine = String(addr.addressLine || addr.address || '').trim()
  if (!addressLine) {
    if (houseNumber || apartment) {
      addressLine = `${houseNumber}${apartment ? `, ${apartment}` : ''}`.trim()
    } else {
      addressLine = String(addr.fullAddress || '').trim()
    }
  }

  let area = String(addr.area || '').trim()
  let city = String(addr.city || 'Mumbai').trim()
  let state = String(addr.state || 'Maharashtra').trim()
  let pincode = String(addr.pincode || '').trim()
  const fullAddress = String(
    addr.fullAddress ||
    `${addressLine}${area ? `, ${area}` : ''}${city ? `, ${city}` : ''}`
  ).trim()

  if (!pincode && fullAddress) {
    const pinMatch = fullAddress.match(/\b\d{6}\b/)
    if (pinMatch) pincode = pinMatch[0]
  }

  if (!area && fullAddress) {
    const parts = fullAddress.split(',').map((p) => p.trim())
    if (parts.length >= 3) {
      area = parts[parts.length - 2]
    } else if (parts.length >= 2) {
      area = parts[0]
    }
  }

  const coordinates =
    addr.coordinates &&
    typeof addr.coordinates.lat === 'number' &&
    typeof addr.coordinates.lng === 'number'
      ? {
          lat: Number(addr.coordinates.lat),
          lng: Number(addr.coordinates.lng),
        }
      : undefined

  return {
    ...addr,
    _id: addr._id || addr.id || `addr-${Date.now()}`,
    id: addr._id || addr.id || `addr-${Date.now()}`,
    fullName,
    recipientName,
    phone,
    label: tag,
    tag,
    houseNumber,
    apartment,
    landmark,
    addressLine,
    address: addressLine,
    fullAddress: fullAddress || `${addressLine}, ${area}, ${city} - ${pincode}`,
    area: area || 'Locality',
    city: city || 'Mumbai',
    state: state || 'Maharashtra',
    pincode: pincode || '400050',
    coordinates,
    placeId: String(addr.placeId || '').trim(),
    isDefault: Boolean(addr.isDefault),
  }
}

export default function CheckoutPage() {
  const { cart, setCart } = useContext(CartContext)
  const { user } = useAuth()
  const { selectedCity } = useCity()
  const navigate = useNavigate()

  // Addresses
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)

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

  // Selected address object
  const activeAddress = addresses.find((a) => (a._id || a.id) === selectedAddressId) || addresses[0]

  // Detect whether active address is incomplete
  const isAddressIncomplete = Boolean(
    activeAddress && (
      !activeAddress.fullName?.trim() ||
      !activeAddress.phone?.trim() ||
      String(activeAddress.phone).trim().replace(/\D/g, '').length < 10 ||
      (!activeAddress.addressLine?.trim() && !activeAddress.fullAddress?.trim()) ||
      !activeAddress.area?.trim() ||
      !activeAddress.city?.trim() ||
      !activeAddress.pincode?.trim() ||
      String(activeAddress.pincode).trim().replace(/\D/g, '').length !== 6
    )
  )

  // City matching & cross-city delivery validation
  const cartRestaurantCity = cart[0]?.restaurantCity || selectedCity?.name || 'Bengaluru'
  const cartRestaurantCitySlug = cart[0]?.restaurantCitySlug || selectedCity?.slug || 'bengaluru'
  const addressCityMatch = activeAddress?.city ? matchSupportedCity(activeAddress.city) : null
  const cartCityMatch = matchSupportedCity(cartRestaurantCitySlug || cartRestaurantCity)

  const isCityMismatch = Boolean(
    activeAddress?.city &&
    addressCityMatch &&
    cartCityMatch &&
    addressCityMatch.slug !== cartCityMatch.slug
  )

  // Calculate prices
  const itemTotal = cart.reduce((total, item) => total + item.price * (item.qty || 1), 0)
  const totalItems = cart.reduce((total, item) => total + (item.qty || 1), 0)
  const packagingCharges = itemTotal > 0 ? 25 : 0
  const isFreeDelivery = itemTotal >= 500

  // Dynamic distance calculation if customer coords exist
  let calculatedDistanceKm = null
  if (activeAddress?.coordinates?.lat && activeAddress?.coordinates?.lng) {
    const kitchen =
      cart[0]?.restaurantCoords ||
      cartCityMatch?.coordinates ||
      (activeAddress.coordinates.lat < 15 ? { lat: 12.9352, lng: 77.6245 } : { lat: 19.0596, lng: 72.8295 })
    calculatedDistanceKm = calculateDistanceInKm(
      kitchen.lat,
      kitchen.lng,
      activeAddress.coordinates.lat,
      activeAddress.coordinates.lng
    )
  }

  let deliveryFee = itemTotal === 0 || isFreeDelivery ? 0 : 40
  if (!isFreeDelivery && itemTotal > 0 && calculatedDistanceKm !== null && calculatedDistanceKm > 4) {
    deliveryFee = Math.min(120, 40 + Math.round((calculatedDistanceKm - 4) * 10))
  }

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
    const fetchSavedAddresses = async () => {
      // 1. Try dedicated /addresses
      try {
        const res = await apiFetch('/addresses')
        const data = await res.json()
        if (data.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
          const normalized = data.addresses.map((a) => normalizeFrontendAddress(a, user))
          setAddresses(normalized)
          const defaultAddr = normalized.find((a) => a.isDefault) || normalized[0]
          setSelectedAddressId(defaultAddr._id || defaultAddr.id)
          return
        }
      } catch {
        // Fallback to auth/addresses
      }

      // 2. Try auth/addresses
      try {
        const resAuth = await apiFetch('/auth/addresses')
        const dataAuth = await resAuth.json()
        if (dataAuth.success && Array.isArray(dataAuth.addresses) && dataAuth.addresses.length > 0) {
          const normalized = dataAuth.addresses.map((a) => normalizeFrontendAddress(a, user))
          setAddresses(normalized)
          const defaultAddr = normalized.find((a) => a.isDefault) || normalized[0]
          setSelectedAddressId(defaultAddr._id || defaultAddr.id)
          return
        }
      } catch {
        // Fallback to sample presets
      }

      // 3. Fallback demo addresses with Google Maps coordinates
      const demoAddrs = [
        {
          _id: 'demo-addr-1',
          fullName: user?.name || 'Prasham Jain',
          recipientName: user?.name || 'Prasham Jain',
          phone: '9876543210',
          label: 'Home',
          tag: 'Home',
          houseNumber: 'A-402',
          apartment: 'Sunshine Heights',
          landmark: 'Linking Road',
          addressLine: 'A-402, Sunshine Heights, Linking Road',
          address: 'A-402, Sunshine Heights, Linking Road',
          fullAddress: 'A-402, Sunshine Heights, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
          area: 'Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050',
          coordinates: { lat: 19.0607, lng: 72.8362 },
          isDefault: true,
        },
        {
          _id: 'demo-addr-2',
          fullName: user?.name || 'Prasham Jain',
          recipientName: user?.name || 'Prasham Jain',
          phone: '9876543210',
          label: 'Work',
          tag: 'Work',
          houseNumber: 'Tech Hub Office, 7th Floor',
          apartment: 'BKC Avenue',
          landmark: 'Near City Park',
          addressLine: 'Tech Hub Office, 7th Floor, BKC Avenue',
          address: 'Tech Hub Office, 7th Floor, BKC Avenue',
          fullAddress: 'Tech Hub Office, 7th Floor, BKC Avenue, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
          area: 'Bandra Kurla Complex',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400051',
          coordinates: { lat: 19.0673, lng: 72.8687 },
          isDefault: false,
        },
      ].map((a) => normalizeFrontendAddress(a, user))

      setAddresses(demoAddrs)
      setSelectedAddressId('demo-addr-1')
    }

    fetchSavedAddresses()
  }, [user])

  // Handle address saved from Google Maps picker
  async function handleAddressSavedFromMap(savedAddrData) {
    const normalizedInput = normalizeFrontendAddress(savedAddrData, user)

    try {
      const res = await apiFetch('/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedInput),
      })
      const data = await res.json()
      if (data.success && data.address) {
        const normalized = normalizeFrontendAddress(data.address, user)
        setAddresses((prev) => [normalized, ...prev.filter((a) => (a._id || a.id) !== (normalized._id || normalized.id))])
        setSelectedAddressId(normalized._id || normalized.id)
        setShowAddAddressModal(false)
        return
      }
    } catch {
      // Continue to fallback
    }

    try {
      const resAuth = await apiFetch('/auth/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedInput),
      })
      const dataAuth = await resAuth.json()
      if (dataAuth.success && dataAuth.addresses) {
        const normalizedList = dataAuth.addresses.map((a) => normalizeFrontendAddress(a, user))
        setAddresses(normalizedList)
        const added = normalizedList[normalizedList.length - 1]
        setSelectedAddressId(added._id || added.id)
        setShowAddAddressModal(false)
        return
      }
    } catch {
      // Local state fallback
    }

    const localNew = normalizeFrontendAddress(
      { ...normalizedInput, _id: `local-addr-${Date.now()}` },
      user
    )
    setAddresses((prev) => [localNew, ...prev])
    setSelectedAddressId(localNew._id)
    setShowAddAddressModal(false)
  }

  // Main Place Order & Payment Handler
  async function handlePlaceOrder() {
    if (isProcessing) return

    if (cart.length === 0) {
      navigate('/cart')
      return
    }

    if (!activeAddress) {
      setErrorMessage('Please select or add a delivery address.')
      return
    }

    const resolvedRecipient = String(activeAddress.fullName || activeAddress.recipientName || '').trim()
    if (!resolvedRecipient) {
      setErrorMessage('Please enter the delivery recipient name.')
      return
    }

    const cleanPhone = String(activeAddress.phone || '').trim().replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.')
      return
    }

    const resolvedAddressLine = String(
      activeAddress.addressLine ||
      activeAddress.address ||
      activeAddress.houseNumber ||
      activeAddress.fullAddress ||
      ''
    ).trim()
    if (!resolvedAddressLine) {
      setErrorMessage('Please enter house / flat and street address.')
      return
    }

    const resolvedArea = String(activeAddress.area || '').trim()
    if (!resolvedArea) {
      setErrorMessage('Please enter delivery area / locality.')
      return
    }

    const resolvedCity = String(activeAddress.city || '').trim()
    if (!resolvedCity) {
      setErrorMessage('Please enter delivery city.')
      return
    }

    const cleanPincode = String(activeAddress.pincode || '').trim().replace(/\D/g, '')
    if (!cleanPincode || cleanPincode.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN code.')
      return
    }

    if (isCityMismatch) {
      setErrorMessage(
        `Delivery address is in ${addressCityMatch?.name || activeAddress.city}, but your selected restaurant is in ${cartCityMatch?.name || cartRestaurantCity}. Cross-city ordering is not supported. Please select an address in ${cartCityMatch?.name || cartRestaurantCity}.`
      )
      return
    }

    setIsProcessing(true)
    setErrorMessage('')

    try {
      // 1. Create order on backend with sanitized data & city tags
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: String(i.id),
            quantity: Math.max(1, Number(i.qty) || 1),
            name: i.name,
            price: Number(i.price) || 0,
            image: i.img,
            restaurantName: i.restaurantName,
            restaurantCity: i.restaurantCity || cartRestaurantCity,
            restaurantCitySlug: i.restaurantCitySlug || cartRestaurantCitySlug,
            restaurantCoords: i.restaurantCoords || (cartCityMatch?.coordinates),
          })),
          restaurantCitySlug: cartCityMatch?.slug || selectedCity?.slug,
          citySlug: cartCityMatch?.slug || selectedCity?.slug,
          deliveryAddress: {
            fullName: resolvedRecipient,
            recipientName: resolvedRecipient,
            phone: cleanPhone,
            tag: ['Home', 'Work', 'College', 'Other'].includes(activeAddress.tag || activeAddress.label)
              ? (activeAddress.tag || activeAddress.label)
              : 'Home',
            label: String(activeAddress.label || activeAddress.tag || 'Home').trim(),
            addressLine: resolvedAddressLine,
            address: resolvedAddressLine,
            fullAddress: String(
              activeAddress.fullAddress ||
              `${resolvedAddressLine}, ${resolvedArea}, ${resolvedCity} - ${cleanPincode}`
            ).trim(),
            houseNumber: String(activeAddress.houseNumber || '').trim(),
            apartment: String(activeAddress.apartment || '').trim(),
            landmark: String(activeAddress.landmark || '').trim(),
            area: resolvedArea,
            city: resolvedCity,
            state: String(activeAddress.state || 'Maharashtra').trim(),
            pincode: cleanPincode,
            placeId: String(activeAddress.placeId || '').trim(),
            coordinates:
              activeAddress.coordinates?.lat && activeAddress.coordinates?.lng
                ? {
                    lat: Number(activeAddress.coordinates.lat),
                    lng: Number(activeAddress.coordinates.lng),
                  }
                : undefined,
          },
          couponCode: appliedCoupon?.code,
          paymentMethod,
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        data = { success: false, message: `Server error (HTTP ${res.status}). Please try again.` }
      }

      if (!res.ok || !data.success || !data.order) {
        setIsProcessing(false)
        if (res.status === 401) {
          setErrorMessage('Please sign in or log in to complete your checkout.')
        } else if (res.status === 400) {
          setErrorMessage(data.message || 'Invalid order data. Please check your address and items.')
        } else if (res.status === 404) {
          setErrorMessage('Order service endpoint not found. Please verify the backend is running.')
        } else {
          setErrorMessage(data.message || `Failed to place order (HTTP ${res.status}). Please try again.`)
        }
        return
      }

      const order = data.order

      // 2A. Cash on Delivery (COD) Flow
      if (paymentMethod === 'cod') {
        // Clear cart & applied coupon
        setCart([])
        localStorage.removeItem('bitebox_cart')
        sessionStorage.removeItem('bitebox_applied_coupon')
        setIsProcessing(false)
        navigate(`/order-success/${order.orderId}`, { state: { order } })
        return
      }

      // 2B. Online Payment via Razorpay (UPI, QR, Cards, NetBanking)
      const isScriptLoaded = await loadRazorpayScript()

      if (!isScriptLoaded || !window.Razorpay) {
        console.warn('⚠️ Razorpay SDK script failed to load from CDN. Using test mode confirmation.')
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
          try {
            const verifyRes = await apiFetch('/payments/verify', {
              method: 'POST',
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
              setIsProcessing(false)
              navigate(`/order-success/${order.orderId}`, { state: { order: verifyData.order || order } })
            } else {
              setIsProcessing(false)
              navigate(`/payment-status?status=failed&orderId=${order.orderId}&error=${encodeURIComponent(verifyData.message)}`)
            }
          } catch {
            setIsProcessing(false)
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
            response.error?.description || 'Payment was declined.'
          )}`
        )
      })

      rzpInstance.open()
    } catch (err) {
      console.error('Checkout error:', err)
      setIsProcessing(false)
      if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
        setErrorMessage('Cannot connect to BiteBox server (port 5002). Please ensure the backend server is running.')
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred during checkout. Please try again.')
      }
    }
  }

  // Simulated verification for test environments
  async function handleSimulatedVerification(order) {
    try {
      const verifyRes = await apiFetch('/payments/verify', {
        method: 'POST',
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
        setIsProcessing(false)
        navigate(`/order-success/${order.orderId}`, { state: { order: verifyData.order || order } })
      } else {
        setIsProcessing(false)
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
                <h3>Delivery Address</h3>
              </div>
              <button
                type="button"
                className="add-new-addr-btn"
                onClick={() => setShowAddAddressModal(true)}
              >
                📍 Pin Location on Google Map
              </button>
            </div>

            {/* Currently Active / Delivering To Highlight Banner */}
            {activeAddress ? (
              <div className="delivering-to-highlight-banner">
                <div className="delivering-to-badge-col">
                  <span className="delivering-to-pill">DELIVERING TO</span>
                  <span className={`addr-tag ${(activeAddress.tag || activeAddress.label || 'home').toLowerCase()}`}>
                    {activeAddress.tag === 'Work' || activeAddress.label === 'Work'
                      ? '🏢 Work'
                      : activeAddress.tag === 'College' || activeAddress.label === 'College'
                      ? '🎓 College'
                      : activeAddress.tag === 'Other' || activeAddress.label === 'Other'
                      ? '📍 Other'
                      : '🏠 Home'}
                  </span>
                </div>

                <div className="delivering-to-info-col">
                  <div className="delivering-to-title-row">
                    <h4 className="delivering-recipient-name">{activeAddress.fullName || user?.name || 'Customer'}</h4>
                    <span className="delivering-phone">📞 {activeAddress.phone}</span>
                  </div>
                  <p className="delivering-street-address">
                    {activeAddress.houseNumber ? `${activeAddress.houseNumber}, ` : ''}
                    {activeAddress.apartment ? `${activeAddress.apartment}, ` : ''}
                    {activeAddress.addressLine || activeAddress.fullAddress}
                  </p>
                  {activeAddress.landmark && (
                    <p className="delivering-landmark-text">Landmark: {activeAddress.landmark}</p>
                  )}
                  <p className="delivering-city-pincode">
                    {activeAddress.area ? `${activeAddress.area}, ` : ''}{activeAddress.city} - {activeAddress.pincode}
                  </p>

                  <div className="delivering-meta-row">
                    {activeAddress.coordinates?.lat && activeAddress.coordinates?.lng ? (
                      <span className="gps-verified-tag">
                        📍 GPS Pinned ({activeAddress.coordinates.lat.toFixed(4)}, {activeAddress.coordinates.lng.toFixed(4)})
                        {calculatedDistanceKm !== null && ` • ~${calculatedDistanceKm} km from kitchen`}
                      </span>
                    ) : (
                      <span className="gps-unverified-tag">📍 Standard Street Address</span>
                    )}

                    <button
                      type="button"
                      className="change-location-link-btn"
                      onClick={() => setShowAddAddressModal(true)}
                      title="Adjust pin or select another location on Google Maps"
                    >
                      ✏️ Change / Adjust on Map
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-address-alert-box">
                <span className="alert-pin-icon">📍</span>
                <div>
                  <h4>No Delivery Address Selected</h4>
                  <p>Please select your doorstep on Google Maps to continue with your checkout.</p>
                </div>
                <button
                  type="button"
                  className="pick-on-map-cta-btn"
                  onClick={() => setShowAddAddressModal(true)}
                >
                  Choose on Google Maps →
                </button>
              </div>
            )}

            {/* Saved Address Selection Cards */}
            {addresses.length > 0 && (
              <div className="saved-addresses-subblock">
                <div className="saved-addresses-subheading">
                  <h5>Saved Addresses ({addresses.length})</h5>
                  <span>Click any address to deliver here</span>
                </div>

                <div className="address-options-grid">
                  {addresses.map((addr) => {
                    const isSelected = (addr._id || addr.id) === selectedAddressId
                    const label = addr.label || addr.tag || 'Home'
                    return (
                      <div
                        key={addr._id || addr.id}
                        className={`address-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedAddressId(addr._id || addr.id)}
                      >
                        <div className="addr-tag-row">
                          <span className={`addr-tag ${label.toLowerCase()}`}>
                            {label === 'Work'
                              ? '🏢 Work'
                              : label === 'College'
                              ? '🎓 College'
                              : label === 'Other'
                              ? '📍 Other'
                              : '🏠 Home'}
                          </span>
                          {isSelected && <span className="selected-check">✓ Delivering Here</span>}
                        </div>
                        <h4 className="addr-recipient">{addr.fullName}</h4>
                        <p className="addr-line">{addr.fullAddress || `${addr.addressLine}, ${addr.area}`}</p>
                        <p className="addr-city">{addr.city} - {addr.pincode}</p>
                        <p className="addr-phone">📞 {addr.phone}</p>
                        {addr.coordinates?.lat && addr.coordinates?.lng && (
                          <div className="card-gps-mini-badge">
                            📍 GPS: {addr.coordinates.lat.toFixed(3)}, {addr.coordinates.lng.toFixed(3)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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

            {/* Incomplete Address Warning Banner */}
            {isAddressIncomplete && (
              <div
                className="address-incomplete-warning-banner"
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1.5px solid #FCD34D',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  margin: '16px 0',
                  color: '#92400E',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>
                    <strong style={{ display: 'block', color: '#78350F' }}>
                      Incomplete Delivery Address
                    </strong>
                    <span>
                      Missing required fields (
                      {[
                        !activeAddress?.fullName?.trim() && 'recipient name',
                        (!activeAddress?.phone?.trim() || String(activeAddress?.phone).replace(/\D/g, '').length < 10) && '10-digit phone',
                        (!activeAddress?.addressLine?.trim() && !activeAddress?.fullAddress?.trim()) && 'street/house',
                        !activeAddress?.area?.trim() && 'area / locality',
                        (!activeAddress?.pincode?.trim() || String(activeAddress?.pincode).replace(/\D/g, '').length !== 6) && '6-digit PIN code',
                      ].filter(Boolean).join(', ')}
                      ). Please complete to place your order.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(true)}
                  style={{
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✏️ Complete Address Details
                </button>
              </div>
            )}

            {/* Cross-City Delivery Mismatch Warning */}
            {isCityMismatch && (
              <div
                className="city-mismatch-warning-card"
                style={{
                  backgroundColor: '#FFF5F5',
                  border: '1.5px solid #FEB2B2',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  margin: '16px 0',
                  color: '#C53030',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
                  <span>🚫</span>
                  <span>Cross-City Delivery Not Supported</span>
                </div>
                <p style={{ margin: '0 0 10px 0' }}>
                  Delivery address is in <strong>{addressCityMatch?.name || activeAddress?.city}</strong>, but your selected restaurant is in <strong>{cartCityMatch?.name || cartRestaurantCity}</strong>. Please switch to an address in <strong>{cartCityMatch?.name || cartRestaurantCity}</strong> or clear your cart.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(true)}
                    style={{
                      backgroundColor: '#E53E3E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📍 Switch Address to {cartCityMatch?.name || cartRestaurantCity}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCart([])
                      localStorage.removeItem('bitebox_cart')
                      sessionStorage.removeItem('bitebox_applied_coupon')
                      navigate('/')
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#C53030',
                      border: '1px solid #FEB2B2',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Clear Cart & Browse {addressCityMatch?.name || activeAddress?.city}
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="checkout-error-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>⚠️ {errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#991B1B',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    marginLeft: '8px',
                  }}
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Place Order CTA Button */}
            <button
              type="button"
              className="place-order-btn"
              disabled={isProcessing || isCityMismatch}
              onClick={handlePlaceOrder}
              style={{
                opacity: isCityMismatch ? 0.6 : 1,
                cursor: isCityMismatch ? 'not-allowed' : 'pointer',
              }}
            >
              {isCityMismatch
                ? `Cannot Deliver to ${addressCityMatch?.name || activeAddress?.city || 'Selected City'}`
                : isProcessing
                ? (paymentMethod === 'cod' ? 'Placing Order...' : 'Processing Payment...')
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

      {/* Interactive Google Maps Delivery Location Picker Modal */}
      <DeliveryLocationPicker
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onAddressSaved={handleAddressSavedFromMap}
        initialLocation={activeAddress}
      />
    </div>
  )
}
