import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Package, AlertTriangle, X, TrendingUp, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getInventoryItems, updateInventoryItem } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import BravoLayout from '../../components/bravo/BravoLayout'

const inputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all placeholder-stone-400"

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-bravo-text-muted text-xs tracking-wider uppercase block mb-1.5 font-semibold">
        {label} {required && <span className="text-bravo-accent">*</span>}
      </label>
      {children}
    </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-bravo-card border border-bravo-border rounded-2xl p-6 w-full max-w-sm shadow-xl backdrop-blur-xl"
      >
        <h2 className="text-lg font-bold text-bravo-text mb-1">Ajustar Stock</h2>
        <p className="text-bravo-text-muted text-sm mb-5">{item.name}</p>

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
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-black cursor-pointer shadow-md shadow-bravo-glow"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
            >
              {loading ? '...' : 'Guardar'}
            </motion.button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm text-bravo-text-muted bg-stone-100 hover:bg-stone-200/80 border border-bravo-border transition-colors cursor-pointer"
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
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = { system: 'bravo' }
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
    <BravoLayout>
      <div className="space-y-6 relative">
        <BravoBackground />

        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bravo-border pb-5">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent to-bravo-accent-warm bg-clip-text text-transparent">
              Productos Base
            </h1>
            <p className="text-bravo-text-muted text-xs mt-1">{items.length} productos registrados para Bravo</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/bravo/products/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black self-start sm:self-auto cursor-pointer shadow-md shadow-bravo-glow"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          >
            <Plus size={14} />
            Nuevo Producto
          </motion.button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total productos', value: stats.total, color: 'text-bravo-accent' },
            { label: 'Stock bajo', value: stats.lowStock, color: 'text-red-500', icon: stats.lowStock > 0 ? AlertTriangle : null },
            { label: 'Insumos / Materiales', value: stats.insumos, color: 'text-bravo-accent-warm' },
            { label: 'Valor catálogo', value: `$${stats.totalValue.toLocaleString('es-CL')}`, color: 'text-amber-700' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="bg-bravo-card border border-bravo-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                {stat.icon && <stat.icon size={14} className={stat.color} />}
              </div>
              <p className="text-bravo-text-muted text-[10px] uppercase tracking-wider font-semibold mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-9 pr-4 py-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50 transition-all placeholder-stone-400"
            />
          </div>

          <div className="flex gap-2">
            {['', 'insumo', 'mercancia'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border capitalize cursor-pointer ${
                  categoryFilter === cat && cat !== ''
                    ? 'bg-bravo-accent/15 border-bravo-accent/35 text-amber-800'
                    : cat === '' && categoryFilter === ''
                    ? 'bg-white border-bravo-border text-bravo-text shadow-xs font-bold'
                    : 'bg-bravo-input text-bravo-text-muted border-bravo-border'
                }`}
              >
                {cat === '' ? 'Todos' : cat === 'insumo' ? 'Insumos' : 'Mercancía'}
              </button>
            ))}

            <button
              onClick={() => setShowLowStock(!showLowStock)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                showLowStock
                  ? 'bg-red-100/90 border-red-300/80 text-red-700 font-semibold'
                  : 'bg-bravo-input text-bravo-text-muted border-bravo-border'
              }`}
            >
              <AlertTriangle size={12} />
              Stock bajo
            </button>
          </div>
        </div>

        {/* List Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/40 border border-bravo-border rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-bravo-card border border-bravo-border rounded-2xl py-20 text-center shadow-xs">
            <Package size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-bravo-text-muted text-sm">No hay productos registrados para Bravo</p>
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
                    transition={{ delay: i * 0.02 }}
                    className={`bg-bravo-card border rounded-xl p-4 flex items-center justify-between gap-4 transition-all hover:bg-white/90 ${
                      isLow ? 'border-red-300/60 shadow-[0_0_8px_rgba(239,68,68,0.05)]' : 'border-bravo-border hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 w-2 h-2 rounded-full ${
                        item.category === 'insumo' ? 'bg-orange-500' : 'bg-amber-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-bravo-text">{item.name}</p>
                        <p className="text-bravo-text-muted text-[10px] uppercase tracking-wider font-semibold mt-0.5">
                          {item.category === 'insumo' ? 'Insumo / Material' : 'Mercancía / Producto Final'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => setEditingItem(item)}
                        className={`text-right px-3 py-1.5 rounded-lg transition-colors hover:bg-stone-500/10 cursor-pointer ${
                          isLow ? 'text-red-600 font-bold' : 'text-bravo-text'
                        }`}
                      >
                        <p className="font-bold text-sm flex items-center gap-1 justify-end">
                          {isLow && <AlertTriangle size={11} />}
                          {item.stock}
                        </p>
                        <p className="text-bravo-text-muted text-[10px]">min: {item.min_stock}</p>
                      </button>

                      <div className="text-right w-24">
                        <p className="text-sm font-black text-bravo-accent">
                          ${Number(item.sale_price).toLocaleString('es-CL')}
                        </p>
                        <p className="text-bravo-text-muted text-[10px] flex items-center gap-1 justify-end">
                          {margin >= 0 ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-red-500" />}
                          {margin.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingItem && (
          <EditStockModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onUpdated={() => { setEditingItem(null); fetchItems() }}
          />
        )}
      </AnimatePresence>
    </BravoLayout>
  )
}
