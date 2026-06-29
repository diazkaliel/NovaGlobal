import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Wrench, ArrowLeft, ChevronRight,
  Calendar, Clock, AlertCircle, ChevronDown, Download,
  Flame, Smartphone, Laptop, Gamepad2, Tablet, Cpu, MessageSquare, Trash2, Palette
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus, deleteRepair } from '../../api/repairs'
import BravoBackground from '../../components/bravo/BravoBackground'
import WhatsAppButton from '../../components/WhatsAppButton'

const STATUS_CONFIG_BRAVO = {
  recibido:            { label: 'Recibido',            dot: '#3a86ff', badge: 'bg-blue-50/70 border-blue-200 text-blue-700' },
  diagnostico:         { label: 'En Diseño',          dot: '#ffd166', badge: 'bg-yellow-50/70 border-yellow-200 text-yellow-800' },
  esperando_repuesto:  { label: 'Espera Insumos',      dot: '#f77f00', badge: 'bg-orange-50/70 border-orange-200 text-orange-700' },
  presupuesto_enviado: { label: 'Muestra Enviada',         dot: '#a855f7', badge: 'bg-purple-50/70 border-purple-200 text-purple-700' },
  en_reparacion:       { label: 'En Producción',        dot: '#00d2de', badge: 'bg-cyan-50/70 border-cyan-200 text-cyan-800 font-bold' },
  listo:               { label: 'Listo p/ Entrega',                dot: '#06d6a0', badge: 'bg-emerald-50/70 border-emerald-250 text-emerald-800 font-bold' },
  entregado:           { label: 'Entregado',            dot: '#4a596e', badge: 'bg-stone-100 border-stone-200 text-stone-600' },
  cancelado:           { label: 'Cancelado',            dot: '#ff006e', badge: 'bg-red-50 border-red-200 text-red-700' },
  critico:             { label: 'Crítico 🚨',           dot: '#ff006e', badge: 'bg-rose-100 border-rose-200 text-rose-800 font-black animate-pulse' },
}

const STATUS_LABELS_BRAVO = {
  recibido:            'Recibido',
  diagnostico:         'En Diseño',
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

function StatusDropdown({ repair, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-bravo-border text-bravo-text hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
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

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: menuPosition === 'top' ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: menuPosition === 'top' ? 6 : -6, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 z-50 bg-white border border-bravo-border rounded-xl p-1.5 min-w-[190px] shadow-xl list-none"
              style={
                menuPosition === 'top'
                  ? { bottom: 'calc(100% + 6px)', top: 'auto' }
                  : { top: 'calc(100% + 6px)', bottom: 'auto' }
              }
            >
              {ALL_STATUSES.map(s => {
                const cfg = STATUS_CONFIG_BRAVO[s]
                const active = s === repair.status
                return (
                  <li
                    key={s}
                    role="option"
                    aria-selected={active}
                    onClick={() => handleChange(s)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                      active 
                        ? 'bg-stone-50 text-bravo-text-muted cursor-default font-bold' 
                        : 'text-bravo-text hover:bg-stone-100 hover:text-black'
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
      </AnimatePresence>
    </div>
  )
}

function getDeviceIcon(deviceType) {
  const type = (deviceType || '').toLowerCase()
  if (type.includes('polera') || type.includes('poleron') || type.includes('polerón') || type.includes('t-shirt') || type.includes('ropa') || type.includes('textil')) {
    return <Palette size={14} className="text-amber-600" />
  }
  if (type.includes('tazon') || type.includes('tazón') || type.includes('taza') || type.includes('mug') || type.includes('termo') || type.includes('vaso')) {
    return <Cpu size={14} className="text-orange-600" />
  }
  return <Wrench size={14} className="text-stone-500" />
}

export default function BravoOrdersPage() {
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

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

  const handleStatusUpdate = async (repairId, newStatus) => {
    try {
      await updateRepairStatus(repairId, newStatus)
      setRepairs(prev => prev.map(r => r.id === repairId ? { ...r, status: newStatus } : r))
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al actualizar el estado.')
    }
  }

  const filtered = repairs.filter(r => {
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
    activas: repairs.filter(r => r.status !== 'entregado' && r.status !== 'cancelado').length,
    listas: repairs.filter(r => r.status === 'listo').length,
    vencidas: repairs.filter(r => {
      if (r.status === 'entregado' || r.status === 'cancelado' || !r.estimated_delivery) return false
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
          { label: 'Órdenes Activas', value: stats.activas, color: 'text-amber-800 bg-amber-500/5 border-amber-500/25 shadow-xs' },
          { label: 'Listas para Retiro', value: stats.listas, color: 'text-emerald-700 bg-emerald-500/5 border-emerald-500/25 shadow-xs' },
          { label: 'Entregas Vencidas', value: stats.vencidas, color: 'text-rose-700 bg-rose-500/5 border-rose-500/25 shadow-xs' },
        ].map((s) => (
          <div
            key={s.label}
            className={`border rounded-2xl p-5 flex flex-col items-start justify-between bg-bravo-card/60 backdrop-blur-sm transition-all hover:translate-y-[-2px]`}
          >
            <div className={`text-3xl font-black ${s.color.split(' ')[0]}`}>{s.value}</div>
            <div className="text-bravo-text-muted text-[10px] font-bold uppercase tracking-wider mt-2">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
          <input
            className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/30 focus:border-bravo-accent/50 focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-bravo-text transition-all placeholder-stone-400 backdrop-blur-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número de orden, cliente, producto..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto select-none max-w-full pb-1.5 md:pb-0">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === '' 
                ? 'bg-bravo-accent/15 border-bravo-accent/35 text-amber-800 shadow-xs' 
                : 'bg-white border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-stone-400'
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
                    ? 'bg-bravo-accent/15 border-bravo-accent/35 text-amber-800 shadow-xs' 
                    : 'bg-white border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-stone-400'
                }`}
              >
                {cfg.label.replace(' 🚨', '')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 w-full bg-stone-100 border border-bravo-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-bravo-card/30 border border-bravo-border rounded-3xl">
          <Wrench size={32} className="mx-auto text-stone-300 mb-3" />
          <p className="text-bravo-text-muted text-sm font-semibold">No se encontraron órdenes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((repair, i) => {
            const isCrit = repair.status === 'critico'
            const balance = (repair.repair_cost || 0) - (repair.deposit || 0)
            return (
              <motion.div
                key={repair.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                onClick={() => navigate(`/bravo/orders/${repair.id}`)}
                className={`repair-row relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-visible bg-bravo-card hover:border-bravo-accent/35 hover:shadow-md ${
                  isCrit ? 'border-red-400/50 bg-red-500/5 animate-pulse' : 'border-bravo-border'
                }`}
              >
                {/* Left neon border indicator */}
                {!isCrit && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" 
                    style={{ background: STATUS_CONFIG_BRAVO[repair.status]?.dot || '#64748b' }}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-5">
                  {/* Col 1: Orden */}
                  <div className="col-span-1 md:col-span-2 text-left flex md:block items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-black text-bravo-accent flex items-center gap-1.5">
                        {repair.order_number}
                        {isCrit && <Flame size={12} className="text-rose-500 animate-bounce" />}
                      </div>
                      <div className="text-[10px] text-bravo-text-muted mt-1">
                        {new Date(repair.created_at).toLocaleDateString('es-CL')}
                      </div>
                    </div>
                    <div className="md:hidden">
                      <StatusBadge status={repair.status} />
                    </div>
                  </div>

                  {/* Col 2: Producto & Cliente */}
                  <div className="col-span-1 md:col-span-3 text-left">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(repair.device_type)}
                      <span className="text-bravo-text text-xs font-bold truncate capitalize">{repair.device_type} {repair.brand} {repair.model}</span>
                    </div>
                    <div className="text-[11px] text-bravo-text-muted truncate max-w-[340px] mt-1">
                      {repair.client ? `Cliente: ${repair.client.name}` : `Especificación: ${repair.reported_issue || 'No declarada'}`}
                    </div>
                  </div>

                  {/* Col 3: Estado Selector / Dropdown Directo */}
                  <div className="col-span-1 md:col-span-2 hidden md:flex items-center justify-center" onClick={e => e.stopPropagation()}>
                    <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />
                  </div>

                  {/* Col 4: Entrega badge */}
                  <div className="col-span-1 md:col-span-2 text-left md:text-center flex md:block justify-between items-center text-xs">
                    <span className="md:hidden text-bravo-text-muted text-[10px] font-bold uppercase tracking-wider">Entrega</span>
                    {repair.estimated_delivery ? (
                      <span className={`inline-flex items-center gap-1 font-semibold ${
                        new Date(repair.estimated_delivery) < new Date().setHours(0,0,0,0) && repair.status !== 'entregado'
                          ? 'text-rose-600 font-bold'
                          : 'text-bravo-text-muted'
                      }`}>
                        <Calendar size={11} />
                        {new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic text-[11px]">Por definir</span>
                    )}
                  </div>

                  {/* Col 5: Montos */}
                  <div className="col-span-1 md:col-span-2 text-left md:text-right flex md:block justify-between items-center text-xs">
                    <span className="md:hidden text-bravo-text-muted text-[10px] font-bold uppercase tracking-wider">Total / Saldo</span>
                    <div>
                      <div className="font-extrabold text-bravo-text">${Number(repair.repair_cost || 0).toLocaleString('es-CL')}</div>
                      {balance > 0 ? (
                        <div className="text-[9px] text-orange-600 font-bold mt-0.5">Saldo: ${balance.toLocaleString('es-CL')}</div>
                      ) : (
                        <div className="text-[9px] text-emerald-600 font-bold mt-0.5">Pagado</div>
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
                        customLabelMap={STATUS_LABELS_BRAVO}
                        isBravo={true}
                      />
                    )}
                    <button 
                      className="p-2 border border-bravo-border hover:border-bravo-accent/40 rounded-xl bg-white text-bravo-text-muted hover:text-bravo-accent cursor-pointer transition-colors shadow-xs"
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
      )}
    </div>
  )
}
