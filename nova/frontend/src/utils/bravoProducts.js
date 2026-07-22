/**
 * bravoProducts.js — Configuración centralizada de productos para Bravo
 * 
 * Este archivo unifica:
 * - IDs del formulario de nueva orden
 * - Labels en español
 * - Íconos de Lucide React
 * - Mapeo al simulador de mockup (PRODUCT_CONFIG keys)
 * - Técnicas de estampado compatibles por producto
 * - Descripciones para el selector
 * 
 * Importar en BravoNewOrderPage, Bravo3DSimulator, y cualquier lugar
 * donde se necesite la lista de productos.
 */

import {
  Shirt, Coffee, Crown, Wine, Tag, Box,
  ShoppingBag, Puzzle, Beer, Footprints
} from 'lucide-react'

// ─── Catálogo completo de productos personalizables ───────────────────────────
export const BASE_PRODUCTS = [
  {
    id: 'polera',
    label: 'Polera',
    icon: Shirt,
    iconColor: 'text-amber-400',
    desc: 'DTF textil, sublimación o vinilo en poleras',
    simulatorKey: 'Polera',
    techniques: ['vinilo', 'sublimacion', 'dtf_textil', 'serigrafia'],
  },
  {
    id: 'poleron',
    label: 'Polerón',
    icon: Shirt,
    iconColor: 'text-orange-400',
    desc: 'DTF textil en prendas de abrigo y polerones',
    simulatorKey: 'Polerón',
    techniques: ['vinilo', 'dtf_textil', 'serigrafia'],
  },
  {
    id: 'pantalon',
    label: 'Pantalón / Jogger',
    icon: Footprints,
    iconColor: 'text-rose-400',
    desc: 'DTF textil en pantalones, joggers y ropa inferior',
    simulatorKey: null, // Sin mockup todavía
    techniques: ['vinilo', 'dtf_textil'],
  },
  {
    id: 'tazon',
    label: 'Tazón / Mug',
    icon: Coffee,
    iconColor: 'text-yellow-400',
    desc: 'Sublimación en tazones cerámicos y mugs',
    simulatorKey: 'Tazón',
    techniques: ['sublimacion'],
  },
  {
    id: 'jockey',
    label: 'Jockey / Gorro',
    icon: Crown,
    iconColor: 'text-emerald-400',
    desc: 'DTF, vinilo o bordado en gorras y jockeys',
    simulatorKey: 'Jockey',
    techniques: ['vinilo', 'dtf_textil', 'dtf_uv'],
  },
  {
    id: 'botella',
    label: 'Botella / Termo',
    icon: Wine,
    iconColor: 'text-cyan-400',
    desc: 'DTF UV o grabado en termos y botellas',
    simulatorKey: 'Termo',
    techniques: ['dtf_uv', 'sublimacion'],
  },
  {
    id: 'chopero',
    label: 'Chopero',
    icon: Beer,
    iconColor: 'text-amber-300',
    desc: 'Sublimación en vasos choperos y jarras',
    simulatorKey: 'Chopero',
    techniques: ['sublimacion'],
  },
  {
    id: 'totebag',
    label: 'Totebag / Bolso',
    icon: ShoppingBag,
    iconColor: 'text-violet-400',
    desc: 'DTF textil en bolsos de tela y totebags',
    simulatorKey: 'Totebag',
    techniques: ['vinilo', 'dtf_textil', 'serigrafia'],
  },
  {
    id: 'puzle',
    label: 'Puzzle',
    icon: Puzzle,
    iconColor: 'text-pink-400',
    desc: 'Sublimación en rompecabezas personalizados',
    simulatorKey: 'Puzle',
    techniques: ['sublimacion'],
  },
  {
    id: 'sticker',
    label: 'Stickers / Adhesivos',
    icon: Tag,
    iconColor: 'text-lime-400',
    desc: 'DTF UV de alta resistencia para rígidos y stickers',
    simulatorKey: null, // No aplica mockup
    techniques: ['dtf_uv'],
  },
  {
    id: 'otro',
    label: 'Otro Objeto',
    icon: Box,
    iconColor: 'text-stone-400',
    desc: 'Artículos especiales y personalizaciones varias',
    simulatorKey: null,
    techniques: ['vinilo', 'sublimacion', 'dtf_textil', 'dtf_uv', 'serigrafia'],
  },
]

// ─── Técnicas de estampado ────────────────────────────────────────────────────
export const PRINT_TECHNIQUES = [
  { id: 'dtf_textil', label: 'DTF Textil', desc: 'Impresión digital a todo color de alta durabilidad en prendas' },
  { id: 'dtf_uv', label: 'DTF UV', desc: 'Adhesivos curados con UV de alta resistencia para rígidos y stickers' },
  { id: 'sublimacion', label: 'Sublimación', desc: 'Para tazones o poleras de poliéster blanco con full color' },
  { id: 'vinilo', label: 'Vinilo Textil', desc: 'Ideal para siluetas simples y nombres de un solo color' },
  { id: 'serigrafia', label: 'Serigrafía', desc: 'Producción en masa para logos y diseños planos' },
]

// ─── Mapeo de ID del formulario → Clave del simulador ─────────────────────────
// El simulador de mockup usa claves con tildes y mayúscula.
// Este mapeo conecta los IDs planos del formulario con las claves del simulador.
export const SIMULATOR_KEY_MAP = {}
BASE_PRODUCTS.forEach(p => {
  if (p.simulatorKey) {
    SIMULATOR_KEY_MAP[p.id] = p.simulatorKey
  }
})

// ─── Función utilitaria ───────────────────────────────────────────────────────
export function getProductById(id) {
  return BASE_PRODUCTS.find(p => p.id === id) || BASE_PRODUCTS[BASE_PRODUCTS.length - 1]
}

export function getSimulatorKey(productId) {
  return SIMULATOR_KEY_MAP[productId] || null
}
