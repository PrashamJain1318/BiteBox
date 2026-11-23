import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function FloatingFood({ scrollProgress = 0, isMobile = false }) {
  const friesGroupRef = useRef()
  const particlesRef = useRef()

  // Generate randomized positions and rotation speeds for french fries
  const fries = useMemo(() => {
    const list = []
    const count = isMobile ? 4 : 10

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 2.4 + (i % 3) * 0.7
      list.push({
        basePos: [
          Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 2.5,
          Math.sin(angle) * 1.5 - 0.5,
        ],
        rotSpeed: [
          (Math.random() * 0.8 + 0.3) * (i % 2 === 0 ? 1 : -1),
          (Math.random() * 0.8 + 0.3) * (i % 3 === 0 ? 1 : -1),
          (Math.random() * 0.5 + 0.2),
        ],
        length: 0.85 + Math.random() * 0.35,
        scale: 0.8 + Math.random() * 0.3,
      })
    }
    return list
  }, [isMobile])

  // Generate glowing micro seasoning / sparkle particles
  const particleCount = isMobile ? 25 : 65
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 9
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5
    }
    return positions
  }, [particleCount])

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()

    // 1. Animate French Fries tumbling and reacting to scroll
    if (friesGroupRef.current) {
      friesGroupRef.current.children.forEach((fryMesh, i) => {
        const item = fries[i]
        if (!item) return

        // Individual tumbling rotation
        fryMesh.rotation.x += item.rotSpeed[0] * delta
        fryMesh.rotation.y += item.rotSpeed[1] * delta
        fryMesh.rotation.z += item.rotSpeed[2] * delta

        // Parallax floating wave + scroll expansion
        const wave = Math.sin(t * 1.2 + i) * 0.12
        const scrollOffset = scrollProgress * (i % 2 === 0 ? 1.2 : -1.2)
        fryMesh.position.y = item.basePos[1] + wave + (scrollOffset * 0.5)
        fryMesh.position.x = item.basePos[0] + (scrollProgress * (item.basePos[0] > 0 ? 0.8 : -0.8))
      })
    }

    // 2. Animate seasoning particles drifting
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.04 + (scrollProgress * 0.4)
      particlesRef.current.rotation.x = Math.sin(t * 0.02) * 0.05
    }
  })

  return (
    <group>
      {/* CRISPY FRENCH FRIES */}
      <group ref={friesGroupRef}>
        {fries.map((fry, idx) => (
          <mesh
            key={`fry-${idx}`}
            position={fry.basePos}
            scale={[fry.scale, fry.scale, fry.scale]}
            castShadow
          >
            <boxGeometry args={[0.13, fry.length, 0.13]} />
            <meshStandardMaterial
              color="#F59E0B"
              roughness={0.4}
              metalness={0.08}
              emissive="#D97706"
              emissiveIntensity={0.12}
            />
          </mesh>
        ))}
      </group>

      {/* FLOATING TOMATO / BASIL ACCENTS */}
      {!isMobile && (
        <group>
          {/* Fresh Basil Leaf */}
          <mesh position={[-2.8, 1.2, 0.8]} rotation={[0.4, 0.8, -0.3]} castShadow>
            <sphereGeometry args={[0.3, 12, 12]} />
            <meshStandardMaterial color="#22C55E" roughness={0.4} metalness={0.05} />
          </mesh>
          {/* Cherry Tomato Wedge */}
          <mesh position={[2.6, -1.3, 0.6]} rotation={[-0.3, 0.5, 0.8]} castShadow>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial color="#EF4444" roughness={0.25} metalness={0.1} />
          </mesh>
        </group>
      )}

      {/* GLOWING MICRO PARTICLES (Seasoning / Sparkles) */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.065}
          color="#FFB347"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
