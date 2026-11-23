import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../style.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export default function TrackOrderPage() {
  const { orderId } = useParams()

  const [order, setOrder] = useState(null)
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(2) // 1: Placed, 2: Confirmed, 3: Preparing, 4: Out for Delivery, 5: Delivered

  useEffect(() => {
    if (orderId) {
      fetch(`${API_BASE_URL}/v1/orders/${orderId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.order) {
            setOrder(data.order)
            // Map order status to stepper
            const statusMap = {
              placed: 1,
              confirmed: 2,
              preparing: 3,
              out_for_delivery: 4,
              delivered: 5,
              cancelled: 0,
            }
            setActiveStep(statusMap[data.order.orderStatus] || 2)
          }
        })
        .catch((err) => console.warn(err))
        .finally(() => setLoading(false))
    } else {
      // Fetch user's order history
      fetch(`${API_BASE_URL}/v1/orders/my-orders`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.orders) {
            setAllOrders(data.orders)
          }
        })
        .catch((err) => console.warn(err))
        .finally(() => setLoading(false))
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="track-order-container">
        <div className="status-spinner-wrap">
          <div className="status-spinner" />
          <p>Loading order details...</p>
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
            <span className="track-sub">LIVE DELIVERY STATUS</span>
            <h1 className="track-order-id">Order {order?.orderId || orderId}</h1>
            <p className="track-est-time">Estimated Delivery: <strong>25 - 30 mins</strong></p>
          </div>
          <Link to="/my-orders" className="all-orders-link">
            View All Orders
          </Link>
        </div>

        {/* Live Stepper */}
        <div className="stepper-horizontal">
          {steps.map((s) => {
            const isDone = activeStep >= s.num
            const isCurrent = activeStep === s.num
            return (
              <div
                key={s.num}
                className={`stepper-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="stepper-circle">
                  {isDone ? s.icon : s.num}
                </div>
                <div className="stepper-info">
                  <strong>{s.label}</strong>
                  <span>{s.time}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Delivery Partner Box */}
        <div className="rider-card">
          <div className="rider-avatar">🛵</div>
          <div className="rider-details">
            <h4>Ramesh Kumar (Valet Partner)</h4>
            <p>⭐ 4.9 Rating • 2,400+ safe deliveries completed</p>
          </div>
          <a href="tel:9876543210" className="call-rider-btn">
            📞 Call Partner
          </a>
        </div>

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
              <strong>{order?.deliveryAddress?.fullName}</strong> ({order?.deliveryAddress?.tag})
            </p>
            <p>{order?.deliveryAddress?.addressLine}, {order?.deliveryAddress?.area}</p>
            <p>{order?.deliveryAddress?.city} - {order?.deliveryAddress?.pincode}</p>
            <p>Phone: {order?.deliveryAddress?.phone}</p>

            <div className="track-price-pill">
              <span>Grand Total:</span>
              <strong>₹{order?.pricing?.grandTotal || 'Paid'}</strong>
            </div>
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
