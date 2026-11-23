import { useState, useEffect, useRef, useCallback } from 'react';
import bannerBurger from '../assets/banners/banner-burger-20off.jpg';
import bannerPizza from '../assets/banners/banner-pizza-bogo.jpg';
import bannerBiryani from '../assets/banners/banner-biryani-100off.jpg';

const BANNERS = [
  {
    id: 'banner-burger',
    title: 'FLAT 20% OFF',
    highlight: 'Burger & Fries Combo',
    subtitle: 'Juicy handcrafted patties, crisp veggies & seasoned crinkle fries',
    coupon: 'BITEBOX20',
    image: bannerBurger,
    alt: 'BiteBox Flat 20% Off - Burger and Fries Deal',
    badge: '⚡ FLASH DEAL',
    tagColor: '#EF4444',
    categoryTarget: 'Burger',
  },
  {
    id: 'banner-pizza',
    title: 'BUY 1 GET 1 FREE',
    highlight: 'Wood-Fired Pizza Feast',
    subtitle: 'Cheesy mozzarella pull, stone-baked crust & farm fresh toppings',
    coupon: 'FREESHIP',
    image: bannerPizza,
    alt: 'BiteBox Buy 1 Get 1 Free - Pizza Deal',
    badge: '🍕 BOGO SPECIAL',
    tagColor: '#F97316',
    categoryTarget: 'Pizza',
  },
  {
    id: 'banner-biryani',
    title: '₹100 OFF ABOVE ₹499',
    highlight: 'Royal Dum Biryani',
    subtitle: 'Slow-cooked aromatic basmati, rich tender spices & tandoori delights',
    coupon: 'FLAT50',
    image: bannerBiryani,
    alt: 'BiteBox ₹100 Off - Biryani and Mughlai Curry Deal',
    badge: '👑 ROYAL FEAST',
    tagColor: '#D97706',
    categoryTarget: 'Biryani',
  },
];

export default function OffersCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const totalSlides = BANNERS.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // 3-Second Automatic Scroll Timer (pauses when user hovers or touches)
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(timer);
  }, [isHovered, nextSlide]);

  // Touch Swipe Handlers for mobile & tablets
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;

    // Minimum swipe threshold of 50px
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      prevSlide();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleCopyCoupon = (e, code) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleBannerClick = () => {
    const listingEl = document.getElementById('restaurants');
    if (listingEl) {
      listingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      className="offers-carousel-section"
      aria-label="Promotional Offers Carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {/* Header bar with title and navigation arrows */}
      <div className="section-header-row offers-carousel-header">
        <div className="offers-header-left">
          <div className="offers-title-wrap">
            <span className="offers-badge-icon">🔥</span>
            <h2 className="swiggy-section-title">Special Offers For You</h2>
          </div>
          <p className="swiggy-section-sub">
            Auto-scrolling top deals every 3 seconds • Click any offer to redeem
          </p>
        </div>

        <div className="carousel-nav-buttons">
          <span className="offers-slide-counter">
            <strong>{currentSlide + 1}</strong> / {totalSlides}
          </span>
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={prevSlide}
            aria-label="Previous promotional slide"
          >
            ←
          </button>
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={nextSlide}
            aria-label="Next promotional slide"
          >
            →
          </button>
        </div>
      </div>

      {/* Main Carousel Viewport */}
      <div
        className="offers-carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="offers-carousel-track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className={`offers-carousel-slide ${index === currentSlide ? 'active' : ''}`}
              onClick={handleBannerClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBannerClick();
              }}
              aria-label={`View deal: ${banner.title}`}
            >
              <img
                src={banner.image}
                alt={banner.alt}
                className="offers-slide-image"
                loading={index === 0 ? 'eager' : 'lazy'}
              />

              {/* Floating Copy Coupon Badge on bottom right */}
              <div className="offers-slide-floating-badge">
                <button
                  type="button"
                  className={`offers-coupon-pill ${copiedCode === banner.coupon ? 'copied' : ''}`}
                  onClick={(e) => handleCopyCoupon(e, banner.coupon)}
                  title="Click to copy coupon code"
                >
                  <span className="coupon-scissor">✂️</span>
                  <span className="coupon-code-text">{banner.coupon}</span>
                  <span className="coupon-action-label">
                    {copiedCode === banner.coupon ? '✓ COPIED' : 'TAP TO COPY'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Quick Navigation Overlay Arrows */}
        <button
          type="button"
          className="offers-floating-arrow left"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          type="button"
          className="offers-floating-arrow right"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          ›
        </button>

        {/* 3-Second Slide Progress Bar */}
        {!isHovered && (
          <div key={currentSlide} className="offers-slide-progress-bar" />
        )}
      </div>

      {/* Interactive Indicator Dots */}
      <div className="offers-carousel-indicators" role="tablist">
        {BANNERS.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            className={`offers-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}: ${banner.title}`}
            aria-selected={index === currentSlide}
            role="tab"
          >
            <span className="dot-fill" />
          </button>
        ))}
      </div>
    </section>
  );
}
