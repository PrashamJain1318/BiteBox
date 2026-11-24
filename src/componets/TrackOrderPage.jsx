import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api/apiConfig'
import DeliveryTrackingMap from '../components/tracking/DeliveryTrackingMap'
import '../style.css'

const LIFECYCLE_STEPS = [
  {
    key: 'placed',
    num: 1,
    label: 'Order Placed',
    desc: 'Order received by BiteBox',
    icon: '📝',
  },
  {
    key: 'confirmed',
    num: 2,
    label: 'Order Confirmed',
    desc: 'Accepted by kitchen',
    icon: '✓',
  },
  {
    key: 'preparing',
    num: 3,
    label: 'Preparing Food',
    desc: 'Chef cooking with fresh ingredients',
    icon: '👨‍🍳',
  },
  {
    key: 'out_for_delivery',
    num: 4,
    label: 'Out for Delivery',
    desc: 'Valet riding to your address',
    icon: '🛵',
  },
  {
    key: 'delivered',
    num: 5,
    label: 'Delivered',
    desc: 'Delivered hot & fresh to you',
    icon: '🎉',
  },
]

export default function TrackOrderPage() {
  const { orderId } = useParams()

  const [order, setOrder] = useState(null)
  const [allOrders, setAllOrders] = useState([])
  const [tracking, setTracking] = useState(null)
  const [deliveryPartner, setDeliveryPartner] = useState(null)
  const [demoMode, setDemoMode] = useState(true)
  const [loading, setLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const pollingTimerRef = useRef(null)

  // Map status string to stepper step number
  const statusMap = {
    placed: 1,
    confirmed: 2,
    preparing: 3,
    out_for_delivery: 4,
    delivered: 5,
    cancelled: 0,
  }

  const currentStep = order?.orderStatus ? statusMap[order.orderStatus] || 1 : 1

  // Fetch live order details with tracking metrics
  const fetchOrderDetails = useCallback(async (isInitial = false) => {
    if (!orderId) return

    try {
      const res = await apiFetch(`/orders/${orderId}`)
      const data = await res.json()

      if (data.success && data.order) {
        setOrder(data.order)
        if (data.deliveryPartner) {
          setDeliveryPartner(data.deliveryPartner)
        }
        if (data.tracking) {
          setTracking(data.tracking)
        }
        if (typeof data.demoMode === 'boolean') {
          setDemoMode(data.demoMode)
        }
      }
    } catch (err) {
      console.warn('⚠️ Order tracking poll error:', err.message)
    } finally {
      if (isInitial) {
        setLoading(false)
      }
    }
  }, [orderId])

  // Initial fetch and 4-second reactive polling loop
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(true)

      // Start reactive polling interval
      pollingTimerRef.current = setInterval(() => {
        fetchOrderDetails(false)
      }, 4000)

      return () => {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current)
          pollingTimerRef.current = null
        }
      }
    } else {
      // Fetch user's order history
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
  }, [orderId, fetchOrderDetails])

  // Stop polling once order is cancelled or delivered for 20+ seconds
  useEffect(() => {
    if (order?.orderStatus === 'cancelled') {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
    }
  }, [order?.orderStatus])

  // Demo Admin Transition Handler
  const handleManualStatusUpdate = async (newStatus) => {
    if (!orderId || isUpdatingStatus) return

    setIsUpdatingStatus(true)
    setActionMessage(`Updating status to ${newStatus.replace('_', ' ')}...`)

    try {
      const res = await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-admin': 'true',
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Manual status transition to ${newStatus.replace('_', ' ')} via demo controls.`,
        }),
      })

      const data = await res.json()
      if (data.success && data.order) {
        setOrder(data.order)
        if (data.deliveryPartner) {
          setDeliveryPartner(data.deliveryPartner)
        }
        setActionMessage(`✓ Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`)
        setTimeout(() => setActionMessage(null), 3500)
        await fetchOrderDetails(false)
      } else {
        setActionMessage(`⚠️ ${data.message || 'Failed to update status'}`)
        setTimeout(() => setActionMessage(null), 4000)
      }
    } catch (err) {
      setActionMessage(`⚠️ Error: ${err.message}`)
      setTimeout(() => setActionMessage(null), 4000)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Reset Demo Simulation Handler
  const handleResetDemo = async () => {
    if (!orderId || isUpdatingStatus) return

    setIsUpdatingStatus(true)
    setActionMessage('Restarting simulation with new delivery partner...')

    try {
      const res = await apiFetch(`/orders/${orderId}/reset-demo`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success && data.order) {
        setOrder(data.order)
        if (data.deliveryPartner) {
          setDeliveryPartner(data.deliveryPartner)
        }
        setActionMessage('✓ Demo simulation restarted! Status set to Order Placed.')
        setTimeout(() => setActionMessage(null), 3500)
        await fetchOrderDetails(false)
      }
    } catch (err) {
      setActionMessage(`⚠️ Reset error: ${err.message}`)
      setTimeout(() => setActionMessage(null), 4000)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="track-order-container">
        <div className="status-spinner-wrap">
          <div className="status-spinner" />
          <p>Connecting to BiteBox live telemetry & MongoDB...</p>
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
          <p>Track your past delicious meals and live active deliveries</p>
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
                  {ord.items?.map((i, idx) => (
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

  // Progress line fill percentage
  const progressPercent =
    currentStep <= 1
      ? 5
      : currentStep === 2
        ? 28
        : currentStep === 3
          ? 52
          : currentStep === 4
            ? 78
            : 100

  return (
    <div className="track-order-container">
      <div className="track-order-card">
        {/* Tracking Card Header */}
        <div className="track-header">
          <div>
            <div className="track-header-badges">
              <span className="track-sub">LIVE DELIVERY STATUS</span>
              {demoMode && (
                <span className="demo-mode-badge" title="Demo auto-progression is enabled">
                  ⚡ DEMO MODE
                </span>
              )}
            </div>
            <h1 className="track-order-id">Order {order?.orderId || orderId}</h1>
            <p className="track-est-time">
              {order?.orderStatus === 'delivered' ? (
                <span className="delivered-tag">🎉 Order Delivered Successfully</span>
              ) : order?.orderStatus === 'cancelled' ? (
                <span className="cancelled-tag">✕ Order Cancelled</span>
              ) : (
                <>
                  Estimated Delivery: <strong>{tracking?.etaMinutes ?? 25} mins</strong>
                  <span className="est-sub"> • Handcrafted fresh at BiteBox kitchen</span>
                </>
              )}
            </p>
          </div>
          <Link to="/my-orders" className="all-orders-link">
            ← View All Orders
          </Link>
        </div>

        {/* Dynamic Multi-Step Timeline */}
        <div className="track-timeline-section">
          <div className="stepper-horizontal">
            {/* Connecting progress track line */}
            <div className="stepper-track-bg">
              <div
                className="stepper-track-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {LIFECYCLE_STEPS.map((step) => {
              const isDone = currentStep > step.num || order?.orderStatus === 'delivered'
              const isCurrent = currentStep === step.num && order?.orderStatus !== 'delivered'
              const isUpcoming = currentStep < step.num && order?.orderStatus !== 'delivered'

              // Find milestone timestamp in statusHistory
              const historyItem = order?.statusHistory?.find((h) => h.status === step.key)
              const timeString = historyItem?.timestamp
                ? new Date(historyItem.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : step.num === 1 && order?.placedAt
                  ? new Date(order.placedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : null

              return (
                <div
                  key={step.key}
                  className={`stepper-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                >
                  <div className="stepper-circle">
                    {isDone ? (
                      <span className="check-icon">✓</span>
                    ) : isCurrent ? (
                      <span className="current-pulse-icon">{step.icon}</span>
                    ) : (
                      <span className="upcoming-num">{step.num}</span>
                    )}
                  </div>
                  <div className="stepper-info">
                    <strong className="stepper-label">{step.label}</strong>
                    <span className="stepper-time">
                      {timeString ? `⏱️ ${timeString}` : isCurrent ? 'In progress' : step.desc}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cancellation Notice if Cancelled */}
        {order?.orderStatus === 'cancelled' && (
          <div className="order-cancelled-banner">
            <span className="cancel-icon">⚠️</span>
            <div>
              <h4>This order was cancelled</h4>
              <p>Refund or cancellation details have been updated in your account.</p>
            </div>
          </div>
        )}

        {/* Interactive Delivery Tracking Map */}
        <DeliveryTrackingMap
          order={order}
          tracking={tracking}
          partner={deliveryPartner}
          orderStatus={order?.orderStatus || 'placed'}
        />

        {/* Dynamic Delivery Partner Card */}
        <div className="dynamic-rider-card">
          {deliveryPartner ? (
            <div className="rider-card-inner">
              <div className="rider-avatar-wrap">
                <span className="rider-vehicle-icon">
                  {deliveryPartner.vehicleType?.toLowerCase().includes('scooter') ||
                  deliveryPartner.vehicleType?.toLowerCase().includes('ev') ||
                  deliveryPartner.vehicleType?.toLowerCase().includes('ather')
                    ? '🛵'
                    : '🏍️'}
                </span>
                <span className="rider-active-badge">ASSIGNED</span>
              </div>

              <div className="rider-info-col">
                <div className="rider-name-row">
                  <h4>{deliveryPartner.name}</h4>
                  <span className="rider-valet-tag">Delivery Valet</span>
                  {demoMode && <span className="demo-valet-tag">Demo Valet</span>}
                </div>
                <p className="rider-vehicle-text">
                  <span>{deliveryPartner.vehicleType}</span> • <strong>{deliveryPartner.vehicleNumber}</strong>
                </p>
                <div className="rider-metrics-row">
                  <span className="rider-rating">⭐ {deliveryPartner.rating || 4.8} Rating</span>
                  <span className="rider-deliveries">
                    🏆 {deliveryPartner.completedDeliveries || 1000}+ safe deliveries
                  </span>
                  {order?.deliveryPartnerAssignedAt && (
                    <span className="rider-assigned-time">
                      ⏱️ Assigned {new Date(order.deliveryPartnerAssignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="rider-action-col">
                <a
                  href={`tel:${deliveryPartner.phone?.replace(/[^0-9+]/g, '') || '9876543210'}`}
                  className="call-rider-btn"
                  title="Call delivery partner"
                >
                  <span className="call-icon">📞</span>
                  <span>Call Partner</span>
                </a>
                <span className="rider-phone-masked">{deliveryPartner.phone}</span>
              </div>
            </div>
          ) : (
            <div className="rider-finding-box">
              <div className="finding-pulse-ring" />
              <div className="finding-text-wrap">
                <h4>Finding your nearest delivery partner...</h4>
                <p>Matching an available valet partner with optimal delivery route near BiteBox kitchen</p>
              </div>
            </div>
          )}
        </div>

        {/* Demo Mode Admin & Simulation Control Panel */}
        {demoMode && (
          <div className="demo-controls-panel">
            <div className="demo-controls-header">
              <div className="demo-title-wrap">
                <span className="demo-gear-icon">⚙️</span>
                <h3>Demo Order Lifecycle Simulator</h3>
              </div>
              <span className="demo-timing-pill">
                Auto-advances: 10s Confirmed → 25s Cooking → 45s Rider → 90s Delivered
              </span>
            </div>

            <p className="demo-explanation">
              You are running in <strong>Demo Mode</strong>. Order statuses advance automatically and update MongoDB in real-time. Use the interactive controls below to manually test state transitions or reset the simulation.
            </p>

            <div className="demo-buttons-grid">
              <button
                type="button"
                className={`demo-btn ${order?.orderStatus === 'confirmed' ? 'active' : ''}`}
                onClick={() => handleManualStatusUpdate('confirmed')}
                disabled={isUpdatingStatus || order?.orderStatus === 'delivered' || order?.orderStatus === 'cancelled'}
              >
                ✓ Confirm
              </button>
              <button
                type="button"
                className={`demo-btn ${order?.orderStatus === 'preparing' ? 'active' : ''}`}
                onClick={() => handleManualStatusUpdate('preparing')}
                disabled={isUpdatingStatus || order?.orderStatus === 'delivered' || order?.orderStatus === 'cancelled'}
              >
                👨‍🍳 Cook
              </button>
              <button
                type="button"
                className={`demo-btn ${order?.orderStatus === 'out_for_delivery' ? 'active' : ''}`}
                onClick={() => handleManualStatusUpdate('out_for_delivery')}
                disabled={isUpdatingStatus || order?.orderStatus === 'delivered' || order?.orderStatus === 'cancelled'}
              >
                🛵 Dispatch
              </button>
              <button
                type="button"
                className={`demo-btn ${order?.orderStatus === 'delivered' ? 'active' : ''}`}
                onClick={() => handleManualStatusUpdate('delivered')}
                disabled={isUpdatingStatus || order?.orderStatus === 'delivered' || order?.orderStatus === 'cancelled'}
              >
                🎉 Delivered
              </button>
              <button
                type="button"
                className="demo-btn reset-btn"
                onClick={handleResetDemo}
                disabled={isUpdatingStatus}
                title="Reset order to placed state and assign a new delivery partner"
              >
                🔄 Reset Simulation
              </button>
            </div>

            {actionMessage && <div className="demo-action-toast">{actionMessage}</div>}
          </div>
        )}

        {/* Order Details & Summary Breakdown */}
        <div className="track-details-grid">
          <div className="track-items-box">
            <h3>Dishes in this order ({order?.items?.length || 0})</h3>
            <ul className="track-dishes-list">
              {order?.items?.map((item, idx) => (
                <li key={idx}>
                  <div className="dish-summary-item">
                    <strong>{item.name}</strong>
                    <span className="dish-qty-tag">Qty: {item.quantity}</span>
                  </div>
                  <strong className="dish-price-total">₹{item.price * item.quantity}</strong>
                </li>
              ))}
            </ul>

            <div className="payment-status-box">
              <div className="payment-method-indicator">
                <span>Payment Method:</span>
                <strong>{order?.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}</strong>
              </div>
              <div className="payment-badge-row">
                <span>Payment Status:</span>
                <span className={`payment-tag ${order?.paymentStatus || 'unpaid'}`}>
                  {order?.paymentStatus === 'paid'
                    ? '✓ PAID'
                    : order?.paymentMethod === 'cod'
                      ? 'COLLECT CASH ON DELIVERY (UNPAID)'
                      : 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          <div className="track-delivery-box">
            <h3>Delivery Address</h3>
            <p className="recipient-name">
              <strong>{order?.deliveryAddress?.fullName}</strong>
              <span className="address-tag-badge">({order?.deliveryAddress?.tag || 'Home'})</span>
            </p>
            <p className="address-lines">{order?.deliveryAddress?.addressLine}, {order?.deliveryAddress?.area}</p>
            <p className="address-city-pin">{order?.deliveryAddress?.city} - {order?.deliveryAddress?.pincode}</p>
            <p className="address-phone">📞 Recipient Phone: {order?.deliveryAddress?.phone}</p>

            <div className="track-price-breakdown">
              <div className="price-item-row">
                <span>Items Total:</span>
                <span>₹{order?.pricing?.itemTotal || 0}</span>
              </div>
              {order?.pricing?.discount > 0 && (
                <div className="price-item-row discount">
                  <span>Coupon Discount:</span>
                  <span>-₹{order?.pricing?.discount}</span>
                </div>
              )}
              <div className="price-item-row">
                <span>Delivery & Taxes:</span>
                <span>₹{(order?.pricing?.deliveryFee || 40) + (order?.pricing?.taxes || 0)}</span>
              </div>
              <div className="track-price-pill">
                <span>Grand Total:</span>
                <strong>₹{order?.pricing?.grandTotal || 0}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="track-footer-actions">
          <Link to="/" className="order-more-btn">
            Order More Dishes 🍕
          </Link>
        </div>
      </div>
    </div>
  )
}
