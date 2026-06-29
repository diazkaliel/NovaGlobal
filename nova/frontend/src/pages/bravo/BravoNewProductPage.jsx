import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createInventoryItem } from '../../api/inventory'
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

export default function BravoNewProductPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', category: 'insumo', stock: 0, min_stock: 3, cost_price: '', sale_price: ''
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
        system: 'bravo'
      })
      navigate('/bravo/products')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="max-w-md mx-auto mt-4 relative">
        <BravoBackground />
        {/* Back Link */}
        <button
          onClick={() => navigate('/bravo/products')}
          className="flex items-center gap-2 text-bravo-text-muted hover:text-bravo-accent transition-colors mb-6 text-sm group cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Productos
        </button>

        {/* Card Form */}
        <div className="bg-bravo-card backdrop-blur-xl border border-bravo-border rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-black tracking-wider mb-6" style={{
            background: 'linear-gradient(135deg, #fbbf24, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Nuevo Producto Bravo
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nombre del Producto" required>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Polera Negra Algodón"
                required
                className={inputClass}
              />
            </Field>

            <Field label="Categoría" required>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'insumo', label: 'Insumo / Material' },
                  { value: 'mercancia', label: 'Mercancía' }
                ].map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      form.category === cat.value
                        ? 'bg-bravo-accent/15 border-bravo-accent/35 text-amber-800 font-bold'
                        : 'border-bravo-border text-bravo-text-muted hover:border-stone-300 bg-white/40'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock Inicial" required>
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
              <Field label="Precio Costo" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={e => setForm({ ...form, cost_price: e.target.value })}
                    required
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </Field>
              <Field label="Precio Venta" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sale_price}
                    onChange={e => setForm({ ...form, sale_price: e.target.value })}
                    required
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </Field>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl font-bold text-sm text-black cursor-pointer shadow-md shadow-bravo-glow"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
            >
              {loading ? 'Guardando...' : 'Crear Producto'}
            </motion.button>
          </form>
        </div>
      </div>
    </>
  )
}
