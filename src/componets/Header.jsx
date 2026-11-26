import { useState, useContext, useEffect, useMemo } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CartContext } from '../context/cartContext'
import { useAuth } from '../context/AuthContext'
import { useCity } from '../context/CityContext'
import { getRestaurantsByCity } from '../data/multiCityRestaurants'
import CartCityConflictModal from '../components/CartCityConflictModal'
import { products } from '../data/product'

const OFFERS = [
  { code: 'BITEBOX60', title: '60% OFF up to ₹120', desc: 'Valid on orders above ₹199 across all restaurants', tag: 'TRENDING' },
  { code: 'FREEDEL', title: 'Free Delivery', desc: 'No delivery fee on your first 3 orders above ₹149', tag: 'POPULAR' },
  { code: 'WELCOME150', title: 'Flat ₹150 OFF', desc: 'Welcome treat for all BiteBox foodies on orders above ₹399', tag: 'EXCLUSIVE' },
  { code: 'CHEESE50', title: '50% OFF on Pizzas & Burgers', desc: 'Extra cheese, extra savings! Max discount ₹100', tag: 'CHEESY' },
]

export default function Header() {
  const { cart, setCart } = useContext(CartContext)
  const { user, isAuthenticated, logout } = useAuth()
  const {
    selectedCity,
    supportedCities,
    popularCities,
    detectCurrentLocation,
    changeCityWithCartCheck,
    cartConflict,
    isDetectingLocation,
    locationError,
    setLocationError,
  } = useCity()
  const navigate = useNavigate()

  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [isOffersOpen, setIsOffersOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCode, setCopiedCode] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const totalCartItems = cart.reduce((total, item) => total + (item.qty || 1), 0)

  // Copy coupon code
  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(''), 2500)
  }

  // Filter restaurants scoped to the currently selected city
  const cityRestaurants = useMemo(() => {
    return getRestaurantsByCity(selectedCity?.slug || 'bengaluru')
  }, [selectedCity])

  // Live search results strictly scoped to active city restaurants & dishes
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return { matchedRestaurants: [], matchedDishes: [] }

    const matchedRestaurants = cityRestaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
    ).slice(0, 5)

    const matchedDishes = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q)
    ).slice(0, 6)

    return { matchedRestaurants, matchedDishes }
  }, [searchQuery, cityRestaurants])

  // Filter supported cities list by city search query
  const filteredCities = useMemo(() => {
    const q = citySearchQuery.trim().toLowerCase()
    if (!q) return supportedCities
    return supportedCities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.popularAreas && c.popularAreas.some((a) => a.toLowerCase().includes(q)))
    )
  }, [citySearchQuery, supportedCities])

  const handleSelectCity = async (city) => {
    setLocationError(null)
    const res = await changeCityWithCartCheck(city, cart, () => {
      setCart([])
      localStorage.removeItem('bitebox_cart')
    })
    if (res && res.success && !res.cancelled) {
      setIsLocationOpen(false)
      setCitySearchQuery('')
    }
  }

  const handleDetectLocation = async () => {
    setLocationError(null)
    const res = await detectCurrentLocation()
    if (res && res.success && res.city) {
      const changeRes = await changeCityWithCartCheck(res.city, cart, () => {
        setCart([])
        localStorage.removeItem('bitebox_cart')
      })
      if (changeRes && changeRes.success && !changeRes.cancelled) {
        setIsLocationOpen(false)
        setCitySearchQuery('')
      }
    }
  }

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLocationOpen(false)
        setIsOffersOpen(false)
        setIsHelpOpen(false)
        setIsProfileOpen(false)
        setIsSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsProfileOpen(false)
    navigate('/')
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  const userFirstName = user?.name ? user.name.split(' ')[0] : 'Account'

  return (
    <>
      <header className="swiggy-header">
        <div className="swiggy-header__inner">
          {/* Left section: Logo & Location */}
          <div className="swiggy-header__left">
            <Link to="/" className="bitebox-logo" aria-label="BiteBox Home">
              <span className="bitebox-logo__badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </span>
              <span className="bitebox-logo__text">
                Bite<span className="bitebox-logo__accent">Box</span>
              </span>
            </Link>

            <button
              type="button"
              className="location-selector-btn"
              onClick={() => setIsLocationOpen(true)}
              aria-label="Select delivery location"
            >
              <span className="location-selector-btn__title">📍 {selectedCity?.name || 'Bengaluru'}</span>
              <span className="location-selector-btn__sub">{selectedCity?.state || 'Karnataka'}, India</span>
              <svg className="location-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Right section: Navigation Items */}
          <nav className="swiggy-header__right" aria-label="Main menu">
            <button
              type="button"
              className="nav-action-item"
              onClick={() => setIsSearchOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search</span>
            </button>

            <button
              type="button"
              className="nav-action-item"
              onClick={() => setIsOffersOpen(true)}
            >
              <span className="offer-discount-icon">%</span>
              <span>Offers <span className="nav-super-tag">NEW</span></span>
            </button>

            <button
              type="button"
              className="nav-action-item"
              onClick={() => setIsHelpOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Help</span>
            </button>

            {/* Authentication States */}
            {isAuthenticated && user ? (
              <button
                type="button"
                className="nav-action-item auth-logged-in-btn"
                onClick={() => setIsProfileOpen(true)}
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="user-avatar-mini img-avatar"
                  />
                ) : (
                  <span className="user-avatar-mini">{userInitials}</span>
                )}
                <span>{userFirstName}</span>
              </button>
            ) : (
              <div className="header-auth-buttons">
                <Link to="/login" className="nav-signin-link">
                  Sign In
                </Link>
                <Link to="/signup" className="nav-signup-pill">
                  Sign Up
                </Link>
              </div>
            )}

            <NavLink
              to="/cart"
              className={({ isActive }) => `header-cart-btn ${isActive ? 'active' : ''}`}
              aria-label="View shopping cart"
            >
              <span className="header-cart-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {totalCartItems > 0 && <span className="header-cart-badge">{totalCartItems}</span>}
              </span>
              <span>Cart</span>
            </NavLink>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </nav>
        </div>

        {/* Mobile slide menu */}
        {mobileMenuOpen && (
          <div className="mobile-header-dropdown">
            <button type="button" onClick={() => { setIsLocationOpen(true); setMobileMenuOpen(false) }}>
              📍 Location: {location.area}
            </button>
            <button type="button" onClick={() => { setIsSearchOpen(true); setMobileMenuOpen(false) }}>
              🔍 Search Food & Restaurants
            </button>
            <button type="button" onClick={() => { setIsOffersOpen(true); setMobileMenuOpen(false) }}>
              🏷️ Offers & Discounts
            </button>
            <button type="button" onClick={() => { setIsHelpOpen(true); setMobileMenuOpen(false) }}>
              ❓ Help & FAQs
            </button>
            {isAuthenticated && user ? (
              <>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  👤 Profile ({user.name})
                </Link>
                <button type="button" onClick={() => { handleLogout(); setMobileMenuOpen(false) }}>
                  🚪 Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  🔑 Sign In
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  ✨ Create Account
                </Link>
              </>
            )}
            <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
              🛒 Cart ({totalCartItems} items)
            </Link>
          </div>
        )}
      </header>

      {/* CITY SELECTION MODAL */}
      {isLocationOpen && (
        <div className="swiggy-modal-backdrop" onClick={() => setIsLocationOpen(false)}>
          <div className="swiggy-modal location-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="swiggy-modal__header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Choose Your City</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#686b78' }}>
                  Currently serving {supportedCities.length} major Indian cities
                </p>
              </div>
              <button type="button" className="swiggy-modal__close" onClick={() => setIsLocationOpen(false)}>✕</button>
            </div>

            {/* Detect location button */}
            <div style={{ padding: '16px 20px 0' }}>
              <button
                type="button"
                className="detect-location-btn"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: isDetectingLocation ? '#FFF5F0' : '#FFF0ED',
                  color: '#FF5200',
                  border: '1.5px dashed #FF5200',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: isDetectingLocation ? 'wait' : 'pointer',
                  marginBottom: '12px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{isDetectingLocation ? '⌛' : '🎯'}</span>
                <span>{isDetectingLocation ? 'Detecting your location...' : 'Detect My Current Location'}</span>
              </button>

              {/* Location Error / Unsupported City Banner */}
              {locationError && (
                <div
                  className="location-error-banner"
                  style={{
                    backgroundColor: '#FFF5F5',
                    border: '1px solid #FED7D7',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#C53030',
                    fontSize: '13px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>⚠️ {locationError}</span>
                  <button
                    type="button"
                    onClick={() => setLocationError(null)}
                    style={{ background: 'none', border: 'none', color: '#C53030', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* City Search Bar */}
            <div className="location-modal__search" style={{ padding: '0 20px 12px' }}>
              <input
                type="text"
                placeholder="Search city (e.g. Indore, Ahmedabad, Mumbai)..."
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Popular Cities Chips */}
            <div className="location-modal__popular" style={{ padding: '0 20px 12px' }}>
              <span className="location-section-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#686b78', fontWeight: 700 }}>
                Popular Cities
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {popularCities.map((city) => (
                  <button
                    key={city.slug}
                    type="button"
                    className={`popular-city-chip ${selectedCity?.slug === city.slug ? 'active' : ''}`}
                    onClick={() => handleSelectCity(city)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: selectedCity?.slug === city.slug ? '1.5px solid #FF5200' : '1px solid #e2e8f0',
                      background: selectedCity?.slug === city.slug ? '#FFF0ED' : '#ffffff',
                      color: selectedCity?.slug === city.slug ? '#FF5200' : '#282c3f',
                      fontWeight: selectedCity?.slug === city.slug ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {selectedCity?.slug === city.slug && <span>✓</span>}
                    {city.name}
                  </button>
                ))}
              </div>
            </div>

            {/* All Supported Cities List */}
            <div className="location-modal__all-cities" style={{ padding: '0 20px 20px' }}>
              <span className="location-section-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#686b78', fontWeight: 700 }}>
                All Supported Cities ({filteredCities.length})
              </span>
              <div className="location-list" style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '8px' }}>
                {filteredCities.map((city) => (
                  <button
                    key={city.slug}
                    type="button"
                    className={`location-item ${selectedCity?.slug === city.slug ? 'selected' : ''}`}
                    onClick={() => handleSelectCity(city)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #f0f0f0',
                      background: selectedCity?.slug === city.slug ? '#F9FAFB' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>📍</span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '14px', color: '#1c1c1c' }}>{city.name}</strong>
                        <small style={{ color: '#7e808c', fontSize: '12px' }}>{city.state}, {city.country}</small>
                      </div>
                    </div>
                    {selectedCity?.slug === city.slug && (
                      <span style={{ color: '#FF5200', fontWeight: 700, fontSize: '13px' }}>Selected ✓</span>
                    )}
                  </button>
                ))}
                {filteredCities.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: '#686b78' }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>BiteBox is not available in &quot;{citySearchQuery}&quot; yet.</p>
                    <small style={{ color: '#93959f', display: 'block', marginTop: '4px' }}>We are expanding to more cities soon!</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFERS MODAL */}
      {isOffersOpen && (
        <div className="swiggy-modal-backdrop" onClick={() => setIsOffersOpen(false)}>
          <div className="swiggy-modal offers-modal" onClick={(e) => e.stopPropagation()}>
            <div className="swiggy-modal__header">
              <div>
                <h3>BiteBox Deals & Coupons</h3>
                <p>Apply these codes at checkout or copy them now</p>
              </div>
              <button type="button" className="swiggy-modal__close" onClick={() => setIsOffersOpen(false)}>✕</button>
            </div>
            <div className="offers-grid">
              {OFFERS.map((offer) => (
                <div key={offer.code} className="offer-card">
                  <div className="offer-card__tag">{offer.tag}</div>
                  <h4>{offer.title}</h4>
                  <p>{offer.desc}</p>
                  <div className="offer-card__code-row">
                    <span className="coupon-code-pill">{offer.code}</span>
                    <button
                      type="button"
                      className="copy-coupon-btn"
                      onClick={() => handleCopyCode(offer.code)}
                    >
                      {copiedCode === offer.code ? '✓ Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      {isSearchOpen && (
        <div className="swiggy-modal-backdrop" onClick={() => setIsSearchOpen(false)}>
          <div className="swiggy-modal search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal__bar">
              <span className="search-modal__icon">🔍</span>
              <input
                type="text"
                autoFocus
                placeholder="Search for restaurants, cuisines, pizzas, burgers, drinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
              )}
              <button type="button" className="swiggy-modal__close" onClick={() => setIsSearchOpen(false)}>✕</button>
            </div>

            <div className="search-modal__results">
              {!searchQuery && (
                <div className="search-popular-tags">
                  <span className="search-section-title">Popular Cuisines & Dishes</span>
                  <div className="tag-pills">
                    {['Biryani', 'Pizza', 'Burger', 'Sandwich', 'Boba', 'Coffee', 'Desserts', 'Momos', 'South Indian'].map((tag) => (
                      <button key={tag} type="button" className="tag-pill" onClick={() => setSearchQuery(tag)}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && (
                <>
                  {searchResults.matchedRestaurants.length > 0 && (
                    <div className="search-result-group">
                      <span className="search-section-title">Matching Restaurants</span>
                      <div className="search-restaurant-list">
                        {searchResults.matchedRestaurants.map((r) => (
                          <div
                            key={r.id}
                            className="search-restaurant-item"
                            onClick={() => {
                              setIsSearchOpen(false)
                              navigate(`/restaurant/${r.id}`)
                            }}
                          >
                            <img src={r.image} alt={r.name} />
                            <div>
                              <h4>{r.name}</h4>
                              <p>{r.cuisine} • {r.location}</p>
                              <span className="search-rating">★ {r.rating} • {r.deliveryTime}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.matchedDishes.length > 0 && (
                    <div className="search-result-group">
                      <span className="search-section-title">Matching Dishes</span>
                      <div className="search-dish-grid">
                        {searchResults.matchedDishes.map((d) => (
                          <div
                            key={d.id}
                            className="search-dish-item"
                            onClick={() => {
                              setIsSearchOpen(false)
                              navigate(`/${d.category}`)
                            }}
                          >
                            <img src={d.img} alt={d.name} />
                            <div>
                              <h5>{d.name}</h5>
                              <span className="search-dish-price">₹{d.price}</span>
                              <small>{d.category}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.matchedRestaurants.length === 0 && searchResults.matchedDishes.length === 0 && (
                    <div className="search-empty">
                      <p>No matching restaurants or dishes found for "{searchQuery}".</p>
                      <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>Try Another Search</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HELP MODAL */}
      {isHelpOpen && (
        <div className="swiggy-modal-backdrop" onClick={() => setIsHelpOpen(false)}>
          <div className="swiggy-modal help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="swiggy-modal__header">
              <div>
                <h3>BiteBox Help & Support</h3>
                <p>24x7 Customer Assistance</p>
              </div>
              <button type="button" className="swiggy-modal__close" onClick={() => setIsHelpOpen(false)}>✕</button>
            </div>
            <div className="help-faqs">
              <details className="faq-item" open>
                <summary>How do I track my order?</summary>
                <p>Once your order is placed, you will see a live status in your Cart and order receipt with your estimated delivery time.</p>
              </details>
              <details className="faq-item">
                <summary>Can I cancel or modify my food items?</summary>
                <p>Orders can be cancelled or edited directly in your Cart before the kitchen starts preparation (typically within 60 seconds).</p>
              </details>
              <details className="faq-item">
                <summary>What payment modes are accepted?</summary>
                <p>We support UPI, Credit/Debit cards, Net Banking, and Cash on Delivery.</p>
              </details>
              <details className="faq-item">
                <summary>Contact Support</summary>
                <p>Email: support@bitebox.food • Phone: +91 800-BITEBOX • Hours: 24/7</p>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL (When Logged In) */}
      {isProfileOpen && user && (
        <div className="swiggy-modal-backdrop" onClick={() => setIsProfileOpen(false)}>
          <div className="swiggy-modal profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="swiggy-modal__header">
              <h3>My BiteBox Account</h3>
              <button type="button" className="swiggy-modal__close" onClick={() => setIsProfileOpen(false)}>✕</button>
            </div>
            <div className="profile-card">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="profile-avatar-large" />
              ) : (
                <div className="profile-avatar-large">{userInitials}</div>
              )}
              <div>
                <h4>{user.name}</h4>
                <p>{user.email}</p>
                <span className="profile-status-pill">⭐ Verified BiteBox Foodie</span>
              </div>
            </div>
            <div className="profile-menu">
              <Link
                to="/profile"
                className="profile-modal-action-link"
                onClick={() => setIsProfileOpen(false)}
              >
                <span>👤 View & Edit Full Profile</span>
                <strong>→</strong>
              </Link>
              <Link
                to="/my-orders"
                className="profile-modal-action-link"
                onClick={() => setIsProfileOpen(false)}
              >
                <span>🛵 My Orders & Tracking</span>
                <strong>→</strong>
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin/coupons"
                  className="profile-modal-action-link admin"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <span>🎟️ Admin Coupons Console</span>
                  <strong>→</strong>
                </Link>
              )}
              <div className="profile-menu-item">
                <span>📍 Selected City</span>
                <strong>{selectedCity?.name || 'Bengaluru'}, {selectedCity?.state || 'Karnataka'}</strong>
              </div>
              <div className="profile-menu-item">
                <span>🎁 Active Discounts</span>
                <strong>Coupons Available for {selectedCity?.name || 'All Cities'}</strong>
              </div>
              <button
                type="button"
                className="profile-modal-logout-btn"
                onClick={handleLogout}
              >
                Sign Out 🚪
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart City Conflict Modal */}
      <CartCityConflictModal conflict={cartConflict} />
    </>
  )
}
