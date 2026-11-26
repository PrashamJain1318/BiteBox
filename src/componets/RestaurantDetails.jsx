import { useMemo, useState, useContext } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRestaurantById } from '../data/multiCityRestaurants'
import { restaurants as fallbackRestaurants } from '../data/restaurants'
import { CartContext } from '../context/cartContext'
import { useCity } from '../context/CityContext'

const menuCategories = [
  { label: 'All Items', value: 'all' },
  { label: 'Burgers', value: 'burger' },
  { label: 'Pizzas', value: 'pizza' },
  { label: 'Sandwiches', value: 'sandwich' },
  { label: 'Beverages', value: 'beverages' },
]

export default function RestaurantDetails() {
  const { restaurantId } = useParams()
  const { cart, setCart } = useContext(CartContext)
  const { selectedCity, changeCityWithCartCheck } = useCity()

  const restaurant = useMemo(() => {
    return getRestaurantById(restaurantId) || fallbackRestaurants.find((item) => item.id === restaurantId)
  }, [restaurantId])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [dietFilter, setDietFilter] = useState('all') // 'all' | 'veg' | 'non-veg'
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMenu = useMemo(() => {
    if (!restaurant) return []
    return restaurant.menu.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const matchesDiet =
        dietFilter === 'all' || (dietFilter === 'veg' ? item.isVeg : !item.isVeg)
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)

      return matchesCategory && matchesDiet && matchesSearch
    })
  }, [restaurant, selectedCategory, dietFilter, searchQuery])

  if (!restaurant) {
    return (
      <main className="swiggy-menu-container">
        <div className="restaurant-not-found">
          <h2>Restaurant not found</h2>
          <p>We couldn't locate this restaurant in our directory.</p>
          <Link to="/" className="swiggy-orange-btn">Back to Restaurants</Link>
        </div>
      </main>
    )
  }

  // Cart helper functions
  const getItemQty = (itemId) => {
    const item = cart.find((i) => i.id === itemId)
    return item ? (item.qty || 1) : 0
  }

  const handleAddToCart = async (product) => {
    const itemWithRestaurant = {
      ...product,
      restaurantId: restaurant.restaurantId || restaurant.id,
      restaurantName: restaurant.name,
      restaurantCity: restaurant.city,
      restaurantCitySlug: restaurant.citySlug || (restaurant.city ? restaurant.city.toLowerCase() : 'bengaluru'),
      restaurantCoords: restaurant.coordinates,
    }

    // Check if cart already contains items from a different city
    if (cart.length > 0) {
      const existingItem = cart[0]
      const cartCity = existingItem.restaurantCitySlug || (existingItem.restaurantCity ? existingItem.restaurantCity.toLowerCase() : null)
      const thisCity = restaurant.citySlug || (restaurant.city ? restaurant.city.toLowerCase() : null)

      if (cartCity && thisCity && cartCity !== thisCity) {
        const proceed = await changeCityWithCartCheck(restaurant.citySlug || restaurant.city, cart, () => {
          setCart([])
          localStorage.removeItem('bitebox_cart')
        })
        if (!proceed || !proceed.success || proceed.cancelled) {
          return
        }
      }
    }

    const existing = cart.find((i) => i.id === product.id)
    if (existing) {
      setCart(cart.map((i) => (i.id === product.id ? { ...i, qty: (i.qty || 1) + 1 } : i)))
    } else {
      setCart([...cart, { ...itemWithRestaurant, qty: 1 }])
    }
  }

  const handleDecreaseQty = (itemId) => {
    const existing = cart.find((i) => i.id === itemId)
    if (!existing) return
    if ((existing.qty || 1) <= 1) {
      setCart(cart.filter((i) => i.id !== itemId))
    } else {
      setCart(cart.map((i) => (i.id === itemId ? { ...i, qty: i.qty - 1 } : i)))
    }
  }

  const isCityMismatch =
    restaurant.citySlug &&
    selectedCity?.slug &&
    restaurant.citySlug.toLowerCase() !== selectedCity.slug.toLowerCase()

  return (
    <main className="swiggy-menu-container">
      {/* City Mismatch Warning Banner */}
      {isCityMismatch && (
        <div
          className="city-mismatch-banner"
          style={{
            backgroundColor: '#FFF9E6',
            border: '1px solid #FFE082',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#7A5200',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span>
            📍 This restaurant is located in <strong>{restaurant.city}</strong> (your selected city in navbar is <strong>{selectedCity.name}</strong>).
          </span>
          <button
            type="button"
            onClick={() =>
              changeCityWithCartCheck(restaurant.citySlug || restaurant.city, cart, () => {
                setCart([])
                localStorage.removeItem('bitebox_cart')
              })
            }
            style={{
              background: '#FF5200',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Switch City to {restaurant.city}
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <nav className="menu-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="crumb-sep">/</span>
        <span>{restaurant.city || 'Bengaluru'}</span>
        <span className="crumb-sep">/</span>
        <span>{restaurant.location}</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{restaurant.name}</span>
      </nav>

      {/* Restaurant Header Card (Swiggy Style) */}
      <section className="swiggy-rest-card">
        <div className="swiggy-rest-card__header">
          <div>
            <h1 className="swiggy-rest-title">{restaurant.name}</h1>
            <p className="swiggy-rest-cuisine">{restaurant.cuisine}</p>
            <p className="swiggy-rest-location">
              Outlet: <strong>{restaurant.location}</strong> • {restaurant.distance || '2.0 km'}
            </p>
            <p className="swiggy-rest-timing">
              🚴 {restaurant.deliveryTime} (Delivery to your location)
            </p>
          </div>

          <div className="swiggy-rest-rating-box">
            <span className="rating-num">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {restaurant.rating.toFixed(1)}
            </span>
            <span className="rating-total">{restaurant.totalRatings || '1K+ ratings'}</span>
            <span className="rating-cost">{restaurant.costForTwo || '₹400 for two'}</span>
          </div>
        </div>

        {/* Deals carousel in restaurant page */}
        <div className="swiggy-rest-offers-row">
          <div className="rest-offer-pill">
            <span className="offer-tag-icon">🏷️</span>
            <div>
              <strong>{restaurant.offer || '60% OFF UPTO ₹120'}</strong>
              <small>USE CODE: BITEBOX60 | ABOVE ₹199</small>
            </div>
          </div>
          <div className="rest-offer-pill">
            <span className="offer-tag-icon">🚴</span>
            <div>
              <strong>FREE DELIVERY</strong>
              <small>ON ORDERS ABOVE ₹149</small>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER & SEARCH TOOLBAR */}
      <section className="swiggy-menu-toolbar">
        {/* Search inside menu */}
        <div className="menu-search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={`Search for dishes in ${restaurant.name}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="menu-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* Veg / Non-Veg diet toggles */}
        <div className="menu-diet-toggles">
          <button
            type="button"
            className={`diet-toggle-btn ${dietFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDietFilter('all')}
          >
            All Items
          </button>
          <button
            type="button"
            className={`diet-toggle-btn veg ${dietFilter === 'veg' ? 'active' : ''}`}
            onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
          >
            <span className="diet-dot veg-dot">●</span> Veg Only
          </button>
          <button
            type="button"
            className={`diet-toggle-btn non-veg ${dietFilter === 'non-veg' ? 'active' : ''}`}
            onClick={() => setDietFilter(dietFilter === 'non-veg' ? 'all' : 'non-veg')}
          >
            <span className="diet-dot non-veg-dot">●</span> Non-Veg
          </button>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="swiggy-menu-tabs">
        {menuCategories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            className={`menu-cat-btn ${selectedCategory === cat.value ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* MENU DISH LIST (Swiggy Style Dish Rows) */}
      <section className="swiggy-dish-list">
        <div className="dish-list-header">
          <h2>
            {selectedCategory === 'all' ? 'Recommended Menu' : selectedCategory.toUpperCase()} ({filteredMenu.length})
          </h2>
        </div>

        {filteredMenu.length > 0 ? (
          <div className="swiggy-dish-items">
            {filteredMenu.map((dish) => {
              const qty = getItemQty(dish.id)
              return (
                <article key={dish.id} className="swiggy-dish-row">
                  <div className="swiggy-dish-info">
                    {/* Diet indicator badge */}
                    <span
                      className={`diet-badge-indicator ${dish.isVeg ? 'veg' : 'non-veg'}`}
                      title={dish.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <span className="diet-inner-circle"></span>
                    </span>

                    <h3 className="swiggy-dish-name">{dish.name}</h3>
                    <div className="swiggy-dish-price">₹{dish.price}</div>
                    <p className="swiggy-dish-desc">{dish.desc}</p>
                  </div>

                  {/* Image & Add Button on the Right */}
                  <div className="swiggy-dish-media">
                    <img
                      src={dish.img}
                      alt={dish.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
                      }}
                    />
                    <div className="swiggy-add-btn-wrap">
                      {qty > 0 ? (
                        <div className="swiggy-qty-control">
                          <button
                            type="button"
                            onClick={() => handleDecreaseQty(dish.id)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(dish)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="swiggy-add-btn"
                          onClick={() => handleAddToCart(dish)}
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-menu-msg">
            <p>No dishes found matching your current filters or search query.</p>
            <button
              type="button"
              className="swiggy-orange-btn"
              onClick={() => {
                setSelectedCategory('all')
                setDietFilter('all')
                setSearchQuery('')
              }}
            >
              Reset Menu Filters
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
