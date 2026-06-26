import { useEffect, useRef } from 'react'

/**
 * BravoBackground — Premium animated canvas background for the Bravo system.
 * 
 * Features:
 * 1. Logo rendered as a particle mosaic that forms/disperses cyclically
 * 2. Warm ambient orbs (terracotta, amber, coral, copper)
 * 3. Golden sparkle particles floating upward
 */
export default function BravoBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationId
    let logoParticles = []
    let logoImg = null
    let logoLoaded = false
    let time = 0

    // ─── 1. AMBIENT ORBS (warm vibrant palette) ───
    const orbs = [
      {
        x: 0, y: 0,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        baseRadius: 0, radius: 0,
        colorStart: 'rgba(217, 119, 6, 0.14)',   // Deep amber
        colorEnd: 'rgba(217, 119, 6, 0)',
        pulseSpeed: 0.0015 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: 0, y: 0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        baseRadius: 0, radius: 0,
        colorStart: 'rgba(194, 65, 12, 0.10)',    // Terracotta
        colorEnd: 'rgba(194, 65, 12, 0)',
        pulseSpeed: 0.0012 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: 0, y: 0,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        baseRadius: 0, radius: 0,
        colorStart: 'rgba(251, 146, 60, 0.12)',   // Coral/Orange
        colorEnd: 'rgba(251, 146, 60, 0)',
        pulseSpeed: 0.0018 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: 0, y: 0,
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38,
        baseRadius: 0, radius: 0,
        colorStart: 'rgba(180, 83, 9, 0.11)',     // Copper
        colorEnd: 'rgba(180, 83, 9, 0)',
        pulseSpeed: 0.001 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
      {
        x: 0, y: 0,
        vx: (Math.random() - 0.5) * 0.42,
        vy: (Math.random() - 0.5) * 0.42,
        baseRadius: 0, radius: 0,
        colorStart: 'rgba(252, 211, 77, 0.09)',    // Gold
        colorEnd: 'rgba(252, 211, 77, 0)',
        pulseSpeed: 0.002 + Math.random() * 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
      },
    ]

    // ─── 2. SPARKLE PARTICLES ───
    const SPARKLE_COLORS = [
      'rgba(217, 119, 6, ',    // amber
      'rgba(252, 211, 77, ',   // gold
      'rgba(194, 65, 12, ',    // terracotta
      'rgba(180, 83, 9, ',     // copper
      'rgba(251, 146, 60, ',   // coral
    ]

    const sparkles = []
    const SPARKLE_COUNT = 55
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      sparkles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.12 - Math.random() * 0.3,
        size: Math.random() * 2.5 + 0.6,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        opacity: Math.random() * 0.5 + 0.15,
        fadeSpeed: 0.003 + Math.random() * 0.005,
        fadePhase: Math.random() * Math.PI * 2,
      })
    }

    // ─── 3. LOGO PARTICLE SYSTEM ───
    const PARTICLE_COUNT = 350
    const CYCLE_SPEED = 0.12  // ~8 seconds per full cycle (2π / 0.12 ≈ 52s, but we use abs(sin) so ~26s half-cycle → actually controls morph speed)

    // Load the logo image and sample bright pixels
    const loadLogo = () => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = '/logo-bravo.jpg'

      img.onload = () => {
        // Draw logo on an offscreen canvas to sample pixel data
        const offscreen = document.createElement('canvas')
        const logoSize = Math.min(canvas.width, canvas.height) * 0.45
        const aspectRatio = img.width / img.height
        const drawW = aspectRatio >= 1 ? logoSize : logoSize * aspectRatio
        const drawH = aspectRatio >= 1 ? logoSize / aspectRatio : logoSize
        offscreen.width = drawW
        offscreen.height = drawH
        const offCtx = offscreen.getContext('2d')
        offCtx.drawImage(img, 0, 0, drawW, drawH)

        const imageData = offCtx.getImageData(0, 0, drawW, drawH)
        const data = imageData.data

        // Collect bright pixel positions (golden/light areas of the logo)
        const brightPoints = []
        const step = 3 // sample every 3rd pixel for performance
        for (let y = 0; y < drawH; y += step) {
          for (let x = 0; x < drawW; x += step) {
            const idx = (y * drawW + x) * 4
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const a = data[idx + 3]
            // Calculate luminosity — we want the golden/bright parts
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
            // Only sample pixels that are bright enough and not too dark
            if (luminance > 60 && a > 100) {
              brightPoints.push({ x, y, luminance })
            }
          }
        }

        // Randomly select PARTICLE_COUNT points from the bright areas
        const selected = []
        for (let i = 0; i < PARTICLE_COUNT && brightPoints.length > 0; i++) {
          const idx = Math.floor(Math.random() * brightPoints.length)
          selected.push(brightPoints.splice(idx, 1)[0])
        }

        // Calculate offset to center the logo on the content area (excluding desktop sidebar)
        const isDesktop = window.innerWidth >= 768
        const sidebarWidth = isDesktop ? 256 : 0
        const offsetX = sidebarWidth + (canvas.width - sidebarWidth - drawW) / 2
        const offsetY = (canvas.height - drawH) / 2

        // Create particles with home (logo) and wander positions
        logoParticles = selected.map((pt) => {
          const brightness = pt.luminance / 255
          // Choose a color based on brightness
          const colorIdx = Math.floor(Math.random() * SPARKLE_COLORS.length)
          return {
            // Home position (where the logo is)
            homeX: pt.x + offsetX,
            homeY: pt.y + offsetY,
            // Wander position (random on screen)
            wanderX: Math.random() * canvas.width,
            wanderY: Math.random() * canvas.height,
            // Current rendered position
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            // Visual properties
            size: (Math.random() * 2.2 + 0.8) * (0.6 + brightness * 0.6),
            color: SPARKLE_COLORS[colorIdx],
            opacity: 0.3 + brightness * 0.55,
            // Individual timing offset for organic feel
            phaseOffset: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.5,
            // Wander velocity for when dispersed
            wvx: (Math.random() - 0.5) * 0.4,
            wvy: (Math.random() - 0.5) * 0.4,
          }
        })

        // Key out the dark background of the logo for the static watermark
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b
          if (luminance < 40) {
            data[i + 3] = 0 // transparent background
          } else if (luminance < 80) {
            const factor = (luminance - 40) / 40
            data[i + 3] = Math.floor(data[i + 3] * factor)
          }
        }
        offCtx.putImageData(imageData, 0, 0)
        logoImg = offscreen

        logoLoaded = true
      }
    }

    // ─── RESIZE HANDLER ───
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const minDim = Math.min(canvas.width, canvas.height)
      orbs[0].baseRadius = minDim * 0.40
      orbs[1].baseRadius = minDim * 0.35
      orbs[2].baseRadius = minDim * 0.38
      orbs[3].baseRadius = minDim * 0.45
      orbs[4].baseRadius = minDim * 0.42

      // Randomize orb start positions
      orbs.forEach(orb => {
        if (orb.x === 0 && orb.y === 0) {
          orb.x = Math.random() * canvas.width
          orb.y = Math.random() * canvas.height
        }
      })

      // Reload logo particles when resized (recalculates positions)
      logoLoaded = false
      loadLogo()
    }

    resize()
    window.addEventListener('resize', resize)

    // ─── DRAW LOOP ───
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'
      time += 0.016 // ~60fps time step

      // ── Draw ambient orbs ──
      orbs.forEach(orb => {
        orb.x += orb.vx
        orb.y += orb.vy

        // Bounce off edges
        if (orb.x - orb.radius < -orb.radius * 0.5) { orb.x = -orb.radius * 0.5; orb.vx *= -1 }
        else if (orb.x + orb.radius > canvas.width + orb.radius * 0.5) { orb.x = canvas.width + orb.radius * 0.5 - orb.radius; orb.vx *= -1 }
        if (orb.y - orb.radius < -orb.radius * 0.5) { orb.y = -orb.radius * 0.5; orb.vy *= -1 }
        else if (orb.y + orb.radius > canvas.height + orb.radius * 0.5) { orb.y = canvas.height + orb.radius * 0.5 - orb.radius; orb.vy *= -1 }

        orb.pulsePhase += orb.pulseSpeed
        orb.radius = orb.baseRadius * (1 + Math.sin(orb.pulsePhase) * 0.22)

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        grad.addColorStop(0, orb.colorStart)
        grad.addColorStop(1, orb.colorEnd)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      // ── Draw static logo watermark ──
      if (logoLoaded && logoImg) {
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 0.12 // increased watermark visibility (12%)
        const isDesktop = window.innerWidth >= 768
        const sidebarWidth = isDesktop ? 256 : 0
        const drawW = logoImg.width
        const drawH = logoImg.height
        const offsetX = sidebarWidth + (canvas.width - sidebarWidth - drawW) / 2
        const offsetY = (canvas.height - drawH) / 2
        ctx.drawImage(logoImg, offsetX, offsetY)
        ctx.restore()
      }

      // ── Draw sparkles ──
      sparkles.forEach(s => {
        s.x += s.vx
        s.y += s.vy
        if (s.x < 0) s.x = canvas.width
        if (s.x > canvas.width) s.x = 0
        if (s.y < 0) s.y = canvas.height
        if (s.y > canvas.height) s.y = 0

        s.fadePhase += s.fadeSpeed
        const currentOpacity = s.opacity * (0.35 + Math.sin(s.fadePhase) * 0.65)

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `${s.color}${Math.max(0, currentOpacity).toFixed(3)})`
        ctx.fill()
      })

      // ── Draw logo particles (form / disperse cycle) ──
      if (logoLoaded && logoParticles.length > 0) {
        // Morph factor: 0 = dispersed, 1 = formed into logo
        // Using a smooth sin wave that spends more time formed (logo visible)
        const rawSin = Math.sin(time * CYCLE_SPEED)
        // Bias towards "formed" state: formed when rawSin > -0.3
        const morph = Math.max(0, Math.min(1, (rawSin + 0.3) / 1.3))

        logoParticles.forEach(p => {
          // Smoothly interpolate between wander and home position
          // Use individual phase offset for organic stagger
          const individualMorph = Math.max(0, Math.min(1,
            morph + Math.sin(time * 0.5 + p.phaseOffset) * 0.08
          ))

          // Update wander positions slowly
          p.wanderX += p.wvx
          p.wanderY += p.wvy
          // Wrap wander positions
          if (p.wanderX < 0) p.wanderX = canvas.width
          if (p.wanderX > canvas.width) p.wanderX = 0
          if (p.wanderY < 0) p.wanderY = canvas.height
          if (p.wanderY > canvas.height) p.wanderY = 0

          // Lerp to target
          const targetX = p.homeX * individualMorph + p.wanderX * (1 - individualMorph)
          const targetY = p.homeY * individualMorph + p.wanderY * (1 - individualMorph)

          // Smooth follow (easing)
          p.x += (targetX - p.x) * 0.04 * p.speed
          p.y += (targetY - p.y) * 0.04 * p.speed

          // Twinkle effect
          const twinkle = 0.5 + Math.sin(time * 2.5 + p.phaseOffset) * 0.5
          const finalOpacity = p.opacity * (0.3 + twinkle * 0.7) * (0.5 + individualMorph * 0.5)

          // Draw particle with glow
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (0.8 + individualMorph * 0.4), 0, Math.PI * 2)
          ctx.fillStyle = `${p.color}${Math.max(0, finalOpacity).toFixed(3)})`
          ctx.fill()

          // Add a subtle glow halo when formed
          if (individualMorph > 0.5) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
            ctx.fillStyle = `${p.color}${(finalOpacity * 0.15).toFixed(3)})`
            ctx.fill()
          }
        })
      }

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
