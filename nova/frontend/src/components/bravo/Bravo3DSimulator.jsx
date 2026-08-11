import React, { useRef, useState, useEffect, useCallback } from 'react'
import { RotateCw, RefreshCw, Type, ZoomIn, ZoomOut, Move, Eye, EyeOff, Hand } from 'lucide-react'
import { PRODUCT_DEFINITIONS, FORM_ID_MAP, resolveProductType } from '../../utils/bravoMockupProducts'
import useCanvasDrag from '../../hooks/useCanvasDrag'

/**
 * BravoMockupSimulator — Simulador de Personalización 2D Interactivo (v3.0)
 *
 * Mejoras v3.0:
 * - Soporte completo de Touch events (drag en móvil)
 * - Race condition fix con render ID
 * - Wheel zoom con { passive: false }
 * - Mouse leave cancela drag
 * - Cache de imágenes pre-cargadas
 * - Color tint con source-atop
 * - Captura async del canvas (espera carga de imágenes)
 * - Layout adaptado para controles laterales
 */

// ─── Cache global de imágenes pre-cargadas ──────────────────────────────────
const imageCache = new Map()

function loadImage(src) {
  if (!src) return Promise.resolve(null)
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src))
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// ─── Tipografías disponibles para texto personalizado ─────────────────────────
const FONTS = [
  { name: 'Outfit', label: 'Outfit' },
  { name: 'Bebas Neue', label: 'Bebas' },
  { name: 'Caveat', label: 'Caveat' },
  { name: 'Playfair Display', label: 'Playfair' }
]

const TEXT_COLORS = ['#fbbf24', '#ffffff', '#18181b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ec4899']

export default function BravoMockupSimulator({
  simulatorType = 'Polera',
  imageUrl,
  scale: externalScale = 60,
  posX: externalPosX = 0,
  posY: externalPosY = 0,
  onCaptureReady
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const renderIdRef = useRef(0)

  // Resolve product type
  const resolvedType = resolveProductType(simulatorType)
  const def = PRODUCT_DEFINITIONS[resolvedType] || PRODUCT_DEFINITIONS.Polera

  // Visual state
  const [selectedColor, setSelectedColor] = useState(0)
  const [viewMode, setViewMode] = useState('front')
  const [showBounds, setShowBounds] = useState(true)
  const [canvasReady, setCanvasReady] = useState(false)

  // Text tool state
  const [customText, setCustomText] = useState('')
  const [textColor, setTextColor] = useState('#fbbf24')
  const [fontFamily, setFontFamily] = useState('Outfit')
  const [fontSize, setFontSize] = useState(28)
  const [showTextTool, setShowTextTool] = useState(false)

  // Use the custom drag hook
  const {
    position, scale, rotation, isDragging,
    setScale, resetTransform, rotateBy,
    registerWheel, handlers
  } = useCanvasDrag({
    initialX: externalPosX,
    initialY: externalPosY,
    initialScale: externalScale,
  })

  const currentImage = (viewMode === 'back' && def.backImage) ? def.backImage : (def.frontImage || null)

  // Reset state when product changes
  useEffect(() => {
    setSelectedColor(0)
    setViewMode('front')
  }, [resolvedType])

  // Register wheel listener with passive: false
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    return registerWheel(el)
  }, [registerWheel])

  // ─── Async Canvas Renderer ──────────────────────────────────────────────────
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const currentRenderId = ++renderIdRef.current

    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 1024, 1024)

    const zone = def.printZone
    const localPosX = position.x
    const localPosY = position.y
    const localScale = scale

    // ─── DTF Mode ───────────────────────────────────────────────────────────
    if (def.isDTF) {
      const grad = ctx.createLinearGradient(0, 0, 1024, 1024)
      grad.addColorStop(0, '#f1f5f9')
      grad.addColorStop(0.5, '#e2e8f0')
      grad.addColorStop(1, '#cbd5e1')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1024, 1024)

      // Grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'
      ctx.lineWidth = 1
      for (let x = 0; x < 1024; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke()
      }
      for (let y = 0; y < 1024; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke()
      }

      // Header banner
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)'
      ctx.fillRect(0, 0, 1024, 52)
      ctx.fillStyle = '#b4783c'
      ctx.font = 'bold 22px "Outfit", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`LIENZO CONTINUO · ANCHO ÚTIL: ${def.dtfWidth}`, 512, 34)

      // Corner marks
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 3
      const corners = [[40, 80], [984, 80], [40, 984], [984, 984]]
      corners.forEach(([cx, cy]) => {
        ctx.beginPath()
        ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy)
        ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15)
        ctx.stroke()
      })

      // Logo on DTF
      if (imageUrl) {
        const logoImg = await loadImage(imageUrl)
        if (!logoImg || renderIdRef.current !== currentRenderId) return

        const zX = zone.x * 1024, zY = zone.y * 1024
        const maxW = zone.w * 1024 * (localScale / 100)
        const maxH = zone.h * 1024 * (localScale / 100)

        let w = maxW, h = maxW * (logoImg.height / logoImg.width)
        if (h > maxH) { h = maxH; w = maxH * (logoImg.width / logoImg.height) }

        const shiftX = (localPosX / 70) * (zone.w * 512)
        const shiftY = (localPosY / 70) * (zone.h * 512)

        ctx.save()
        ctx.translate(zX + shiftX, zY + shiftY)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 5
        ctx.drawImage(logoImg, -w / 2, -h / 2, w, h)
        ctx.restore()
      }

      setCanvasReady(true)
      return
    }

    // ─── Standard Product Mockup ─────────────────────────────────────────────
    if (!currentImage) return

    const baseImg = await loadImage(currentImage)
    if (!baseImg || renderIdRef.current !== currentRenderId) return

    // Draw base product
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 45
    ctx.shadowOffsetY = 25

    const aspect = baseImg.width / baseImg.height
    let drawW = 880, drawH = 880 / aspect
    if (drawH > 940) { drawH = 940; drawW = 940 * aspect }
    const drawX = (1024 - drawW) / 2
    const drawY = (1024 - drawH) / 2

    ctx.drawImage(baseImg, drawX, drawY, drawW, drawH)
    ctx.restore()

    // Color tint — solo píxeles no transparentes de la prenda
    if (def.colors && def.colors[selectedColor] && selectedColor !== 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'
      ctx.globalAlpha = 0.55
      ctx.fillStyle = def.colors[selectedColor].hex
      ctx.fillRect(drawX, drawY, drawW, drawH)
      ctx.restore()
    }

    const zX = zone.x * 1024
    const zY = zone.y * 1024

    // Draw Logo Image
    if (imageUrl) {
      const logoImg = await loadImage(imageUrl)
      if (!logoImg || renderIdRef.current !== currentRenderId) return

      const maxW = zone.w * 1024 * (localScale / 100)
      const maxH = zone.h * 1024 * (localScale / 100)

      let w = maxW, h = maxW * (logoImg.height / logoImg.width)
      if (h > maxH) { h = maxH; w = maxH * (logoImg.width / logoImg.height) }

      const shiftX = (localPosX / 70) * (zone.w * 400)
      const shiftY = (localPosY / 70) * (zone.h * 400)
      const destX = zX + shiftX
      const destY = zY + shiftY

      ctx.save()
      ctx.translate(destX, destY)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 3
      ctx.drawImage(logoImg, -w / 2, -h / 2, w, h)

      // Bounding box handles
      if (showBounds) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8)

        ctx.fillStyle = '#fbbf24'
        ctx.setLineDash([])
        const hs = [[-w / 2 - 4, -h / 2 - 4], [w / 2 + 4, -h / 2 - 4], [-w / 2 - 4, h / 2 + 4], [w / 2 + 4, h / 2 + 4]]
        hs.forEach(([hx, hy]) => { ctx.fillRect(hx - 5, hy - 5, 10, 10) })
      }
      ctx.restore()

      // Custom text below logo
      if (customText.trim()) {
        ctx.save()
        ctx.translate(destX, destY + h / 2 + 30)
        ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 6
        ctx.fillText(customText, 0, 0)
        ctx.restore()
      }
    } else {
      // Empty print zone indicator
      if (showBounds) {
        ctx.save()
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)'
        ctx.lineWidth = 2
        ctx.setLineDash([8, 6])
        const boxW = zone.w * 1024 * 0.75
        const boxH = zone.h * 1024 * 0.75
        ctx.strokeRect(zX - boxW / 2, zY - boxH / 2, boxW, boxH)

        ctx.fillStyle = 'rgba(245, 158, 11, 0.7)'
        ctx.font = '15px "Outfit", sans-serif'
        ctx.setLineDash([])
        ctx.textAlign = 'center'
        ctx.fillText('ÁREA DE ESTAMPADO', zX, zY - 6)
        ctx.font = '11px "Outfit", sans-serif'
        ctx.fillStyle = 'rgba(245, 158, 11, 0.5)'
        ctx.fillText('Sube tu diseño para previsualizar', zX, zY + 14)
        ctx.restore()
      }

      // Text only without image
      if (customText.trim()) {
        const shiftX = (localPosX / 70) * (zone.w * 400)
        const shiftY = (localPosY / 70) * (zone.h * 400)
        ctx.save()
        ctx.translate(zX + shiftX, zY + shiftY)
        ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 6
        ctx.fillText(customText, 0, 0)
        ctx.restore()
      }
    }

    setCanvasReady(true)
  }, [def, currentImage, imageUrl, position.x, position.y, scale, rotation, selectedColor, showBounds, customText, textColor, fontFamily, fontSize])

  useEffect(() => { renderCanvas() }, [renderCanvas])

  // Async capture for quote submission
  useEffect(() => {
    if (onCaptureReady && canvasRef.current) {
      onCaptureReady(async () => {
        await renderCanvas()
        // Pequeño delay para garantizar que el canvas está listo
        await new Promise(r => setTimeout(r, 100))
        return canvasRef.current.toDataURL('image/png')
      })
    }
  }, [onCaptureReady, renderCanvas])

  const hasBackView = !!def.backImage

  return (
    <div className="w-full h-full flex flex-col bg-[#08070d] rounded-2xl overflow-hidden border border-bravo-border/40 shadow-2xl relative">

      {/* ─── HEADER TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-2.5 sm:p-3 bg-[#0d0b14] border-b border-white/5 flex items-center justify-between gap-2 relative z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-500/50 shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider truncate">
            {def.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => rotateBy(90)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-amber-400 transition-all active:scale-90"
            title="Rotar 90°"
          >
            <RotateCw size={13} />
          </button>

          <button
            type="button"
            onClick={resetTransform}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-amber-400 transition-all active:scale-90"
            title="Centrar"
          >
            <RefreshCw size={13} />
          </button>

          <button
            type="button"
            onClick={() => setShowTextTool(!showTextTool)}
            className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1 ${
              showTextTool ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Type size={11} /> <span className="hidden sm:inline">Texto</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBounds(!showBounds)}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${
              showBounds ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/50 hover:text-white'
            }`}
            title={showBounds ? 'Ocultar guías' : 'Mostrar guías'}
          >
            {showBounds ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>
      </div>

      {/* ─── TEXT TOOL PANEL ─────────────────────────────────────────────────── */}
      {showTextTool && (
        <div className="p-2.5 bg-[#110e1c] border-b border-white/10 space-y-2.5 z-20">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Escribe un texto (ej. STAFF 2026)..."
            className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
          />

          <div className="flex flex-wrap items-center gap-3">
            {/* Font selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-bravo-text-muted uppercase font-mono">Fuente:</span>
              {FONTS.map(f => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setFontFamily(f.name)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                    fontFamily === f.name ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                  style={{ fontFamily: f.name }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Color selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-bravo-text-muted uppercase font-mono">Color:</span>
              {TEXT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTextColor(c)}
                  className={`w-4 h-4 rounded-full border transition-all ${textColor === c ? 'ring-2 ring-amber-400 scale-110' : 'border-white/20'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Size slider */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-bravo-text-muted uppercase font-mono">Tamaño:</span>
              <input
                type="range" min="14" max="72" value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20 accent-amber-500"
              />
              <span className="text-[9px] text-amber-400 font-mono w-7">{fontSize}px</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── CANVAS STAGE ───────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        {...handlers}
        className={`relative flex-1 min-h-[350px] sm:min-h-[420px] flex items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-[#161325] via-[#0b0914] to-[#040308] overflow-hidden select-none transition-colors ${
          isDragging ? 'cursor-grabbing bg-amber-950/5' : 'cursor-grab'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[320px] sm:max-h-[460px] object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] transition-transform duration-75"
        />

        {/* Scale badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full z-10 pointer-events-none">
          <span className="text-[10px] font-mono text-amber-400 font-bold">{scale}%</span>
          {rotation !== 0 && <span className="text-[10px] font-mono text-white/40 ml-2">{rotation}°</span>}
        </div>

        {/* Zoom buttons */}
        <div className="absolute top-12 right-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setScale(prev => Math.min(150, prev + 10))}
            className="p-2 rounded-xl bg-black/60 border border-white/10 hover:border-amber-400 text-white/60 hover:text-white transition-all backdrop-blur-md active:scale-90"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setScale(prev => Math.max(10, prev - 10))}
            className="p-2 rounded-xl bg-black/60 border border-white/10 hover:border-amber-400 text-white/60 hover:text-white transition-all backdrop-blur-md active:scale-90"
          >
            <ZoomOut size={14} />
          </button>
        </div>

        {/* Drag helper */}
        {!isDragging && (
          <div className="absolute top-3 left-3 bg-black/60 border border-white/10 px-2.5 py-1 rounded-xl backdrop-blur-md flex items-center gap-1.5 pointer-events-none z-10">
            <Hand size={11} className="text-amber-400 animate-pulse" />
            <span className="text-[8px] sm:text-[9px] font-mono text-amber-300/80 uppercase tracking-widest">
              {window.innerWidth < 768 ? 'Toca y Arrastra' : 'Clic y Arrastra'}
            </span>
          </div>
        )}

        {/* Dragging glow indicator */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none border-2 border-amber-500/20 rounded-2xl animate-pulse" />
        )}

        {/* Color picker */}
        {def.colors && def.colors.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 shadow-xl z-10">
            <span className="text-[8px] text-bravo-text-muted font-mono uppercase mr-0.5 hidden sm:inline">Color:</span>
            {def.colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedColor(i)}
                title={c.name}
                className={`w-4 h-4 rounded-full border transition-all ${
                  selectedColor === i ? 'ring-2 ring-amber-400 scale-125 border-white' : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}

        {/* View switcher */}
        {hasBackView && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-xl z-10">
            <button
              type="button"
              onClick={() => setViewMode('front')}
              className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded-lg transition-all ${
                viewMode === 'front' ? 'bg-amber-500 text-black shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              Frente
            </button>
            <button
              type="button"
              onClick={() => setViewMode('back')}
              className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded-lg transition-all ${
                viewMode === 'back' ? 'bg-amber-500 text-black shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              {def.backLabel || 'Reverso'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
