import { useState } from 'react'
import Card from "./Card";
import FilterBar from "./FilterBar";
import { products } from '../data/product'

export default function Pizza() {
    const [filter, setFilter] = useState('all')

    const filteredProducts = products
        .filter((i) => i.category === "pizza")
        .filter((i) => {
            if (filter === 'veg') return i.isVeg
            if (filter === 'non-veg') return !i.isVeg
            return true
        })

    return (
        <div>
            <FilterBar filter={filter} setFilter={setFilter} />

            <div className="products-grid">
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
                    <p>No {filter === 'veg' ? 'vegetarian' : 'non-vegetarian'} pizzas found.</p>
                    <button type="button" className="filter-btn active" onClick={() => setFilter('all')}>
                        Show All Pizzas
                    </button>
                </div>
            )}
        </div>
    )
}
