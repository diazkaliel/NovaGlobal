import React, { useState, useCallback } from 'react'
import {
  GARMENT_CATALOG,
  GARMENT_ASSET_MAP,
  SVG_GARMENT_THUMBS,
  PRESET_ARTWORKS,
  PresetArtwork,
  GarmentType,
  GarmentView,
  GarmentDefinition,
} from '../../shared/garment-templates'

// Paleta de colores por defecto — cubrimos los colores más pedidos en DTF
const DEFAULT_COLORS = [
  { label: 'Negro',           hex: '#121212' },
  { label: 'Blanco',          hex: '#f5f5f5' },
  { label: 'Gris Carbón',     hex: '#374151' },
  { label: 'Navy',            hex: '#1e3a5f' },
  { label: 'Rojo Fuego',      hex: '#c0392b' },
  { label: 'Verde Musgo',     hex: '#2d6a4f' },
  { label: 'Camel',           hex: '#c19a6b' },
  { label: 'Cian Neon',       hex: '#00f0ff' },
]

interface GarmentCustomizerPanelProps {
  /** Tipo de prenda activo (controlled desde el padre) */
  activeType: GarmentType
  onTypeChange: (type: GarmentType) => void
  /** Vista activa: frente o espalda */
  activeView: GarmentView
  onViewChange: (view: GarmentView) => void
  /** Color hex seleccionado */
  colorHex: string
  onColorChange: (hex: string) => void
  /** Callback cuando el usuario selecciona un artwork preset */
  onArtworkSelect: (artwork: PresetArtwork) => void
}

/**
 * GarmentCustomizerPanel — Panel lateral del personalizador DTF.
 *
 * Responsabilidad única: presentar los controles de selección (prenda, vista, color,
 * artworks) y emitir eventos hacia el componente padre que orquesta el estado global.
 *
 * Por qué controlled component y no estado local:
 * El padre (simulador) necesita saber el estado actual para generar la orden de
 * producción DTF y sincronizarlo con el motor de cotización del backend.
 */
export const GarmentCustomizerPanel: React.FC<GarmentCustomizerPanelProps> = ({
  activeType,
  onTypeChange,
  activeView,
  onViewChange,
  colorHex,
  onColorChange,
  onArtworkSelect,
}) => {
  const [activeArtworkCategory, setActiveArtworkCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(PRESET_ARTWORKS.map((a) => a.category)))]

  const filteredArtworks = activeArtworkCategory === 'all'
    ? PRESET_ARTWORKS
    : PRESET_ARTWORKS.filter((a) => a.category === activeArtworkCategory)

  const activeGarment = GARMENT_CATALOG.find((g) => g.type === activeType)!

  return (
    <aside className="flex flex-col gap-5 w-full max-w-xs bg-neutral-900/80 backdrop-blur-sm border border-neutral-800/60 rounded-2xl p-5">

      {/* ── Selector de Prenda ── */}
      <section>
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          Prenda
        </h3>
        <div className="flex flex-col gap-2">
          {GARMENT_CATALOG.map((garment) => {
            const thumb = SVG_GARMENT_THUMBS[garment.type](colorHex)
            const isActive = garment.type === activeType
            return (
              <button
                key={garment.type}
                onClick={() => onTypeChange(garment.type)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-white/5 border-neutral-600 text-white'
                    : 'border-transparent text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                }`}
              >
                {/* Miniatura vectorial SVG inline */}
                <span
                  className="w-10 h-10 shrink-0 rounded-lg overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: thumb }}
                  aria-hidden="true"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium leading-tight truncate">{garment.label}</span>
                  <span className="text-[11px] text-neutral-500">{garment.weight}g/m²</span>
                </div>
                {isActive && (
                  <span className="ml-auto shrink-0 w-2 h-2 rounded-full bg-cyan-400" aria-label="Seleccionado" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Toggle Vista Frente / Espalda ── */}
      <section>
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          Vista
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(['front', 'back'] as GarmentView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                activeView === v
                  ? 'bg-neutral-700 border-neutral-500 text-white'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
              }`}
            >
              {v === 'front' ? 'Frente' : 'Espalda'}
            </button>
          ))}
        </div>
      </section>

      {/* ── Paleta de Color ── */}
      <section>
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          Color de Prenda
        </h3>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => onColorChange(c.hex)}
              title={c.label}
              className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                colorHex === c.hex ? 'border-white scale-110' : 'border-neutral-700'
              }`}
              style={{ backgroundColor: c.hex }}
              aria-label={`Color: ${c.label}${colorHex === c.hex ? ' (activo)' : ''}`}
            />
          ))}
          {/* Input libre para color personalizado */}
          <label
            className="w-8 h-8 rounded-full border-2 border-dashed border-neutral-600 flex items-center justify-center cursor-pointer hover:border-neutral-400 transition-colors"
            title="Color personalizado"
          >
            <span className="text-[10px] text-neutral-400">+</span>
            <input
              type="color"
              value={colorHex}
              onChange={(e) => onColorChange(e.target.value)}
              className="sr-only"
              aria-label="Seleccionar color personalizado"
            />
          </label>
        </div>
        {/* Hex display */}
        <p className="mt-2 text-xs font-mono text-neutral-500">{colorHex.toUpperCase()}</p>
      </section>

      {/* ── Biblioteca de Artworks ── */}
      <section className="flex-1 min-h-0">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          Diseños DTF
        </h3>

        {/* Filtro por categoría */}
        <div className="flex gap-1 flex-wrap mb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveArtworkCategory(cat)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeArtworkCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>

        {/* Grid de artworks */}
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700">
          {filteredArtworks.map((artwork) => (
            <button
              key={artwork.id}
              onClick={() => onArtworkSelect(artwork)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-white/5 hover:border-neutral-600 transition-all duration-150 group"
              title={artwork.name}
            >
              {/* Preview del artwork */}
              <div
                className="w-full h-16 rounded-lg overflow-hidden bg-neutral-950 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: artwork.svgContent ?? '' }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-neutral-400 group-hover:text-neutral-200 text-center leading-tight line-clamp-2 transition-colors">
                {artwork.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Footer: info de cotización ── */}
      <footer className="pt-3 border-t border-neutral-800">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{activeGarment.label}</span>
          <span className="font-mono text-neutral-400">
            ${activeGarment.basePrice.toLocaleString('es-CL')}
          </span>
        </div>
      </footer>
    </aside>
  )
}

export default GarmentCustomizerPanel
