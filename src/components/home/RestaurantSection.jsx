import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import RestaurantListing from '../../componets/RestaurantListing'

gsap.registerPlugin(ScrollTrigger)

export default function RestaurantSection({
  restaurants = [],
  activeCategory = null,
  onClearCategory = () => {},
  activeCity = null,
  onClearCity = () => {},
}) {
  const sectionRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const cards = section.querySelectorAll('.swiggy-grid-card')
    if (!cards || cards.length === 0) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 35,
          scale: 0.96,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, section)

    return () => ctx.revert()
  }, [restaurants, activeCategory, activeCity])

  return (
    <div ref={sectionRef} className="restaurant-discovery-wrapper">
      <RestaurantListing
        restaurants={restaurants}
        activeCategory={activeCategory}
        onClearCategory={onClearCategory}
        activeCity={activeCity}
        onClearCity={onClearCity}
      />
    </div>
  )
}
