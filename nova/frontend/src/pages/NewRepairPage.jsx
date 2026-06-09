import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, UserPlus, Check } from 'lucide-react'
import { searchClients, createClient, createRepair } from '../api/repairs'

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'console', 'desktop', 'other']

export default function NewRepairPage() {
  const navigate = useNavigate()

  // Estado del cliente
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' })
  const [searchLoading, setSearchLoading] = useState(false)

  // Estado de la reparación
  const [repair, setRepair] = useState({
    device_type: 'phone',
    brand: '',
    model: '',
    reported_issue: '',
    accessories: '',
    device_password: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleClientSearch = async (value) => {
    setClientSearch(value)
    setSelectedClient(null)
    if (value.length < 2) { setClientResults([]); return }
    setSearchLoading(true)
    try {
      const res = await searchClients(value)
      setClientResults(res.data)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedClient && !showNewClient) {
      setError('Debes seleccionar o crear un cliente')
      return
    }

    setSubmitting(true)
    try {
      let clientId = selectedClient?.id

      // Si es cliente nuevo, lo creamos primero
      if (showNewClient) {
        const res = await createClient(newClient)
        clientId = res.data.id
      }

      await createRepair({ ...repair, client_id: clientId })
      navigate('/repairs')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la reparación')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/repairs')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-cyan-400">Nueva Reparación</h1>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Sección cliente */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold mb-4 text-gray-300">Cliente</h2>

            {selectedClient ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium">{selectedClient.name}</p>
                  <p className="text-gray-400 text-sm">{selectedClient.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setClientSearch('') }}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  Cambiar
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={clientSearch}
                    onChange={e => handleClientSearch(e.target.value)}
                    placeholder="Buscar cliente por nombre o teléfono..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* Resultados de búsqueda */}
                <AnimatePresence>
                  {clientResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border border-gray-700 rounded-lg overflow-hidden"
                    >
                      {clientResults.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedClient(client)
                            setClientResults([])
                            setShowNewClient(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                        >
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-gray-400 text-xs">{client.phone}</p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Botón crear cliente nuevo */}
                <button
                  type="button"
                  onClick={() => setShowNewClient(!showNewClient)}
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <UserPlus size={16} />
                  {showNewClient ? 'Cancelar nuevo cliente' : 'Crear cliente nuevo'}
                </button>

                {/* Formulario cliente nuevo inline */}
                <AnimatePresence>
                  {showNewClient && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <input
                        value={newClient.name}
                        onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                        placeholder="Nombre completo *"
                        required={showNewClient}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        value={newClient.phone}
                        onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="Teléfono *"
                        required={showNewClient}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        value={newClient.email}
                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="Email (opcional)"
                        type="email"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Sección dispositivo */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-300">Dispositivo</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Tipo</label>
                <select
                  value={repair.device_type}
                  onChange={e => setRepair({ ...repair, device_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Marca *</label>
                <input
                  value={repair.brand}
                  onChange={e => setRepair({ ...repair, brand: e.target.value })}
                  placeholder="Samsung, Apple..."
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Modelo *</label>
              <input
                value={repair.model}
                onChange={e => setRepair({ ...repair, model: e.target.value })}
                placeholder="Galaxy S21, iPhone 14..."
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Problema reportado *</label>
              <textarea
                value={repair.reported_issue}
                onChange={e => setRepair({ ...repair, reported_issue: e.target.value })}
                placeholder="Describe el problema del equipo..."
                required
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Accesorios entregados</label>
              <input
                value={repair.accessories}
                onChange={e => setRepair({ ...repair, accessories: e.target.value })}
                placeholder="Cargador, funda, etc."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Contraseña del equipo</label>
              <input
                value={repair.device_password}
                onChange={e => setRepair({ ...repair, device_password: e.target.value })}
                placeholder="Solo si el cliente la proporciona"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-gray-950 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? 'Guardando...' : (<><Check size={18} /> Registrar Reparación</>)}
          </button>
        </form>
      </main>
    </div>
  )
}