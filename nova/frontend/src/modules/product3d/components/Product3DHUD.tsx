import React from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Layers,
  Palette,
} from 'lucide-react'
import {
  CameraViewPresetKey,
  ProductColorOption,
} from '../types/product3d.types'

interface Product3DHUDProps {
  activeView: CameraViewPresetKey
  onSelectView: (view: CameraViewPresetKey) => void
  availableColors: ProductColorOption[]
  selectedColorHex: string
  onSelectColor: (hex: string) => void
  showGizmo: boolean
  onToggleGizmo: () => void
  onResetTransform: () => void
  onTakeSnapshot?: () => void
}

const VIEW_PRESETS: { key: CameraViewPresetKey; label: string }[] = [
  { key: 'front', label: 'Frente' },
  { key: 'back', label: 'Espalda' },
  { key: 'profile', label: 'Perfil 45°' },
  { key: 'detail', label: 'Detalle' },
  { key: 'top', label: 'Superior' },
]

/**
 * Product3DHUD — Interfaz flotante de control de estudio fotográfico.
 *
 * Permite cambiar el ángulo de cámara, seleccionar el color del producto,
 * alternar las guías del gizmo y restablecer transformaciones.
 */
export const Product3DHUD: React.FC<Product3DHUDProps> = ({
  activeView,
  onSelectView,
  availableColors,
  selectedColorHex,
  onSelectColor,
  showGizmo,
  onToggleGizmo,
  onResetTransform,
  onTakeSnapshot,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6 z-10">
      {/* ─── Barra Superior: Presets de Cámara y Herramientas ───────────── */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Selector de Ángulos de Cámara */}
        <div className="pointer-events-auto flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-1.5 shadow-2xl">
          <div className="px-2 py-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 border-r border-zinc-800 pr-3">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Vistas</span>
          </div>

          <div className="flex gap-1">
            {VIEW_PRESETS.map((preset) => {
              const isActive = activeView === preset.key
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => onSelectView(preset.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Herramientas Rápidas (Guías, Reset, Snapshot) */}
        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-1.5 shadow-2xl">
          <button
            type="button"
            onClick={onToggleGizmo}
            title={showGizmo ? 'Ocultar guías de edición' : 'Mostrar guías de edición'}
            className={`p-2 rounded-xl transition-all ${
              showGizmo
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            {showGizmo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onResetTransform}
            title="Restablecer posición del diseño"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onTakeSnapshot && (
            <button
              type="button"
              onClick={onTakeSnapshot}
              title="Capturar foto de estudio"
              className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all border border-amber-500/20"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Barra Inferior: Selector de Color del Producto ──────────────── */}
      <div className="pointer-events-auto self-center bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-2.5 shadow-2xl flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 pl-1 pr-2 border-r border-zinc-800">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Color Base:</span>
        </div>

        <div className="flex items-center gap-2">
          {availableColors.map((color) => {
            const isSelected = selectedColorHex.toLowerCase() === color.hex.toLowerCase()
            return (
              <button
                key={color.hex}
                type="button"
                onClick={() => onSelectColor(color.hex)}
                title={`${color.name} (${color.hex})`}
                className={`relative w-7 h-7 rounded-full border-2 transition-all transform hover:scale-115 ${
                  isSelected
                    ? 'border-amber-400 scale-110 shadow-lg shadow-amber-500/30'
                    : 'border-zinc-700 hover:border-zinc-400'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        color.hex.toLowerCase() === '#ffffff' ? 'bg-zinc-900' : 'bg-white'
                      }`}
                    />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
