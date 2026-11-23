import { useContext, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../context/cartContext'
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

    const colors = ['#b83d0b', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#e11d48']
    const particles = []
    const particleCount = 140

    // Left cannon burst
    for (let i = 0; i < particleCount / 2; i++) {
        particles.push({
            x: canvas.width * 0.15,
            y: canvas.height * 0.85,
            vx: Math.random() * 12 + 4,
            vy: -(Math.random() * 14 + 8),
            size: Math.random() * 8 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 12,
            opacity: 1,
            shape: Math.random() > 0.4 ? 'rect' : 'circle'
        })
    }

    // Right cannon burst
    for (let i = 0; i < particleCount / 2; i++) {
        particles.push({
            x: canvas.width * 0.85,
            y: canvas.height * 0.85,
            vx: -(Math.random() * 12 + 4),
            vy: -(Math.random() * 14 + 8),
            size: Math.random() * 8 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 12,
            opacity: 1,
            shape: Math.random() > 0.4 ? 'rect' : 'circle'
        })
    }

    let animationId
    const startTime = performance.now()
    const duration = 2800

    function render(currentTime) {
        const elapsed = currentTime - startTime
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        particles.forEach((p) => {
            p.x += p.vx
            p.y += p.vy
            p.vy += 0.38
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

    const subtotal = cart.reduce(
        (total, item) => total + item.price * (item.qty || 1),
        0
    )
    const totalItems = cart.reduce(
        (total, item) => total + (item.qty || 1),
        0
    )
    const isFreeDelivery = subtotal >= 500
    const deliveryFee = subtotal > 0 && !isFreeDelivery ? 50 : 0
    const totalAmount = subtotal + deliveryFee

    const hasTriggeredRef = useRef(false)

    useEffect(() => {
        if (isFreeDelivery && !hasTriggeredRef.current) {
            launchConfetti()
            hasTriggeredRef.current = true
        } else if (!isFreeDelivery) {
            hasTriggeredRef.current = false
        }
    }, [isFreeDelivery])

    if (cart.length === 0) {
        return (
            <div className="cart-container">
                <div className="cart-empty">
                    <h2>Your Cart is Empty</h2>
                    <p>Looks like you haven't added anything to your cart yet.</p>
                    <Link to="/" className="cart-empty__btn">
                        Browse Food Menu
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="cart-container">
            {isFreeDelivery && (
                <div className="free-delivery-celebration">
                    <span className="celebration-icon">🎉</span>
                    <div>
                        <strong>Woohoo! You unlocked FREE Delivery!</strong>
                        <p>No delivery charges applied on orders of ₹500 or above.</p>
                    </div>
                    <span className="celebration-icon">🚚✨</span>
                </div>
            )}

            <h2 className="cart-title">Your Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})</h2>

            <div className="cart-content">
                <div className="cart-items">
                    {cart.map((item) => {
                        const qty = item.qty || 1
                        return (
                            <div key={item.id} className="cart-item">
                                <img
                                    src={item.img}
                                    alt={item.name}
                                    className="cart-item__img"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?w=600";
                                    }}
                                />

                                <div className="cart-item__info">
                                    <h3 className="cart-item__name">{item.name}</h3>
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

                                <div style={{ minWidth: '70px', textAlign: 'right', fontWeight: '700', color: '#a83a0d' }}>
                                    ₹{item.price * qty}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleRemove(item.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#999',
                                        fontSize: '1.2rem',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                    title="Remove item"
                                    aria-label="Remove item"
                                >
                                    ✕
                                </button>
                            </div>
                        )
                    })}
                </div>

                <div className="cart-summary">
                    <h3>Order Summary</h3>
                    <div className="cart-summary__row">
                        <span>Items ({totalItems})</span>
                        <span>₹{subtotal}</span>
                    </div>
                    <div className="cart-summary__row">
                        <span>Delivery Fee</span>
                        {isFreeDelivery ? (
                            <span style={{ color: '#2e7d32', fontWeight: '700' }}>FREE</span>
                        ) : (
                            <span style={{ fontWeight: '600' }}>₹{deliveryFee}</span>
                        )}
                    </div>
                    {!isFreeDelivery && subtotal > 0 && (
                        <p style={{ margin: '-4px 0 12px', fontSize: '0.85rem', color: '#b83d0b' }}>
                            Add items worth ₹{500 - subtotal} more to get <strong>FREE Delivery</strong>!
                        </p>
                    )}
                    <div className="cart-summary__row total">
                        <span>Total Amount</span>
                        <span>₹{totalAmount}</span>
                    </div>

                    <button
                        type="button"
                        className="cart-checkout-btn"
                        onClick={() => alert('Order placed successfully! Thank you for ordering.')}
                    >
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    )
}
