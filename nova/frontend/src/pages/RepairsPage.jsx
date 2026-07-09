import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Wrench, ArrowLeft, ChevronRight,
  Calendar, Clock, AlertCircle, ChevronDown, Download,
  Flame, Smartphone, Laptop, Gamepad2, Tablet, Cpu, MessageSquare, Trash2, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, getRepair, updateRepairStatus, deleteRepair } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'
import { generateRepairPDF } from '../utils/generateRepairPDF'
import WhatsAppButton from '../components/WhatsAppButton'

const STATUS_CONFIG = {
  pendiente:           { label: 'Pendiente Web ⏳',     dot: '#fbbf24', badge: 'bg-amber-500/10 border-amber-500/25 text-amber-400 animate-pulse' },
  recibido:            { label: 'Recibido',            dot: 'var(--color-blue-400)', badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  diagnostico:         { label: 'Diagnóstico',          dot: 'var(--color-yellow-450)', badge: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400' },
  esperando_repuesto:  { label: 'Espera Repuesto',      dot: 'var(--color-orange-450)', badge: 'bg-orange-500/10 border-orange-500/25 text-orange-400' },
  presupuesto_enviado: { label: 'Pto. Enviado',         dot: 'var(--color-purple-400)', badge: 'bg-purple-500/10 border-purple-500/25 text-purple-400' },
  en_reparacion:       { label: 'En reparación',        dot: 'var(--color-cyan-400)', badge: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400' },
  listo:               { label: 'Listo',                dot: 'var(--color-emerald-450)', badge: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' },
  entregado:           { label: 'Entregado',            dot: 'var(--color-gray-550)', badge: 'bg-gray-500/10 border-gray-500/20 text-gray-550' },
  cancelado:           { label: 'Cancelado',            dot: 'var(--color-rose-455)', badge: 'bg-red-500/10 border-red-500/20 text-red-450' },
  critico:             { label: 'Crítico 🚨',           dot: 'var(--color-rose-455)', badge: 'bg-rose-500/20 border-rose-500/40 text-rose-450 font-black animate-pulse shadow-[inset_0_0_6px_rgba(244,63,94,0.15)]' },
  en_garantia:         { label: 'En Garantía',          dot: '#ec4899', badge: 'bg-pink-500/10 border-pink-500/25 text-pink-400 font-bold' },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.recibido
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${cfg.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 8px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  )
}

function StatusDropdown({ repair, onUpdate }) {
  const [open, setOpen]       = useState(false)
  const [menuPosition, setMenuPosition] = useState('bottom')
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const row = ref.current.closest('.repair-row')
    if (row) {
      if (open) {
        row.style.position = 'relative'
        row.style.zIndex = '50'
      } else {
        row.style.position = ''
        row.style.zIndex = ''
      }
    }
  }, [open])

  const handleChange = (newStatus) => {
    if (newStatus === repair.status) { setOpen(false); return }
    setOpen(false)
    onUpdate(repair, newStatus)
  }

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 260) {
        setMenuPosition('top')
      } else {
        setMenuPosition('bottom')
      }
    }
    setOpen(o => !o)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900/60 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
      >
        <span className="text-[11px]">Estado</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: menuPosition === 'top' ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit=   {{ opacity: 0, y: menuPosition === 'top' ? 6 : -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 z-50 bg-[#0c0d12] border border-gray-850 rounded-xl p-1.5 min-w-[190px] shadow-[0_15px_35px_rgba(0,0,0,0.8)] list-none"
              style={
                menuPosition === 'top'
                  ? { bottom: 'calc(100% + 6px)', top: 'auto' }
                  : { top: 'calc(100% + 6px)', bottom: 'auto' }
              }
            >
              {ALL_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                const active = s === repair.status
                return (
                  <li
                    key={s}
                    role="option"
                    aria-selected={active}
                    onClick={() => handleChange(s)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                      active 
                        ? 'bg-gray-900/80 text-gray-400 cursor-default font-semibold' 
                        : 'text-gray-455 hover:bg-gray-800/40 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
                    <span className="flex-1 text-left">{cfg.label}</span>
                    {active && <span className="text-[9px] text-cyan-500 uppercase tracking-widest font-bold">actual</span>}
                  </li>
                )
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function getDeviceIcon(deviceType) {
  const type = (deviceType || '').toLowerCase()
  if (type.includes('celular') || type.includes('telefono') || type.includes('iphone') || type. Teléfono) {
    return <Smartphone size={14} className="text-cyan-400" />
  }
  if (type.includes('notebook') || type.includes('computador') || type.includes('laptop') || type.includes('macbook')) {
    return <Laptop size={14} className="text-purple-400" />
  }
  if (type.includes('consola') || type.includes('playstation') || type.includes('xbox') || type.includes('nintendo') || type.includes('switch')) {
    return <Gamepad2 size={14} className="text-rose-455" />
  }
  if (type.includes('tablet') || type.includes('ipad')) {
    return <Tablet size={14} className="text-emerald-450" />
  }
  return <Cpu size={14} className="text-gray-500" />
}

export default function RepairsPage() {
  const navigate = useNavigate()
  const [repairs,      setRepairs]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRepairForStatusChange, setSelectedRepairForStatusChange] = useState(null)
  const [newStatusSelected, setNewStatusSelected] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)
  const [loadedHistories, setLoadedHistories] = useState({})
  const [loadingHistoryId, setLoadingHistoryId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [deliveringStatus, setDeliveringStatus] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    setVisibleCount(10)
  }, [statusFilter, search])

  const handleDeleteRepair = async (repairId, orderNumber, e) => {
    e.stopPropagation()
    if (window.confirm(`¿Estás seguro de que deseas eliminar la orden de reparación ${orderNumber}? Esta acción no se puede deshacer y eliminará todo su historial.`)) {
      try {
        await deleteRepair(repairId)
        await fetchRepairs()
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al eliminar la reparación.')
      }
    }
  }

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const params = { system: 'nova' }
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

  const handleStatusUpdate = (repair, newStatus) => {
    setSelectedRepairForStatusChange(repair)
    setNewStatusSelected(newStatus)
    setStatusNote('')
    if (newStatus === 'entregado') {
      const cost = parseFloat(repair.repair_cost || 0)
      const dep = parseFloat(repair.deposit || 0)
      setPaymentAmount(Math.max(0, cost - dep).toString())
      setPaymentMethod('efectivo')
    } else {
      setPaymentAmount('')
      setPaymentMethod('efectivo')
    }
  }

  const handleToggleHistory = async (repairId, e) => {
    e.stopPropagation()
    if (expandedHistoryId === repairId) {
      setExpandedHistoryId(null)
      return
    }
    setExpandedHistoryId(repairId)
    if (!loadedHistories[repairId]) {
      setLoadingHistoryId(repairId)
      try {
        const res = await getRepair(repairId)
        setLoadedHistories(prev => ({ ...prev, [repairId]: res.data.history || [] }))
      } catch (err) {
        console.error('Error al cargar historial:', err)
      } finally {
        setLoadingHistoryId(null)
      }
    }
  }

  const filtered = repairs.filter(r => {
    // Si no hay filtro de estado seleccionado, mostramos solo las activas (excluyendo entregadas, canceladas y pendientes web)
    if (!statusFilter && ['entregado', 'cancelado', 'pendiente'].includes(r.status)) {
      return false
    }
    // Si hay un filtro seleccionado, debe coincidir
    if (statusFilter && r.status !== statusFilter) {
      return false
    }
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
    activas: repairs.filter(r => r.status !== 'entregado' && r.status !== 'cancelado' && r.status !== 'listo' && r.status !== 'pendiente').length,
    listas: repairs.filter(r => r.status === 'listo').length,
    vencidas: repairs.filter(r => {
      if (r.status === 'entregado' || r.status === 'cancelado' || r.status === 'pendiente' || !r.estimated_delivery) return false
      return new Date(r.estimated_delivery) < new Date().setHours(0,0,0,0)
    }).length
  }

  return (
    <>
      <style>{`
        @keyframes gradient-border {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animated-border-flow {
          position: relative;
        }
        .animated-border-flow::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(90deg, #f43f5e, #f97316, #ef4444, #f43f5e);
          background-size: 300% 300%;
          border-radius: 17px;
          z-index: -1;
          animation: gradient-border 3s ease infinite;
          opacity: 0.85;
          filter: blur(1.5px);
        }

        @keyframes pulse-critical-glow {
          0%, 100% {
            box-shadow: 0 0 12px rgba(244,63,94,0.15);
          }
          50% {
            box-shadow: 0 0 25px rgba(244,63,94,0.4);
          }
        }
        .critical-glow-pulse {
          animation: pulse-critical-glow 2s infinite ease-in-out;
        }

        /* Desvanecimiento de scrollbars */
        .custom-scroll::-webkit-scrollbar {
          height: 3px;
          width: 3px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9px;
        }
      `}</style>

      {/* Page shell */}
      <div className="min-h-screen bg-[#050508] text-[#f1f5f9] relative overflow-hidden flex flex-col">
        <AnimatedBackground />
        
        {/* Glow ambient blobs */}
        <div className="fixed top-0 left-1/4 w-[380px] h-[380px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[380px] h-[380px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Navbar */}
        <nav className="relative z-10 border-b border-gray-900/40 backdrop-blur-xl bg-gray-950/40 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                className="w-9 h-9 border border-gray-800/60 rounded-xl bg-gray-950/40 text-gray-400 hover:text-white hover:border-gray-700/80 flex items-center justify-center cursor-pointer transition-all" 
                onClick={() => navigate('/')} 
                aria-label="Volver al inicio"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="text-left">
                <h1 className="text-sm font-extrabold tracking-widest text-gray-300 uppercase leading-none">
                  Gestión de Reparaciones
                </h1>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5 font-semibold">
                  {repairs.length} órdenes registradas
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] cursor-pointer"
              onClick={() => navigate('/repairs/new')}
            >
              <Plus size={14} className="stroke-[3]" />
              Nueva Reparación
            </motion.button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 max-w-6xl mx-auto px-6 py-8 w-full flex-1 flex flex-col">
          
          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {[
              { label: 'Órdenes Activas', value: stats.activas,  color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.06)]' },
              { label: 'Listas para Retiro', value: stats.listas,   color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.06)]' },
              { label: 'Entregas Vencidas', value: stats.vencidas, color: 'text-rose-400 bg-rose-500/5 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.06)]' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="border rounded-2xl p-5 flex flex-col items-start justify-between relative overflow-hidden bg-gray-900/20 backdrop-blur-sm transition-all hover:translate-y-[-2px]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className={`text-3xl font-extrabold ${s.color.split(' ')[0]}`}>{s.value}</div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-2">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Controls Bar: Search & Pills */}
          <motion.div
            className="flex flex-col gap-4 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="w-full bg-gray-900/40 border border-gray-800 hover:border-gray-700/80 focus:border-cyan-500/50 focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-200 transition-all placeholder-gray-500 backdrop-blur-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por orden, cliente, marca, modelo..."
              />
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-2 select-none w-full">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  statusFilter === '' 
                    ? 'bg-cyan-500/10 border-cyan-500/45 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.12)]' 
                    : 'bg-transparent border-gray-900 text-gray-500 hover:text-gray-400 hover:border-gray-800'
                }`}
              >
                Activas
              </button>
              {ALL_STATUSES.map(s => {
                const active = statusFilter === s
                const cfg = STATUS_CONFIG[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(active ? '' : s)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                      active 
                        ? 'bg-cyan-500/10 border-cyan-500/45 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.12)]' 
                        : 'bg-transparent border-gray-900 text-gray-550 hover:text-gray-455 hover:border-gray-800'
                    }`}
                  >
                    {cfg.label.replace(' 🚨', '')}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Main List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 4].map(i => (
                <div key={i} className="h-20 w-full bg-gray-900/25 border border-gray-850/30 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div 
              className="text-center py-20 bg-gray-900/10 border border-gray-850/40 rounded-3xl" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
            >
              <Wrench size={28} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm font-semibold">No se encontraron reparaciones registradas</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, visibleCount).map((repair, i) => {
                const isCrit = repair.status === 'critico'
                const balance = repair.repair_cost && repair.deposit
                  ? repair.repair_cost - repair.deposit
                  : 0
                return (
                  <motion.div
                    key={repair.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit=   {{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03, duration: 0.25, ease: 'easeOut' }}
                    onClick={() => navigate(`/repairs/${repair.id}`)}
                    className={`repair-row relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-visible ${
                      isCrit 
                        ? 'animated-border-flow critical-glow-pulse' 
                        : 'repair-item-glow border-gray-900 hover:border-gray-800'
                    }`}
                  >
                    {/* Indicador de borde neón izquierdo para celdas normales */}
                    {!isCrit && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" 
                        style={{ 
                          background: STATUS_CONFIG[repair.status]?.dot || '#64748b', 
                          boxShadow: `0 0 10px ${STATUS_CONFIG[repair.status]?.dot || '#64748b'}` 
                        }} 
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-5">
                      {/* Col 1: Orden */}
                      <div className="col-span-1 md:col-span-2 text-left flex md:block items-center justify-between">
                        <div>
                          <div className="font-mono text-xs font-black text-cyan-400 flex items-center gap-1.5">
                            {repair.order_number}
                            {isCrit && <Flame size={12} className="text-rose-500 animate-bounce" />}
                          </div>
                          <div className="text-[10px] text-gray-550 mt-1">
                            {new Date(repair.created_at).toLocaleDateString('es-CL')}
                          </div>
                        </div>
                        <div className="md:hidden">
                          <StatusBadge status={repair.status} />
                        </div>
                      </div>

                      {/* Col 2: Dispositivo & Cliente */}
                      <div className="col-span-1 md:col-span-3 text-left">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(repair.device_type)}
                          <span className="text-gray-200 text-xs font-bold truncate">{repair.brand} {repair.model}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[340px] mt-1">
                          {repair.client 
                            ? `Cliente: ${repair.client.name}` 
                            : `Falla: ${repair.reported_issue || 'No especificada'}`
                          }
                        </div>
                      </div>

                      {/* Col 3: Estado Selector / Dropdown Directo (Desktop) */}
                      <div className="col-span-1 md:col-span-2 hidden md:flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />
                      </div>

                      {/* Col 4: Entrega badge */}
                      <div className="col-span-1 md:col-span-2 text-left md:text-center flex md:block justify-between items-center text-xs">
                        <span className="md:hidden text-gray-500 text-[10px] font-bold uppercase tracking-wider">Plazo</span>
                        {repair.estimated_delivery ? (
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            new Date(repair.estimated_delivery) < new Date().setHours(0,0,0,0) && repair.status !== 'entregado'
                              ? 'text-rose-450 font-bold'
                              : 'text-gray-400'
                          }`}>
                            <Calendar size={11} />
                            {new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-gray-600 italic text-[11px]">Por definir</span>
                        )}
                      </div>

                      {/* Col 5: Montos */}
                      <div className="col-span-1 md:col-span-2 text-left md:text-right flex md:block justify-between items-center text-xs">
                        <span className="md:hidden text-gray-500 text-[10px] font-bold uppercase tracking-wider">Costo / Saldo</span>
                        <div>
                          <div className="font-extrabold text-gray-200">${Number(repair.repair_cost || 0).toLocaleString('es-CL')}</div>
                          {balance > 0 ? (
                            <div className="text-[9px] text-orange-400 font-bold mt-0.5">Pendiente: ${balance.toLocaleString('es-CL')}</div>
                          ) : (
                            <div className="text-[9px] text-emerald-450 font-bold mt-0.5">Pagado</div>
                          )}
                        </div>
                      </div>

                      {/* Col 6: WhatsApp & PDF */}
                      <div className="col-span-1 md:col-span-1 flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        {repair.client && (
                          <WhatsAppButton 
                            phone={repair.client.phone} 
                            clientName={repair.client.name} 
                            orderNumber={repair.order_number} 
                            status={repair.status}
                            deviceLabel={`${repair.device_type} ${repair.brand} ${repair.model}`}
                            isBravo={false}
                          />
                        )}
                        <button 
                          className={`p-2 border rounded-xl bg-gray-950/40 cursor-pointer transition-colors relative group ${
                            expandedHistoryId === repair.id
                              ? 'border-cyan-500/40 text-cyan-400 font-bold bg-cyan-950/20'
                              : 'border-gray-850 hover:border-cyan-500/30 text-gray-455 hover:text-cyan-400'
                          }`}
                          onClick={(e) => handleToggleHistory(repair.id, e)}
                          title="Ver Comentarios e Historial"
                        >
                          {loadingHistoryId === repair.id ? (
                            <div className="w-3.5 h-3.5 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                          ) : (
                            <MessageSquare size={14} />
                          )}
                        </button>
                        <button 
                          className="p-2 border border-gray-850 hover:border-cyan-500/40 rounded-xl bg-gray-950/40 text-gray-455 hover:text-cyan-400 cursor-pointer transition-colors"
                          onClick={() => navigate(`/repairs/${repair.id}`)}
                          title="Ver Detalles"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Timeline expandible */}
                    {expandedHistoryId === repair.id && (
                      <div 
                        className="border-t border-gray-900/60 p-5 bg-gray-950/20 text-left space-y-4 relative z-10"
                        onClick={e => e.stopPropagation()}
                      >
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 select-none">
                          <Clock size={12} className="animate-pulse" />
                          Historial y Comentarios
                        </h4>
                        
                        {loadingHistoryId === repair.id ? (
                          <div className="flex items-center gap-2 py-2">
                            <div className="w-3.5 h-3.5 border border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                            <span className="text-xs text-gray-550">Cargando comentarios...</span>
                          </div>
                        ) : !loadedHistories[repair.id] || loadedHistories[repair.id].length === 0 ? (
                          <p className="text-xs text-gray-650 italic">Sin comentarios ni cambios de estado registrados.</p>
                        ) : (
                          <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-[1px] before:bg-gray-800/80">
                            {[...loadedHistories[repair.id]].reverse().map((h) => {
                              const hCfg = STATUS_CONFIG[h.new_status]
                              const from = STATUS_CONFIG[h.previous_status]
                              return (
                                <div key={h.id} className="relative text-left space-y-1">
                                  <span
                                    className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full border border-gray-950"
                                    style={{
                                      backgroundColor: hCfg?.dot || '#64748b',
                                      boxShadow: `0 0 6px ${hCfg?.dot || '#64748b'}`
                                    }}
                                  />
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {from && (
                                        <>
                                          <span className="text-[9px] text-gray-550">{from.label}</span>
                                          <span className="text-[8px] text-gray-600">→</span>
                                        </>
                                      )}
                                      <span className="text-[10px] font-bold" style={{ color: hCfg?.dot }}>{hCfg?.label}</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-gray-555 font-semibold">
                                      {new Date(h.changed_at).toLocaleDateString('es-CL', {
                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  {h.note && (
                                    <p className="text-[11px] p-2.5 rounded-xl border border-gray-900 bg-gray-950/60 text-gray-450 leading-normal font-sans">
                                      {h.note}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}

          {filtered.length > visibleCount && (
            <div className="flex justify-center pt-6 pb-8">
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="px-6 py-2.5 rounded-xl border border-gray-850 bg-gray-900/45 text-xs font-bold text-gray-450 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>Cargar más reparaciones</span>
                <span className="bg-gray-950/80 px-2 py-0.5 rounded-full text-[10px] text-gray-600 font-mono font-bold">
                  {filtered.length - visibleCount} restantes
                </span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Actualización con Comentarios y Pago */}
      <AnimatePresence>
        {selectedRepairForStatusChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e111a]/95 border border-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white space-y-6 text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-cyan-400 flex items-center gap-2">
                    <Wrench size={18} />
                    Actualizar Estado: {selectedRepairForStatusChange.order_number}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Dispositivo: <span className="text-gray-300 font-bold">{selectedRepairForStatusChange.brand} {selectedRepairForStatusChange.model}</span> | Cliente: <span className="text-gray-300 font-bold">{selectedRepairForStatusChange.client?.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRepairForStatusChange(null)}
                  className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-900 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Selector Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Seleccionar Nuevo Estado
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ALL_STATUSES.map(s => {
                    const c = STATUS_CONFIG[s]
                    const selected = newStatusSelected === s
                    const current  = s === selectedRepairForStatusChange.status
                    return (
                      <button
                        key={s}
                        disabled={current}
                        onClick={() => {
                          setNewStatusSelected(s)
                          if (s === 'entregado') {
                            const cost = parseFloat(selectedRepairForStatusChange.repair_cost || 0)
                            const dep = parseFloat(selectedRepairForStatusChange.deposit || 0)
                            setPaymentAmount(Math.max(0, cost - dep).toString())
                            setPaymentMethod('efectivo')
                          }
                        }}
                        className={`px-2 py-2.5 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer ${
                          selected
                            ? 'scale-102 border-cyan-500/40 text-cyan-400 shadow-md'
                            : current
                              ? 'opacity-30 cursor-not-allowed border-gray-950 bg-gray-950/20 text-gray-655'
                              : 'border-gray-900 bg-gray-950/40 text-gray-500 hover:border-gray-800 hover:text-gray-300'
                        }`}
                        style={selected ? {
                          backgroundColor: `color-mix(in srgb, ${c.dot} 10%, transparent)`,
                          borderColor: `color-mix(in srgb, ${c.dot} 40%, transparent)`,
                          color: c.dot,
                          boxShadow: `0 0 10px color-mix(in srgb, ${c.dot} 15%, transparent)`
                        } : {}}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Note / Comment Text Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Comentario del cambio de estado
                </label>
                <textarea
                  className="w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all resize-none placeholder-gray-700 font-sans"
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="Escribe el motivo o detalle de esta actualización de estado (opcional)..."
                  rows={2}
                />
              </div>

              {/* Conditional Payment Fields for 'entregado' status */}
              <AnimatePresence>
                {newStatusSelected === 'entregado' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4 border-t border-gray-900/60 overflow-hidden"
                  >
                    <div className="bg-gray-950/50 p-4 rounded-xl space-y-2 text-xs border border-gray-900">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Costo Total:</span>
                        <span className="font-bold">${parseFloat(selectedRepairForStatusChange.repair_cost || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Abono recibido:</span>
                        <span className="font-bold text-green-500">${parseFloat(selectedRepairForStatusChange.deposit || 0).toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-900 pt-2 flex justify-between font-extrabold">
                        <span>Monto sugerido a pagar:</span>
                        <span className="text-cyan-400">
                          ${Math.max(0, parseFloat(selectedRepairForStatusChange.repair_cost || 0) - parseFloat(selectedRepairForStatusChange.deposit || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[11px] font-bold uppercase tracking-wider opacity-85">Monto Pagado ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all"
                          placeholder="Monto cobrado"
                        />
                      </div>
                      
                      <div className="space-y-1.5 text-left">
                        <label className="text-[11px] font-bold uppercase tracking-wider opacity-85">Método de Pago</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-gray-950/80 border border-gray-850 focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all cursor-pointer"
                        >
                          <option value="efectivo">Efectivo 💵</option>
                          <option value="transferencia">Transferencia Bancaria 🏦</option>
                          <option value="tarjeta_debito">Tarjeta de Débito 💳</option>
                          <option value="tarjeta_credito">Tarjeta de Crédito 💳</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-900/60">
                <button
                  onClick={() => setSelectedRepairForStatusChange(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-950/60 border border-gray-850 text-gray-400 hover:text-white cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setDeliveringStatus(true)
                    try {
                      const payload = {
                        new_status: newStatusSelected,
                        note: statusNote || null
                      }
                      if (newStatusSelected === 'entregado') {
                        payload.payment_amount = parseFloat(paymentAmount || 0)
                        payload.payment_method = paymentMethod
                      }
                      await updateRepairStatus(selectedRepairForStatusChange.id, payload)
                      
                      // Update list locally
                      setRepairs(prev => prev.map(r => r.id === selectedRepairForStatusChange.id ? { ...r, status: newStatusSelected } : r))
                      
                      // Update loadedHistories if it is open
                      if (loadedHistories[selectedRepairForStatusChange.id]) {
                        const updatedRes = await getRepair(selectedRepairForStatusChange.id)
                        setLoadedHistories(prev => ({ ...prev, [selectedRepairForStatusChange.id]: updatedRes.data.history || [] }))
                      }
                      
                      setSelectedRepairForStatusChange(null)
                    } catch (err) {
                      alert(err.response?.data?.detail || 'Error al actualizar el estado.')
                    } finally {
                      setDeliveringStatus(false)
                    }
                  }}
                  disabled={!newStatusSelected || deliveringStatus || (newStatusSelected === 'entregado' && !paymentAmount)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-650 text-white cursor-pointer transition-all hover:opacity-95 shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50"
                >
                  {deliveringStatus ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
