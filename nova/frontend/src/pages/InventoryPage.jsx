import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Search, Package, AlertTriangle, X, TrendingUp, TrendingDown, Printer, Edit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getInventoryItems, createInventoryItem, updateInventoryItem } from '../api/inventory'
import AnimatedBackground from '../components/AnimatedBackground'
import JsBarcode from 'jsbarcode'
import api from '../api/client'

const inputClass = "w-full bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus:border-cyan-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
        {label} {required && <span className="text-cyan-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function NewItemModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', category: 'insumo', stock: 0, min_stock: 3, cost_price: '', sale_price: '', barcode: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createInventoryItem({
        ...form,
        stock: parseInt(form.stock) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        cost_price: parseFloat(form.cost_price),
        sale_price: parseFloat(form.sale_price),
        barcode: form.barcode.trim() || null,
      })
      onCreated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-950 border border-gray-800 rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Nuevo Producto</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre" required>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Pantalla Samsung S21"
              required
              className={inputClass}
            />
          </Field>

          <Field label="Código de Barras (Opcional)">
            <input
              value={form.barcode}
              onChange={e => setForm({ ...form, barcode: e.target.value })}
              placeholder="Escribe o escanea el código (ej. 750123456789)"
              className={inputClass}
            />
          </Field>

          <Field label="Categoría" required>
            <div className="grid grid-cols-2 gap-2">
              {['insumo', 'mercancia'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                    form.category === cat
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                      : 'border-gray-700/50 text-gray-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock inicial" required>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Stock mínimo" required>
              <input
                type="number"
                min="0"
                value={form.min_stock}
                onChange={e => setForm({ ...form, min_stock: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio costo" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                  required
                  className={`${inputClass} pl-7`}
                />
              </div>
            </Field>
            <Field label="Precio venta" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.sale_price}
                  onChange={e => setForm({ ...form, sale_price: e.target.value })}
                  required
                  className={`${inputClass} pl-7`}
                />
              </div>
            </Field>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))' }}
          >
            {loading ? 'Guardando...' : 'Crear Producto'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function EditStockModal({ item, onClose, onUpdated }) {
  const [stock, setStock] = useState(item.stock)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateInventoryItem(item.id, { stock: parseInt(stock) })
      onUpdated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-950 border border-gray-800 rounded-2xl p-6 w-full max-w-sm"
      >
        <h2 className="text-lg font-bold text-white mb-1">Ajustar Stock</h2>
        <p className="text-gray-500 text-sm mb-5">{item.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nuevo stock" required>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={e => setStock(e.target.value)}
              required
              className={inputClass}
              autoFocus
            />
          </Field>
          <div className="flex gap-2">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))' }}
            >
              {loading ? '...' : 'Guardar'}
            </motion.button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm text-gray-400 bg-gray-800/50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: item.name || '',
    category: item.category || 'insumo',
    stock: item.stock || 0,
    min_stock: item.min_stock || 3,
    cost_price: item.cost_price || '',
    sale_price: item.sale_price || '',
    barcode: item.barcode || ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updateInventoryItem(item.id, {
        ...form,
        stock: parseInt(form.stock) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        cost_price: parseFloat(form.cost_price),
        sale_price: parseFloat(form.sale_price),
        barcode: form.barcode.trim() || null
      })
      onUpdated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al actualizar el producto')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${item.name}" del inventario? Esta acción no se puede deshacer.`)) {
      setError('')
      setDeleting(true)
      try {
        await api.delete(`/inventory/${item.id}`)
        onUpdated()
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al eliminar el producto')
      } finally {
        setDeleting(false)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-950 border border-gray-800 rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Editar Producto</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Field label="Nombre" required>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Código de Barras (Opcional)">
            <input
              value={form.barcode}
              onChange={e => setForm({ ...form, barcode: e.target.value })}
              placeholder="750123456789 o vacío"
              className={inputClass}
            />
          </Field>

          <Field label="Categoría" required>
            <div className="grid grid-cols-2 gap-2">
              {['insumo', 'mercancia'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                    form.category === cat
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                      : 'border-gray-700/50 text-gray-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock actual" required>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Stock mínimo" required>
              <input
                type="number"
                min="0"
                value={form.min_stock}
                onChange={e => setForm({ ...form, min_stock: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio costo" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                  required
                  className={`${inputClass} pl-7`}
                />
              </div>
            </Field>
            <Field label="Precio venta" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.sale_price}
                  onChange={e => setForm({ ...form, sale_price: e.target.value })}
                  required
                  className={`${inputClass} pl-7`}
                />
              </div>
            </Field>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <motion.button
              type="submit"
              disabled={loading || deleting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))' }}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </motion.button>
            <button
              type="button"
              disabled={loading || deleting}
              onClick={handleDelete}
              className="px-4 py-3 rounded-xl text-sm font-bold text-red-400 border border-red-500/20 hover:bg-red-550 hover:bg-red-650 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {deleting ? '...' : 'Eliminar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}


export function printProductBarcode(item) {
  if (!item || !item.barcode) return

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(`
    <html>
      <head>
        <title>Imprimir Código de Barras</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 3mm 4mm;
            font-family: 'Inter', system-ui, sans-serif;
            background: white;
            color: black;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            width: 62mm;
            height: 29mm;
            overflow: hidden;
          }
          .title {
            font-size: 7.5px;
            font-weight: 900;
            letter-spacing: 0.02em;
            text-transform: uppercase;
            color: #000000;
            margin-bottom: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          .price {
            font-size: 12px;
            font-weight: 900;
            margin-bottom: 2px;
          }
          .barcode-box {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 26px;
          }
          #barcode {
            max-width: 100%;
            height: 26px;
          }
          .barcode-text {
            font-size: 7.5px;
            font-weight: 500;
            color: #374151;
            margin-top: 1px;
          }
        </style>
      </head>
      <body>
        <div class="title">${item.name}</div>
        <div class="price">$${Number(item.sale_price).toLocaleString('es-CL')}</div>
        <div class="barcode-box">
          <svg id="barcode"></svg>
        </div>
        <div class="barcode-text">${item.barcode}</div>
      </body>
    </html>
  `)
  doc.close()

  const svgEl = doc.getElementById('barcode')
  if (svgEl) {
    try {
      JsBarcode(svgEl, item.barcode, {
        format: 'CODE128',
        width: 1.3,
        height: 26,
        displayValue: false,
        margin: 0
      })
    } catch (e) {
      console.error('Error generando código de barras:', e)
    }
  }

  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('Error disparando la impresión:', e)
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      }, 1500)
    }
  }, 350)
}

export default function InventoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [fullEditingItem, setFullEditingItem] = useState(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = {}
      if (categoryFilter) params.category = categoryFilter
      if (showLowStock) params.low_stock = true
      const res = await getInventoryItems(params)
      setItems(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [categoryFilter, showLowStock])

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: items.length,
    lowStock: items.filter(i => i.stock <= i.min_stock).length,
    insumos: items.filter(i => i.category === 'insumo').length,
    mercancia: items.filter(i => i.category === 'mercancia').length,
    totalValue: items.reduce((sum, i) => sum + (i.stock * Number(i.sale_price)), 0),
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      <AnimatedBackground />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1
                className="text-xl font-black tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, var(--color-emerald-450), var(--color-cyan-400))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Inventario
              </h1>
              <p className="text-gray-600 text-xs">{items.length} productos registrados</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-emerald-450), var(--color-cyan-400))' }}
          >
            <Plus size={16} />
            Nuevo Producto
          </motion.button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total productos', value: stats.total, color: 'text-cyan-400' },
            { label: 'Stock bajo', value: stats.lowStock, color: 'text-red-400', icon: stats.lowStock > 0 ? AlertTriangle : null },
            { label: 'Insumos', value: stats.insumos, color: 'text-purple-400' },
            { label: 'Valor inventario', value: `$${stats.totalValue.toLocaleString('es-CL')}`, color: 'text-emerald-400' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4"
            >
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                {stat.icon && <stat.icon size={16} className={stat.color} />}
              </div>
              <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-6 flex-wrap"
        >
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex gap-2">
            {['', 'insumo', 'mercancia'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border capitalize ${
                  categoryFilter === cat && cat !== ''
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                    : cat === '' && categoryFilter === ''
                    ? 'bg-gray-700 border-gray-700 text-white'
                    : 'bg-gray-900/50 text-gray-500 border-gray-800/50'
                }`}
              >
                {cat === '' ? 'Todos' : cat}
              </button>
            ))}

            <button
              onClick={() => setShowLowStock(!showLowStock)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                showLowStock
                  ? 'bg-red-500/10 border-red-500/50 text-red-400'
                  : 'bg-gray-900/50 text-gray-500 border-gray-800/50'
              }`}
            >
              <AlertTriangle size={12} />
              Stock bajo
            </button>
          </div>
        </motion.div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-900/30 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Package size={48} className="mx-auto text-gray-800 mb-4" />
            <p className="text-gray-600">No hay productos</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((item, i) => {
                const isLow = item.stock <= item.min_stock
                const margin = ((Number(item.sale_price) - Number(item.cost_price)) / Number(item.cost_price) * 100)

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`bg-gray-900/40 backdrop-blur-sm border rounded-xl p-4 transition-all hover:bg-gray-900/60 ${
                      isLow ? 'border-red-500/30' : 'border-gray-800/50 hover:border-gray-700/70'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`shrink-0 w-2 h-2 rounded-full ${
                        item.category === 'insumo' ? 'bg-purple-400' : 'bg-emerald-400'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        <p className="text-gray-500 text-xs capitalize mt-0.5">{item.category}</p>
                      </div>

                      <button
                        onClick={() => setEditingItem(item)}
                        className={`shrink-0 text-right px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-800 ${
                          isLow ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        <p className="font-bold text-sm flex items-center gap-1 justify-end">
                          {isLow && <AlertTriangle size={11} />}
                          {item.stock}
                        </p>
                        <p className="text-gray-600 text-xs">min: {item.min_stock}</p>
                      </button>

                      {item.barcode && (
                        <div className="shrink-0 flex flex-col items-end justify-center w-28">
                          <span className="text-gray-400 font-mono text-[10px] bg-gray-950/40 px-1.5 py-0.5 rounded-md border border-gray-800/40 select-all">{item.barcode}</span>
                          <button
                            onClick={() => printProductBarcode(item)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] bg-gray-800 hover:bg-gray-750 text-cyan-300 font-semibold border border-cyan-500/10 hover:border-cyan-500/30 transition-all mt-1 cursor-pointer shadow-sm active:scale-95"
                            title="Imprimir etiqueta con código de barras"
                          >
                            <Printer size={10} />
                            Etiqueta
                          </button>
                        </div>
                      )}

                      <div className="shrink-0 text-right w-24">
                        <p className="text-sm font-semibold text-emerald-400">
                          ${Number(item.sale_price).toLocaleString('es-CL')}
                        </p>
                        <p className="text-gray-600 text-xs flex items-center gap-1 justify-end">
                          {margin >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {margin.toFixed(0)}%
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center justify-center pl-1">
                        <button
                          onClick={() => setFullEditingItem(item)}
                          className="p-2 bg-gray-900/60 hover:bg-gray-800/80 hover:text-cyan-300 text-gray-450 border border-gray-850 hover:border-cyan-500/20 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Editar detalles completos o eliminar producto"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showNewModal && (
          <NewItemModal
            onClose={() => setShowNewModal(false)}
            onCreated={() => { setShowNewModal(false); fetchItems() }}
          />
        )}
        {editingItem && (
          <EditStockModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onUpdated={() => { setEditingItem(null); fetchItems() }}
          />
        )}
        {fullEditingItem && (
          <EditItemModal
            item={fullEditingItem}
            onClose={() => setFullEditingItem(null)}
            onUpdated={() => { setFullEditingItem(null); fetchItems() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}