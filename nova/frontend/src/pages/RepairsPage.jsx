import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Wrench, ArrowLeft, ChevronRight, Calendar, Clock, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'

const STATUS_CONFIG = {
  recibido:           { label: 'Recibido',            color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30'   },
  diagnostico:        { label: 'Diagnóstico',          color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30' },
  esperando_repuesto: { label: 'Esperando Repuesto',   color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30' },
  presupuesto_enviado:{ label: 'Presupuesto Enviado',  color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30' },
  en_reparacion:      { label: 'En Reparación',        color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30'   },
  listo:              { label: 'Listo',                color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30'},
  entregado:          { label: 'Entregado',            color: 'text-gray-400',    bg: 'bg-gray-500/10',    border: 'border-gray-500/30'   },
  cancelado:          { label: 'Cancelado',            color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30'    },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.recibido
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} font-medium whitespace-nowrap`}>
      {cfg.label}
    </span>
  )
}

function StatusDropdown({ repair, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = async (newStatus) => {
    if (newStatus === repair.status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    try {
      await onUpdate(repair.id, newStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
      >
        {loading ? (
          <span className="text-gray-400">...</span>
        ) : (
          <>
            <span className="text-gray-300">Cambiar estado</span>
            <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-20 bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden shadow-2xl shadow-black/50 min-w-48"
            >
              {ALL_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                const isCurrent = s === repair.status
                return (
                  <button
                    key={s}
                    onClick={() => handleChange(s)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2 ${
                      isCurrent
                        ? 'bg-gray-800 text-gray-400 cursor-default'
                        : 'hover:bg-gray-800/80 text-gray-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.bg} border ${cfg.border}`} />
                    <span className={isCurrent ? cfg.color : ''}>{cfg.label}</span>
                    {isCurrent && <span className="ml-auto text-gray-600">actual</span>}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function DeliveryBadge({ date }) {
  if (!date) return null
  const today = new Date()
  const delivery = new Date(date)
  const diffDays = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24))

  let color = 'text-gray-400'
  let icon = Calendar

  if (diffDays < 0) { color = 'text-red-400'; icon = AlertCircle }
  else if (diffDays <= 2) { color = 'text-orange-400'; icon = Clock }
  else if (diffDays <= 7) { color = 'text-yellow-400'; icon = Calendar }

  const Icon = icon
  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon size={11} />
      {diffDays < 0
        ? `Vencido hace ${Math.abs(diffDays)}d`
        : diffDays === 0
        ? 'Hoy'
        : `${diffDays}d`}
    </span>
  )
}

export default function RepairsPage() {
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const res = await getRepairs(params)
      setRepairs(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRepairs() }, [statusFilter])

  const handleStatusUpdate = async (repairId, newStatus) => {
    try {
      await updateRepairStatus(repairId, { new_status: newStatus })
      await fetchRepairs()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = repairs.filter(r =>
    r.order_number.toLowerCase().includes(search.toLowerCase()) ||
    r.brand.toLowerCase().includes(search.toLowerCase()) ||
    r.model.toLowerCase().includes(search.toLowerCase()) ||
    r.reported_issue.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    activas: repairs.filter(r => !['entregado', 'cancelado'].includes(r.status)).length,
    listas: repairs.filter(r => r.status === 'listo').length,
    vencidas: repairs.filter(r => {
      if (!r.estimated_delivery) return false
      return new Date(r.estimated_delivery) < new Date() && !['entregado', 'cancelado'].includes(r.status)
    }).length,
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      <AnimatedBackground />

      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1
                className="text-xl font-black tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Reparaciones
              </h1>
              <p className="text-gray-600 text-xs">{repairs.length} órdenes en total</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/repairs/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}
          >
            <Plus size={16} />
            Nueva Reparación
          </motion.button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { label: 'Activas', value: stats.activas, color: 'text-cyan-400' },
            { label: 'Listas para entregar', value: stats.listas, color: 'text-emerald-400' },
            { label: 'Vencidas', value: stats.vencidas, color: 'text-red-400' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4"
            >
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-6 flex-wrap"
        >
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por orden, marca, modelo..."
              className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                statusFilter === ''
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-900/50 text-gray-500 hover:text-gray-300 border border-gray-800/50'
              }`}
            >
              Todos
            </button>
            {ALL_STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    statusFilter === s
                      ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                      : 'bg-gray-900/50 text-gray-500 hover:text-gray-300 border-gray-800/50'
                  }`}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-gray-900/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <Wrench size={48} className="mx-auto text-gray-800 mb-4" />
            <p className="text-gray-600">No hay reparaciones</p>
            <button
              onClick={() => navigate('/repairs/new')}
              className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
              + Crear primera reparación
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((repair, i) => (
                <motion.div
                  key={repair.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="group bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 hover:border-gray-700/70 rounded-xl p-4 transition-all hover:bg-gray-900/60"
                >
                  <div className="flex items-center gap-4">
                    {/* Orden */}
                    <div className="shrink-0 w-28">
                      <p
                        className="font-mono text-sm font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {repair.order_number}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {new Date(repair.created_at).toLocaleDateString('es-CL')}
                      </p>
                    </div>

                    {/* Info dispositivo */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {repair.brand} {repair.model}
                      </p>
                      <p className="text-gray-500 text-xs truncate mt-0.5">
                        {repair.reported_issue}
                      </p>
                    </div>

                    {/* Fecha estimada */}
                    <div className="shrink-0 w-24 text-right">
                      <DeliveryBadge date={repair.estimated_delivery} />
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      <StatusBadge status={repair.status} />
                    </div>

                    {/* Acciones */}
                    <div className="shrink-0 flex items-center gap-2">
                      <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />
                      <button
                        onClick={() => navigate(`/repairs/${repair.id}`)}
                        className="p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-gray-800 rounded-lg transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}