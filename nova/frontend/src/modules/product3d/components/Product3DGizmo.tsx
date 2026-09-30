import React, { useRef, useState, useCallback, useEffect } from 'react'
import { RotateCw, Maximize2, Move } from 'lucide-react'
import { DecalTransform } from '../types/product3d.types'

interface Product3DGizmoProps {
  transform: DecalTransform
  onChange: (newTransform: DecalTransform) => void
  containerWidth: number
  containerHeight: number
  visible?: boolean
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
}

type InteractionMode = 'none' | 'translate' | 'scale' | 'rotate'

/**
 * Product3DGizmo — Manipulador interactivo 2D sobrepuesto en el visor 3D.
 *
 * Provee controles táctiles y de puntero para desplazar, escalar y rotar la estampa
 * utilizando coordenadas normalizadas [0.0 - 1.0] relativas al área visible de impresión.
 */
export const Product3DGizmo: React.FC<Product3DGizmoProps> = ({
  transform,
  onChange,
  containerWidth,
  containerHeight,
  visible = true,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<InteractionMode>('none')
  const startDragRef = useRef<{
    pointerX: number
    pointerY: number
    initTransform: DecalTransform
    boxCenterX: number
    boxCenterY: number
  }>({
    pointerX: 0,
    pointerY: 0,
    initTransform: transform,
    boxCenterX: 0,
    boxCenterY: 0,
  })

  // Zona de impresión física central aproximada (50% del viewport)
  const zoneSize = Math.min(containerWidth, containerHeight) * 0.55
  const zoneLeft = (containerWidth - zoneSize) / 2
  const zoneTop = (containerHeight - zoneSize) / 2

  // Dimensiones del gizmo en píxeles absolutos de pantalla
  const decalSize = zoneSize * transform.scale
  const decalScreenX = zoneLeft + transform.x * zoneSize
  const decalScreenY = zoneTop + transform.y * zoneSize

  // ─── Manejo de Puntero Unificado (Mouse y Touch) ─────────────────────────
  const handlePointerDown = (e: React.PointerEvent, newMode: InteractionMode) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    setMode(newMode)
    startDragRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      initTransform: { ...transform },
      boxCenterX: decalScreenX,
      boxCenterY: decalScreenY,
    }

    if (onInteractionStart) onInteractionStart()
  }

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (mode === 'none') return
      e.stopPropagation()

      const { pointerX, pointerY, initTransform, boxCenterX, boxCenterY } = startDragRef.current
      const deltaX = e.clientX - pointerX
      const deltaY = e.clientY - pointerY

      if (mode === 'translate') {
        // Traslación normalizada respecto al tamaño de la zona
        const nextX = Math.max(0.05, Math.min(0.95, initTransform.x + deltaX / zoneSize))
        const nextY = Math.max(0.05, Math.min(0.95, initTransform.y + deltaY / zoneSize))

        onChange({
          ...initTransform,
          x: nextX,
          y: nextY,
        })
      } else if (mode === 'scale') {
        // Escala radial desde el centro de la estampa
        const initialDist = Math.hypot(pointerX - boxCenterX, pointerY - boxCenterY)
        const currentDist = Math.hypot(e.clientX - boxCenterX, e.clientY - boxCenterY)
        const factor = currentDist / (initialDist || 1)
        const nextScale = Math.max(0.1, Math.min(1.4, initTransform.scale * factor))

        onChange({
          ...initTransform,
          scale: Number(nextScale.toFixed(3)),
        })
      } else if (mode === 'rotate') {
        // Ángulo de rotación respecto al centro del decal
        const initialAngle = Math.atan2(pointerY - boxCenterY, pointerX - boxCenterX)
        const currentAngle = Math.atan2(e.clientY - boxCenterY, e.clientX - boxCenterX)
        const angleDiffDeg = ((currentAngle - initialAngle) * 180) / Math.PI

        let nextRot = (initTransform.rotationDeg + angleDiffDeg) % 360
        if (nextRot > 180) nextRot -= 360
        if (nextRot < -180) nextRot += 360

        // Snap magnético en múltiplos de 45° si está muy cerca
        if (Math.abs(nextRot % 45) < 3.5) {
          nextRot = Math.round(nextRot / 45) * 45
        }

        onChange({
          ...initTransform,
          rotationDeg: Math.round(nextRot),
        })
      }
    },
    [mode, zoneSize, transform, onChange]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (mode === 'none') return
      e.stopPropagation()
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        // Evita excepción si el puntero ya no estaba capturado
      }
      setMode('none')
      if (onInteractionEnd) onInteractionEnd()
    },
    [mode, onInteractionEnd]
  )

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ width: containerWidth, height: containerHeight }}
    >
      {/* Guía visual sutil de la zona máxima de impresión */}
      <div
        className="absolute border border-dashed border-amber-500/25 rounded-2xl pointer-events-none transition-opacity duration-300"
        style={{
          left: zoneLeft,
          top: zoneTop,
          width: zoneSize,
          height: zoneSize,
        }}
      >
        <span className="absolute -top-6 left-3 text-[11px] font-mono uppercase tracking-widest text-amber-500/50">
          Zona de Impresión
        </span>
      </div>

      {/* Caja manipuladora del Decal */}
      <div
        className="absolute pointer-events-auto cursor-move border-2 border-amber-400 bg-amber-500/10 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.2)] touch-none group"
        style={{
          left: decalScreenX - decalSize / 2,
          top: decalScreenY - decalSize / 2,
          width: decalSize,
          height: decalSize,
          transform: `rotate(${transform.rotationDeg}deg)`,
          transformOrigin: 'center center',
        }}
        onPointerDown={(e) => handlePointerDown(e, 'translate')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Cruz central de referencia */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-80 transition-opacity">
          <Move className="w-5 h-5 text-amber-300" />
        </div>

        {/* Asa de Rotación Superior */}
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 w-7 h-7 bg-zinc-900 border-2 border-amber-400 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 active:scale-95 transition-transform"
          onPointerDown={(e) => handlePointerDown(e, 'rotate')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Rotar diseño"
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
        </div>
        {/* Línea conectora al asa de rotación */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[2px] h-3 bg-amber-400" />

        {/* Asas de Escala en las esquinas */}
        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => {
          const posClass =
            pos === 'top-left'
              ? '-top-2.5 -left-2.5'
              : pos === 'top-right'
              ? '-top-2.5 -right-2.5'
              : pos === 'bottom-left'
              ? '-bottom-2.5 -left-2.5'
              : '-bottom-2.5 -right-2.5'

          return (
            <div
              key={pos}
              className={`absolute ${posClass} w-5 h-5 bg-amber-400 border-2 border-zinc-950 rounded-md cursor-nwse-resize hover:scale-125 active:scale-90 transition-transform shadow-md flex items-center justify-center`}
              onPointerDown={(e) => handlePointerDown(e, 'scale')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              title="Escalar tamaño"
            >
              <Maximize2 className="w-2.5 h-2.5 text-zinc-950 rotate-45" />
            </div>
          )
        })}

        {/* Badge flotante con métricas de transformación */}
        {mode !== 'none' && (
          <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-zinc-950/90 border border-amber-500/40 rounded-md text-[10px] font-mono text-amber-300 shadow-xl whitespace-nowrap">
            Escala: {Math.round(transform.scale * 100)}% | Rot: {transform.rotationDeg}°
          </div>
        )}
      </div>
    </div>
  )
}
