import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link, useLocation } from 'react-router-dom'
import '../style.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export default function PaymentStatusPage() {
  const { orderId: paramOrderId } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const statusQuery = searchParams.get('status')
  const orderIdQuery = searchParams.get('orderId')
  const errorQuery = searchParams.get('error')

  const effectiveOrderId = paramOrderId || orderIdQuery || ''
  const isFailed = statusQuery === 'failed'

  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!location.state?.order && Boolean(effectiveOrderId))

  useEffect(() => {
    if (effectiveOrderId && !order) {
      fetch(`${API_BASE_URL}/v1/orders/${effectiveOrderId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.order) {
            setOrder(data.order)
          }
        })
        .catch((err) => console.warn('Could not fetch order details:', err))
        .finally(() => setLoading(false))
    }
  }, [effectiveOrderId, order])

  if (loading) {
    return (
      <div className="status-page-container">
        <div className="status-spinner-wrap">
          <div className="status-spinner" />
          <p>Verifying payment status with gateway...</p>
        </div>
      </div>
    )
  }

  // PAYMENT FAILED VIEW
  if (isFailed) {
    return (
      <div className="status-page-container">
        <div className="status-card failed-card">
          <div className="status-icon-wrap failed">✕</div>
          <h1 className="status-title failed">Payment Failed</h1>
          <p className="status-subtitle">
            {errorQuery
              ? decodeURIComponent(errorQuery)
              : 'Your payment could not be processed by the gateway.'}
          </p>

          {effectiveOrderId && (
            <div className="status-details-box">
              <div className="status-detail-row">
                <span>Order Reference</span>
                <strong>{effectiveOrderId}</strong>
              </div>
              <div className="status-detail-row">
                <span>Payment Status</span>
                <span className="badge-tag failed">Unpaid / Failed</span>
              </div>
            </div>
          )}

          <p className="status-hint">
            Don't worry! Your cart items are safe. You can retry with another payment method or choose Cash on Delivery.
          </p>

          <div className="status-actions-row">
            <Link to="/checkout" className="primary-action-btn">
              🔄 Retry Payment
            </Link>
            <Link to="/cart" className="secondary-action-btn">
              Return to Cart
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // PAYMENT SUCCESS VIEW
  return (
    <div className="status-page-container">
      <div className="status-card success-card">
        <div className="status-icon-wrap success">✓</div>
        <h1 className="status-title success">Payment Successful!</h1>
        <p className="status-subtitle">
          Your BiteBox order has been confirmed and sent to the kitchen.
        </p>

        <div className="status-details-box">
          <div className="status-detail-row">
            <span>Order ID</span>
            <strong className="order-highlight-id">{order?.orderId || effectiveOrderId || 'BB-2026-CONFIRMED'}</strong>
          </div>

          <div className="status-detail-row">
            <span>Amount Paid</span>
            <strong className="order-highlight-price">
              ₹{order?.pricing?.grandTotal || 'Confirmed'}
            </strong>
          </div>

          <div className="status-detail-row">
            <span>Payment Method</span>
            <span className="badge-tag success">
              {order?.paymentMethod === 'cod'
                ? 'Cash on Delivery (Pending)'
                : order?.paymentMethod === 'upi_qr'
                ? 'UPI QR Code (Paid)'
                : order?.paymentMethod === 'upi_app'
                ? 'UPI Instant (Paid)'
                : order?.paymentMethod === 'card'
                ? 'Credit / Debit Card (Paid)'
                : order?.paymentMethod === 'netbanking'
                ? 'Net Banking (Paid)'
                : 'Razorpay Verified'}
            </span>
          </div>

          <div className="status-detail-row">
            <span>Estimated Delivery</span>
            <strong>⏱️ 25 - 35 Minutes</strong>
          </div>

          {order?.deliveryAddress && (
            <div className="status-detail-row address">
              <span>Delivering To</span>
              <p>
                {order.deliveryAddress.fullName} • {order.deliveryAddress.addressLine}, {order.deliveryAddress.area}, {order.deliveryAddress.city}
              </p>
            </div>
          )}
        </div>

        {/* Order Items Preview */}
        {order?.items && order.items.length > 0 && (
          <div className="confirmed-items-list">
            <h4>Ordered Items ({order.items.length}):</h4>
            <ul>
              {order.items.map((item, idx) => (
                <li key={idx}>
                  <span>{item.name} × {item.quantity}</span>
                  <strong>₹{item.price * item.quantity}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="status-actions-row">
          <Link
            to={`/track-order/${order?.orderId || effectiveOrderId}`}
            className="primary-action-btn track-btn"
          >
            🛵 Track Your Order
          </Link>
          <Link to="/" className="secondary-action-btn">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
