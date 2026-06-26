import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, UserPlus, Check, Calendar } from 'lucide-react'
import { searchClients, createClient, createRepair } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'
import { parseError } from '../utils/errors'

const DEVICE_TYPES = ['phone', 'laptop', 'tablet', 'console', 'desktop', 'other']

const REGIONS_CL = [
  'Región de Arica y Parinacota', 'Región de Tarapacá', 'Región de Antofagasta',
  'Región de Atacama', 'Región de Coquimbo', 'Región de Valparaíso',
  'Región Metropolitana', "Región del Libertador General Bernardo O'Higgins",
  'Región del Maule', 'Región de Ñuble', 'Región del Biobío',
  'Región de La Araucanía', 'Región de Los Ríos', 'Región de Los Lagos',
  'Región de Aysén', 'Región de Magallanes'
]

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
        {label} {required && <span className="text-cyan-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus:border-cyan-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

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

  const onMouseDown = (e) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const onMouseMove = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    handleMove(e.clientX, e.clientY)
  }

  const onMouseUp = () => {
    handleEnd()
  }

  const onTouchStart = (e) => {
    if (e.touches.length === 0) return
    e.preventDefault()
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const onTouchMove = (e) => {
    if (!isDrawing || e.touches.length === 0) return
    e.preventDefault()
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const onTouchEnd = () => {
    handleEnd()
  }

  const clearPattern = () => {
    setPath([])
    onChange('')
  }

  useEffect(() => {
    if (!value) {
      setPath([])
    } else if (value.startsWith('Patrón: ')) {
      const parts = value.replace('Patrón: ', '').split('-').map(Number).filter(Boolean)
      setPath(parts)
    }
  }, [value])

  return (
    <div className="flex flex-col items-center gap-3 bg-gray-955/70 border border-gray-800 rounded-2xl p-4 w-fit mx-auto select-none">
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider h-4">
        {path.length > 0 ? `Patrón ingresado: ${path.join(' ➔ ')}` : 'Dibuja el patrón uniendo los puntos'}
      </div>
      
      <svg
        ref={svgRef}
        width="240"
        height="240"
        viewBox="0 0 240 240"
        className="cursor-pointer select-none touch-none bg-gray-900/40 rounded-xl"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {path.map((dotId, index) => {
          if (index === 0) return null
          const prevDot = dots.find(d => d.id === path[index - 1])
          const currDot = dots.find(d => d.id === dotId)
          if (!prevDot || !currDot) return null
          return (
            <line
              key={`line-${index}`}
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
  const [lockType, setLockType] = useState('none') // 'none', 'password', 'pattern'
  const [clientResults, setClientResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '', phone: '', email: '', rut: '', city: ''
  })
  const [searchLoading, setSearchLoading] = useState(false)

  const [repair, setRepair] = useState({
    device_type: 'phone',
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
    if (lockType === 'pattern' && (!repair.device_password || !repair.device_password.startsWith('Patrón: '))) {
      setError('Por favor dibuja un patrón en la cuadrícula')
      return
    }
    setSubmitting(true)
    try {
      let clientId = selectedClient?.id
      if (showNewClient) {
        const res = await createClient(newClient)
        clientId = res.data.id
      }

      // Limpiamos los campos opcionales — string vacío → null
      const payload = {
        client_id: clientId,
        device_type: repair.device_type,
        brand: repair.brand,
        model: repair.model,
        reported_issue: repair.reported_issue,
        accessories: repair.accessories || null,
        device_password: repair.device_password || null,
        estimated_delivery: repair.estimated_delivery || null,
        repair_cost: repair.repair_cost ? parseFloat(repair.repair_cost) : null,
        deposit: repair.deposit ? parseFloat(repair.deposit) : null,
      }
      await createRepair(payload)
      navigate('/repairs')
    } catch (err) {
      setError(parseError(err, 'Error al crear la reparación'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      <AnimatedBackground />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/repairs')}
            className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-xl font-black tracking-wider"
              style={{
                background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Nueva Reparación
            </h1>
            <p className="text-gray-600 text-xs">Registra un nuevo equipo</p>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Sección cliente */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-5"
          >
            <h2 className="font-bold text-sm tracking-wider text-gray-300 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
              Cliente
            </h2>

            {selectedClient ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-sm">{selectedClient.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {selectedClient.phone}
                    {selectedClient.rut && ` · RUT ${selectedClient.rut}`}
                    {selectedClient.city && ` · ${selectedClient.city}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setClientSearch('') }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Cambiar
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    value={clientSearch}
                    onChange={e => handleClientSearch(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o RUT..."
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/70 transition-all"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <AnimatePresence>
                  {clientResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border border-gray-700/50 rounded-xl overflow-hidden"
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
                          className="w-full text-left px-4 py-3 hover:bg-gray-800/80 transition-colors border-b border-gray-800/50 last:border-0"
                        >
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
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
                  className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
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

          {/* Sección dispositivo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-5 space-y-4"
          >
            <h2 className="font-bold text-sm tracking-wider text-gray-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs flex items-center justify-center font-bold">2</span>
              Dispositivo
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tipo" required>
                <select
                  value={repair.device_type}
                  onChange={e => setRepair({ ...repair, device_type: e.target.value })}
                  className={inputClass}
                >
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Marca" required>
                <input
                  value={repair.brand}
                  onChange={e => setRepair({ ...repair, brand: e.target.value })}
                  placeholder="Samsung, Apple..."
                  required
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Modelo" required>
              <input
                value={repair.model}
                onChange={e => setRepair({ ...repair, model: e.target.value })}
                placeholder="Galaxy S21, iPhone 14..."
                required
                className={inputClass}
              />
            </Field>

            <Field label="Problema reportado" required>
              <textarea
                value={repair.reported_issue}
                onChange={e => setRepair({ ...repair, reported_issue: e.target.value })}
                placeholder="Describe el problema del equipo..."
                required
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Accesorios entregados">
                <input
                  value={repair.accessories}
                  onChange={e => setRepair({ ...repair, accessories: e.target.value })}
                  placeholder="Cargador, funda..."
                  className={inputClass}
                />
              </Field>

              <div>
                <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
                  Tipo de Bloqueo del Dispositivo
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-950/60 border border-gray-800 rounded-xl">
                  {[
                    { key: 'none', label: 'Sin Clave' },
                    { key: 'password', label: 'Contraseña' },
                    { key: 'pattern', label: 'Patrón' }
                  ].map((item) => {
                    const active = lockType === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setLockType(item.key)
                          setRepair(prev => ({ ...prev, device_password: '' }))
                        }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
              {lockType === 'password' && (
                <motion.div
                  key="lock-password"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Field label="Contraseña / PIN del equipo" required>
                    <input
                      value={repair.device_password}
                      onChange={e => setRepair({ ...repair, device_password: e.target.value })}
                      placeholder="Ingresa la contraseña o PIN..."
                      required
                      className={inputClass}
                    />
                  </Field>
                </motion.div>
              )}

              {lockType === 'pattern' && (
                <motion.div
                  key="lock-pattern"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="pt-1"
                >
                  <Field label="Patrón del dispositivo (Dibuja conectando puntos)" required>
                    <PatternLock
                      value={repair.device_password}
                      onChange={(val) => setRepair(prev => ({ ...prev, device_password: val }))}
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Valor de la reparación">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    value={repair.repair_cost}
                    onChange={e => setRepair({ ...repair, repair_cost: e.target.value })}
                    placeholder="0"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </Field>
              <Field label="Abono recibido">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    value={repair.deposit}
                    onChange={e => setRepair({ ...repair, deposit: e.target.value })}
                    placeholder="0"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </Field>
            </div>
          </motion.div>

          {/* Fecha estimada */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-5"
          >
            <h2 className="font-bold text-sm tracking-wider text-gray-300 flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
              Fecha Estimada de Entrega
            </h2>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="date"
                value={repair.estimated_delivery}
                onChange={e => setRepair({ ...repair, estimated_delivery: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={`${inputClass} pl-9`}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <p className="text-gray-600 text-xs mt-2">
              Esta fecha se mostrará en el calendario del dashboard como recordatorio.
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
            style={{ background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))' }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Check size={16} /> Registrar Reparación</>
              )}
            </span>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
          </motion.button>

        </form>
      </main>
    </div>
  )
}