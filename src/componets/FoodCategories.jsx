import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

export const FOOD_CATEGORIES = [
  {
    id: 'biryani',
    name: 'Biryani',
    img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80',
    route: '/biryani'
  },
  {
    id: 'pizza',
    name: 'Pizzas',
    img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
    route: '/pizza'
  },
  {
    id: 'burger',
    name: 'Burgers',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
    route: '/burger'
  },
  {
    id: 'sandwich',
    name: 'Sandwiches',
    img: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=300&q=80',
    route: '/sandwich'
  },
  {
    id: 'beverages',
    name: 'Beverages',
    img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=300&q=80',
    route: '/beverages'
  },
  {
    id: 'south-indian',
    name: 'South Indian',
    img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80',
    route: '/south-indian'
  },
  {
    id: 'north-indian',
    name: 'North Indian',
    img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=300&q=80',
    route: '/north-indian'
  },
  {
    id: 'cakes',
    name: 'Cakes',
    img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80',
    route: '/cakes'
  },
  {
    id: 'desserts',
    name: 'Desserts',
    img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=300&q=80',
    route: '/desserts'
  },
  {
    id: 'chinese',
    name: 'Chinese',
    img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80',
    route: '/chinese'
  },
  {
    id: 'pasta',
    name: 'Pasta',
    img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80',
    route: '/pasta'
  },
  {
    id: 'rolls',
    name: 'Rolls',
    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80',
    route: '/rolls'
  },
]

export default function FoodCategories({ activeCategory }) {
  const location = useLocation()
  const currentPath = location.pathname
  const scrollRef = useRef(null)

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <section className="food-categories-section">
      <div className="section-header-row">
        <div>
          <h2 className="swiggy-section-title">Prasham, what's on your mind?</h2>
        </div>
        <div className="carousel-nav-buttons">
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={() => handleScroll('left')}
            aria-label="Scroll categories left"
          >
            ←
          </button>
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={() => handleScroll('right')}
            aria-label="Scroll categories right"
          >
            →
          </button>
        </div>
      </div>

      <div className="categories-scroll-track" ref={scrollRef}>
        {FOOD_CATEGORIES.map((category) => {
          const isActive = activeCategory
            ? (activeCategory === category.id || activeCategory === category.name.toLowerCase())
            : (currentPath === category.route || currentPath === `/category/${category.id}`)

          return (
            <Link
              key={category.id}
              to={category.route}
              className={`category-item-card ${isActive ? 'active' : ''}`}
              title={`Explore ${category.name}`}
            >
              <div className="category-img-wrap">
                <img
                  src={category.img}
                  alt={category.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
                  }}
                />
              </div>
              <span className="category-name-label">{category.name}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
