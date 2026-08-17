import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Search, Package, AlertTriangle, X, TrendingUp, TrendingDown, 
  Image as ImageIcon, Trash2, Edit, AlertCircle, Download, FileSpreadsheet, Eye,
  Upload, CheckCircle2, FileText, Check, Layers, RefreshCw
} from 'lucide-react'
import { 
  getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  bulkUploadInventory, downloadInventoryTemplate
} from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import { parseError } from '../../utils/errors'
import api from '../../api/client'

const inputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/30 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all placeholder-stone-500 font-mono"

function Field({ label, required, children }) {
  return (
    <div className="text-left">
      <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold font-mono">
        {label} {required && <span className="text-bravo-accent font-black">*</span>}
      </label>
      {children}
    </div>
  )
}

function ProductModal({ item, availableInsumos = [], onClose, onUpdated }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'mercancia',
    stock: item?.stock !== undefined ? item.stock : 0,
    min_stock: item?.min_stock !== undefined ? item.min_stock : 5,
    cost_price: item?.cost_price || '',
    sale_price: item?.sale_price || '',
    image_url: item?.image_url || '',
  })
  
  // Lista de insumos vinculados a este producto (Receta)
  const [recipe, setRecipe] = useState(() => {
    if (item?.recipe_items && item.recipe_items.length > 0) {
      return item.recipe_items.map(r => ({
        insumo_id: r.insumo_id.toString(),
        quantity: r.quantity || 1
      }))
    }
    return []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!item

  // Cálculo automático del costo total de insumos
  const calculatedInsumosCost = recipe.reduce((sum, r) => {
    const found = availableInsumos.find(i => i.id.toString() === r.insumo_id.toString())
    if (!found) return sum
    return sum + (Number(found.cost_price || 0) * (Number(r.quantity) || 0))
  }, 0)

  const handleAddRecipeItem = () => {
    if (!availableInsumos || availableInsumos.length === 0) return
    setRecipe(prev => [...prev, { insumo_id: availableInsumos[0].id.toString(), quantity: 1 }])
  }

  const handleRemoveRecipeItem = (index) => {
    setRecipe(prev => prev.filter((_, i) => i !== index))
  }

  const handleRecipeChange = (index, field, value) => {
    setRecipe(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

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

    const cost = parseFloat(form.cost_price) || 0
    const sale = parseFloat(form.sale_price) || 0

    if (cost < 0 || sale < 0) {
      setError('Los precios no pueden ser negativos.')
      setLoading(false)
      return
    }

    try {
      const formattedRecipe = form.category === 'mercancia'
        ? recipe
            .filter(r => r.insumo_id)
            .map(r => ({
              insumo_id: parseInt(r.insumo_id),
              quantity: parseFloat(r.quantity) || 1.0
            }))
        : []

      const payload = {
        name: form.name,
        category: form.category,
        stock: parseInt(form.stock) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        cost_price: cost,
        sale_price: sale,
        image_url: form.image_url || null,
        system: 'bravo',
        recipe: formattedRecipe
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-bravo-card border border-bravo-border rounded-2xl p-7 w-full max-w-lg shadow-2xl backdrop-blur-xl my-8 font-sans text-left max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5 border-b border-bravo-border/20 pb-3">
          <h2 className="text-sm font-black text-bravo-accent uppercase tracking-wider font-mono">
            {isEdit ? 'Editar Producto / Insumo' : 'Nuevo Producto / Insumo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/5 text-bravo-text-muted hover:text-white rounded transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Field label="Nombre del Producto" required>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Polera Negra Algodón Premium"
              required
              className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/30 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all placeholder-stone-500 font-sans"
            />
          </Field>

          <Field label="Categoría del Elemento" required>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'mercancia', label: '🛍️ Producto de Venta / Mercancía' },
                { value: 'insumo', label: '🛠️ Insumo / Materia Prima' }
              ].map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    form.category === cat.value
                      ? 'bg-bravo-accent/10 border-bravo-accent/40 text-bravo-accent font-extrabold shadow-sm'
                      : 'bg-[#101017] border-bravo-border/40 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Sección de Receta de Insumos cuando es Producto de Venta */}
          {form.category === 'mercancia' && (
            <div className="bg-[#101018] border border-bravo-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-wider font-mono">
                    🛠️ Insumos Requeridos (Receta)
                  </h4>
                  <p className="text-[9px] text-stone-400">
                    Se descontarán del stock automáticamente al vender este producto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRecipeItem}
                  disabled={!availableInsumos || availableInsumos.length === 0}
                  className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  + Agregar Insumo
                </button>
              </div>

              {recipe.length === 0 ? (
                <p className="text-[10px] text-stone-500 italic py-1">
                  Sin insumos vinculados. Haz clic en "+ Agregar Insumo" para asociar materias primas.
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {recipe.map((rItem, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-black/40 border border-bravo-border/30 rounded-lg p-2">
                      <select
                        value={rItem.insumo_id}
                        onChange={e => handleRecipeChange(idx, 'insumo_id', e.target.value)}
                        className="flex-1 bg-[#14141d] border border-bravo-border rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
                      >
                        {availableInsumos.map(ins => (
                          <option key={ins.id} value={ins.id}>
                            {ins.name} (Stock: {ins.stock} | Costo: ${Number(ins.cost_price).toLocaleString('es-CL')})
                          </option>
                        ))}
                      </select>

                      <div className="w-20 flex items-center gap-1">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={rItem.quantity}
                          onChange={e => handleRecipeChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-[#14141d] border border-bravo-border rounded-lg px-2 py-1.5 text-[11px] text-white text-center font-mono"
                          title="Cantidad consumida por unidad"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeItem(idx)}
                        className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Quitar de la receta"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {recipe.length > 0 && (
                <div className="pt-2 border-t border-bravo-border/30 flex items-center justify-between text-[10px]">
                  <span className="text-stone-400">
                    Costo total insumos: <strong className="text-amber-400 font-mono">${calculatedInsumosCost.toLocaleString('es-CL')}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, cost_price: calculatedInsumosCost.toString() }))}
                    className="text-amber-400 hover:underline font-bold font-mono uppercase tracking-wider"
                  >
                    Usar como precio costo
                  </button>
                </div>
              )}
            </div>
          )}

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
            <Field label="Stock de Alerta Mínimo" required>
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
                step="1"
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
                step="1"
                value={form.sale_price}
                onChange={e => setForm({ ...form, sale_price: e.target.value })}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Imagen del Producto / Insumo">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder="Ruta de imagen o URL externa..."
                  className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/30 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all placeholder-stone-500 font-mono flex-grow"
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
                  className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 disabled:opacity-50 text-stone-300 hover:text-bravo-accent font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  {uploading ? 'Cargando...' : 'Subir'}
                </button>
              </div>

              {form.image_url && (
                <div className="relative w-full h-32 bg-[#101017] border border-bravo-border/40 rounded-xl overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={form.image_url.startsWith('http') ? form.image_url : `${api.defaults.baseURL}${form.image_url}`}
                    alt="Vista previa"
                    className="object-contain max-h-full max-w-full rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_url: '' })}
                    className="absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </Field>

          {error && (
            <div className="bg-rose-950/40 border border-rose-500/20 rounded-xl px-4 py-2.5 text-rose-400 text-xs text-center font-bold font-mono leading-normal">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/10 flex items-center justify-center"
            >
              {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Producto')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-400 bg-zinc-900 hover:bg-white/5 border border-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function ProductDetailModal({ item, onClose, onEdit }) {
  const barcodeRef = useRef(null)

  useEffect(() => {
    if (barcodeRef.current && item?.barcode) {
      try {
        JsBarcode(barcodeRef.current, item.barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 45,
          displayValue: true,
          fontSize: 11,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        })
      } catch (err) {
        console.error('Error generating barcode:', err)
      }
    }
  }, [item])

  if (!item) return null

  const isLow = item.stock <= item.min_stock
  const profit = Number(item.sale_price) - Number(item.cost_price)
  const margin = Number(item.cost_price) > 0 ? (profit / Number(item.cost_price) * 100) : 0
  const inventoryValue = item.stock * Number(item.sale_price)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-bravo-card border border-bravo-border rounded-2xl p-6 w-full max-w-lg shadow-2xl backdrop-blur-xl my-8 text-left text-bravo-text space-y-5 font-sans"
      >
        <div className="flex justify-between items-center border-b border-bravo-border/20 pb-3">
          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
            item.category === 'insumo' 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
          }`}>
            {item.category === 'insumo' ? 'Insumo Técnico 🛠_' : 'Mercancía / Venta 🛍_'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/5 text-bravo-text-muted hover:text-white rounded transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
          {/* Image */}
          <div className="sm:col-span-5 w-full h-44 bg-[#101017] border border-bravo-border/40 rounded-xl overflow-hidden flex items-center justify-center p-2 relative">
            {item.image_url ? (
              <img
                src={item.image_url.startsWith('http') ? item.image_url : `${api.defaults.baseURL}${item.image_url}`}
                alt={item.name}
                className="object-contain w-full h-full max-h-40 rounded"
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-stone-500">
                <ImageIcon size={36} className="text-zinc-650" />
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black font-mono">Sin Imagen</span>
              </div>
            )}
            {isLow && (
              <div className="absolute top-2 right-2 bg-red-500/10 border border-red-500/30 text-red-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                <AlertCircle size={9} />
                Stock Crítico
              </div>
            )}
          </div>

          {/* Details Info */}
          <div className="sm:col-span-7 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-black tracking-tight text-white leading-snug">{item.name}</h2>
              <p className="text-[9px] text-bravo-text-muted uppercase font-bold tracking-wider font-mono">Detalles de Inventario</p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#101017] border border-bravo-border/30 p-2.5 rounded-xl text-left">
              <div>
                <p className="text-[8px] text-gray-550 uppercase tracking-wider font-extrabold font-mono">Stock Actual</p>
                <p className={`text-sm font-black ${isLow ? 'text-rose-450' : 'text-white'}`}>{item.stock} uds</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-550 uppercase tracking-wider font-extrabold font-mono">Alerta Stock</p>
                <p className="text-sm font-black text-stone-400">{item.min_stock} uds</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center border-b border-bravo-border/10 pb-1 font-sans">
                <span className="text-bravo-text-muted font-medium">Costo unitario:</span>
                <span className="font-extrabold text-stone-300 font-mono">${Number(item.cost_price).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between items-center border-b border-bravo-border/10 pb-1 font-sans">
                <span className="text-bravo-text-muted font-medium">Precio de venta:</span>
                <span className="font-black text-bravo-accent font-mono">${Number(item.sale_price).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between items-center border-b border-bravo-border/10 pb-1 font-sans">
                <span className="text-bravo-text-muted font-medium">Margen estimado:</span>
                <span className={`font-extrabold flex items-center gap-0.5 font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profit >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  ${profit.toLocaleString('es-CL')} ({margin.toFixed(0)}%)
                </span>
              </div>
              <div className="flex justify-between items-center font-sans">
                <span className="text-bravo-text-muted font-medium">Valor total stock:</span>
                <span className="font-extrabold text-amber-800 font-mono">${inventoryValue.toLocaleString('es-CL')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Receta de Insumos */}
        {item.recipe_items && item.recipe_items.length > 0 && (
          <div className="bg-[#101017] border border-bravo-border/40 p-3 rounded-xl space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-black font-mono block">
              🛠️ Insumos Descontados por Unidad (Receta de Fabricación)
            </span>
            <div className="space-y-1.5">
              {item.recipe_items.map(rec => (
                <div key={rec.id} className="flex justify-between items-center text-xs border-b border-bravo-border/10 pb-1">
                  <span className="text-stone-300 font-semibold">{rec.insumo_name || `Insumo ID: ${rec.insumo_id}`}</span>
                  <span className="text-amber-400 font-mono font-extrabold">{rec.quantity} ud(s)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barcode section */}
        {item.barcode && (
          <div className="bg-[#101017] border border-bravo-border/40 p-4 rounded-xl flex flex-col items-center justify-center space-y-2">
            <span className="text-[9px] uppercase tracking-widest text-bravo-text-muted font-black font-mono">Código de Barras</span>
            <div className="bg-white p-1.5 rounded border border-stone-200">
              <svg ref={barcodeRef} />
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-2 border-t border-bravo-border/20">
          <button
            type="button"
            onClick={() => { onEdit(item); onClose(); }}
            className="flex-grow py-2 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md text-center"
          >
            Editar Producto
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-400 bg-zinc-900 hover:bg-white/5 border border-zinc-800 transition-colors cursor-pointer text-center"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function BulkUploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      validateAndSetFile(selected)
    }
  }

  const validateAndSetFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Formato no permitido. Solo se aceptan archivos .CSV o .XLSX (Excel).')
      setFile(null)
      return
    }
    setError('')
    setResult(null)
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const res = await bulkUploadInventory(file, 'bravo')
      setResult(res.data)
      onSuccess?.()
    } catch (err) {
      setError(parseError(err, 'Error al procesar el archivo'))
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadInventoryTemplate('bravo')
    } catch (err) {
      alert('Error al descargar la plantilla.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-bravo-surface border border-bravo-border rounded-2xl p-6 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-bravo-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-bravo-accent/15 border border-bravo-accent/40 text-bravo-accent">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">
                Importación Masiva de Catálogo
              </h2>
              <p className="text-xs text-bravo-text-muted">
                Carga productos y materias primas mediante CSV o Excel (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template helper banner */}
        <div className="p-3.5 bg-[#12121c] border border-bravo-accent/30 rounded-xl flex items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <p className="text-white font-bold">¿Aún no tienes la estructura?</p>
            <p className="text-stone-400 text-[11px]">
              Descarga la plantilla con encabezados oficiales y ejemplos de insumos/mercancía.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-bravo-accent border border-bravo-accent/50 bg-bravo-accent/10 hover:bg-bravo-accent/20 cursor-pointer shrink-0 transition-all"
          >
            <Download size={13} />
            Plantilla CSV
          </button>
        </div>

        {/* Drag and Drop Zone */}
        {!result && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
              dragging
                ? 'border-bravo-accent bg-bravo-accent/10 scale-[1.01]'
                : file
                ? 'border-emerald-500/60 bg-emerald-950/15'
                : 'border-bravo-border/60 hover:border-bravo-accent/50 bg-[#0d0d14]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <>
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileText size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white font-mono">{file.name}</p>
                  <p className="text-xs text-stone-400">
                    {(file.size / 1024).toFixed(1)} KB — Listo para importar
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Clic para cambiar de archivo
                </span>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-bravo-card text-bravo-accent border border-bravo-border">
                  <Upload size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    Arrastra tu archivo aquí o <span className="text-bravo-accent underline">haz clic</span>
                  </p>
                  <p className="text-xs text-stone-500 font-mono">
                    Formatos soportados: .CSV (separado por comas o punto y coma) o .XLSX
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Breakdown */}
        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0e1712] border border-emerald-500/40 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black font-mono text-sm uppercase">
                <CheckCircle2 size={18} />
                <span>Importación Completada</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <p className="text-xs text-stone-400 uppercase font-mono text-[9px]">Creados</p>
                  <p className="text-lg font-black text-emerald-400 font-mono">+{result.created}</p>
                </div>
                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <p className="text-xs text-stone-400 uppercase font-mono text-[9px]">Actualizados</p>
                  <p className="text-lg font-black text-bravo-accent font-mono">{result.updated}</p>
                </div>
                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <p className="text-xs text-stone-400 uppercase font-mono text-[9px]">Total Procesados</p>
                  <p className="text-lg font-black text-white font-mono">{result.total_processed}</p>
                </div>
              </div>
            </div>

            {/* Error rows if any */}
            {result.errors && result.errors.length > 0 && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider font-mono">
                  ⚠️ Advertencias en {result.errors.length} fila(s):
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[11px] font-mono text-stone-300">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="bg-black/40 p-1.5 rounded border border-white/5 flex justify-between">
                      <span>Fila {err.row}: {err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5 pt-2 border-t border-bravo-border/30">
          {!result ? (
            <>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || loading}
                className={`flex-grow py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                  !file || loading
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-bravo-accent hover:bg-amber-600 text-black shadow-lg shadow-bravo-glow/20 cursor-pointer'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Procesando Archivo...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Importar al Catálogo
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-400 bg-zinc-900 hover:bg-white/5 border border-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
            >
              Listo / Finalizar
            </button>
          )}
        </div>
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
  const [modalItem, setModalItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [selectedDetailItem, setSelectedDetailItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

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
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"? Esta acción eliminará permanentemente el producto del inventario de Bravo.`)) {
      try {
        await deleteInventoryItem(id)
        fetchItems()
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar el producto.')
      }
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/inventory/export/excel?system=bravo', {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Inventario_Bravo.xlsx')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      console.error('Error al exportar', err)
      alert('Error al exportar inventario.')
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
    <div className="space-y-6 relative text-left">
      <BravoBackground />

      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bravo-border pb-5">
        <div className="text-left">
          <h1 className="text-2xl font-black text-bravo-accent tracking-wider flex items-center gap-2.5 uppercase italic">
            <Package className="text-bravo-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            Catálogo & Inventario
          </h1>
          <p className="text-bravo-text-muted text-xs mt-1">{items.length} productos e insumos registrados en el sistema</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white border border-bravo-border bg-bravo-card hover:border-bravo-accent/40 hover:bg-bravo-accent/10 cursor-pointer transition-colors"
          >
            <Upload size={14} className="text-bravo-accent" />
            Importar CSV / Excel
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-bravo-accent border border-bravo-accent/40 bg-bravo-accent/10 hover:bg-bravo-accent/20 cursor-pointer transition-colors"
          >
            <FileSpreadsheet size={14} />
            Exportar Excel
          </button>
          
          <button
            type="button"
            onClick={() => { setModalItem(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black cursor-pointer shadow-lg shadow-bravo-glow/20 bg-bravo-accent hover:bg-amber-600"
          >
            <Plus size={14} className="stroke-[3]" />
            Nuevo Elemento
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Mercancías / Venta', value: stats.mercancia, color: 'text-emerald-400' },
          { label: 'Insumos de Taller', value: stats.insumos, color: 'text-amber-500' },
          { label: 'Stock Crítico / Alerta', value: stats.lowStock, color: 'text-rose-400', icon: stats.lowStock > 0 ? AlertTriangle : null },
          { label: 'Valor del Catálogo', value: `$${stats.totalValue.toLocaleString('es-CL')}`, color: 'text-bravo-accent' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="bg-bravo-card border border-bravo-border rounded-xl p-4 shadow-md text-left flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 justify-between">
              <p className={`text-xl font-black font-mono ${stat.color}`}>{stat.value}</p>
              {stat.icon && <stat.icon size={14} className={`${stat.color} animate-pulse`} />}
            </div>
            <p className="text-bravo-text-muted text-[9px] uppercase tracking-wider font-bold mt-2 font-mono">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Category Tabs & Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-bravo-border pb-4">
        
        {/* Tab selector */}
        <div className="flex gap-1 bg-[#101018] border border-bravo-border/60 p-1 rounded-xl font-mono">
          {[
            { id: 'mercancia', label: '🛍_ Productos p/ Venta' },
            { id: 'insumo', label: '🛠_ Insumos de Taller' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-bravo-accent text-black shadow-md shadow-bravo-glow/20 border border-bravo-accent/50'
                  : 'text-bravo-text-muted hover:text-white'
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
              className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-bravo-accent/50 transition-all placeholder-stone-500 font-sans"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowLowStock(!showLowStock)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
              showLowStock
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-400'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-52 bg-stone-900/10 border border-bravo-border/40 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bravo-card border border-bravo-border rounded-2xl py-20 text-center shadow-xs">
          <Package size={44} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-bravo-text-muted text-xs font-semibold">No se encontraron productos o insumos registrados</p>
          <p className="text-stone-600 text-[10px] uppercase font-bold tracking-widest mt-1">Crea un elemento nuevo en el inventario</p>
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
                whileHover={{ y: -4 }}
                onClick={() => { setSelectedDetailItem(item); setShowDetailModal(true); }}
                className={`bg-bravo-card border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl ${
                  isLow ? 'border-rose-500/20 bg-rose-950/[0.01]' : 'border-bravo-border hover:border-bravo-accent/40'
                }`}
              >
                {/* Product Image Header */}
                <div className="h-44 bg-[#101017]/80 relative flex items-center justify-center border-b border-bravo-border/40 overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url.startsWith('http') ? item.image_url : `${api.defaults.baseURL}${item.image_url}`} 
                      alt={item.name} 
                      className="w-full h-full object-contain p-2.5 transition-transform duration-500 hover:scale-105"
                      onError={(e) => { e.target.onerror = null; e.target.src = ''; }} // Fallback if url is broken
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-stone-500">
                      <ImageIcon size={32} className="text-zinc-650" />
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black font-mono">Sin Imagen</span>
                    </div>
                  )}

                  {/* Stock tag overlay */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-md ${
                      isLow 
                        ? 'bg-rose-950 border border-rose-500/20 text-rose-455 animate-pulse' 
                        : 'bg-[#101017] border border-bravo-border/40 text-stone-300 font-mono'
                    }`}>
                      Stock: {item.stock}
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 flex-1 flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-white truncate leading-snug" title={item.name}>{item.name}</h3>
                    <div className="flex justify-between items-center text-[9px] text-bravo-text-muted font-mono mt-1">
                      <span>Costo: ${Number(item.cost_price).toLocaleString('es-CL')}</span>
                      <span className="flex items-center gap-0.5">
                        {margin >= 0 ? <TrendingUp size={10} className="text-emerald-400" /> : <TrendingDown size={10} className="text-red-400" />}
                        Margen: {margin.toFixed(0)}%
                      </span>
                    </div>

                    {/* Badge de Insumos Vinculados (Receta) */}
                    {item.recipe_items && item.recipe_items.length > 0 && (
                      <div className="pt-1.5 flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-md text-[8px] font-mono font-bold">
                          🛠️ {item.recipe_items.length} {item.recipe_items.length === 1 ? 'Insumo Vinculado' : 'Insumos Vinculados'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-bravo-border/20">
                    <div className="text-left leading-tight">
                      <p className="text-[8px] text-gray-555 uppercase tracking-wider font-bold font-mono">Pto. Venta</p>
                      <p className="text-base font-black text-bravo-accent font-mono tracking-tight">${Number(item.sale_price).toLocaleString('es-CL')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setModalItem(item); setShowModal(true); }}
                        className="p-2 rounded-xl border border-zinc-800 bg-[#101017] hover:border-bravo-accent/40 text-stone-400 hover:text-bravo-accent transition-colors cursor-pointer"
                        title="Editar Producto"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.name); }}
                        className="p-2 rounded-xl border border-rose-500/20 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
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
        
        /* Grid visual de Insumos con foto */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filtered.map(item => {
            const isLow = item.stock <= item.min_stock

            return (
              <motion.div
                key={item.id}
                layout
                whileHover={{ y: -4 }}
                onClick={() => { setSelectedDetailItem(item); setShowDetailModal(true); }}
                className={`bg-bravo-card border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl ${
                  isLow ? 'border-rose-500/20 bg-rose-950/[0.01]' : 'border-bravo-border hover:border-bravo-accent/40'
                }`}
              >
                {/* Product Image Header */}
                <div className="h-44 bg-[#101017]/80 relative flex items-center justify-center border-b border-bravo-border/40 overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url.startsWith('http') ? item.image_url : `${api.defaults.baseURL}${item.image_url}`} 
                      alt={item.name} 
                      className="w-full h-full object-contain p-2.5 transition-transform duration-500 hover:scale-105"
                      onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-stone-500">
                      <ImageIcon size={32} className="text-zinc-650" />
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black font-mono">Sin Imagen</span>
                    </div>
                  )}

                  {/* Stock tag overlay */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-md ${
                      isLow 
                        ? 'bg-rose-950 border border-rose-500/20 text-rose-455 animate-pulse' 
                        : 'bg-[#101017] border border-bravo-border/40 text-stone-300 font-mono'
                    }`}>
                      Stock: {item.stock} / Mín: {item.min_stock}
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 flex-1 flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-white truncate leading-snug" title={item.name}>{item.name}</h3>
                    <p className="text-[9px] text-bravo-text-muted uppercase tracking-wider font-semibold font-mono">
                      Insumo Técnico / Taller
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-bravo-border/20">
                    <div className="text-left leading-tight">
                      <p className="text-[8px] text-gray-555 uppercase tracking-wider font-bold font-mono">Costo Unitario</p>
                      <p className="text-base font-black text-amber-500 font-mono tracking-tight">${Number(item.cost_price).toLocaleString('es-CL')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setModalItem(item); setShowModal(true); }}
                        className="p-2 rounded-xl border border-zinc-800 bg-[#101017] hover:border-bravo-accent/40 text-stone-400 hover:text-bravo-accent transition-colors cursor-pointer"
                        title="Editar Insumo"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.name); }}
                        className="p-2 rounded-xl border border-rose-500/20 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar Insumo"
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
      )}

      {/* Product / Insumo Creation or Edition Modal */}
      <AnimatePresence>
        {showModal && (
          <ProductModal
            item={modalItem}
            availableInsumos={items.filter(i => i.category === 'insumo')}
            onClose={() => { setShowModal(false); setModalItem(null); }}
            onUpdated={() => { setShowModal(false); setModalItem(null); fetchItems(); }}
          />
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <ProductDetailModal
            item={selectedDetailItem}
            onClose={() => { setShowDetailModal(false); setSelectedDetailItem(null); }}
            onEdit={(item) => { setModalItem(item); setShowModal(true); }}
          />
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <BulkUploadModal
            onClose={() => setShowBulkModal(false)}
            onSuccess={() => fetchItems()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
