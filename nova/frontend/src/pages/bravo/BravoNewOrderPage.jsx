import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Search, UserPlus, Check, Calendar, Upload, AlertCircle, Sparkles, Trash2, Plus } from 'lucide-react'
import { searchClients, createClient, createRepair } from '../../api/repairs'
import { getInventoryItems } from '../../api/inventory'
import api from '../../api/client'
import { parseError } from '../../utils/errors'
import BravoBackground from '../../components/bravo/BravoBackground'
import BravoLayout from '../../components/bravo/BravoLayout'
import { BASE_PRODUCTS, PRINT_TECHNIQUES } from '../../utils/bravoProducts'

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
  const [duplicateClientAlert, setDuplicateClientAlert] = useState(null)

  // Estados para Insumos
  const [insumos, setInsumos] = useState([])
  const [selectedInsumos, setSelectedInsumos] = useState([]) // Array de { item_id: int, quantity: int, name: str, stock: int }
  const [insumosSearch, setInsumosSearch] = useState('')
  const [insumosLoading, setInsumosLoading] = useState(false)

  useEffect(() => {
    const fetchInsumos = async () => {
      try {
        setInsumosLoading(true)
        const res = await getInventoryItems({ system: 'bravo' })
        setInsumos(res.data.filter(item => item.category === 'insumo'))
      } catch (err) {
        console.error("Error al cargar insumos:", err)
      } finally {
        setInsumosLoading(false)
      }
    }
    fetchInsumos()
  }, [])

  // Hook para verificar si el cliente nuevo ya está registrado por RUT, Teléfono o Email
  useEffect(() => {
    if (!showNewClient) {
      setDuplicateClientAlert(null)
      return
    }

    const cleanRut = (r) => (r || '').replace(/[^0-9kK]/g, '').toLowerCase()
    const cleanPhone = (p) => (p || '').replace(/[^0-9]/g, '')

    const timer = setTimeout(async () => {
      const { rut, phone, email } = newClient
      
      // 1. Verificar RUT
      const cRut = cleanRut(rut)
      if (cRut.length >= 7) {
        try {
          const res = await searchClients(rut)
          const match = res.data.find(c => cleanRut(c.rut) === cRut)
          if (match) {
            setDuplicateClientAlert({ client: match, field: 'RUT', value: rut })
            return
          }
        } catch (e) { console.error(e) }
      }

      // 2. Verificar Teléfono
      const cPhone = cleanPhone(phone)
      if (cPhone.length >= 8) {
        try {
          const res = await searchClients(phone)
          const match = res.data.find(c => cleanPhone(c.phone).endsWith(cPhone.slice(-8)))
          if (match) {
            setDuplicateClientAlert({ client: match, field: 'Teléfono', value: phone })
            return
          }
        } catch (e) { console.error(e) }
      }

      // 3. Verificar Email
      if (email && email.includes('@') && email.includes('.') && email.length > 5) {
        try {
          const res = await searchClients(email)
          const match = res.data.find(c => (c.email || '').trim().toLowerCase() === email.trim().toLowerCase())
          if (match) {
            setDuplicateClientAlert({ client: match, field: 'Email', value: email })
            return
          }
        } catch (e) { console.error(e) }
      }

      setDuplicateClientAlert(null)
    }, 600)

    return () => clearTimeout(timer)
  }, [newClient.rut, newClient.phone, newClient.email, showNewClient])

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
      // 1. Validaciones previas de cliente
      if (!selectedClient && !showNewClient) {
        setError('Por favor selecciona un cliente existente o registra uno nuevo.')
        setSubmitting(false)
        return
      }

      let clientId = selectedClient?.id
      if (showNewClient) {
        if (!newClient.name.trim() || !newClient.phone.trim()) {
          setError('El nombre y teléfono del cliente son campos obligatorios.')
          setSubmitting(false)
          return
        }
        
        const clientPayload = {
          name: newClient.name.trim(),
          phone: newClient.phone.trim(),
          email: newClient.email.trim() || null,
          rut: newClient.rut ? newClient.rut.trim() || null : null,
          city: newClient.city.trim() || null,
        }
        const res = await createClient(clientPayload)
        clientId = res.data.id
      }

      // 2. Validación de campos obligatorios de la orden
      if (!order.device_type || !order.brand.trim() || !order.model.trim()) {
        setError('Por favor completa los campos requeridos del producto (tipo, material/color, diseño/especificación).')
        setSubmitting(false)
        return
      }

      if (!order.estimated_delivery) {
        setError('Por favor ingresa la fecha estimada de entrega.')
        setSubmitting(false)
        return
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
        print_dimensions: order.print_dimensions || null,
        used_items: selectedInsumos.map(item => ({
          item_id: item.item_id,
          quantity: parseInt(item.quantity)
        }))
      }
      await createRepair(payload)
      navigate('/bravo')
    } catch (err) {
      setError(parseError(err, 'Error al registrar la orden.'))
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

                          {duplicateClientAlert && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-300 flex flex-col gap-2 my-2 text-left"
                            >
                              <div className="flex items-center gap-2 font-bold">
                                <span className="text-amber-500 text-sm">⚠️</span>
                                <span className="text-amber-300">Cliente ya registrado:</span>
                                <span className="text-white font-mono bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                  {duplicateClientAlert.field} ({duplicateClientAlert.value})
                                </span>
                              </div>
                              <p className="text-amber-400/90">
                                El cliente <strong className="text-white">{duplicateClientAlert.client.name}</strong> ya existe con estos datos.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClient(duplicateClientAlert.client)
                                  setShowNewClient(false)
                                  setDuplicateClientAlert(null)
                                  setNewClient({ name: '', phone: '', email: '', rut: '', city: '' })
                                }}
                                className="self-start px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                              >
                                Cargar Cliente Existente
                              </button>
                            </motion.div>
                          )}

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

                  {/* Cuadrícula de productos con íconos SVG profesionales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {BASE_PRODUCTS.map(prod => {
                      const isSelected = order.device_type === prod.id
                      const IconComponent = prod.icon
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => setOrder({ ...order, device_type: prod.id })}
                          className={`p-4 rounded-2xl text-left border transition-all duration-300 relative group cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'bg-gradient-to-br from-bravo-accent/15 to-bravo-accent-warm/10 border-bravo-accent shadow-lg shadow-bravo-glow/20'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700/60 hover:bg-zinc-900/60'
                          }`}
                        >
                          <div className={`mb-2.5 p-2 rounded-xl w-fit border transition-colors ${
                            isSelected
                              ? 'bg-bravo-accent/15 border-bravo-accent/30'
                              : 'bg-zinc-800/60 border-zinc-700/40 group-hover:border-zinc-600/60'
                          }`}>
                            <IconComponent size={22} className={isSelected ? 'text-bravo-accent' : prod.iconColor} />
                          </div>
                          <h4 className={`font-bold text-xs ${isSelected ? 'text-bravo-accent' : 'text-white'}`}>{prod.label}</h4>
                          <p className="text-[9px] text-zinc-500 mt-0.5 leading-snug line-clamp-2">{prod.desc}</p>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-bravo-accent flex items-center justify-center shadow-md">
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

                  {/* SECCIÓN DE INSUMOS */}
                  <div className="border-t border-bravo-border/40 pt-6 space-y-4">
                    <div>
                      <h4 className="text-sm font-extrabold text-bravo-text">Insumos del Proceso (Inventario)</h4>
                      <p className="text-[11px] text-bravo-text-muted mt-0.5">Selecciona los insumos (ej: prendas base, vinilos, film DTF, etc.) que se ocuparán en este proceso para descontarlos automáticamente.</p>
                    </div>

                    {/* Buscador de Insumos */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar insumos por nombre..."
                        value={insumosSearch}
                        onChange={e => setInsumosSearch(e.target.value)}
                        className="w-full bg-bravo-input border border-bravo-border rounded-xl pl-10 pr-4 py-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50"
                      />
                    </div>

                    {/* Resultados de búsqueda de insumos */}
                    {insumosSearch.trim().length > 0 && (
                      <div className="bg-zinc-950 border border-bravo-border rounded-xl overflow-hidden max-h-40 overflow-y-auto bravo-scrollbar divide-y divide-zinc-900/60 relative z-10">
                        {insumos
                          .filter(item => 
                            item.name.toLowerCase().includes(insumosSearch.toLowerCase()) &&
                            !selectedInsumos.some(si => si.item_id === item.id)
                          )
                          .map(item => (
                            <div 
                              key={item.id}
                              onClick={() => {
                                if (item.stock <= 0) return;
                                setSelectedInsumos(prev => [
                                  ...prev,
                                  { item_id: item.id, name: item.name, stock: item.stock, quantity: 1 }
                                ])
                                setInsumosSearch('')
                              }}
                              className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                                item.stock <= 0 
                                  ? 'opacity-50 cursor-not-allowed text-zinc-600' 
                                  : 'hover:bg-zinc-900/80 cursor-pointer text-bravo-text'
                              }`}
                            >
                              <div>
                                <span className="font-bold">{item.name}</span>
                                <span className="text-[10px] text-zinc-500 block">Stock: {item.stock} unidades</span>
                              </div>
                              {item.stock > 0 ? (
                                <Plus size={14} className="text-bravo-accent" />
                              ) : (
                                <span className="text-[9px] text-rose-500 font-bold uppercase font-mono">sin stock</span>
                              )}
                            </div>
                          ))
                        }
                      </div>
                    )}

                    {/* Insumos seleccionados */}
                    {selectedInsumos.length > 0 ? (
                      <div className="space-y-2.5">
                        <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold block">Insumos a Descontar</label>
                        <div className="space-y-2">
                          {selectedInsumos.map((si, idx) => (
                            <div key={si.item_id} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{si.name}</p>
                                <span className="text-[10px] text-zinc-500">Disponible: {si.stock} u.</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-bravo-text-muted">Cant:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max={si.stock}
                                  value={si.quantity}
                                  onChange={e => {
                                    const qty = Math.min(si.stock, Math.max(1, parseInt(e.target.value) || 1))
                                    setSelectedInsumos(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item))
                                  }}
                                  className="w-16 bg-bravo-input border border-bravo-border rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedInsumos(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-xl">
                        <p className="text-[11px] text-zinc-600 font-mono">No se han seleccionado insumos para esta orden.</p>
                      </div>
                    )}
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
