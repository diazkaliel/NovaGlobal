import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, UserPlus, Check, Calendar, Plus, Trash2, Smartphone, HelpCircle } from 'lucide-react'
import { searchClients, createClient, createRepair } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'
import { parseError } from '../utils/errors'

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'console', 'desktop', 'other']

function Field({ label, required, children }) {
  return (
    <div className="text-left">
      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5 font-semibold">
        {label} {required && <span className="text-cyan-500 font-bold">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus:border-cyan-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder-gray-500"

// ─── Componente de Patrón de Bloqueo ──────────────────────────────────────────
function PatternLock({ value, onChange }) {
  const [path, setPath] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currCoords, setCurrCoords] = useState(null)
  const svgRef = useRef(null)

  const dots = [
    { id: 1, x: 40, y: 40 },
    { id: 2, x: 120, y: 40 },
    { id: 3, x: 200, y: 40 },
    { id: 4, x: 40, y: 120 },
    { id: 5, x: 120, y: 120 },
    { id: 6, x: 200, y: 120 },
    { id: 7, x: 40, y: 200 },
    { id: 8, x: 120, y: 200 },
    { id: 9, x: 200, y: 200 },
  ]

  const checkCollision = (clientX, clientY) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 240
    const y = ((clientY - rect.top) / rect.height) * 240

    for (const dot of dots) {
      const dist = Math.hypot(dot.x - x, dot.y - y)
      if (dist < 22) {
        return dot.id
      }
    }
    return null
  }

  const handleStart = (clientX, clientY) => {
    setIsDrawing(true)
    const dotId = checkCollision(clientX, clientY)
    if (dotId) {
      setPath([dotId])
    } else {
      setPath([])
    }
  }

  const handleMove = (clientX, clientY) => {
    if (!isDrawing) return
    if (!svgRef.current) return
    
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 240
    const y = ((clientY - rect.top) / rect.height) * 240
    setCurrCoords({ x, y })

    const dotId = checkCollision(clientX, clientY)
    if (dotId && !path.includes(dotId)) {
      setPath(prev => [...prev, dotId])
    }
  }

  const handleEnd = () => {
    setIsDrawing(false)
    setCurrCoords(null)
    if (path.length > 0) {
      onChange(`Patrón: ${path.join('-')}`)
    } else {
      onChange('')
    }
  }

  const clearPattern = () => {
    setPath([])
    onChange('')
  }

  return (
    <div className="flex flex-col items-center gap-3 bg-gray-950/40 p-4 border border-gray-800 rounded-2xl max-w-[270px] mx-auto">
      <svg
        ref={svgRef}
        viewBox="0 0 240 240"
        className="w-48 h-48 touch-none select-none cursor-pointer"
        onMouseDown={e => handleStart(e.clientX, e.clientY)}
        onMouseMove={e => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={e => {
          const t = e.touches[0]
          handleStart(t.clientX, t.clientY)
        }}
        onTouchMove={e => {
          const t = e.touches[0]
          handleMove(t.clientX, t.clientY)
        }}
        onTouchEnd={handleEnd}
      >
        {path.map((dotId, index) => {
          if (index === 0) return null
          const prevDot = dots.find(d => d.id === path[index - 1])
          const currDot = dots.find(d => d.id === dotId)
          return (
            <line
              key={index}
              x1={prevDot.x}
              y1={prevDot.y}
              x2={currDot.x}
              y2={currDot.y}
              stroke="var(--color-cyan-400)"
              strokeWidth="6"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          )
        })}

        {isDrawing && path.length > 0 && currCoords && (
          <line
            x1={dots.find(d => d.id === path[path.length - 1]).x}
            y1={dots.find(d => d.id === path[path.length - 1]).y}
            x2={currCoords.x}
            y2={currCoords.y}
            stroke="var(--color-cyan-400)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="4 4"
            className="opacity-70"
          />
        )}

        {dots.map(dot => {
          const active = path.includes(dot.id)
          const isLast = path[path.length - 1] === dot.id
          return (
            <g key={dot.id}>
              <circle
                cx={dot.x}
                cy={dot.y}
                r="18"
                fill="transparent"
                stroke={active ? "rgba(34, 211, 238, 0.25)" : "transparent"}
                strokeWidth="2"
                className="transition-all duration-150"
              />
              <circle
                cx={dot.x}
                cy={dot.y}
                r={active ? "8" : "6"}
                fill={active ? "var(--color-cyan-400)" : "#374151"}
                className="transition-all duration-150"
                style={active ? { filter: 'drop-shadow(0 0 6px var(--color-cyan-400))' } : {}}
              />
              {active && isLast && (
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="3"
                  fill="#ffffff"
                />
              )}
            </g>
          )
        })}
      </svg>

      <button
        type="button"
        onClick={clearPattern}
        className="px-3 py-1 rounded-lg bg-gray-900 border border-gray-800 text-[10px] uppercase font-bold text-gray-400 hover:text-white hover:border-gray-700 transition-all cursor-pointer active:scale-95"
      >
        Limpiar
      </button>
    </div>
  )
}

export default function NewRepairPage() {
  const navigate = useNavigate()

  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '', phone: '', email: '', rut: '', city: ''
  })
  const [searchLoading, setSearchLoading] = useState(false)

  // Dispositivos (Múltiple soporte)
  const [devices, setDevices] = useState([
    {
      id: Date.now(),
      device_type: 'phone',
      brand: '',
      model: '',
      reported_issue: '',
      accessories: '',
      device_password: '',
      lockType: 'none',
      repair_cost: '',
      deposit: '',
      deposit_payment_method: '',
    }
  ])

  // Configuración de abonos conjuntos o individuales
  const [paymentMode, setPaymentMode] = useState('individual') // 'individual' o 'conjunto'
  const [jointDeposit, setJointDeposit] = useState('')
  const [jointPaymentMethod, setJointPaymentMethod] = useState('efectivo')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleClientSearch = async (value) => {
    setClientSearch(value)
    setSelectedClient(null)
    if (!value.trim()) {
      setClientResults([])
      return
    }
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

  const addDevice = () => {
    setDevices(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        device_type: 'phone',
        brand: '',
        model: '',
        reported_issue: '',
        accessories: '',
        device_password: '',
        lockType: 'none',
        repair_cost: '',
        deposit: '',
        deposit_payment_method: '',
      }
    ])
  }

  const removeDevice = (id) => {
    if (devices.length === 1) return
    setDevices(prev => prev.filter(d => d.id !== id))
  }

  const updateDeviceField = (id, field, value) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // 1. Validaciones
      if (!selectedClient && !showNewClient) {
        setError('Por favor selecciona un cliente existente o registra uno nuevo.')
        setSubmitting(false)
        return
      }

      for (let i = 0; i < devices.length; i++) {
        const d = devices[i]
        if (!d.brand.trim() || !d.model.trim() || !d.reported_issue.trim()) {
          setError(`Por favor completa los campos obligatorios del Dispositivo #${i + 1}.`)
          setSubmitting(false)
          return
        }
        if (d.lockType === 'pattern' && (!d.device_password || !d.device_password.startsWith('Patrón: '))) {
          setError(`Dibuja el patrón de bloqueo para el Dispositivo #${i + 1} o selecciona 'Sin Clave'.`)
          setSubmitting(false)
          return
        }
      }

      // 2. Crear Cliente si es nuevo
      let clientId = selectedClient?.id
      if (showNewClient) {
        if (!newClient.name.trim() || !newClient.phone.trim()) {
          setError('El nombre y teléfono del cliente son campos obligatorios.')
          setSubmitting(false)
          return
        }
        try {
          const clientRes = await createClient(newClient)
          clientId = clientRes.data.id
        } catch (clientErr) {
          setError(parseError(clientErr, 'Error al registrar el nuevo cliente.'))
          setSubmitting(false)
          return
        }
      }

      // 3. Distribuir abonos conjuntos si aplica
      let splitDepositVal = 0
      if (paymentMode === 'conjunto' && jointDeposit) {
        splitDepositVal = parseFloat(jointDeposit) / devices.length
      }

      // 4. Crear las Órdenes
      const creationPromises = devices.map(d => {
        const cost = d.repair_cost ? parseFloat(d.repair_cost) : null
        const dep = paymentMode === 'conjunto' ? splitDepositVal : (d.deposit ? parseFloat(d.deposit) : null)
        const payMethod = paymentMode === 'conjunto' ? (jointDeposit ? jointPaymentMethod : null) : (d.deposit ? d.deposit_payment_method : null)

        const payload = {
          client_id: clientId,
          system: 'nova',
          device_type: d.device_type,
          brand: d.brand,
          model: d.model,
          reported_issue: d.reported_issue,
          accessories: d.accessories || null,
          device_password: d.lockType === 'none' ? null : (d.device_password || null),
          estimated_delivery: estimatedDelivery || null,
          repair_cost: cost,
          deposit: dep,
          deposit_payment_method: payMethod,
        }
        return createRepair(payload)
      })

      await Promise.all(creationPromises)
      navigate('/repairs')
    } catch (err) {
      setError(parseError(err, 'Error al registrar las reparaciones. Revisa los datos ingresados.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <nav className="relative z-10 border-b border-gray-900/40 backdrop-blur-xl bg-gray-950/40 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/repairs')}
              className="w-9 h-9 border border-gray-800/60 rounded-xl bg-gray-950/40 text-gray-400 hover:text-white hover:border-gray-700/80 flex items-center justify-center cursor-pointer transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="text-left">
              <h1
                className="text-sm font-black tracking-widest uppercase leading-none"
                style={{
                  background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Nueva Reparación
              </h1>
              <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5 font-semibold">Múltiples equipos compatibles</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8 w-full flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 1. SECCIÓN CLIENTE */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/60 rounded-2xl p-5"
          >
            <h2 className="font-bold text-xs tracking-widest uppercase text-gray-300 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[10px] flex items-center justify-center font-black">1</span>
              Cliente
            </h2>

            {selectedClient ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between bg-gray-950/40 border border-gray-800/60 rounded-xl px-4 py-3 text-left"
              >
                <div>
                  <p className="font-bold text-sm text-white">{selectedClient.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {selectedClient.phone}
                    {selectedClient.rut && ` · RUT ${selectedClient.rut}`}
                    {selectedClient.city && ` · ${selectedClient.city}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setClientSearch('') }}
                  className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Cambiar
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3.5">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={clientSearch}
                    onChange={e => handleClientSearch(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o RUT..."
                    className="w-full bg-gray-800/30 border border-gray-700/50 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder-gray-500"
                  />
                  {searchLoading && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <AnimatePresence>
                  {clientResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border border-gray-800 bg-gray-950 rounded-xl overflow-hidden text-left"
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
                          className="w-full text-left px-4 py-3 hover:bg-gray-900 transition-colors border-b border-gray-900 last:border-0 cursor-pointer"
                        >
                          <p className="font-bold text-xs text-white">{client.name}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">
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
                  className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
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
                        <div className="sm:col-span-2">
                          <Field label="Ciudad">
                            <input
                              value={newClient.city}
                              onChange={e => setNewClient({ ...newClient, city: e.target.value })}
                              placeholder="Santiago"
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* 2. SECCIÓN DISPOSITIVOS */}
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-gray-900 pb-2">
              <h2 className="font-bold text-xs tracking-widest uppercase text-gray-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[10px] flex items-center justify-center font-black">2</span>
                Equipos a ingresar ({devices.length})
              </h2>
              <button
                type="button"
                onClick={addDevice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/45 hover:bg-cyan-500/5 transition-all cursor-pointer"
              >
                <Plus size={13} className="stroke-[2.5]" />
                Agregar otro equipo
              </button>
            </div>

            <div className="space-y-5">
              {devices.map((device, idx) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/60 rounded-2xl p-5 space-y-4 relative"
                >
                  <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                      <Smartphone size={14} />
                      Dispositivo #{idx + 1}
                    </span>
                    {devices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDevice(device.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Field label="Tipo de equipo" required>
                      <select
                        value={device.device_type}
                        onChange={e => updateDeviceField(device.id, 'device_type', e.target.value)}
                        className={`${inputClass} capitalize`}
                      >
                        {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Marca" required>
                      <input
                        value={device.brand}
                        onChange={e => updateDeviceField(device.id, 'brand', e.target.value)}
                        placeholder="Samsung, Apple, Huawei..."
                        required
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Modelo del dispositivo" required>
                    <input
                      value={device.model}
                      onChange={e => updateDeviceField(device.id, 'model', e.target.value)}
                      placeholder="Galaxy S21, iPhone 14, P40 Pro..."
                      required
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Falla o problema reportado" required>
                    <textarea
                      value={device.reported_issue}
                      onChange={e => updateDeviceField(device.id, 'reported_issue', e.target.value)}
                      placeholder="Describe los fallos detectados o el trabajo a realizar..."
                      required
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Accesorios entregados">
                      <input
                        value={device.accessories}
                        onChange={e => updateDeviceField(device.id, 'accessories', e.target.value)}
                        placeholder="Cargador, carcasa, caja..."
                        className={inputClass}
                      />
                    </Field>

                    <div>
                      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5 font-semibold">
                        Tipo de Bloqueo
                      </label>
                      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-950/60 border border-gray-800 rounded-xl">
                        {[
                          { key: 'none', label: 'Sin Clave' },
                          { key: 'password', label: 'Contraseña' },
                          { key: 'pattern', label: 'Patrón' }
                        ].map((item) => {
                          const active = device.lockType === item.key
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                updateDeviceField(device.id, 'lockType', item.key)
                                updateDeviceField(device.id, 'device_password', '')
                              }}
                              className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                active
                                  ? 'bg-cyan-500/10 border border-cyan-500/35 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                                  : 'bg-transparent border border-transparent text-gray-500 hover:text-gray-450'
                              }`}
                            >
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {device.lockType === 'password' && (
                      <motion.div
                        key="lock-password"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Field label="Contraseña / PIN de acceso" required>
                          <input
                            value={device.device_password}
                            onChange={e => updateDeviceField(device.id, 'device_password', e.target.value)}
                            placeholder="Ingresa la contraseña o PIN..."
                            required
                            className={inputClass}
                          />
                        </Field>
                      </motion.div>
                    )}

                    {device.lockType === 'pattern' && (
                      <motion.div
                        key="lock-pattern"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="pt-1"
                      >
                        <Field label="Patrón de bloqueo (Conecta puntos)" required>
                          <PatternLock
                            value={device.device_password}
                            onChange={(val) => updateDeviceField(device.id, 'device_password', val)}
                          />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="sm:col-span-1">
                      <Field label="Costo del trabajo">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            value={device.repair_cost}
                            onChange={e => updateDeviceField(device.id, 'repair_cost', e.target.value)}
                            placeholder="0"
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                      </Field>
                    </div>

                    {paymentMode === 'individual' && (
                      <>
                        <Field label="Abono entregado">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              min="0"
                              value={device.deposit}
                              onChange={e => updateDeviceField(device.id, 'deposit', e.target.value)}
                              placeholder="0"
                              className={`${inputClass} pl-7`}
                            />
                          </div>
                        </Field>
                        <Field label="Método pago abono">
                          <select
                            value={device.deposit_payment_method}
                            onChange={e => updateDeviceField(device.id, 'deposit_payment_method', e.target.value)}
                            className={inputClass}
                            disabled={!device.deposit || parseFloat(device.deposit) === 0}
                          >
                            <option value="">Ninguno / Sin abono</option>
                            <option value="efectivo">Efectivo 💵</option>
                            <option value="transferencia">Transferencia 🏦</option>
                            <option value="tarjeta">Tarjeta 💳</option>
                          </select>
                        </Field>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 3. SECCIÓN FORMA DE ABONO / PAGO (CONJUNTO O POR SEPARADO) */}
          {devices.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/60 rounded-2xl p-5 space-y-4 text-left"
            >
              <h2 className="font-bold text-xs tracking-widest uppercase text-gray-300 flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[10px] flex items-center justify-center font-black">3</span>
                Modalidad de abonos
              </h2>

              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-950/60 border border-gray-850 rounded-xl max-w-md">
                {[
                  { key: 'individual', label: 'Abonos Individuales' },
                  { key: 'conjunto', label: 'Abono Único Conjunto' }
                ].map((item) => {
                  const active = paymentMode === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPaymentMode(item.key)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        active
                          ? 'bg-cyan-500/10 border border-cyan-500/35 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                          : 'bg-transparent border border-transparent text-gray-500 hover:text-gray-450'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                {paymentMode === 'conjunto' && (
                  <motion.div
                    key="joint-payment-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 overflow-hidden text-left"
                  >
                    <Field label="Abono Total Recibido (Se dividirá por igual)" required>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          value={jointDeposit}
                          onChange={e => setJointDeposit(e.target.value)}
                          placeholder="Monto total pagado de abono"
                          required
                          className={`${inputClass} pl-7`}
                        />
                      </div>
                      {jointDeposit && devices.length > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1.5 font-bold">
                          Equivale a <span className="text-cyan-400">${(parseFloat(jointDeposit) / devices.length).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span> para cada uno de los {devices.length} equipos.
                        </p>
                      )}
                    </Field>

                    <Field label="Método de pago del Abono Conjunto" required>
                      <select
                        value={jointPaymentMethod}
                        onChange={e => setJointPaymentMethod(e.target.value)}
                        className={inputClass}
                      >
                        <option value="efectivo">Efectivo 💵</option>
                        <option value="transferencia">Transferencia 🏦</option>
                        <option value="tarjeta">Tarjeta 💳</option>
                      </select>
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 4. SECCIÓN PLAZO DE ENTREGA */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/60 rounded-2xl p-5 text-left"
          >
            <h2 className="font-bold text-xs tracking-widest uppercase text-gray-300 flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] flex items-center justify-center font-black">
                {devices.length > 1 ? '4' : '3'}
              </span>
              Fecha Estimada de Entrega
            </h2>
            <div className="relative">
              <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={estimatedDelivery}
                onChange={e => setEstimatedDelivery(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`${inputClass} pl-9`}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mt-2.5">
              Esta fecha se registrará en cada uno de los equipos ingresados.
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-xs text-center font-semibold"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white relative overflow-hidden group cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.25)]"
            style={{ background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))' }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 font-extrabold">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Registrando órdenes...</>
              ) : (
                <><Check size={16} className="stroke-[3]" /> Registrar {devices.length} {devices.length > 1 ? 'Reparaciones' : 'Reparación'}</>
              )}
            </span>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
          </motion.button>

        </form>
      </main>
    </div>
  )
}