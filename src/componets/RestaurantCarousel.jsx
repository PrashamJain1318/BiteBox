import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function RestaurantCarousel({ restaurants = [], cityName = '' }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  if (!restaurants || restaurants.length === 0) {
    return null
  }

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const ref = scrollRef.current
    if (ref) {
      ref.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [restaurants])

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <section className="restaurant-carousel-section">
      <div className="section-header-row">
        <div>
          <h2 className="swiggy-section-title">
            {cityName ? `Top restaurant chains in ${cityName}` : 'Top restaurant chains near you'}
          </h2>
        </div>
        <div className="carousel-nav-buttons">
          <button
            type="button"
            className={`carousel-arrow-btn ${!canScrollLeft ? 'disabled' : ''}`}
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll restaurants left"
          >
            ←
          </button>
          <button
            type="button"
            className={`carousel-arrow-btn ${!canScrollRight ? 'disabled' : ''}`}
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll restaurants right"
          >
            →
          </button>
        </div>
      </div>

      <div className="restaurant-carousel-track" ref={scrollRef}>
        {restaurants.map((restaurant) => (
          <Link
            key={restaurant.id}
            to={`/restaurant/${restaurant.id}`}
            className="chain-card"
          >
            <div className="chain-card__image-container">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                }}
              />
              <div className="chain-card__gradient-overlay">
                <span className="chain-card__offer-text">{restaurant.offer || 'BITEBOX EXCLUSIVE'}</span>
              </div>
            </div>

            <div className="chain-card__details">
              <h3 className="chain-card__name" title={restaurant.name}>{restaurant.name}</h3>

              <div className="chain-card__rating-row">
                <span className="green-rating-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {restaurant.rating.toFixed(1)}
                </span>
                <span className="chain-card__bullet">•</span>
                <span className="chain-card__time">{restaurant.deliveryTime}</span>
              </div>

              <p className="chain-card__cuisine" title={restaurant.cuisine}>{restaurant.cuisine}</p>
              <p className="chain-card__location">{restaurant.location}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
