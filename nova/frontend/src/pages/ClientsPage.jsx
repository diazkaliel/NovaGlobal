import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Search, Users, Phone, Mail, ChevronRight, X, Download, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClientApi } from '../api/clients'
import AnimatedBackground from '../components/AnimatedBackground'
import { parseError } from '../utils/errors'
import BravoBackground from '../components/bravo/BravoBackground'
import BravoLayout from '../components/bravo/BravoLayout'

function parseCSV(text) {
  const lines = []
  let row = [""]
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i+1]

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      row.push("")
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++
      }
      lines.push(row)
      row = [""]
    } else {
      row[row.length - 1] += c
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row)
  }
  return lines
}

const inputClass = "w-full bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus:border-purple-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

function Field({ label, required, isBravo, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
        {label} {required && <span className={isBravo ? "text-bravo-accent" : "text-purple-500"}>*</span>}
      </label>
      {children}
    </div>
  )
}

function NewClientModal({ onClose, onCreated }) {
  const isBravo = (localStorage.getItem('selected_system') || 'nova') === 'bravo'
  const modalInputClass = isBravo
    ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all placeholder-stone-400"
    : "w-full bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus:border-purple-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

  const [form, setForm] = useState({ name: '', phone: '', email: '', rut: '', city: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        rut: form.rut || null,
        city: form.city || null,
      }
      await createClientApi(payload)
      onCreated()
    } catch (err) {
      setError(parseError(err, 'Error al crear el cliente'))
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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className={`${isBravo ? 'bg-bravo-card border border-bravo-border backdrop-blur-xl shadow-xl text-bravo-text' : 'bg-gray-950 border border-gray-800 text-white'} rounded-2xl p-6 w-full max-w-md`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isBravo ? 'text-bravo-text' : 'text-white'}`}>Nuevo Cliente</h2>
          <button onClick={onClose} className={`${isBravo ? 'text-bravo-text-muted hover:text-bravo-text' : 'text-gray-500 hover:text-white'} transition-colors cursor-pointer`}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre completo" required isBravo={isBravo}>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Pérez"
              required
              className={modalInputClass}
            />
          </Field>
          <Field label="Teléfono" required isBravo={isBravo}>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+56 9 1234 5678"
              required
              className={modalInputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RUT" isBravo={isBravo}>
              <input
                value={form.rut}
                onChange={e => setForm({ ...form, rut: e.target.value })}
                placeholder="12.345.678-9"
                className={modalInputClass}
              />
            </Field>
            <Field label="Ciudad" isBravo={isBravo}>
              <input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Santiago"
                className={modalInputClass}
              />
            </Field>
          </div>
          <Field label="Email" isBravo={isBravo}>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="correo@email.com"
              className={modalInputClass}
            />
          </Field>

          {error && (
            <div className={`rounded-xl px-4 py-2.5 text-sm text-center font-medium ${isBravo ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full py-3 rounded-xl font-bold text-sm cursor-pointer ${isBravo ? 'text-black shadow-md shadow-amber-500/10' : 'text-white'}`}
            style={{ background: isBravo ? 'linear-gradient(135deg, #fbbf24, #f97316)' : 'linear-gradient(135deg, var(--color-purple-400), var(--color-cyan-400))' }}
          >
            {loading ? 'Guardando...' : 'Crear Cliente'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const fileInputRef = useRef(null)
  const [importSummary, setImportSummary] = useState(null)

  const handleImportCSVFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target.result
      const rows = parseCSV(text)
      if (rows.length < 2) {
        alert('El archivo CSV está vacío o no contiene suficientes filas.')
        return
      }

      const headers = rows[0].map(h => h.trim().toLowerCase())
      const nameIndex = headers.indexOf('fullname')
      const emailIndex = headers.indexOf('email')
      const phoneIndex = headers.indexOf('phone')
      const dniIndex = headers.indexOf('dni')
      const descIndex = headers.indexOf('contactdescription')

      if (nameIndex === -1 || phoneIndex === -1) {
        alert('El archivo CSV debe contener al menos las columnas "FullName" y "Phone".')
        return
      }

      let successCount = 0
      let duplicateCount = 0
      let errorCount = 0

      setLoading(true)

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (row.length < 2 || !row[nameIndex]) continue

        const payload = {
          name: row[nameIndex].trim(),
          phone: row[phoneIndex] ? row[phoneIndex].trim() : '',
          email: emailIndex !== -1 && row[emailIndex] ? row[emailIndex].trim() : null,
          rut: dniIndex !== -1 && row[dniIndex] ? row[dniIndex].trim() : null,
          city: descIndex !== -1 && row[descIndex] ? row[descIndex].trim() : null,
        }

        if (payload.email === '') payload.email = null
        if (payload.rut === '') payload.rut = null
        if (payload.city === '') payload.city = null

        if (!payload.name || !payload.phone) {
          errorCount++
          continue
        }

        try {
          await createClientApi(payload)
          successCount++
        } catch (err) {
          if (err.response?.status === 400) {
            duplicateCount++
          } else {
            console.error('Error importando cliente:', err)
            errorCount++
          }
        }
      }

      e.target.value = ''
      setImportSummary({
        success: successCount,
        duplicates: duplicateCount,
        errors: errorCount
      })
      fetchClients(search)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleExportCSV = () => {
    if (clients.length === 0) return

    // 1. Cabeceras del CSV especificadas
    const headers = ['FullName', 'Email', 'Phone', 'Dni', 'ContactDescription']

    // 2. Mapeo de campos: FullName (name), Email, Phone, Dni (rut), ContactDescription (city)
    const rows = clients.map(client => [
      client.name,
      client.email || '',
      client.phone,
      client.rut || '',
      client.city || ''
    ])

    const escapeCSV = (val) => {
      const stringVal = val === null || val === undefined ? '' : String(val)
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`
      }
      return stringVal
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Con el BOM (\uFEFF) para soporte óptimo de caracteres latinos (acentos, ñ) en Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `clientes_nova_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchClients = async (searchTerm = '') => {
    setLoading(true)
    try {
      const params = {}
      if (searchTerm) params.search = searchTerm
      const res = await getClients(params)
      setClients(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [])

  // Debounce de búsqueda
  useEffect(() => {
    const timeout = setTimeout(() => fetchClients(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const selectedSystem = localStorage.getItem('selected_system') || 'nova'
  const isBravo = selectedSystem === 'bravo'

  if (isBravo) {
    return (
      <BravoLayout>
        <div className="space-y-6 relative">
          <BravoBackground />

          {/* Glow Effects */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bravo-border pb-5">
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent to-bravo-accent-warm bg-clip-text text-transparent">
                Clientes
              </h1>
              <p className="text-bravo-text-muted text-xs mt-1">{clients.length} clientes registrados</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImportCSVFile}
              />

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-bravo-text-muted border border-bravo-border hover:border-stone-300 bg-white/40 hover:text-bravo-text transition-all duration-200 cursor-pointer shadow-xs"
              >
                <Upload size={14} className="text-bravo-accent" />
                Importar CSV
              </motion.button>

              {clients.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-bravo-text-muted border border-bravo-border hover:border-stone-300 bg-white/40 hover:text-bravo-text transition-all duration-200 cursor-pointer shadow-xs"
                >
                  <Download size={14} className="text-bravo-accent-warm" />
                  Exportar CSV
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black cursor-pointer shadow-md shadow-amber-500/10"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
              >
                <Plus size={14} />
                Nuevo Cliente
              </motion.button>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative mb-6">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o RUT..."
              className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-amber-500/50 transition-all placeholder-stone-400"
            />
          </div>

          {/* Lista */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-white/40 border border-bravo-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-24 bg-bravo-card border border-bravo-border rounded-2xl shadow-xs">
              <Users size={48} className="mx-auto text-stone-300 mb-4" />
              <p className="text-bravo-text-muted text-sm">No hay clientes registrados</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 text-bravo-accent hover:text-bravo-accent text-sm font-semibold transition-colors cursor-pointer"
              >
                + Registrar primer cliente
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {clients.map((client, i) => (
                  <motion.button
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="w-full text-left bg-bravo-card border border-bravo-border hover:border-stone-300 rounded-xl p-4 transition-all hover:bg-white/95 flex items-center gap-4 shadow-sm cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-bravo-accent/12 border border-bravo-accent/25 flex items-center justify-center shrink-0">
                      <span className="text-amber-700 font-bold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-bravo-text">{client.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-bravo-text-muted text-xs flex items-center gap-1">
                          <Phone size={10} className="text-stone-450" />
                          {client.phone}
                        </span>
                        {client.email && (
                          <span className="text-bravo-text-muted text-xs flex items-center gap-1 truncate">
                            <Mail size={10} className="text-stone-450" />
                            {client.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {client.city && (
                      <span className="text-bravo-text-muted text-xs shrink-0">{client.city}</span>
                    )}

                    <ChevronRight size={16} className="text-bravo-text-muted shrink-0" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showNewModal && (
            <NewClientModal
              onClose={() => setShowNewModal(false)}
              onCreated={() => {
                setShowNewModal(false)
                fetchClients(search)
              }}
            />
          )}

          {importSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setImportSummary(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={e => e.stopPropagation()}
                className="bg-bravo-card border border-bravo-border rounded-2xl p-6 w-full max-w-sm shadow-xl text-left text-bravo-text"
              >
                <h3 className="text-bravo-text font-bold text-lg mb-4">Resultado de la Importación</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
                    <span className="text-emerald-400 text-sm font-semibold">Clientes Creados</span>
                    <span className="text-emerald-400 font-bold">{importSummary.success}</span>
                  </div>

                  <div className="flex justify-between items-center bg-bravo-accent/12 border border-bravo-accent/25 px-4 py-2.5 rounded-xl">
                    <span className="text-amber-400 text-sm font-semibold">Duplicados Omitidos</span>
                    <span className="text-amber-400 font-bold">{importSummary.duplicates}</span>
                  </div>

                  {importSummary.errors > 0 && (
                    <div className="flex justify-between items-center bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
                      <span className="text-red-400 text-sm font-semibold">Registros con Error</span>
                      <span className="text-red-400 font-bold">{importSummary.errors}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setImportSummary(null)}
                  className="w-full bg-gradient-to-r from-bravo-accent to-bravo-accent-warm hover:from-amber-600 hover:to-orange-700 text-black font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Entendido
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </BravoLayout>
    )
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      <AnimatedBackground />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
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
                  background: 'linear-gradient(135deg, var(--color-purple-400), var(--color-cyan-400))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Clientes
              </h1>
              <p className="text-gray-600 text-xs">{clients.length} clientes registrados</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImportCSVFile}
            />

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-300 border border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:text-white transition-all duration-200"
            >
              <Upload size={16} className="text-purple-400" />
              Importar CSV
            </motion.button>

            {clients.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-300 border border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:text-white transition-all duration-200"
              >
                <Download size={16} className="text-cyan-400" />
                Exportar CSV
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-purple-400), var(--color-cyan-400))' }}
            >
              <Plus size={16} />
              Nuevo Cliente
            </motion.button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">

        {/* Búsqueda */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6"
        >
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o RUT..."
            className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
          />
        </motion.div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-900/30 rounded-xl animate-pulse" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-24">
            <Users size={48} className="mx-auto text-gray-800 mb-4" />
            <p className="text-gray-600">No hay clientes registrados</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-4 text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              + Registrar primer cliente
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {clients.map((client, i) => (
                <motion.button
                  key={client.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="w-full text-left bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 hover:border-gray-700/70 rounded-xl p-4 transition-all hover:bg-gray-900/60 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 font-bold text-sm">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{client.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Phone size={10} />
                        {client.phone}
                      </span>
                      {client.email && (
                        <span className="text-gray-500 text-xs flex items-center gap-1 truncate">
                          <Mail size={10} />
                          {client.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {client.city && (
                    <span className="text-gray-600 text-xs shrink-0">{client.city}</span>
                  )}

                  <ChevronRight size={16} className="text-gray-600 shrink-0" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showNewModal && (
          <NewClientModal
            onClose={() => setShowNewModal(false)}
            onCreated={() => { setShowNewModal(false); fetchClients(search) }}
          />
        )}

        {importSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setImportSummary(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-950 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-left"
            >
              <h3 className="text-white font-bold text-lg mb-4">Resultado de la Importación</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
                  <span className="text-emerald-400 text-sm font-semibold">Clientes Creados</span>
                  <span className="text-emerald-400 font-bold">{importSummary.success}</span>
                </div>
                
                <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl">
                  <span className="text-amber-400 text-sm font-semibold">Duplicados Omitidos</span>
                  <span className="text-amber-400 font-bold">{importSummary.duplicates}</span>
                </div>

                {importSummary.errors > 0 && (
                  <div className="flex justify-between items-center bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
                    <span className="text-red-400 text-sm font-semibold">Registros con Error</span>
                    <span className="text-red-400 font-bold">{importSummary.errors}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setImportSummary(null)}
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}