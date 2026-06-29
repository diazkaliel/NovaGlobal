import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Search, Smartphone, X, ChevronDown, ChevronUp, DollarSign, Percent, TrendingUp, Sparkles, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getScreenPrices, createScreenPrice, updateScreenPrice, deleteScreenPrice } from '../api/screenPrices'
import AnimatedBackground from '../components/AnimatedBackground'

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei']

const inputClass = "w-full bg-gray-950 border border-gray-800 hover:border-gray-700/80 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300 placeholder-gray-600 backdrop-blur-sm"

function Field({ label, required, children }) {
  return (
    <div className="text-left">
      <label className="text-gray-500 text-[10px] tracking-widest uppercase block mb-1.5 font-bold">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function ScreenModal({ onClose, onSaved, item }) {
  const isEdit = !!item
  const [form, setForm] = useState(() => {
    if (isEdit) {
      const isCustomBrand = !BRANDS.includes(item.brand)
      return {
        brand: isCustomBrand ? 'Otra' : item.brand,
        customBrand: isCustomBrand ? item.brand : '',
        model: item.model,
        cost_price: item.cost_price.toString(),
        sale_price: item.sale_price.toString()
      }
    }
    return {
      brand: 'Apple', customBrand: '', model: '', cost_price: '', sale_price: ''
    }
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const finalBrand = form.brand === 'Otra' ? form.customBrand.trim() : form.brand
    if (!finalBrand) {
      setError('Por favor especifica la marca.')
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
          cost_price: cost,
          sale_price: sale
        })
      } else {
        await createScreenPrice({
          brand: finalBrand,
          model: form.model.trim(),
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
              {isEdit ? 'Editar Pantalla' : 'Nueva Pantalla'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white hover:bg-gray-900 rounded-lg transition-all cursor-pointer border-none bg-transparent">
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
                  className="w-full bg-gray-950 border border-gray-850 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300 appearance-none cursor-pointer"
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
                  className={inputClass}
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
              className={inputClass}
            />
          </Field>

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
}
function ScreenCard({ item, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  // Cálculo de márgenes
  const cost = parseFloat(item.cost_price)
  const sale = parseFloat(item.sale_price)
  const profit = sale - cost
  const marginPercent = sale > 0 ? Math.round((profit / sale) * 100) : 0

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  }

  // Estilos responsivos de color por marca
  const getBrandColors = (brand) => {
    const b = brand.toLowerCase()
    if (b.includes('apple')) return {
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.08)]',
      glow: 'hover:shadow-[0_10px_20px_rgba(6,182,212,0.08)] hover:border-cyan-500/30',
      active: 'border-cyan-500 bg-cyan-950/5 shadow-[0_0_15px_rgba(6,182,212,0.12)]',
      progress: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
    }
    if (b.includes('samsung')) return {
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.08)]',
      glow: 'hover:shadow-[0_10px_20px_rgba(59,130,246,0.08)] hover:border-blue-500/30',
      active: 'border-blue-500 bg-blue-950/5 shadow-[0_0_15px_rgba(59,130,246,0.12)]',
      progress: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
    }
    if (b.includes('xiaomi')) return {
      badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.08)]',
      glow: 'hover:shadow-[0_10px_20px_rgba(249,115,22,0.08)] hover:border-orange-500/30',
      active: 'border-orange-500 bg-orange-950/5 shadow-[0_0_15px_rgba(249,115,22,0.12)]',
      progress: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
    }
    if (b.includes('motorola')) return {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]',
      glow: 'hover:shadow-[0_10px_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/30',
      active: 'border-emerald-500 bg-emerald-950/5 shadow-[0_0_15px_rgba(16,185,129,0.12)]',
      progress: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    }
    if (b.includes('huawei')) return {
      badge: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.08)]',
      glow: 'hover:shadow-[0_10px_20px_rgba(239,68,68,0.08)] hover:border-red-500/30',
      active: 'border-red-500 bg-red-950/5 shadow-[0_0_15px_rgba(239,68,68,0.12)]',
      progress: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    }
    return {
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.08)]',
      glow: 'hover:shadow-[0_10px_20px_rgba(168,85,247,0.08)] hover:border-purple-500/30',
      active: 'border-purple-500 bg-purple-955/5 shadow-[0_0_15px_rgba(168,85,247,0.12)]',
      progress: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
    }
  }

  const brandStyles = getBrandColors(item.brand)

  return (
    <motion.div 
      layout="position"
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`border rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${
        expanded 
          ? brandStyles.active 
          : `bg-gray-900/15 border-gray-900 ${brandStyles.glow}`
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Cabecera de Tarjeta */}
      <div className="p-5 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-bold border tracking-wider shrink-0 ${brandStyles.badge}`}>
              {item.brand}
            </span>
          </div>
          <h3 className="text-white font-extrabold text-[14px] mt-1.5 truncate" title={item.model}>{item.model}</h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[8px] text-gray-550 uppercase tracking-widest font-black">Cliente</p>
            <p className="text-cyan-400 font-black text-sm mt-0.5 tracking-tight">{formatCurrency(sale)}</p>
          </div>
          <div className="text-gray-500 bg-gray-950 p-1.5 rounded-lg border border-gray-850">
            {expanded ? <ChevronUp size={12} className="text-cyan-400" /> : <ChevronDown size={12} />}
          </div>
        </div>
      </div>

      {/* Detalle Desplegable */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-t border-gray-900/40 bg-gray-950/20"
          >
            <div className="p-4 grid grid-cols-3 gap-2 text-left">
              <div className="bg-gray-950 border border-gray-900 rounded-xl p-2.5">
                <p className="text-[8px] text-gray-550 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <DollarSign size={9} /> Costo
                </p>
                <p className="text-gray-300 font-bold text-xs tracking-tight">{formatCurrency(cost)}</p>
              </div>

              <div className="bg-gray-950 border border-gray-900 rounded-xl p-2.5">
                <p className="text-[8px] text-gray-550 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <DollarSign size={9} /> Utilidad
                </p>
                <p className="text-emerald-400 font-bold text-xs tracking-tight">+{formatCurrency(profit)}</p>
              </div>

              <div className="bg-gray-950 border border-gray-900 rounded-xl p-2.5">
                <p className="text-[8px] text-gray-550 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Percent size={9} /> Margen
                </p>
                <p className="text-purple-400 font-bold text-xs tracking-tight">{marginPercent}%</p>
              </div>

              {/* Progress bar de margen */}
              <div className="col-span-3 mt-2 pt-2.5 border-t border-gray-900/40">
                <div className="flex justify-between items-center text-[8px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">
                  <span>Rendimiento del Margen</span>
                  <span className="text-cyan-400 font-black">{marginPercent}%</span>
                </div>
                <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-600 ${brandStyles.progress}`} 
                    style={{ width: `${marginPercent}%` }} 
                  />
                </div>
              </div>

              {/* Acciones de Tarjeta */}
              <div className="col-span-3 mt-3 pt-3 border-t border-gray-900/40 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="px-3.5 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest border border-gray-800 bg-gray-950/40 text-gray-400 hover:text-white hover:border-gray-700 hover:bg-gray-900/50 transition-all cursor-pointer active:scale-95"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="px-3.5 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest border border-red-950/50 bg-red-950/10 text-red-400 hover:text-white hover:bg-red-900/40 hover:border-red-800 transition-all cursor-pointer active:scale-95"
                >
                  Eliminar
                </button>
              </div>

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

  // Calcular estadísticas simplificadas
  const totalModels = items.length
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

  // Filtrado de items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.model.toLowerCase().includes(search.toLowerCase()) || 
      item.brand.toLowerCase().includes(search.toLowerCase())
    
    const matchesBrand = selectedBrand === 'Todas' || item.brand.toLowerCase() === selectedBrand.toLowerCase()

    return matchesSearch && matchesBrand
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
        
        {/* Glow ambient blobs */}
        <div className="fixed top-0 left-1/4 w-[380px] h-[380px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[380px] h-[380px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header de navegación */}
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
            
            <div className="w-9" /> {/* Balance spacer */}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 relative z-10 text-center">
          
          {/* Tarjetas de Estadísticas KPI */}
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-gray-900/20 border border-gray-900 backdrop-blur-sm rounded-2xl p-5 text-left flex items-center justify-between shadow-md transition-all hover:translate-y-[-2px]"
              >
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Modelos</p>
                  <p className="text-2xl font-black text-white">{totalModels}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Pantallas en catálogo</p>
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
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Margen Promedio</p>
                  <p className="text-2xl font-black text-purple-400">{avgMargin}%</p>
                  <p className="text-[10px] text-gray-400 mt-1">Rentabilidad media</p>
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
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Ganancia Promedio</p>
                  <p className="text-2xl font-black text-emerald-400">+{formatCurrency(avgProfit)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Margen neto medio</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <TrendingUp size={18} />
                </div>
              </motion.div>
            </div>
          )}

          {/* Fila de Controles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar modelo o marca..."
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

          {/* Filtro Rápido de Marcas */}
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

          {/* Listado de Precios */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 border border-gray-900 rounded-3xl bg-gray-900/5 text-center">
              <Smartphone className="mx-auto text-gray-800 mb-3" size={32} />
              <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">No se encontraron precios registrados</p>
            </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {filteredItems.map(item => (
                <ScreenCard 
                  key={item.id} 
                  item={item} 
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </main>

         {/* Modal de Creación / Edición */}
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
