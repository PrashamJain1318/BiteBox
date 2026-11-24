import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

export default function RestaurantListing({
  restaurants = [],
  activeCategory = null,
  onClearCategory = () => {},
  activeCity = null,
  onClearCity = () => {},
}) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('relevance') // 'relevance' | 'rating' | 'delivery' | 'cost_asc' | 'cost_desc'
  const [isFastDeliveryOnly, setIsFastDeliveryOnly] = useState(false)
  const [isRating4Plus, setIsRating4Plus] = useState(false)
  const [isPureVegOnly, setIsPureVegOnly] = useState(false)
  const [hasOffersOnly, setHasOffersOnly] = useState(false)
  const [priceFilter, setPriceFilter] = useState('all') // 'all' | 'under200' | '200to350' | 'above350'
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false)

  // Filter & Sort Pipeline
  const filteredAndSortedRestaurants = useMemo(() => {
    let list = [...restaurants]

    // 1. Search Query
    const query = search.trim().toLowerCase()
    if (query) {
      list = list.filter((r) => {
        const matchesBasic =
          r.name.toLowerCase().includes(query) ||
          r.cuisine.toLowerCase().includes(query) ||
          r.location.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)

        // Check if menu has any dish matching search
        const matchesMenu = r.menu?.some(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.desc.toLowerCase().includes(query) ||
            m.category.toLowerCase().includes(query)
        )

        return matchesBasic || matchesMenu
      })
    }

    // 2. Active Category (from circular food categories carousel)
    if (activeCategory) {
      list = list.filter((r) => {
        const cuisine = r.cuisine.toLowerCase()
        const desc = r.description.toLowerCase()

        if (activeCategory === 'pizza') return cuisine.includes('pizza') || desc.includes('pizza')
        if (activeCategory === 'burger') return cuisine.includes('burger') || desc.includes('burger')
        if (activeCategory === 'sandwich') return cuisine.includes('sandwich') || desc.includes('sandwich')
        if (activeCategory === 'beverages') return cuisine.includes('beverage') || cuisine.includes('shake') || cuisine.includes('boba') || cuisine.includes('coffee')
        if (activeCategory === 'biryani') return cuisine.includes('indian') || desc.includes('keema') || desc.includes('spiced')
        if (activeCategory === 'south-indian') return cuisine.includes('cafe') || r.isPureVeg
        if (activeCategory === 'north-indian') return cuisine.includes('indian') || cuisine.includes('tandoori')
        if (activeCategory === 'cakes' || activeCategory === 'desserts') return desc.includes('shake') || desc.includes('dessert')
        if (activeCategory === 'chinese') return cuisine.includes('street') || cuisine.includes('fusion')
        if (activeCategory === 'pasta') return cuisine.includes('italian')
        if (activeCategory === 'rolls') return cuisine.includes('rolls') || cuisine.includes('wraps')

        return true
      })
    }

    // 3. Fast Delivery (<= 30 mins)
    if (isFastDeliveryOnly) {
      list = list.filter((r) => (r.deliveryMinutes || 30) <= 25)
    }

    // 4. Rating 4.0+
    if (isRating4Plus) {
      list = list.filter((r) => r.rating >= 4.5)
    }

    // 5. Pure Veg
    if (isPureVegOnly) {
      list = list.filter((r) => r.isPureVeg)
    }

    // 6. Offers Only
    if (hasOffersOnly) {
      list = list.filter((r) => Boolean(r.offer))
    }

    // 7. Price Filter
    if (priceFilter === 'under200') {
      list = list.filter((r) => r.startingPrice <= 150)
    } else if (priceFilter === '200to350') {
      list = list.filter((r) => r.startingPrice > 150 && r.startingPrice <= 250)
    } else if (priceFilter === 'above350') {
      list = list.filter((r) => r.startingPrice > 250)
    }

    // 8. Sorting
    list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'delivery') return (a.deliveryMinutes || 30) - (b.deliveryMinutes || 30)
      if (sortBy === 'cost_asc') return a.startingPrice - b.startingPrice
      if (sortBy === 'cost_desc') return b.startingPrice - a.startingPrice
      return 0 // relevance
    })

    return list
  }, [
    restaurants,
    search,
    activeCategory,
    isFastDeliveryOnly,
    isRating4Plus,
    isPureVegOnly,
    hasOffersOnly,
    priceFilter,
    sortBy,
  ])

  // Count active filters
  const activeFiltersCount = [
    isFastDeliveryOnly,
    isRating4Plus,
    isPureVegOnly,
    hasOffersOnly,
    priceFilter !== 'all',
    activeCategory !== null,
    activeCity !== null,
    search.trim() !== '',
    sortBy !== 'relevance',
  ].filter(Boolean).length

  const handleClearAllFilters = () => {
    setSearch('')
    setSortBy('relevance')
    setIsFastDeliveryOnly(false)
    setIsRating4Plus(false)
    setIsPureVegOnly(false)
    setHasOffersOnly(false)
    setPriceFilter('all')
    onClearCategory()
    onClearCity()
  }

  const sortLabels = {
    relevance: 'Relevance (Default)',
    rating: 'Rating: High to Low',
    delivery: 'Delivery Time: Low to High',
    cost_asc: 'Cost: Low to High',
    cost_desc: 'Cost: High to Low',
  }

  return (
    <section id="restaurants" className="restaurant-listing-section">
      <div className="section-header-row">
        <div>
          <h2 className="swiggy-section-title">
            {activeCity
              ? `Restaurants with online food delivery in ${activeCity}`
              : 'Restaurants with online food delivery near you'}
          </h2>
          <p className="swiggy-section-sub">
            {filteredAndSortedRestaurants.length} restaurants open now {activeCity ? `in ${activeCity}` : 'with fresh menus'}
          </p>
        </div>
      </div>

      {/* TOOLBAR: Sorting, Filters & Search */}
      <div className="swiggy-toolbar">
        <div className="swiggy-toolbar__filters">
          {activeCity && (
            <button
              type="button"
              className="filter-pill-btn active"
              onClick={onClearCity}
              title="Click to clear city filter"
              style={{ backgroundColor: '#ff5200', color: '#fff', borderColor: '#ff5200' }}
            >
              📍 {activeCity} ✕
            </button>
          )}
          {/* SORT BY DROPDOWN */}
          <div className="toolbar-dropdown-wrap">
            <button
              type="button"
              className={`filter-pill-btn ${sortBy !== 'relevance' ? 'active' : ''}`}
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            >
              <span>Sort By: <strong>{sortLabels[sortBy].split(':')[0]}</strong></span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isSortDropdownOpen && (
              <div className="sort-dropdown-menu">
                {Object.entries(sortLabels).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`sort-option-btn ${sortBy === key ? 'selected' : ''}`}
                    onClick={() => {
                      setSortBy(key)
                      setIsSortDropdownOpen(false)
                    }}
                  >
                    {label}
                    {sortBy === key && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FAST DELIVERY */}
          <button
            type="button"
            className={`filter-pill-btn ${isFastDeliveryOnly ? 'active' : ''}`}
            onClick={() => setIsFastDeliveryOnly(!isFastDeliveryOnly)}
          >
            ⚡ Fast Delivery (≤ 25 mins)
          </button>

          {/* RATING 4.0+ */}
          <button
            type="button"
            className={`filter-pill-btn ${isRating4Plus ? 'active' : ''}`}
            onClick={() => setIsRating4Plus(!isRating4Plus)}
          >
            ⭐ Ratings 4.5+
          </button>

          {/* PURE VEG */}
          <button
            type="button"
            className={`filter-pill-btn veg-pill ${isPureVegOnly ? 'active' : ''}`}
            onClick={() => setIsPureVegOnly(!isPureVegOnly)}
          >
            <span className="pure-veg-dot">●</span> Pure Veg
          </button>

          {/* OFFERS */}
          <button
            type="button"
            className={`filter-pill-btn ${hasOffersOnly ? 'active' : ''}`}
            onClick={() => setHasOffersOnly(!hasOffersOnly)}
          >
            🏷️ Offers
          </button>

          {/* PRICE TIERS */}
          <button
            type="button"
            className={`filter-pill-btn ${priceFilter === 'under200' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === 'under200' ? 'all' : 'under200')}
          >
            Under ₹150
          </button>

          <button
            type="button"
            className={`filter-pill-btn ${priceFilter === '200to350' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === '200to350' ? 'all' : '200to350')}
          >
            ₹150 - ₹250
          </button>

          {/* CLEAR ALL */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              className="clear-all-pill-btn"
              onClick={handleClearAllFilters}
            >
              Reset Filters ({activeFiltersCount}) ✕
            </button>
          )}
        </div>

        {/* INLINE SEARCH BAR */}
        <div className="toolbar-search-wrap">
          <svg className="toolbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search restaurants, cuisines or dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="toolbar-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {/* ACTIVE CATEGORY BANNER */}
      {activeCategory && (
        <div className="active-filter-alert">
          <span>Filtering by category: <strong>{activeCategory.toUpperCase()}</strong></span>
          <button type="button" onClick={onClearCategory}>Clear Category ✕</button>
        </div>
      )}

      {/* RESTAURANT GRID */}
      {filteredAndSortedRestaurants.length > 0 ? (
        <div className="swiggy-restaurant-grid">
          {filteredAndSortedRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              to={`/restaurant/${restaurant.id}`}
              className="swiggy-grid-card"
            >
              <div className="swiggy-grid-card__image-wrap">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                  }}
                />
                <div className="swiggy-grid-card__overlay">
                  <span className="swiggy-grid-card__offer">{restaurant.offer || 'FLAT 20% OFF'}</span>
                </div>
              </div>

              <div className="swiggy-grid-card__content">
                <h3 className="swiggy-grid-card__name" title={restaurant.name}>{restaurant.name}</h3>

                <div className="swiggy-grid-card__rating-row">
                  <span className="green-rating-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {restaurant.rating.toFixed(1)}
                  </span>
                  <span className="swiggy-grid-card__dot">•</span>
                  <span className="swiggy-grid-card__time">{restaurant.deliveryTime}</span>
                </div>

                <p className="swiggy-grid-card__cuisine" title={restaurant.cuisine}>{restaurant.cuisine}</p>

                <div className="swiggy-grid-card__footer">
                  <span className="swiggy-grid-card__location">{restaurant.location}</span>
                  <span className="swiggy-grid-card__price">From ₹{restaurant.startingPrice}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-restaurants-view">
          <div className="empty-icon">🍽️</div>
          <h3>No restaurants found</h3>
          <p>We couldn't find any restaurants matching your current filters or search term.</p>
          <button type="button" className="empty-reset-btn" onClick={handleClearAllFilters}>
            Clear All Filters
          </button>
        </div>
      )}
    </section>
  )
}
