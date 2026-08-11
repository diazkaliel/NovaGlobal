/**
 * bravoMockupProducts.js — Definiciones de productos para el Simulador de Mockups
 *
 * Centraliza todas las configuraciones de productos, zonas de impresión,
 * colores disponibles y mapeo de IDs del formulario al simulador.
 *
 * Importar desde cualquier componente que necesite acceder a estas constantes.
 */

export const PRODUCT_DEFINITIONS = {
  Polera: {
    label: 'Polera Premium Algodón',
    frontImage: '/mockups/polera_front.png',
    backImage: '/mockups/polera_back.png',
    printZone: { x: 0.5, y: 0.42, w: 0.42, h: 0.48 },
    colors: [
      { name: 'Negro', hex: '#1c1c1c' },
      { name: 'Blanco', hex: '#ffffff' },
      { name: 'Gris Melange', hex: '#6e7072' },
      { name: 'Azul Marino', hex: '#162238' },
      { name: 'Rojo Pasión', hex: '#9e1b1b' },
      { name: 'Verde Oliva', hex: '#2d402b' }
    ]
  },
  'Polerón': {
    label: 'Polerón Hoodie Cotton',
    frontImage: '/mockups/poleron_front.png',
    backImage: '/mockups/polera_back.png',
    printZone: { x: 0.5, y: 0.44, w: 0.40, h: 0.44 },
    colors: [
      { name: 'Negro', hex: '#181818' },
      { name: 'Blanco', hex: '#f8f8f8' },
      { name: 'Gris Melange', hex: '#7c7e80' },
      { name: 'Azul Marino', hex: '#1a273e' },
      { name: 'Rojo', hex: '#a61e1e' }
    ]
  },
  Tazón: {
    label: 'Tazón Cerámico 11oz',
    frontImage: '/mockups/tazon_front.png',
    backImage: '/mockups/tazon_side.png',
    backLabel: 'Perfil / Asa',
    printZone: { x: 0.48, y: 0.50, w: 0.50, h: 0.55 },
    colors: [
      { name: 'Blanco Gloss', hex: '#ffffff' },
      { name: 'Negro Mágico', hex: '#1f1f1f' }
    ]
  },
  Jockey: {
    label: 'Jockey Snapback',
    frontImage: '/mockups/jockey_front.png',
    backImage: '/mockups/jockey_side.png',
    backLabel: 'Perfil',
    printZone: { x: 0.50, y: 0.40, w: 0.38, h: 0.35 },
    colors: [
      { name: 'Negro', hex: '#1c1c1c' },
      { name: 'Azul Marino', hex: '#17233b' },
      { name: 'Rojo', hex: '#b01e1e' },
      { name: 'Blanco', hex: '#f0f0f0' }
    ]
  },
  Totebag: {
    label: 'Totebag de Tela',
    frontImage: '/mockups/totebag_front.png',
    backImage: '/mockups/totebag_front.png',
    printZone: { x: 0.50, y: 0.52, w: 0.52, h: 0.55 },
    colors: [
      { name: 'Crudo / Natural', hex: '#e3d7c3' },
      { name: 'Negro', hex: '#1c1c1c' }
    ]
  },
  Chopero: {
    label: 'Chopero Cervecero Frosted HD',
    frontImage: '/mockups/chopero_front.png',
    backImage: '/mockups/chopero_side.png',
    backLabel: 'Perfil / Asa',
    printZone: { x: 0.50, y: 0.50, w: 0.45, h: 0.52 },
    colors: [{ name: 'Vidrio Esmerilado', hex: '#e8eaf0' }]
  },
  Mug: {
    label: 'Mug Térmico Inox HD',
    frontImage: '/mockups/mug_front.png',
    backImage: '/mockups/mug_side.png',
    backLabel: 'Perfil / Asa',
    printZone: { x: 0.50, y: 0.50, w: 0.42, h: 0.52 },
    colors: [
      { name: 'Blanco Gloss', hex: '#ffffff' },
      { name: 'Negro Mate', hex: '#1c1c1c' }
    ]
  },
  Termo: {
    label: 'Termo Vacío 500ml',
    frontImage: '/mockups/termo_front.png',
    backImage: '/mockups/termo_front.png',
    printZone: { x: 0.50, y: 0.48, w: 0.38, h: 0.55 },
    colors: [
      { name: 'Acero Inox', hex: '#d0d4d9' },
      { name: 'Negro Mate', hex: '#1c1c1c' }
    ]
  },
  Puzle: {
    label: 'Rompecabezas Sublimable HD',
    frontImage: '/mockups/puzle_front.png',
    printZone: { x: 0.50, y: 0.50, w: 0.72, h: 0.72 },
    colors: [{ name: 'Blanco Gloss', hex: '#ffffff' }]
  },
  Stanley: {
    label: 'Vaso / Tazón Tipo Stanley 40oz',
    frontImage: '/mockups/stanley_front.png',
    backImage: '/mockups/stanley_front.png',
    printZone: { x: 0.50, y: 0.50, w: 0.42, h: 0.52 },
    colors: [
      { name: 'Blanco Gloss', hex: '#ffffff' },
      { name: 'Negro Mate', hex: '#18181b' },
      { name: 'Rosa Pastel', hex: '#fb7185' },
      { name: 'Azul Celeste', hex: '#38bdf8' }
    ]
  },
  Pechera: {
    label: 'Pechera Parrillera Premium',
    frontImage: '/mockups/pechera_front.png',
    printZone: { x: 0.50, y: 0.45, w: 0.48, h: 0.45 },
    colors: [
      { name: 'Negro Canvas', hex: '#18181b' },
      { name: 'Marrón Cuero', hex: '#78350f' }
    ]
  },
  Cuadro: {
    label: 'Cuadro / Poster Canvas',
    frontImage: '/mockups/poster_front.png',
    printZone: { x: 0.50, y: 0.50, w: 0.75, h: 0.75 },
    colors: [
      { name: 'Marco Negro', hex: '#18181b' },
      { name: 'Marco Blanco', hex: '#ffffff' },
      { name: 'Marco Madera', hex: '#a16207' }
    ]
  },
  'DTF Textil': {
    label: 'Film DTF Textil · 32cm × N Mts',
    isDTF: true,
    dtfWidth: '32 cm',
    printZone: { x: 0.50, y: 0.50, w: 0.88, h: 0.88 },
    colors: [{ name: 'Film PET', hex: '#f0f4f8' }]
  },
  'DTF UV': {
    label: 'Film DTF UV · 28cm × N Mts',
    isDTF: true,
    dtfWidth: '28 cm',
    printZone: { x: 0.50, y: 0.50, w: 0.88, h: 0.88 },
    colors: [{ name: 'Film UV', hex: '#f8f4ff' }]
  }
}

/**
 * Mapeo de IDs del formulario → Clave del simulador.
 * El simulador usa claves con tildes y mayúscula.
 * Este mapeo conecta los IDs planos del formulario con las claves del simulador.
 */
export const FORM_ID_MAP = {
  polera: 'Polera', poleron: 'Polerón', tazon: 'Tazón',
  jockey: 'Jockey', totebag: 'Totebag', chopero: 'Chopero',
  mug: 'Mug', termo: 'Termo', puzle: 'Puzle', puzzle: 'Puzle',
  stanley: 'Stanley', 'tazon stanley': 'Stanley', 'vaso stanley': 'Stanley',
  pechera: 'Pechera', 'pechera parrillera': 'Pechera',
  cuadro: 'Cuadro', poster: 'Cuadro', 'cuadro canvas': 'Cuadro',
  'dtf textil': 'DTF Textil', 'dtf_textil': 'DTF Textil',
  'dtf uv': 'DTF UV', 'dtf_uv': 'DTF UV'
}

/**
 * Resuelve un tipo de simulador (puede venir como ID del form o como clave directa)
 * a la clave canónica de PRODUCT_DEFINITIONS.
 */
export function resolveProductType(type) {
  if (!type) return null
  const direct = FORM_ID_MAP[type.toLowerCase?.()] || FORM_ID_MAP[type]
  if (direct) return direct

  const str = String(type).toLowerCase()
  for (const [key, value] of Object.entries(FORM_ID_MAP)) {
    if (str.includes(key)) return value
  }

  if (PRODUCT_DEFINITIONS[type]) return type

  return null
}

/**
 * Lista de tipos de producto disponibles para las tabs del simulador
 */
export const SIMULATOR_PRODUCT_TABS = [
  'Polera', 'Polerón', 'Tazón', 'Jockey', 'Totebag',
  'Chopero', 'Mug', 'Termo', 'Puzle', 'Stanley',
  'Pechera', 'Cuadro', 'DTF Textil', 'DTF UV'
]

/**
 * Selecciona una categoría/tipo de producto al azar a partir del catálogo
 * de productos a la venta desde el backend, o bien entre las pestañas disponibles.
 */
export function getRandomProductType(productsList = []) {
  if (Array.isArray(productsList) && productsList.length > 0) {
    const shuffled = [...productsList].sort(() => Math.random() - 0.5)
    for (const p of shuffled) {
      const candidate = p.category || p.name || p.device_type || p.type
      const resolved = resolveProductType(candidate)
      if (resolved) return resolved
    }
  }
  const randomIndex = Math.floor(Math.random() * SIMULATOR_PRODUCT_TABS.length)
  return SIMULATOR_PRODUCT_TABS[randomIndex]
}

