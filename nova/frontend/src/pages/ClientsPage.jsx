import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Search, Users, Phone, Mail, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClientApi } from '../api/clients'
import AnimatedBackground from '../components/AnimatedBackground'

const inputClass = "w-full bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus:border-purple-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
        {label} {required && <span className="text-purple-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function NewClientModal({ onClose, onCreated }) {
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
      setError(err.response?.data?.detail || 'Error al crear el cliente')
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
          <h2 className="text-lg font-bold text-white">Nuevo Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre completo" required>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Pérez"
              required
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono" required>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+56 9 1234 5678"
              required
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RUT">
              <input
                value={form.rut}
                onChange={e => setForm({ ...form, rut: e.target.value })}
                placeholder="12.345.678-9"
                className={inputClass}
              />
            </Field>
            <Field label="Ciudad">
              <input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Santiago"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="correo@email.com"
              className={inputClass}
            />
          </Field>

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
            style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
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
                  background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Clientes
              </h1>
              <p className="text-gray-600 text-xs">{clients.length} clientes registrados</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
          >
            <Plus size={16} />
            Nuevo Cliente
          </motion.button>
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
      </AnimatePresence>
    </div>
  )
}