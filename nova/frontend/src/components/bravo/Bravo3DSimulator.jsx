import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  RotateCw, RefreshCw, Type, Eye, EyeOff, Sparkles,
  UploadCloud, Check, Layers, Sliders, Maximize2, X, ArrowRight
} from 'lucide-react'
import {
  PRODUCT_DEFINITIONS,
  resolveProductType
} from '../../utils/bravoMockupProducts'
import { BRAVO_PRESETS } from '../../utils/bravoPresets'

/**
 * BravoPhotorealisticSimulator (v5.0 Ultra-Realista — Ghost Mannequin Studio)
 *
 * Módulo de simulación fotorrealista para Personalizaciones Bravo:
 * 1. Sombra ambiental de suelo de estudio fotográfico.
 * 2. Capa base de tinte cromático textil dinámico (mediante máscara alfa con mask-image).
 * 3. Capa de arrugas, costuras, caída y sombras fotográficas reales en modo Multiply.
 * 4. Capa de iluminación softbox y brillos especulares en modo Screen.
 * 5. Gizmo interactivo DTF: arrastre libre con puntero (mouse/touch), redimensionamiento,
 *    rotación, calibración milimétrica (X, Y, Escala, Ángulo) y presets de arte de Bravo.
 * 6. Compatibilidad total con todos los productos del catálogo y exportación dual en alta resolución.
 */

// ─── Formatos DTF estándar ───────────────────────────────────────────────────
const DTF_FORMATS = [
  { key: 'A6', cm: '10 × 10 cm', label: 'Bolsillo / Logo', scaleFactor: 0.65, dtfCost: 2900 },
  { key: 'A5', cm: '15 × 20 cm', label: 'Mediano / Manga', scaleFactor: 0.85, dtfCost: 3900 },
  { key: 'A4', cm: '20 × 30 cm', label: 'Estándar / Pecho', scaleFactor: 1.0,  dtfCost: 5900 },
  { key: 'A3', cm: '30 × 40 cm', label: 'Maxi / Espalda', scaleFactor: 1.35, dtfCost: 8900 }
]

// ─── Cache de imágenes para exportación en Canvas ────────────────────────────
const imageCache = new Map()

function loadImage(src) {
  if (!src) return Promise.resolve(null)
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src))
  return new Promise((resolve) => {
    const img = new Image()
    // Los Data URIs no necesitan ni deben llevar crossOrigin para evitar bloqueos del navegador
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => {
      // Reintento sin crossOrigin en caso de restricción CORS en imágenes locales
      if (img.crossOrigin) {
        const retryImg = new Image()
        retryImg.onload = () => {
          imageCache.set(src, retryImg)
          resolve(retryImg)
        }
        retryImg.onerror = () => resolve(null)
        retryImg.src = src
      } else {
        resolve(null)
      }
    }
    img.src = src
  })
}

export default function BravoMockupSimulator({
  simulatorType = 'Polera',
  imageUrl,
  scale: externalScale = 60,
  posX: externalPosX = 0,
  posY: externalPosY = 0,
  onCaptureReady,
  onProductChange,
  onProceedToQuote
}) {
  const stageContainerRef = useRef(null)
  const offscreenCanvasRef = useRef(null)
  const renderIdRef = useRef(0)

  // Estado interno sincronizado con el prop externo
  const [internalProductType, setInternalProductType] = useState(simulatorType)

  useEffect(() => {
    if (simulatorType) {
      setInternalProductType(simulatorType)
    }
  }, [simulatorType])

  const handleSelectProduct = (newType) => {
    setInternalProductType(newType)
    if (onProductChange) {
      onProductChange(newType)
    }
  }

  // Resolución de producto del catálogo
  const resolvedType = resolveProductType(internalProductType)
  const def = PRODUCT_DEFINITIONS[resolvedType] || PRODUCT_DEFINITIONS.Polera

  // Vista activa: 'front' o 'back'
  const [currentView, setCurrentView] = useState('front')
  const [selectedColorIdx, setSelectedColorIdx] = useState(0)
  const [customColorHex, setCustomColorHex] = useState(null)
  const [showGuidelines, setShowGuidelines] = useState(true)
  const [activeTab, setActiveTab] = useState('presets') // 'presets' | 'upload' | 'adjust'

  // Diseños independientes para Frente y Reverso / Espalda
  const [designs, setDesigns] = useState({
    front: {
      enabled: true,
      selectedPresetId: 'bravo-emblema-oficial',
      uploadedArtworkUrl: imageUrl || null,
      offsetX: 50.0,
      offsetY: 38.0,
      scaleMultiplier: 1.0,
      rotationAngle: 0,
      activeFormatKey: 'A4'
    },
    back: {
      enabled: false, // Inicia lisa hasta que el cliente active o elija arte
      selectedPresetId: 'bravo-emblema-oficial',
      uploadedArtworkUrl: null,
      offsetX: 50.0,
      offsetY: 42.0,
      scaleMultiplier: 1.2,
      rotationAngle: 0,
      activeFormatKey: 'A3'
    }
  })

  // Diseño de la cara activa
  const activeDesign = designs[currentView] || designs.front

  // Helper para mutar el diseño de la vista activa
  const updateActiveDesign = useCallback((patch) => {
    setDesigns(prev => ({
      ...prev,
      [currentView]: {
        ...prev[currentView],
        ...patch
      }
    }))
  }, [currentView])

  // Getters y setters para el diseño activo
  const offsetX = activeDesign.offsetX
  const offsetY = activeDesign.offsetY
  const scaleMultiplier = activeDesign.scaleMultiplier
  const rotationAngle = activeDesign.rotationAngle
  const activeFormatKey = activeDesign.activeFormatKey
  const uploadedArtworkUrl = activeDesign.uploadedArtworkUrl
  const selectedPresetId = activeDesign.selectedPresetId

  const setOffsetX = (val) => updateActiveDesign({ offsetX: val })
  const setOffsetY = (val) => updateActiveDesign({ offsetY: val })
  const setScaleMultiplier = (val) => updateActiveDesign({ scaleMultiplier: val })
  const setRotationAngle = (valOrFn) => {
    const next = typeof valOrFn === 'function' ? valOrFn(activeDesign.rotationAngle) : valOrFn
    updateActiveDesign({ rotationAngle: next })
  }
  const setActiveFormatKey = (key) => updateActiveDesign({ activeFormatKey: key })
  const setSelectedPresetId = (id) => updateActiveDesign({ selectedPresetId: id, uploadedArtworkUrl: null, enabled: true })
  const setUploadedArtworkUrl = (url) => updateActiveDesign({ uploadedArtworkUrl: url, selectedPresetId: null, enabled: true })

  // Estado de arrastre del gizmo
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false)
  const dragStartRef = useRef({ startX: 0, startY: 0, initOffsetX: 50, initOffsetY: 38 })

  // Color actual de la prenda
  const currentColor = customColorHex || (def.colors?.[selectedColorIdx]?.hex || '#121212')

  // Imagen activa según la vista
  const hasBackView = !!def.backImage
  const currentProductImg = (currentView === 'back' && def.backImage)
    ? def.backImage
    : (def.frontImage || '/mockups/polera_front.png')

  // Sincronizar imagen externa si cambia (aplica a la vista frontal por defecto)
  useEffect(() => {
    if (imageUrl) {
      setDesigns(prev => ({
        ...prev,
        front: {
          ...prev.front,
          uploadedArtworkUrl: imageUrl,
          selectedPresetId: null,
          enabled: true
        }
      }))
    }
  }, [imageUrl])

  // Reset al cambiar de producto del catálogo
  useEffect(() => {
    setCurrentView('front')
    setSelectedColorIdx(0)
    setCustomColorHex(null)
    setDesigns({
      front: {
        enabled: true,
        selectedPresetId: 'bravo-emblema-oficial',
        uploadedArtworkUrl: null,
        offsetX: 50.0,
        offsetY: def.category === 'textil' ? 38.0 : 48.0,
        scaleMultiplier: 1.0,
        rotationAngle: 0,
        activeFormatKey: 'A4'
      },
      back: {
        enabled: false,
        selectedPresetId: 'bravo-emblema-oficial',
        uploadedArtworkUrl: null,
        offsetX: 50.0,
        offsetY: def.category === 'textil' ? 42.0 : 48.0,
        scaleMultiplier: 1.2,
        rotationAngle: 0,
        activeFormatKey: 'A3'
      }
    })
  }, [resolvedType, def.category])

  // Preset activo para la vista actual
  const activePreset = BRAVO_PRESETS.find(p => p.id === activeDesign.selectedPresetId) || BRAVO_PRESETS[0]

  // Dimensiones del formato DTF activo
  const activeFormat = DTF_FORMATS.find(f => f.key === activeDesign.activeFormatKey) || DTF_FORMATS[2]

  // ─── Manejo de Arrastre Libre (Pointer Events) ──────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const stage = stageContainerRef.current
    if (!stage) return

    setIsDraggingGizmo(true)
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initOffsetX: activeDesign.offsetX,
      initOffsetY: activeDesign.offsetY
    }

    const onPointerMove = (moveEvent) => {
      const rect = stage.getBoundingClientRect()
      const deltaX = moveEvent.clientX - dragStartRef.current.startX
      const deltaY = moveEvent.clientY - dragStartRef.current.startY

      const deltaXPct = (deltaX / rect.width) * 100
      const deltaYPct = (deltaY / rect.height) * 100

      // Límites de seguridad de prensa térmica (16% a 84%)
      const newX = Math.min(84, Math.max(16, dragStartRef.current.initOffsetX + deltaXPct))
      const newY = Math.min(84, Math.max(16, dragStartRef.current.initOffsetY + deltaYPct))

      updateActiveDesign({
        offsetX: Math.round(newX * 10) / 10,
        offsetY: Math.round(newY * 10) / 10
      })
    }

    const onPointerUp = () => {
      setIsDraggingGizmo(false)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // ─── Subida de archivo personalizada ─────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      updateActiveDesign({
        uploadedArtworkUrl: evt.target.result,
        selectedPresetId: null,
        enabled: true
      })
    }
    reader.readAsDataURL(file)
  }

  // ─── Atajos de alineación rápida ─────────────────────────────────────────────
  const setQuickPosition = (x, y) => {
    updateActiveDesign({ offsetX: x, offsetY: y, enabled: true })
  }

  // ─── Función Auxiliar de Dibujo de Vista en Canvas ──────────────────────────
  const drawViewOnContext = async (ctx, {
    baseImgSrc,
    design,
    destX,
    destY,
    drawW,
    drawH,
    isTextil,
    color,
    viewLabel,
    formatLabel
  }) => {
    const baseImg = await loadImage(baseImgSrc)
    if (!baseImg) return

    // Sombra de caída fotográfica
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 36
    ctx.shadowOffsetY = 20

    const aspect = baseImg.width / baseImg.height
    let w = drawW * 0.86
    let h = w / aspect
    if (h > drawH * 0.90) {
      h = drawH * 0.90
      w = h * aspect
    }
    const x = destX + (drawW - w) / 2
    const y = destY + (drawH - h) / 2

    ctx.drawImage(baseImg, x, y, w, h)
    ctx.restore()

    // Tinte textil dinámico
    if (isTextil && color && color.toLowerCase() !== '#ffffff') {
      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'
      ctx.globalAlpha = 0.55
      ctx.fillStyle = color
      ctx.fillRect(x, y, w, h)
      ctx.restore()
    }

    // Estampa si la cara tiene estampado habilitado
    if (design?.enabled) {
      const fmt = DTF_FORMATS.find(f => f.key === design.activeFormatKey) || DTF_FORMATS[2]
      const preset = BRAVO_PRESETS.find(p => p.id === design.selectedPresetId) || BRAVO_PRESETS[0]
      
      let stampSrc = design.uploadedArtworkUrl
      if (!stampSrc && preset) {
        stampSrc = preset.imageUrl || preset.dataUrl || null
        if (!stampSrc && preset.svgContent) {
          stampSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preset.svgContent.trim())}`
        }
      }

      if (stampSrc) {
        const stampImg = await loadImage(stampSrc)
        if (stampImg) {
          const natW = stampImg.naturalWidth || stampImg.width || 400
          const natH = stampImg.naturalHeight || stampImg.height || 400
          const stampBaseW = (drawW * 0.26) * fmt.scaleFactor * design.scaleMultiplier
          const stampBaseH = stampBaseW * (natH / natW)

          const posX = destX + (design.offsetX / 100) * drawW
          const posY = destY + (design.offsetY / 100) * drawH

          ctx.save()
          ctx.translate(posX, posY)
          ctx.rotate((design.rotationAngle * Math.PI) / 180)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.40)'
          ctx.shadowBlur = 12
          ctx.shadowOffsetY = 6
          ctx.drawImage(stampImg, -stampBaseW / 2, -stampBaseH / 2, stampBaseW, stampBaseH)
          ctx.restore()
        }
      }
    }

    // Rótulos técnicos tipo imprenta sobre la pieza
    if (viewLabel) {
      ctx.save()
      ctx.font = 'bold 22px monospace'
      ctx.fillStyle = '#ffac2e'
      ctx.fillText(viewLabel.toUpperCase(), destX + 48, destY + 56)

      ctx.font = '14px monospace'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
      ctx.fillText(formatLabel || '', destX + 48, destY + 82)
      ctx.restore()
    }
  }

  // ─── Renderizado Offscreen Canvas Dual: Frente y Reverso ────────────────────
  const generateDualViewSnapshot = useCallback(async () => {
    const canvas = offscreenCanvasRef.current
    if (!canvas) return null
    const currentRenderId = ++renderIdRef.current

    if (hasBackView) {
      // ─── LÁMINA TÉCNICA DUAL (2048 × 1080) ───
      canvas.width = 2048
      canvas.height = 1080
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#07090e'
      ctx.fillRect(0, 0, 2048, 1080)

      // 1. Frente en el cuadrante izquierdo
      await drawViewOnContext(ctx, {
        baseImgSrc: def.frontImage || '/mockups/polera_front.png',
        design: designs.front,
        destX: 0,
        destY: 20,
        drawW: 1024,
        drawH: 980,
        isTextil: def.isPhotorealisticMultiLayer,
        color: currentColor,
        viewLabel: '01 / Vista Frontal (Pecho)',
        formatLabel: designs.front.enabled
          ? `Técnica: DTF ${designs.front.activeFormatKey} · X:${Math.round(designs.front.offsetX)}% Y:${Math.round(designs.front.offsetY)}%`
          : 'Liso / Sin estampa en el frente'
      })

      // Línea divisoria central
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(1024, 40)
      ctx.lineTo(1024, 1000)
      ctx.stroke()
      ctx.restore()

      // 2. Reverso en el cuadrante derecho
      await drawViewOnContext(ctx, {
        baseImgSrc: def.backImage || def.frontImage,
        design: designs.back,
        destX: 1024,
        destY: 20,
        drawW: 1024,
        drawH: 980,
        isTextil: def.isPhotorealisticMultiLayer,
        color: currentColor,
        viewLabel: '02 / Vista Posterior (Espalda)',
        formatLabel: designs.back.enabled
          ? `Técnica: DTF ${designs.back.activeFormatKey} · X:${Math.round(designs.back.offsetX)}% Y:${Math.round(designs.back.offsetY)}%`
          : 'Liso / Sin estampa en la espalda'
      })

      // Franja inferior editorial de taller
      ctx.save()
      ctx.fillStyle = '#0c0f17'
      ctx.fillRect(0, 1020, 2048, 60)
      ctx.font = 'bold 15px monospace'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`PERSONALIZACIONES BRAVO · FICHA TÉCNICA DE PRODUCCIÓN · SOPORTE: ${def.label.toUpperCase()}`, 40, 1055)
      ctx.font = '13px monospace'
      ctx.fillStyle = '#ffac2e'
      ctx.fillText(`COLOR: ${currentColor} | TALLER QUILLOTA`, 1600, 1055)
      ctx.restore()

      if (renderIdRef.current !== currentRenderId) return null
      const combinedSnapshotUrl = canvas.toDataURL('image/png')

      // Generar snapshot individual frontal (1024×1024)
      canvas.width = 1024
      canvas.height = 1024
      ctx.fillStyle = '#07090e'
      ctx.fillRect(0, 0, 1024, 1024)
      await drawViewOnContext(ctx, {
        baseImgSrc: def.frontImage || '/mockups/polera_front.png',
        design: designs.front,
        destX: 0,
        destY: 0,
        drawW: 1024,
        drawH: 1024,
        isTextil: def.isPhotorealisticMultiLayer,
        color: currentColor
      })
      const frontSnapshotUrl = canvas.toDataURL('image/png')

      // Generar snapshot individual posterior (1024×1024)
      ctx.fillStyle = '#07090e'
      ctx.fillRect(0, 0, 1024, 1024)
      await drawViewOnContext(ctx, {
        baseImgSrc: def.backImage || def.frontImage,
        design: designs.back,
        destX: 0,
        destY: 0,
        drawW: 1024,
        drawH: 1024,
        isTextil: def.isPhotorealisticMultiLayer,
        color: currentColor
      })
      const backSnapshotUrl = canvas.toDataURL('image/png')

      return {
        combinedSnapshotUrl,
        frontSnapshotUrl,
        backSnapshotUrl
      }
    } else {
      // ─── PRODUCTO DE CARA ÚNICA (1024 × 1024) ───
      canvas.width = 1024
      canvas.height = 1024
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#07090e'
      ctx.fillRect(0, 0, 1024, 1024)
      await drawViewOnContext(ctx, {
        baseImgSrc: currentProductImg,
        design: designs.front,
        destX: 0,
        destY: 0,
        drawW: 1024,
        drawH: 1024,
        isTextil: def.isPhotorealisticMultiLayer,
        color: currentColor
      })
      if (renderIdRef.current !== currentRenderId) return null
      const singleUrl = canvas.toDataURL('image/png')
      return {
        combinedSnapshotUrl: singleUrl,
        frontSnapshotUrl: singleUrl,
        backSnapshotUrl: null
      }
    }
  }, [hasBackView, def, currentColor, designs, currentProductImg])

  // Exponer captura async al padre (BravoPublicPage / cotizador)
  useEffect(() => {
    if (onCaptureReady) {
      onCaptureReady(async () => {
        const snap = await generateDualViewSnapshot()
        if (!snap) return null
        const frontPreset = BRAVO_PRESETS.find(p => p.id === designs.front.selectedPresetId) || BRAVO_PRESETS[0]
        const backPreset = BRAVO_PRESETS.find(p => p.id === designs.back.selectedPresetId) || BRAVO_PRESETS[0]
        return {
          productType: internalProductType,
          resolvedType,
          label: def.label,
          currentColor,
          hasBackView,
          frontDesign: {
            ...designs.front,
            format: designs.front.activeFormatKey,
            artworkName: designs.front.uploadedArtworkUrl ? 'Diseño de Cliente' : frontPreset.name
          },
          backDesign: {
            ...designs.back,
            format: designs.back.activeFormatKey,
            artworkName: designs.back.uploadedArtworkUrl ? 'Diseño de Cliente' : backPreset.name
          },
          snapshotUrl: snap.combinedSnapshotUrl,
          frontSnapshotUrl: snap.frontSnapshotUrl,
          backSnapshotUrl: snap.backSnapshotUrl
        }
      })
    }
  }, [onCaptureReady, generateDualViewSnapshot, internalProductType, resolvedType, def, currentColor, hasBackView, designs])

  // Desencadenar agendamiento con mockup capturado (Frente + Reverso)
  const [isCapturing, setIsCapturing] = useState(false)
  const handleProceedToProject = async () => {
    if (isCapturing) return
    setIsCapturing(true)
    try {
      const snapResult = await generateDualViewSnapshot()
      if (onProceedToQuote && snapResult) {
        const frontPreset = BRAVO_PRESETS.find(p => p.id === designs.front.selectedPresetId) || BRAVO_PRESETS[0]
        const backPreset = BRAVO_PRESETS.find(p => p.id === designs.back.selectedPresetId) || BRAVO_PRESETS[0]
        onProceedToQuote({
          productType: internalProductType,
          resolvedType,
          label: def.label,
          currentColor,
          hasBackView,
          frontDesign: {
            ...designs.front,
            format: designs.front.activeFormatKey,
            artworkName: designs.front.uploadedArtworkUrl ? 'Diseño de Cliente' : frontPreset.name
          },
          backDesign: {
            ...designs.back,
            format: designs.back.activeFormatKey,
            artworkName: designs.back.uploadedArtworkUrl ? 'Diseño de Cliente' : backPreset.name
          },
          snapshotUrl: snapResult.combinedSnapshotUrl,
          frontSnapshotUrl: snapResult.frontSnapshotUrl,
          backSnapshotUrl: snapResult.backSnapshotUrl
        })
      }
    } catch (err) {
      console.error('Error al generar snapshot dual de mockup:', err)
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="w-full flex flex-col bg-[#07090e] rounded-none overflow-hidden border border-white/10 shadow-2xl relative select-none">
      {/* Canvas oculto para snapshots 1024×1024 */}
      <canvas ref={offscreenCanvasRef} className="hidden" />

      {/* ─── SELECTOR HORIZONTAL DE SOPORTE FÍSICO (PÍLDORAS 75px) ─── */}
      <div className="px-4 py-2.5 bg-[#080b12] border-b border-white/10 flex items-center gap-2 overflow-x-auto bravo-scrollbar z-30">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-mono shrink-0 mr-1">
          Soporte:
        </span>
        {['Polera', 'Polerón', 'Cuello Redondo', 'Tazón', 'Stanley', 'Jockey', 'Totebag', 'Termo', 'Chopero'].map((prodKey) => {
          const isSelected = resolvedType.toLowerCase() === prodKey.toLowerCase()
          return (
            <button
              key={prodKey}
              type="button"
              onClick={() => handleSelectProduct(prodKey)}
              className={`px-3 py-1 rounded-[75px] text-[10px] uppercase tracking-wider font-mono transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-white text-black font-bold border border-white'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10 hover:border-white/30'
              }`}
            >
              {prodKey}
            </button>
          )
        })}
      </div>

      {/* ─── BARRA SUPERIOR DE ESTUDIO (HUD TOOLBAR) ─────────────────────────── */}
      <div className="px-3.5 py-2.5 bg-[#0b0f17] border-b border-white/10 flex items-center justify-between gap-3 flex-wrap z-30">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white uppercase tracking-wider font-mono">
              {def.label}
            </span>
            <span className="text-[9px] text-white/40 font-mono">
              {def.weight_gsm ? `${def.weight_gsm}g/m² • Calidad Taller` : 'Personalización Digital DTF'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Selector de Cara: Frente / Espalda */}
          {hasBackView && (
            <div className="flex bg-black/60 border border-white/10 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setCurrentView('front')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'front' ? 'bg-amber-400 text-black shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <span>Frente</span>
                {designs.front.enabled && (
                  <span className={`w-1.5 h-1.5 rounded-full ${currentView === 'front' ? 'bg-black' : 'bg-amber-400'}`} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('back')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'back' ? 'bg-amber-400 text-black shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <span>{def.backLabel || 'Espalda'}</span>
                {designs.back.enabled && (
                  <span className={`w-1.5 h-1.5 rounded-full ${currentView === 'back' ? 'bg-black' : 'bg-amber-400'}`} />
                )}
              </button>
            </div>
          )}

          {/* Guías de impresión */}
          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className={`p-1.5 rounded-lg border transition-all ${
              showGuidelines
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/5 text-white/50 hover:text-white'
            }`}
            title={showGuidelines ? 'Ocultar guías de seguridad' : 'Mostrar guías de seguridad'}
          >
            {showGuidelines ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          {/* Centrar estampa */}
          <button
            type="button"
            onClick={() => setQuickPosition(50, def.category === 'textil' ? 38 : 48)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-amber-400 transition-all active:scale-95"
            title="Centrar diseño"
          >
            <RefreshCw size={13} />
          </button>

          {/* Rotar 90° */}
          <button
            type="button"
            onClick={() => setRotationAngle((prev) => (prev + 90) % 360)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-amber-400 transition-all active:scale-95"
            title="Rotar 90°"
          >
            <RotateCw size={13} />
          </button>

          {/* Botón directo para agendar con mockup */}
          <button
            type="button"
            onClick={handleProceedToProject}
            disabled={isCapturing}
            className="ml-2 px-3 py-1 rounded-[75px] bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-amber-400/20 cursor-pointer disabled:opacity-50"
            title="Agendar proyecto con este mockup 3D"
          >
            <span>{isCapturing ? 'Capturando...' : 'Agendar Proyecto'}</span>
            <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {/* ─── ESCENARIO TEXTIL INTERACTIVO (CANVAS VIEWPORT FOTORREALISTA) ────── */}
      <div
        ref={stageContainerRef}
        className="w-full relative aspect-[1/1.04] sm:aspect-[1/1.02] flex items-center justify-center overflow-hidden cursor-crosshair"
        style={{
          background: `
            radial-gradient(ellipse 65% 55% at 50% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 50% 45%, rgba(245, 158, 11, 0.04) 0%, transparent 60%),
            radial-gradient(circle at center, #0e121a 0%, #05070a 100%)
          `
        }}
      >
        {/* Grilla milimétrica sutil de taller textil */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />

        {/* ─── MODELO FOTOGRÁFICO MULTICAPA V5 (GHOST MANNEQUIN STUDIO) ──────── */}
        <div className="photorealistic-garment-stage w-[92%] h-[92%] max-w-[500px]">
          {/* Capa 0: Sombra ambiental en el suelo del estudio */}
          <div className="garment-floor-shadow" />

          {/* Si es prenda textil: pipeline de 4 capas fotorrealistas con máscara alfa */}
          {def.isPhotorealisticMultiLayer ? (
            <>
              {/* Capa 1: Color Textil Dinámico con Máscara Alfa */}
              <div
                className="garment-color-base"
                style={{
                  backgroundColor: currentColor,
                  WebkitMaskImage: `url('${currentProductImg}')`,
                  maskImage: `url('${currentProductImg}')`
                }}
              />

              {/* Capa 2: Sombras y arrugas reales de algodón (Multiply) */}
              <img
                src={currentProductImg}
                alt="Mockup real texture"
                draggable={false}
                className="garment-photo-layer garment-multiply"
              />

              {/* Capa 3: Iluminación de estudio y brillos softbox (Screen) */}
              <img
                src={currentProductImg}
                alt="Mockup highlights"
                draggable={false}
                className="garment-photo-layer garment-screen"
              />
            </>
          ) : (
            /* Para otros productos (tazones, botellas, termos, jockey): foto HD limpia y nítida */
            <img
              src={currentProductImg}
              alt="Mockup del producto"
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          )}

          {/* Guía de marco imprimible seguro (Safe Zone) */}
          {showGuidelines && def.printZone && (
            <div
              className="safe-print-boundary"
              style={{
                left: `${(def.printZone.x - def.printZone.w / 2) * 100}%`,
                top: `${(def.printZone.y - def.printZone.h / 2) * 100}%`,
                width: `${def.printZone.w * 100}%`,
                height: `${def.printZone.h * 100}%`
              }}
            />
          )}

          {/* ─── ESTAMPA INTERACTIVA O ESTADO LISO ────────────────────────────── */}
          {activeDesign.enabled ? (
            <div
              className={`dtf-print-draggable ${isDraggingGizmo ? 'is-dragging' : ''} active-print`}
              onPointerDown={handlePointerDown}
              style={{
                left: `${offsetX}%`,
                top: `${offsetY}%`,
                width: `${(def.printZone?.w || 0.45) * 100 * activeFormat.scaleFactor * scaleMultiplier}%`,
                transform: `translate(-50%, -50%) rotate(${rotationAngle}deg)`
              }}
            >
              {/* Badge flotante informativo del gizmo */}
              <div className="print-gizmo-badge">
                <span className="text-amber-400 font-bold">{activeFormat.key}</span>
                <span>•</span>
                <span>{activeFormat.cm}</span>
                <span>•</span>
                <span className="text-white/60">X:{Math.round(offsetX)}% Y:{Math.round(offsetY)}%</span>
              </div>

              {/* Manillas de control de esquina del gizmo */}
              <span className="gizmo-handle handle-tl" />
              <span className="gizmo-handle handle-tr" />
              <span className="gizmo-handle handle-bl" />
              <span className="gizmo-handle handle-br" />

              {/* Contenido visual de la estampa: Imagen subida o SVG preset */}
              {uploadedArtworkUrl ? (
                <img
                  src={uploadedArtworkUrl}
                  alt="Diseño personalizado"
                  draggable={false}
                  className="w-full h-auto object-contain max-h-[280px]"
                />
              ) : activePreset?.imageUrl ? (
                <img
                  src={activePreset.imageUrl}
                  alt={activePreset.name}
                  draggable={false}
                  className="w-full h-auto object-contain max-h-[280px]"
                />
              ) : activePreset?.dataUrl ? (
                <img
                  src={activePreset.dataUrl}
                  alt={activePreset.name}
                  draggable={false}
                  className="w-full h-auto object-contain max-h-[280px]"
                />
              ) : (
                <div
                  className="w-full flex items-center justify-center pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: activePreset?.svgContent || '' }}
                />
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
              <div className="bg-black/85 backdrop-blur-md border border-white/15 p-5 rounded-2xl text-center space-y-2.5 max-w-xs shadow-2xl">
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block tracking-wider">
                  Cara {currentView === 'back' ? 'Posterior (Espalda)' : 'Frontal (Pecho)'} Lisa
                </span>
                <p className="text-[11px] text-white/60 font-mono">
                  Esta cara se estampará lisa sin diseño, a menos que decidas personalizarla.
                </p>
                <button
                  type="button"
                  onClick={() => updateActiveDesign({ enabled: true })}
                  className="px-4 py-2 rounded-[75px] bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-mono font-bold uppercase tracking-wider transition-all shadow cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles size={11} />
                  <span>Añadir Estampado en {currentView === 'back' ? 'Espalda' : 'Frente'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── BADGE INFORMATIVO INFERIOR DEL LIENZO ─────────────────────────── */}
        <div className="absolute bottom-2.5 left-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center justify-between text-[10px] font-mono text-white/70 z-20 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{def.label}</span>
            <span>•</span>
            <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: currentColor }} />
            <span>{def.colors?.[selectedColorIdx]?.name || 'Personalizado'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">
              {activeDesign.enabled ? `DTF ${activeFormat.key} (${activeFormat.cm})` : 'Liso (Sin Estampa)'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── PANEL INFERIOR DE CALIBRACIÓN Y PERSONALIZACIÓN ───────────────── */}
      <div className="p-4 bg-[#0a0d14] border-t border-white/10 flex flex-col gap-4 z-20">
        {/* Barra de control de cara activa */}
        <div className="flex items-center justify-between bg-black/50 border border-white/10 px-3.5 py-2 rounded-xl flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${activeDesign.enabled ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-xs font-mono text-white">
              Editando: <strong className="text-amber-300 uppercase">{currentView === 'front' ? 'Frente (Pecho)' : 'Espalda (Dorso)'}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateActiveDesign({ enabled: !activeDesign.enabled })}
            className={`px-3 py-1 rounded-[75px] text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
              activeDesign.enabled
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-white/10 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {activeDesign.enabled ? '✓ Estampado Activo' : 'Cara Lisa (Sin Estampa)'}
          </button>
        </div>

        {/* Navegación por pestañas de control */}
        <div className="flex border-b border-white/10 pb-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'presets'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={13} />
            Diseños Oficiales
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <UploadCloud size={13} />
            Subir Logo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adjust')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'adjust'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders size={13} />
            Calibrar & Talla
          </button>
        </div>

        {/* ─── PESTAÑA 1: DISEÑOS OFICIALES PRESET ───────────────────────────── */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Elige un diseño vectorial DTF
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {uploadedArtworkUrl ? 'Diseño de Cliente Activo' : activePreset.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {BRAVO_PRESETS.map((preset) => {
                const isSelected = !uploadedArtworkUrl && selectedPresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id)
                      setUploadedArtworkUrl(null)
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all group cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                        : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-black/50 overflow-hidden p-1 border border-white/5 group-hover:border-white/20">
                      {preset.imageUrl ? (
                        <img src={preset.imageUrl} alt={preset.name} className="w-full h-full object-contain" />
                      ) : preset.dataUrl ? (
                        <img src={preset.dataUrl} alt={preset.name} className="w-full h-full object-contain" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center pointer-events-none"
                          dangerouslySetInnerHTML={{ __html: preset.svgContent }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-white/80 group-hover:text-amber-300 text-center leading-tight truncate w-full">
                      {preset.name}
                    </span>
                    <span className="text-[8px] font-mono text-white/40 uppercase">
                      {preset.suggestedSize || 'A4'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── PESTAÑA 2: SUBIR LOGO PROPIO DEL CLIENTE ──────────────────────── */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-500/30 rounded-2xl hover:border-amber-500/60 hover:bg-amber-500/5 transition-all cursor-pointer bg-black/30">
              <UploadCloud size={28} className="text-amber-400 mb-2" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Haz clic o arrastra tu archivo aquí
              </span>
              <span className="text-[10px] text-white/40 font-mono mt-1">
                PNG con fondo transparente a 300 DPI, SVG o WebP
              </span>
              <input
                type="file"
                accept="image/png, image/svg+xml, image/webp, image/jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadedArtworkUrl && (
              <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <img src={uploadedArtworkUrl} alt="Preview" className="w-8 h-8 object-contain bg-black/40 rounded-lg p-0.5" />
                  <span className="text-[10px] font-bold text-white font-mono">Archivo subido correctamente</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedArtworkUrl(null)
                    setSelectedPresetId('art-cyber-kanji')
                  }}
                  className="text-rose-400 hover:text-rose-300 p-1 text-xs font-bold uppercase"
                >
                  Restablecer
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── PESTAÑA 3: CALIBRAR Y SELECCIONAR TAMAÑO DTF ──────────────────── */}
        {activeTab === 'adjust' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Formatos DTF */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                Formato de Impresión DTF
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {DTF_FORMATS.map((fmt) => (
                  <button
                    key={fmt.key}
                    type="button"
                    onClick={() => setActiveFormatKey(fmt.key)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      activeFormatKey === fmt.key
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-amber-400 font-mono">{fmt.key}</span>
                      <span className="text-[9px] text-white/50">{fmt.cm}</span>
                    </div>
                    <span className="text-[9px] text-white/40 block mt-0.5">{fmt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders milimétricos */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                Calibración Milimétrica
              </span>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/50">
                  <span>Posición Horizontal (X)</span>
                  <span className="text-amber-400 font-bold">{Math.round(offsetX)}%</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="84"
                  step="0.5"
                  value={offsetX}
                  onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/50">
                  <span>Posición Vertical (Y)</span>
                  <span className="text-amber-400 font-bold">{Math.round(offsetY)}%</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="84"
                  step="0.5"
                  value={offsetY}
                  onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/50">
                  <span>Escala</span>
                  <span className="text-amber-400 font-bold">{Math.round(scaleMultiplier * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={scaleMultiplier}
                  onChange={(e) => setScaleMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── PALETA DE COLOR DE LA PRENDA / PRODUCTO ───────────────────────── */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
              Color:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {def.colors?.map((c, idx) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    setSelectedColorIdx(idx)
                    setCustomColorHex(null)
                  }}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    !customColorHex && selectedColorIdx === idx
                      ? 'border-amber-400 scale-125 shadow-md shadow-amber-400/40'
                      : 'border-white/20 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}

              {/* Selector de color libre */}
              <label
                className="w-5 h-5 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center cursor-pointer hover:border-amber-400"
                title="Color personalizado"
              >
                <span className="text-[9px] text-white/60">+</span>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setCustomColorHex(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Atajos de posición rápida */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuickPosition(50, 38)}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono text-white/60 hover:text-amber-400 transition-colors"
            >
              Pecho
            </button>
            <button
              type="button"
              onClick={() => setQuickPosition(36, 31)}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono text-white/60 hover:text-amber-400 transition-colors"
            >
              Bolsillo
            </button>
            {hasBackView && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('back')
                  setQuickPosition(50, 42)
                }}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono text-white/60 hover:text-amber-400 transition-colors"
              >
                Espalda
              </button>
            )}
          </div>

          {/* Botón principal de acción: Agendar con este diseño */}
          <button
            type="button"
            onClick={handleProceedToProject}
            disabled={isCapturing}
            className="rounded-[75px] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black px-4 sm:px-6 py-2 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-400/20 cursor-pointer ml-auto disabled:opacity-50"
          >
            <Sparkles size={13} className="text-black" />
            <span>{isCapturing ? 'Generando Mockup...' : 'Agendar con este Diseño'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
