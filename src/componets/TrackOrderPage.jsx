import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api/apiConfig'
import LiveTrackingMap from './LiveTrackingMap'
import '../style.css'

export default function TrackOrderPage() {
  const { orderId } = useParams()

  const [order, setOrder] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(1) // 1: Placed, 2: Confirmed, 3: Preparing, 4: Out for Delivery, 5: Delivered
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isDemoAdvancing, setIsDemoAdvancing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Status mapping to 5-step stepper
  const getStepNumber = (status) => {
    switch (status) {
      case 'placed':
        return 1
      case 'confirmed':
        return 2
      case 'preparing':
        return 3
      case 'out_for_delivery':
        return 4
      case 'delivered':
        return 5
      case 'cancelled':
        return 0
      default:
        return 1
    }
  }

  // Fetch tracking data from backend
  const fetchTrackingData = useCallback(async () => {
    if (!orderId) return

    try {
      // 1. Try dedicated live tracking endpoint
      const res = await apiFetch(`/orders/${orderId}/tracking`)
      const data = await res.json()

      if (data.success && data.data) {
        setTracking(data.data)
        if (data.order) setOrder(data.order)
        const step = getStepNumber(data.data.orderStatus)
        setActiveStep(step)
        if (typeof data.data.remainingSeconds === 'number') {
          setRemainingSeconds(data.data.remainingSeconds)
        }
        return data.data
      }

      // 2. Fallback to general order endpoint
      const resOrder = await apiFetch(`/orders/${orderId}`)
      const dataOrder = await resOrder.json()
      if (dataOrder.success && dataOrder.order) {
        setOrder(dataOrder.order)
        if (dataOrder.tracking) {
          setTracking(dataOrder.tracking)
          setActiveStep(getStepNumber(dataOrder.tracking.orderStatus))
          if (typeof dataOrder.tracking.remainingSeconds === 'number') {
            setRemainingSeconds(dataOrder.tracking.remainingSeconds)
          }
        } else {
          setActiveStep(getStepNumber(dataOrder.order.orderStatus))
        }
      }
    } catch (err) {
      console.warn('⚠️ Order tracking fetch warning:', err.message)
    }
  }, [orderId])

  // Initial load
  useEffect(() => {
    if (orderId) {
      setLoading(true)
      fetchTrackingData().finally(() => setLoading(false))
    } else {
      // Fetch order history for /my-orders
      apiFetch('/orders/my-orders')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.orders) {
            setAllOrders(data.orders)
          }
        })
        .catch((err) => console.warn(err))
        .finally(() => setLoading(false))
    }
  }, [orderId, fetchTrackingData])

  // Background polling every 3.5 seconds while order is active
  useEffect(() => {
    if (!orderId) return

    const pollInterval = setInterval(() => {
      // Stop polling once delivered or cancelled
      if (activeStep === 5 || activeStep === 0) {
        return
      }
      fetchTrackingData()
    }, 3500)

    return () => clearInterval(pollInterval)
  }, [orderId, activeStep, fetchTrackingData])

  // Local second-by-second countdown ticker
  useEffect(() => {
    if (remainingSeconds <= 0 || activeStep === 5 || activeStep === 0) return

    const secondTimer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(secondTimer)
  }, [remainingSeconds, activeStep])

  // Helper to format remaining time
  const formatCountdown = (totalSecs) => {
    if (activeStep === 5) return 'Delivered • Enjoy your meal!'
    if (activeStep === 0) return 'Order Cancelled'
    if (totalSecs <= 0) return 'Arriving momentarily...'
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} mins`
  }

  // Fast-forward / Reset simulation for instant testing
  const handleDemoAdvance = async (targetStatus) => {
    if (!orderId || isDemoAdvancing) return
    setIsDemoAdvancing(true)
    setErrorMsg('')

    try {
      const res = await apiFetch(`/orders/${orderId}/demo-advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchTrackingData()
      } else {
        setErrorMsg(data.message || 'Failed to advance demo status.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error advancing demo.')
    } finally {
      setIsDemoAdvancing(false)
    }
  }



  if (loading) {
    return (
      <div className="track-order-container">
        <div className="status-spinner-wrap">
          <div className="status-spinner" />
          <p>Connecting to BiteBox live delivery network...</p>
        </div>
      </div>
    )
  }

  // ORDER HISTORY VIEW (When on /my-orders)
  if (!orderId) {
    return (
      <div className="my-orders-container">
        <div className="my-orders-header">
          <h1>My Orders History</h1>
          <p>Track your past meals and active live deliveries in real-time</p>
        </div>

        {allOrders.length === 0 ? (
          <div className="empty-orders-card">
            <span className="empty-icon">🍽️</span>
            <h3>No orders placed yet</h3>
            <p>You haven't ordered anything yet. Explore our delicious menu!</p>
            <Link to="/" className="browse-menu-btn">
              Explore Food Menu
            </Link>
          </div>
        ) : (
          <div className="orders-history-list">
            {allOrders.map((ord) => (
              <div key={ord._id || ord.orderId} className="order-history-card">
                <div className="order-card-header">
                  <div>
                    <strong className="order-card-id">{ord.orderId}</strong>
                    <span className="order-card-date">
                      {new Date(ord.placedAt || ord.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className={`order-status-badge ${ord.orderStatus}`}>
                    {ord.orderStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="order-card-items">
                  {ord.items.map((i, idx) => (
                    <span key={idx} className="item-chip">
                      {i.name} (×{i.quantity})
                    </span>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div className="footer-price">
                    <span>Total:</span>
                    <strong>₹{ord.pricing?.grandTotal || ord.totalAmount}</strong>
                    <span className={`payment-tag ${ord.paymentStatus}`}>
                      {ord.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                  <Link to={`/track-order/${ord.orderId}`} className="track-link-btn">
                    Track Live Order →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // SINGLE ORDER TRACKING VIEW
  const partner = tracking?.deliveryPartner || order?.deliveryPartner

  const steps = [
    { num: 1, label: 'Order Placed', time: 'Just now', icon: '📝' },
    { num: 2, label: 'Order Confirmed', time: 'Confirmed by Restaurant', icon: '✓' },
    { num: 3, label: 'Preparing Food', time: 'Chef is cooking', icon: '👨‍🍳' },
    { num: 4, label: 'Out for Delivery', time: 'Rider is on the way', icon: '🛵' },
    { num: 5, label: 'Delivered', time: 'Enjoy your meal!', icon: '🎉' },
  ]

  return (
    <div className="track-order-container">
      <div className="track-order-card">
        {/* Tracking Card Header */}
        <div className="track-header">
          <div>
            <div className="track-badge-row">
              <span className="track-sub">LIVE DELIVERY STATUS</span>
              <span className="demo-live-pill">⚡ SIMULATED LIVE TRACKING</span>
            </div>
            <h1 className="track-order-id">Order {order?.orderId || orderId}</h1>
            <p className="track-est-time">
              Estimated Delivery: <strong>{formatCountdown(remainingSeconds)}</strong>
              {activeStep < 5 && activeStep > 0 && (
                <span className="live-dot-pulse">● Live Tracking</span>
              )}
            </p>
          </div>
          <Link to="/my-orders" className="all-orders-link">
            View All Orders
          </Link>
        </div>

        {/* 5-Step Live Stepper */}
        <div className="stepper-horizontal">
          {steps.map((s) => {
            const isDone = activeStep >= s.num
            const isCurrent = activeStep === s.num
            return (
              <div
                key={s.num}
                className={`stepper-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="stepper-circle">{isDone ? s.icon : s.num}</div>
                <div className="stepper-info">
                  <strong>{s.label}</strong>
                  <span>{s.time}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Interactive Live Courier Route & GPS Telemetry Map */}
        <div className="demo-map-section">
          <div className="demo-map-header">
            <div className="demo-map-title-wrap">
              <span className="map-badge-icon">🗺️</span>
              <h3>Live Courier Route & GPS Telemetry</h3>
            </div>
          </div>

          <LiveTrackingMap
            tracking={tracking}
            activeStep={activeStep}
            orderId={orderId}
          />

          <div className="demo-map-disclaimer">
            <span>ℹ️</span>
            <p>
              <strong>Demo simulation:</strong> Rider movement along the street route is simulated in real-time between 8–10 minutes.
            </p>
          </div>
        </div>

        {/* Delivery Partner Box */}
        {partner ? (
          <div className="rider-card assigned">
            <div className="rider-avatar">🛵</div>
            <div className="rider-details">
              <div className="rider-name-row">
                <h4>{partner.name}</h4>
                <span className="partner-verified-badge">✓ Assigned Valet</span>
              </div>
              <p>
                ⭐ {partner.rating || 4.8} Rating • {partner.completedDeliveries || 1200}+ safe deliveries • {partner.vehicle || 'Scooter'}
              </p>
            </div>
            <a href={`tel:${partner.phone}`} className="call-rider-btn">
              📞 Call Partner
            </a>
          </div>
        ) : (
          <div className="rider-card searching">
            <div className="rider-searching-icon">
              <div className="pulse-ring" />
              <span>🔍</span>
            </div>
            <div className="rider-details">
              <h4>Assigning Valet Delivery Partner...</h4>
              <p>
                Searching available riders near kitchen (assigns in 15–20s) • Hold tight!
              </p>
            </div>
            <span className="rider-finding-badge">Finding Rider...</span>
          </div>
        )}

        {/* Order Details & Summary Breakdown */}
        <div className="track-details-grid">
          <div className="track-items-box">
            <h3>Dishes in this order</h3>
            <ul>
              {order?.items?.map((item, idx) => (
                <li key={idx}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>Quantity: {item.quantity}</span>
                  </div>
                  <strong>₹{item.price * item.quantity}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="track-delivery-box">
            <h3>Delivery Address</h3>
            <p className="recipient-name">
              <strong>{order?.deliveryAddress?.fullName}</strong> (
              {order?.deliveryAddress?.tag})
            </p>
            <p>
              {order?.deliveryAddress?.addressLine}, {order?.deliveryAddress?.area}
            </p>
            <p>
              {order?.deliveryAddress?.city} - {order?.deliveryAddress?.pincode}
            </p>
            <p>Phone: {order?.deliveryAddress?.phone}</p>

            <div className="track-price-pill">
              <span>Grand Total ({order?.paymentMethod?.toUpperCase()}):</span>
              <strong>₹{order?.pricing?.grandTotal || 'Paid'}</strong>
            </div>
            <div className="track-payment-status-pill">
              Payment Status:{' '}
              <span className={`payment-tag ${order?.paymentStatus}`}>
                {order?.paymentStatus ? order.paymentStatus.toUpperCase() : 'UNPAID'}
              </span>
            </div>
          </div>
        </div>

        {/* Demo Fast-Forward / Status Simulation Controls */}
        <div className="demo-controls-panel">
          <div className="demo-controls-header">
            <span className="demo-chip">🧪 DEMO TEST CONTROLS</span>
            <span className="demo-note">
              Click any stage to instantly test the 5-step lifecycle and live map without waiting:
            </span>
          </div>
          {errorMsg && <p className="demo-error-banner">{errorMsg}</p>}
          <div className="demo-action-buttons">
            <button
              type="button"
              className={`demo-btn ${activeStep === 1 ? 'active' : ''}`}
              onClick={() => handleDemoAdvance('placed')}
              disabled={isDemoAdvancing}
            >
              1. Placed (Searching Rider)
            </button>
            <button
              type="button"
              className={`demo-btn ${activeStep === 2 ? 'active' : ''}`}
              onClick={() => handleDemoAdvance('confirmed')}
              disabled={isDemoAdvancing}
            >
              2. Confirmed (Assigns Partner)
            </button>
            <button
              type="button"
              className={`demo-btn ${activeStep === 3 ? 'active' : ''}`}
              onClick={() => handleDemoAdvance('preparing')}
              disabled={isDemoAdvancing}
            >
              3. Preparing Food
            </button>
            <button
              type="button"
              className={`demo-btn ${activeStep === 4 ? 'active' : ''}`}
              onClick={() => handleDemoAdvance('out_for_delivery')}
              disabled={isDemoAdvancing}
            >
              4. Out for Delivery (Rider Moving)
            </button>
            <button
              type="button"
              className={`demo-btn ${activeStep === 5 ? 'active' : ''}`}
              onClick={() => handleDemoAdvance('delivered')}
              disabled={isDemoAdvancing}
            >
              5. Delivered
            </button>
            <button
              type="button"
              className="demo-btn reset-btn"
              onClick={() => handleDemoAdvance('reset')}
              disabled={isDemoAdvancing}
            >
              🔄 Reset to Start
            </button>
          </div>
        </div>

        <div className="track-footer-actions">
          <Link to="/" className="order-more-btn">
            Order More Dishes
          </Link>
        </div>
      </div>
    </div>
  )
}
