/**
 * bravoCatalogData.js
 * 
 * Centraliza la definición de soportes y catálogo físico de Bravo Atelier.
 * Garantiza disponibilidad consistente de todas las familias de producto
 * (Textil, Cerámica, Acero Inoxidable, Vidrio y Accesorios) y su enlace bidireccional
 * con el simulador 3D fotorrealista.
 */

export const BRAVO_CORE_CATALOG = [
  {
    id: 'core-polera',
    typeKey: 'Polera',
    name: 'Polera Heavyweight 240g',
    category: 'textil',
    categoryLabel: 'Línea Textil',
    technique: 'Estampado DTF Ultra HD',
    spec: '100% Algodón Peinado · 240 GSM',
    price: 8990,
    sale_price: 8990,
    image_url: '/assets/garments/tshirt_front.png',
    badge: 'Más Solicitado',
    description: 'Confección pesada con caída estructurada, cuello reforzado de 3cm y tacto imperceptible al lavado.'
  },
  {
    id: 'core-hoodie',
    typeKey: 'Polerón',
    name: 'Hoodie Canguro 320g Premium',
    category: 'textil',
    categoryLabel: 'Línea Textil',
    technique: 'DTF Textil Elastomérico',
    spec: 'Algodón Friza Pesado · 320 GSM',
    price: 18990,
    sale_price: 18990,
    image_url: '/assets/garments/hoodie_front.png',
    badge: 'Invierno',
    description: 'Capucha forrada de doble paño con cordones tubulares y bolsillo canguro con costuras reforzadas.'
  },
  {
    id: 'core-crewneck',
    typeKey: 'Cuello Redondo',
    name: 'Polerón Cuello Redondo 300g',
    category: 'textil',
    categoryLabel: 'Línea Textil',
    technique: 'DTF de Precisión',
    spec: 'Algodón Peinado Chileno · 300 GSM',
    price: 15990,
    sale_price: 15990,
    image_url: '/assets/garments/crewneck_front.png',
    badge: 'Urbano',
    description: 'Silueta minimalista sin capucha, costuras dobles overlock y puños en rib elasticado 1x1.'
  },
  {
    id: 'core-tazon',
    typeKey: 'Tazón',
    name: 'Tazón Cerámico 11oz Glaze HD',
    category: 'ceramica',
    categoryLabel: 'Cerámica & Vidrio',
    technique: 'Sublimación Óptica 360°',
    spec: 'Cerámica AAA Ultra-White · 325ml',
    price: 4990,
    sale_price: 4990,
    image_url: '/mockups/tazon_front_hd.png',
    badge: 'Clásico',
    description: 'Esmalte vitrificado de alta pureza con resistencia probada a microondas y lavavajillas industrial.'
  },
  {
    id: 'core-stanley',
    typeKey: 'Stanley',
    name: 'Vaso Térmico Tipo Stanley 40oz',
    category: 'acero',
    categoryLabel: 'Acero Térmico',
    technique: 'DTF UV con Relieve 3D / Sublimación',
    spec: 'Acero Grado Alimenticio 18/8 · 1.18L',
    price: 16990,
    sale_price: 16990,
    image_url: '/mockups/stanley_front_hd.png',
    badge: 'Tendencia',
    description: 'Aislamiento de doble pared al vacío. Conserva frío por 24 horas y calor por 12 horas. Incluye tapa y bombilla inox.'
  },
  {
    id: 'core-termo',
    typeKey: 'Termo',
    name: 'Botella Térmica Inox 500ml',
    category: 'acero',
    categoryLabel: 'Acero Térmico',
    technique: 'DTF UV con Barniz 3D',
    spec: 'Doble Capa Inox 304 · 500ml',
    price: 12990,
    sale_price: 12990,
    image_url: '/mockups/termo_front_hd.png',
    badge: 'Outdoor',
    description: 'Tapa hermética a rosca antiderrames, acabado mate antideslizante y excelente retención térmica.'
  },
  {
    id: 'core-chopero',
    typeKey: 'Chopero',
    name: 'Chopero Cervecero Frosted 16oz',
    category: 'ceramica',
    categoryLabel: 'Cerámica & Vidrio',
    technique: 'Sublimación Satinada',
    spec: 'Vidrio Esmerilado Pesado · 473ml',
    price: 7990,
    sale_price: 7990,
    image_url: '/mockups/chopero_front_hd.png',
    badge: 'Bar & Eventos',
    description: 'Vidrio satinado esmerilado al ácido con fondo masivo y asa ergonómica de agarre sólido.'
  },
  {
    id: 'core-jockey',
    typeKey: 'Jockey',
    name: 'Jockey Snapback 6 Paneles',
    category: 'accesorios',
    categoryLabel: 'Accesorios',
    technique: 'DTF Textil / Vinilo Transfer',
    spec: 'Sarga de Algodón Estructurada',
    price: 5990,
    sale_price: 5990,
    image_url: '/mockups/jockey_front_hd.png',
    badge: 'Headwear',
    description: 'Visera semi-plana reforzada, cierre snapback regulable y ojales metálicos de ventilación.'
  },
  {
    id: 'core-totebag',
    typeKey: 'Totebag',
    name: 'Totebag Lienzo Canvas Natural',
    category: 'accesorios',
    categoryLabel: 'Accesorios',
    technique: 'DTF Gran Formato',
    spec: 'Lona 100% Algodón Crudo · 280 GSM',
    price: 6990,
    sale_price: 6990,
    image_url: '/mockups/totebag_front_hd.png',
    badge: 'Ecológico',
    description: 'Costuras en cruz reforzadas en asas, fuelle de fondo para mayor capacidad y soporte hasta 15kg.'
  },
  {
    id: 'core-pechera',
    typeKey: 'Pechera',
    name: 'Pechera Parrillera Canvas & Cuero',
    category: 'textil',
    categoryLabel: 'Línea Textil',
    technique: 'DTF Textil Elastomérico',
    spec: 'Canvas Grueso 340g con Herrajes Bronce',
    price: 9990,
    sale_price: 9990,
    image_url: '/mockups/pechera_front_hd.png',
    badge: 'Gourmet',
    description: 'Tirantes cruzados en espalda antifatiga, bolsillos multifuncionales para herramientas y detalles en ecocuero.'
  },
  {
    id: 'core-dtf-textil',
    typeKey: 'DTF Textil',
    name: 'Film DTF Textil por Metro (32cm)',
    category: 'dtf',
    categoryLabel: 'Producción por Metro',
    technique: 'Impresión en Bobina 32cm',
    spec: 'Poliamida Elástica 90A · Cold Peel',
    price: 4500,
    sale_price: 4500,
    image_url: '/mockups/polera_front.png',
    badge: 'Bobina Textil',
    description: 'Metro lineal de 32cm de ancho impreso en film PET horneado con poliamida europea listo para estampar.'
  },
  {
    id: 'core-dtf-uv',
    typeKey: 'DTF UV',
    name: 'Film DTF UV con Barniz 3D (28cm)',
    category: 'dtf',
    categoryLabel: 'Producción por Metro',
    technique: 'Curado LED UV en Frío',
    spec: 'Relieve Táctil 3D · Waterproof',
    price: 5500,
    sale_price: 5500,
    image_url: '/mockups/stanley_front_hd.png',
    badge: 'Stickers Rígidos',
    description: 'Metro lineal de 28cm de ancho para aplicación instantánea en frío sobre termos, botellas, cerámica y acrílico.'
  }
]

export const BRAVO_CATEGORIES = [
  { key: 'all', label: 'Todos los Soportes' },
  { key: 'textil', label: 'Línea Textil' },
  { key: 'dtf', label: 'DTF por Metro' },
  { key: 'ceramica', label: 'Cerámica & Vidrio' },
  { key: 'acero', label: 'Acero Térmico' },
  { key: 'accesorios', label: 'Accesorios' }
]

/**
 * Combina el catálogo maestro con los ítems dinámicos de inventario del backend.
 * Asegura que ningún soporte esencial quede fuera y evita duplicados.
 */
export function mergeCatalogWithBackend(backendItems = []) {
  if (!Array.isArray(backendItems) || backendItems.length === 0) {
    return BRAVO_CORE_CATALOG
  }

  const coreMap = new Map(BRAVO_CORE_CATALOG.map(item => [item.name.toLowerCase().trim(), item]))
  const merged = [...BRAVO_CORE_CATALOG]

  backendItems.forEach(item => {
    const key = (item.name || '').toLowerCase().trim()
    if (!coreMap.has(key)) {
      let normalizedCat = (item.category || 'textil').toLowerCase()
      if (normalizedCat === 'mercancia' || normalizedCat === 'ropa') normalizedCat = 'textil'
      if (normalizedCat === 'tazas' || normalizedCat === 'mug') normalizedCat = 'ceramica'
      if (normalizedCat === 'termos' || normalizedCat === 'botellas') normalizedCat = 'acero'

      merged.push({
        id: item.id || `backend-${Math.random()}`,
        typeKey: item.device_type || 'Polera',
        name: item.name,
        category: normalizedCat,
        categoryLabel: normalizedCat.toUpperCase(),
        technique: item.technique || 'Estampado Personalizado',
        spec: item.brand || 'Personalización de Taller',
        price: Number(item.sale_price) || 8990,
        sale_price: Number(item.sale_price) || 8990,
        image_url: item.image_url || '/mockups/polera_front.png',
        badge: item.stock > 0 ? 'En Taller' : 'A Pedido',
        description: item.description || 'Soporte virgen disponible para personalización en taller.'
      })
    }
  })

  return merged
}
