import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  useProduct3DStage,
  useTexturePipeline,
  Product3DCanvas,
} from '../../modules/product3d'
import { PRODUCT_DEFINITIONS, resolveProductType } from '../../utils/bravoMockupProducts'

interface Bravo3DWebGLStageProps {
  simulatorType?: string
  imageUrl?: string | null
  initialScale?: number
  initialPosX?: number
  initialPosY?: number
  customText?: string
  textColor?: string
  fontFamily?: string
  selectedColorIndex?: number
  onColorChange?: (index: number) => void
  onCaptureReady?: (fn: () => Promise<string | null>) => void
}

/**
 * Bravo3DWebGLStage — Adaptador de alta integración para renderizar cualquier
 * producto del catálogo en el motor 3D WebGL PBR con Three.js y Canvg.
 */
export const Bravo3DWebGLStage: React.FC<Bravo3DWebGLStageProps> = ({
  simulatorType = 'Polera',
  imageUrl = null,
  initialScale = 60,
  initialPosX = 0,
  initialPosY = 0,
  customText = '',
  textColor = '#ffffff',
  fontFamily = 'Outfit',
  selectedColorIndex = 0,
  onColorChange,
  onCaptureReady,
}) => {
  // ─── 1. Resolución de Producto y Mapeo a Malla 3D ───────────────────────────
  const resolvedType = resolveProductType(simulatorType)
  const def = PRODUCT_DEFINITIONS[resolvedType] || PRODUCT_DEFINITIONS.Polera

  const productModel = useMemo(() => {
    let procType: 't_shirt' | 'mug' | 'bottle' | 'cap' | 'totebag' | 'hoodie' = 't_shirt'
    if (resolvedType === 'Tazón' || resolvedType === 'Chopero' || resolvedType === 'Mug') {
      procType = 'mug'
    } else if (resolvedType === 'Termo') {
      procType = 'bottle'
    } else if (resolvedType === 'Jockey') {
      procType = 'cap'
    } else if (resolvedType === 'Totebag') {
      procType = 'totebag'
    } else if (resolvedType === 'Polerón') {
      procType = 'hoodie'
    }

    const colors = (def.colors || []).map((c) => ({
      name: c.name,
      hex: c.hex,
    }))

    return {
      id: 1,
      name: def.label || resolvedType,
      sku: `BRAVO-${resolvedType.toUpperCase()}`,
      proceduralType: procType,
      baseColorHex: colors[selectedColorIndex]?.hex || '#ffffff',
      availableColors: colors.length > 0 ? colors : [{ name: 'Blanco', hex: '#ffffff' }, { name: 'Negro', hex: '#1c1c1c' }],
      printZones: [
        {
          id: 'front',
          name: 'Zona Frontal',
          maxWidthCm: 32,
          maxHeightCm: 40,
          allowedTechniques: ['dtf', 'sublimacion', 'vinilo'],
        },
      ],
      cameraPresets: {},
    }
  }, [resolvedType, def, selectedColorIndex])

  // Color base activo
  const currentColorHex = productModel.availableColors[selectedColorIndex]?.hex || productModel.baseColorHex

  // ─── 2. Estado de Transformación del Decal ──────────────────────────────────
  const [decalTransform, setDecalTransform] = useState({
    x: 0.5 + initialPosX / 200,
    y: 0.45 + initialPosY / 200,
    scale: Math.max(0.1, Math.min(1.4, initialScale / 100)),
    rotationDeg: 0,
  })

  // ─── 3. Pipeline de Textura Canvg 2K Offscreen ─────────────────────────────
  const { canvasTextureRef, renderDecals } = useTexturePipeline({
    resolution: 2048,
  })

  // Sincronización de estampas (imagen del usuario + texto si existe)
  useEffect(() => {
    const decalsList = []

    if (imageUrl) {
      const isSvg = imageUrl.toLowerCase().includes('.svg') || imageUrl.startsWith('data:image/svg')
      decalsList.push({
        id: 'main-artwork',
        zoneId: 'front',
        artworkUrl: imageUrl,
        artworkType: isSvg ? 'svg' : 'raster',
        transform: decalTransform,
      })
    }

    if (customText && customText.trim()) {
      decalsList.push({
        id: 'custom-text',
        zoneId: 'front',
        artworkType: 'text',
        textContent: customText.trim(),
        textFont: fontFamily,
        textColor,
        transform: {
          x: decalTransform.x,
          y: Math.min(0.9, decalTransform.y + 0.2),
          scale: decalTransform.scale * 0.7,
          rotationDeg: decalTransform.rotationDeg,
        },
      })
    }

    renderDecals(decalsList)
  }, [imageUrl, customText, textColor, fontFamily, decalTransform, renderDecals])

  // ─── 4. Escenario Three.js PBR ─────────────────────────────────────────────
  const {
    containerRef,
    activeView,
    setCameraView,
    isLoadingModel,
    modelError,
    takeSnapshot,
  } = useProduct3DStage({
    product: productModel,
    baseColorHex: currentColorHex,
    canvasTexture: canvasTextureRef.current,
  })

  // ─── 5. Enlace con la Función de Captura del Formulario ─────────────────────
  useEffect(() => {
    if (onCaptureReady) {
      onCaptureReady(async () => {
        return takeSnapshot()
      })
    }
  }, [onCaptureReady, takeSnapshot])

  // Manejo de cambio de color
  const handleSelectColorHex = (hex: string) => {
    const idx = productModel.availableColors.findIndex((c) => c.hex.toLowerCase() === hex.toLowerCase())
    if (idx !== -1 && onColorChange) {
      onColorChange(idx)
    }
  }

  const handleReset = useCallback(() => {
    setDecalTransform({
      x: 0.5,
      y: 0.45,
      scale: 0.55,
      rotationDeg: 0,
    })
  }, [])

  return (
    <div className="w-full h-full min-h-[380px] sm:min-h-[460px] relative">
      <Product3DCanvas
        containerRef={containerRef}
        product={productModel}
        selectedColorHex={currentColorHex}
        onSelectColor={handleSelectColorHex}
        activeView={activeView}
        onSelectView={setCameraView}
        decalTransform={decalTransform}
        onDecalTransformChange={setDecalTransform}
        isLoading={isLoadingModel}
        error={modelError}
        onResetTransform={handleReset}
      />
    </div>
  )
}
