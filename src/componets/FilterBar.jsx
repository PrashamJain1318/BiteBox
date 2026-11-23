export default function FilterBar({ filter, setFilter }) {
    return (
        <div className="filter-container">
            <button
                type="button"
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
            >
                All
            </button>
            <button
                type="button"
                className={`filter-btn veg ${filter === 'veg' ? 'active' : ''}`}
                onClick={() => setFilter('veg')}
            >
                <span className="diet-dot veg-dot">●</span> Veg
            </button>
            <button
                type="button"
                className={`filter-btn non-veg ${filter === 'non-veg' ? 'active' : ''}`}
                onClick={() => setFilter('non-veg')}
            >
                <span className="diet-dot non-veg-dot">●</span> Non-Veg
            </button>
        </div>
    )
}
