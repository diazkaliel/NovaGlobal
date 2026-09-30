/**
 * bravoMockupProducts.js — Definiciones de productos para el Simulador de Mockups
 *
 * Centraliza todas las configuraciones de productos, zonas de impresión calibradas,
 * colores disponibles y mapeo de IDs del formulario al simulador.
 *
 * Cada producto cuenta con fotografía de estudio comercial hiperrealista en modo RGBA
 * con soporte para el pipeline fotorrealista de 4 capas (Ghost Mannequin Studio V5).
 */

export const PRODUCT_DEFINITIONS = {
  Polera: {
    label: 'Polera Heavyweight 240g (Algodón Premium)',
    category: 'textil',
    isPhotorealisticMultiLayer: true,
    weight_gsm: 240,
    basePrice: 8990,
    frontImage: '/assets/garments/tshirt_front.png',
    backImage: '/assets/garments/tshirt_back.png',
    printZone: { x: 0.50, y: 0.40, w: 0.44, h: 0.50 },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Negro Profundo', hex: '#121212' },
      { name: 'Blanco Óptico', hex: '#f5f5f5' },
      { name: 'Gris Carbón', hex: '#374151' },
      { name: 'Azul Marino', hex: '#1e3a5f' },
      { name: 'Rojo Fuego', hex: '#c0392b' },
      { name: 'Verde Oliva', hex: '#2d6a4f' },
      { name: 'Camel / Arena', hex: '#c19a6b' },
      { name: 'Cian Neón', hex: '#00f0ff' }
    ]
  },
  'Polerón': {
    label: 'Polerón Canguro con Capucha 320g (Hoodie Cotton)',
    category: 'textil',
    isPhotorealisticMultiLayer: true,
    weight_gsm: 320,
    basePrice: 18990,
    frontImage: '/assets/garments/hoodie_front.png',
    backImage: '/assets/garments/hoodie_back.png',
    printZone: { x: 0.50, y: 0.42, w: 0.42, h: 0.46 },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Negro Profundo', hex: '#121212' },
      { name: 'Blanco Óptico', hex: '#f5f5f5' },
      { name: 'Gris Carbón', hex: '#374151' },
      { name: 'Azul Marino', hex: '#1e3a5f' },
      { name: 'Rojo Fuego', hex: '#c0392b' },
      { name: 'Verde Oliva', hex: '#2d6a4f' }
    ]
  },
  'Cuello Redondo': {
    label: 'Polerón Cuello Redondo 300g (Crewneck Heavyweight)',
    category: 'textil',
    isPhotorealisticMultiLayer: true,
    weight_gsm: 300,
    basePrice: 15990,
    frontImage: '/assets/garments/crewneck_front.png',
    backImage: '/assets/garments/crewneck_back.png',
    printZone: { x: 0.50, y: 0.40, w: 0.42, h: 0.48 },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Negro Profundo', hex: '#121212' },
      { name: 'Blanco Óptico', hex: '#f5f5f5' },
      { name: 'Gris Carbón', hex: '#374151' },
      { name: 'Azul Marino', hex: '#1e3a5f' },
      { name: 'Rojo Fuego', hex: '#c0392b' }
    ]
  },
  Tazón: {
    label: 'Tazón Cerámico 11oz Glaze HD',
    category: 'ceramica',
    isPhotorealisticMultiLayer: false,
    basePrice: 4990,
    frontImage: '/mockups/tazon_front_hd.png',
    backImage: '/mockups/tazon_front_hd.png',
    printZone: { x: 0.48, y: 0.52, w: 0.42, h: 0.48 },
    colors: [
      { name: 'Blanco Gloss', hex: '#ffffff' },
      { name: 'Negro Mágico', hex: '#1a1a1a' },
      { name: 'Rojo Carmesí', hex: '#b91c1c' },
      { name: 'Azul Cobalto', hex: '#1d4ed8' },
      { name: 'Amarillo Mostaza', hex: '#eab308' }
    ]
  },
  Stanley: {
    label: 'Vaso Térmico Tipo Stanley 40oz HD',
    category: 'acero',
    isPhotorealisticMultiLayer: false,
    basePrice: 16990,
    frontImage: '/mockups/stanley_front_hd.png',
    backImage: '/mockups/stanley_front_hd.png',
    printZone: { x: 0.50, y: 0.46, w: 0.36, h: 0.38 },
    colors: [
      { name: 'Blanco Nieve', hex: '#f8fafc' },
      { name: 'Negro Mate', hex: '#1e293b' },
      { name: 'Rosa Pastel', hex: '#f472b6' },
      { name: 'Azul Celeste', hex: '#38bdf8' },
      { name: 'Verde Sage', hex: '#84cc16' }
    ]
  },
  Termo: {
    label: 'Termo Vacío Inox 500ml Pro',
    category: 'acero',
    isPhotorealisticMultiLayer: false,
    basePrice: 12990,
    frontImage: '/mockups/termo_front_hd.png',
    backImage: '/mockups/termo_front_hd.png',
    printZone: { x: 0.50, y: 0.56, w: 0.32, h: 0.46 },
    colors: [
      { name: 'Acero Inox Cepillado', hex: '#cbd5e1' },
      { name: 'Negro Mate', hex: '#1e1e24' }
    ]
  },
  Mug: {
    label: 'Mug Térmico Inox HD con Tapa',
    category: 'acero',
    isPhotorealisticMultiLayer: false,
    basePrice: 8990,
    frontImage: '/mockups/mug_front_hd.png',
    backImage: '/mockups/mug_front_hd.png',
    printZone: { x: 0.48, y: 0.52, w: 0.38, h: 0.42 },
    colors: [
      { name: 'Blanco Gloss', hex: '#ffffff' },
      { name: 'Negro Mate', hex: '#18181b' },
      { name: 'Azul Royal', hex: '#2563eb' }
    ]
  },
  Chopero: {
    label: 'Chopero Cervecero Frosted Glass HD',
    category: 'vidrio',
    basePrice: 7990,
    frontImage: '/mockups/chopero_front_hd.png',
    backImage: '/mockups/chopero_front_hd.png',
    printZone: { x: 0.48, y: 0.50, w: 0.38, h: 0.46 },
    colors: [{ name: 'Vidrio Esmerilado', hex: '#f1f5f9' }]
  },
  Jockey: {
    label: 'Jockey Snapback 6-Panel Premium',
    category: 'accesorio',
    isPhotorealisticMultiLayer: false,
    basePrice: 5990,
    frontImage: '/mockups/jockey_front_hd.png',
    backImage: '/mockups/jockey_front_hd.png',
    printZone: { x: 0.50, y: 0.42, w: 0.38, h: 0.28 },
    colors: [
      { name: 'Negro Carbón', hex: '#121212' },
      { name: 'Azul Marino', hex: '#1e3a5f' },
      { name: 'Rojo Fuego', hex: '#b91c1c' },
      { name: 'Blanco Puro', hex: '#ffffff' }
    ]
  },
  Totebag: {
    label: 'Totebag de Tela Canvas Woven HD',
    category: 'accesorio',
    isPhotorealisticMultiLayer: true,
    basePrice: 6990,
    frontImage: '/mockups/totebag_front_hd.png',
    backImage: '/mockups/totebag_front_hd.png',
    printZone: { x: 0.50, y: 0.60, w: 0.48, h: 0.46 },
    colors: [
      { name: 'Crudo / Natural', hex: '#ede4d4' },
      { name: 'Negro Canvas', hex: '#1c1c1c' },
      { name: 'Terracota', hex: '#c2410c' }
    ]
  },
  Pechera: {
    label: 'Pechera Parrillera Canvas & Cuero Premium',
    category: 'textil',
    isPhotorealisticMultiLayer: true,
    basePrice: 9990,
    frontImage: '/mockups/pechera_front_hd.png',
    printZone: { x: 0.50, y: 0.40, w: 0.38, h: 0.30 },
    colors: [
      { name: 'Negro Canvas', hex: '#1c1917' },
      { name: 'Marrón Cuero', hex: '#78350f' }
    ]
  },
  Cuadro: {
    label: 'Cuadro / Canvas Art Gallery Wrapped',
    category: 'decoracion',
    basePrice: 11990,
    frontImage: '/mockups/poster_front_hd.png',
    printZone: { x: 0.50, y: 0.50, w: 0.70, h: 0.68 },
    colors: [
      { name: 'Lienzo Puro', hex: '#ffffff' }
    ]
  },
  Puzle: {
    label: 'Rompecabezas Sublimable Gloss HD',
    category: 'regalo',
    basePrice: 6990,
    frontImage: '/mockups/puzle_front_hd.png',
    printZone: { x: 0.50, y: 0.50, w: 0.88, h: 0.88 },
    colors: [{ name: 'Blanco Gloss', hex: '#ffffff' }]
  },
  'DTF Textil': {
    label: 'Film DTF Textil · 32cm × N Mts',
    category: 'dtf',
    isDTF: true,
    basePrice: 4500,
    dtfWidth: '32 cm',
    printZone: { x: 0.50, y: 0.50, w: 0.88, h: 0.88 },
    colors: [{ name: 'Film PET', hex: '#f0f4f8' }]
  },
  'DTF UV': {
    label: 'Film DTF UV · 28cm × N Mts',
    category: 'dtf',
    isDTF: true,
    basePrice: 5500,
    dtfWidth: '28 cm',
    printZone: { x: 0.50, y: 0.50, w: 0.88, h: 0.88 },
    colors: [{ name: 'Film UV', hex: '#f8f4ff' }]
  }
}

/**
 * Mapeo de IDs del formulario → Clave canónica del simulador.
 */
export const FORM_ID_MAP = {
  polera: 'Polera',
  poleron: 'Polerón',
  'cuello redondo': 'Cuello Redondo',
  cuelloredondo: 'Cuello Redondo',
  crewneck: 'Cuello Redondo',
  tazon: 'Tazón',
  jockey: 'Jockey',
  totebag: 'Totebag',
  chopero: 'Chopero',
  mug: 'Mug',
  termo: 'Termo',
  puzle: 'Puzle',
  puzzle: 'Puzle',
  stanley: 'Stanley',
  'tazon stanley': 'Stanley',
  'vaso stanley': 'Stanley',
  pechera: 'Pechera',
  'pechera parrillera': 'Pechera',
  cuadro: 'Cuadro',
  poster: 'Cuadro',
  'cuadro canvas': 'Cuadro',
  'dtf textil': 'DTF Textil',
  dtf_textil: 'DTF Textil',
  'dtf uv': 'DTF UV',
  dtf_uv: 'DTF UV'
}

/**
 * Resuelve un tipo de simulador a la clave canónica de PRODUCT_DEFINITIONS.
 */
export function resolveProductType(type) {
  if (!type) return 'Polera'
  const direct = FORM_ID_MAP[type.toLowerCase?.()] || FORM_ID_MAP[type]
  if (direct) return direct

  const str = String(type).toLowerCase()
  for (const [key, value] of Object.entries(FORM_ID_MAP)) {
    if (str.includes(key)) return value
  }

  if (PRODUCT_DEFINITIONS[type]) return type

  return 'Polera'
}

/**
 * Lista de tipos de producto disponibles para las tabs del simulador
 */
export const SIMULATOR_PRODUCT_TABS = [
  'Polera',
  'Polerón',
  'Cuello Redondo',
  'Tazón',
  'Jockey',
  'Totebag',
  'Chopero',
  'Mug',
  'Termo',
  'Puzle',
  'Stanley',
  'Pechera',
  'Cuadro',
  'DTF Textil',
  'DTF UV'
]

/**
 * Selecciona una categoría/tipo de producto al azar
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
