import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Wrench, ArrowLeft, ChevronRight, ChevronLeft,
  Calendar, Clock, AlertCircle, ChevronDown, Download,
  Flame, Smartphone, Laptop, Gamepad2, Tablet, Cpu, MessageSquare, Trash2, Palette,
  Grid, List, CheckCircle, Info, DollarSign, X, RefreshCw, Eye, Sparkles, Image as ImageIcon, AlertTriangle, Filter, ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getBravoOrders, updateBravoOrderStatus } from '../../api/bravoOrders'
import { deleteRepair } from '../../api/repairs'
import { createQAInspection } from '../../api/bravoBlueprint'

import api from '../../api/client'
import BravoBackground from '../../components/bravo/BravoBackground'
import WhatsAppButton from '../../components/WhatsAppButton'
import { STATUS_CONFIG_BRAVO, STATUS_LABELS_BRAVO, STAGES_SEQUENCE, StatusBadge } from '../../utils/bravoStatusConfig'

const ALL_STATUSES = Object.keys(STATUS_CONFIG_BRAVO)

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-800 text-white hover:border-bravo-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
      >
        {loading ? (
          <span className="text-[10px] text-zinc-400 animate-pulse">Actualizando…</span>
        ) : (
          <>
            <span className="text-[10px] font-mono uppercase">Estado</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180 text-bravo-accent' : 'text-zinc-500'}`} />
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
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: menuPosition === 'top' ? 6 : -6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="bg-[#0e0e15] border border-bravo-border rounded-2xl p-1.5 min-w-[200px] shadow-2xl list-none fixed z-[99999]"
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
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        active 
                          ? 'bg-zinc-800 text-bravo-accent font-black' 
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
                      <span className="flex-1 text-left">{cfg.label}</span>
                      {active && <span className="text-[8px] text-bravo-accent uppercase tracking-widest font-black font-mono">actual</span>}
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
  if (type.includes('polera') || type.includes('t-shirt')) return '👕'
  if (type.includes('poleron') || type.includes('polerón') || type.includes('textil')) return '🧥'
  if (type.includes('tazon') || type.includes('tazón') || type.includes('taza') || type.includes('mug')) return '☕'
  if (type.includes('jockey') || type.includes('gorro') || type.includes('visera')) return '🧢'
  if (type.includes('botella') || type.includes('termo') || type.includes('vaso')) return '🍼'
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

  // Toast de solicitudes web en tiempo real
  const [toastNotification, setToastNotification] = useState(null)
  const prevPendingRepairsRef = useRef([])

  // QA Modal
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
      const params = { limit: 100 }
      if (statusFilter) params.status = statusFilter
      const res = await getBravoOrders(params)
      setRepairs(res.data)
      prevPendingRepairsRef.current = res.data.filter(r => r.status === 'pendiente')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepairs()

    const pollInterval = setInterval(async () => {
      try {
        const params = { limit: 100 }
        if (statusFilter) params.status = statusFilter
        const res = await getBravoOrders(params)
        
        const currentPendientes = res.data.filter(r => r.status === 'pendiente')
        const prevPendientes = prevPendingRepairsRef.current || []
        const newPendiente = currentPendientes.find(curr => !prevPendientes.some(prev => prev.id === curr.id))

        if (newPendiente) {
          setToastNotification({
            id: newPendiente.id,
            order_number: newPendiente.order_number,
            client_name: newPendiente.client?.name || 'Cliente General'
          })
          setTimeout(() => setToastNotification(null), 8000)
        }

        prevPendingRepairsRef.current = currentPendientes
        setRepairs(res.data)
      } catch (err) {
        console.error("Error polling bravo orders", err)
      }
    }, 15000)

    return () => clearInterval(pollInterval)
  }, [statusFilter])


  const handleDeleteRepair = async (repairId, orderNumber, e) => {
    e.stopPropagation()
    if (window.confirm(`¿Estás seguro de que deseas eliminar la orden Bravo ${orderNumber}? Si tenía insumos descontados, se restaurarán al stock.`)) {
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
    if (currentIndex === -1) currentIndex = 0
    
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

    // Actualización instantánea en pantalla
    const previousRepairs = [...repairs]
    setRepairs(prev => prev.map(r => r.id === repairId ? { ...r, status: newStatus } : r))

    try {
      await updateBravoOrderStatus(repairId, { new_status: newStatus })
    } catch (err) {

      // Revertir si ocurre un error o si se requiere checklist QA
      setRepairs(previousRepairs)
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
    const targetId = selectedRepairForDelivery.id
    const previousRepairs = [...repairs]

    // Actualización instantánea en pantalla
    setRepairs(prev => prev.map(r => r.id === targetId ? { ...r, status: 'entregado' } : r))
    setShowPaymentModal(false)
    setSelectedRepairForDelivery(null)

    try {
      await updateRepairStatus(targetId, {
        new_status: 'entregado',
        payment_amount: parseFloat(paymentAmount || 0),
        payment_method: paymentMethod
      })
    } catch (err) {
      setRepairs(previousRepairs)
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
    if (statusFilter === '' && r.status === 'pendiente') return false
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

  // Conteo dinámico de estados para los filtros
  const getStatusCount = (st) => repairs.filter(r => r.status === st).length

  const stats = {
    activas: repairs.filter(r => r.status !== 'entregado' && r.status !== 'cancelado' && r.status !== 'pendiente').length,
    listas: repairs.filter(r => r.status === 'listo').length,
    vencidas: repairs.filter(r => {
      if (r.status === 'entregado' || r.status === 'cancelado' || r.status === 'pendiente' || !r.estimated_delivery) return false
      return new Date(r.estimated_delivery + 'T00:00:00') < new Date().setHours(0,0,0,0)
    }).length
  }

  return (
    <div className="space-y-6 relative text-left pb-12">
      <BravoBackground />

      {/* Luces decorativas */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Notification Toast */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-amber-950 border border-amber-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-amber-200 cursor-pointer"
            onClick={() => { setStatusFilter('pendiente'); setToastNotification(null) }}
          >
            <Sparkles size={20} className="text-amber-400 animate-spin" />
            <div>
              <p className="font-extrabold text-xs text-white">¡Nueva solicitud web pendiente!</p>
              <p className="text-[10px] text-amber-300">Orden {toastNotification.order_number} · {toastNotification.client_name}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setToastNotification(null) }} className="p-1 hover:bg-white/10 rounded-lg text-amber-300">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bravo-border pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-bravo-accent/10 border border-bravo-accent/30 text-bravo-accent shadow-lg shadow-bravo-glow/10">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-bravo-accent via-amber-400 to-bravo-accent-warm bg-clip-text text-transparent uppercase tracking-wider font-mono">
                Órdenes de Trabajo
              </h1>
              <p className="text-bravo-text-muted text-xs mt-0.5">
                {repairs.length} proyectos registrados · Personalizaciones Bravo
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRepairs}
            title="Refrescar lista"
            className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-bravo-accent' : ''} />
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black cursor-pointer shadow-lg shadow-bravo-glow/20"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
            onClick={() => navigate('/bravo/orders/new')}
          >
            <Plus size={16} className="stroke-[3]" />
            Nueva Orden
          </motion.button>
        </div>
      </div>

      {/* KPI Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('')}
          className={`border rounded-2xl p-4.5 flex items-center justify-between bg-bravo-card/80 backdrop-blur-md cursor-pointer transition-all ${
            statusFilter === '' ? 'border-bravo-accent shadow-lg shadow-bravo-glow/10' : 'border-bravo-border/60 hover:border-bravo-accent/30'
          }`}
        >
          <div>
            <div className="text-2xl font-black text-bravo-accent font-mono">{stats.activas}</div>
            <div className="text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider mt-0.5">Proyectos Activos</div>
          </div>
          <div className="p-3 rounded-xl bg-bravo-accent/10 border border-bravo-accent/20 text-bravo-accent">
            <Sparkles size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('listo')}
          className={`border rounded-2xl p-4.5 flex items-center justify-between bg-bravo-card/80 backdrop-blur-md cursor-pointer transition-all ${
            statusFilter === 'listo' ? 'border-emerald-500 shadow-lg shadow-emerald-950/20' : 'border-bravo-border/60 hover:border-emerald-500/30'
          }`}
        >
          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats.listas}</div>
            <div className="text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider mt-0.5">Listas para Entrega</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400">
            <CheckCircle size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('')}
          className={`border rounded-2xl p-4.5 flex items-center justify-between bg-bravo-card/80 backdrop-blur-md cursor-pointer transition-all ${
            stats.vencidas > 0 ? 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20' : 'border-bravo-border/60'
          }`}
        >
          <div>
            <div className={`text-2xl font-black font-mono ${stats.vencidas > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>{stats.vencidas}</div>
            <div className="text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider mt-0.5">Entregas Atrasadas</div>
          </div>
          <div className={`p-3 rounded-xl border ${stats.vencidas > 0 ? 'bg-rose-950/60 border-rose-500/30 text-rose-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
            <AlertTriangle size={20} />
          </div>
        </motion.div>
      </div>

      {/* Search & Filters Bar */}
      <div className="space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/30 focus:border-bravo-accent/60 focus:outline-none rounded-2xl pl-11 pr-10 py-3 text-xs text-white transition-all placeholder-stone-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por n° orden, cliente, diseño, prenda..."
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-lg">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Switcher Vista */}
          <div className="flex bg-zinc-950 border border-zinc-800 rounded-2xl p-1 shrink-0 self-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-bravo-accent text-black shadow-md font-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid size={13} /> Tarjetas
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-bravo-accent text-black shadow-md font-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List size={13} /> Tabla
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 select-none pt-1">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === '' 
                ? 'bg-bravo-accent text-black border-bravo-accent font-black shadow-md' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            Todas ({repairs.filter(r => r.status !== 'pendiente').length})
          </button>
          {ALL_STATUSES.map(s => {
            const active = statusFilter === s
            const cfg = STATUS_CONFIG_BRAVO[s]
            const count = getStatusCount(s)
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(active ? '' : s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  active 
                    ? 'bg-bravo-accent/15 border-bravo-accent text-bravo-accent font-black shadow-md' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                <span>{cfg.label.replace(' 🚨', '')}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-black ${
                    s === 'pendiente' ? 'bg-rose-500 text-white animate-pulse' : 'bg-black/40 text-zinc-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Grid / Table Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-56 w-full bg-bravo-card border border-bravo-border/40 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-bravo-card/40 border border-bravo-border rounded-3xl relative z-10">
          <Wrench size={36} className="mx-auto text-zinc-600 mb-3 opacity-50" />
          <p className="text-zinc-400 text-sm font-semibold font-mono">No se encontraron órdenes con los filtros seleccionados.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISTA DE TARJETAS MEJORADA */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {filtered.map((repair, i) => {
            const isCrit = repair.status === 'critico'
            const cost = parseFloat(repair.repair_cost || 0)
            const deposit = parseFloat(repair.deposit || 0)
            const balance = cost - deposit
            const percentPaid = cost > 0 ? Math.min(100, Math.round((deposit / cost) * 100)) : 0
            const fullyPaid = balance <= 0

            // Urgencia de fecha
            let isOverdue = false
            if (repair.estimated_delivery && repair.status !== 'entregado' && repair.status !== 'cancelado') {
              isOverdue = new Date(repair.estimated_delivery + 'T00:00:00') < new Date().setHours(0,0,0,0)
            }

            return (
              <motion.div
                key={repair.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                whileHover={{ y: -4, boxShadow: '0 12px 28px -10px rgba(245, 158, 11, 0.15)' }}
                onClick={() => navigate(`/bravo/orders/${repair.id}`)}
                className={`relative bg-bravo-card border rounded-3xl p-5 flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 shadow-xl ${
                  isCrit ? 'border-rose-500/50 bg-rose-950/10 shadow-rose-950/20' : 
                  isOverdue ? 'border-rose-500/30' : 'border-bravo-border hover:border-bravo-accent/40'
                }`}
              >
                {/* Borde neón lateral */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-[4px]" 
                  style={{ background: STATUS_CONFIG_BRAVO[repair.status]?.dot || '#f59e0b' }}
                />

                <div className="space-y-3.5">
                  {/* Fila 1: N° Orden + Boceto Miniatura + Badge Estado */}
                  <div className="flex items-start justify-between gap-3 pl-1">
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-black text-bravo-accent">
                        {repair.order_number}
                        {repair.is_split_child && (
                          <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-bravo-accent rounded-md text-[8px] font-black uppercase font-mono">Parcial</span>
                        )}
                        {isCrit && <Flame size={13} className="text-rose-500 animate-bounce" />}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        {new Date(repair.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    <StatusBadge status={repair.status} />
                  </div>

                  {/* Thumbnail del diseño o mockup si existe */}
                  {(repair.mockup_file_url || repair.design_file_url) && (
                    <div className="w-full h-24 rounded-2xl overflow-hidden border border-zinc-800 bg-black relative group/img">
                      <img
                        src={
                          (repair.mockup_file_url || repair.design_file_url).startsWith('http')
                            ? (repair.mockup_file_url || repair.design_file_url)
                            : `${api.defaults.baseURL}${repair.mockup_file_url || repair.design_file_url}`
                        }
                        alt="Previsualización"
                        className="w-full h-full object-cover opacity-85 group-hover/img:opacity-100 group-hover/img:scale-105 transition-all duration-300"
                      />
                      <div className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-lg border border-zinc-800 flex items-center gap-1">
                        <ImageIcon size={11} className="text-bravo-accent" />
                        {repair.mockup_file_url && <span className="text-[9px] font-mono text-amber-400 font-bold">3D</span>}
                      </div>
                    </div>
                  )}

                  {/* Detalle Producto & Cliente */}
                  <div className="space-y-1 text-left pl-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg select-none shrink-0">{getDeviceIcon(repair.device_type)}</span>
                      <span className="text-white text-xs font-black capitalize truncate">
                        {repair.model || `${repair.device_type} ${repair.brand}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate pl-7">
                      👤 {repair.client?.name || 'Cliente sin nombre'}
                    </p>
                  </div>

                  {/* Badges de Técnica y Ubicación */}
                  {(repair.print_technique || repair.print_location) && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {repair.print_technique && (
                        <span className="px-2.5 py-0.5 bg-zinc-900 text-[9px] font-black text-bravo-accent rounded-lg border border-zinc-800 uppercase tracking-wider font-mono">
                          {repair.print_technique}
                        </span>
                      )}
                      {repair.print_location && (
                        <span className="px-2 py-0.5 bg-zinc-900/60 text-[9px] font-semibold text-zinc-400 rounded-lg border border-zinc-800 uppercase">
                          {repair.print_location}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Cobros y Finanzas */}
                  <div className="pt-3 border-t border-zinc-800/60 space-y-1.5 pl-1">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-500 text-[11px]">Total: <strong className="text-white font-black">${cost.toLocaleString('es-CL')}</strong></span>
                      <span className={fullyPaid ? 'text-emerald-400 font-black text-[10px]' : 'text-amber-400 font-bold text-[10px]'}>
                        {fullyPaid ? '✅ Pagado' : `$${balance.toLocaleString('es-CL')} pend.`}
                      </span>
                    </div>

                    {/* Barra de progreso de pago */}
                    <div className="w-full h-1.5 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${fullyPaid ? 'bg-emerald-500' : percentPaid > 50 ? 'bg-amber-400' : 'bg-orange-500'}`}
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>

                    {/* Fecha de Entrega */}
                    <div className="flex justify-between items-center text-[10px] pt-1 font-mono">
                      <span className="text-zinc-500">Entrega:</span>
                      {repair.estimated_delivery ? (
                        <span className={`flex items-center gap-1 font-bold ${isOverdue ? 'text-rose-400 animate-pulse' : 'text-zinc-300'}`}>
                          {isOverdue ? <AlertTriangle size={10} /> : <Calendar size={10} />}
                          {new Date(repair.estimated_delivery + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : (
                        <span className="text-zinc-600">Sin fecha</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/60 pl-1">
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-800 rounded-2xl" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleStepStatus(repair.id, repair.status, 'prev')}
                      disabled={STAGES_SEQUENCE.indexOf(repair.status) <= 0}
                      className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-bravo-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      title="Retroceder Estado"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />

                    <button
                      type="button"
                      onClick={() => handleStepStatus(repair.id, repair.status, 'next')}
                      disabled={STAGES_SEQUENCE.indexOf(repair.status) === -1 || STAGES_SEQUENCE.indexOf(repair.status) >= STAGES_SEQUENCE.length - 1}
                      className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-bravo-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      title="Avanzar Estado"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {repair.client && (
                      <div onClick={e => e.stopPropagation()}>
                        <WhatsAppButton 
                          client={repair.client} 
                          repair={repair} 
                          isBravo={true}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      className="p-2 border border-rose-500/30 bg-rose-950/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl cursor-pointer transition-all"
                      onClick={(e) => handleDeleteRepair(repair.id, repair.order_number, e)}
                      title="Eliminar Orden"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* VISTA DE TABLA MODERNA */
        <div className="overflow-x-auto bg-bravo-card border border-bravo-border rounded-3xl p-4 shadow-xl bravo-scrollbar relative z-10">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-bravo-border/60 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">Detalle / Producto</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Entrega</th>
                <th className="py-3 px-4 text-right">Costo / Saldo</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-xs">
              {filtered.map((repair) => {
                const cost = parseFloat(repair.repair_cost || 0)
                const deposit = parseFloat(repair.deposit || 0)
                const balance = cost - deposit
                const fullyPaid = balance <= 0

                return (
                  <tr 
                    key={repair.id} 
                    onClick={() => navigate(`/bravo/orders/${repair.id}`)}
                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-bravo-accent">
                      {repair.order_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getDeviceIcon(repair.device_type)}</span>
                        <div>
                          <p className="font-bold text-white capitalize">{repair.model || `${repair.device_type} ${repair.brand}`}</p>
                          {repair.print_technique && (
                            <span className="text-[9px] text-zinc-500 font-mono uppercase">{repair.print_technique}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-300">
                      {repair.client?.name || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <StatusBadge status={repair.status} />
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-xs text-zinc-400">
                      {repair.estimated_delivery ? new Date(repair.estimated_delivery + 'T00:00:00').toLocaleDateString('es-CL') : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      <span className="font-black text-white">${cost.toLocaleString('es-CL')}</span>
                      <p className={`text-[10px] ${fullyPaid ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                        {fullyPaid ? 'Pagado' : `$${balance.toLocaleString('es-CL')} pend.`}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {repair.client && (
                          <WhatsAppButton 
                            client={repair.client} 
                            repair={repair} 
                            isBravo={true}
                          />
                        )}
                        <button
                          type="button"
                          className="p-1.5 border border-rose-500/30 bg-rose-950/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl cursor-pointer transition-all"
                          onClick={(e) => handleDeleteRepair(repair.id, repair.order_number, e)}
                          title="Eliminar Orden"
                        >
                          <Trash2 size={13} />
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

      {/* MODAL COBRO ENTREGA */}
      <AnimatePresence>
        {showPaymentModal && selectedRepairForDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e15] border border-bravo-border p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-5 text-left relative"
            >
              <div className="flex justify-between items-center border-b border-bravo-border/40 pb-4">
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-400" />
                    Cobro de Entrega
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Orden {selectedRepairForDelivery.order_number}</p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#101017] border border-bravo-border/40 p-4 rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Total:</span>
                  <span className="font-bold text-white">${parseFloat(selectedRepairForDelivery.repair_cost || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Abono Registrado:</span>
                  <span className="font-bold text-emerald-400">-${parseFloat(selectedRepairForDelivery.deposit || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-2 font-bold text-sm">
                  <span className="text-zinc-300">Saldo Pendiente:</span>
                  <span className="text-amber-400">
                    ${(parseFloat(selectedRepairForDelivery.repair_cost || 0) - parseFloat(selectedRepairForDelivery.deposit || 0)).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Monto a Cobrar ($)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2.5 px-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-bravo-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Medio de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">📲 Transferencia</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleDeliverConfirm}
                  disabled={deliveringStatus}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={16} /> Confirmar Cobro y Entregar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CHECKLIST QA CONTROL DE CALIDAD */}
      <AnimatePresence>
        {showQAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e15] border border-bravo-border p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-5 text-left relative"
            >
              <div className="flex justify-between items-center border-b border-bravo-border/40 pb-4">
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <ShieldCheck size={18} className="text-bravo-accent" />
                    Control de Calidad (QA)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Verificación previa para pasar a 'Listo'</p>
                </div>
                <button onClick={() => setShowQAModal(false)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitQA} className="space-y-4">
                <div className="space-y-2 bg-zinc-950 p-4 border border-zinc-800 rounded-2xl">
                  {[
                    { key: 'hilos_cortados', label: '✂️ Hilos cortados y terminación limpia' },
                    { key: 'sin_manchas', label: '🧼 Sin manchas de tinta o manipulación' },
                    { key: 'curado_temperatura', label: '🔥 Curado y fijado térmico verificado' },
                    { key: 'empaque_correcto', label: '📦 Empaque y etiqueta listos' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-zinc-900 rounded-xl transition-colors">
                      <input
                        type="checkbox"
                        checked={qaChecklist[item.key]}
                        onChange={e => setQaChecklist({ ...qaChecklist, [item.key]: e.target.checked })}
                        className="w-4 h-4 accent-bravo-accent rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white">{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 block uppercase font-bold">Observaciones del Inspector (Opcional)</label>
                  <textarea
                    rows={2}
                    value={qaComments}
                    onChange={e => setQaComments(e.target.value)}
                    placeholder="Detalles sobre inspección técnica..."
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-bravo-accent hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Aprobar QA y Pasar a 'Listo'
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
