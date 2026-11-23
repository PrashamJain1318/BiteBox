import { useState } from 'react'
import { restaurants } from '../data/restaurants'
import OffersCarousel from './OffersCarousel'
import FoodCategories from './FoodCategories'
import RestaurantCarousel from './RestaurantCarousel'
import RestaurantListing from './RestaurantListing'
import BiteBox3D from './BiteBox3D'

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [show3DBox, setShow3DBox] = useState(false)

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
    // Smooth scroll down to the restaurant listing section
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

      {/* 5. APP DOWNLOAD & FOOTER BANNER */}
      <footer className="swiggy-footer">
        <div className="swiggy-footer__app-banner">
          <div className="app-banner__content">
            <h2>For better experience, download the BiteBox app now</h2>
            <p>Get exclusive app-only discounts, live GPS delivery tracking, and ultra-fast checkout.</p>
          </div>
          <div className="app-banner__badges">
            <div className="app-badge">
              <span className="badge-icon">🍏</span>
              <div>
                <small>Download on the</small>
                <strong>App Store</strong>
              </div>
            </div>
            <div className="app-badge">
              <span className="badge-icon">▶</span>
              <div>
                <small>GET IT ON</small>
                <strong>Google Play</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="swiggy-footer__links">
          <div className="footer-col brand-col">
            <div className="footer-logo">
              <span className="bitebox-logo__badge">📦</span>
              <span className="bitebox-logo__text">Bite<span className="bitebox-logo__accent">Box</span></span>
            </div>
            <p>© 2026 BiteBox Technologies Pvt. Ltd.</p>
            <p className="footer-tagline">Good Food. Fast Delivery. Every Single Time.</p>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#restaurants">About Us</a>
            <a href="#restaurants">BiteBox Corporate</a>
            <a href="#restaurants">Careers</a>
            <a href="#restaurants">Team</a>
          </div>
          <div className="footer-col">
            <h4>Contact Us</h4>
            <a href="#restaurants">Help & Support</a>
            <a href="#restaurants">Partner with us</a>
            <a href="#restaurants">Ride with us</a>
          </div>
          <div className="footer-col">
            <h4>Available In</h4>
            <span>Bengaluru</span>
            <span>Mumbai</span>
            <span>Delhi NCR</span>
            <span>Hyderabad</span>
            <span>Pune</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
