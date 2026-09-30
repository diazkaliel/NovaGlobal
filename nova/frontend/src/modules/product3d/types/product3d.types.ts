/**
 * product3d.types.ts — Contratos e interfaces TypeScript del Simulador 3D Industrial.
 *
 * Mantiene paridad estricta con los esquemas Pydantic v2 del backend FastAPI
 * y modela las estructuras matemáticas requeridas por Three.js y el pipeline Canvg.
 */

export interface DecalTransform {
  /** Posición X normalizada en la zona de impresión [0.0 - 1.0] (0=izquierda, 0.5=centro, 1=derecha) */
  x: number
  /** Posición Y normalizada en la zona de impresión [0.0 - 1.0] (0=arriba, 0.5=centro, 1=abajo) */
  y: number
  /** Escala relativa a la dimensión máxima de la zona de impresión [0.05 - 1.5] */
  scale: number
  /** Rotación en grados sexagesimales [-180° a 360°] */
  rotationDeg: number
}

export type ArtworkType = 'svg' | 'raster' | 'text'

export interface DecalConfig {
  id: string
  zoneId: string
  artworkUrl?: string | null
  artworkType: ArtworkType
  transform: DecalTransform
  
  // Opciones para estampa de texto dinámico
  textContent?: string
  textFont?: string
  textColor?: string

  // Medidas físicas estimadas para producción
  widthCm?: number
  heightCm?: number
}

export interface PrintZone {
  id: string
  name: string
  maxWidthCm: number
  maxHeightCm: number
  uvBounds?: {
    uMin: number
    vMin: number
    uMax: number
    vMax: number
  }
  allowedTechniques: string[]
}

export interface CameraPreset {
  name: string
  position: [number, number, number]
  target: [number, number, number]
}

export type CameraViewPresetKey = 'front' | 'back' | 'profile' | 'detail' | 'top'

export interface ProductColorOption {
  name: string
  hex: string
}

export type ProceduralMeshType = 't_shirt' | 'mug' | 'cap' | 'bottle' | 'hoodie' | 'totebag'

export interface Product3DModel {
  id: number
  name: string
  sku: string
  glbUrl?: string | null
  proceduralType?: ProceduralMeshType | null
  baseColorHex: string
  availableColors: ProductColorOption[]
  printZones: PrintZone[]
  cameraPresets: Record<string, CameraPreset>
  inventoryId?: number | null
}

export interface PricingQuoteRequest {
  product3dId: number
  technique: string
  quantity: number
  decals: DecalConfig[]
}

export interface PricingQuoteBreakdown {
  baseProductPrice: number
  customizationCost: number
  totalPrintAreaCm2: number
  volumeDiscountPct: number
  unitPrice: number
  finalTotal: number
}

export interface CustomizationSession {
  id?: number
  sessionToken: string
  product3dId: number
  selectedColorHex: string
  decals: DecalConfig[]
  technique: string
  quantity: number
  pricing?: PricingQuoteBreakdown
  previewImageUrl?: string | null
}

/** Configuración de iluminación PBR para el hook useProduct3DStage */
export interface StudioLightingConfig {
  ambientIntensity: number
  ambientColor: number | string
  keyLightIntensity: number
  keyLightColor: number | string
  fillLightIntensity: number
  fillLightColor: number | string
  rimLightIntensity: number
  rimLightColor: number | string
}

/** Estado exportado por el hook del canvas 3D */
export interface Product3DStageState {
  isLoading: boolean
  loadingProgress: number
  error: string | null
  activeView: CameraViewPresetKey
  currentColorHex: string
}
