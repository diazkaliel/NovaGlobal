import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Search, Users, Phone, Mail, ChevronRight, X, Download, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClientApi } from '../../api/clients'
import BravoBackground from '../../components/bravo/BravoBackground'
import { parseError } from '../../utils/errors'

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

export default function BravoClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const filtered = clients
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const fileInputRef = useRef(null)
  const [importSummary, setImportSummary] = useState(null)

  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    dni: '',
    contact_description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchClients = async (searchTerm = '') => {
    setLoading(true)
    try {
      const params = {}
      if (searchTerm) params.search = searchTerm
      const res = await getClients(params)
      const mapped = res.data.map(c => ({
        ...c,
        dni: c.rut,
        contact_description: c.city
      }))
      setClients(mapped)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [])

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => fetchClients(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const handleImportCSVFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target.result
      const rows = parseCSV(text)
      if (rows.length < 2) {
        alert('El archivo CSV está vacío.')
        return
      }

      const headers = rows[0].map(h => h.trim().toLowerCase())
      const nameIndex = headers.indexOf('fullname')
      const emailIndex = headers.indexOf('email')
      const phoneIndex = headers.indexOf('phone')
      const dniIndex = headers.indexOf('dni')
      const descIndex = headers.indexOf('contactdescription')

      if (nameIndex === -1 || phoneIndex === -1) {
        alert('El CSV debe contener al menos las columnas "FullName" y "Phone".')
        return
      }

      let successCount = 0
      let duplicateCount = 0
      let errorCount = 0

      setLoading(true)

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (row.length <= 1 && row[0] === '') continue
        const name = row[nameIndex]?.trim()
        const phone = row[phoneIndex]?.trim()
        if (!name || !phone) continue

        const email = emailIndex !== -1 ? row[emailIndex]?.trim() : ''
        const dni = dniIndex !== -1 ? row[dniIndex]?.trim() : ''
        const contact_description = descIndex !== -1 ? row[descIndex]?.trim() : ''

        try {
          await createClientApi({
            name,
            phone,
            email: email || null,
            rut: dni || null,
            city: contact_description || null
          })
          successCount++
        } catch (err) {
          if (err.response?.status === 400 && err.response?.data?.detail?.includes('ya existe')) {
            duplicateCount++
          } else {
            errorCount++
          }
        }
      }

      setImportSummary({ success: successCount, duplicates: duplicateCount, errors: errorCount })
      fetchClients()
    }
    reader.readAsText(file)
  }

  const handleCreateClient = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        name: newClient.name,
        phone: newClient.phone,
        email: newClient.email || null,
        rut: newClient.dni || null,
        city: newClient.contact_description || null
      }
      await createClientApi(payload)
      setShowNewModal(false)
      setNewClient({ name: '', phone: '', email: '', dni: '', contact_description: '' })
      fetchClients()
    } catch (err) {
      setError(parseError(err, 'Error al registrar el cliente'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['FullName', 'Phone', 'Email', 'DNI', 'ContactDescription']
    const escapeCSV = (str) => {
      if (!str) return ''
      const cleaned = str.replace(/"/g, '""')
      return `"${cleaned}"`
    }

    const rows = clients.map(c => [
      escapeCSV(c.name),
      escapeCSV(c.phone),
      escapeCSV(c.email),
      escapeCSV(c.dni),
      escapeCSV(c.contact_description)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `clientes_bravo_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 relative text-left">
      <BravoBackground />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bravo-border pb-5">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent to-bravo-accent-warm bg-clip-text text-transparent uppercase tracking-wider">
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-bravo-text-muted border border-bravo-border hover:border-stone-300 bg-white hover:text-bravo-text transition-all duration-200 cursor-pointer shadow-xs"
          >
            <Upload size={14} />
            Importar CSV
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-bravo-text-muted border border-bravo-border hover:border-stone-300 bg-white hover:text-bravo-text transition-all duration-200 cursor-pointer shadow-xs"
          >
            <Download size={14} />
            Exportar CSV
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-black cursor-pointer shadow-md shadow-bravo-glow"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          >
            <Plus size={14} className="stroke-[3]" />
            Nuevo Cliente
          </motion.button>
        </div>
      </div>

      {/* Import summary notifications */}
      {importSummary && (
        <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4.5 text-emerald-800 text-xs flex justify-between items-center shadow-xs">
          <div>
            <p className="font-bold">Resultados de la importación:</p>
            <p className="mt-1">
              • Registrados con éxito: <strong className="font-extrabold">{importSummary.success}</strong> <br />
              • Duplicados omitidos: <strong className="font-extrabold">{importSummary.duplicates}</strong> <br />
              • Errores en filas: <strong className="font-extrabold">{importSummary.errors}</strong>
            </p>
          </div>
          <button 
            onClick={() => setImportSummary(null)} 
            className="p-1 text-emerald-600 hover:text-emerald-800 border border-emerald-350 hover:bg-emerald-100 rounded-lg cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar clientes por nombre, teléfono, rut/dni..."
          className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50 transition-all placeholder-stone-400 shadow-xs"
        />
      </div>

      {/* Clients Listing */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-stone-100 border border-bravo-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bravo-card border border-bravo-border rounded-2xl py-20 text-center shadow-xs">
          <Users size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-bravo-text-muted text-sm font-semibold">No se encontraron clientes registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map(client => (
            <motion.div
              key={client.id}
              layout
              whileHover={{ y: -3, scale: 1.015 }}
              onClick={() => navigate(`/bravo/clients/${client.id}`)}
              className="bg-bravo-card border border-bravo-border hover:border-bravo-accent/35 hover:shadow-md rounded-2xl p-4.5 flex items-center justify-between transition-all duration-200 cursor-pointer"
            >
              <div className="space-y-1 min-w-0">
                <h3 className="font-bold text-sm text-bravo-text truncate">{client.name}</h3>
                <p className="text-[10px] text-bravo-text-muted font-mono">{client.phone}</p>
                {client.email && (
                  <p className="text-[10px] text-bravo-text-muted truncate max-w-[200px]">{client.email}</p>
                )}
              </div>
              <ChevronRight size={16} className="text-bravo-text-muted shrink-0" />
            </motion.div>
          ))}
        </div>
      )}

      {/* New Client Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto" onClick={() => setShowNewModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-bravo-card border border-bravo-border rounded-2xl p-7 w-full max-w-md shadow-2xl backdrop-blur-xl my-8"
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-black text-bravo-text uppercase tracking-wider">Nuevo Registro de Cliente</h2>
                <button 
                  onClick={() => setShowNewModal(false)}
                  className="p-1.5 rounded-lg border border-bravo-border bg-white text-bravo-text-muted hover:text-bravo-text cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-4">
                <Field label="Nombre Completo" required>
                  <input
                    required
                    value={newClient.name}
                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                    className={inputClass}
                    placeholder="Juan Pérez González"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Teléfono / WhatsApp" required>
                    <input
                      required
                      value={newClient.phone}
                      onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                      className={inputClass}
                      placeholder="+56912345678"
                    />
                  </Field>
                  <Field label="Rut / DNI">
                    <input
                      value={newClient.dni}
                      onChange={e => setNewClient({ ...newClient, dni: e.target.value })}
                      className={inputClass}
                      placeholder="12.345.678-9"
                    />
                  </Field>
                </div>

                <Field label="Correo Electrónico">
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                    className={inputClass}
                    placeholder="juan.perez@gmail.com"
                  />
                </Field>

                <Field label="Nota / Detalles de contacto">
                  <textarea
                    value={newClient.contact_description}
                    onChange={e => setNewClient({ ...newClient, contact_description: e.target.value })}
                    className={`${inputClass} min-h-[70px]`}
                    placeholder="Ej. Prefiere contacto por WhatsApp..."
                  />
                </Field>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700 text-xs text-center font-semibold">
                    {error}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-black cursor-pointer shadow-md shadow-bravo-glow"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
                  >
                    {submitting ? 'Registrando...' : 'Registrar Cliente'}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-bravo-text-muted bg-stone-100 hover:bg-stone-200 border border-bravo-border transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
