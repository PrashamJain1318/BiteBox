import Interactive3DCard from '../3d/Interactive3DCard'
import OffersCarousel from '../../componets/OffersCarousel'

export default function OffersSection() {
  return (
    <section id="offers-section" className="home-offers-section">
      <Interactive3DCard maxTilt={5} scale={1.01} glare={false}>
        <OffersCarousel />
      </Interactive3DCard>
    </section>
  )
}
