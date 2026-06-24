import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, ChevronRight as ChevronIcon } from 'lucide-react'
import { getRepairs, updateRepair } from '../api/repairs'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS_NOVA = {
  recibido:            'bg-blue-500',
  diagnostico:         'bg-yellow-500',
  esperando_repuesto:  'bg-orange-500',
  presupuesto_enviado: 'bg-purple-500',
  en_reparacion:       'bg-cyan-500',
  listo:               'bg-emerald-500',
}

const STATUS_COLORS_BRAVO = {
  recibido:            'bg-amber-600',
  diagnostico:         'bg-yellow-500',
  esperando_repuesto:  'bg-amber-700',
  presupuesto_enviado: 'bg-orange-650',
  en_reparacion:       'bg-yellow-600',
  listo:               'bg-amber-400',
}

const STATUS_LABELS = {
  recibido: 'Recibido',
  diagnostico: 'Diagnóstico',
  esperando_repuesto: 'Espera Repuesto',
  presupuesto_enviado: 'Pto. Enviado',
  en_reparacion: 'En Reparación',
  listo: 'Listo'
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? 120 : -120,
    opacity: 0
  })
}

const scaleVariants = {
  enter: {
    scale: 0.94,
    opacity: 0
  },
  center: {
    scale: 1,
    opacity: 1
  },
  exit: {
    scale: 1.06,
    opacity: 0
  }
}

export default function DeliveryCalendar({ system = 'nova', interactive = false }) {
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [today] = useState(new Date())
  const [current, setCurrent] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Interactive mode states
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState([])
  
  // Animation direction state
  const [direction, setDirection] = useState(0)

  const isBravo = system === 'bravo'
  const statusColors = isBravo ? STATUS_COLORS_BRAVO : STATUS_COLORS_NOVA

  const fetchRepairs = () => {
    getRepairs({ system })
      .then(res => {
        const validRepairs = res.data.filter(r => r.estimated_delivery && !['entregado', 'cancelado'].includes(r.status));
        setRepairs(validRepairs);
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRepairs()
  }, [system])

  const handleReschedule = async (repairId, newDate) => {
    if (!newDate) return
    try {
      setLoading(true)
      await updateRepair(repairId, { estimated_delivery: newDate })
      // Refetch
      const res = await getRepairs({ system })
      const validRepairs = res.data.filter(r => r.estimated_delivery && !['entregado', 'cancelado'].includes(r.status));
      setRepairs(validRepairs);
    } catch (err) {
      console.error(err)
      alert("Error al re-programar la entrega")
    } finally {
      setLoading(false)
    }
  }

  // Filter repairs locally
  const filteredRepairs = repairs.filter(r => {
    if (statusFilters.length > 0 && !statusFilters.includes(r.status)) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const clientName = r.client?.name?.toLowerCase() || ''
      const orderNum = r.order_number?.toLowerCase() || ''
      const brand = r.brand?.toLowerCase() || ''
      const model = r.model?.toLowerCase() || ''
      const issue = r.reported_issue?.toLowerCase() || ''
      if (!clientName.includes(q) && !orderNum.includes(q) && !brand.includes(q) && !model.includes(q) && !issue.includes(q)) {
        return false
      }
    }
    return true
  })

  // Agrupa reparaciones por fecha
  const repairsByDate = filteredRepairs.reduce((acc, r) => {
    if (!r.estimated_delivery) return acc
    const key = r.estimated_delivery.split('T')[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  // Días del mes actual
  const firstDay = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))

  const prevMonth = () => {
    setDirection(-1)
    setCurrent(c => {
      if (c.month === 0) return { year: c.year - 1, month: 11 }
      return { ...c, month: c.month - 1 }
    })
  }

  const nextMonth = () => {
    setDirection(1)
    setCurrent(c => {
      if (c.month === 11) return { year: c.year + 1, month: 0 }
      return { ...c, month: c.month + 1 }
    })
  }

  const getDateKey = (day) => {
    const m = String(current.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${current.year}-${m}-${d}`
  }

  const isToday = (day) => {
    return day === today.getDate() &&
      current.month === today.getMonth() &&
      current.year === today.getFullYear()
  }

  const isPast = (day) => {
    const d = new Date(current.year, current.month, day)
    d.setHours(0,0,0,0)
    const t = new Date()
    t.setHours(0,0,0,0)
    return d < t
  }

  // Próximas entregas ordenadas
  const upcoming = filteredRepairs
    .filter(r => r.estimated_delivery)
    .sort((a, b) => new Date(a.estimated_delivery) - new Date(b.estimated_delivery))
    .slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Calendario */}
      <div className="lg:col-span-2 bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-5 text-left">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-sm tracking-wider text-gray-300 flex items-center gap-2">
            <Calendar size={16} className={isBravo ? 'text-amber-400' : 'text-cyan-400'} />
            Calendario de Entregas
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              {MONTHS[current.month]} {current.year}
            </span>
            <div className="flex gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Filtering Controls */}
        {interactive && (
          <div className="mb-5 space-y-3 bg-gray-950/50 p-4 rounded-xl border border-gray-800/50 text-left">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por orden, cliente, marca, modelo, falla..."
              className="w-full bg-gray-950 border border-gray-855 rounded-xl px-4 py-2 text-xs text-gray-300 placeholder-gray-650 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Estados:</span>
              {Object.entries(STATUS_LABELS).map(([statusKey, label]) => {
                const isActive = statusFilters.includes(statusKey)
                const dotColor = statusColors[statusKey]
                return (
                  <button
                    key={statusKey}
                    onClick={() => {
                      if (isActive) {
                        setStatusFilters(statusFilters.filter(s => s !== statusKey))
                      } else {
                        setStatusFilters([...statusFilters, statusKey])
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      isActive
                        ? isBravo
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                          : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                        : 'bg-transparent border-gray-855 text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    {label}
                  </button>
                )
              })}
              {statusFilters.length > 0 && (
                <button
                  onClick={() => setStatusFilters([])}
                  className="text-[9px] text-gray-500 hover:text-gray-300 font-bold underline cursor-pointer"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* Días de la semana */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-gray-600 font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas con transiciones */}
        <div className="overflow-hidden relative min-h-[220px]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={`${current.year}-${current.month}`}
              custom={direction}
              variants={isBravo ? scaleVariants : slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={
                isBravo
                  ? { duration: 0.35, ease: "easeOut" }
                  : { x: { type: "spring", stiffness: 300, damping: 26 }, opacity: { duration: 0.18 } }
              }
              className="grid grid-cols-7 gap-1"
            >
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />

                const key = getDateKey(day)
                const dayRepairs = repairsByDate[key] || []
                const hasRepairs = dayRepairs.length > 0
                const todayCell = isToday(day)
                const pastCell = isPast(day)

                return (
                  <motion.button
                    key={key}
                    whileHover={hasRepairs ? { scale: 1.08, y: -2 } : { scale: 1.03 }}
                    whileTap={hasRepairs ? { scale: 0.95 } : {}}
                    onClick={() => hasRepairs && setSelected(selected === key ? null : key)}
                    className={`
                      relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-xs font-medium transition-all
                      ${todayCell
                        ? isBravo
                          ? 'bg-gradient-to-br from-amber-500/25 to-orange-500/25 border border-amber-500/50 text-white shadow-[0_0_10px_rgba(245,158,11,0.12)] font-bold'
                          : 'bg-gradient-to-br from-cyan-500/25 to-purple-500/25 border border-cyan-500/50 text-white shadow-[0_0_10px_rgba(6,182,212,0.12)] font-bold'
                        : pastCell
                        ? 'text-gray-700'
                        : 'text-gray-400 hover:bg-gray-800/40'
                      }
                      ${hasRepairs && !todayCell 
                        ? isBravo 
                          ? 'border border-amber-500/20 text-white cursor-pointer bg-amber-950/5'
                          : 'border border-cyan-500/20 text-white cursor-pointer bg-cyan-950/5'
                        : ''
                      }
                      ${selected === key
                        ? isBravo 
                          ? 'border border-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold' 
                          : 'border border-cyan-500 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.2)] font-bold'
                        : ''}
                    `}
                  >
                    <span>{day}</span>
                    {hasRepairs && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                        {dayRepairs.slice(0, 3).map((r, idx) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${statusColors[r.status] || 'bg-gray-500'}`}
                          />
                        ))}
                        {dayRepairs.length > 3 && (
                          <span className="text-gray-500" style={{ fontSize: '8px' }}>+{dayRepairs.length - 3}</span>
                        )}
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Popup del día seleccionado con acordeón */}
        <AnimatePresence>
          {selected && repairsByDate[selected] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="mt-4 border border-gray-800/60 rounded-xl overflow-hidden text-left bg-gray-950/10"
            >
              <div className="px-4 py-2.5 bg-gray-900/40 border-b border-gray-800/60">
                <p className="text-xs font-semibold text-gray-300">
                  Entregas del {new Date(selected + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              
              <div className="divide-y divide-gray-850/50">
                {repairsByDate[selected].map((r, idx) => (
                  <motion.div
                    key={r.id}
                    initial={{ x: isBravo ? 0 : -8, y: isBravo ? 8 : 0, opacity: 0 }}
                    animate={{ x: 0, y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.04, duration: 0.25, ease: "easeOut" }}
                    className="w-full p-4 transition-colors hover:bg-gray-950/20"
                  >
                    <div 
                      onClick={() => !isBravo && navigate(`/repairs/${r.id}`)}
                      className={`flex items-center gap-3 ${isBravo ? '' : 'cursor-pointer group'}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[r.status] || 'bg-gray-500'}`} />
                      <span className={`font-mono text-xs font-bold shrink-0 ${isBravo ? 'text-amber-400' : 'text-cyan-400'}`}>{r.order_number}</span>
                      <div className="min-w-0">
                        <span className="text-gray-300 text-xs font-semibold block">
                          {r.brand} {r.model}
                        </span>
                        {r.client && (
                          <span className="text-[10px] text-gray-500 block">
                            Cliente: {r.client.name} {r.client.phone ? `(${r.client.phone})` : ''}
                          </span>
                        )}
                      </div>
                      {!isBravo && <ChevronIcon size={12} className="text-gray-600 shrink-0 ml-auto group-hover:text-gray-400 transition-colors" />}
                    </div>

                    {/* Rescheduling field for interactive calendar */}
                    {interactive && (
                      <div className="mt-3 pt-2.5 border-t border-gray-850/30 flex flex-wrap items-center gap-4 text-left">
                        <label className="text-[10px] text-gray-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
                          <Clock size={10} className={isBravo ? "text-amber-500" : "text-cyan-400"} /> Re-programar Entrega:
                        </label>
                        <input
                          type="date"
                          defaultValue={r.estimated_delivery}
                          onChange={(e) => handleReschedule(r.id, e.target.value)}
                          className={`bg-gray-950 border border-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg focus:outline-none transition-colors ${
                            isBravo ? "focus:border-amber-500/50" : "focus:border-cyan-500/50"
                          }`}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panel de próximas entregas */}
      <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-5 text-left">
        <h3 className="font-bold text-sm tracking-wider text-gray-300 flex items-center gap-2 mb-5">
          <Clock size={16} className={isBravo ? 'text-orange-400' : 'text-purple-400'} />
          Próximas Entregas
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-800/50 rounded-xl animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={32} className="mx-auto text-gray-800 mb-2" />
            <p className="text-gray-650 text-xs text-center w-full">Sin entregas programadas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r, i) => {
              const delivery = new Date(r.estimated_delivery + 'T12:00:00')
              const diffDays = Math.ceil((delivery - new Date()) / (1000 * 60 * 60 * 24))
              const isUrgent = diffDays <= 1
              const isWarning = diffDays <= 3

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  onClick={() => !isBravo && navigate(`/repairs/${r.id}`)}
                  className={`w-full text-left bg-gray-800/30 border border-gray-700/30 rounded-xl p-3 transition-all ${
                    isBravo ? '' : 'hover:bg-gray-800/60 hover:border-gray-600/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`font-mono text-xs font-bold ${isBravo ? 'text-amber-400' : 'text-cyan-400'}`}>{r.order_number}</p>
                      <p className="text-gray-300 text-xs truncate mt-0.5">
                        {isBravo ? `${r.device_type} (${r.brand} ${r.model})` : `${r.brand} ${r.model}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-bold flex items-center gap-1 justify-end ${
                        isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-gray-400'
                      }`}>
                        {isUrgent && <AlertCircle size={10} />}
                        {diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : `${diffDays}d`}
                      </p>
                      <p className="text-gray-650 text-xs mt-0.5">
                        {delivery.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-5 pt-4 border-t border-gray-800/50">
          <p className="text-gray-650 text-[10px] font-bold uppercase tracking-wider mb-2.5">Estados</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusColors[status]} shrink-0`} />
                <span className="text-gray-600 text-xs truncate">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}