/**
 * bravoPresets.js — Catálogo Oficial de Diseños y Variaciones Gráficas de Bravo
 *
 * Basado 100% en el logo oficial auténtico de Personalizaciones Bravo
 * (el artesano sosteniendo el farol de luz con orla dorada, banner de taller y tipografía BRAVO).
 *
 * Cada variante está procesada en alta definición PNG con transparencia para
 * garantizar que se estampe fielmente en el simulador y en la ficha de producción:
 * 1. Emblema Oficial Full Color
 * 2. Oro Taller & Ámbar (Realce Cálido de Alta Gama)
 * 3. Blanco Titanio (Monocromo para prendas oscuras)
 * 4. Semitono / Halftone Vintage (Trama serigráfica de puntos de taller)
 * 5. Dúo-Tono Neón (Cian Eléctrico & Fuego)
 * 6. Stealth Carbón & Grafito (Gris táctico para prendas claras)
 * 7. Sepia & Cobre Vintage (Grabado editorial clásico)
 */

export const BRAVO_PRESETS = [
  {
    id: 'bravo-emblema-oficial',
    name: 'Logo Bravo Oficial (Full Color)',
    category: 'Oficial / Autor',
    imageUrl: '/assets/brand/bravo_medallon_oficial.png',
    defaultScale: 1.0,
    suggestedPosition: 'pecho_centro',
    suggestedSize: 'A4'
  },
  {
    id: 'bravo-oro-taller',
    name: 'Logo Bravo Oro & Ámbar',
    category: 'Taller / Dorado',
    imageUrl: '/assets/brand/bravo_medallon_oro.png',
    defaultScale: 1.0,
    suggestedPosition: 'pecho_centro',
    suggestedSize: 'A4'
  },
  {
    id: 'bravo-blanco-minimal',
    name: 'Logo Bravo Blanco Titanio',
    category: 'Monocromo / DTF',
    imageUrl: '/assets/brand/bravo_medallon_blanco.png',
    defaultScale: 1.0,
    suggestedPosition: 'pecho_centro',
    suggestedSize: 'A4'
  },
  {
    id: 'bravo-semitono-vintage',
    name: 'Logo Bravo Semitono (Halftone)',
    category: 'Semitono / Serigrafía',
    imageUrl: '/assets/brand/bravo_medallon_semitono.png',
    defaultScale: 1.0,
    suggestedPosition: 'pecho_centro',
    suggestedSize: 'A4'
  },
  {
    id: 'bravo-duotono-neon',
    name: 'Logo Bravo Dúo-Tono Neón',
    category: 'Streetwear / Cyber',
    imageUrl: '/assets/brand/bravo_medallon_duotono.png',
    defaultScale: 1.05,
    suggestedPosition: 'espalda_completa',
    suggestedSize: 'A3'
  },
  {
    id: 'bravo-stealth-carbon',
    name: 'Logo Bravo Stealth Carbón',
    category: 'Táctico / Monocromo',
    imageUrl: '/assets/brand/bravo_medallon_stealth.png',
    defaultScale: 1.0,
    suggestedPosition: 'pecho_centro',
    suggestedSize: 'A4'
  },
  {
    id: 'bravo-sepia-vintage',
    name: 'Logo Bravo Sepia & Cobre',
    category: 'Grabado / Vintage',
    imageUrl: '/assets/brand/bravo_medallon_sepia.png',
    defaultScale: 1.0,
    suggestedPosition: 'pecho_centro',
    suggestedSize: 'A4'
  }
]
