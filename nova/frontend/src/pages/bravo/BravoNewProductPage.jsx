import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createInventoryItem } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import BravoLayout from '../../components/bravo/BravoLayout'

const inputClass = "w-full bg-stone-900/60 border border-stone-850 hover:border-stone-750 focus:border-amber-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
        {label} {required && <span className="text-amber-500">*</span>}
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
    <BravoLayout>
      <div className="max-w-md mx-auto mt-4 relative">
        <BravoBackground />
        {/* Back Link */}
        <button
          onClick={() => navigate('/bravo/products')}
          className="flex items-center gap-2 text-stone-500 hover:text-amber-400 transition-colors mb-6 text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Productos
        </button>

        {/* Card Form */}
        <div className="bg-stone-900/20 backdrop-blur-xl border border-stone-900 rounded-2xl p-8 shadow-2xl">
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
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.category === cat.value
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'border-stone-800 text-stone-500 hover:border-stone-700'
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-sm">$</span>
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-sm">$</span>
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
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
            >
              {loading ? 'Guardando...' : 'Crear Producto'}
            </motion.button>
          </form>
        </div>
      </div>
    </BravoLayout>
  )
}
