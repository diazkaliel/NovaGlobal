import React, { useRef, useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  CameraViewPresetKey,
  DecalTransform,
  Product3DModel,
} from '../types/product3d.types'
import { Product3DGizmo } from './Product3DGizmo'
import { Product3DHUD } from './Product3DHUD'

interface Product3DCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  product: Product3DModel
  selectedColorHex: string
  onSelectColor: (hex: string) => void
  activeView: CameraViewPresetKey
  onSelectView: (view: CameraViewPresetKey) => void
  decalTransform: DecalTransform
  onDecalTransformChange: (newTransform: DecalTransform) => void
  isLoading: boolean
  error: string | null
  onTakeSnapshot?: () => void
  onResetTransform: () => void
}

/**
 * Product3DCanvas — Contenedor DOM para el Canvas WebGL de Three.js.
 *
 * Integra el lienzo 3D, el HUD flotante de estudio y el manipulador Gizmo
 * garantizando sincronización dimensional y manejo de errores gráficos.
 */
export const Product3DCanvas: React.FC<Product3DCanvasProps> = ({
  containerRef,
  product,
  selectedColorHex,
  onSelectColor,
  activeView,
  onSelectView,
  decalTransform,
  onDecalTransformChange,
  isLoading,
  error,
  onTakeSnapshot,
  onResetTransform,
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [showGizmo, setShowGizmo] = useState(true)

  // Medición reactiva del tamaño del viewport para el Gizmo 2D
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateSize = () => {
      setDimensions({
        width: el.clientWidth,
        height: el.clientHeight,
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)

    return () => observer.disconnect()
  }, [containerRef])

  return (
    <div className="relative w-full h-full min-h-[480px] bg-gradient-to-b from-zinc-900 via-[#0d0d12] to-black rounded-3xl overflow-hidden border border-zinc-800/80 shadow-2xl flex items-center justify-center">
      {/* ─── Contenedor WebGL de Three.js ─────────────────────────────────── */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none" />

      {/* ─── HUD de Controles del Estudio ─────────────────────────────────── */}
      <Product3DHUD
        activeView={activeView}
        onSelectView={onSelectView}
        availableColors={product.availableColors}
        selectedColorHex={selectedColorHex}
        onSelectColor={onSelectColor}
        showGizmo={showGizmo}
        onToggleGizmo={() => setShowGizmo((prev) => !prev)}
        onResetTransform={onResetTransform}
        onTakeSnapshot={onTakeSnapshot}
      />

      {/* ─── Manipulador Gizmo (Visible en vistas de impresión) ──────────── */}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Product3DGizmo
          transform={decalTransform}
          onChange={onDecalTransformChange}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
          visible={showGizmo && (activeView === 'front' || activeView === 'back' || activeView === 'detail')}
        />
      )}

      {/* ─── Estado de Carga Asíncrona (Skeleton) ─────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 pointer-events-none transition-opacity duration-300">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
          <p className="text-zinc-300 text-sm font-medium tracking-wide">Cargando malla 3D de alta fidelidad...</p>
        </div>
      )}

      {/* ─── Error Boundary / WebGL Alert ─────────────────────────────────── */}
      {error && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs shadow-xl backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
