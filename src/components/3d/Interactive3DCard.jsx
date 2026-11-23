import { useState, useRef, useCallback } from 'react'

export default function Interactive3DCard({
  children,
  className = '',
  style = {},
  maxTilt = 8,
  scale = 1.02,
  glare = true,
  onClick,
  ...props
}) {
  const cardRef = useRef(null)
  const [transformStyle, setTransformStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
  })
  const [glareStyle, setGlareStyle] = useState({
    opacity: 0,
    background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.25) 0%, transparent 65%)',
  })

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Normalize between -1 and 1
    const percentX = (x - centerX) / centerX
    const percentY = (y - centerY) / centerY

    const rotateY = percentX * maxTilt
    const rotateX = -percentY * maxTilt

    setTransformStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: 'transform 0.1s ease-out, box-shadow 0.2s ease-out',
    })

    if (glare) {
      const glareX = (x / rect.width) * 100
      const glareY = (y / rect.height) * 100
      setGlareStyle({
        opacity: 0.35,
        background: `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)`,
      })
    }
  }, [maxTilt, scale, glare])

  const handleMouseLeave = useCallback(() => {
    setTransformStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    })
    setGlareStyle((prev) => ({
      ...prev,
      opacity: 0,
    }))
  }, [])

  return (
    <div
      ref={cardRef}
      className={`interactive-3d-card-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transformStyle: 'preserve-3d',
        position: 'relative',
        ...transformStyle,
        ...style,
      }}
      {...props}
    >
      {children}
      {glare && (
        <div
          className="interactive-3d-card-glare"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            borderRadius: 'inherit',
            transition: 'opacity 0.35s ease',
            zIndex: 10,
            ...glareStyle,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
