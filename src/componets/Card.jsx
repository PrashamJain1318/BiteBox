import { useState, useContext } from 'react'
import { CartContext } from '../context/cartContext'
import '../style.css'

export default function Card({ detail }) {
    const { cart, setCart } = useContext(CartContext)
    const [isSqueezing, setIsSqueezing] = useState(false)

    const cartItem = cart.find((item) => item.id === detail.id)
    const quantity = cartItem ? (cartItem.qty || 1) : 0

    function triggerSqueeze() {
        setIsSqueezing(true)
        setTimeout(() => setIsSqueezing(false), 600)
    }

    function handleAddToCart() {
        triggerSqueeze()
        if (cartItem) {
            setCart(
                cart.map((item) =>
                    item.id === detail.id ? { ...item, qty: (item.qty || 1) + 1 } : item
                )
            )
        } else {
            setCart([...cart, { ...detail, qty: 1 }])
        }
    }

    function handleIncrease() {
        triggerSqueeze()
        setCart(
            cart.map((item) =>
                item.id === detail.id ? { ...item, qty: (item.qty || 1) + 1 } : item
            )
        )
    }

    function handleDecrease() {
        if (!cartItem) return
        if ((cartItem.qty || 1) <= 1) {
            setCart(cart.filter((item) => item.id !== detail.id))
        } else {
            setCart(
                cart.map((item) =>
                    item.id === detail.id ? { ...item, qty: item.qty - 1 } : item
                )
            )
        }
    }

    return (
        <article className={`food-card ${isSqueezing ? 'card-squeeze' : ''}`}>
            <img
                className="food-card__image"
                src={detail.img}
                alt={detail.name}
                loading="lazy"
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?w=600";
                }}
            />

            <div className="food-card__body">
                <div className="food-card__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            className={`diet-badge ${detail.isVeg ? 'veg' : 'non-veg'}`}
                            title={detail.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                            aria-label={detail.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                            <span className="diet-badge__circle"></span>
                        </span>
                        <h3>{detail.name}</h3>
                    </div>
                    <span className="food-card__price">₹{detail.price}</span>
                </div>

                <p>{detail.desc}</p>

                {quantity > 0 ? (
                    <div className="food-card__qty-control">
                        <button
                            onClick={handleDecrease}
                            className="qty-btn"
                            type="button"
                            aria-label="Decrease quantity"
                        >
                            -
                        </button>
                        <span className="qty-count">{quantity}</span>
                        <button
                            onClick={handleIncrease}
                            className="qty-btn"
                            type="button"
                            aria-label="Increase quantity"
                        >
                            +
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleAddToCart}
                        className="food-card__button"
                        type="button"
                    >
                        Add to Cart
                    </button>
                )}
            </div>
        </article>
    );
}
