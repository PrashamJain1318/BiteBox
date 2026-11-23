import { useState } from 'react'
import Card from "./Card";
import BiteBox3D from "./BiteBox3D";
import FilterBar from "./FilterBar";
import { products } from '../data/product'

export default function Home() {
    const [filter, setFilter] = useState('all')

    const filteredProducts = products.filter((i) => {
        if (filter === 'veg') return i.isVeg
        if (filter === 'non-veg') return !i.isVeg
        return true
    })

    return (
        <div className="home-container">
            <header className="hero-section">
                <div className="hero-content">
                    <span className="hero-pill">⚡ Fast & Fresh Delivery</span>
                    <h1>Welcome to <span className="highlight">BiteBox</span> 📦</h1>
                    <p>Craving something delicious? Fresh pizzas, juicy burgers & toasted sandwiches delivered hot to your doorstep!</p>
                    <div className="hero-actions">
                        <a href="#menu" className="hero-btn-primary">Explore Menu 🍕</a>
                        <span className="hero-badge">⭐ 4.9 Rating • 20-30 min delivery</span>
                    </div>
                </div>

                <div className="hero-3d">
                    <BiteBox3D />
                </div>
            </header>

            <FilterBar filter={filter} setFilter={setFilter} />

            <div id="menu" className="products-grid">
                {
                    filteredProducts.map((prod) => {
                        return (
                            <Card
                                key={prod.id}
                                detail={prod}
                            />
                        )
                    })
                }
            </div>

            {filteredProducts.length === 0 && (
                <div className="no-products-msg">
                    <p>No items found for this filter.</p>
                    <button type="button" className="filter-btn active" onClick={() => setFilter('all')}>
                        Show All Items
                    </button>
                </div>
            )}
        </div>
    )
}
