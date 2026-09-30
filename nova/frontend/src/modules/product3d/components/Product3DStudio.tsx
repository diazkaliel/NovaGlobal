import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload,
  Type,
  Trash2,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from 'lucide-react'
import {
  DecalConfig,
  DecalTransform,
  Product3DModel,
  CameraViewPresetKey,
} from '../types/product3d.types'
import { useTexturePipeline } from '../hooks/useTexturePipeline'
import { useProduct3DStage } from '../hooks/useProduct3DStage'
import { Product3DCanvas } from './Product3DCanvas'
import { Product3DQuotation } from './Product3DQuotation'
import { exportTechnicalSheetPdf } from '../services/pdfExportService'

export interface Product3DStudioProps {
  product?: Product3DModel
  initialArtworkUrl?: string | null
  basePrice?: number
  onSaveSession?: (sessionData: any) => void
  clientName?: string
  orderNumber?: string
}

// Producto por defecto si no se inyecta uno específico
const DEFAULT_PRODUCT: Product3DModel = {
  id: 1,
  name: 'Polera Premium Algodón',
  sku: 'POL-AL-01',
  proceduralType: 't_shirt',
  baseColorHex: '#ffffff',
  availableColors: [
    { name: 'Blanco Puro', hex: '#ffffff' },
    { name: 'Negro Profundo', hex: '#18181b' },
    { name: 'Azul Marino', hex: '#1e293b' },
    { name: 'Rojo Carmesí', hex: '#991b1b' },
    { name: 'Verde Militar', hex: '#2e3b2e' },
  ],
  printZones: [
    {
      id: 'front',
      name: 'Pecho / Frente',
      maxWidthCm: 32,
      maxHeightCm: 40,
      allowedTechniques: ['dtf', 'sublimacion', 'vinilo'],
    },
  ],
  cameraPresets: {},
}

const DEFAULT_TRANSFORM: DecalTransform = {
  x: 0.5,
  y: 0.42,
  scale: 0.55,
  rotationDeg: 0,
}

/**
 * Product3DStudio — Orquestador maestro del Simulador y Personalizador 3D.
 *
 * Integra el motor gráfico Three.js PBR, el pipeline Canvg 2K offscreen,
 * el manipulador Gizmo y la cotización reactiva con exportación a PDF técnico.
 */
export const Product3DStudio: React.FC<Product3DStudioProps> = ({
  product = DEFAULT_PRODUCT,
  initialArtworkUrl = null,
  basePrice = 8990,
  onSaveSession,
  clientName,
  orderNumber,
}) => {
  const [selectedColor, setSelectedColor] = useState(product.baseColorHex)
  const [selectedTechnique, setSelectedTechnique] = useState('dtf')
  const [quantity, setQuantity] = useState(1)

  // Lista reactiva de estampas / decals aplicados
  const [decals, setDecals] = useState<DecalConfig[]>([])
  const [activeDecalIndex, setActiveDecalIndex] = useState<number>(0)

  // Herramienta de texto
  const [customText, setCustomText] = useState('')
  const [textFont, setTextFont] = useState('Outfit')
  const [textColor, setTextColor] = useState('#ffffff')

  // ─── 1. Pipeline de Textura Canvg 2K ───────────────────────────────────────
  const { canvasTextureRef, renderDecals } = useTexturePipeline({
    resolution: 2048,
  })

  // ─── 2. Escenario Three.js PBR ─────────────────────────────────────────────
  const {
    containerRef,
    activeView,
    setCameraView,
    isLoadingModel,
    modelError,
    takeSnapshot,
  } = useProduct3DStage({
    product,
    baseColorHex: selectedColor,
    canvasTexture: canvasTextureRef.current,
  })

  // ─── 3. Sincronización Inicial de Artwork ──────────────────────────────────
  useEffect(() => {
    if (initialArtworkUrl) {
      const isSvg = initialArtworkUrl.toLowerCase().endsWith('.svg')
      const initialDecal: DecalConfig = {
        id: 'initial-decal',
        zoneId: 'front',
        artworkUrl: initialArtworkUrl,
        artworkType: isSvg ? 'svg' : 'raster',
        transform: { ...DEFAULT_TRANSFORM },
      }
      setDecals([initialDecal])
      setActiveDecalIndex(0)
    }
  }, [initialArtworkUrl])

  // Actualizar canvas en cuanto cambien las estampas
  useEffect(() => {
    renderDecals(decals)
  }, [decals, renderDecals])

  // ─── 4. Manejo de Subida de Archivos ───────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isSvg = file.type.includes('svg') || file.name.endsWith('.svg')
    const objectUrl = URL.createObjectURL(file)

    const newDecal: DecalConfig = {
      id: `decal-${Date.now()}`,
      zoneId: 'front',
      artworkUrl: objectUrl,
      artworkType: isSvg ? 'svg' : 'raster',
      transform: { ...DEFAULT_TRANSFORM },
    }

    setDecals([newDecal])
    setActiveDecalIndex(0)
  }

  // ─── 5. Agregar Texto Personalizado ─────────────────────────────────────────
  const handleAddText = () => {
    if (!customText.trim()) return

    const newDecal: DecalConfig = {
      id: `text-${Date.now()}`,
      zoneId: 'front',
      artworkType: 'text',
      textContent: customText.trim(),
      textFont,
      textColor,
      transform: { ...DEFAULT_TRANSFORM, scale: 0.6 },
    }

    setDecals((prev) => [...prev, newDecal])
    setActiveDecalIndex(decals.length)
    setCustomText('')
  }

  // ─── 6. Transformación del Decal Activo ──────────────────────────────────────
  const activeDecal = decals[activeDecalIndex] || null

  const handleTransformChange = useCallback(
    (newTransform: DecalTransform) => {
      setDecals((prev) => {
        if (!prev[activeDecalIndex]) return prev
        const updated = [...prev]
        updated[activeDecalIndex] = {
          ...updated[activeDecalIndex],
          transform: newTransform,
        }
        return updated
      })
    },
    [activeDecalIndex]
  )

  const handleResetTransform = useCallback(() => {
    handleTransformChange({ ...DEFAULT_TRANSFORM })
  }, [handleTransformChange])

  // ─── 7. Exportación de Ficha Técnica PDF ────────────────────────────────────
  const handleExportPdf = async () => {
    const snapshot = takeSnapshot()
    if (!snapshot) return

    const activeZone = product.printZones[0] || {
      id: 'front',
      name: 'Frente',
      maxWidthCm: 30,
      maxHeightCm: 40,
      allowedTechniques: ['dtf'],
    }

    // Cálculo del área para la ficha
    let totalArea = 0
    decals.forEach((d) => {
      totalArea += activeZone.maxWidthCm * d.transform.scale * (activeZone.maxHeightCm * d.transform.scale)
    })

    const techRates: Record<string, number> = { dtf: 15, sublimacion: 12, vinilo: 18, serigrafia: 8 }
    const customCost = Math.round(totalArea * (techRates[selectedTechnique] || 15))
    const unitPrice = basePrice + customCost

    await exportTechnicalSheetPdf({
      orderNumber,
      product,
      selectedColorHex: selectedColor,
      technique: selectedTechnique,
      quantity,
      decals,
      snapshotDataUrl: snapshot,
      clientName,
      pricing: {
        baseProductPrice: basePrice,
        customizationCost: customCost,
        totalPrintAreaCm2: Number(totalArea.toFixed(1)),
        volumeDiscountPct: quantity >= 50 ? 25 : quantity >= 25 ? 15 : quantity >= 10 ? 8 : 0,
        unitPrice,
        finalTotal: unitPrice * quantity,
      },
    })
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* ─── Cabecera del Estudio ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black text-white tracking-tight">{product.name}</h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            SKU: {product.sku} | Motor WebGL PBR con Proyección Textil 2K
          </p>
        </div>

        {/* Barra de Herramientas de Carga de Archivos */}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all">
            <Upload className="w-4 h-4 text-zinc-950" />
            <span>Subir Logo / Vector</span>
            <input
              type="file"
              accept=".svg,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {decals.length > 0 && (
            <button
              type="button"
              onClick={() => setDecals([])}
              className="p-3 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-2xl border border-zinc-700 transition-colors"
              title="Eliminar estampa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Contenedor Central: Visor 3D y Panel Lateral ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visor 3D WebGL (8 columnas) */}
        <div className="lg:col-span-8 min-h-[550px] h-[650px] relative">
          <Product3DCanvas
            containerRef={containerRef}
            product={product}
            selectedColorHex={selectedColor}
            onSelectColor={setSelectedColor}
            activeView={activeView}
            onSelectView={setCameraView}
            decalTransform={activeDecal ? activeDecal.transform : DEFAULT_TRANSFORM}
            onDecalTransformChange={handleTransformChange}
            isLoading={isLoadingModel}
            error={modelError}
            onTakeSnapshot={takeSnapshot ? handleExportPdf : undefined}
            onResetTransform={handleResetTransform}
          />
        </div>

        {/* Panel Lateral: Cotizador Reactivo & Herramientas (4 columnas) ───── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Product3DQuotation
            basePrice={basePrice}
            activeZone={product.printZones[0]}
            decals={decals}
            selectedTechnique={selectedTechnique}
            onSelectTechnique={setSelectedTechnique}
            quantity={quantity}
            onChangeQuantity={setQuantity}
            onExportPdf={handleExportPdf}
            onSaveOrder={onSaveSession ? () => onSaveSession({ product, selectedColor, decals, selectedTechnique, quantity }) : undefined}
          />

          {/* Herramienta Rápida de Texto Dinámico */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <Type className="w-4 h-4 text-amber-500" />
              <span>Añadir Texto Tipográfico</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: TU NOMBRE O MARCA"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddText}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs rounded-xl transition-colors"
              >
                Insertar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
