import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function BurgerModel({
  scrollProgress = 0,
  pointer = { x: 0, y: 0 },
  isMobile = false,
}) {
  const rootGroupRef = useRef()
  const topBunGroupRef = useRef()
  const lettuceGroupRef = useRef()
  const tomatoGroupRef = useRef()
  const cheeseGroupRef = useRef()
  const pattyGroupRef = useRef()
  const bottomBunGroupRef = useRef()

  // Pre-generate random positions for sesame seeds on top of the bun
  const sesameSeeds = useMemo(() => {
    const seeds = []
    const count = 38
    for (let i = 0; i < count; i++) {
      // Golden spiral distribution over upper dome
      const phi = Math.acos(1 - (2 * (i + 0.5)) / (count * 1.6))
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const radius = 1.34

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi) + 0.3
      const z = radius * Math.sin(phi) * Math.sin(theta)

      if (y > 0.4) {
        seeds.push({
          position: [x, y, z],
          rotation: [Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4],
        })
      }
    }
    return seeds
  }, [])

  // Procedural ruffled lettuce leaves
  const lettuceLeaves = useMemo(() => {
    const leaves = []
    const count = 7
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      leaves.push({
        position: [Math.cos(angle) * 0.85, 0, Math.sin(angle) * 0.85],
        rotation: [0.15 * Math.sin(angle), angle, 0.15 * Math.cos(angle)],
        scale: [1 + (i % 2) * 0.15, 1, 1 + ((i + 1) % 2) * 0.15],
      })
    }
    return leaves
  }, [])

  useFrame((state, delta) => {
    if (!rootGroupRef.current) return

    const t = state.clock.getElapsedTime()

    // 1. Smooth Idle Floating Bob
    const idleBob = Math.sin(t * 1.6) * 0.08
    const idleRotY = Math.sin(t * 0.6) * 0.06

    // 2. Scroll-based interpolation targets
    // In Hero (scroll=0): right-side placement (x=1.8 on desktop, x=0 on mobile)
    // In Scene 2 (scroll=1): centered placement (x=0) and dramatic camera zoom
    const targetX = isMobile ? 0 : (1.8 * (1 - scrollProgress * 1.4))
    const targetY = isMobile ? -0.2 : (idleBob - scrollProgress * 0.3)
    const targetRotY = (scrollProgress * Math.PI * 2.2) + idleRotY + (pointer.x * 0.25)
    const targetRotX = (Math.sin(scrollProgress * Math.PI) * 0.22) - (pointer.y * 0.2)
    const targetRotZ = Math.sin(scrollProgress * Math.PI * 1.5) * 0.08

    // Smooth Lerp for root group
    const lerpFactor = Math.min(delta * 5, 0.2)
    rootGroupRef.current.position.x = THREE.MathUtils.lerp(rootGroupRef.current.position.x, targetX, lerpFactor)
    rootGroupRef.current.position.y = THREE.MathUtils.lerp(rootGroupRef.current.position.y, targetY, lerpFactor)
    rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(rootGroupRef.current.rotation.y, targetRotY, lerpFactor)
    rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(rootGroupRef.current.rotation.x, targetRotX, lerpFactor)
    rootGroupRef.current.rotation.z = THREE.MathUtils.lerp(rootGroupRef.current.rotation.z, targetRotZ, lerpFactor)

    // 3. Ingredient Separation (Deconstruction Effect during Scroll)
    // Separation increases as user scrolls into Scene 2, then gracefully returns
    const explosionFactor = Math.min(Math.max((scrollProgress - 0.1) * 2.2, 0), 1.4)

    if (topBunGroupRef.current) {
      const targetTopBunY = 0.8 + (explosionFactor * 1.4)
      topBunGroupRef.current.position.y = THREE.MathUtils.lerp(topBunGroupRef.current.position.y, targetTopBunY, lerpFactor)
      topBunGroupRef.current.rotation.x = THREE.MathUtils.lerp(topBunGroupRef.current.rotation.x, explosionFactor * 0.15, lerpFactor)
    }

    if (lettuceGroupRef.current) {
      const targetLettuceY = 0.45 + (explosionFactor * 0.9)
      lettuceGroupRef.current.position.y = THREE.MathUtils.lerp(lettuceGroupRef.current.position.y, targetLettuceY, lerpFactor)
    }

    if (tomatoGroupRef.current) {
      const targetTomatoY = 0.22 + (explosionFactor * 0.55)
      tomatoGroupRef.current.position.y = THREE.MathUtils.lerp(tomatoGroupRef.current.position.y, targetTomatoY, lerpFactor)
      tomatoGroupRef.current.rotation.z = THREE.MathUtils.lerp(tomatoGroupRef.current.rotation.z, explosionFactor * 0.1, lerpFactor)
    }

    if (cheeseGroupRef.current) {
      const targetCheeseY = 0.05 + (explosionFactor * 0.2)
      cheeseGroupRef.current.position.y = THREE.MathUtils.lerp(cheeseGroupRef.current.position.y, targetCheeseY, lerpFactor)
    }

    if (pattyGroupRef.current) {
      const targetPattyY = -0.18 - (explosionFactor * 0.15)
      pattyGroupRef.current.position.y = THREE.MathUtils.lerp(pattyGroupRef.current.position.y, targetPattyY, lerpFactor)
    }

    if (bottomBunGroupRef.current) {
      const targetBottomBunY = -0.68 - (explosionFactor * 1.1)
      bottomBunGroupRef.current.position.y = THREE.MathUtils.lerp(bottomBunGroupRef.current.position.y, targetBottomBunY, lerpFactor)
      bottomBunGroupRef.current.rotation.x = THREE.MathUtils.lerp(bottomBunGroupRef.current.rotation.x, -explosionFactor * 0.12, lerpFactor)
    }
  })

  return (
    <group ref={rootGroupRef} position={[isMobile ? 0 : 1.8, 0, 0]} scale={isMobile ? 0.8 : 1.15}>
      {/* 1. TOP BRIOCHE BUN */}
      <group ref={topBunGroupRef} position={[0, 0.8, 0]}>
        {/* Bun Dome */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1.36, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
          <meshStandardMaterial
            color="#D97724"
            roughness={0.42}
            metalness={0.06}
            emissive="#B85D10"
            emissiveIntensity={0.08}
          />
        </mesh>

        {/* Bun Rim / Base Trim */}
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.36, 1.34, 0.22, 32]} />
          <meshStandardMaterial color="#C86A1B" roughness={0.48} metalness={0.05} />
        </mesh>

        {/* Sesame Seeds */}
        {sesameSeeds.map((seed, idx) => (
          <mesh
            key={`seed-${idx}`}
            position={seed.position}
            rotation={seed.rotation}
            scale={[0.045, 0.02, 0.075]}
            castShadow
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#FFF8DC" roughness={0.3} metalness={0.02} />
          </mesh>
        ))}
      </group>

      {/* 2. CRISPY RUFFLED LETTUCE */}
      <group ref={lettuceGroupRef} position={[0, 0.45, 0]}>
        {lettuceLeaves.map((leaf, idx) => (
          <mesh
            key={`leaf-${idx}`}
            position={leaf.position}
            rotation={leaf.rotation}
            scale={leaf.scale}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.75, 0.65, 0.05, 16]} />
            <meshStandardMaterial
              color="#38A169"
              roughness={0.65}
              metalness={0.02}
              emissive="#22543D"
              emissiveIntensity={0.05}
            />
          </mesh>
        ))}
      </group>

      {/* 3. JUICY TOMATO SLICES */}
      <group ref={tomatoGroupRef} position={[0, 0.22, 0]}>
        {/* Slice 1 */}
        <mesh position={[-0.45, 0, 0.15]} rotation={[0.08, 0.3, 0.05]} castShadow receiveShadow>
          <cylinderGeometry args={[0.72, 0.72, 0.14, 24]} />
          <meshStandardMaterial
            color="#E53E3E"
            roughness={0.25}
            metalness={0.08}
            emissive="#9B2C2C"
            emissiveIntensity={0.12}
          />
        </mesh>
        {/* Slice 2 */}
        <mesh position={[0.42, 0.02, -0.1]} rotation={[-0.05, -0.2, -0.06]} castShadow receiveShadow>
          <cylinderGeometry args={[0.72, 0.72, 0.14, 24]} />
          <meshStandardMaterial
            color="#E53E3E"
            roughness={0.25}
            metalness={0.08}
            emissive="#9B2C2C"
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>

      {/* 4. MELTED CHEDDAR CHEESE */}
      <group ref={cheeseGroupRef} position={[0, 0.05, 0]}>
        {/* Square Cheese Sheet */}
        <mesh rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.85, 0.06, 1.85]} />
          <meshStandardMaterial
            color="#F6AD55"
            roughness={0.35}
            metalness={0.05}
            emissive="#DD6B20"
            emissiveIntensity={0.15}
          />
        </mesh>
        {/* Drooping Melt Corners */}
        {[
          { pos: [1.02, -0.14, 0], rot: [0, 0, -0.7] },
          { pos: [-1.02, -0.14, 0], rot: [0, 0, 0.7] },
          { pos: [0, -0.14, 1.02], rot: [0.7, 0, 0] },
          { pos: [0, -0.14, -1.02], rot: [-0.7, 0, 0] },
        ].map((corner, idx) => (
          <mesh key={`melt-${idx}`} position={corner.pos} rotation={corner.rot} castShadow>
            <coneGeometry args={[0.26, 0.38, 4]} />
            <meshStandardMaterial
              color="#F6AD55"
              roughness={0.35}
              metalness={0.05}
              emissive="#DD6B20"
              emissiveIntensity={0.15}
            />
          </mesh>
        ))}
      </group>

      {/* 5. FLAME-GRILLED JUICY PATTY */}
      <group ref={pattyGroupRef} position={[0, -0.18, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.32, 1.34, 0.44, 28]} />
          <meshStandardMaterial
            color="#4A2810"
            roughness={0.85}
            metalness={0.08}
            emissive="#2A1406"
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>

      {/* 6. ROUNDED BOTTOM BRIOCHE BUN */}
      <group ref={bottomBunGroupRef} position={[0, -0.68, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.3, 1.2, 0.46, 32]} />
          <meshStandardMaterial
            color="#C86A1B"
            roughness={0.46}
            metalness={0.05}
            emissive="#9C4D0A"
            emissiveIntensity={0.06}
          />
        </mesh>
      </group>
    </group>
  )
}
