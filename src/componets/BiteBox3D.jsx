import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function BiteBox3D() {
    const mountRef = useRef(null)

    useEffect(() => {
        const container = mountRef.current
        if (!container) return

        const width = container.clientWidth || 400
        const height = container.clientHeight || 340

        // Scene
        const scene = new THREE.Scene()

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        camera.position.set(0, 1.2, 5.5)

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        container.appendChild(renderer.domElement)

        // Lights
        const ambientLight = new THREE.AmbientLight(0xfff5eb, 1.4)
        scene.add(ambientLight)

        const dirLight = new THREE.DirectionalLight(0xffeedd, 2.2)
        dirLight.position.set(5, 8, 6)
        dirLight.castShadow = true
        scene.add(dirLight)

        const pointLight = new THREE.PointLight(0xffaa44, 2, 10)
        pointLight.position.set(-3, 2, 2)
        scene.add(pointLight)

        // Root Group for interactive rotation
        const rootGroup = new THREE.Group()
        scene.add(rootGroup)

        // --- 1. The Delivery Box ---
        const boxGroup = new THREE.Group()
        rootGroup.add(boxGroup)

        // Box Base (Kraft cardboard)
        const boxGeo = new THREE.BoxGeometry(1.6, 1.1, 1.6)
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0xdf9b62,
            roughness: 0.6,
            metalness: 0.1
        })
        const boxMesh = new THREE.Mesh(boxGeo, boxMat)
        boxMesh.castShadow = true
        boxMesh.receiveShadow = true
        boxGroup.add(boxMesh)

        // Red Brand Tape across the box
        const tapeGeo = new THREE.BoxGeometry(1.62, 0.28, 1.62)
        const tapeMat = new THREE.MeshStandardMaterial({
            color: 0xb83d0b,
            roughness: 0.4,
            metalness: 0.2
        })
        const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat)
        boxGroup.add(tapeMesh)

        // Box Lid (slightly open / tilted back)
        const lidGeo = new THREE.BoxGeometry(1.68, 0.16, 1.68)
        const lidMat = new THREE.MeshStandardMaterial({
            color: 0xc88247,
            roughness: 0.6,
            metalness: 0.1
        })
        const lidMesh = new THREE.Mesh(lidGeo, lidMat)
        lidMesh.position.set(0, 0.62, -0.2)
        lidMesh.rotation.x = -0.35
        boxGroup.add(lidMesh)

        // --- 2. Floating 3D Burger (Top Left) ---
        const burgerGroup = new THREE.Group()
        burgerGroup.position.set(-1.6, 1.0, 0.4)
        burgerGroup.scale.set(0.65, 0.65, 0.65)
        rootGroup.add(burgerGroup)

        // Top Bun
        const topBunGeo = new THREE.SphereGeometry(0.7, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45)
        const bunMat = new THREE.MeshStandardMaterial({ color: 0xdf923e, roughness: 0.5 })
        const topBun = new THREE.Mesh(topBunGeo, bunMat)
        topBun.position.y = 0.2
        burgerGroup.add(topBun)

        // Sesame seeds on top bun
        const seedGeo = new THREE.SphereGeometry(0.03, 6, 6)
        const seedMat = new THREE.MeshStandardMaterial({ color: 0xfff9e6, roughness: 0.3 })
        for (let i = 0; i < 14; i++) {
            const seed = new THREE.Mesh(seedGeo, seedMat)
            const angle = Math.random() * Math.PI * 2
            const r = Math.random() * 0.4
            seed.position.set(Math.cos(angle) * r, 0.58, Math.sin(angle) * r)
            seed.scale.set(1.5, 0.5, 0.8)
            burgerGroup.add(seed)
        }

        // Lettuce (green ruffle)
        const lettuceGeo = new THREE.CylinderGeometry(0.74, 0.76, 0.08, 16)
        const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x48bb78, roughness: 0.6 })
        const lettuce = new THREE.Mesh(lettuceGeo, lettuceMat)
        lettuce.position.y = 0.12
        burgerGroup.add(lettuce)

        // Cheese (yellow square)
        const cheeseGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9)
        const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xf6ad55, roughness: 0.3 })
        const cheese = new THREE.Mesh(cheeseGeo, cheeseMat)
        cheese.rotation.y = Math.PI / 4
        cheese.position.y = 0.04
        burgerGroup.add(cheese)

        // Patty
        const pattyGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.18, 20)
        const pattyMat = new THREE.MeshStandardMaterial({ color: 0x5a2d0c, roughness: 0.8 })
        const patty = new THREE.Mesh(pattyGeo, pattyMat)
        patty.position.y = -0.06
        burgerGroup.add(patty)

        // Bottom Bun
        const bottomBunGeo = new THREE.CylinderGeometry(0.68, 0.65, 0.18, 20)
        const bottomBun = new THREE.Mesh(bottomBunGeo, bunMat)
        bottomBun.position.y = -0.22
        burgerGroup.add(bottomBun)

        // --- 3. Floating 3D Pizza Slice (Top Right) ---
        const pizzaGroup = new THREE.Group()
        pizzaGroup.position.set(1.6, 0.9, 0.5)
        pizzaGroup.scale.set(0.7, 0.7, 0.7)
        rootGroup.add(pizzaGroup)

        // Pizza slice base
        const pizzaGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16, 1, false, 0, Math.PI / 3)
        const pizzaMat = new THREE.MeshStandardMaterial({ color: 0xf6ad55, roughness: 0.4 })
        const pizzaSlice = new THREE.Mesh(pizzaGeo, pizzaMat)
        pizzaSlice.rotation.x = 0.4
        pizzaGroup.add(pizzaSlice)

        // Crust edge
        const crustGeo = new THREE.TorusGeometry(1.2, 0.11, 8, 16, Math.PI / 3)
        const crustMat = new THREE.MeshStandardMaterial({ color: 0xdf923e, roughness: 0.7 })
        const crust = new THREE.Mesh(crustGeo, crustMat)
        crust.rotation.x = Math.PI / 2 + 0.4
        pizzaGroup.add(crust)

        // Pepperoni toppings
        const pepGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12)
        const pepMat = new THREE.MeshStandardMaterial({ color: 0x9b111e, roughness: 0.5 })
        const pepPositions = [
            { x: 0.55, y: 0.14, z: 0.35 },
            { x: 0.8, y: 0.05, z: 0.6 },
            { x: 0.45, y: 0.22, z: 0.7 }
        ]
        pepPositions.forEach((pos) => {
            const pep = new THREE.Mesh(pepGeo, pepMat)
            pep.position.set(pos.x, pos.y, pos.z)
            pep.rotation.x = 0.4
            pizzaGroup.add(pep)
        })

        // --- 4. Floating Sparkle Particles ---
        const particleGeo = new THREE.SphereGeometry(0.04, 8, 8)
        const particleMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.6
        })
        const particlesGroup = new THREE.Group()
        rootGroup.add(particlesGroup)

        for (let i = 0; i < 35; i++) {
            const p = new THREE.Mesh(particleGeo, particleMat)
            const radius = 1.8 + Math.random() * 1.5
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI
            p.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.cos(phi) * 0.7,
                radius * Math.sin(phi) * Math.sin(theta)
            )
            particlesGroup.add(p)
        }

        // Mouse Parallax Follow
        let targetRotX = 0
        let targetRotY = 0

        const handleMouseMove = (e) => {
            const rect = container.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width - 0.5
            const y = (e.clientY - rect.top) / rect.height - 0.5
            targetRotY = x * 0.7
            targetRotX = y * 0.4
        }

        container.addEventListener('mousemove', handleMouseMove)

        // Animation Loop
        let animId
        const clock = new THREE.Clock()

        const animate = () => {
            animId = requestAnimationFrame(animate)
            const elapsedTime = clock.getElapsedTime()

            // Smooth parallax rotation
            rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.05
            rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.05

            // Box gentle float and slow idle sway
            boxGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08 - 0.2
            boxGroup.rotation.y = Math.sin(elapsedTime * 0.6) * 0.15 + 0.2

            // Burger float & spin
            burgerGroup.position.y = 0.9 + Math.sin(elapsedTime * 2.0 + 1) * 0.12
            burgerGroup.rotation.y = elapsedTime * 0.7
            burgerGroup.rotation.x = Math.sin(elapsedTime * 1.2) * 0.15

            // Pizza float & tilt
            pizzaGroup.position.y = 0.8 + Math.cos(elapsedTime * 1.8 + 0.5) * 0.12
            pizzaGroup.rotation.y = -elapsedTime * 0.6
            pizzaGroup.rotation.z = Math.sin(elapsedTime * 1.4) * 0.15

            // Orbit particles
            particlesGroup.rotation.y = elapsedTime * 0.25

            renderer.render(scene, camera)
        }

        animate()

        // Responsive Resize
        const handleResize = () => {
            if (!container) return
            const w = container.clientWidth
            const h = container.clientHeight
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
        }

        window.addEventListener('resize', handleResize)

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', handleResize)
            container.removeEventListener('mousemove', handleMouseMove)
            if (renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement)
            }
            renderer.dispose()
        }
    }, [])

    return (
        <div className="bitebox-3d-wrapper">
            <div ref={mountRef} className="bitebox-3d-canvas" />
            <div className="bitebox-3d-badge">
                <span>✨ Interactive 3D BiteBox • Move cursor to tilt</span>
            </div>
        </div>
    )
}
