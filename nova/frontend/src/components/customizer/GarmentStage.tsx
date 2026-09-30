import React, { useRef, useEffect, useCallback } from 'react'
import {
  GARMENT_ASSET_MAP,
  GarmentType,
  GarmentView,
  GarmentAssetKey,
} from '../../shared/garment-templates'

interface GarmentStageProps {
  type: GarmentType
  view: GarmentView
  colorHex: string
  /** Elementos hijos = zona de estampas interactivas proyectadas sobre la prenda */
  children?: React.ReactNode
  /** Clase CSS adicional para el contenedor raíz (útil para tamaños responsive) */
  className?: string
  /** Callback que recibe el offset X,Y relativo al contenedor al hacer click */
  onStageClick?: (relX: number, relY: number) => void
}

/**
 * GarmentStage — Pipeline fotográfico multicapa de 4 capas (Ghost Mannequin Studio).
 *
 * Técnica: CSS mask-image con canal alfa de los PNG de prenda.
 * El PNG actúa como silueta de recorte para la capa de color textil. Las dos
 * copias de la imagen encima usan mix-blend-mode:multiply (arrugas/costuras) y
 * mix-blend-mode:screen (brillos de softbox) para obtener realismo fotográfico
 * sin necesidad de iluminación en Three.js ni assets HDR.
 *
 * Por qué 4 capas y no una sola imagen recoloreada:
 * Recolorear vía hue-rotate no preserva los matices de sombra de las costuras.
 * La máscara alfa + capa base de color + multiply + screen reproduce fielmente
 * el comportamiento de la luz sobre la tela para cualquier color hex arbitrario.
 */
export const GarmentStage: React.FC<GarmentStageProps> = ({
  type,
  view,
  colorHex,
  children,
  className = '',
  onStageClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const assetKey: GarmentAssetKey = `${type}_${view}`
  const imgSrc = GARMENT_ASSET_MAP[assetKey] ?? GARMENT_ASSET_MAP['tshirt_front']

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onStageClick || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      const relY = (e.clientY - rect.top) / rect.height
      onStageClick(relX, relY)
    },
    [onStageClick]
  )

  // Pre-carga del siguiente lado (front→back / back→front) para transiciones fluidas
  useEffect(() => {
    const oppositeView: GarmentView = view === 'front' ? 'back' : 'front'
    const oppositeKey: GarmentAssetKey = `${type}_${oppositeView}`
    const preloadImg = new Image()
    preloadImg.src = GARMENT_ASSET_MAP[oppositeKey]
  }, [type, view])

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-[540px] aspect-[1/1.08] flex items-center justify-center select-none overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800/60 shadow-2xl cursor-crosshair ${className}`}
      onClick={handleClick}
      aria-label={`Vista ${view} de ${type}`}
    >
      {/* ── Capa 0: Sombra ambiental de suelo de estudio ── */}
      <div
        className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[65%] h-7 rounded-full pointer-events-none blur-xl z-[1]"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.9) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* ── Capa 1: Tinte de color textil con máscara alfa del PNG ── */}
      <div
        className="absolute inset-0 w-full h-full z-[2] transition-colors duration-300 ease-out"
        style={{
          backgroundColor: colorHex,
          WebkitMaskImage: `url('${imgSrc}')`,
          maskImage: `url('${imgSrc}')`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
        aria-hidden="true"
      />

      {/* ── Capa 2: Arrugas, costuras y textura de tela (Multiply) ── */}
      <img
        src={imgSrc}
        alt=""
        draggable={false}
        loading="eager"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[3]"
        style={{ mixBlendMode: 'multiply', filter: 'contrast(1.16) brightness(0.96)' }}
        aria-hidden="true"
      />

      {/* ── Capa 3: Brillos y softbox de estudio (Screen) ── */}
      <img
        src={imgSrc}
        alt=""
        draggable={false}
        loading="eager"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[4]"
        style={{ mixBlendMode: 'screen', filter: 'grayscale(1) contrast(1.4) brightness(0.24)' }}
        aria-hidden="true"
      />

      {/* ── Capa 4: Zona de estampas interactivas DTF ── */}
      <div
        className="absolute inset-0 z-[10] pointer-events-auto"
        role="region"
        aria-label="Zona de personalización"
      >
        {children}
      </div>
    </div>
  )
}

export default GarmentStage
