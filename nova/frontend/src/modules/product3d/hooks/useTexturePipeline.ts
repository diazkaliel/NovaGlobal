import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvg } from 'canvg'
import { DecalConfig } from '../types/product3d.types'

interface TexturePipelineOptions {
  resolution?: number
  onTextureUpdated?: (texture: THREE.CanvasTexture) => void
}

/** Cache en memoria para evitar llamadas de red repetitivas a la misma imagen */
const imageElementCache = new Map<string, HTMLImageElement>()
const svgTextCache = new Map<string, string>()

async function preloadImage(src: string): Promise<HTMLImageElement | null> {
  if (imageElementCache.has(src)) {
    return imageElementCache.get(src)!
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageElementCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function fetchSvgText(url: string): Promise<string | null> {
  if (svgTextCache.has(url)) {
    return svgTextCache.get(url)!
  }
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    svgTextCache.set(url, text)
    return text
  } catch {
    return null
  }
}

/**
 * useTexturePipeline — Motor de renderizado vectorial y rasterizado a CanvasTexture 2K.
 *
 * Utiliza un canvas offscreen de 2048x2048 para componer todas las estampas (SVG con Canvg,
 * imágenes PNG con canal alfa y tipografías dinámicas) en una textura compuesta que
 * Three.js mapea directamente sobre el material PBR de la prenda.
 */
export function useTexturePipeline(options: TexturePipelineOptions = {}) {
  const { resolution = 2048, onTextureUpdated } = options

  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasTextureRef = useRef<THREE.CanvasTexture | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const renderCounterRef = useRef(0)

  // Inicialización perezosa del canvas offscreen y la textura Three.js
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    offscreenCanvasRef.current = canvas

    const texture = new THREE.CanvasTexture(canvas)
    // sRGB es mandatorio en Three.js moderno para evitar desaturación de color en WebGL
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter

    canvasTextureRef.current = texture

    if (onTextureUpdated) {
      onTextureUpdated(texture)
    }

    return () => {
      texture.dispose()
      canvasTextureRef.current = null
      offscreenCanvasRef.current = null
    }
  }, [resolution, onTextureUpdated])

  /**
   * Renderiza el conjunto de decals sobre el canvas offscreen y actualiza la GPU.
   */
  const renderDecals = useCallback(
    async (decals: DecalConfig[]) => {
      const canvas = offscreenCanvasRef.current
      const texture = canvasTextureRef.current
      if (!canvas || !texture) return

      const currentRenderId = ++renderCounterRef.current
      setIsRendering(true)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setIsRendering(false)
        return
      }

      // Limpiar canvas manteniendo transparencia total para que se aprecie el color base de la tela
      ctx.clearRect(0, 0, resolution, resolution)

      // Procesar cada estampa en su orden de capas
      for (const decal of decals) {
        // Validación de race condition si se disparó otro render mientras este cargaba
        if (currentRenderId !== renderCounterRef.current) return

        ctx.save()

        const { x, y, scale, rotationDeg } = decal.transform

        // Coordenadas en píxeles en el canvas 2K
        const targetX = x * resolution
        const targetY = y * resolution

        // Dimensión base de referencia (ej. 40% del canvas escalado por el factor de escala)
        const baseSize = resolution * 0.45 * scale

        // Transformación afín 2D (traslación -> rotación -> centrado)
        ctx.translate(targetX, targetY)
        ctx.rotate((rotationDeg * Math.PI) / 180)

        if (decal.artworkType === 'text' && decal.textContent) {
          // Render de texto personalizado
          const fontSize = Math.round(resolution * 0.05 * scale)
          ctx.font = `bold ${fontSize}px ${decal.textFont || 'Outfit'}, sans-serif`
          ctx.fillStyle = decal.textColor || '#ffffff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(decal.textContent, 0, 0)
        } else if (decal.artworkType === 'svg' && decal.artworkUrl) {
          // Renderizado vectorial con Canvg
          const svgString = await fetchSvgText(decal.artworkUrl)
          if (svgString && currentRenderId === renderCounterRef.current) {
            // Canvg requiere un canvas auxiliar de tamaño proporcional para evitar distorsiones
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = baseSize
            tempCanvas.height = baseSize
            const tempCtx = tempCanvas.getContext('2d')

            if (tempCtx) {
              const canvgInstance = await Canvg.fromString(tempCtx, svgString, {
                ignoreMouse: true,
                ignoreAnimation: true,
              })
              await canvgInstance.render()
              ctx.drawImage(tempCanvas, -baseSize / 2, -baseSize / 2, baseSize, baseSize)
            }
          }
        } else if (decal.artworkUrl) {
          // Renderizado raster (PNG / JPG)
          const img = await preloadImage(decal.artworkUrl)
          if (img && currentRenderId === renderCounterRef.current) {
            const aspect = img.width / (img.height || 1)
            let drawW = baseSize
            let drawH = baseSize
            if (aspect >= 1) {
              drawH = baseSize / aspect
            } else {
              drawW = baseSize * aspect
            }
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
          }
        }

        ctx.restore()
      }

      // Notificar a Three.js que actualice el buffer en GPU
      texture.needsUpdate = true
      setIsRendering(false)

      if (onTextureUpdated) {
        onTextureUpdated(texture)
      }
    },
    [resolution, onTextureUpdated]
  )

  return {
    canvasTextureRef,
    offscreenCanvasRef,
    renderDecals,
    isRendering,
  }
}
