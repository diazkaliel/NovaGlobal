import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, UserPlus, Check, Calendar } from 'lucide-react'
import { searchClients } from '../../api/repairs'
import { createBravoOrder } from '../../api/bravo'
import BravoBackground from '../../components/bravo/BravoBackground'
import BravoCatalogComposer, { totalCatalogCents } from '../../components/bravo/BravoCatalogComposer'

const BASE_PRODUCTS = ['polera', 'tazon', 'jockey', 'botella', 'poleron', 'otro']

function Field({ label, required, accentColor = 'amber', children }) {
  const bulletColor = accentColor === 'amber' ? 'text-bravo-accent font-bold' : accentColor === 'orange' ? 'text-bravo-accent-warm font-bold' : 'text-yellow-600 font-bold'
  return (
    <div>
      <label className="text-bravo-text-muted text-xs tracking-wider uppercase block mb-1.5 font-semibold">
        {label} {required && <span className={bulletColor}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all placeholder-stone-400"

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
  const searchTimer = useRef(null)
  const searchVersion = useRef(0)

  useEffect(() => () => {
    clearTimeout(searchTimer.current)
    searchVersion.current += 1
  }, [])

  const [order, setOrder] = useState({
    device_type: 'polera',
    brand: '',
    model: '',
    reported_issue: '',
    accessories: '',
    design_reference: '',
    estimated_delivery: '',
    repair_cost: '',
    deposit: '',
  })

  const [catalogMode, setCatalogMode] = useState(true)
  const [orderLines, setOrderLines] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleClientSearch = (value) => {
    setClientSearch(value)
    setSelectedClient(null)
    clearTimeout(searchTimer.current)
    const version = ++searchVersion.current

    if (value.trim().length < 2) {
      setClientResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const response = await searchClients(value.trim())
        if (version === searchVersion.current) setClientResults(response.data)
      } catch {
        if (version === searchVersion.current) {
          setClientResults([])
          setError('No se pudo buscar clientes. Comprueba la conexión.')
        }
      } finally {
        if (version === searchVersion.current) setSearchLoading(false)
      }
    }, 280)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!showNewClient && !selectedClient) {
      setError('Selecciona un cliente o registra uno nuevo.')
      return
    }

    if (catalogMode && orderLines.length === 0) {
      setError('Agrega al menos un producto del catálogo.')
      return
    }
    if (catalogMode && orderLines.some(line =>
      !Number.isInteger(Number(line.quantity)) ||
      Number(line.quantity) < 1 ||
      Number(line.quantity) > 999 ||
      line.variant.length > 120
    )) {
      setError('Cada producto debe tener una cantidad válida entre 1 y 999.')
      return
    }

    const catalogCents = totalCatalogCents(orderLines)
    const total = catalogMode
      ? catalogCents / 100
      : order.repair_cost === '' ? null : Number(order.repair_cost)
    const deposit = order.deposit === '' ? null : Number(order.deposit)
    if ((total !== null && (!Number.isFinite(total) || total < 0)) ||
        (deposit !== null && (!Number.isFinite(deposit) || deposit < 0)) ||
        (deposit !== null && (total === null || deposit > total))) {
      setError('Revisa los montos: el abono no puede superar el total.')
      return
    }

    const clientPayload = showNewClient
      ? {
          name: newClient.name.trim(),
          phone: newClient.phone.trim(),
          email: newClient.email.trim() || null,
          rut: newClient.rut.trim() || null,
          city: newClient.city.trim() || null,
        }
      : null

    setSubmitting(true)
    try {
      const sharedFields = {
        client_id: showNewClient ? null : selectedClient.id,
        new_client: clientPayload,
        reported_issue: order.reported_issue.trim() || null,
        accessories: order.accessories.trim() || null,
        design_reference: order.design_reference.trim() || null,
        estimated_delivery: order.estimated_delivery || null,
        deposit,
      }
      const productFields = catalogMode
        ? {
            items: orderLines.map(line => ({
              catalog_product_id: line.catalog_product_id,
              variant: line.variant.trim(),
              quantity: Number(line.quantity),
            })),
            expected_total: (catalogCents / 100).toFixed(2),
          }
        : {
            device_type: order.device_type,
            brand: order.brand.trim(),
            model: order.model.trim(),
            repair_cost: total,
          }
      const response = await createBravoOrder({ ...sharedFields, ...productFields })
      navigate(`/bravo/orders/${response.data.id}`, { replace: true })
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo registrar la orden. Revisa los campos e inténtalo otra vez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 relative bravo-form">
        <BravoBackground />

        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <button
          onClick={() => navigate('/bravo')}
          className="flex items-center gap-2 text-bravo-text-muted hover:text-bravo-accent transition-colors mb-2 text-sm group cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Bravo
        </button>

        {/* Header */}
        <div className="border-b border-bravo-border pb-5">
          <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent to-bravo-accent-warm bg-clip-text text-transparent">
            Crear una orden
          </h1>
          <p className="text-bravo-text-muted text-xs mt-1">Cliente, producto y entrega en una sola operación.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección cliente */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bravo-card border border-bravo-border rounded-2xl p-5 shadow-sm"
          >
            <h2 className="font-bold text-sm tracking-wider text-bravo-text mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-bravo-accent/20 border border-bravo-accent/40 text-bravo-accent text-xs flex items-center justify-center font-bold">1</span>
              Cliente
            </h2>

            {selectedClient ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between bg-white border border-bravo-border rounded-xl px-4 py-3 shadow-xs"
              >
                <div>
                  <p className="font-semibold text-sm text-bravo-text">{selectedClient.name}</p>
                  <p className="text-bravo-text-muted text-xs mt-0.5">
                    {selectedClient.phone}
                    {selectedClient.rut && ` · RUT ${selectedClient.rut}`}
                    {selectedClient.city && ` · ${selectedClient.city}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setClientSearch('') }}
                  className="text-xs text-bravo-accent hover:text-bravo-accent/80 transition-colors cursor-pointer"
                >
                  Cambiar
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
                  <input
                    value={clientSearch}
                    onChange={e => handleClientSearch(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o RUT..."
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-9 pr-4 py-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/70 transition-all placeholder-stone-400"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-bravo-accent border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <AnimatePresence>
                  {clientResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border border-bravo-border rounded-xl overflow-hidden bg-white shadow-md"
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
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-bravo-border last:border-0 cursor-pointer"
                        >
                          <p className="font-medium text-sm text-bravo-text">{client.name}</p>
                          <p className="text-bravo-text-muted text-xs mt-0.5">
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
                  className="flex items-center gap-2 text-xs text-bravo-accent hover:text-bravo-accent/80 transition-colors font-bold cursor-pointer"
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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

          <div className="border border-bravo-border bg-bravo-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-sm text-bravo-text">02 / Productos y diseño</h2>
                <p className="text-xs text-bravo-text-muted mt-1">
                  Usa el catálogo para calcular totales o registra un pedido excepcional.
                </p>
              </div>
              <div className="flex gap-1 border border-bravo-border p-1 bg-bravo-input" role="group" aria-label="Tipo de pedido">
                <button type="button" aria-pressed={catalogMode}
                  onClick={() => setCatalogMode(true)}
                  className={`px-3 py-2 text-xs font-semibold ${catalogMode ? 'bg-bravo-text text-white' : 'text-bravo-text-muted'}`}>
                  Catálogo
                </button>
                <button type="button" aria-pressed={!catalogMode}
                  onClick={() => setCatalogMode(false)}
                  className={`px-3 py-2 text-xs font-semibold ${!catalogMode ? 'bg-bravo-text text-white' : 'text-bravo-text-muted'}`}>
                  Pedido libre
                </button>
              </div>
            </div>
            {catalogMode && (
              <div className="space-y-4">
                <BravoCatalogComposer orderLines={orderLines} onChange={setOrderLines} disabled={submitting}/>
                <Field label="Indicaciones de personalización">
                  <textarea
                    value={order.reported_issue}
                    onChange={event => setOrder({ ...order, reported_issue: event.target.value })}
                    placeholder="Posición del estampado, colores, textos, tamaño del diseño…"
                    rows={3}
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Embalaje / observaciones">
                    <input value={order.accessories} onChange={event => setOrder({ ...order, accessories: event.target.value })}
                      placeholder="Bolsa, caja, tarjeta…" className={inputClass}/>
                  </Field>
                  <Field label="Referencia de diseño (URL)">
                    <input value={order.design_reference} onChange={event => setOrder({ ...order, design_reference: event.target.value })}
                      placeholder="https://drive.google.com/…" className={inputClass}/>
                  </Field>
                </div>
                <Field label="Abono recibido">
                  <input type="number" min="0" step="1" value={order.deposit}
                    onChange={event => setOrder({ ...order, deposit: event.target.value })}
                    placeholder="0" className={inputClass}/>
                </Field>
                <p className="text-xs text-bravo-text-muted">
                  El stock mostrado no se reserva al crear la orden. Los insumos se descuentan al registrar su consumo.
                </p>
              </div>
            )}
          </div>

          {!catalogMode && (
          {/* Sección producto y detalles */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-bravo-card border border-bravo-border rounded-2xl p-5 space-y-4 shadow-sm"
          >
            <h2 className="font-bold text-sm tracking-wider text-bravo-text flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-bravo-accent-warm/20 border border-bravo-accent-warm/40 text-bravo-accent-warm text-xs flex items-center justify-center font-bold">2</span>
              Detalles del Pedido
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Producto Base" required accentColor="orange">
                <select
                  value={order.device_type}
                  onChange={e => setOrder({ ...order, device_type: e.target.value })}
                  className={inputClass}
                >
                  {BASE_PRODUCTS.map(t => <option key={t} value={t} className="capitalize bg-white text-bravo-text">{t}</option>)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Empaque / Detalles Extras" accentColor="orange">
                <input
                  value={order.accessories}
                  onChange={e => setOrder({ ...order, accessories: e.target.value })}
                  placeholder="Bolsa de regalo, tarjeta..."
                  className={inputClass}
                />
              </Field>
              <Field label="Enlace de referencia" accentColor="orange">
                <input
                  value={order.design_reference}
                  onChange={e => setOrder({ ...order, design_reference: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Precio total" accentColor="orange">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted text-sm">$</span>
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
              <Field label="Abono recibido" accentColor="orange">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted text-sm">$</span>
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
          )}

          {(catalogMode ? orderLines.length > 0 : order.repair_cost !== '') && (
            <div className="bravo-money-preview" aria-live="polite">
              <span>Saldo estimado</span>
              <strong>${Math.max(0, (catalogMode ? totalCatalogCents(orderLines) / 100 : Number(order.repair_cost) || 0) - (Number(order.deposit) || 0)).toLocaleString('es-CL')} CLP</strong>
            </div>
          )}

          {/* La entrega se define una vez por orden, incluso con múltiples productos. */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bravo-card border border-bravo-border rounded-2xl p-5 shadow-sm"
          >
            <h2 className="font-bold text-sm tracking-wider text-bravo-text flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-600 text-xs flex items-center justify-center font-bold">3</span>
              Fecha Estimada de Entrega
            </h2>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
              <input
                type="date"
                value={order.estimated_delivery}
                onChange={e => setOrder({ ...order, estimated_delivery: e.target.value })}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <p className="text-bravo-text-muted text-[11px] mt-2 font-medium">
              Esta fecha se registrará en el calendario de diseño del panel Bravo.
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm text-center font-medium shadow-xs"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="bravo-cta w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase cursor-pointer relative overflow-hidden group"
            style={{ background: '#be6b2f' }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 font-extrabold">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Check size={16} /> Crear orden y abrir ficha</>
              )}
            </span>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
          </motion.button>
        </form>
      </div>
    </>
  )
}
