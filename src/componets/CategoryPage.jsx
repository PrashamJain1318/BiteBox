import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products } from '../data/product'
import Card from './Card'
import FoodCategories from './FoodCategories'

export const CATEGORY_META = {
  'biryani': {
    name: 'Biryani',
    tagline: 'Authentic royal dum biryanis layered with aromatic spices and saffron.',
    bannerImg: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
    icon: '🍚'
  },
  'pizza': {
    name: 'Pizzas',
    tagline: 'Hand-tossed sourdough and wood-fired pizzas loaded with fresh mozzarella and toppings.',
    bannerImg: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    icon: '🍕'
  },
  'burger': {
    name: 'Burgers',
    tagline: 'Flame-grilled smash patties, brioche buns, melted cheddar, and secret sauces.',
    bannerImg: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    icon: '🍔'
  },
  'sandwich': {
    name: 'Sandwiches',
    tagline: 'Crispy sourdough toasties, deli baguettes, and three-layer club sandwiches.',
    bannerImg: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
    icon: '🥪'
  },
  'beverages': {
    name: 'Beverages',
    tagline: 'Artisanal cold brews, fresh thick shakes, boba teas, and fruit coolers.',
    bannerImg: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80',
    icon: '🥤'
  },
  'south-indian': {
    name: 'South Indian',
    tagline: 'Crispy ghee roast dosas, fluffy steamed idlis, and piping hot sambar.',
    bannerImg: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80',
    icon: '🥞'
  },
  'north-indian': {
    name: 'North Indian',
    tagline: 'Rich paneer butter masala, slow-cooked dal makhani, and clay-oven tandoori breads.',
    bannerImg: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
    icon: '🍛'
  },
  'cakes': {
    name: 'Cakes',
    tagline: 'Celebration cakes, Belgian chocolate gateaux, and creamy cheesecakes.',
    bannerImg: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
    icon: '🎂'
  },
  'desserts': {
    name: 'Desserts',
    tagline: 'Hot gulab jamuns, rasmalai, sizzling brownies, and waffle sundaes.',
    bannerImg: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
    icon: '🍨'
  },
  'chinese': {
    name: 'Chinese',
    tagline: 'Wok-tossed Hakka noodles, Schezwan fried rice, and steamed dim sum dumplings.',
    bannerImg: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1200&q=80',
    icon: '🥢'
  },
  'pasta': {
    name: 'Pasta',
    tagline: 'Creamy Alfredo, spicy Arrabbiata, basil pesto fusilli, and cheesy lasagna.',
    bannerImg: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    icon: '🍝'
  },
  'rolls': {
    name: 'Rolls',
    tagline: 'Flaky kathi rolls, juicy shawarmas, and spiced frankies rolled to perfection.',
    bannerImg: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1200&q=80',
    icon: '🌯'
  }
}

// Map common aliases
const ALIAS_MAP = {
  'pizzas': 'pizza',
  'burgers': 'burger',
  'sandwiches': 'sandwich',
  'bevarage': 'beverages',
  'beverages': 'beverages',
  'dessert': 'desserts',
  'desserts': 'desserts',
  'cake': 'cakes',
  'cakes': 'cakes',
  'roll': 'rolls',
  'rolls': 'rolls'
}

export default function CategoryPage({ categoryId: propCategory }) {
  const params = useParams()
  const rawId = (propCategory || params.categoryId || 'pizza').toLowerCase()
  const resolvedCategory = ALIAS_MAP[rawId] || rawId

  const meta = CATEGORY_META[resolvedCategory] || {
    name: resolvedCategory.toUpperCase(),
    tagline: 'Explore our delicious selection prepared fresh for you.',
    bannerImg: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    icon: '🍴'
  }

  const [dietFilter, setDietFilter] = useState('all') // 'all' | 'veg' | 'non-veg'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('popular') // 'popular' | 'price_asc' | 'price_desc'

  const categoryProducts = useMemo(() => {
    let list = products.filter((p) => p.category === resolvedCategory)

    // Diet filter
    if (dietFilter === 'veg') list = list.filter((p) => p.isVeg)
    if (dietFilter === 'non-veg') list = list.filter((p) => !p.isVeg)

    // Search query
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price
      if (sortBy === 'price_desc') return b.price - a.price
      return a.id - b.id
    })

    return list
  }, [resolvedCategory, dietFilter, searchQuery, sortBy])

  return (
    <main className="category-page-container">
      {/* Breadcrumbs */}
      <nav className="category-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="crumb-sep">/</span>
        <span>Categories</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{meta.name}</span>
      </nav>

      {/* Category Hero Banner */}
      <section className="category-hero-banner">
        <div className="category-hero-banner__img-wrap">
          <img src={meta.bannerImg} alt={meta.name} />
          <div className="category-hero-banner__overlay">
            <span className="category-hero-badge">{meta.icon} {meta.name.toUpperCase()} SPECIALS</span>
            <h1 className="category-hero-title">{meta.name}</h1>
            <p className="category-hero-desc">{meta.tagline}</p>
            <div className="category-hero-meta">
              <span>{categoryProducts.length} dishes available</span>
              <span>•</span>
              <span>Fast 20-30 min delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Quick Navigation Carousel */}
      <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
        <FoodCategories activeCategory={resolvedCategory} />
      </div>

      {/* Filter and Search Toolbar */}
      <section className="category-toolbar">
        {/* Diet Toggles */}
        <div className="category-diet-toggles">
          <button
            type="button"
            className={`category-pill-btn ${dietFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDietFilter('all')}
          >
            All Items ({products.filter((p) => p.category === resolvedCategory).length})
          </button>
          <button
            type="button"
            className={`category-pill-btn veg ${dietFilter === 'veg' ? 'active' : ''}`}
            onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
          >
            <span className="pure-veg-dot">●</span> Veg
          </button>
          <button
            type="button"
            className={`category-pill-btn non-veg ${dietFilter === 'non-veg' ? 'active' : ''}`}
            onClick={() => setDietFilter(dietFilter === 'non-veg' ? 'all' : 'non-veg')}
          >
            <span className="non-veg-dot">●</span> Non-Veg
          </button>
        </div>

        {/* Search inside category */}
        <div className="category-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${meta.name.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="category-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* Sort selector */}
        <div className="category-sort-select">
          <label htmlFor="cat-sort">Sort by:</label>
          <select
            id="cat-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="popular">Popularity</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </section>

      {/* Products Grid */}
      {categoryProducts.length > 0 ? (
        <section className="products-grid">
          {categoryProducts.map((product) => (
            <Card key={product.id} detail={product} />
          ))}
        </section>
      ) : (
        <div className="category-empty-state">
          <div className="category-empty-icon">🍽️</div>
          <h3>No {meta.name} dishes found</h3>
          <p>No items match your active diet filter or search term.</p>
          <button
            type="button"
            className="swiggy-orange-btn"
            onClick={() => {
              setDietFilter('all')
              setSearchQuery('')
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Explore Other Categories Strip */}
      <section className="other-categories-strip">
        <h3>Explore more on BiteBox</h3>
        <div className="other-cat-pills">
          {Object.entries(CATEGORY_META).map(([key, data]) => {
            if (key === resolvedCategory) return null
            return (
              <Link key={key} to={`/${key}`} className="other-cat-pill">
                <span>{data.icon}</span>
                <span>{data.name}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
