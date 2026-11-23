import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import BurgerModel from './BurgerModel'
import FloatingFood from './FloatingFood'
import SceneFallback from './SceneFallback'

// Helper to verify WebGL capability in client environment
function checkWebGLSupport() {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

export default function FoodScene({
  scrollProgress = 0,
  onExplore = () => {},
  onViewOffers = () => {},
}) {
  const [hasWebGL, setHasWebGL] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  useEffect(() => {
    setHasWebGL(checkWebGLSupport())

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(motionQuery.matches)

    const handleResize = () => checkMobile()
    const handleMotion = (e) => setPrefersReducedMotion(e.matches)

    window.addEventListener('resize', handleResize)
    motionQuery.addEventListener('change', handleMotion)

    // Smooth pointer tracker for parallax
    const handlePointerMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      setPointer({ x, y })
    }
    window.addEventListener('pointermove', handlePointerMove)

    return () => {
      window.removeEventListener('resize', handleResize)
      motionQuery.removeEventListener('change', handleMotion)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  // If WebGL is unavailable or user requested reduced motion, gracefully render fallback
  if (!hasWebGL || prefersReducedMotion) {
    return (
      <SceneFallback
        onExplore={onExplore}
        onViewOffers={onViewOffers}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className="food-scene-canvas-wrap"
      aria-hidden="true"
    >
      <Suspense fallback={<SceneFallback onExplore={onExplore} onViewOffers={onViewOffers} />}>
        <Canvas
          shadows
          camera={{
            position: [0, 0, isMobile ? 5.8 : 5.2],
            fov: isMobile ? 50 : 45,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          dpr={isMobile ? [1, 1.5] : [1, 2]}
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {/* STUDIO LIGHTING RIG */}
          <ambientLight intensity={1.2} color="#FFF5EB" />

          {/* Key Directional Sunlight with Shadows */}
          <directionalLight
            position={[4, 6, 5]}
            intensity={2.2}
            color="#FFFFFF"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={25}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={4}
            shadow-camera-bottom={-4}
          />

          {/* Warm BiteBox Orange Rim Light */}
          <directionalLight
            position={[-5, 3, -2]}
            intensity={2.4}
            color="#FF7A18"
          />

          {/* Cool Contrast Fill Light for Cinematic Depth */}
          <directionalLight
            position={[-3, -2, 3]}
            intensity={0.8}
            color="#6366F1"
          />

          {/* Point Underglow for Warm Sizzle */}
          <pointLight
            position={[0, -2.5, 2]}
            intensity={1.5}
            color="#FFA500"
            distance={8}
          />

          {/* 3D BURGER MODEL */}
          <BurgerModel
            scrollProgress={scrollProgress}
            pointer={pointer}
            isMobile={isMobile}
          />

          {/* FLOATING FRENCH FRIES & SPARKLE PARTICLES */}
          <FloatingFood
            scrollProgress={scrollProgress}
            isMobile={isMobile}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}
