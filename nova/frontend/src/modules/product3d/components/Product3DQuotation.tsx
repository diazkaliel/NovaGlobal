import React, { useMemo } from 'react'
import {
  Calculator,
  FileDown,
  ShoppingCart,
  Percent,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import {
  DecalConfig,
  PricingQuoteBreakdown,
  PrintZone,
} from '../types/product3d.types'

interface Product3DQuotationProps {
  basePrice: number
  activeZone: PrintZone
  decals: DecalConfig[]
  selectedTechnique: string
  onSelectTechnique: (technique: string) => void
  quantity: number
  onChangeQuantity: (qty: number) => void
  onExportPdf?: () => void
  onSaveOrder?: () => void
  isSubmitting?: boolean
}

const TECHNIQUE_RATES: Record<string, { label: string; ratePerCm2: number; setupCost: number }> = {
  dtf: { label: 'DTF Full Color HD', ratePerCm2: 15, setupCost: 1500 },
  sublimacion: { label: 'Sublimación Premium', ratePerCm2: 12, setupCost: 1000 },
  vinilo: { label: 'Vinilo Textil / Corte', ratePerCm2: 18, setupCost: 2000 },
  serigrafia: { label: 'Serigrafía Tradicional', ratePerCm2: 8, setupCost: 5000 },
}

/**
 * Product3DQuotation — Panel reactivo de cotización industrial en tiempo real.
 *
 * Calcula el área física de impresión en cm² según la escala normalizada del decal,
 * aplica costos por técnica y evalúa descuentos por volumen escalonados.
 */
export const Product3DQuotation: React.FC<Product3DQuotationProps> = ({
  basePrice,
  activeZone,
  decals,
  selectedTechnique,
  onSelectTechnique,
  quantity,
  onChangeQuantity,
  onExportPdf,
  onSaveOrder,
  isSubmitting = false,
}) => {
  // ─── 1. Cálculo de Área en cm² y Costos de Estampa ───────────────────────────
  const quote: PricingQuoteBreakdown = useMemo(() => {
    const techData = TECHNIQUE_RATES[selectedTechnique] || TECHNIQUE_RATES.dtf

    let totalAreaCm2 = 0

    decals.forEach((decal) => {
      // El decal se escala proporcionalmente a la zona de impresión física
      const effectiveW = activeZone.maxWidthCm * decal.transform.scale
      const effectiveH = activeZone.maxHeightCm * decal.transform.scale
      totalAreaCm2 += effectiveW * effectiveH
    })

    // Costo de estampado unitario (área por tasa de técnica)
    const customizationCostPerUnit = Math.round(totalAreaCm2 * techData.ratePerCm2)

    // Descuento por tramos de volumen
    let volumeDiscountPct = 0
    if (quantity >= 50) volumeDiscountPct = 25
    else if (quantity >= 25) volumeDiscountPct = 15
    else if (quantity >= 10) volumeDiscountPct = 8

    const rawUnit = basePrice + customizationCostPerUnit
    const discountedUnit = Math.round(rawUnit * (1 - volumeDiscountPct / 100))
    const finalTotal = discountedUnit * quantity

    return {
      baseProductPrice: basePrice,
      customizationCost: customizationCostPerUnit,
      totalPrintAreaCm2: Number(totalAreaCm2.toFixed(1)),
      volumeDiscountPct,
      unitPrice: discountedUnit,
      finalTotal,
    }
  }, [basePrice, activeZone, decals, selectedTechnique, quantity])

  return (
    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Calculator className="w-5 h-5 text-amber-500" />
            <span>Cotizador Reactivo</span>
          </div>
          <span className="text-[11px] font-mono uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full">
            Industrial
          </span>
        </div>

        {/* Selector de Técnica de Impresión */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Técnica de Estampado</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TECHNIQUE_RATES).map(([key, data]) => {
              const isSelected = selectedTechnique === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectTechnique(key)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">{data.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">${data.ratePerCm2}/cm²</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selector de Cantidad con Tramos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Cantidad de Unidades
            </label>
            {quote.volumeDiscountPct > 0 && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Percent className="w-3 h-3" /> {quote.volumeDiscountPct}% OFF Volumen
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-2">
            <button
              type="button"
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors flex items-center justify-center text-lg"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="10000"
              value={quantity}
              onChange={(e) => onChangeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-transparent text-center font-bold text-white text-lg focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChangeQuantity(quantity + 1)}
              className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors flex items-center justify-center text-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Desglose de Precios */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Prenda / Producto Base:</span>
            <span className="text-white font-mono">${quote.baseProductPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Área Estampada Estimada:</span>
            <span className="text-amber-400 font-mono font-medium">{quote.totalPrintAreaCm2} cm²</span>
          </div>
          <div className="flex justify-between">
            <span>Costo de Estampado / un:</span>
            <span className="text-white font-mono">${quote.customizationCost.toLocaleString()}</span>
          </div>
          {quote.volumeDiscountPct > 0 && (
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>Descuento por Volumen:</span>
              <span>-{quote.volumeDiscountPct}%</span>
            </div>
          )}
          <div className="border-t border-zinc-800 pt-3 flex justify-between items-baseline">
            <span className="text-sm font-bold text-white">Precio Unitario Neto:</span>
            <span className="text-base font-bold text-amber-400 font-mono">
              ${quote.unitPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Total Final y Acciones */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-baseline px-1">
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Total Estimado ({quantity} un):</span>
          <span className="text-2xl font-black text-white font-mono">
            ${quote.finalTotal.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-medium text-xs flex items-center justify-center gap-2 transition-colors border border-zinc-700"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Ficha Técnica PDF</span>
            </button>
          )}

          {onSaveOrder && (
            <button
              type="button"
              onClick={onSaveOrder}
              disabled={isSubmitting}
              className="py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4 text-zinc-950" />
              <span>{isSubmitting ? 'Guardando...' : 'Pedir Muestra'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
