import { useEffect, useRef } from 'react'

export default function BravoBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationId

    // Define 5 ambient orbs with warm/luxury color palettes (amber, gold, rose, copper, wine)
    const orbs = [
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        baseRadius: 0,
        radius: 0,
        colorStart: 'rgba(217, 119, 6, 0.14)',  // Amber
        colorEnd: 'rgba(217, 119, 6, 0)',
        pulseSpeed: 0.001 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        baseRadius: 0,
        radius: 0,
        colorStart: 'rgba(251, 191, 36, 0.11)', // Gold
        colorEnd: 'rgba(251, 191, 36, 0)',
        pulseSpeed: 0.0008 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.26,
        vy: (Math.random() - 0.5) * 0.26,
        baseRadius: 0,
        radius: 0,
        colorStart: 'rgba(244, 63, 94, 0.09)',   // Rose/Pink Gold
        colorEnd: 'rgba(244, 63, 94, 0)',
        pulseSpeed: 0.0012 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.19,
        vy: (Math.random() - 0.5) * 0.19,
        baseRadius: 0,
        radius: 0,
        colorStart: 'rgba(146, 64, 14, 0.12)',  // Deep Amber/Copper
        colorEnd: 'rgba(146, 64, 14, 0)',
        pulseSpeed: 0.0007 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        baseRadius: 0,
        radius: 0,
        colorStart: 'rgba(88, 28, 135, 0.08)',  // Deep Velvet Wine / Purple
        colorEnd: 'rgba(88, 28, 135, 0)',
        pulseSpeed: 0.0015 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      }
    ]

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const minDim = Math.min(canvas.width, canvas.height)
      orbs[0].baseRadius = minDim * 0.38
      orbs[1].baseRadius = minDim * 0.44
      orbs[2].baseRadius = minDim * 0.32
      orbs[3].baseRadius = minDim * 0.48
      orbs[4].baseRadius = minDim * 0.40
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Use screen composite operation to blend glowing radial overlays beautifully
      ctx.globalCompositeOperation = 'screen'

      orbs.forEach(orb => {
        // Update position
        orb.x += orb.vx
        orb.y += orb.vy

        // Boundaries bounce with radius margin
        if (orb.x - orb.radius < -orb.radius * 0.5) {
          orb.x = -orb.radius * 0.5
          orb.vx *= -1
        } else if (orb.x + orb.radius > canvas.width + orb.radius * 0.5) {
          orb.x = canvas.width + orb.radius * 0.5 - orb.radius
          orb.vx *= -1
        }

        if (orb.y - orb.radius < -orb.radius * 0.5) {
          orb.y = -orb.radius * 0.5
          orb.vy *= -1
        } else if (orb.y + orb.radius > canvas.height + orb.radius * 0.5) {
          orb.y = canvas.height + orb.radius * 0.5 - orb.radius
          orb.vx *= -1
        }

        // Pulse size (breathing)
        orb.pulsePhase += orb.pulseSpeed
        orb.radius = orb.baseRadius * (1 + Math.sin(orb.pulsePhase) * 0.16)

        // Draw radial gradient
        const grad = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, orb.radius
        )
        grad.addColorStop(0, orb.colorStart)
        grad.addColorStop(1, orb.colorEnd)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
