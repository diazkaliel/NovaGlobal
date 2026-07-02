import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Search, Smartphone, X, ChevronDown, ChevronUp, DollarSign, Percent, TrendingUp, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getScreenPrices, createScreenPrice, updateScreenPrice, deleteScreenPrice } from '../api/screenPrices'
import AnimatedBackground from '../components/AnimatedBackground'

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei']
const QUALITIES = ['Original', 'In-Cell', 'OLED', 'Alternativa']

const inputClass = "w-full bg-gray-950 border border-gray-800 hover:border-gray-700/80 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300 placeholder-gray-600 backdrop-blur-sm"

function Field({ label, required, children }) {
  return (
    <div className="text-left">
      <label className="text-gray-550 text-[10px] tracking-widest uppercase block mb-1.5 font-bold">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function ScreenModal({ onClose, onSaved, item }) {
  const isEdit = !!item && !!item.id
  const isPrefill = !!item && !item.id
  const [form, setForm] = useState(() => {
    if (isEdit || isPrefill) {
      const isCustomBrand = !BRANDS.includes(item.brand)
      const isCustomQuality = isEdit ? !QUALITIES.includes(item.quality || 'Original') : false
      return {
        brand: isCustomBrand ? 'Otra' : item.brand,
        customBrand: isCustomBrand ? item.brand : '',
        model: item.model,
        quality: isEdit ? (isCustomQuality ? 'Otra' : (item.quality || 'Original')) : 'Original',
        customQuality: isEdit && isCustomQuality ? (item.quality || '') : '',
        cost_price: isEdit ? item.cost_price.toString() : '',
        sale_price: isEdit ? item.sale_price.toString() : ''
      }
    }
    return {
      brand: 'Apple', customBrand: '', model: '', quality: 'Original', customQuality: '', cost_price: '', sale_price: ''
    }
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const finalBrand = form.brand === 'Otra' ? form.customBrand.trim() : form.brand
    const finalQuality = form.quality === 'Otra' ? form.customQuality.trim() : form.quality
    if (!finalBrand) {
      setError('Por favor especifica la marca.')
      setLoading(false)
      return
    }
    if (!finalQuality) {
      setError('Por favor especifica la calidad.')
      setLoading(false)
      return
    }

    const cost = parseFloat(form.cost_price)
    const sale = parseFloat(form.sale_price)

    if (isNaN(cost) || cost <= 0) {
      setError('El precio costo debe ser un número positivo.')
      setLoading(false)
      return
    }

    if (isNaN(sale) || sale <= 0) {
      setError('El precio cliente debe ser un número positivo.')
      setLoading(false)
      return
    }

    if (sale < cost) {
      setError('El precio cliente no puede ser menor al precio costo.')
      setLoading(false)
      return
    }

    try {
      if (isEdit) {
        await updateScreenPrice(item.id, {
          brand: finalBrand,
          model: form.model.trim(),
          quality: finalQuality,
          cost_price: cost,
          sale_price: sale
        })
      } else {
        await createScreenPrice({
          brand: finalBrand,
          model: form.model.trim(),
          quality: finalQuality,
          cost_price: cost,
          sale_price: sale
        })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar los precios de la pantalla.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0c0d12] border border-gray-850 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />
        
        <div className="flex items-center justify-between mb-6 text-left">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-cyan-400 animate-pulse" />
            <h2 className="text-sm font-extrabold text-white tracking-widest uppercase">
              {isEdit ? 'Editar Pantalla' : (isPrefill ? 'Nueva Alternativa' : 'Nueva Pantalla')}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-550 hover:text-white hover:bg-gray-900 rounded-lg transition-all cursor-pointer border-none bg-transparent">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl mb-4 text-left flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" required>
              <div className="relative">
                <select
                  value={form.brand}
                  onChange={e => setForm({ ...form, brand: e.target.value })}
                  disabled={isEdit || isPrefill}
                  className="w-full bg-gray-950 border border-gray-850 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {BRANDS.map(b => (
                    <option key={b} value={b} className="bg-gray-950">{b}</option>
                  ))}
                  <option value="Otra" className="bg-gray-950">Otra / Manual</option>
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </Field>

            {form.brand === 'Otra' && (
              <Field label="Especificar Marca" required>
                <input
                  value={form.customBrand}
                  onChange={e => setForm({ ...form, customBrand: e.target.value })}
                  placeholder="Ej: OnePlus"
                  required
                  disabled={isEdit || isPrefill}
                  className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                />
              </Field>
            )}
          </div>

          <Field label="Modelo" required>
            <input
              value={form.model}
              onChange={e => setForm({ ...form, model: e.target.value })}
              placeholder="Ej: iPhone 14 Pro Max"
              required
              disabled={isEdit || isPrefill}
              className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Calidad" required>
              <div className="relative">
                <select
                  value={form.quality}
                  onChange={e => setForm({ ...form, quality: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-850 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300 appearance-none cursor-pointer"
                >
                  {QUALITIES.map(q => (
                    <option key={q} value={q} className="bg-gray-950">{q}</option>
                  ))}
                  <option value="Otra" className="bg-gray-950">Otra / Manual</option>
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-550 pointer-events-none" />
              </div>
            </Field>

            {form.quality === 'Otra' && (
              <Field label="Especificar Calidad" required>
                <input
                  value={form.customQuality}
                  onChange={e => setForm({ ...form, customQuality: e.target.value })}
                  placeholder="Ej: OLED Incell"
                  required
                  className={inputClass}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio Costo" required>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="number"
                  step="0.01"
                  value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                  placeholder="45000"
                  required
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>

            <Field label="Precio Venta" required>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="number"
                  step="0.01"
                  value={form.sale_price}
                  onChange={e => setForm({ ...form, sale_price: e.target.value })}
                  placeholder="89000"
                  required
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black font-extrabold py-3 rounded-xl text-xs tracking-widest uppercase mt-4 shadow-lg shadow-cyan-950/20 disabled:opacity-50 cursor-pointer transition-all border-none"
          >
            {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Agregar Pantalla')}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}function ScreenCard({ group, onEdit, onDelete, onAddVariant }) {
  const [expanded, setExpanded] = useState(false)

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(val)
  }

  // Estilos responsivos de color por marca con efectos de brillo
  const getBrandColors = (brand) => {
    const b = brand.toLowerCase()
    if (b.includes('apple')) return {
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.08)]',
      glow: 'hover:shadow-[0_8px_20px_-4px_rgba(6,182,212,0.08)] hover:border-cyan-500/15',
      active: 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/10 to-transparent shadow-[0_12px_30px_-8px_rgba(6,182,212,0.12)] backdrop-blur-xl',
      hex: '#22d3ee'
    }
    if (b.includes('samsung')) return {
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.08)]',
      glow: 'hover:shadow-[0_8px_20px_-4px_rgba(59,130,246,0.08)] hover:border-blue-500/15',
      active: 'border-blue-500/30 bg-gradient-to-b from-blue-950/10 to-transparent shadow-[0_12px_30px_-8px_rgba(59,130,246,0.12)] backdrop-blur-xl',
      hex: '#60a5fa'
    }
    if (b.includes('xiaomi')) return {
      badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.08)]',
      glow: 'hover:shadow-[0_8px_20px_-4px_rgba(249,115,22,0.08)] hover:border-orange-500/15',
      active: 'border-orange-500/30 bg-gradient-to-b from-orange-950/10 to-transparent shadow-[0_12px_30px_-8px_rgba(249,115,22,0.12)] backdrop-blur-xl',
      hex: '#fb923c'
    }
    if (b.includes('motorola')) return {
      badge: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]',
      glow: 'hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.08)] hover:border-emerald-500/15',
      active: 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/10 to-transparent shadow-[0_12px_30px_-8px_rgba(16,185,129,0.12)] backdrop-blur-xl',
      hex: '#34d399'
    }
    if (b.includes('huawei')) return {
      badge: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.08)]',
      glow: 'hover:shadow-[0_8px_20px_-4px_rgba(239,68,68,0.08)] hover:border-red-500/15',
      active: 'border-red-500/30 bg-gradient-to-b from-red-955/10 to-transparent shadow-[0_12px_30px_-8px_rgba(239,68,68,0.12)] backdrop-blur-xl',
      hex: '#f87171'
    }
    return {
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.08)]',
      glow: 'hover:shadow-[0_8px_20px_-4px_rgba(168,85,247,0.08)] hover:border-purple-500/15',
      active: 'border-purple-500/30 bg-gradient-to-b from-purple-955/10 to-transparent shadow-[0_12px_30px_-8px_rgba(168,85,247,0.12)] backdrop-blur-xl',
      hex: '#c084fc'
    }
  }

  const brandStyles = getBrandColors(group.brand)

  // Rango de precios para el header
  const sales = group.variants.map(v => parseFloat(v.sale_price))
  const minSale = Math.min(...sales)
  const maxSale = Math.max(...sales)
  const priceDisplay = group.variants.length > 1
    ? (minSale === maxSale ? formatCurrency(minSale) : `${formatCurrency(minSale)} - ${formatCurrency(maxSale)}`)
    : formatCurrency(group.variants[0].sale_price)

  return (
    <motion.div 
      layout="position"
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`border rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col backdrop-blur-md ${
        expanded 
          ? brandStyles.active 
          : `bg-gray-950/20 border-gray-900/60 ${brandStyles.glow}`
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Cabecera de Tarjeta */}
      <div className="p-4 md:p-5 flex items-center justify-between gap-3 select-none">
        <div className="flex flex-col gap-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-lg text-[8px] uppercase font-black border tracking-wider shrink-0 ${brandStyles.badge}`}>
              {group.brand}
            </span>
          </div>
          <h3 className="text-white font-extrabold text-[14px] tracking-tight mt-1 truncate" title={group.model}>{group.model}</h3>
        </div>

        <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
          <div className="text-right">
            <p className="text-[7.5px] text-gray-550 uppercase tracking-widest font-black">Venta</p>
            <p className="text-cyan-400 font-mono font-black text-xs md:text-sm mt-0.5 tracking-tight">{priceDisplay}</p>
          </div>
          <button
            type="button"
            onClick={() => onAddVariant(group.brand, group.model)}
            title="Agregar otra calidad para este modelo"
            className="w-7 h-7 border border-gray-800 hover:border-cyan-400/50 bg-gray-900/40 text-gray-400 hover:text-cyan-400 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
          >
            <Plus size={12} className="stroke-[3]" />
          </button>
          <div 
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 bg-gray-900/45 p-1.5 rounded-lg border border-gray-850 transition-colors hover:text-white cursor-pointer"
          >
            {expanded ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} />}
          </div>
        </div>
      </div>

      {/* Chips de calidades disponibles (Solo visible cuando NO está expandido) */}
      {!expanded && (
        <div className="px-5 pb-4 pt-0.5 flex flex-wrap gap-1 select-none text-left">
          {group.variants.map((v) => (
            <span 
              key={v.id} 
              className="px-1.5 py-0.5 rounded-md bg-gray-900/30 border text-[8px] font-bold uppercase tracking-wider font-mono"
              style={{ 
                color: brandStyles.hex,
                borderColor: `${brandStyles.hex}15`
              }}
            >
              {v.quality}
            </span>
          ))}
        </div>
      )}

      {/* Detalle Desplegable */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="border-t border-gray-900/80 bg-gray-950/40"
          >
            <div className="p-3 space-y-2">
              {group.variants.map((variant) => {
                const cost = parseFloat(variant.cost_price)
                const sale = parseFloat(variant.sale_price)
                const profit = sale - cost
                const marginPercent = sale > 0 ? Math.round((profit / sale) * 100) : 0

                return (
                  <div 
                    key={variant.id} 
                    className="relative bg-gray-900/20 border border-gray-900/60 hover:border-gray-850 hover:bg-gray-900/40 rounded-xl p-3 text-left transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-hidden"
                  >
                    {/* Indicador de acento izquierdo */}
                    <div 
                      className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-md"
                      style={{ backgroundColor: brandStyles.hex }}
                    />

                    {/* Calidad & Margen */}
                    <div className="pl-2 flex flex-col justify-center min-w-[100px]">
                      <span className="text-gray-200 font-black text-xs uppercase tracking-wider font-mono">
                        {variant.quality || 'Original'}
                      </span>
                      <span className="text-gray-500 text-[9px] font-semibold mt-0.5 uppercase tracking-wider flex items-center gap-1">
                        Margen: 
                        <span className={profit >= 0 ? "text-emerald-450 font-bold" : "text-rose-400 font-bold"}>
                          {marginPercent}%
                        </span>
                      </span>
                    </div>

                    {/* Ficha Financiera Horizontal */}
                    <div className="grid grid-cols-3 gap-2 flex-1 max-w-sm pl-2 md:pl-0">
                      <div className="bg-gray-950/60 border border-gray-900/80 rounded-lg px-2.5 py-1.5 text-left">
                        <p className="text-[7px] text-gray-500 uppercase tracking-widest font-black">Costo</p>
                        <p className="text-gray-400 font-mono font-bold text-[10px] tracking-tight mt-0.5">{formatCurrency(cost)}</p>
                      </div>

                      <div className="bg-gray-950/60 border border-gray-900/80 rounded-lg px-2.5 py-1.5 text-left">
                        <p className="text-[7px] text-gray-550 uppercase tracking-widest font-black">Venta</p>
                        <p className="text-cyan-400 font-mono font-bold text-[10px] tracking-tight mt-0.5">{formatCurrency(sale)}</p>
                      </div>

                      <div className="bg-gray-950/60 border border-gray-900/80 rounded-lg px-2.5 py-1.5 text-left">
                        <p className="text-[7px] text-gray-555 uppercase tracking-widest font-black">Utilidad</p>
                        <p className="text-emerald-450 font-mono font-bold text-[10px] tracking-tight mt-0.5">+{formatCurrency(profit)}</p>
                      </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex md:flex-col items-center justify-end gap-1.5 pt-2 md:pt-0 pl-2 md:pl-0 border-t border-gray-900/60 md:border-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onEdit(variant)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-gray-850 hover:border-cyan-500/20 transition-all cursor-pointer active:scale-95"
                        title="Editar alternativa"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(variant)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-gray-850 hover:border-red-500/20 transition-all cursor-pointer active:scale-95"
                        title="Eliminar alternativa"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ScreenPricesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('Todas')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const fetchPrices = async () => {
    try {
      setLoading(true)
      const data = await getScreenPrices()
      setItems(data.data)
    } catch (err) {
      console.error('Error fetching screen prices:', err)
    } finally {
      setLoading(false)
    }
  }

  const onEdit = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const onAddVariant = (brand, model) => {
    setEditingItem({ brand, model })
    setShowModal(true)
  }

  const onDelete = async (item) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la pantalla ${item.brand} ${item.model}?`)) {
      try {
        await deleteScreenPrice(item.id)
        fetchPrices()
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar la pantalla.')
      }
    }
  }

  useEffect(() => {
    fetchPrices()
  }, [])

  const totalModels = new Set(items.map(item => `${item.brand}::${item.model}`.toLowerCase())).size
  const validItems = items.filter(item => parseFloat(item.sale_price) > 0)
  const avgProfit = validItems.length > 0 
    ? Math.round(validItems.reduce((acc, item) => acc + (parseFloat(item.sale_price) - parseFloat(item.cost_price)), 0) / validItems.length)
    : 0
  const avgMargin = validItems.length > 0 
    ? Math.round(validItems.reduce((acc, item) => {
        const sale = parseFloat(item.sale_price)
        const cost = parseFloat(item.cost_price)
        return acc + ((sale - cost) / sale * 100)
      }, 0) / validItems.length)
    : 0

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.model.toLowerCase().includes(search.toLowerCase()) || 
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      (item.quality && item.quality.toLowerCase().includes(search.toLowerCase()))
    
    const matchesBrand = selectedBrand === 'Todas'
      ? true
      : selectedBrand === 'Otras'
        ? !BRANDS.includes(item.brand)
        : item.brand.toLowerCase() === selectedBrand.toLowerCase()

    return matchesSearch && matchesBrand
  })

  const groupedItems = []
  filteredItems.forEach(item => {
    const keyBrand = item.brand.trim()
    const keyModel = item.model.trim()
    const existingGroup = groupedItems.find(
      g => g.brand.toLowerCase() === keyBrand.toLowerCase() && 
           g.model.toLowerCase() === keyModel.toLowerCase()
    )
    if (existingGroup) {
      existingGroup.variants.push(item)
    } else {
      groupedItems.push({
        brand: keyBrand,
        model: keyModel,
        variants: [item]
      })
    }
  })

  groupedItems.forEach(g => {
    g.variants.sort((a, b) => (a.quality || '').localeCompare(b.quality || ''))
  })

  return (
    <>
      <style>{`
        .screens-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        
        .custom-scroll::-webkit-scrollbar {
          height: 3px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9px;
        }
      `}</style>

      <div className="screens-page">
        <AnimatedBackground />
        
        <div className="fixed top-0 left-1/4 w-[380px] h-[380px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[380px] h-[380px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <header className="relative z-10 border-b border-gray-900/40 backdrop-blur-xl bg-gray-950/40 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-9 h-9 border border-gray-800/60 rounded-xl bg-gray-950/40 text-gray-400 hover:text-white hover:border-gray-700/80 flex items-center justify-center cursor-pointer transition-all" 
              title="Volver al inicio"
            >
              <ArrowLeft size={16} />
            </button>
            
            <div className="text-center">
              <h1 className="text-sm font-extrabold tracking-widest text-gray-300 uppercase flex items-center justify-center gap-2">
                <Smartphone size={16} className="text-cyan-400 animate-pulse" /> Consulta de Pantallas
              </h1>
              <p className="text-gray-500 text-[9px] uppercase tracking-widest mt-0.5 font-bold">Catálogo de valores</p>
            </div>
            
            <div className="w-9" />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 relative z-10 text-center">
          
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-gray-900/20 border border-gray-900 backdrop-blur-sm rounded-2xl p-5 text-left flex items-center justify-between shadow-md transition-all hover:translate-y-[-2px]"
              >
                <div>
                  <p className="text-[10px] text-gray-550 uppercase tracking-widest font-black mb-1">Total Modelos</p>
                  <p className="text-2xl font-black text-white">{totalModels}</p>
                  <p className="text-[10px] text-gray-455 mt-1">Dispositivos en catálogo</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Smartphone size={18} />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-900/20 border border-gray-900 backdrop-blur-sm rounded-2xl p-5 text-left flex items-center justify-between shadow-md transition-all hover:translate-y-[-2px]"
              >
                <div>
                  <p className="text-[10px] text-gray-555 uppercase tracking-widest font-black mb-1">Margen Promedio</p>
                  <p className="text-2xl font-black text-purple-400">{avgMargin}%</p>
                  <p className="text-[10px] text-gray-455 mt-1">Rentabilidad media</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Percent size={16} />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-gray-900/20 border border-gray-900 backdrop-blur-sm rounded-2xl p-5 text-left flex items-center justify-between shadow-md transition-all hover:translate-y-[-2px]"
              >
                <div>
                  <p className="text-[10px] text-gray-555 uppercase tracking-widest font-black mb-1">Ganancia Promedio</p>
                  <p className="text-2xl font-black text-emerald-400">+{formatCurrency(avgProfit)}</p>
                  <p className="text-[10px] text-gray-455 mt-1">Margen neto medio</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-450 shrink-0">
                  <TrendingUp size={18} />
                </div>
              </motion.div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-550" size={14} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar modelo, marca o calidad..."
                className="w-full bg-gray-900/40 border border-gray-800 hover:border-gray-700/80 focus:border-cyan-500/50 focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-200 transition-all placeholder-gray-500 backdrop-blur-sm"
              />
            </div>
            
             <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setEditingItem(null)
                setShowModal(true)
              }}
              className="bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/20 shrink-0 w-full sm:w-auto cursor-pointer border-none transition-all"
            >
              <Plus size={14} className="stroke-[3]" /> Agregar Pantalla
            </motion.button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 custom-scroll justify-start md:justify-center px-1">
            {['Todas', ...BRANDS, 'Otras'].map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all duration-300 shrink-0 cursor-pointer ${
                  selectedBrand === brand
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-transparent border-gray-900 text-gray-500 hover:text-gray-400 hover:border-gray-800'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 border border-gray-900 rounded-3xl bg-gray-900/5 text-center">
              <Smartphone className="mx-auto text-gray-850 mb-3" size={32} />
              <p className="text-gray-550 text-xs uppercase tracking-wider font-semibold">No se encontraron precios registrados</p>
            </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {groupedItems.map(group => (
                <ScreenCard 
                  key={`${group.brand}-${group.model}`} 
                  group={group} 
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddVariant={onAddVariant}
                />
              ))}
            </div>
          )}
        </main>

        <AnimatePresence>
          {showModal && (
            <ScreenModal 
              item={editingItem}
              onClose={() => {
                setShowModal(false)
                setEditingItem(null)
              }} 
              onSaved={() => {
                setShowModal(false)
                setEditingItem(null)
                fetchPrices()
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
