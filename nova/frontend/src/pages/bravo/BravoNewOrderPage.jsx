import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Search, UserPlus, Check, Calendar, Upload, AlertCircle, Sparkles } from 'lucide-react'
import { searchClients, createClient, createRepair } from '../../api/repairs'
import api from '../../api/client'
import BravoBackground from '../../components/bravo/BravoBackground'
import BravoLayout from '../../components/bravo/BravoLayout'

const BASE_PRODUCTS = [
  { id: 'polera', label: 'Polera', icon: '👕', desc: 'Estampados textiles, vinilo, DTF o serigrafía' },
  { id: 'poleron', label: 'Polerón', icon: '🧥', desc: 'Prendas de abrigo con estampado o bordado' },
  { id: 'tazon', label: 'Tazón / Mug', icon: '☕', desc: 'Sublimación de cerámica y tazones' },
  { id: 'jockey', label: 'Jockey / Gorro', icon: '🧢', desc: 'Gobos y jockeys bordados o estampados' },
  { id: 'botella', label: 'Botella / Termo', icon: '🍼', desc: 'Grabado o estampado de termos y botellas' },
  { id: 'otro', label: 'Otro Objeto', icon: '📦', desc: 'Artículos especiales y personalizaciones varias' },
]

const PRINT_TECHNIQUES = [
  { id: 'vinilo', label: 'Vinilo Textil', desc: 'Ideal para siluetas simples y nombres de un solo color' },
  { id: 'sublimacion', label: 'Sublimación', desc: 'Para tazones o poleras de poliéster blanco con full color' },
  { id: 'dtf', label: 'DTF (Direct to Film)', desc: 'Excelente calidad a todo color para cualquier prenda' },
  { id: 'serigrafia', label: 'Serigrafía', desc: 'Producción en masa para logos y diseños planos' },
  { id: 'bordado', label: 'Bordado', desc: 'Terminación premium de alta durabilidad en telas gruesas' },
]

const STEPS = [
  { title: 'Cliente', desc: 'Datos del cliente' },
  { title: 'Producto', desc: 'Qué personalizaremos' },
  { title: 'Diseño', desc: 'Ficha de estampado' },
  { title: 'Pago y Plazo', desc: 'Costos y entrega' }
]

export default function BravoNewOrderPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  // Estados de Cliente
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '', phone: '', email: '', rut: '', city: 'Quillota' // Predeterminado Quillota
  })
  const [searchLoading, setSearchLoading] = useState(false)

  // Datos de la Orden
  const [order, setOrder] = useState({
    device_type: 'polera',
    brand: '', // Material / Color
    model: '', // Diseño / Especificación corta
    reported_issue: '', // Detalles de personalización
    accessories: '', // Empaque / Extras
    device_password: '', // Link / Notas de diseño
    estimated_delivery: '',
    repair_cost: '',
    deposit: '',
    print_technique: 'vinilo',
    print_location: 'Pecho',
    print_dimensions: 'A4',
    design_file_url: ''
  })

  const [uploadingDesign, setUploadingDesign] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Formateador de RUT Chileno
  const handleRutChange = (e) => {
    let val = e.target.value.replace(/[^0-9kK]/g, '')
    if (val.length > 9) val = val.slice(0, 9)
    
    if (val.length > 1) {
      const dv = val.slice(-1).toUpperCase()
      const body = val.slice(0, -1)
      val = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
    }
    setNewClient(prev => ({ ...prev, rut: val }))
  }

  // Búsqueda de cliente
  const handleClientSearch = async (value) => {
    setClientSearch(value)
    setSelectedClient(null)
    if (value.length < 2) { setClientResults([]); return }
    setSearchLoading(true)
    try {
      const res = await searchClients(value)
      setClientResults(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setSearchLoading(false)
    }
  }

  // Carga de boceto
  const handleDesignUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingDesign(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/inventory/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setOrder(prev => ({ ...prev, design_file_url: res.data.file_url }))
    } catch (err) {
      console.error(err)
      setError('Error al subir el archivo de diseño.')
    } finally {
      setUploadingDesign(false)
    }
  }

  // Validación de pasos antes de avanzar
  const canGoNext = () => {
    if (currentStep === 0) {
      if (selectedClient) return true
      if (showNewClient && newClient.name.trim() !== '' && newClient.phone.trim() !== '') return true
      return false
    }
    if (currentStep === 1) {
      return order.device_type !== '' && order.brand.trim() !== '' && order.model.trim() !== ''
    }
    if (currentStep === 2) {
      return order.print_technique !== '' && order.print_location.trim() !== '' && order.print_dimensions.trim() !== ''
    }
    return true
  }

  const handleNext = () => {
    if (canGoNext()) {
      setError('')
      setCurrentStep(prev => prev + 1)
    } else {
      setError('Por favor, completa los campos requeridos marcados con (*)')
    }
  }

  const handleBack = () => {
    setError('')
    setCurrentStep(prev => prev - 1)
  }

  // Guardar Orden
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
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
        reported_issue: order.reported_issue || `Personalización de ${order.device_type}`,
        accessories: order.accessories || null,
        device_password: order.device_password || null,
        estimated_delivery: order.estimated_delivery || null,
        repair_cost: order.repair_cost ? parseFloat(order.repair_cost) : 0,
        deposit: order.deposit ? parseFloat(order.deposit) : 0,
        system: 'bravo',
        design_file_url: order.design_file_url || null,
        print_technique: order.print_technique || null,
        print_location: order.print_location || null,
        print_dimensions: order.print_dimensions || null
      }
      await createRepair(payload)
      navigate('/bravo')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar la orden')
    } finally {
      setSubmitting(false)
    }
  }

  // Cálculo de Saldo
  const totalCost = parseFloat(order.repair_cost || 0)
  const depositPaid = parseFloat(order.deposit || 0)
  const pendingBalance = totalCost - depositPaid

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 relative pb-16">
        <BravoBackground />

        {/* Luces de neón de fondo */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Enlace para volver */}
        <button
          onClick={() => navigate('/bravo')}
          className="flex items-center gap-2 text-bravo-text-muted hover:text-bravo-accent transition-colors text-sm group cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver al Dashboard
        </button>

        {/* Encabezado */}
        <div className="border-b border-bravo-border pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent via-amber-500 to-bravo-accent-warm bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="text-bravo-accent animate-pulse" size={24} />
              Diseño de Nueva Personalización
            </h1>
            <p className="text-bravo-text-muted text-xs mt-1">Sigue el asistente interactivo para registrar un nuevo pedido en Quillota.</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold font-mono tracking-widest text-bravo-accent uppercase px-3 py-1 bg-bravo-accent/10 border border-bravo-accent/20 rounded-full">
              Paso {currentStep + 1} de {STEPS.length}
            </span>
          </div>
        </div>

        {/* Barra de progreso de pasos */}
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStep
            const isCompleted = idx < currentStep
            return (
              <div key={idx} className="flex flex-col text-left space-y-1 relative">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-r from-bravo-accent to-bravo-accent-warm shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                  isCompleted ? 'bg-emerald-500' : 'bg-zinc-800'
                }`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${isActive ? 'text-bravo-accent' : isCompleted ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {step.title}
                </span>
                <span className="text-[9px] text-zinc-500 hidden md:block">{step.desc}</span>
              </div>
            )
          })}
        </div>

        {/* Contenedor del Formulario (Wizard) */}
        <div className="bg-bravo-card border border-bravo-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/30 backdrop-blur-xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 text-left"
            >
              {/* PASO 1: CLIENTE */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-bravo-text">Selecciona o Registra al Cliente</h3>
                    <p className="text-xs text-bravo-text-muted mt-1">Busca un cliente registrado en Quillota o ingresa uno nuevo si nos visita por primera vez.</p>
                  </div>

                  {selectedClient ? (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-5 bg-zinc-900/60 border border-bravo-accent/30 rounded-2xl flex items-center justify-between shadow-lg"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-bravo-accent uppercase tracking-widest font-mono">Cliente Seleccionado</span>
                        <h4 className="text-lg font-black text-white">{selectedClient.name}</h4>
                        <p className="text-xs text-bravo-text-muted">
                          📞 {selectedClient.phone} {selectedClient.rut && ` · 📇 RUT: ${selectedClient.rut}`} {selectedClient.city && ` · 📍 ${selectedClient.city}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedClient(null); setClientSearch('') }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-700"
                      >
                        Cambiar Cliente
                      </button>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {!showNewClient ? (
                        <div className="space-y-4">
                          <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
                            <input
                              value={clientSearch}
                              onChange={e => handleClientSearch(e.target.value)}
                              placeholder="Buscar por nombre, teléfono o RUT..."
                              className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-bravo-text focus:outline-none transition-all placeholder-stone-500 shadow-inner"
                              autoFocus
                            />
                            {searchLoading && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-bravo-accent border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>

                          {clientResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="border border-bravo-border rounded-2xl overflow-hidden bg-[#121214] shadow-2xl divide-y divide-zinc-800/60"
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
                                  className="w-full text-left px-5 py-4 hover:bg-zinc-900/60 transition-all flex justify-between items-center group cursor-pointer"
                                >
                                  <div>
                                    <p className="font-bold text-sm text-white group-hover:text-bravo-accent transition-colors">{client.name}</p>
                                    <p className="text-bravo-text-muted text-xs mt-1">
                                      {client.phone} {client.rut && ` · RUT ${client.rut}`} {client.city && ` · ${client.city}`}
                                    </p>
                                  </div>
                                  <ArrowRight size={14} className="text-zinc-600 group-hover:translate-x-1 group-hover:text-bravo-accent transition-all" />
                                </button>
                              ))}
                            </motion.div>
                          )}

                          <div className="flex items-center justify-center py-4">
                            <button
                              type="button"
                              onClick={() => { setShowNewClient(true); setSelectedClient(null) }}
                              className="flex items-center gap-2 px-5 py-3 bg-bravo-accent/10 border border-bravo-accent/30 rounded-2xl text-xs font-bold text-bravo-accent hover:bg-bravo-accent/20 hover:border-bravo-accent/50 transition-all cursor-pointer shadow-md"
                            >
                              <UserPlus size={16} />
                              Crear y Registrar Cliente Nuevo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-zinc-950/40 border border-bravo-border rounded-2xl p-5 space-y-4 shadow-inner"
                        >
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2">
                            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                              <UserPlus size={16} className="text-bravo-accent" />
                              Ficha de Cliente Nuevo
                            </h4>
                            <button
                              type="button"
                              onClick={() => setShowNewClient(false)}
                              className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
                            >
                              Volver a Buscar
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Nombre Completo *</label>
                              <input
                                value={newClient.name}
                                onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                placeholder="Ej: Juan Pérez"
                                className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Teléfono/WhatsApp *</label>
                              <input
                                value={newClient.phone}
                                onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                placeholder="Ej: +56 9 1234 5678"
                                className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">RUT (Formateo Automático)</label>
                              <input
                                value={newClient.rut}
                                onChange={handleRutChange}
                                placeholder="Ej: 12.345.678-9"
                                className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Ciudad/Comuna</label>
                              <input
                                value={newClient.city}
                                onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                                placeholder="Ej: Quillota"
                                className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Email (Opcional)</label>
                            <input
                              type="email"
                              value={newClient.email}
                              onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                              placeholder="Ej: correo@cliente.cl"
                              className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: PRODUCTO BASE */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-bravo-text">Selecciona el Producto Base</h3>
                    <p className="text-xs text-bravo-text-muted mt-1">Elige el tipo de prenda u objeto que vamos a personalizar.</p>
                  </div>

                  {/* Cuadrícula de productos con íconos grandes */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {BASE_PRODUCTS.map(prod => {
                      const isSelected = order.device_type === prod.id
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => setOrder({ ...order, device_type: prod.id })}
                          className={`p-5 rounded-2xl text-left border transition-all duration-300 relative group cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'bg-gradient-to-br from-bravo-accent/15 to-bravo-accent-warm/10 border-bravo-accent shadow-lg shadow-bravo-glow/20'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700/60'
                          }`}
                        >
                          <div className="text-3xl mb-3">{prod.icon}</div>
                          <h4 className={`font-bold text-sm ${isSelected ? 'text-bravo-accent' : 'text-white'}`}>{prod.label}</h4>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-snug">{prod.desc}</p>
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-bravo-accent flex items-center justify-center shadow-md">
                              <Check size={12} className="text-black font-black" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {order.device_type === 'otro' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1.5"
                    >
                      <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Especifica el Objeto *</label>
                      <input
                        value={order.brand}
                        onChange={e => setOrder({ ...order, brand: e.target.value })}
                        placeholder="Ej: Pechera de Mezclilla, Taza Chopp..."
                        className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                      />
                    </motion.div>
                  )}

                  {order.device_type !== 'otro' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Material / Color del Producto Base *</label>
                      <input
                        value={order.brand}
                        onChange={e => setOrder({ ...order, brand: e.target.value })}
                        placeholder="Ej: Algodón Negro, Cerámica Blanca, Acero Inox Rojo..."
                        className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Diseño / Idea Principal *</label>
                    <input
                      value={order.model}
                      onChange={e => setOrder({ ...order, model: e.target.value })}
                      placeholder="Ej: Logo Empresa Espalda, Ilustración Animé Frente..."
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/60 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* PASO 3: DISEÑO Y TÉCNICA */}
              {currentStep === 2 && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-base font-extrabold text-bravo-text">Ficha Técnica de Estampado</h3>
                    <p className="text-xs text-bravo-text-muted mt-1">Indica los parámetros de producción y carga el boceto gráfico.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Selector de técnica */}
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold block">Técnica de Estampado *</label>
                      <div className="space-y-2">
                        {PRINT_TECHNIQUES.map(tech => {
                          const isSelected = order.print_technique === tech.id
                          return (
                            <button
                              key={tech.id}
                              type="button"
                              onClick={() => setOrder({ ...order, print_technique: tech.id })}
                              className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-900 border-bravo-accent shadow-xs'
                                  : 'bg-zinc-950/20 border-zinc-800/80 hover:border-zinc-700/60'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? 'border-bravo-accent' : 'border-zinc-600'
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-bravo-accent" />}
                              </div>
                              <div>
                                <h5 className={`font-bold text-xs ${isSelected ? 'text-bravo-accent' : 'text-white'}`}>{tech.label}</h5>
                                <p className="text-[9px] text-zinc-500 leading-tight mt-0.5">{tech.desc}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Especificaciones de tamaño, ubicación y carga de boceto */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Ubicación del Estampado *</label>
                          <input
                            value={order.print_location}
                            onChange={e => setOrder({ ...order, print_location: e.target.value })}
                            placeholder="Ej: Pecho, Espalda, Manga..."
                            className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Dimensiones *</label>
                          <input
                            value={order.print_dimensions}
                            onChange={e => setOrder({ ...order, print_dimensions: e.target.value })}
                            placeholder="Ej: 20x20 cm, A4, Pequeño..."
                            className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Subida del Boceto */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold block">Boceto / Logotipo</label>
                        <div className="flex items-center gap-4 bg-zinc-950/30 border border-dashed border-zinc-800 rounded-2xl p-4">
                          <label className="flex flex-col items-center justify-center w-24 h-24 border border-bravo-border/60 hover:border-bravo-accent/80 rounded-xl bg-bravo-input hover:bg-zinc-900/60 cursor-pointer text-center transition-all p-2 gap-1 group">
                            <Upload size={18} className="text-bravo-accent group-hover:scale-105 transition-transform" />
                            <span className="text-[8px] font-black text-bravo-text uppercase tracking-wider">
                              {uploadingDesign ? 'Subiendo...' : 'Seleccionar'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleDesignUpload}
                              disabled={uploadingDesign}
                              className="hidden"
                            />
                          </label>

                          <div className="flex-1 min-w-0">
                            {order.design_file_url ? (
                              <div className="flex items-center gap-3">
                                <img
                                  src={order.design_file_url.startsWith('http') ? order.design_file_url : `${api.defaults.baseURL}${order.design_file_url}`}
                                  alt="Boceto"
                                  className="w-16 h-16 object-cover rounded-xl border border-bravo-accent shadow-md shadow-bravo-glow/10"
                                />
                                <div>
                                  <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 font-bold font-mono rounded-full block w-fit">
                                    Cargado con éxito
                                  </span>
                                  <p className="text-[10px] text-zinc-500 mt-1 truncate">Archivo de imagen listo</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-500 leading-normal">
                                Sube un boceto visual, plano de dimensiones o imagen de referencia del diseño. Formatos permitidos: JPG, PNG.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notas de diseño y link externo */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Link de Canva / Drive / Figma</label>
                        <input
                          value={order.device_password}
                          onChange={e => setOrder({ ...order, device_password: e.target.value })}
                          placeholder="Pega la URL con el diseño editable si existe..."
                          className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campo de notas extendido */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Detalle específico de la personalización (Opcional)</label>
                    <textarea
                      value={order.reported_issue}
                      onChange={e => setOrder({ ...order, reported_issue: e.target.value })}
                      placeholder="Detalles sobre colores específicos, textos, fuentes o consideraciones especiales..."
                      rows={2}
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* PASO 4: COSTOS Y PLAZOS */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-bravo-text">Pago y Fecha de Entrega</h3>
                    <p className="text-xs text-bravo-text-muted mt-1">Establece el monto del trabajo, el abono recibido y agenda la fecha límite.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* Valores de dinero */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Costo Total (CLP) *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted text-xs font-bold">$</span>
                            <input
                              type="number"
                              min="0"
                              value={order.repair_cost}
                              onChange={e => setOrder({ ...order, repair_cost: e.target.value })}
                              placeholder="0"
                              className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-bravo-text focus:outline-none font-mono"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Abono Recibido *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted text-xs font-bold">$</span>
                            <input
                              type="number"
                              min="0"
                              value={order.deposit}
                              onChange={e => setOrder({ ...order, deposit: e.target.value })}
                              placeholder="0"
                              className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-bravo-text focus:outline-none font-mono"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Notas de empaque / extras */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold">Empaque / Envoltura Especial</label>
                        <input
                          value={order.accessories}
                          onChange={e => setOrder({ ...order, accessories: e.target.value })}
                          placeholder="Ej: Bolsa de Kraft con cinta de regalo, caja..."
                          className="w-full bg-bravo-input border border-bravo-border rounded-xl px-4 py-2.5 text-xs text-bravo-text focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Resumen del Balance de Pago */}
                    <div className="bg-zinc-950/40 border border-bravo-border/60 rounded-3xl p-5 flex flex-col justify-between shadow-inner space-y-4">
                      <div className="text-left space-y-2">
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Estado Financiero</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs border-b border-zinc-800/80 pb-2">
                          <span className="text-zinc-500">Costo Total:</span>
                          <span className="text-white text-right font-mono">${totalCost.toLocaleString('es-CL')}</span>
                          
                          <span className="text-zinc-500">Abono Recibido:</span>
                          <span className="text-amber-500 text-right font-mono">${depositPaid.toLocaleString('es-CL')}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs font-bold text-white uppercase">Saldo Pendiente:</span>
                          <span className={`text-lg font-black font-mono tracking-wide ${
                            pendingBalance <= 0
                              ? 'text-emerald-400'
                              : 'text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.1)]'
                          }`}>
                            ${pendingBalance.toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>

                      {/* Fecha de entrega */}
                      <div className="space-y-2 text-left pt-2 border-t border-zinc-800/80">
                        <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold block">Fecha Estimada de Entrega *</label>
                        <div className="relative">
                          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
                          <input
                            type="date"
                            value={order.estimated_delivery}
                            onChange={e => setOrder({ ...order, estimated_delivery: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-9 pr-4 py-2 text-xs text-bravo-text focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Errores */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/35 rounded-2xl px-4 py-3 text-red-400 text-xs text-center font-bold flex items-center justify-center gap-2 mt-6"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}

          {/* Botones de Navegación del Wizard */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-6 mt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all border border-zinc-800 cursor-pointer ${
                currentStep === 0
                  ? 'opacity-0 pointer-events-none'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <ArrowLeft size={14} />
              Atrás
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-gradient-to-r from-bravo-accent to-bravo-accent-warm hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-bravo-glow/10 cursor-pointer"
              >
                Siguiente
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {submitting ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                ) : (
                  <><Check size={14} /> Registrar Orden Bravo</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
