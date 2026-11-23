import { useState, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartContext } from '../context/cartContext'
import { apiFetch } from '../api/apiConfig'
import '../style.css'

function launchConfetti() {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  document.body.appendChild(canvas)

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')

  const colors = ['#FC8019', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#e11d48']
  const particles = []
  const particleCount = 120

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width * 0.5,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      opacity: 1,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    })
  }

  let animationId
  const startTime = performance.now()
  const duration = 2400

  function render(currentTime) {
    const elapsed = currentTime - startTime
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.35
      p.vx *= 0.985
      p.rotation += p.vRot
      p.opacity = Math.max(0, 1 - elapsed / duration)

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })

    if (elapsed < duration) {
      animationId = requestAnimationFrame(render)
    } else {
      cancelAnimationFrame(animationId)
      canvas.remove()
    }
  }

  animationId = requestAnimationFrame(render)
}

export default function Cart() {
  const { cart, setCart } = useContext(CartContext)
  const navigate = useNavigate()

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bitebox_applied_coupon')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [couponSuccess, setCouponSuccess] = useState('')
  const [couponError, setCouponError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [showAvailableModal, setShowAvailableModal] = useState(false)

  // Fetch available sample coupons on mount
  useEffect(() => {
    apiFetch('/coupons/available')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.coupons) {
          setAvailableCoupons(data.coupons)
        }
      })
      .catch(() => {
        // Fallback default coupons if server isn't answering yet
        setAvailableCoupons([
          { code: 'WELCOME10', description: '10% OFF up to ₹100 on first order', minOrderValue: 199 },
          { code: 'BITEBOX20', description: '20% OFF up to ₹200 on meals above ₹499', minOrderValue: 499 },
          { code: 'FLAT50', description: 'Flat ₹50 savings on orders above ₹199', minOrderValue: 199 },
          { code: 'FREESHIP', description: 'Free Express Delivery on orders above ₹299', minOrderValue: 299 },
          { code: 'STUDENT15', description: '15% OFF up to ₹150 for students', minOrderValue: 299 },
        ])
      })
  }, [])

  // Cart item management
  function handleIncrease(id) {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, qty: (item.qty || 1) + 1 } : item
      )
    )
  }

  function handleDecrease(id) {
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, qty: (item.qty || 1) - 1 } : item
        )
        .filter((item) => item.qty > 0)
    )
  }

  function handleRemove(id) {
    setCart(cart.filter((item) => item.id !== id))
  }

  // Calculate pricing
  const itemTotal = cart.reduce((total, item) => total + item.price * (item.qty || 1), 0)
  const totalItems = cart.reduce((total, item) => total + (item.qty || 1), 0)

  const packagingCharges = itemTotal > 0 ? 25 : 0
  const isFreeDeliveryEligible = itemTotal >= 500
  let deliveryFee = itemTotal === 0 || isFreeDeliveryEligible ? 0 : 40

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

  const taxes = Math.round(itemTotal * 0.05) // 5% GST
  const grandTotal = Math.max(0, itemTotal + packagingCharges + deliveryFee + taxes - discountAmount)

  // Re-validate applied coupon whenever itemTotal changes
  useEffect(() => {
    if (appliedCoupon && itemTotal > 0) {
      if (itemTotal < (appliedCoupon.minOrderValue || 0)) {
        setCouponError(`Coupon '${appliedCoupon.code}' removed: minimum order value of ₹${appliedCoupon.minOrderValue} is not met.`)
        setCouponSuccess('')
        setAppliedCoupon(null)
        sessionStorage.removeItem('bitebox_applied_coupon')
      } else {
        // Update stored coupon discount
        const updated = { ...appliedCoupon, discountAmount }
        sessionStorage.setItem('bitebox_applied_coupon', JSON.stringify(updated))
      }
    } else if (itemTotal === 0 && appliedCoupon) {
      setAppliedCoupon(null)
      sessionStorage.removeItem('bitebox_applied_coupon')
    }
  }, [itemTotal, appliedCoupon, discountAmount])

  // Handle Apply Coupon
  async function applyCouponCode(codeToApply) {
    const targetCode = (codeToApply || couponCode).trim().toUpperCase()
    if (!targetCode) {
      setCouponError('Please enter a coupon code.')
      return
    }

    setIsValidating(true)
    setCouponError('')
    setCouponSuccess('')

    try {
      const res = await apiFetch('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: targetCode,
          items: cart.map((i) => ({ productId: i.id, quantity: i.qty || 1, name: i.name, price: i.price })),
        }),
      })

      const data = await res.json()

      if (data.success && data.coupon) {
        setAppliedCoupon(data.coupon)
        sessionStorage.setItem('bitebox_applied_coupon', JSON.stringify(data.coupon))
        setCouponSuccess(`✓ ${data.coupon.code} applied successfully! You saved ₹${data.pricing.discount}!`)
        setCouponCode('')
        launchConfetti()
      } else {
        setCouponError(data.message || `Coupon '${targetCode}' is invalid.`)
        setAppliedCoupon(null)
        sessionStorage.removeItem('bitebox_applied_coupon')
      }
    } catch {
      setCouponError('Could not validate coupon. Please check connection and try again.')
    } finally {
      setIsValidating(false)
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    sessionStorage.removeItem('bitebox_applied_coupon')
    setCouponSuccess('')
    setCouponError('Coupon removed.')
    setTimeout(() => setCouponError(''), 3000)
  }

  function handleProceedToCheckout() {
    if (cart.length === 0) return
    navigate('/checkout')
  }

  if (cart.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-empty">
          <div className="cart-empty__icon">🛒</div>
          <h2>Your Cart is Empty</h2>
          <p>Good food is always just a few clicks away! Discover tasty dishes from top restaurants.</p>
          <Link to="/" className="cart-empty__btn">
            Browse Menu & Restaurants
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-container">
      {/* Free Delivery Banner */}
      {isFreeDeliveryEligible && (
        <div className="free-delivery-celebration">
          <span className="celebration-icon">🎉</span>
          <div>
            <strong>Woohoo! You unlocked FREE Delivery!</strong>
            <p>Enjoy zero delivery charges on orders of ₹500 or above.</p>
          </div>
          <span className="celebration-icon">🚚✨</span>
        </div>
      )}

      <div className="cart-page-header">
        <h1 className="cart-title">
          Your Cart <span className="cart-count-badge">({totalItems} {totalItems === 1 ? 'dish' : 'dishes'})</span>
        </h1>
        <Link to="/" className="continue-shopping-link">
          ← Add More Food
        </Link>
      </div>

      <div className="cart-content">
        {/* Left Column: Cart Items List */}
        <div className="cart-items-section">
          <div className="cart-items">
            {cart.map((item) => {
              const qty = item.qty || 1
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item__img-wrap">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="cart-item__img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
                      }}
                    />
                    {item.isVeg !== undefined && (
                      <span className={`veg-badge-dot ${item.isVeg ? 'veg' : 'non-veg'}`} />
                    )}
                  </div>

                  <div className="cart-item__info">
                    <h3 className="cart-item__name">{item.name}</h3>
                    <span className="cart-item__restaurant">
                      {item.restaurantName || 'BiteBox Partner Kitchen'}
                    </span>
                    <span className="cart-item__price">₹{item.price} each</span>
                  </div>

                  <div className="cart-item__controls">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleDecrease(item.id)}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="qty-count">{qty}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleIncrease(item.id)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item__subtotal">
                    ₹{item.price * qty}
                  </div>

                  <button
                    type="button"
                    className="cart-item__remove-btn"
                    onClick={() => handleRemove(item.id)}
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>

          {/* Quick Available Coupons Strip */}
          <div className="available-coupons-strip">
            <div className="coupons-strip-header">
              <span>🎟️ Available Offers & Coupons</span>
              <button
                type="button"
                className="view-all-coupons-btn"
                onClick={() => setShowAvailableModal(!showAvailableModal)}
              >
                {showAvailableModal ? 'Hide Offers' : 'View All Offers'}
              </button>
            </div>
            <div className="coupons-pills-row">
              {availableCoupons.slice(0, 4).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`coupon-pill-card ${appliedCoupon?.code === c.code ? 'applied' : ''}`}
                  onClick={() => applyCouponCode(c.code)}
                >
                  <span className="pill-code">{c.code}</span>
                  <span className="pill-desc">{c.description}</span>
                  <span className="pill-action">
                    {appliedCoupon?.code === c.code ? '✓ Applied' : 'Tap to Apply'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Coupon Box & Order Price Summary */}
        <div className="cart-summary-sidebar">
          {/* Coupon Discount Section */}
          <div className="coupon-box-card">
            <div className="coupon-box-header">
              <span className="coupon-icon">🏷️</span>
              <h4>Apply Discount Coupon</h4>
            </div>

            {appliedCoupon ? (
              <div className="coupon-applied-view">
                <div className="coupon-applied-details">
                  <div className="coupon-success-tag">
                    <span className="checkmark-icon">✓</span>
                    <strong>{appliedCoupon.code}</strong> Applied
                  </div>
                  <p className="coupon-savings-msg">
                    You saved <strong>₹{discountAmount}</strong> on this order!
                  </p>
                </div>
                <button
                  type="button"
                  className="remove-coupon-btn"
                  onClick={handleRemoveCoupon}
                  title="Remove applied coupon"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form
                className="coupon-input-group"
                onSubmit={(e) => {
                  e.preventDefault()
                  applyCouponCode()
                }}
              >
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g. BITEBOX20)"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase())
                    setCouponError('')
                    setCouponSuccess('')
                  }}
                  className="coupon-input"
                  maxLength={15}
                />
                <button
                  type="submit"
                  className="apply-coupon-btn"
                  disabled={isValidating || !couponCode.trim()}
                >
                  {isValidating ? 'Checking...' : 'Apply'}
                </button>
              </form>
            )}

            {/* Error / Success Messages */}
            {couponSuccess && (
              <div className="coupon-alert success">
                {couponSuccess}
              </div>
            )}
            {couponError && (
              <div className="coupon-alert error">
                ⚠️ {couponError}
              </div>
            )}
          </div>

          {/* Detailed Order Price Summary */}
          <div className="cart-summary">
            <h3 className="summary-title">Bill Details</h3>

            <div className="cart-summary__row">
              <span className="summary-label">Item Total</span>
              <span className="summary-val">₹{itemTotal}</span>
            </div>

            <div className="cart-summary__row">
              <span className="summary-label">Restaurant Packaging Charges</span>
              <span className="summary-val">₹{packagingCharges}</span>
            </div>

            <div className="cart-summary__row">
              <span className="summary-label">Delivery Fee</span>
              {deliveryFee === 0 ? (
                <span className="free-badge">FREE</span>
              ) : (
                <span className="summary-val">₹{deliveryFee}</span>
              )}
            </div>

            <div className="cart-summary__row">
              <span className="summary-label">Govt. Taxes (GST 5%)</span>
              <span className="summary-val">₹{taxes}</span>
            </div>

            {discountAmount > 0 && (
              <div className="cart-summary__row discount-row">
                <span className="summary-label">
                  Coupon Discount <strong className="applied-code-badge">({appliedCoupon?.code})</strong>
                </span>
                <span className="discount-val">-₹{discountAmount}</span>
              </div>
            )}

            <div className="summary-divider" />

            <div className="cart-summary__row total">
              <span className="total-label">Grand Total</span>
              <span className="total-amount">₹{grandTotal}</span>
            </div>

            {discountAmount > 0 && (
              <div className="total-savings-banner">
                🎉 Congratulations! You saved ₹{discountAmount + (deliveryFee === 0 && !isFreeDeliveryEligible ? 40 : 0)} on this order!
              </div>
            )}

            <button
              type="button"
              className="cart-checkout-btn"
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout →
            </button>

            <div className="secure-badge-row">
              <span>🔒 100% Safe & Secure Ordering</span>
              <span>•</span>
              <span>⚡ Fast 25-35 Min Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
