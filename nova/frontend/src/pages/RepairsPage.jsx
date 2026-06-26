import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Wrench, ArrowLeft, ChevronRight,
  Calendar, Clock, AlertCircle, ChevronDown, Download,
  Flame, Smartphone, Laptop, Gamepad2, Tablet, Cpu, MessageSquare
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'
import { generateRepairPDF } from '../utils/generateRepairPDF'
import api from '../api/client'
import WhatsAppButton from '../components/WhatsAppButton'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  recibido:            { label: 'Recibido',            dot: 'var(--color-blue-400)', badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  diagnostico:         { label: 'Diagnóstico',          dot: 'var(--color-yellow-450)', badge: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400' },
  esperando_repuesto:  { label: 'Espera Repuesto',      dot: 'var(--color-orange-450)', badge: 'bg-orange-500/10 border-orange-500/25 text-orange-400' },
  presupuesto_enviado: { label: 'Pto. Enviado',         dot: 'var(--color-purple-400)', badge: 'bg-purple-500/10 border-purple-500/25 text-purple-400' },
  en_reparacion:       { label: 'En reparación',        dot: 'var(--color-cyan-400)', badge: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400' },
  listo:               { label: 'Listo',                dot: 'var(--color-emerald-450)', badge: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' },
  entregado:           { label: 'Entregado',            dot: 'var(--color-gray-550)', badge: 'bg-gray-500/10 border-gray-500/20 text-gray-550' },
  cancelado:           { label: 'Cancelado',            dot: 'var(--color-rose-455)', badge: 'bg-red-500/10 border-red-500/20 text-red-450' },
  critico:             { label: 'Crítico 🚨',           dot: 'var(--color-rose-455)', badge: 'bg-rose-500/20 border-rose-500/40 text-rose-450 font-black animate-pulse shadow-[inset_0_0_6px_rgba(244,63,94,0.15)]' },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

// ─── Badge ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.recibido
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${cfg.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 8px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  )
}

// ─── Status dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ repair, onUpdate }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [menuPosition, setMenuPosition] = useState('bottom')
  const ref = useRef(null)

  // Eleva el z-index de la fila para que el menú no quede detrás de otras filas en la tabla
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

  const handleChange = async (newStatus) => {
    if (newStatus === repair.status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    try { await onUpdate(repair.id, newStatus) }
    finally { setLoading(false) }
  }

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      
      // Si hay menos de 260px abajo, abrimos hacia arriba
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
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900/60 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <span className="text-[11px] text-gray-500 animate-pulse">Actualizando…</span>
        ) : (
          <>
            <span className="text-[11px]">Estado</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180 text-cyan-400' : ''}`} />
          </>
        )}
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
                        : 'text-gray-450 hover:bg-gray-800/40 hover:text-white'
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

// ─── Delivery badge ───────────────────────────────────────────────────────────
function DeliveryBadge({ date }) {
  if (!date) return null
  const diffDays = Math.ceil((new Date(date) - new Date()) / 86_400_000)
  const overdue  = diffDays < 0
  const urgent   = !overdue && diffDays <= 2
  const soon     = !overdue && diffDays <= 7

  const Icon  = overdue ? AlertCircle : diffDays <= 2 ? Clock : Calendar
  const cls   = overdue 
    ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
    : urgent 
      ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]' 
      : soon 
        ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500' 
        : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'

  const label = overdue 
    ? `Atrasado ${Math.abs(diffDays)}d` 
    : diffDays === 0 
      ? 'Hoy' 
      : diffDays === 1 
        ? 'Mañana' 
        : `${diffDays} días`

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${cls}`}>
      <Icon size={12} className="shrink-0" />
      {label}
    </span>
  )
}

// Retorna un icono según el tipo de dispositivo
function getDeviceIcon(deviceType) {
  const type = (deviceType || '').toLowerCase()
  if (type.includes('celular') || type.includes('telefono') || type.includes('iphone') || type.includes('teléfono')) {
    return <Smartphone size={14} className="text-cyan-400" />
  }
  if (type.includes('laptop') || type.includes('notebook') || type.includes('computador') || type.includes('macbook')) {
    return <Laptop size={14} className="text-purple-400" />
  }
  if (type.includes('consola') || type.includes('ps5') || type.includes('xbox') || type.includes('nintendo') || type.includes('play')) {
    return <Gamepad2 size={14} className="text-orange-400" />
  }
  if (type.includes('tablet') || type.includes('ipad')) {
    return <Tablet size={14} className="text-emerald-400" />
  }
  return <Cpu size={14} className="text-gray-400" />
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RepairsPage() {
  const navigate = useNavigate()
  const [repairs,      setRepairs]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [criticalAlertData, setCriticalAlertData] = useState(null)

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await getRepairs(params)
      setRepairs(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRepairs() }, [statusFilter])

  const handleQuickPDF = async (repair, e) => {
    e.stopPropagation()
    try {
      const res = await api.get(`/clients/${repair.client_id}`)
      generateRepairPDF(repair, res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleStatusUpdate = async (repairId, newStatus) => {
    try {
      const res = await updateRepairStatus(repairId, { new_status: newStatus })
      const updatedRepair = res.data
      await fetchRepairs()

      // Desplegar notificación especial si es crítico y el cliente es recurrente
      if (newStatus === 'critico' && updatedRepair.client_repairs_count > 1) {
        setCriticalAlertData({
          clientName: updatedRepair.client?.name || 'Cliente',
          orderNumber: updatedRepair.order_number,
          count: updatedRepair.client_repairs_count,
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = repairs.filter(r =>
    [r.order_number, r.brand, r.model, r.reported_issue]
      .some(f => (f || '').toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    activas:  repairs.filter(r => !['entregado','cancelado'].includes(r.status)).length,
    listas:   repairs.filter(r => r.status === 'listo').length,
    vencidas: repairs.filter(r => {
      if (!r.estimated_delivery) return false
      return new Date(r.estimated_delivery) < new Date() && !['entregado','cancelado'].includes(r.status)
    }).length,
  }

  return (
    <>
      {/* Scoped Styles for neon glows and visual adaptations */}
      <style>{`
        .repair-item-glow {
          position: relative;
          background: rgba(13, 14, 18, 0.5);
          backdrop-filter: blur(8px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .repair-item-glow:hover {
          background: rgba(18, 20, 26, 0.7);
          box-shadow: 0 10px 25px -10px rgba(0,0,0,0.5);
        }

        /* Borde con flujo de gradiente animado en bucle para estado crítico */
        @keyframes gradient-border {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animated-border-flow {
          position: relative;
          background: #0d0e12;
          border-radius: 16px;
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
                className={`border rounded-2xl p-5 flex flex-col items-start justify-between relative overflow-hidden bg-gray-900/20 backdrop-blur-sm transition-all hover:translate-y-[-2px]`}
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
            className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"
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
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1.5 md:pb-0 select-none max-w-full">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  statusFilter === '' 
                    ? 'bg-cyan-500/10 border-cyan-500/45 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.12)]' 
                    : 'bg-transparent border-gray-900 text-gray-500 hover:text-gray-400 hover:border-gray-800'
                }`}
              >
                Todos
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
                        : 'bg-transparent border-gray-900 text-gray-500 hover:text-gray-450 hover:border-gray-800'
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
              <Wrench size={40} className="mx-auto text-gray-850 mb-3" />
              <p className="text-gray-500 text-sm uppercase tracking-wider font-semibold">No se encontraron reparaciones registradas</p>
              <button 
                className="mt-3 text-xs font-extrabold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 underline cursor-pointer bg-transparent border-none" 
                onClick={() => navigate('/repairs/new')}
              >
                + Crear nueva reparación
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              
              {/* Header de listado en Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 text-[9px] font-black uppercase tracking-widest text-gray-500 select-none">
                <span className="col-span-2 text-left">Orden</span>
                <span className="col-span-3 text-left">Dispositivo y Cliente</span>
                <span className="col-span-2 text-center">Estado</span>
                <span className="col-span-2 text-center">Entrega Estimada</span>
                <span className="col-span-3 text-right">Acciones</span>
              </div>

              {/* Contenedor de items */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map((repair, i) => {
                    const isCrit = repair.status === 'critico'
                    
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
                          <div className="col-span-1 md:col-span-2 flex md:justify-center items-center">
                            <DeliveryBadge date={repair.estimated_delivery} />
                          </div>

                          {/* Col 5: Acciones Rápidas (Desktop / Móvil) */}
                          <div className="col-span-1 md:col-span-3 flex items-center justify-between md:justify-end gap-2.5" onClick={e => e.stopPropagation()}>
                            {/* Selector visible en móviles */}
                            <div className="md:hidden">
                              <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                              {repair.client?.phone && (
                                <div className="scale-90 origin-right">
                                  <WhatsAppButton client={repair.client} repair={repair} />
                                </div>
                              )}
                              <button
                                onClick={(e) => handleQuickPDF(repair, e)}
                                className="w-8 h-8 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-950/45 text-gray-500 hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.15)] flex items-center justify-center cursor-pointer transition-all"
                                title="Descargar PDF"
                              >
                                <Download size={13} />
                              </button>
                              <button
                                className="w-8 h-8 rounded-lg border border-gray-900 bg-gray-950/45 text-gray-650 hover:text-white flex items-center justify-center cursor-pointer transition-all md:flex hidden"
                                aria-label={`Ver detalle de ${repair.order_number}`}
                                onClick={() => navigate(`/repairs/${repair.id}`)}
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>


                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

            </div>
          )}
        </main>
      </div>

      {/* Modal de Alerta Crítica Premium */}
      <AnimatePresence>
        {criticalAlertData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="w-full max-w-md bg-[#0c0507] border-2 border-rose-500/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.35)] relative overflow-hidden text-center"
            >
              {/* Borde neón superior */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 animate-pulse" />

              {/* Fuego ambient loop */}
              <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none">
                <Flame size={150} className="text-rose-500 animate-pulse" />
              </div>

              {/* Icono de Alerta */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/25 mb-4 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <Flame size={24} className="animate-bounce" />
              </div>

              <h3 className="text-lg font-black tracking-widest text-rose-350 uppercase mb-2">
                ¡Prioridad Crítica Detectada!
              </h3>

              <div className="text-xs text-rose-200/85 leading-relaxed space-y-4 mb-6">
                <p>
                  El equipo técnico bajo la orden <strong className="text-white font-mono text-sm">{criticalAlertData.orderNumber}</strong> ha sido clasificado como <strong>CRÍTICO</strong>.
                </p>
                
                {/* Caja de cliente recurrente */}
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 text-left">
                  <p className="text-[9px] font-black tracking-widest text-rose-400 uppercase">
                    ⚠️ ALERTA DE CLIENTE RECURRENTE:
                  </p>
                  <p className="text-white text-sm font-extrabold mt-1">
                    {criticalAlertData.clientName}
                  </p>
                  <p className="text-gray-400 text-[11px] mt-1.5">
                    Este cliente ya registra <strong className="text-rose-400 font-bold">{criticalAlertData.count}</strong> visitas en el sistema técnico. Requiere atención preferencial.
                  </p>
                </div>
              </div>

              {/* Botón de Confirmación */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCriticalAlertData(null)}
                  className="bg-rose-500 hover:bg-rose-400 text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] cursor-pointer transition-all border-none"
                >
                  Entendido y Priorizado
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
