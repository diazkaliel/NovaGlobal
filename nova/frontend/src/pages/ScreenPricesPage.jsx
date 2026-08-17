import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, Search, Smartphone, X, ChevronDown, ChevronUp, 
  DollarSign, Percent, TrendingUp, AlertCircle, Edit2, Trash2,
  FileSpreadsheet, UploadCloud, Download, CheckCircle2, AlertTriangle, FileText
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { 
  getScreenPrices, createScreenPrice, updateScreenPrice, deleteScreenPrice,
  bulkUploadScreenPrices, downloadScreenPricesTemplate
} from '../api/screenPrices'

import { parseError } from '../utils/errors'
import AnimatedBackground from '../components/AnimatedBackground'

const BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 
  'Honor', 'OPPO', 'Vivo', 'Realme', 'Infinix', 
  'Tecno', 'ZTE', 'OnePlus', 'Google', 'Sony', 'TCL', 'Nokia'
]
const QUALITIES = ['Original', 'In-Cell', 'OLED', 'Alternativa', 'TFT', 'AMOLED']


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
      setError(parseError(err, 'Error al guardar los precios de la pantalla.'))
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
                  disabled={isPrefill}
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
                  disabled={isPrefill}
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
              disabled={isPrefill}
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
}

function GroupEditModal({ group, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const isCustomBrand = !BRANDS.includes(group.brand)
    return {
      brand: isCustomBrand ? 'Otra' : group.brand,
      customBrand: isCustomBrand ? group.brand : '',
      model: group.model
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalBrand = form.brand === 'Otra' ? form.customBrand.trim() : form.brand
    if (!finalBrand) {
      setError('Por favor especifica la marca.')
      return
    }
    if (!form.model.trim()) {
      setError('Por favor especifica el modelo.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await Promise.all(
        group.variants.map(v =>
          updateScreenPrice(v.id, {
            brand: finalBrand,
            model: form.model.trim(),
            quality: v.quality,
            cost_price: parseFloat(v.cost_price),
            sale_price: parseFloat(v.sale_price)
          })
        )
      )
      onSaved()
    } catch (err) {
      setError(parseError(err, 'Error al actualizar el modelo.'))
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
        className="bg-[#0c0d12]/95 border border-gray-850 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
        
        <div className="flex items-center justify-between mb-6 text-left">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-purple-400 animate-pulse" />
            <h2 className="text-sm font-extrabold text-white tracking-widest uppercase">
              Editar Modelo
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

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-extrabold py-3 rounded-xl text-xs tracking-widest uppercase mt-4 shadow-lg shadow-purple-950/20 disabled:opacity-50 cursor-pointer transition-all border-none"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}function BulkUploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [marginPercent, setMarginPercent] = useState(100)
  const [customMargin, setCustomMargin] = useState('')
  const [isCustomMargin, setIsCustomMargin] = useState(false)
  const fileInputRef = useRef(null)

  const activeMargin = isCustomMargin ? (parseFloat(customMargin) || 0) : marginPercent

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true)
      const res = await downloadScreenPricesTemplate()
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_pantallas_nova.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Error al descargar la plantilla.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleFileSelect = (selectedFile) => {
    setError('')
    setResult(null)
    if (!selectedFile) return

    const name = selectedFile.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.txt')) {
      setError('Por favor selecciona un archivo con extensión .xlsx o .csv')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo supera el límite máximo de 10 MB.')
      return
    }

    setFile(selectedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona o arrastra un archivo primero.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await bulkUploadScreenPrices(file, activeMargin)
      setResult(res.data)
    } catch (err) {
      setError(parseError(err, 'Error al procesar el archivo. Revisa el formato de columnas.'))
    } finally {
      setLoading(false)
    }
  }

  // Ejemplo dinámico de cálculo para guía del usuario
  const sampleCost = 30000
  const sampleSale = Math.round((sampleCost * (1 + activeMargin / 100)) / 1000) * 1000

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-pointer"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0c0d12] border border-gray-800 backdrop-blur-xl rounded-2xl p-6 w-full max-w-xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative cursor-default text-left max-h-[90vh] flex flex-col"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 rounded-t-2xl" />

        {/* Cabecera del modal */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wider uppercase">
                Importación Masiva de Pantallas
              </h2>
              <p className="text-gray-500 text-[10px] tracking-wide mt-0.5">
                Carga rápida mediante archivo Excel (.xlsx) o CSV (.csv) con margen inteligente
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-500 hover:text-white hover:bg-gray-900 rounded-lg transition-all cursor-pointer border-none bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 space-y-4 flex-1 custom-scroll">
          {/* Tarjeta de descarga de plantilla */}
          <div className="bg-gray-950/70 border border-gray-850 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <FileText size={15} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Plantilla sugerida</p>
                <p className="text-[10px] text-gray-500">Columnas: marca, modelo, calidad, precio_costo, precio_venta</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-750 text-cyan-400 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={13} />
              {downloadingTemplate ? 'Descargando...' : 'Plantilla CSV'}
            </button>
          </div>

          {/* Mensaje de Error General */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-400 text-xs"
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Vista de Resultados tras procesar */}
          {result ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-300">¡Importación completada!</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Se procesaron exitosamente las filas del archivo.
                  </p>
                </div>
              </div>

              {/* Estadísticas de la importación */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-gray-950 border border-gray-850 text-center">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Leídos</p>
                  <p className="text-xl font-black text-white mt-1">{result.total_processed}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-center">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Nuevos</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">+{result.created}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-center">
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Actualizados</p>
                  <p className="text-xl font-black text-purple-400 mt-1">{result.updated}</p>
                </div>
              </div>

              {/* Lista de advertencias / errores si hubo */}
              {result.errors && result.errors.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <AlertTriangle size={15} />
                    <span>Filas omitidas o con advertencias ({result.errors.length}):</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px] text-gray-400 custom-scroll pr-1">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="p-2 bg-black/40 rounded-lg border border-gray-850 flex justify-between gap-2">
                        <span className="font-semibold text-gray-300">Fila {err.row}: {err.brand} {err.model}</span>
                        <span className="text-amber-400/90">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setResult(null)
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-900 text-gray-300 text-xs font-bold transition-all cursor-pointer bg-transparent"
                >
                  Cargar otro archivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUploaded()
                    onClose()
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-950/20 transition-all cursor-pointer border-none"
                >
                  Finalizar y Ver Catálogo
                </button>
              </div>
            </motion.div>
          ) : (
            /* Zona de Selección y Subida de Archivo */
            <>
              {/* Selector de Margen Automático si no hay precio de venta */}
              <div className="p-3.5 bg-gradient-to-br from-cyan-950/20 to-purple-950/20 border border-cyan-500/20 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-black uppercase tracking-wider">
                    <TrendingUp size={14} />
                    <span>Margen de Ganancia por defecto</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Si el archivo solo trae costos</span>
                </div>

                <p className="text-[11px] text-gray-400">
                  Selecciona el margen para calcular el precio público automáticamente:
                </p>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '+50% (x1.5)', value: 50 },
                    { label: '+75% (x1.75)', value: 75 },
                    { label: '+100% (x2.0 Doble)', value: 100 },
                    { label: '+120% (x2.2)', value: 120 }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setIsCustomMargin(false)
                        setMarginPercent(opt.value)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        !isCustomMargin && marginPercent === opt.value
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomMargin(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isCustomMargin
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {isCustomMargin && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-gray-400">Margen personalizado:</span>
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={customMargin}
                        onChange={e => setCustomMargin(e.target.value)}
                        placeholder="100"
                        className="w-full bg-gray-950 border border-purple-500/40 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-purple-400 pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">%</span>
                    </div>
                  </div>
                )}

                {/* Previsualización del cálculo en tiempo real */}
                <div className="p-2 bg-black/40 border border-gray-850 rounded-lg flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Ejemplo: Costo $30.000</span>
                  <span className="text-emerald-400 font-bold">
                    ➔ Venta calculada: ${(sampleSale).toLocaleString('es-CL')} (+{activeMargin}%)
                  </span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .txt, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0])
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : file
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-gray-800 hover:border-gray-700 bg-gray-950/50 hover:bg-gray-900/30'
                }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{file.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB • Haz clic o arrastra para cambiar archivo
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-200">
                        Arrastra tu archivo aquí o <span className="text-cyan-400 underline">haz clic para examinar</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Soporta Excel (.xlsx, .xls) y CSV (.csv) hasta 10 MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Guía rápida de formato */}
              <div className="p-3 bg-gray-950/50 border border-gray-850/70 rounded-xl text-[11px] text-gray-400 space-y-1">
                <p className="font-bold text-gray-300">💡 Lógica inteligente de importación:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-gray-500 text-[10px]">
                  <li>Si tu archivo solo trae el costo, el precio al público se calculará con el <span className="text-cyan-400 font-semibold">+{activeMargin}%</span> seleccionado.</li>
                  <li>Si ya tienes modelos registrados, se <span className="text-purple-400 font-semibold">actualizarán los costos y precios</span>.</li>
                  <li>Modelos no registrados se <span className="text-emerald-400 font-semibold">crearán automáticamente</span>.</li>
                </ul>
              </div>

              <motion.button
                type="button"
                onClick={handleUpload}
                disabled={!file || loading}
                whileHover={!file || loading ? {} : { scale: 1.02 }}
                whileTap={!file || loading ? {} : { scale: 0.98 }}
                className="w-full bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black font-black py-3 rounded-xl text-xs tracking-wider uppercase mt-2 shadow-lg shadow-cyan-950/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all border-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    <span>Procesando archivo con margen +{activeMargin}%...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={15} className="stroke-[2.5]" />
                    <span>Procesar e Importar Pantallas (+{activeMargin}%)</span>
                  </>
                )}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Paleta dinámica y colores tecnológicos por marca
function getBrandColors(brand) {
  const b = (brand || '').toLowerCase().trim()
  if (b.includes('apple') || b.includes('iphone')) return {
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(6,182,212,0.22)] hover:border-cyan-500/40',
    active: 'border-cyan-400/60 bg-gradient-to-b from-cyan-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(6,182,212,0.3)]',
    hex: '#22d3ee',
    dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
  }
  if (b.includes('samsung')) return {
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.22)] hover:border-blue-500/40',
    active: 'border-blue-400/60 bg-gradient-to-b from-blue-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(59,130,246,0.3)]',
    hex: '#60a5fa',
    dot: 'bg-blue-400 shadow-[0_0_8px_#60a5fa]'
  }
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return {
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(249,115,22,0.22)] hover:border-orange-500/40',
    active: 'border-orange-400/60 bg-gradient-to-b from-orange-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(249,115,22,0.3)]',
    hex: '#fb923c',
    dot: 'bg-orange-400 shadow-[0_0_8px_#fb923c]'
  }
  if (b.includes('motorola') || b.includes('moto')) return {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.22)] hover:border-emerald-500/40',
    active: 'border-emerald-400/60 bg-gradient-to-b from-emerald-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(16,185,129,0.3)]',
    hex: '#34d399',
    dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
  }
  if (b.includes('huawei')) return {
    badge: 'bg-red-500/15 text-red-300 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(239,68,68,0.22)] hover:border-red-500/40',
    active: 'border-red-400/60 bg-gradient-to-b from-red-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(239,68,68,0.3)]',
    hex: '#f87171',
    dot: 'bg-red-400 shadow-[0_0_8px_#f87171]'
  }
  if (b.includes('honor')) return {
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_12px_rgba(2,132,199,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(2,132,199,0.22)] hover:border-sky-500/40',
    active: 'border-sky-400/60 bg-gradient-to-b from-sky-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(2,132,199,0.3)]',
    hex: '#38bdf8',
    dot: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
  }
  if (b.includes('oppo')) return {
    badge: 'bg-green-500/15 text-green-300 border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(34,197,94,0.22)] hover:border-green-500/40',
    active: 'border-green-400/60 bg-gradient-to-b from-green-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(34,197,94,0.3)]',
    hex: '#4ade80',
    dot: 'bg-green-400 shadow-[0_0_8px_#4ade80]'
  }
  if (b.includes('vivo')) return {
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-[0_0_12px_rgba(129,140,248,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(129,140,248,0.22)] hover:border-indigo-500/40',
    active: 'border-indigo-400/60 bg-gradient-to-b from-indigo-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(129,140,248,0.3)]',
    hex: '#818cf8',
    dot: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
  }
  if (b.includes('realme')) return {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(245,158,11,0.22)] hover:border-amber-500/40',
    active: 'border-amber-400/60 bg-gradient-to-b from-amber-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(245,158,11,0.3)]',
    hex: '#fbbf24',
    dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
  }
  if (b.includes('infinix')) return {
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(168,85,247,0.22)] hover:border-purple-500/40',
    active: 'border-purple-400/60 bg-gradient-to-b from-purple-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(168,85,247,0.3)]',
    hex: '#c084fc',
    dot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
  }
  if (b.includes('tecno')) return {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(244,63,94,0.22)] hover:border-rose-500/40',
    active: 'border-rose-400/60 bg-gradient-to-b from-rose-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(244,63,94,0.3)]',
    hex: '#fb7185',
    dot: 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
  }
  if (b.includes('oneplus')) return {
    badge: 'bg-red-600/15 text-red-300 border-red-500/30 shadow-[0_0_12px_rgba(220,38,38,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(220,38,38,0.22)] hover:border-red-500/40',
    active: 'border-red-400/60 bg-gradient-to-b from-red-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(220,38,38,0.3)]',
    hex: '#ef4444',
    dot: 'bg-red-400 shadow-[0_0_8px_#ef4444]'
  }
  if (b.includes('google') || b.includes('pixel')) return {
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.22)] hover:border-blue-500/40',
    active: 'border-blue-400/60 bg-gradient-to-b from-blue-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(59,130,246,0.3)]',
    hex: '#60a5fa',
    dot: 'bg-blue-400 shadow-[0_0_8px_#60a5fa]'
  }
  if (b.includes('sony') || b.includes('xperia')) return {
    badge: 'bg-slate-500/15 text-slate-200 border-slate-500/30 shadow-[0_0_12px_rgba(148,163,184,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(148,163,184,0.22)] hover:border-slate-500/40',
    active: 'border-slate-300/60 bg-gradient-to-b from-slate-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(148,163,184,0.3)]',
    hex: '#cbd5e1',
    dot: 'bg-slate-300 shadow-[0_0_8px_#cbd5e1]'
  }
  return {
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
    glow: 'hover:shadow-[0_12px_32px_-4px_rgba(168,85,247,0.22)] hover:border-purple-500/40',
    active: 'border-purple-400/60 bg-gradient-to-b from-purple-950/25 via-slate-950/90 to-[#08090e] shadow-[0_14px_40px_-6px_rgba(168,85,247,0.3)]',
    hex: '#c084fc',
    dot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
  }
}

function ScreenCard({ group, onEdit, onDelete, onAddVariant, onEditGroup, onDeleteGroup }) {
  const [expanded, setExpanded] = useState(false)

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(val)
  }

  const brandStyles = getBrandColors(group.brand)

  // Cálculos de métricas por grupo
  const sales = group.variants.map(v => parseFloat(v.sale_price))
  const costs = group.variants.map(v => parseFloat(v.cost_price))
  const minSale = Math.min(...sales)
  const maxSale = Math.max(...sales)
  const maxProfit = Math.max(...group.variants.map(v => parseFloat(v.sale_price) - parseFloat(v.cost_price)))
  const minCost = Math.min(...costs)
  const avgGroupMargin = group.variants.length > 0
    ? Math.round(group.variants.reduce((acc, v) => {
        const s = parseFloat(v.sale_price)
        const c = parseFloat(v.cost_price)
        return acc + (s > 0 ? ((s - c) / s) * 100 : 0)
      }, 0) / group.variants.length)
    : 0

  const priceDisplay = group.variants.length > 1
    ? (minSale === maxSale ? formatCurrency(minSale) : `${formatCurrency(minSale)} ~ ${formatCurrency(maxSale)}`)
    : formatCurrency(group.variants[0].sale_price)

  return (
    <motion.div 
      layout="position"
      whileHover={{ y: -5, scale: 1.012 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={`border rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col backdrop-blur-2xl relative shadow-[0_10px_35px_rgba(0,0,0,0.45)] text-left ${
        expanded 
          ? brandStyles.active 
          : `bg-[#0a0c12]/80 border-gray-850/80 hover:bg-[#0d1018]/90 ${brandStyles.glow}`
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Resplandor ambiental de fondo */}
      <div 
        className="absolute top-0 right-0 w-36 h-36 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none blur-2xl -z-10"
        style={{ 
          background: `radial-gradient(circle, ${brandStyles.hex}40, transparent 70%)` 
        }}
      />

      {/* Cabecera Principal de la Tarjeta */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 select-none">
        
        {/* Fila 1: Marca, Badge de Calidades & Acciones Rápidas */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] uppercase font-black border tracking-wider flex items-center gap-1.5 ${brandStyles.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${brandStyles.dot}`} />
              {group.brand}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-gray-900/80 border border-gray-800 text-[8.5px] font-bold text-gray-400 font-mono">
              {group.variants.length} {group.variants.length === 1 ? 'Calidad' : 'Calidades'}
            </span>
          </div>
          
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onAddVariant(group.brand, group.model)}
              title="Agregar otra calidad a este modelo"
              className="w-7 h-7 border border-gray-800/80 bg-gray-950/80 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/40 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              <Plus size={13} className="stroke-[3]" />
            </button>

            <button
              type="button"
              onClick={() => onEditGroup(group)}
              title="Editar marca o nombre de modelo"
              className="w-7 h-7 border border-gray-800/80 bg-gray-950/80 text-gray-400 hover:text-purple-400 hover:border-purple-500/40 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              <Edit2 size={11} />
            </button>

            <button
              type="button"
              onClick={() => onDeleteGroup(group)}
              title="Eliminar este modelo completo"
              className="w-7 h-7 border border-gray-800/80 bg-gray-950/80 text-gray-500 hover:text-rose-400 hover:border-rose-500/40 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* Fila 2: Nombre del Dispositivo */}
        <div>
          <h3 className="text-white font-extrabold text-base md:text-lg tracking-tight leading-snug group-hover:text-cyan-300 transition-colors">
            {group.model}
          </h3>
        </div>

        {/* Fila 3: Hero Card de Precios & Rentabilidad */}
        <div className="pt-2 border-t border-gray-850/60 flex items-end justify-between gap-3">
          <div>
            <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black block">
              Precio al Público
            </span>
            <span className="text-cyan-400 font-mono font-black text-sm md:text-base tracking-tight drop-shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              {priceDisplay}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black block">
              Margen Estimado
            </span>
            <span className="text-emerald-400 font-mono font-bold text-xs">
              +{avgGroupMargin}%
            </span>
          </div>

          <div 
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="text-gray-400 bg-gray-950/80 p-1.5 rounded-lg border border-gray-800 hover:text-white hover:border-gray-700 transition-all cursor-pointer shrink-0 ml-1"
          >
            {expanded ? <ChevronUp size={13} className="text-cyan-400" /> : <ChevronDown size={13} />}
          </div>
        </div>

      </div>

      {/* Chips de calidades disponibles (Visible cuando está plegado) */}
      {!expanded && (
        <div className="px-4 sm:px-5 pb-4 pt-0 flex flex-wrap gap-1.5 select-none">
          {group.variants.map((v) => (
            <span 
              key={v.id} 
              className="px-2 py-0.5 rounded-md bg-gray-950/60 border text-[8.5px] font-bold uppercase tracking-wider font-mono text-gray-300 border-gray-800"
            >
              {v.quality || 'Original'}
            </span>
          ))}
        </div>
      )}

      {/* Desglose Detallado de Calidades (Expandible) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="border-t border-gray-850/80 bg-black/40"
          >
            <div className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-[9px] text-gray-500 uppercase font-black tracking-widest px-1">
                <span>Variantes de Pantalla ({group.variants.length})</span>
                <span>Rentabilidad</span>
              </div>

              {group.variants.map((variant) => {
                const cost = parseFloat(variant.cost_price)
                const sale = parseFloat(variant.sale_price)
                const profit = sale - cost
                const marginPercent = sale > 0 ? Math.round((profit / sale) * 100) : 0

                let badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                if (marginPercent < 30) {
                  badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20"
                }

                return (
                  <div 
                    key={variant.id} 
                    className="relative bg-gray-950/70 border border-gray-850 hover:border-gray-750 rounded-xl p-3 text-left transition-all flex flex-col gap-2.5 overflow-hidden"
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ backgroundColor: brandStyles.hex }}
                    />

                    <div className="pl-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black text-xs uppercase tracking-wider font-mono">
                          {variant.quality || 'Original'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold font-mono border ${badgeColor}`}>
                          +{marginPercent}% margen
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onEdit(variant)}
                          className="w-6 h-6 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-gray-850 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                          title="Editar precio de esta variante"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(variant)}
                          className="w-6 h-6 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 border border-gray-850 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                          title="Eliminar esta variante"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-1.5 w-full">
                      <div className="bg-black/60 border border-gray-850/80 rounded-lg px-2.5 py-1.5">
                        <p className="text-[7px] text-gray-500 uppercase tracking-widest font-black">Costo Repuesto</p>
                        <p className="text-gray-300 font-mono font-bold text-[10.5px] mt-0.5">{formatCurrency(cost)}</p>
                      </div>

                      <div className="bg-black/60 border border-gray-850/80 rounded-lg px-2.5 py-1.5">
                        <p className="text-[7px] text-cyan-400 uppercase tracking-widest font-black">Precio Cliente</p>
                        <p className="text-cyan-300 font-mono font-black text-[10.5px] mt-0.5">{formatCurrency(sale)}</p>
                      </div>

                      <div className="bg-black/60 border border-gray-850/80 rounded-lg px-2.5 py-1.5">
                        <p className="text-[7px] text-emerald-400 uppercase tracking-widest font-black">Ganancia Neta</p>
                        <p className="text-emerald-400 font-mono font-black text-[10.5px] mt-0.5">+{formatCurrency(profit)}</p>
                      </div>
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
  const [sortBy, setSortBy] = useState('name_asc')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [showBulkModal, setShowBulkModal] = useState(false)

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

  const onEditGroup = (group) => {
    setEditingGroup(group)
    setShowGroupModal(true)
  }

  const onDeleteGroup = async (group) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el modelo ${group.brand} ${group.model} y todas sus calidades asociadas?`)) {
      try {
        setLoading(true)
        await Promise.all(group.variants.map(v => deleteScreenPrice(v.id)))
        fetchPrices()
      } catch (err) {
        alert(parseError(err, 'Error al eliminar el modelo de pantalla.'))
      } finally {
        setLoading(false)
      }
    }
  }

  const onDelete = async (item) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la pantalla ${item.brand} ${item.model}?`)) {
      try {
        await deleteScreenPrice(item.id)
        fetchPrices()
      } catch (err) {
        alert(parseError(err, 'Error al eliminar la pantalla.'))
      }
    }
  }

  useEffect(() => {
    fetchPrices()
  }, [])

  // Métricas generales
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

  // Marcas dinámicas: combinamos las marcas del sistema + cualquier marca que exista en la BD
  const detectedBrandsInDB = Array.from(new Set(items.map(i => i.brand?.trim()).filter(Boolean)))
  
  // Ordenar marcas para la barra: primero las que tienen datos en BD, luego el resto de catálogo estándar
  const allDisplayBrands = Array.from(new Set([
    ...detectedBrandsInDB.sort((a, b) => a.localeCompare(b)),
    ...BRANDS
  ]))

  // Contador de modelos por marca para los badges de las pestañas
  const getBrandCount = (brandName) => {
    if (brandName === 'Todas') {
      return new Set(items.map(i => `${i.brand}::${i.model}`.toLowerCase())).size
    }
    if (brandName === 'Otras') {
      return new Set(
        items.filter(i => !BRANDS.some(b => b.toLowerCase() === i.brand?.toLowerCase()))
          .map(i => `${i.brand}::${i.model}`.toLowerCase())
      ).size
    }
    return new Set(
      items.filter(i => i.brand?.toLowerCase() === brandName.toLowerCase())
        .map(i => `${i.brand}::${i.model}`.toLowerCase())
    ).size
  }

  // Filtrado de items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.model.toLowerCase().includes(search.toLowerCase()) || 
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      (item.quality && item.quality.toLowerCase().includes(search.toLowerCase()))
    
    const matchesBrand = selectedBrand === 'Todas'
      ? true
      : selectedBrand === 'Otras'
        ? !BRANDS.some(b => b.toLowerCase() === item.brand?.toLowerCase())
        : item.brand.toLowerCase() === selectedBrand.toLowerCase()

    return matchesSearch && matchesBrand
  })

  // Agrupamiento por Marca y Modelo
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

  // Ordenamiento de las variantes dentro de cada tarjeta
  groupedItems.forEach(g => {
    g.variants.sort((a, b) => (a.quality || '').localeCompare(b.quality || ''))
  })

  // Ordenamiento del listado completo
  groupedItems.sort((a, b) => {
    if (sortBy === 'name_asc') {
      return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`)
    }
    if (sortBy === 'name_desc') {
      return `${b.brand} ${b.model}`.localeCompare(`${a.brand} ${a.model}`)
    }
    if (sortBy === 'price_asc') {
      const minA = Math.min(...a.variants.map(v => parseFloat(v.sale_price)))
      const minB = Math.min(...b.variants.map(v => parseFloat(v.sale_price)))
      return minA - minB
    }
    if (sortBy === 'price_desc') {
      const maxA = Math.max(...a.variants.map(v => parseFloat(v.sale_price)))
      const maxB = Math.max(...b.variants.map(v => parseFloat(v.sale_price)))
      return maxB - maxA
    }
    if (sortBy === 'variants_desc') {
      return b.variants.length - a.variants.length
    }
    return 0
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
          overflow-x: hidden;
        }
        
        .custom-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 12px;
        }
      `}</style>

      <div className="screens-page">
        <AnimatedBackground />
        
        {/* Luces volumétricas ambientales */}
        <div className="fixed top-0 left-1/4 w-[450px] h-[450px] bg-cyan-500/8 rounded-full blur-[130px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[450px] h-[450px] bg-purple-500/8 rounded-full blur-[130px] pointer-events-none" />

        {/* Encabezado Superior */}
        <header className="relative z-10 border-b border-gray-900/60 backdrop-blur-2xl bg-gray-950/60 px-6 py-4 sticky top-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-9 h-9 border border-gray-800/80 rounded-xl bg-gray-950/60 text-gray-400 hover:text-white hover:border-gray-700 flex items-center justify-center cursor-pointer transition-all active:scale-95" 
              title="Volver al panel"
            >
              <ArrowLeft size={16} />
            </button>
            
            <div className="text-center">
              <h1 className="text-sm font-black tracking-widest text-white uppercase flex items-center justify-center gap-2">
                <Smartphone size={16} className="text-cyan-400 animate-pulse" /> Catálogo de Pantallas
              </h1>
              <p className="text-gray-500 text-[9.5px] uppercase tracking-widest mt-0.5 font-bold">
                Precios de repuestos & Márgenes de reparación
              </p>
            </div>
            
            <div className="w-9" />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10 text-center space-y-6">
          
          {/* Métricas Resumen Superior */}
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-950/50 border border-gray-850/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-left flex items-center justify-between shadow-lg"
              >
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-black mb-1">Total Modelos</p>
                  <p className="text-2xl sm:text-3xl font-black text-white font-mono">{totalModels}</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold">{items.length} pantallas / calidades</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                  <Smartphone size={20} />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-gray-950/50 border border-gray-850/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-left flex items-center justify-between shadow-lg"
              >
                <div>
                  <p className="text-[10px] text-purple-400/80 uppercase tracking-wider font-black mb-1">Margen Promedio</p>
                  <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">+{avgMargin}%</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold">Rentabilidad comercial</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
                  <Percent size={18} />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-950/50 border border-gray-850/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-left flex items-center justify-between shadow-lg"
              >
                <div>
                  <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-black mb-1">Ganancia Promedio</p>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">+{formatCurrency(avgProfit)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold">Por reemplazo de pantalla</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <TrendingUp size={20} />
                </div>
              </motion.div>
            </div>
          )}

          {/* Barra de Búsqueda, Filtros y Acciones */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Input de Búsqueda */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por modelo (ej. iPhone 13, A52, Note 11) o calidad..."
                className="w-full bg-gray-950/70 border border-gray-800 hover:border-gray-700 focus:border-cyan-500/60 focus:outline-none rounded-xl pl-9 pr-9 py-2.5 text-xs text-white transition-all placeholder-gray-500 backdrop-blur-sm"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white border-none bg-transparent cursor-pointer p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Ordenamiento y Botones de Acción */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Selector de Orden */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-gray-950/80 border border-gray-800 text-gray-300 hover:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-cyan-500 appearance-none pr-8 cursor-pointer"
                >
                  <option value="name_asc">Nombre (A - Z)</option>
                  <option value="name_desc">Nombre (Z - A)</option>
                  <option value="price_asc">Precio: Menor a Mayor</option>
                  <option value="price_desc">Precio: Mayor a Menor</option>
                  <option value="variants_desc">Más Calidades</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>

              {/* Botón Importación Masiva Excel / CSV */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowBulkModal(true)}
                className="flex-1 sm:flex-initial bg-gray-900/90 hover:bg-gray-850 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20 cursor-pointer transition-all"
                title="Cargar pantallas masivamente desde Excel o CSV con margen"
              >
                <FileSpreadsheet size={15} /> Importar Excel / CSV
              </motion.button>

              {/* Botón Agregar Individual */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingItem(null)
                  setShowModal(true)
                }}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/25 cursor-pointer border-none transition-all"
              >
                <Plus size={14} className="stroke-[3]" /> Nueva Pantalla
              </motion.button>
            </div>
          </div>

          {/* BARRA DE MARCAS COMPLETA & RESPONSIVA */}
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 custom-scroll justify-start px-0.5 select-none">
              {/* Botón "Todas" */}
              <button
                type="button"
                onClick={() => setSelectedBrand('Todas')}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedBrand === 'Todas'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-gray-950/60 border-gray-850 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <span>Todas</span>
                <span className="px-1.5 py-0.2 rounded bg-black/50 text-[8.5px] font-mono text-gray-400">
                  {getBrandCount('Todas')}
                </span>
              </button>

              {/* Lista Completa de Marcas */}
              {allDisplayBrands.map(brand => {
                const count = getBrandCount(brand)
                const isSelected = selectedBrand.toLowerCase() === brand.toLowerCase()
                const bStyle = getBrandColors(brand)

                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? `${bStyle.badge} border-current shadow-[0_0_14px_rgba(255,255,255,0.15)] scale-[1.02]`
                        : 'bg-gray-950/60 border-gray-850 text-gray-400 hover:text-gray-200 hover:border-gray-750'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? bStyle.dot : 'bg-gray-600'}`} />
                    <span>{brand}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono ${isSelected ? 'bg-black/50 text-white font-black' : 'bg-gray-900 text-gray-500'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Pestaña "Otras" si aplica */}
              <button
                type="button"
                onClick={() => setSelectedBrand('Otras')}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedBrand === 'Otras'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                    : 'bg-gray-950/60 border-gray-850 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <span>Otras</span>
                {getBrandCount('Otras') > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-black/50 text-[8.5px] font-mono text-purple-400">
                    {getBrandCount('Otras')}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Estado de Resultados */}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Mostrando <strong className="text-white font-mono">{groupedItems.length}</strong> modelos ({filteredItems.length} precios)
            </span>
            {(selectedBrand !== 'Todas' || search) && (
              <button
                onClick={() => {
                  setSelectedBrand('Todas')
                  setSearch('')
                }}
                className="text-cyan-400 hover:underline cursor-pointer text-xs bg-transparent border-none p-0"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Grid de Tarjetas Remodelado */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Cargando catálogo de pantallas...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 border border-gray-850 rounded-3xl bg-gray-950/40 text-center backdrop-blur-xl p-8 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-gray-900/80 border border-gray-800 flex items-center justify-center text-gray-600 mx-auto mb-4">
                <Smartphone size={28} />
              </div>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-1">
                No se encontraron pantallas
              </h3>
              <p className="text-gray-500 text-xs mb-5">
                No hay coincidencias para el filtro o término de búsqueda ingresado.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    setSelectedBrand('Todas')
                    setSearch('')
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-300 text-xs font-bold transition-all cursor-pointer border border-gray-800"
                >
                  Restablecer Filtros
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all cursor-pointer border-none"
                >
                  Importar Archivo
                </button>
              </div>
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
                  onEditGroup={onEditGroup}
                  onDeleteGroup={onDeleteGroup}
                />
              ))}
            </div>
          )}
        </main>

        <AnimatePresence>
          {showBulkModal && (
            <BulkUploadModal
              onClose={() => setShowBulkModal(false)}
              onUploaded={() => {
                fetchPrices()
              }}
            />
          )}
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
          {showGroupModal && (
            <GroupEditModal 
              group={editingGroup}
              onClose={() => {
                setShowGroupModal(false)
                setEditingGroup(null)
              }} 
              onSaved={() => {
                setShowGroupModal(false)
                setEditingGroup(null)
                fetchPrices()
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )
}


