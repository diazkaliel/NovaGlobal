import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Wrench, ArrowLeft, ChevronRight, ChevronLeft,
  Calendar, Clock, AlertCircle, ChevronDown, Download,
  Flame, Smartphone, Laptop, Gamepad2, Tablet, Cpu, MessageSquare, Trash2, Palette,
  Grid, List, CheckCircle, Info, DollarSign, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus, deleteRepair } from '../../api/repairs'
import { createQAInspection } from '../../api/bravoBlueprint'
import api from '../../api/client'
import BravoBackground from '../../components/bravo/BravoBackground'
import WhatsAppButton from '../../components/WhatsAppButton'

const STATUS_CONFIG_BRAVO = {
  pendiente:           { label: 'Pendiente Web ⏳',     dot: '#fbbf24', badge: 'bg-amber-950/40 border-amber-550/30 text-amber-400 animate-pulse' },
  recibido:            { label: 'Recibido',            dot: '#3a86ff', badge: 'bg-blue-950/40 border-blue-500/30 text-blue-400' },
  diagnostico:         { label: 'En Diseño',          dot: '#ffd166', badge: 'bg-yellow-950/40 border-yellow-500/30 text-yellow-400' },
  diseno_aprobado:     { label: 'Diseño Aprobado',     dot: '#ec4899', badge: 'bg-pink-950/40 border-pink-500/30 text-pink-400' },
  esperando_repuesto:  { label: 'Espera Insumos',      dot: '#f77f00', badge: 'bg-orange-950/40 border-orange-500/30 text-orange-400' },
  presupuesto_enviado: { label: 'Muestra Enviada',         dot: '#a855f7', badge: 'bg-purple-950/40 border-purple-500/30 text-purple-400' },
  en_reparacion:       { label: 'En Producción',        dot: '#00d2de', badge: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 font-bold' },
  listo:               { label: 'Listo p/ Entrega',                dot: '#06d6a0', badge: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 font-bold' },
  entregado:           { label: 'Entregado',            dot: '#4a596e', badge: 'bg-stone-900 border-stone-850 text-stone-400' },
  cancelado:           { label: 'Cancelado',            dot: '#ff006e', badge: 'bg-red-950/40 border-red-500/30 text-red-400' },
  critico:             { label: 'Crítico 🚨',           dot: '#ff006e', badge: 'bg-rose-950/60 border-rose-500/40 text-rose-400 font-black animate-pulse' },
}

const STAGES_SEQUENCE = [
  'pendiente',
  'recibido',
  'diagnostico',
  'diseno_aprobado',
  'esperando_repuesto',
  'presupuesto_enviado',
  'en_reparacion',
  'listo',
  'entregado'
]

const STATUS_LABELS_BRAVO = {
  pendiente:           'Pendiente Web',
  recibido:            'Recibido',
  diagnostico:         'En Diseño',
  diseno_aprobado:     'Diseño Aprobado',
  esperando_repuesto:  'Espera Insumos',
  presupuesto_enviado: 'Muestra Enviada',
  en_reparacion:       'En Producción',
  listo:               'Listo p/ Entrega',
  entregado:           'Entregado',
  cancelado:           'Cancelado',
  critico:             'Crítico 🚨',
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG_BRAVO)

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG_BRAVO[status] ?? STATUS_CONFIG_BRAVO.recibido
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${cfg.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  )
}

import { createPortal } from 'react-dom'

function StatusDropdown({ repair, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [menuPosition, setMenuPosition] = useState('bottom')
  const ref = useRef(null)

  const handleChange = async (newStatus) => {
    if (newStatus === repair.status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    try { await onUpdate(repair.id, newStatus) }
    finally { setLoading(false) }
  }

  const handleToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setMenuPosition(spaceBelow < 260 ? 'top' : 'bottom')
    }
    setOpen(o => !o)
  }

  const getFixedStyle = () => {
    if (!ref.current) return {}
    const rect = ref.current.getBoundingClientRect()
    const style = { position: 'fixed', zIndex: 99999 }
    if (menuPosition === 'top') {
      style.bottom = `${window.innerHeight - rect.top + 6}px`
      style.top = 'auto'
    } else {
      style.top = `${rect.bottom + 6}px`
      style.bottom = 'auto'
    }
    style.right = `${window.innerWidth - rect.right}px`
    style.left = 'auto'
    return style
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-bravo-input border border-bravo-border text-bravo-text hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
      >
        {loading ? (
          <span className="text-[11px] text-bravo-text-muted animate-pulse">Actualizando…</span>
        ) : (
          <>
            <span className="text-[11px]">Estado</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180 text-bravo-accent' : ''}`} />
          </>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-[99998]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
              <motion.ul
                role="listbox"
                initial={{ opacity: 0, y: menuPosition === 'top' ? 6 : -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{ opacity: 0, y: menuPosition === 'top' ? 6 : -6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="bg-stone-950 border border-bravo-border rounded-xl p-1.5 min-w-[190px] shadow-2xl list-none fixed z-[99999]"
                style={getFixedStyle()}
              >
                {ALL_STATUSES.map(s => {
                  const cfg = STATUS_CONFIG_BRAVO[s]
                  const active = s === repair.status
                  return (
                    <li
                      key={s}
                      role="option"
                      aria-selected={active}
                      onClick={(e) => { e.stopPropagation(); handleChange(s); }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                        active 
                          ? 'bg-stone-900 text-bravo-accent cursor-default font-bold' 
                          : 'text-bravo-text-muted hover:bg-stone-900 hover:text-bravo-text'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
                      <span className="flex-1 text-left">{cfg.label}</span>
                      {active && <span className="text-[9px] text-bravo-accent uppercase tracking-widest font-black">actual</span>}
                    </li>
                  )
                })}
              </motion.ul>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

function getDeviceIcon(deviceType) {
  const type = (deviceType || '').toLowerCase()
  if (type.includes('polera') || type.includes('t-shirt') || type.includes('polera')) {
    return '👕'
  }
  if (type.includes('poleron') || type.includes('polerón') || type.includes('ropa') || type.includes('textil')) {
    return '🧥'
  }
  if (type.includes('tazon') || type.includes('tazón') || type.includes('taza') || type.includes('mug')) {
    return '☕'
  }
  if (type.includes('jockey') || type.includes('gorro') || type.includes('visera')) {
    return '🧢'
  }
  if (type.includes('botella') || type.includes('termo') || type.includes('vaso')) {
    return '🍼'
  }
  return '📦'
}

export default function BravoOrdersPage() {
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedRepairForDelivery, setSelectedRepairForDelivery] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [deliveringStatus, setDeliveringStatus] = useState(false)

  // QA checklist states in Kanban
  const [showQAModal, setShowQAModal] = useState(false)
  const [qaTargetOrderId, setQaTargetOrderId] = useState(null)
  const [qaChecklist, setQaChecklist] = useState({
    hilos_cortados: false,
    sin_manchas: false,
    curado_temperatura: false,
    empaque_correcto: false
  })
  const [qaComments, setQaComments] = useState('')

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const params = { system: 'bravo' }
      if (statusFilter) params.status = statusFilter
      const res = await getRepairs(params)
      setRepairs(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepairs()
  }, [statusFilter])

  const handleDeleteRepair = async (repairId, orderNumber, e) => {
    e.stopPropagation()
    if (window.confirm(`¿Estás seguro de que deseas eliminar la orden Bravo ${orderNumber}? Esta acción eliminará todo su historial.`)) {
      try {
        await deleteRepair(repairId)
        fetchRepairs()
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar la orden.')
      }
    }
  }

  const handleStepStatus = async (repairId, currentStatus, direction) => {
    let currentIndex = STAGES_SEQUENCE.indexOf(currentStatus)
    if (currentIndex === -1) {
      currentIndex = 0
    }
    
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex < 0 || nextIndex >= STAGES_SEQUENCE.length) return
    
    const nextStatus = STAGES_SEQUENCE[nextIndex]
    await handleStatusUpdate(repairId, nextStatus)
  }

  const handleStatusUpdate = async (repairId, newStatus) => {
    if (newStatus === 'entregado') {
      const rep = repairs.find(r => r.id === repairId)
      if (rep) {
        setSelectedRepairForDelivery(rep)
        const cost = parseFloat(rep.repair_cost || 0)
        const dep = parseFloat(rep.deposit || 0)
        setPaymentAmount(Math.max(0, cost - dep).toString())
        setPaymentMethod('efectivo')
        setShowPaymentModal(true)
      }
      return
    }

    try {
      await updateRepairStatus(repairId, { new_status: newStatus })
      setRepairs(prev => prev.map(r => r.id === repairId ? { ...r, status: newStatus } : r))
    } catch (err) {
      if (err.response?.status === 422) {
        setQaTargetOrderId(repairId)
        setQaChecklist({
          hilos_cortados: false,
          sin_manchas: false,
          curado_temperatura: false,
          empaque_correcto: false
        })
        setQaComments('')
        setShowQAModal(true)
      } else {
        alert(err.response?.data?.detail || 'Error al actualizar el estado.')
      }
    }
  }

  const handleDeliverConfirm = async () => {
    if (!selectedRepairForDelivery) return
    setDeliveringStatus(true)
    try {
      await updateRepairStatus(selectedRepairForDelivery.id, {
        new_status: 'entregado',
        payment_amount: parseFloat(paymentAmount || 0),
        payment_method: paymentMethod
      })
      setRepairs(prev => prev.map(r => r.id === selectedRepairForDelivery.id ? { ...r, status: 'entregado' } : r))
      setShowPaymentModal(false)
      setSelectedRepairForDelivery(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al entregar la orden.')
    } finally {
      setDeliveringStatus(false)
    }
  }

  const handleSubmitQA = async (e) => {
    e.preventDefault()
    if (!qaTargetOrderId) return
    try {
      const passed = Object.values(qaChecklist).every(val => val === true)
      if (!passed) {
        alert('Debes marcar todos los checks para poder aprobar la orden y pasar a Listo.')
        return
      }
      await createQAInspection({
        order_id: qaTargetOrderId,
        checklist_results: qaChecklist,
        passed: true,
        comments: qaComments
      })
      
      // Volver a actualizar estado a 'listo'
      await updateRepairStatus(qaTargetOrderId, { new_status: 'listo' })
      setRepairs(prev => prev.map(r => r.id === qaTargetOrderId ? { ...r, status: 'listo' } : r))
      setShowQAModal(false)
      setQaTargetOrderId(null)
      fetchRepairs()
    } catch (err) {
      console.error(err)
      alert('Error al guardar el control de calidad.')
    }
  }

  const filtered = repairs.filter(r => {
    // Si no hay filtro de estado seleccionado, ocultamos por defecto las 'pendiente'
    if (statusFilter === '' && r.status === 'pendiente') return false

    // Si hay un filtro seleccionado, debe coincidir
    if (statusFilter !== '' && r.status !== statusFilter) return false

    const term = search.toLowerCase()
    return (
      r.order_number.toLowerCase().includes(term) ||
      (r.client?.name || '').toLowerCase().includes(term) ||
      (r.brand || '').toLowerCase().includes(term) ||
      (r.model || '').toLowerCase().includes(term) ||
      (r.device_type || '').toLowerCase().includes(term)
    )
  })

  const stats = {
    activas: repairs.filter(r => r.status !== 'entregado' && r.status !== 'cancelado' && r.status !== 'pendiente').length,
    listas: repairs.filter(r => r.status === 'listo').length,
    vencidas: repairs.filter(r => {
      if (r.status === 'entregado' || r.status === 'cancelado' || r.status === 'pendiente' || !r.estimated_delivery) return false
      return new Date(r.estimated_delivery) < new Date().setHours(0,0,0,0)
    }).length
  }

  return (
    <div className="space-y-6 relative text-left">
      <BravoBackground />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bravo-border pb-5">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent to-bravo-accent-warm bg-clip-text text-transparent uppercase tracking-wider">
            Órdenes de Trabajo
          </h1>
          <p className="text-bravo-text-muted text-xs mt-1">
            {repairs.length} proyectos registrados en el estudio
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-black cursor-pointer shadow-md shadow-bravo-glow"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          onClick={() => navigate('/bravo/orders/new')}
        >
          <Plus size={14} className="stroke-[3]" />
          Nueva Orden
        </motion.button>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Órdenes Activas', value: stats.activas, color: 'text-bravo-accent bg-bravo-accent/5 border border-bravo-border/60 shadow-xs' },
          { label: 'Listas para Retiro', value: stats.listas, color: 'text-emerald-450 bg-emerald-500/5 border border-emerald-550/20 shadow-xs' },
          { label: 'Entregas Vencidas', value: stats.vencidas, color: 'text-rose-500 bg-rose-500/5 border border-rose-550/20 shadow-xs' },
        ].map((s) => (
          <div
            key={s.label}
            className={`border rounded-2xl p-5 flex flex-col items-start justify-between bg-bravo-card/60 backdrop-blur-sm transition-all hover:translate-y-[-2px] ${s.color.split(' ')[2]}`}
          >
            <div className={`text-3xl font-black ${s.color.split(' ')[0]}`}>{s.value}</div>
            <div className="text-bravo-text-muted text-[10px] font-bold uppercase tracking-wider mt-2">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter, Search & View Selector Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
            <input
              className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/30 focus:border-bravo-accent/50 focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-bravo-text transition-all placeholder-stone-500 backdrop-blur-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por número de orden, cliente, producto..."
            />
          </div>
          {/* Switcher */}
          <div className="flex bg-bravo-input border border-bravo-border rounded-xl p-1 shrink-0 self-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-bravo-accent text-black shadow-sm' 
                  : 'text-bravo-text-muted hover:text-bravo-text'
              }`}
            >
              <Grid size={12} />
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-bravo-accent text-black shadow-sm' 
                  : 'text-bravo-text-muted hover:text-bravo-text'
              }`}
            >
              <List size={12} />
              Lista
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 select-none w-full justify-start mt-1">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === '' 
                ? 'bg-bravo-accent/10 border-bravo-accent/40 text-bravo-accent shadow-xs font-bold' 
                : 'bg-bravo-input border border-bravo-border/60 text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/30'
            }`}
          >
            Todos
          </button>
          {ALL_STATUSES.map(s => {
            const active = statusFilter === s
            const cfg = STATUS_CONFIG_BRAVO[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(active ? '' : s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'bg-bravo-accent/10 border-bravo-accent/40 text-bravo-accent shadow-xs font-bold' 
                    : 'bg-bravo-input border border-bravo-border/60 text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/30'
                }`}
              >
                {cfg.label.replace(' 🚨', '')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main List / Grid */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 w-full bg-bravo-card border border-bravo-border/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-bravo-card/30 border border-bravo-border rounded-3xl">
          <Wrench size={32} className="mx-auto text-stone-600 mb-3" />
          <p className="text-bravo-text-muted text-sm font-semibold">No se encontraron órdenes</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Vista de Tarjetas Premium */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((repair, i) => {
            const isCrit = repair.status === 'critico'
            const cost = parseFloat(repair.repair_cost || 0)
            const deposit = parseFloat(repair.deposit || 0)
            const balance = cost - deposit
            const percentPaid = cost > 0 ? Math.min(100, Math.round((deposit / cost) * 100)) : 0

            return (
              <motion.div
                key={repair.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                whileHover={{ y: -4, boxShadow: '0 12px 24px -10px rgba(245, 158, 11, 0.15)' }}
                onClick={() => navigate(`/bravo/orders/${repair.id}`)}
                className={`relative bg-bravo-card border rounded-3xl p-5 flex flex-col justify-between overflow-visible cursor-pointer transition-all duration-300 ${
                  isCrit ? 'border-rose-500/40 shadow-lg shadow-rose-950/15 bg-rose-500/5 animate-pulse' : 'border-bravo-border hover:border-bravo-accent/40'
                }`}
              >
                {/* Left neon border indicator matching status color */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-3xl" 
                  style={{ background: STATUS_CONFIG_BRAVO[repair.status]?.dot || '#f59e0b' }}
                />

                <div className="space-y-4">
                  {/* Fila superior: Orden + Badge */}
                  <div className="flex justify-between items-start pl-1">
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-black text-bravo-accent">
                        {repair.order_number}
                        {repair.is_split_child && (
                          <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-bravo-accent rounded text-[7px] font-black uppercase tracking-wider scale-90 origin-left">Parcial</span>
                        )}
                        {isCrit && <Flame size={12} className="text-rose-500 animate-bounce" />}
                      </div>
                      <div className="text-[9px] text-bravo-text-muted mt-0.5">
                        {new Date(repair.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <StatusBadge status={repair.status} />
                  </div>

                  {/* Detalle Producto & Cliente */}
                  <div className="space-y-1 text-left pl-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{getDeviceIcon(repair.device_type)}</span>
                      <span className="text-bravo-text text-xs font-black capitalize truncate">
                        {repair.device_type} {repair.brand} {repair.model}
                      </span>
                    </div>
                    <p className="text-[11px] text-bravo-text-muted truncate pl-6">
                      {repair.client ? `Cliente: ${repair.client.name}` : `Falla: ${repair.reported_issue}`}
                    </p>
                    {repair.print_technique && (
                      <div className="flex flex-wrap gap-1 mt-2 pl-6">
                        <span className="px-2 py-0.5 bg-bravo-input text-[8px] font-bold text-bravo-accent rounded border border-bravo-border uppercase tracking-wider">
                          {repair.print_technique}
                        </span>
                        {repair.print_location && (
                          <span className="px-2 py-0.5 bg-stone-900/40 text-[8px] font-semibold text-bravo-text-muted rounded border border-bravo-border/40 uppercase">
                            {repair.print_location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Estado del Proyecto Simple y Limpio */}
                  <div className="flex items-center justify-between text-xs py-2 px-3 bg-bravo-input/40 border border-bravo-border/40 rounded-xl pl-2">
                    <span className="text-bravo-text-muted text-[11px]">Etapa:</span>
                    <span className="flex items-center gap-1.5 font-extrabold text-bravo-text text-[11px]">
                      <span 
                        className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" 
                        style={{ 
                          backgroundColor: STATUS_CONFIG_BRAVO[repair.status]?.dot || '#f59e0b',
                          boxShadow: `0 0 8px ${STATUS_CONFIG_BRAVO[repair.status]?.dot || '#f59e0b'}` 
                        }} 
                      />
                      {STATUS_CONFIG_BRAVO[repair.status]?.label}
                    </span>
                  </div>

                  {/* Cobros y Finanzas */}
                  <div className="pt-3 border-t border-bravo-border/30 space-y-1.5 pl-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-bravo-text-muted">Costo: <strong className="text-bravo-text font-black">${cost.toLocaleString('es-CL')}</strong></span>
                      <span className="text-bravo-text-muted font-mono text-[10px]">{percentPaid}% pagado</span>
                    </div>
                    {/* Barra de progreso de pago */}
                    <div className="w-full h-1.5 bg-stone-900 border border-bravo-border/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs pt-0.5">
                      {balance > 0 ? (
                        <span className="text-amber-500 font-extrabold text-[11px]">Saldo: ${balance.toLocaleString('es-CL')}</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-0.5 font-bold text-[11px]">✓ Pagado</span>
                      )}

                      {repair.estimated_delivery && (
                        <span className={`flex items-center gap-1 font-semibold text-[11px] ${
                          new Date(repair.estimated_delivery) < new Date().setHours(0,0,0,0) && repair.status !== 'entregado'
                            ? 'text-rose-500 font-black animate-pulse'
                            : 'text-bravo-text-muted'
                        }`}>
                          <Calendar size={11} />
                          {new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-bravo-border/30 pl-1" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 bg-bravo-input/30 p-1 border border-bravo-border/20 rounded-2xl">
                    <button
                      onClick={() => handleStepStatus(repair.id, repair.status, 'prev')}
                      disabled={STAGES_SEQUENCE.indexOf(repair.status) <= 0}
                      className="p-1 hover:bg-bravo-input/50 rounded-lg text-bravo-text-muted hover:text-bravo-accent disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all"
                      title="Retroceder Estado"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    
                    <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />

                    <button
                      onClick={() => handleStepStatus(repair.id, repair.status, 'next')}
                      disabled={STAGES_SEQUENCE.indexOf(repair.status) === -1 || STAGES_SEQUENCE.indexOf(repair.status) >= STAGES_SEQUENCE.length - 1}
                      className="p-1 hover:bg-bravo-input/50 rounded-lg text-bravo-text-muted hover:text-bravo-accent disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all"
                      title="Avanzar Estado"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {repair.client && (
                      <WhatsAppButton 
                        phone={repair.client.phone} 
                        clientName={repair.client.name} 
                        orderNumber={repair.order_number} 
                        status={repair.status}
                        deviceLabel={`${repair.device_type} ${repair.brand} ${repair.model}`}
                        customLabelMap={STATUS_LABELS_BRAVO}
                        isBravo={true}
                      />
                    )}
                    <button 
                      className="p-1.5 border border-bravo-border hover:border-bravo-accent/40 rounded-xl bg-bravo-input text-bravo-text-muted hover:text-bravo-accent cursor-pointer transition-all shadow-xs"
                      onClick={() => navigate(`/bravo/orders/${repair.id}`)}
                      title="Ver Detalles"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* Vista de Tabla / Lista Moderna */
        <div className="overflow-x-auto bg-bravo-card border border-bravo-border rounded-3xl p-4 shadow-xl bravo-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-bravo-border/60 text-[10px] font-mono font-bold text-bravo-text-muted uppercase tracking-widest">
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">Detalle</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Entrega</th>
                <th className="py-3 px-4 text-right">Monto / Saldo</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bravo-border/20 text-xs">
              {filtered.map((repair, i) => {
                const isCrit = repair.status === 'critico'
                const balance = (repair.repair_cost || 0) - (repair.deposit || 0)
                return (
                  <tr 
                    key={repair.id} 
                    onClick={() => navigate(`/bravo/orders/${repair.id}`)}
                    className="group hover:bg-bravo-accent/5 transition-all cursor-pointer"
                  >
                    {/* Orden info */}
                    <td className="py-4 px-4 font-mono font-bold text-bravo-accent">
                      <div className="flex items-center gap-1.5">
                        {repair.order_number}
                        {repair.is_split_child && (
                          <span className="px-1 py-0.5 bg-amber-500/10 border border-amber-500/20 text-bravo-accent rounded text-[7px] font-black uppercase">Parcial</span>
                        )}
                        {isCrit && <Flame size={12} className="text-rose-500 animate-bounce" />}
                      </div>
                      <div className="text-[9px] text-bravo-text-muted font-semibold mt-0.5">
                        {new Date(repair.created_at).toLocaleDateString('es-CL')}
                      </div>
                    </td>
                    
                    {/* Detalle */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">{getDeviceIcon(repair.device_type)}</span>
                        <div>
                          <span className="text-bravo-text font-black capitalize block">{repair.device_type} {repair.brand} {repair.model}</span>
                          <span className="text-[10px] text-bravo-text-muted block mt-0.5">
                            {repair.client ? `Cliente: ${repair.client.name}` : `Falla: ${repair.reported_issue}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-center items-center gap-1">
                        <button
                          onClick={() => handleStepStatus(repair.id, repair.status, 'prev')}
                          disabled={STAGES_SEQUENCE.indexOf(repair.status) <= 0}
                          className="p-1 hover:bg-bravo-input rounded-lg text-bravo-text-muted hover:text-bravo-accent disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all"
                          title="Retroceder Estado"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        
                        <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />

                        <button
                          onClick={() => handleStepStatus(repair.id, repair.status, 'next')}
                          disabled={STAGES_SEQUENCE.indexOf(repair.status) === -1 || STAGES_SEQUENCE.indexOf(repair.status) >= STAGES_SEQUENCE.length - 1}
                          className="p-1 hover:bg-bravo-input rounded-lg text-bravo-text-muted hover:text-bravo-accent disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all"
                          title="Avanzar Estado"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>

                    {/* Entrega */}
                    <td className="py-4 px-4 text-center">
                      {repair.estimated_delivery ? (
                        <span className={`inline-flex items-center gap-1 font-semibold ${
                          new Date(repair.estimated_delivery) < new Date().setHours(0,0,0,0) && repair.status !== 'entregado'
                            ? 'text-rose-500 font-bold'
                            : 'text-bravo-text-muted'
                        }`}>
                          <Calendar size={11} />
                          {new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : (
                        <span className="text-stone-500 italic text-[11px]">Por definir</span>
                      )}
                    </td>

                    {/* Monto / Saldo */}
                    <td className="py-4 px-4 text-right">
                      <div className="font-extrabold text-bravo-text">${Number(repair.repair_cost || 0).toLocaleString('es-CL')}</div>
                      {balance > 0 ? (
                        <div className="text-[9px] text-orange-500 font-bold mt-0.5">Saldo: ${balance.toLocaleString('es-CL')}</div>
                      ) : (
                        <div className="text-[9px] text-emerald-450 font-bold mt-0.5">Pagado</div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {repair.client && (
                          <WhatsAppButton 
                            phone={repair.client.phone} 
                            clientName={repair.client.name} 
                            orderNumber={repair.order_number} 
                            status={repair.status}
                            deviceLabel={`${repair.device_type} ${repair.brand} ${repair.model}`}
                            customLabelMap={STATUS_LABELS_BRAVO}
                            isBravo={true}
                          />
                        )}
                        <button 
                          className="p-1.5 border border-bravo-border hover:border-bravo-accent/40 rounded-xl bg-bravo-input text-bravo-text-muted hover:text-bravo-accent cursor-pointer transition-all shadow-xs"
                          onClick={() => navigate(`/bravo/orders/${repair.id}`)}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CHECKLIST CONTROL DE CALIDAD (QA) FORZADO */}
      <AnimatePresence>
        {showQAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => { setShowQAModal(false); setQaTargetOrderId(null); }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-sm shadow-2xl relative space-y-4 text-xs text-bravo-text"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={16} />
                  Control de Calidad Obligatorio
                </h3>
                <button onClick={() => { setShowQAModal(false); setQaTargetOrderId(null); }} className="p-1 hover:bg-stone-900 rounded text-bravo-text-muted"><X size={15} /></button>
              </div>

              <form onSubmit={handleSubmitQA} className="space-y-4">
                <p className="text-[11px] text-bravo-text-muted leading-relaxed italic text-left">
                  Acción Bloqueada. Para poder marcar la orden como Listo para Entrega, debes completar e inspeccionar físicamente la prenda/producto confirmando los siguientes puntos:
                </p>

                <div className="space-y-3 bg-bravo-input/50 border border-bravo-border/60 p-4 rounded-xl">
                  {/* Hilos Cortados */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaChecklist.hilos_cortados}
                      onChange={e => setQaChecklist({ ...qaChecklist, hilos_cortados: e.target.checked })}
                      className="w-4 h-4 rounded text-bravo-accent border-bravo-border focus:ring-0 mt-0.5"
                    />
                    <div className="text-left">
                      <p className="font-extrabold text-bravo-text leading-none">Limpieza de Hilos</p>
                      <p className="text-[10px] text-bravo-text-muted mt-0.5">Hilos sobrantes y entretela removidos por completo.</p>
                    </div>
                  </label>

                  {/* Sin Manchas */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaChecklist.sin_manchas}
                      onChange={e => setQaChecklist({ ...qaChecklist, sin_manchas: e.target.checked })}
                      className="w-4 h-4 rounded text-bravo-accent border-bravo-border focus:ring-0 mt-0.5"
                    />
                    <div className="text-left">
                      <p className="font-extrabold text-bravo-text leading-none">Inspección de Superficie</p>
                      <p className="text-[10px] text-bravo-text-muted mt-0.5">Prenda limpia, libre de manchas de tinta o grasa de plancha.</p>
                    </div>
                  </label>

                  {/* Curado y Temperatura */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaChecklist.curado_temperatura}
                      onChange={e => setQaChecklist({ ...qaChecklist, curado_temperatura: e.target.checked })}
                      className="w-4 h-4 rounded text-bravo-accent border-bravo-border focus:ring-0 mt-0.5"
                    />
                    <div className="text-left">
                      <p className="font-extrabold text-bravo-text leading-none">Curado / Fijación</p>
                      <p className="text-[10px] text-bravo-text-muted mt-0.5">Fijación térmica completa (sin desprendimientos al tacto).</p>
                    </div>
                  </label>

                  {/* Empaque Correcto */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaChecklist.empaque_correcto}
                      onChange={e => setQaChecklist({ ...qaChecklist, empaque_correcto: e.target.checked })}
                      className="w-4 h-4 rounded text-bravo-accent border-bravo-border focus:ring-0 mt-0.5"
                    />
                    <div className="text-left">
                      <p className="font-extrabold text-bravo-text leading-none">Empaque y Rotulado</p>
                      <p className="text-[10px] text-bravo-text-muted mt-0.5">Doblado y empaquetado en bolsa protectora con etiqueta legible.</p>
                    </div>
                  </label>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold">Comentarios de Auditoría</label>
                  <input
                    type="text"
                    placeholder="Ej: Impresión DTF perfecta, listo."
                    value={qaComments}
                    onChange={e => setQaComments(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-bravo-accent hover:bg-[#d98205] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Registrar & Aprobar Entrega
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => { setShowPaymentModal(false); setSelectedRepairForDelivery(null) }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-sm shadow-2xl relative space-y-4 text-bravo-text"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider">
                  Registrar Entrega y Pago (Bravo)
                </h3>
                <button onClick={() => { setShowPaymentModal(false); setSelectedRepairForDelivery(null) }} className="p-1 hover:bg-stone-900 rounded text-bravo-text-muted"><X size={15} /></button>
              </div>

              <p className="text-bravo-text-muted text-[11px] leading-relaxed text-left">
                Por favor, ingresa los detalles del cobro final de esta orden de Bravo.
              </p>

              {/* Resumen de Costos */}
              <div className="bg-bravo-input/70 border border-bravo-border/40 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-bravo-text-muted">Costo Total:</span>
                  <span className="font-bold text-bravo-text">${parseFloat(selectedRepairForDelivery?.repair_cost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bravo-text-muted">Abono recibido:</span>
                  <span className="font-bold text-emerald-450">${parseFloat(selectedRepairForDelivery?.deposit || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-bravo-border/30 pt-2 flex justify-between font-extrabold">
                  <span>Monto sugerido a pagar:</span>
                  <span className="text-bravo-accent">
                    ${Math.max(0, parseFloat(selectedRepairForDelivery?.repair_cost || 0) - parseFloat(selectedRepairForDelivery?.deposit || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Formulario */}
              <div className="space-y-3">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-bravo-text-muted">Monto Pagado ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none transition-all"
                    placeholder="Monto cobrado"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-bravo-text-muted">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border focus:border-bravo-accent rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none transition-all"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="tarjeta_debito">Tarjeta de Débito</option>
                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                  </select>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowPaymentModal(false); setSelectedRepairForDelivery(null) }}
                  className="flex-1 py-2 bg-stone-900 hover:bg-stone-850 text-bravo-text-muted font-bold uppercase rounded-xl transition-all cursor-pointer text-center text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeliverConfirm}
                  disabled={!paymentAmount || deliveringStatus}
                  className="flex-1 py-2 bg-bravo-accent hover:bg-[#d98205] text-black font-black uppercase rounded-xl transition-all cursor-pointer text-center text-xs disabled:opacity-50"
                >
                  {deliveringStatus ? 'Procesando...' : 'Confirmar Entrega'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
