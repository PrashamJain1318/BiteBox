import bannerBurger from '../../assets/banners/banner-burger-20off.jpg'

export default function SceneFallback() {
  return (
    <div className="scene-fallback-container" aria-label="BiteBox 3D Food Showcase">
      <div className="scene-fallback-glow" />
      <div className="scene-fallback-card">
        <div className="scene-fallback-badge">🔥 CRAFTED FRESH TO ORDER</div>
        <img
          src={bannerBurger}
          alt="BiteBox Artisanal Flame-Grilled Burger"
          className="scene-fallback-image"
          loading="eager"
        />
        <div className="scene-fallback-floating-tag tag-top">
          <span>🍔</span>
          <div>
            <strong>100% Brioche</strong>
            <small>Handcrafted Bun</small>
          </div>
        </div>
        <div className="scene-fallback-floating-tag tag-bottom">
          <span>🧀</span>
          <div>
            <strong>Melted Cheddar</strong>
            <small>Aged 12 Months</small>
          </div>
        </div>
      </div>
    </div>
  )
}
