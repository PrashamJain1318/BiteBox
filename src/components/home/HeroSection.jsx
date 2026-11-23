import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import FoodScene from '../3d/FoodScene'
import Interactive3DCard from '../3d/Interactive3DCard'

gsap.registerPlugin(ScrollTrigger)

const HERO_PROMOS = [
  {
    code: 'BITEBOX20',
    title: 'FLAT 20% OFF',
    subtitle: 'Burger & Fries Combo Deal',
    badge: '⚡ FLASH DEAL',
    tagColor: '#EF4444',
  },
  {
    code: 'FREESHIP',
    title: 'BUY 1 GET 1 FREE',
    subtitle: 'Wood-Fired Pizza Feast',
    badge: '🍕 BOGO SPECIAL',
    tagColor: '#F97316',
  },
  {
    code: 'FREEDEL',
    title: 'FREE DELIVERY',
    subtitle: 'On your first 3 orders above ₹149',
    badge: '🚀 ZERO DELIVERY FEE',
    tagColor: '#10B981',
  },
  {
    code: 'WELCOME150',
    title: 'FLAT ₹150 OFF',
    subtitle: 'Welcome treat for all BiteBox foodies',
    badge: '👑 EXCLUSIVE',
    tagColor: '#8B5CF6',
  },
]

export default function HeroSection({
  onExplore = () => {},
  onViewOffers = () => {},
}) {
  const containerRef = useRef(null)
  const pinSectionRef = useRef(null)
  const scene1Ref = useRef(null)
  const scene2Ref = useRef(null)
  const scene3Ref = useRef(null)

  const [scrollProgress, setScrollProgress] = useState(0)
  const [copiedCode, setCopiedCode] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  // Copy coupon handler
  const handleCopyCode = (e, code) => {
    e.stopPropagation()
    try {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2500)
    } catch {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2500)
    }
  }

  // Smooth scroll down to restaurants section
  const handleExploreClick = () => {
    onExplore()
    const target = document.getElementById('restaurants')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const ctx = gsap.context(() => {
      // On mobile screens, skip heavy pinned scroll to maintain snappy native touch scrolling
      if (window.innerWidth < 768) {
        setScrollProgress(0.2)
        return
      }

      // Desktop Pinned GSAP ScrollTrigger Sequence
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinSectionRef.current,
          start: 'top top',
          end: '+=2400',
          pin: true,
          scrub: 0.6,
          onUpdate: (self) => {
            setScrollProgress(self.progress)
          },
        },
      })

      // Timeline Sequence:
      // Phase 1 (0 -> 0.35): Scene 1 fades/slides out as burger starts moving to center
      tl.to(scene1Ref.current, {
        opacity: 0,
        y: -60,
        filter: 'blur(8px)',
        duration: 0.35,
        ease: 'power2.inOut',
      }, 0)

      // Phase 2 (0.35 -> 0.7): Scene 2 (Fresh Ingredients & Deconstruction) appears, then transitions
      tl.fromTo(scene2Ref.current, {
        opacity: 0,
        y: 60,
        scale: 0.95,
        filter: 'blur(6px)',
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.3,
        ease: 'power2.out',
      }, 0.3)
      .to(scene2Ref.current, {
        opacity: 0,
        y: -50,
        filter: 'blur(6px)',
        duration: 0.25,
        ease: 'power2.in',
      }, 0.65)

      // Phase 3 (0.7 -> 1.0): Scene 3 (3D Promo Cards) enters with 3D stagger
      tl.fromTo(scene3Ref.current, {
        opacity: 0,
        y: 70,
        scale: 0.94,
        pointerEvents: 'none',
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        pointerEvents: 'auto',
        duration: 0.3,
        ease: 'power2.out',
      }, 0.72)
    }, containerRef)

    return () => {
      window.removeEventListener('resize', checkMobile)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={containerRef} className="cinematic-hero-root">
      <div ref={pinSectionRef} className="cinematic-pinned-viewport">
        {/* BACKGROUND 3D CANVAS SCENE */}
        <div className="cinematic-canvas-backdrop">
          <FoodScene
            scrollProgress={scrollProgress}
            onExplore={handleExploreClick}
            onViewOffers={onViewOffers}
          />
        </div>

        {/* AMBIENT GRADIENTS & GLOWS */}
        <div className="cinematic-ambient-glow primary-glow" aria-hidden="true" />
        <div className="cinematic-ambient-glow orange-glow" aria-hidden="true" />

        {/* SCENE 1: CINEMATIC HERO */}
        <div ref={scene1Ref} className="cinematic-scene scene-1-hero">
          <div className="scene-1-content">
            <div className="cinematic-badge">
              <span className="badge-pulse-dot" />
              <span>BITEBOX CINEMATIC DINING</span>
            </div>

            <h1 className="cinematic-hero-title">
              Cravings <br />
              <span className="cinematic-gradient-text">Deserve Better.</span>
            </h1>

            <p className="cinematic-hero-sub">
              Your favorite food, delivered fresh from top-rated kitchens in under 25 minutes.
            </p>

            <div className="cinematic-cta-group">
              <button
                type="button"
                className="cinematic-btn-primary"
                onClick={handleExploreClick}
              >
                <span>Explore Restaurants</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              <button
                type="button"
                className="cinematic-btn-secondary"
                onClick={onViewOffers}
              >
                <span>View Offers</span>
                <span className="btn-tag">%</span>
              </button>
            </div>

            {/* Quick stats banner */}
            <div className="cinematic-stats-row">
              <div className="stat-pill">
                <strong>18 min</strong>
                <span>Avg Delivery</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-pill">
                <strong>500+</strong>
                <span>Restaurants</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-pill">
                <strong>4.8 ★</strong>
                <span>Top Rated</span>
              </div>
            </div>
          </div>
        </div>

        {/* SCENE 2: INGREDIENT EXPLOSION & FRESHNESS STORY */}
        <div ref={scene2Ref} className="cinematic-scene scene-2-story">
          <div className="scene-2-content">
            <span className="scene-pill">ARTISANAL FRESHNESS</span>
            <h2 className="scene-2-title">
              Deconstructed to <br />
              <span className="cinematic-gradient-text">Perfection.</span>
            </h2>
            <p className="scene-2-sub">
              Every layer hand-picked. Warm brioche buns baked fresh daily, crisp organic lettuce,
              vine-ripened tomatoes, and 100% flame-grilled patties.
            </p>

            <div className="ingredients-pills-row">
              <div className="ingredient-badge">
                <span>🌱</span> 100% Brioche
              </div>
              <div className="ingredient-badge">
                <span>🔥</span> Flame-Grilled
              </div>
              <div className="ingredient-badge">
                <span>🧀</span> Aged Cheddar
              </div>
              <div className="ingredient-badge">
                <span>⚡</span> Sub-30 Mins
              </div>
            </div>
          </div>
        </div>

        {/* SCENE 3: FLOATING 3D PROMOTIONAL CARDS */}
        <div ref={scene3Ref} className="cinematic-scene scene-3-offers">
          <div className="scene-3-content">
            <div className="scene-3-header">
              <span className="scene-pill">LIMITED TIME REWARDS</span>
              <h2 className="scene-3-title">Special Offers For You</h2>
              <p className="scene-3-sub">
                Hover to inspect in 3D • Tap any coupon code to copy instantly
              </p>
            </div>

            <div className="promos-3d-grid">
              {HERO_PROMOS.map((promo, idx) => (
                <Interactive3DCard
                  key={promo.code}
                  className="promo-3d-card"
                  maxTilt={10}
                  scale={1.03}
                >
                  <div className="promo-card-inner">
                    <div className="promo-card-top">
                      <span className="promo-badge" style={{ backgroundColor: promo.tagColor }}>
                        {promo.badge}
                      </span>
                      <span className="promo-number">0{idx + 1}</span>
                    </div>

                    <h3 className="promo-card-title">{promo.title}</h3>
                    <p className="promo-card-sub">{promo.subtitle}</p>

                    <div className="promo-coupon-action-row">
                      <button
                        type="button"
                        className={`promo-copy-btn ${copiedCode === promo.code ? 'copied' : ''}`}
                        onClick={(e) => handleCopyCode(e, promo.code)}
                        title="Click to copy coupon"
                      >
                        <span className="scissor-icon">✂️</span>
                        <strong className="coupon-text">{promo.code}</strong>
                        <span className="action-tag">
                          {copiedCode === promo.code ? '✓ COPIED' : 'TAP TO COPY'}
                        </span>
                      </button>
                    </div>
                  </div>
                </Interactive3DCard>
              ))}
            </div>

            <div className="scene-3-bottom-action">
              <button
                type="button"
                className="cinematic-btn-primary"
                onClick={handleExploreClick}
              >
                <span>Order Now with Discount</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Progress Indicator Bar */}
        {!isMobile && (
          <div className="cinematic-scroll-indicator" aria-hidden="true">
            <div className="scroll-indicator-track">
              <div
                className="scroll-indicator-bar"
                style={{ height: `${Math.min(scrollProgress * 100, 100)}%` }}
              />
            </div>
            <span className="scroll-indicator-label">SCROLL TO EXPLORE</span>
          </div>
        )}
      </div>
    </div>
  )
}
