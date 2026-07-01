import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Package, AlertTriangle, X, TrendingUp, TrendingDown, Image as ImageIcon, Trash2, Edit, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import { parseError } from '../../utils/errors'
import api from '../../api/client'

const inputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all placeholder-stone-400"

function Field({ label, required, children }) {
  return (
    <div className="text-left">
      <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold">
        {label} {required && <span className="text-bravo-accent font-black">*</span>}
      </label>
      {children}
    </div>
  )
}

function ProductModal({ item, onClose, onUpdated }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'insumo',
    stock: item?.stock !== undefined ? item.stock : 0,
    min_stock: item?.min_stock !== undefined ? item.min_stock : 5,
    cost_price: item?.cost_price || '',
    sale_price: item?.sale_price || '',
    image_url: item?.image_url || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!item

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/inventory/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setForm(prev => ({ ...prev, image_url: res.data.url }))
    } catch (err) {
      setError(parseError(err, 'Error al subir la imagen'))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const cost = parseFloat(form.cost_price)
    const sale = parseFloat(form.sale_price)

    if (cost < 0 || sale < 0) {
      setError('Los precios no pueden ser negativos.')
      setLoading(false)
      return
    }
    if (sale < cost) {
      setError('El precio de venta no puede ser menor al precio de costo.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        name: form.name,
        category: form.category,
        stock: parseInt(form.stock) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        cost_price: cost,
        sale_price: sale,
        image_url: form.image_url || null,
        system: 'bravo'
      }

      if (isEdit) {
        await updateInventoryItem(item.id, payload)
      } else {
        await createInventoryItem(payload)
      }
      onUpdated()
    } catch (err) {
      setError(parseError(err, 'Error al guardar el producto'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-bravo-card border border-bravo-border rounded-2xl p-7 w-full max-w-md shadow-2xl backdrop-blur-xl my-8"
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-bravo-text uppercase tracking-wider">
            {isEdit ? 'Editar Producto / Insumo' : 'Nuevo Producto / Insumo'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-bravo-border bg-stone-100 hover:bg-stone-200 text-bravo-text-muted hover:text-bravo-text transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre del Producto" required>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Polera Negra Algodón Premium"
              required
              className={inputClass}
            />
          </Field>

          <Field label="Categoría" required>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'insumo', label: 'Insumo / Material' },
                { value: 'mercancia', label: 'Mercancía / Venta' }
              ].map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    form.category === cat.value
                      ? 'bg-bravo-accent/15 border-bravo-accent/35 text-amber-800 font-extrabold shadow-sm'
                      : 'border-bravo-border text-bravo-text-muted hover:border-stone-300 bg-white/40'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock Actual" required>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Stock Mínimo" required>
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
            <Field label="Precio Costo ($)" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={e => setForm({ ...form, cost_price: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Precio Venta ($)" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.sale_price}
                onChange={e => setForm({ ...form, sale_price: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Imagen del Producto">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder="Ruta de imagen o URL externa"
                  className={`${inputClass} flex-grow`}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2.5 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>

              {form.image_url && (
                <div className="relative w-full h-32 bg-stone-900 border border-bravo-border rounded-xl overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={form.image_url.startsWith('http') ? form.image_url : `${api.defaults.baseURL}${form.image_url}`}
                    alt="Vista previa"
                    className="object-contain max-h-full max-w-full rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_url: '' })}
                    className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700 text-xs text-center font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-black cursor-pointer shadow-md shadow-bravo-glow"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
            >
              {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Producto')}
            </motion.button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-bravo-text-muted bg-stone-100 hover:bg-stone-200 border border-bravo-border transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function BravoProductsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('mercancia') // 'mercancia' = Venta, 'insumo' = Control Interno
  const [showLowStock, setShowLowStock] = useState(false)
  const [modalItem, setModalItem] = useState(null) // null = closed, 'new' = new product, object = edit
  const [showModal, setShowModal] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = { system: 'bravo' }
      if (showLowStock) params.low_stock = true
      const res = await getInventoryItems(params)
      setItems(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [showLowStock])

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"? Esta acción eliminará el producto del inventario.`)) {
      try {
        await deleteInventoryItem(id)
        fetchItems()
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar el producto.')
      }
    }
  }

  const filtered = items
    .filter(i => i.category === activeTab)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const stats = {
    total: items.length,
    lowStock: items.filter(i => i.stock <= i.min_stock).length,
    insumos: items.filter(i => i.category === 'insumo').length,
    mercancia: items.filter(i => i.category === 'mercancia').length,
    totalValue: items.reduce((sum, i) => sum + (i.stock * Number(i.sale_price)), 0),
  }

  return (
    <div className="space-y-6 relative">
      <BravoBackground />

      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bravo-border pb-5">
        <div className="text-left">
          <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent to-bravo-accent-warm bg-clip-text text-transparent uppercase tracking-wider">
            Productos & Insumos
          </h1>
          <p className="text-bravo-text-muted text-xs mt-1">{items.length} elementos registrados en Bravo</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setModalItem(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-black self-start sm:self-auto cursor-pointer shadow-md shadow-bravo-glow"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
        >
          <Plus size={14} />
          Nuevo Elemento
        </motion.button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Productos a la Venta', value: stats.mercancia, color: 'text-bravo-accent' },
          { label: 'Insumos / Materiales', value: stats.insumos, color: 'text-bravo-accent-warm' },
          { label: 'Stock Crítico / Bajo', value: stats.lowStock, color: 'text-red-500', icon: stats.lowStock > 0 ? AlertTriangle : null },
          { label: 'Valor del Catálogo', value: `$${stats.totalValue.toLocaleString('es-CL')}`, color: 'text-amber-800' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="bg-bravo-card border border-bravo-border rounded-xl p-4 shadow-sm text-left flex flex-col justify-between"
          >
            <div className="flex items-center gap-2">
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
              {stat.icon && <stat.icon size={13} className={stat.color} />}
            </div>
            <p className="text-bravo-text-muted text-[9px] uppercase tracking-wider font-bold mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Category Tabs & Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-bravo-border pb-4">
        {/* Tab selector */}
        <div className="flex gap-1.5 p-1 bg-stone-900/40 border border-bravo-border rounded-xl">
          {[
            { id: 'mercancia', label: 'Productos p/ Venta 🛍️' },
            { id: 'insumo', label: 'Insumos de Taller 🛠️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-xs font-black'
                  : 'text-bravo-text-muted hover:text-bravo-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Buscar en ${activeTab === 'insumo' ? 'insumos' : 'productos'}...`}
              className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-9 pr-4 py-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50 transition-all placeholder-stone-400"
            />
          </div>

          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
              showLowStock
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : 'bg-bravo-input text-bravo-text-muted border-bravo-border'
            }`}
          >
            <AlertCircle size={12} />
            Stock Bajo
          </button>
        </div>
      </div>

      {/* List Feed */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-stone-900/10 border border-bravo-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bravo-card border border-bravo-border rounded-2xl py-20 text-center shadow-xs">
          <Package size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-bravo-text-muted text-sm font-semibold">No se encontraron productos registrados</p>
          <p className="text-stone-600 text-xs mt-1">Crea un nuevo elemento para empezar</p>
        </div>
      ) : activeTab === 'mercancia' ? (
        /* Grid visual de Productos a la venta con imagen */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filtered.map(item => {
            const isLow = item.stock <= item.min_stock
            const profit = Number(item.sale_price) - Number(item.cost_price)
            const margin = Number(item.cost_price) > 0 ? (profit / Number(item.cost_price) * 100) : 0

            return (
              <motion.div
                key={item.id}
                layout
                whileHover={{ y: -4, scale: 1.015 }}
                className={`bg-bravo-card border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
                  isLow ? 'border-red-300/40 hover:border-red-400' : 'border-bravo-border hover:border-stone-300'
                }`}
              >
                {/* Product Image Header */}
                <div className="h-44 bg-stone-900/30 relative flex items-center justify-center border-b border-bravo-border/60 overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url.startsWith('http') ? item.image_url : `${api.defaults.baseURL}${item.image_url}`} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => { e.target.onerror = null; e.target.src = ''; }} // Fallback if url is broken
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-stone-300">
                      <ImageIcon size={32} className="text-stone-400" />
                      <span className="text-[10px] text-stone-600 uppercase tracking-widest font-bold">Sin Imagen</span>
                    </div>
                  )}

                  {/* Stock tag overlay */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                      isLow 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' 
                        : 'bg-stone-900/90 border-bravo-border text-bravo-text'
                    }`}>
                      Stock: {item.stock}
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 flex-1 flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-bravo-text truncate" title={item.name}>{item.name}</h3>
                    <div className="flex justify-between items-center text-[10px] text-bravo-text-muted mt-1.5">
                      <span>Costo: ${Number(item.cost_price).toLocaleString('es-CL')}</span>
                      <span className="flex items-center gap-0.5">
                        {margin >= 0 ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-red-500" />}
                        Margen: {margin.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-bravo-border/50">
                    <div className="text-left">
                      <p className="text-[8px] text-gray-550 uppercase tracking-wider font-bold">Pto. Venta</p>
                      <p className="text-base font-black text-bravo-accent tracking-tight">${Number(item.sale_price).toLocaleString('es-CL')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setModalItem(item); setShowModal(true) }}
                        className="p-2 rounded-xl border border-bravo-border bg-stone-100 hover:bg-stone-200/80 text-bravo-text-muted hover:text-bravo-text transition-colors cursor-pointer"
                        title="Editar Producto"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-2 rounded-xl border border-red-950/40 bg-red-955/10 hover:bg-red-900/20 text-red-500 transition-colors cursor-pointer"
                        title="Eliminar Producto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* Insumos: Lista compacta tipo control de inventario */
        <div className="space-y-2.5">
          {filtered.map(item => {
            const isLow = item.stock <= item.min_stock
            const profit = Number(item.sale_price) - Number(item.cost_price)
            const margin = Number(item.cost_price) > 0 ? (profit / Number(item.cost_price) * 100) : 0

            return (
              <motion.div
                key={item.id}
                layout
                className={`bg-bravo-card border rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 text-left ${
                  isLow ? 'border-red-300/40 bg-red-955/5 hover:bg-red-955/10' : 'border-bravo-border hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isLow ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-bravo-text truncate" title={item.name}>{item.name}</h3>
                    <p className="text-bravo-text-muted text-[10px] uppercase tracking-wider font-semibold mt-1">
                      Insumo Técnico / Taller • Min. Stock: {item.min_stock}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 justify-between sm:justify-end shrink-0 pt-3 sm:pt-0 border-t border-bravo-border/40 sm:border-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[8px] text-gray-550 uppercase font-bold tracking-wider">Costo</p>
                    <p className="text-xs font-bold text-stone-300">${Number(item.cost_price).toLocaleString('es-CL')}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[8px] text-gray-550 uppercase font-bold tracking-wider">Valor Venta</p>
                    <p className="text-xs font-bold text-bravo-accent">${Number(item.sale_price).toLocaleString('es-CL')}</p>
                  </div>
                  <div className="text-left sm:text-right min-w-20">
                    <p className="text-[8px] text-gray-550 uppercase font-bold tracking-wider">Cantidad Stock</p>
                    <p className={`text-sm font-black flex items-center gap-1 ${isLow ? 'text-red-500' : 'text-bravo-text'}`}>
                      {isLow && <AlertTriangle size={12} />}
                      {item.stock}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    <button
                      onClick={() => { setModalItem(item); setShowModal(true) }}
                      className="p-2 rounded-xl border border-bravo-border bg-stone-100 hover:bg-stone-200/80 text-bravo-text-muted hover:text-bravo-text cursor-pointer transition-colors"
                      title="Editar Insumo"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 rounded-xl border border-red-950/40 bg-red-955/10 hover:bg-red-900/20 text-red-500 cursor-pointer transition-colors"
                      title="Eliminar Insumo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Product / Insumo Creation or Edition Modal */}
      <AnimatePresence>
        {showModal && (
          <ProductModal
            item={modalItem}
            onClose={() => { setShowModal(false); setModalItem(null); }}
            onUpdated={() => { setShowModal(false); setModalItem(null); fetchItems(); }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
