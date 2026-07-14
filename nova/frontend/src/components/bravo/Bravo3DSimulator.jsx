import React, { useRef, useState, useEffect, useCallback } from 'react'

/**
 * BravoMockupSimulator — Simulador de Mockups 2D Profesional
 * 
 * Renderiza imágenes fotorrealistas de productos (Polera, Tazón, Jockey)
 * con la imagen del logo del cliente superpuesta en la zona de estampado,
 * con controles de posición, escala y selección de vista (Frente/Espalda/Lateral).
 * 
 * Usa un <canvas> interno para componer la imagen base + logo con blend modes
 * y expone una función de captura para screenshot.
 * 
 * @param {string}   simulatorType  - 'Polera' | 'Tazón' | 'Jockey'
 * @param {string}   imageUrl       - Data URL o URL de la imagen del logo
 * @param {number}   scale          - Escala del logo (10-150, default 60)
 * @param {number}   posX           - Posición horizontal del logo (-70 a 70)
 * @param {number}   posY           - Posición vertical del logo (-70 a 70)
 * @param {function} onCaptureReady - Callback que recibe la función de captura
 */

// Configuración de productos: zonas de estampado y vistas disponibles
const PRODUCT_CONFIG = {
  Polera: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/polera_front.png' },
      { id: 'back', label: 'Espalda', src: '/mockups/polera_back.png' }
    ],
    // Zona de estampado como porcentaje del canvas (x, y, ancho, alto)
    stampZone: {
      front: { cx: 0.50, cy: 0.42, maxW: 0.32, maxH: 0.35 },
      back:  { cx: 0.50, cy: 0.40, maxW: 0.34, maxH: 0.38 }
    }
  },
  Tazón: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/tazon_front.png' },
      { id: 'side', label: 'Lateral', src: '/mockups/tazon_side.png' }
    ],
    stampZone: {
      front: { cx: 0.46, cy: 0.47, maxW: 0.28, maxH: 0.30 },
      side:  { cx: 0.50, cy: 0.47, maxW: 0.30, maxH: 0.32 }
    }
  },
  Jockey: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/jockey_front.png' },
      { id: 'side', label: 'Lateral', src: '/mockups/jockey_side.png' }
    ],
    stampZone: {
      front: { cx: 0.50, cy: 0.40, maxW: 0.24, maxH: 0.22 },
      side:  { cx: 0.42, cy: 0.40, maxW: 0.22, maxH: 0.20 }
    }
  },
  Chopero: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/chopero_front.png' }
    ],
    stampZone: {
      front: { cx: 0.50, cy: 0.50, maxW: 0.25, maxH: 0.45 }
    }
  },
  Mug: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/mug_front.png' }
    ],
    stampZone: {
      front: { cx: 0.50, cy: 0.50, maxW: 0.30, maxH: 0.40 }
    }
  },
  Termo: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/termo_front.png' }
    ],
    stampZone: {
      front: { cx: 0.50, cy: 0.55, maxW: 0.20, maxH: 0.50 }
    }
  },
  Puzle: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/puzle_front.png' }
    ],
    stampZone: {
      front: { cx: 0.50, cy: 0.50, maxW: 0.60, maxH: 0.45 }
    }
  },
  Polerón: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/poleron_front.png' }
    ],
    stampZone: {
      front: { cx: 0.50, cy: 0.45, maxW: 0.30, maxH: 0.32 }
    }
  },
  Totebag: {
    views: [
      { id: 'front', label: 'Frente', src: '/mockups/totebag_front.png' }
    ],
    stampZone: {
      front: { cx: 0.50, cy: 0.50, maxW: 0.35, maxH: 0.35 }
    }
  }
}

export default function BravoMockupSimulator({
  simulatorType = 'Polera',
  imageUrl,
  scale = 60,
  posX = 0,
  posY = 0,
  onCaptureReady
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [activeView, setActiveView] = useState('front')
  const [isLoading, setIsLoading] = useState(true)
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 400 })

  // Imágenes cacheadas
  const baseImageRef = useRef(null)
  const logoImageRef = useRef(null)

  // Config del producto actual
  const config = PRODUCT_CONFIG[simulatorType] || PRODUCT_CONFIG.Polera

  // Reset vista al cambiar producto
  useEffect(() => {
    setActiveView('front')
  }, [simulatorType])

  // Observar tamaño del contenedor
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const w = container.clientWidth || 500
      const h = container.clientHeight || 400
      // Canvas a resolución 2x para retina
      setCanvasSize({ width: w, height: h })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Cargar imagen base del producto
  useEffect(() => {
    const viewConfig = config.views.find(v => v.id === activeView)
    if (!viewConfig) return

    setIsLoading(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      baseImageRef.current = img
      setIsLoading(false)
    }
    img.onerror = () => {
      console.error('[Mockup] Error cargando imagen base:', viewConfig.src)
      baseImageRef.current = null
      setIsLoading(false)
    }
    img.src = viewConfig.src
  }, [simulatorType, activeView, config.views])

  // Cargar logo del cliente
  useEffect(() => {
    if (!imageUrl) {
      logoImageRef.current = null
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      logoImageRef.current = img
    }
    img.onerror = () => {
      console.error('[Mockup] Error cargando logo del cliente')
      logoImageRef.current = null
    }
    img.src = imageUrl
  }, [imageUrl])

  // Función principal de renderizado del canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvasSize.width
    const h = canvasSize.height

    // Configurar canvas a resolución retina
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    // Fondo degradado oscuro de estudio
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7)
    bgGrad.addColorStop(0, '#1e1b3a')
    bgGrad.addColorStop(0.6, '#12111f')
    bgGrad.addColorStop(1, '#08080f')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // Dibujar imagen base del producto
    const baseImg = baseImageRef.current
    if (baseImg) {
      // Calcular dimensiones para cubrir el canvas manteniendo ratio
      const imgRatio = baseImg.width / baseImg.height
      const canvasRatio = w / h
      let drawW, drawH, drawX, drawY

      if (imgRatio > canvasRatio) {
        drawH = h * 0.88
        drawW = drawH * imgRatio
      } else {
        drawW = w * 0.88
        drawH = drawW / imgRatio
      }
      drawX = (w - drawW) / 2
      drawY = (h - drawH) / 2

      ctx.drawImage(baseImg, drawX, drawY, drawW, drawH)

      // Dibujar logo superpuesto si existe
      const logoImg = logoImageRef.current
      if (logoImg && imageUrl) {
        const zone = config.stampZone[activeView] || config.stampZone.front

        // Calcular posición base del logo en coordenadas del canvas
        const logoRatio = logoImg.width / logoImg.height
        const scaleFactor = scale / 100
        const logoMaxW = w * zone.maxW * scaleFactor
        const logoMaxH = h * zone.maxH * scaleFactor

        let logoW, logoH
        if (logoRatio > 1) {
          logoW = logoMaxW
          logoH = logoMaxW / logoRatio
          if (logoH > logoMaxH) {
            logoH = logoMaxH
            logoW = logoMaxH * logoRatio
          }
        } else {
          logoH = logoMaxH
          logoW = logoMaxH * logoRatio
          if (logoW > logoMaxW) {
            logoW = logoMaxW
            logoH = logoMaxW / logoRatio
          }
        }

        // Posición centrada en la zona de estampado + offset del usuario
        const offsetX = (posX / 70) * (w * 0.15)
        const offsetY = (posY / 70) * (h * 0.15)
        const logoX = (w * zone.cx) - (logoW / 2) + offsetX
        const logoY = (h * zone.cy) - (logoH / 2) - offsetY // invertir Y para que sea intuitivo

        // Dibujar logo con blend mode para integración visual
        ctx.save()
        ctx.globalCompositeOperation = 'multiply'
        ctx.globalAlpha = 0.92
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)
        ctx.restore()

        // Segunda pasada para brillo y color verdadero
        ctx.save()
        ctx.globalAlpha = 0.7
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)
        ctx.restore()
      }
    } else if (!isLoading) {
      // Placeholder si no hay imagen
      ctx.fillStyle = '#ffffff15'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Error al cargar la imagen del producto', w / 2, h / 2)
    }

    // Efecto sutil de viñeta
    const vignetteGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.75)
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)')
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = vignetteGrad
    ctx.fillRect(0, 0, w, h)

    // Línea de "reflejo" sutil en la base
    const reflectY = h * 0.92
    const reflectGrad = ctx.createLinearGradient(0, reflectY, 0, h)
    reflectGrad.addColorStop(0, 'rgba(245, 158, 11, 0.0)')
    reflectGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.06)')
    reflectGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)')
    ctx.fillStyle = reflectGrad
    ctx.fillRect(w * 0.15, reflectY, w * 0.7, h - reflectY)

  }, [canvasSize, isLoading, imageUrl, scale, posX, posY, activeView, config, simulatorType])

  // Re-renderizar cuando cambian los parámetros
  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  // Re-renderizar cuando las imágenes se cargan (polling simple con requestAnimationFrame)
  useEffect(() => {
    let frameId
    let lastBaseImg = null
    let lastLogoImg = null

    const checkAndRender = () => {
      const currentBase = baseImageRef.current
      const currentLogo = logoImageRef.current

      if (currentBase !== lastBaseImg || currentLogo !== lastLogoImg) {
        lastBaseImg = currentBase
        lastLogoImg = currentLogo
        renderCanvas()
      }

      frameId = requestAnimationFrame(checkAndRender)
    }

    frameId = requestAnimationFrame(checkAndRender)
    return () => cancelAnimationFrame(frameId)
  }, [renderCanvas])

  // Registrar función de captura
  useEffect(() => {
    if (onCaptureReady) {
      onCaptureReady(() => {
        renderCanvas()
        const canvas = canvasRef.current
        if (canvas) {
          return canvas.toDataURL('image/png')
        }
        return null
      })
    }
  }, [onCaptureReady, renderCanvas])

  return (
    <div className="w-full h-full flex flex-col" style={{ minHeight: '280px' }}>
      {/* Canvas del Mockup */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-t-xl"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e1b3a 0%, #0f0e1a 55%, #080812 100%)' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />

        {/* Indicador de carga */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
              <span className="w-3 h-3 border-2 border-amber-400/60 border-t-amber-400 rounded-full animate-spin" />
              Cargando vista...
            </div>
          </div>
        )}

        {/* Overlay informativo */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
            Mockup · {simulatorType}
          </span>
        </div>

        {/* Indicador de logo cargado */}
        {imageUrl && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <span className="text-[8px] font-mono text-amber-300/50 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
              ✓ Logo aplicado
            </span>
          </div>
        )}
      </div>

      {/* Selector de vistas */}
      <div className="flex bg-[#0d0d1a] border-t border-white/5 rounded-b-xl">
        {config.views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer ${
              activeView === view.id
                ? 'text-amber-300 bg-amber-500/10 border-b-2 border-amber-400'
                : 'text-white/30 hover:text-white/50 hover:bg-white/5 border-b-2 border-transparent'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  )
}
