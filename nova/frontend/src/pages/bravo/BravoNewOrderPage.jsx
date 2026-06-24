import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, UserPlus, Check, Calendar } from 'lucide-react'
import { searchClients, createClient, createRepair } from '../../api/repairs'
import BravoBackground from '../../components/bravo/BravoBackground'
import BravoLayout from '../../components/bravo/BravoLayout'

const BASE_PRODUCTS = ['polera', 'tazon', 'jockey', 'botella', 'poleron', 'otro']

function Field({ label, required, accentColor = 'amber', children }) {
  const bulletColor = accentColor === 'amber' ? 'text-amber-500' : accentColor === 'orange' ? 'text-orange-500' : 'text-yellow-500'
  return (
    <div>
      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
        {label} {required && <span className={bulletColor}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full bg-stone-900/60 border border-stone-850 hover:border-stone-750 focus:border-amber-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

export default function BravoNewOrderPage() {
  const navigate = useNavigate()

  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '', phone: '', email: '', rut: '', city: ''
  })
  const [searchLoading, setSearchLoading] = useState(false)

  const [order, setOrder] = useState({
    device_type: 'polera',
    brand: '',
    model: '',
    reported_issue: '',
    accessories: '',
    device_password: '',
    estimated_delivery: '',
    repair_cost: '',
    deposit: '',
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
      if (showNewClient) {
        const res = await createClient(newClient)
        clientId = res.data.id
      }

      const payload = {
        client_id: clientId,
        device_type: order.device_type,
        brand: order.brand,
        model: order.model,
        reported_issue: order.reported_issue,
        accessories: order.accessories || null,
        device_password: order.device_password || null,
        estimated_delivery: order.estimated_delivery || null,
        repair_cost: order.repair_cost ? parseFloat(order.repair_cost) : null,
        deposit: order.deposit ? parseFloat(order.deposit) : null,
        system: 'bravo'
      }
      await createRepair(payload)
      navigate('/bravo')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar la orden')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BravoLayout>
      <div className="max-w-3xl mx-auto space-y-6 relative">
        <BravoBackground />

        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <button
          onClick={() => navigate('/bravo')}
          className="flex items-center gap-2 text-stone-500 hover:text-amber-400 transition-colors mb-2 text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Dashboard
        </button>

        {/* Header */}
        <div className="border-b border-stone-900 pb-5">
          <h1 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Nueva Orden de Personalización
          </h1>
          <p className="text-stone-500 text-xs mt-1">Registra un nuevo trabajo de estampado o sublimación en el sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección cliente */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-900/20 backdrop-blur-sm border border-stone-900 rounded-2xl p-5"
          >
            <h2 className="font-bold text-sm tracking-wider text-stone-300 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
              Cliente
            </h2>

            {selectedClient ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between bg-stone-900/50 border border-stone-850 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-sm text-stone-200">{selectedClient.name}</p>
                  <p className="text-stone-500 text-xs mt-0.5">
                    {selectedClient.phone}
                    {selectedClient.rut && ` · RUT ${selectedClient.rut}`}
                    {selectedClient.city && ` · ${selectedClient.city}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setClientSearch('') }}
                  className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Cambiar
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                  <input
                    value={clientSearch}
                    onChange={e => handleClientSearch(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o RUT..."
                    className="w-full bg-stone-900/40 border border-stone-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/75 transition-all"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <AnimatePresence>
                  {clientResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border border-stone-850 rounded-xl overflow-hidden"
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
                          className="w-full text-left px-4 py-3 hover:bg-stone-900/80 transition-colors border-b border-stone-850 last:border-0"
                        >
                          <p className="font-medium text-sm text-stone-200">{client.name}</p>
                          <p className="text-stone-500 text-xs mt-0.5">
                            {client.phone}
                            {client.rut && ` · ${client.rut}`}
                            {client.city && ` · ${client.city}`}
                          </p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setShowNewClient(!showNewClient)}
                  className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <UserPlus size={14} />
                  {showNewClient ? 'Cancelar' : 'Registrar cliente nuevo'}
                </button>

                <AnimatePresence>
                  {showNewClient && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <Field label="Nombre" required>
                          <input
                            value={newClient.name}
                            onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                            placeholder="Nombre completo"
                            required={showNewClient}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Teléfono" required>
                          <input
                            value={newClient.phone}
                            onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                            placeholder="+56 9 1234 5678"
                            required={showNewClient}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="RUT">
                          <input
                            value={newClient.rut}
                            onChange={e => setNewClient({ ...newClient, rut: e.target.value })}
                            placeholder="12.345.678-9"
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            type="email"
                            value={newClient.email}
                            onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                            placeholder="correo@email.com"
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Ciudad">
                          <input
                            value={newClient.city}
                            onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                            placeholder="Santiago"
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Sección producto y detalles */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-stone-900/20 backdrop-blur-sm border border-stone-900 rounded-2xl p-5 space-y-4"
          >
            <h2 className="font-bold text-sm tracking-wider text-stone-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs flex items-center justify-center font-bold">2</span>
              Detalles del Pedido
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Producto Base" required accentColor="orange">
                <select
                  value={order.device_type}
                  onChange={e => setOrder({ ...order, device_type: e.target.value })}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                >
                  {BASE_PRODUCTS.map(t => <option key={t} value={t} className="capitalize bg-stone-950 text-white">{t}</option>)}
                </select>
              </Field>
              <Field label="Material / Color" required accentColor="orange">
                <input
                  value={order.brand}
                  onChange={e => setOrder({ ...order, brand: e.target.value })}
                  placeholder="Algodón Negro, Cerámica Blanca..."
                  required
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Diseño / Especificación" required accentColor="orange">
              <input
                value={order.model}
                onChange={e => setOrder({ ...order, model: e.target.value })}
                placeholder="Logo Bravo Pecho XL, Estampado Espalda..."
                required
                className={inputClass}
              />
            </Field>

            <Field label="Detalles de la Personalización" required accentColor="orange">
              <textarea
                value={order.reported_issue}
                onChange={e => setOrder({ ...order, reported_issue: e.target.value })}
                placeholder="Especifica los detalles de la impresión, colores, textos y ubicación..."
                required
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Empaque / Detalles Extras" accentColor="orange">
                <input
                  value={order.accessories}
                  onChange={e => setOrder({ ...order, accessories: e.target.value })}
                  placeholder="Bolsa de regalo, tarjeta..."
                  className={inputClass}
                />
              </Field>
              <Field label="Link / Notas de Diseño" accentColor="orange">
                <input
                  value={order.device_password}
                  onChange={e => setOrder({ ...order, device_password: e.target.value })}
                  placeholder="URL Drive, Canva o anotaciones"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Costo Total" accentColor="orange">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    value={order.repair_cost}
                    onChange={e => setOrder({ ...order, repair_cost: e.target.value })}
                    placeholder="0"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </Field>
              <Field label="Abono Recibido" accentColor="orange">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    value={order.deposit}
                    onChange={e => setOrder({ ...order, deposit: e.target.value })}
                    placeholder="0"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </Field>
            </div>
          </motion.div>

          {/* Fecha estimada */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-stone-900/20 backdrop-blur-sm border border-stone-900 rounded-2xl p-5"
          >
            <h2 className="font-bold text-sm tracking-wider text-stone-300 flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 text-xs flex items-center justify-center font-bold">3</span>
              Fecha Estimada de Entrega
            </h2>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
              <input
                type="date"
                value={order.estimated_delivery}
                onChange={e => setOrder({ ...order, estimated_delivery: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={`${inputClass} pl-9`}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <p className="text-stone-500 text-[11px] mt-2 font-medium">
              Esta fecha se registrará en el calendario de diseño del panel Bravo.
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase text-white relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Check size={16} /> Registrar Orden Bravo</>
              )}
            </span>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
          </motion.button>
        </form>
      </div>
    </BravoLayout>
  )
}
