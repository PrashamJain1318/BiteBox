import { useState, useCallback } from 'react'
import { restaurants } from '../data/restaurants'
import HeroSection from '../components/home/HeroSection'
import OffersCarousel from './OffersCarousel'
import FoodCategories from './FoodCategories'
import RestaurantCarousel from './RestaurantCarousel'
import RestaurantSection from '../components/home/RestaurantSection'
import BiteBox3D from './BiteBox3D'
import Footer from './Footer'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const [show3DBox, setShow3DBox] = useState(false)

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
    const listingEl = document.getElementById('restaurants')
    if (listingEl) {
      listingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleSelectCity = (cityName) => {
    setSelectedCity(cityName)
    const listingEl = document.getElementById('restaurants')
    if (listingEl) {
      listingEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleScrollToOffers = useCallback(() => {
    const el = document.getElementById('offers-carousel')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  return (
    <main className="swiggy-home-container">
      {/* 1. CINEMATIC 3D SCROLL & HERO EXPERIENCE */}
      <HeroSection
        onExplore={() => {
          const el = document.getElementById('restaurants')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        onViewOffers={handleScrollToOffers}
      />

      <div className="swiggy-divider" />

      {/* 2. FOOD CATEGORIES SECTION ("Prasham, what's on your mind?") */}
      <FoodCategories
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      <div className="swiggy-divider" />

      {/* 3. TOP RESTAURANT CHAINS CAROUSEL */}
      <RestaurantCarousel restaurants={restaurants} />

      <div className="swiggy-divider" />

      {/* 4. HERO OFFERS CAROUSEL (3-Second Auto-Scrolling Banner) */}
      <div id="offers-carousel">
        <OffersCarousel />
      </div>

      <div className="swiggy-divider" />

      {/* 5. RESTAURANTS WITH ONLINE FOOD DELIVERY (Grid, 3D Cards, Staggered Entry) */}
      <RestaurantSection
        restaurants={restaurants}
        activeCategory={selectedCategory}
        onClearCategory={() => setSelectedCategory(null)}
        activeCity={selectedCity}
        onClearCity={() => setSelectedCity(null)}
      />

      {/* 6. OPTIONAL 3D INTERACTIVE BITEBOX FEATURE BANNER */}
      <section className="bitebox-interactive-banner">
        <div className="interactive-banner__inner">
          <div className="interactive-banner__text">
            <span className="banner-tag">INTERACTIVE EXPERIENCE</span>
            <h3>Experience BiteBox in 3D</h3>
            <p>Inspect our signature delivery pack crafted for fresh food delivery.</p>
            <button
              type="button"
              className="toggle-3d-btn"
              onClick={() => setShow3DBox(!show3DBox)}
            >
              {show3DBox ? 'Close 3D View ✕' : 'Open 3D BiteBox 📦'}
            </button>
          </div>
          {show3DBox && (
            <div className="interactive-banner__3d-wrap">
              <BiteBox3D />
            </div>
          )}
        </div>
      </section>

      {/* 7. APP DOWNLOAD & FOOTER (Fully Interactive) */}
      <Footer onSelectCity={handleSelectCity} />
    </main>
  )
}

