import { useState } from 'react'
import { restaurants } from '../data/restaurants'
import OffersCarousel from './OffersCarousel'
import FoodCategories from './FoodCategories'
import RestaurantCarousel from './RestaurantCarousel'
import RestaurantListing from './RestaurantListing'
import BiteBox3D from './BiteBox3D'
import Footer from './Footer'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const [show3DBox, setShow3DBox] = useState(false)

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
    // Smooth scroll down to the restaurant listing section
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

  return (
    <main className="swiggy-home-container">
      {/* 1. HERO OFFERS CAROUSEL (3-Second Auto-Scrolling Banner) */}
      <OffersCarousel />

      <div className="swiggy-divider" />

      {/* 2. FOOD CATEGORIES SECTION ("Prasham, what's on your mind?") */}
      <FoodCategories
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      <div className="swiggy-divider" />

      {/* 2. TOP RESTAURANT CHAINS CAROUSEL */}
      <RestaurantCarousel restaurants={restaurants} />

      <div className="swiggy-divider" />

      {/* 3. RESTAURANTS WITH ONLINE FOOD DELIVERY (Grid, Filters, Sorting) */}
      <RestaurantListing
        restaurants={restaurants}
        activeCategory={selectedCategory}
        onClearCategory={() => setSelectedCategory(null)}
        activeCity={selectedCity}
        onClearCity={() => setSelectedCity(null)}
      />

      {/* 4. OPTIONAL 3D INTERACTIVE BITEBOX FEATURE BANNER */}
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

      {/* 5. APP DOWNLOAD & FOOTER (Fully Interactive) */}
      <Footer onSelectCity={handleSelectCity} />
    </main>
  )
}
