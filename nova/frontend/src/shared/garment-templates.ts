/**
 * garment-templates.ts — Contratos y constantes del sistema de mockups fotográficos.
 *
 * Migrado desde: seiko/frontend/js/components/svg_templates.js
 * Pipeline fotográfico de 4 capas (Ghost Mannequin Studio — V5 Ultra Realista):
 *   1. Sombra de piso de estudio fotográfico.
 *   2. Capa base de tinte cromático textil dinámico (máscara alfa fotográfica).
 *   3. Capa de sombras, arrugas y textura de algodón (Multiply).
 *   4. Capa de brillo especular y softbox de estudio (Screen).
 *
 * Por qué rutas /assets/* en lugar de imports ESM:
 * Los PNGs de prenda pesan entre 687KB y 917KB. Servidos desde /public vía Vite
 * obtienen caché HTTP de largo plazo sin pasar por el bundler — reduce el cold start
 * del simulador y evita que Three.js / Canvg los procese innecesariamente.
 */

// ─── Tipos base ───────────────────────────────────────────────────────────────

export type GarmentType = 'tshirt' | 'hoodie' | 'crewneck'
export type GarmentView = 'front' | 'back'
export type GarmentAssetKey = `${GarmentType}_${GarmentView}`

// ─── Mapa de assets de prenda ─────────────────────────────────────────────────

/**
 * Mapa canónico de ruta → asset de prenda.
 * Cada clave es `${tipo}_${vista}`, lo cual garantiza que TypeScript atrape
 * cualquier combinación inválida en tiempo de compilación.
 */
export const GARMENT_ASSET_MAP: Record<GarmentAssetKey, string> = {
  tshirt_front:   '/assets/garments/tshirt_front.png',
  tshirt_back:    '/assets/garments/tshirt_back.png',
  hoodie_front:   '/assets/garments/hoodie_front.png',
  hoodie_back:    '/assets/garments/hoodie_back.png',
  crewneck_front: '/assets/garments/crewneck_front.png',
  crewneck_back:  '/assets/garments/crewneck_back.png',
}

// ─── Metadata de prendas para el selector UI ─────────────────────────────────

export interface GarmentDefinition {
  type: GarmentType
  /** Nombre comercial del producto textil */
  label: string
  /** Gramaje en g/m² — relevante para cotización DTF */
  weight: number
  /** Precio base en CLP — usado por el motor de cotización */
  basePrice: number
  /** Zonas de impresión disponibles para este tipo */
  printZones: PrintZoneName[]
}

export type PrintZoneName =
  | 'pecho_centro'
  | 'pecho_izquierdo'
  | 'espalda_completa'
  | 'manga_izquierda'
  | 'manga_derecha'
  | 'capucha_externa'

export const GARMENT_CATALOG: GarmentDefinition[] = [
  {
    type: 'tshirt',
    label: 'Polera Heavyweight 240g',
    weight: 240,
    basePrice: 8990,
    printZones: ['pecho_centro', 'pecho_izquierdo', 'espalda_completa', 'manga_izquierda', 'manga_derecha'],
  },
  {
    type: 'hoodie',
    label: 'Polerón Canguro con Capucha 320g',
    weight: 320,
    basePrice: 18990,
    printZones: ['pecho_centro', 'pecho_izquierdo', 'espalda_completa', 'manga_izquierda', 'manga_derecha', 'capucha_externa'],
  },
  {
    type: 'crewneck',
    label: 'Polerón Cuello Redondo 300g',
    weight: 300,
    basePrice: 15990,
    printZones: ['pecho_centro', 'pecho_izquierdo', 'espalda_completa', 'manga_izquierda', 'manga_derecha'],
  },
]

// ─── Miniaturas vectoriales para el selector de prenda ───────────────────────

/**
 * SVGs compactos 80×80px para el carrusel de selección de prenda.
 * Usan gradientes lineales y radiales para simular volumen sin assets externos.
 * Exportados como funciones porque el color es dinámico (reactivo al colorHex).
 */
export const SVG_GARMENT_THUMBS: Record<GarmentType, (colorHex?: string) => string> = {
  tshirt: (colorHex = '#94a3b8') => `
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="th-ts-light" x1="14" y1="14" x2="66" y2="66">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
        </linearGradient>
      </defs>
      <path d="M26 18 L10 26 C8 27 9 34 11 38 L19 35 L19 65 L61 65 L61 35 L69 38 C71 34 72 27 70 26 L54 18 C48 22 32 22 26 18 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M26 18 L10 26 C8 27 9 34 11 38 L19 35 L19 65 L61 65 L61 35 L69 38 C71 34 72 27 70 26 L54 18 C48 22 32 22 26 18 Z"
            fill="url(#th-ts-light)"/>
      <path d="M26 18 C32 23 48 23 54 18 C48 22 32 22 26 18 Z"
            fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.38)" stroke-width="1"/>
      <path d="M27 18 L19 35" stroke="rgba(0,0,0,0.35)" stroke-width="1" stroke-dasharray="2 1.5"/>
      <path d="M53 18 L61 35" stroke="rgba(0,0,0,0.35)" stroke-width="1" stroke-dasharray="2 1.5"/>
    </svg>
  `,
  hoodie: (colorHex = '#94a3b8') => `
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="th-hd-light" x1="12" y1="12" x2="68" y2="68">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.42"/>
        </linearGradient>
        <radialGradient id="th-hd-hood" cx="40%" cy="22%" r="60%">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
        </radialGradient>
      </defs>
      <path d="M27 20 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L53 20 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M27 20 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L53 20 Z"
            fill="url(#th-hd-light)"/>
      <path d="M27 20 C23 8 57 8 53 20 C48 30 32 30 27 20 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.38)" stroke-width="1.2"/>
      <path d="M27 20 C23 8 57 8 53 20 C48 30 32 30 27 20 Z"
            fill="url(#th-hd-hood)"/>
      <path d="M36 24 Q35 34 34 40" stroke="rgba(255,255,255,0.88)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M44 24 Q45 34 46 40" stroke="rgba(255,255,255,0.88)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M25 52 L30 46 L50 46 L55 52 L57 66 L23 66 Z"
            fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.24)" stroke-width="1"/>
      <line x1="29" y1="45" x2="31" y2="47" stroke="#e51d24" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="49" y1="45" x2="51" y2="47" stroke="#e51d24" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  crewneck: (colorHex = '#94a3b8') => `
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="th-cn-light" x1="12" y1="12" x2="68" y2="68">
          <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.26"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.40"/>
        </linearGradient>
      </defs>
      <path d="M28 18 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L52 18 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M28 18 L14 30 L6 46 C4 50 10 52 13 49 L20 38 L19 66 L61 66 L60 38 L67 49 C70 52 76 50 74 46 L66 30 L52 18 Z"
            fill="url(#th-cn-light)"/>
      <path d="M28 18 C33 25 47 25 52 18 C47 22 33 22 28 18 Z"
            fill="${colorHex}" stroke="rgba(255,255,255,0.40)" stroke-width="1.4"/>
      <path d="M37 21 L40 27 L43 21" stroke="rgba(0,0,0,0.45)" stroke-width="1.4" fill="none"/>
      <rect x="19" y="60" width="42" height="6" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.24)" stroke-width="1"/>
    </svg>
  `,
}

// ─── Preset Artworks DTF ──────────────────────────────────────────────────────

export interface PresetArtwork {
  id: string
  name: string
  category: string
  /** Contenido SVG inline o markup HTML con imagen referenciada */
  svgContent?: string
  /** URL absoluta de imagen (PNG/WebP) como alternativa a svgContent */
  imageUrl?: string
  /** Escala inicial relativa a la zona de impresión (1.0 = 100%) */
  defaultScale: number
  /** Posición sugerida en la prenda */
  suggestedPosition: PrintZoneName
  /** Tamaño de impresión sugerido (nomenclatura DTF estándar) */
  suggestedSize: 'A6' | 'A5' | 'A4' | 'A3'
}

import { BRAVO_PRESETS } from '../utils/bravoPresets'

/**
 * Catálogo maestro de diseños y presets de estampados oficiales para Bravo.
 */
export const PRESET_ARTWORKS: PresetArtwork[] = BRAVO_PRESETS
