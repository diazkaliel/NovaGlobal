import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, ChevronRight as ChevronIcon, Flame } from 'lucide-react'
import { getRepairs, updateRepair } from '../api/repairs'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS_NOVA = {
  recibido:            'bg-blue-500',
  diagnostico:         'bg-yellow-500',
  esperando_repuesto:  'bg-orange-500',
  presupuesto_enviado: 'bg-purple-500',
  en_reparacion:       'bg-cyan-500',
  listo:               'bg-emerald-500',
  critico:             'bg-rose-500 animate-pulse border border-rose-400',
}

const STATUS_COLORS_BRAVO = {
  recibido:            'bg-amber-600',
  diagnostico:         'bg-yellow-500',
  esperando_repuesto:  'bg-amber-700',
  presupuesto_enviado: 'bg-orange-650',
  en_reparacion:       'bg-yellow-600',
  listo:               'bg-amber-400',
  critico:             'bg-rose-600 animate-pulse border border-rose-500',
}

const STATUS_LABELS = {
  recibido: 'Recibido',
  diagnostico: 'Diagnóstico',
  esperando_repuesto: 'Espera Repuesto',
  presupuesto_enviado: 'Pto. Enviado',
  en_reparacion: 'En Reparación',
  listo: 'Listo',
  critico: 'Crítico 🚨'
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

function getUrgencyInfo(diffDays) {
  if (diffDays <= 1) return { percent: 95, color: 'from-rose-500 to-red-600', glow: true, label: 'Urgente' }
  if (diffDays <= 3) return { percent: 75, color: 'from-orange-400 to-orange-600', glow: false, label: 'Pronto' }
  if (diffDays <= 6) return { percent: 50, color: 'from-yellow-400 to-amber-500', glow: false, label: 'Normal' }
  return { percent: 20, color: 'from-emerald-400 to-green-500', glow: false, label: 'Holgado' }
}

export default function DeliveryCalendar({ system = 'nova', interactive = false }) {
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [today] = useState(new Date())
  const [current, setCurrent] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState([])
  const [direction, setDirection] = useState(0)
  const [hoveredDay, setHoveredDay] = useState(null)

  const isBravo = system === 'bravo'
  const statusColors = isBravo ? STATUS_COLORS_BRAVO : STATUS_COLORS_NOVA
  const accentRgb = isBravo ? '217,119,6' : '6,182,212'

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

  const toggleStatusFilter = (statusKey) => {
    if (statusFilters.includes(statusKey)) {
      setStatusFilters(statusFilters.filter(s => s !== statusKey))
    } else {
      setStatusFilters([...statusFilters, statusKey])
    }
  }

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

  const repairsByDate = filteredRepairs.reduce((acc, r) => {
    if (!r.estimated_delivery) return acc
    const key = r.estimated_delivery.split('T')[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

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

  const upcoming = filteredRepairs
    .filter(r => r.estimated_delivery)
    .sort((a, b) => new Date(a.estimated_delivery) - new Date(b.estimated_delivery))
    .slice(0, 5)

  const buildTooltipContent = (dayRepairs) => {
    const counts = {}
    dayRepairs.forEach(r => {
      const label = STATUS_LABELS[r.status] || r.status
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([label, count]) => `${count} ${label}`).join(', ')
  }

  const hasCritical = (dayRepairs) => dayRepairs.some(r => r.status === 'critico')

  return (
    <>
      <style>{`
        @keyframes radar-ping {
          0% {
            transform: scale(1);
            opacity: 0.45;
          }
          80% {
            transform: scale(1.45);
            opacity: 0;
          }
          100% {
            transform: scale(1.45);
            opacity: 0;
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes breath {
          0%, 100% {
            transform: scale(1);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.35);
            opacity: 1;
          }
        }
        @keyframes critical-glow {
          0%, 100% {
            box-shadow: 0 0 4px rgba(244,63,94,0.2), 0 0 8px rgba(244,63,94,0.1);
          }
          50% {
            box-shadow: 0 0 12px rgba(244,63,94,0.4), 0 0 24px rgba(244,63,94,0.15);
          }
        }
        .shimmer-skeleton {
          background: linear-gradient(90deg, rgba(55,65,81,0.3) 25%, rgba(75,85,99,0.5) 50%, rgba(55,65,81,0.3) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
        .radar-ring {
          animation: radar-ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .breath-dot {
          animation: breath 2.5s ease-in-out infinite;
        }
        .critical-cell-glow {
          animation: critical-glow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ───────── CALENDAR PANEL ───────── */}
        <div className={`lg:col-span-2 rounded-2xl p-5 text-left ${isBravo ? 'bg-bravo-card border border-bravo-border shadow-xs' : 'bg-gray-900/40 backdrop-blur-sm border border-gray-800/50'}`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`font-bold text-sm tracking-wider flex items-center gap-2 ${isBravo ? 'text-bravo-text' : 'text-gray-300'}`}>
              <Calendar size={16} className={isBravo ? 'text-bravo-accent' : 'text-cyan-400'} />
              Calendario de Entregas
            </h3>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${isBravo ? 'text-bravo-text' : 'text-white'}`}>
                {MONTHS[current.month]} {current.year}
              </span>
              <div className="flex gap-1">
                <motion.button
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevMonth}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextMonth}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer"
                >
                  <ChevronRight size={14} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* ── Search / Filter Bar (interactive only) ── */}
          {interactive && (
            <div className={`mb-5 space-y-3 p-4 rounded-xl text-left border ${isBravo ? 'bg-bravo-card/50 border-bravo-border shadow-xs' : 'bg-gray-950/50 border border-gray-800/50'}`}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por orden, cliente, marca, modelo, falla..."
                className={`w-full rounded-xl px-4 py-2 text-xs transition-all ${isBravo ? 'bg-bravo-input border border-bravo-border text-bravo-text placeholder-stone-400 focus:outline-none focus:border-bravo-accent/50' : 'bg-gray-950 border border-gray-855 text-gray-300 placeholder-gray-650 focus:outline-none focus:border-cyan-500/50'}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider mr-1 ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>Estados:</span>
                {Object.entries(STATUS_LABELS).map(([statusKey, label]) => {
                  const isActive = statusFilters.includes(statusKey)
                  const dotColor = statusColors[statusKey]
                  return (
                    <button
                      key={statusKey}
                      onClick={() => toggleStatusFilter(statusKey)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        isActive
                          ? isBravo
                            ? 'bg-bravo-accent/12 border border-bravo-accent/35 text-bravo-accent'
                            : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                          : isBravo
                            ? 'bg-transparent border-bravo-border text-bravo-text-muted hover:text-bravo-text'
                            : 'bg-transparent border-gray-855 text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      {label}
                    </button>
                  )
                })}
                {statusFilters.length > 0 && (
                  <button onClick={() => setStatusFilters([])} className="text-[9px] text-gray-500 hover:text-gray-300 font-bold underline cursor-pointer">
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Day-of-Week Headers ── */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-600 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* ── Calendar Grid ── */}
          <div className="overflow-hidden relative min-h-[220px]">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={`${current.year}-${current.month}`}
                custom={direction}
                variants={isBravo ? scaleVariants : slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={isBravo
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
                  const dayHasCritical = hasCritical(dayRepairs)
                  const isHovered = hoveredDay === key

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.015, duration: 0.2, ease: 'easeOut' }}
                      className="relative"
                      onMouseEnter={() => hasRepairs && setHoveredDay(key)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <motion.button
                        whileHover={hasRepairs ? { scale: 1.08, y: -2 } : { scale: 1.03 }}
                        whileTap={hasRepairs ? { scale: 0.95 } : {}}
                        onClick={() => hasRepairs && setSelected(selected === key ? null : key)}
                        className={`relative w-full aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                          todayCell
                            ? isBravo
                              ? 'bg-gradient-to-br from-bravo-accent/20 to-bravo-accent-warm/20 border border-bravo-accent/35 text-bravo-text shadow-bravo-glow font-bold'
                              : 'bg-gradient-to-br from-cyan-500/25 to-purple-500/25 border border-cyan-500/50 text-white shadow-[0_0_10px_rgba(6,182,212,0.12)] font-bold'
                            : pastCell
                              ? isBravo ? 'text-stone-300' : 'text-gray-700'
                              : isBravo ? 'text-bravo-text hover:bg-bravo-input/40' : 'text-gray-400 hover:bg-gray-800/40'
                        } ${
                          hasRepairs && !todayCell
                            ? isBravo
                              ? 'border border-bravo-accent/25 text-bravo-text cursor-pointer bg-bravo-accent/5 shadow-xs'
                              : 'border border-cyan-500/20 text-white cursor-pointer bg-cyan-950/5'
                            : ''
                        } ${
                          selected === key
                            ? isBravo
                              ? 'border border-bravo-accent bg-bravo-accent/12 shadow-bravo-glow text-bravo-text font-bold'
                              : 'border border-cyan-500 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.2)] font-bold'
                            : ''
                        } ${
                          dayHasCritical
                            ? 'critical-cell-glow border-rose-500/40'
                            : ''
                        }`}
                        style={
                          hasRepairs && isHovered && !dayHasCritical
                            ? { boxShadow: `0 0 15px rgba(${accentRgb},0.18), 0 0 30px rgba(${accentRgb},0.06)` }
                            : undefined
                        }
                      >
                        {/* Radar ping ring on today */}
                        {todayCell && (
                          <span
                            className="radar-ring absolute inset-0 rounded-xl pointer-events-none"
                            style={{
                              border: `2px solid rgba(${accentRgb}, 0.35)`,
                            }}
                          />
                        )}
                        <span className="relative z-10">{day}</span>
                        {hasRepairs && (
                          <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1 relative z-10">
                            {dayRepairs.slice(0, 3).map((r, idx) => (
                              <span key={idx} className={`w-1.5 h-1.5 rounded-full ${statusColors[r.status] || 'bg-gray-500'}`} />
                            ))}
                            {dayRepairs.length > 3 && (
                              <span className="text-gray-500" style={{ fontSize: '8px' }}>+{dayRepairs.length - 3}</span>
                            )}
                          </div>
                        )}
                      </motion.button>

                      {/* ── Hover Tooltip ── */}
                      <AnimatePresence>
                        {isHovered && hasRepairs && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.92 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
                            style={{ minWidth: '140px', maxWidth: '200px' }}
                          >
                            <div className={`border rounded-lg px-3 py-2 shadow-xl ${
                              isBravo ? 'bg-bravo-card border-bravo-border text-bravo-text' : 'bg-gray-900 border-cyan-500/30'
                            }`}>
                              <p className={`text-[10px] font-bold mb-1 ${isBravo ? 'text-bravo-accent' : 'text-cyan-400'}`}>
                                {dayRepairs.length} {dayRepairs.length === 1 ? 'entrega' : 'entregas'}
                              </p>
                              <p className="text-[9px] text-gray-400 leading-relaxed">
                                {buildTooltipContent(dayRepairs)}
                              </p>
                            </div>
                            {/* Tooltip arrow */}
                            <div className={`absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 border-r border-b ${
                              isBravo ? 'bg-bravo-card border-bravo-border' : 'bg-gray-900 border-cyan-500/30'
                            }`} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Selected Day Popup ── */}
          <AnimatePresence>
            {selected && repairsByDate[selected] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className={`mt-4 border rounded-xl overflow-hidden text-left ${isBravo ? 'border-bravo-border bg-bravo-card/85 shadow-xs' : 'border-gray-800/60 bg-gray-950/10'}`}
              >
                <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isBravo ? 'bg-bravo-input/20 border-bravo-border' : 'bg-gray-900/40 border-gray-800/60'}`}>
                  <p className={`text-xs font-semibold ${isBravo ? 'text-bravo-text' : 'text-gray-300'}`}>
                    Entregas del {new Date(selected + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isBravo ? 'bg-bravo-accent/12 text-bravo-accent' : 'bg-cyan-500/10 text-cyan-400'
                  }`}>
                    {repairsByDate[selected].length} {repairsByDate[selected].length === 1 ? 'orden' : 'órdenes'}
                  </span>
                </div>
                <div className={`divide-y ${isBravo ? 'divide-bravo-border/40' : 'divide-gray-850/50'}`}>
                  {repairsByDate[selected].map((r, idx) => {
                    const isCritical = r.status === 'critico'
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ x: isBravo ? 0 : -8, y: isBravo ? 8 : 0, opacity: 0 }}
                        animate={{ x: 0, y: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.04, duration: 0.25, ease: "easeOut" }}
                        className={`w-full p-4 transition-colors ${isBravo ? 'hover:bg-bravo-input/30' : 'hover:bg-gray-950/20'} ${
                          isCritical ? (isBravo ? 'border-l-4 border-rose-500 bg-rose-50/50' : 'border-l-4 border-rose-500 bg-rose-950/5') : ''
                        }`}
                      >
                        <div
                          onClick={() => !isBravo && navigate(`/repairs/${r.id}`)}
                          className={`flex items-center gap-3 ${isBravo ? '' : 'cursor-pointer group'}`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[r.status] || 'bg-gray-500'}`} />
                          <span className={`font-mono text-xs font-bold shrink-0 ${isBravo ? 'text-bravo-accent' : 'text-cyan-400'}`}>
                            {r.order_number}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className={`text-xs font-semibold block ${isBravo ? 'text-bravo-text' : 'text-gray-300'}`}>{r.brand} {r.model}</span>
                            {r.client && (
                              <span className={`text-[10px] block ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>
                                Cliente: {r.client.name} {r.client.phone ? `(${r.client.phone})` : ''}
                              </span>
                            )}
                          </div>
                          {/* Critical badge */}
                          {isCritical && (
                            <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full critical-cell-glow">
                              <Flame size={9} />
                              Crítico
                            </span>
                          )}
                          {!isBravo && (
                            <ChevronIcon size={12} className="text-gray-600 shrink-0 ml-auto group-hover:text-gray-400 transition-colors" />
                          )}
                        </div>
                        {interactive && (
                          <div className={`mt-3 pt-2.5 border-t flex flex-wrap items-center gap-4 text-left ${isBravo ? 'border-bravo-border/40' : 'border-gray-850/30'}`}>
                            <label className={`text-[10px] flex items-center gap-1 font-semibold uppercase tracking-wider ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>
                              <Clock size={10} className={isBravo ? "text-bravo-accent" : "text-cyan-400"} /> Re-programar Entrega:
                            </label>
                            <input
                              type="date"
                              defaultValue={r.estimated_delivery}
                              onChange={(e) => handleReschedule(r.id, e.target.value)}
                              className={`text-xs px-2.5 py-1 rounded-lg focus:outline-none transition-all ${
                                isBravo
                                  ? "bg-bravo-input border border-bravo-border text-bravo-text focus:border-bravo-accent/50"
                                  : "bg-gray-950 border border-gray-800 text-gray-300 focus:border-cyan-500/50"
                              }`}
                            />
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ───────── SIDEBAR: Upcoming + Legend ───────── */}
        <div className={`rounded-2xl p-5 text-left flex flex-col ${isBravo ? 'bg-bravo-card border border-bravo-border shadow-xs' : 'bg-gray-900/40 backdrop-blur-sm border border-gray-800/50'}`}>
          <h3 className={`font-bold text-sm tracking-wider flex items-center gap-2 mb-5 ${isBravo ? 'text-bravo-text' : 'text-gray-300'}`}>
            <Clock size={16} className={isBravo ? 'text-bravo-accent-warm' : 'text-purple-400'} />
            Próximas Entregas
          </h3>

          {/* ── Loading Skeleton with Shimmer ── */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <div className="h-16 shimmer-skeleton rounded-xl" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className={`mx-auto mb-2 ${isBravo ? 'text-bravo-accent/40' : 'text-gray-800'}`} />
              <p className={`${isBravo ? 'text-bravo-text-muted' : 'text-gray-655'} text-xs text-center w-full`}>Sin entregas programadas</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {upcoming.map((r, i) => {
                const delivery = new Date(r.estimated_delivery + 'T12:00:00')
                const diffDays = Math.ceil((delivery - new Date()) / (1000 * 60 * 60 * 24))
                const isUrgent = diffDays <= 1
                const isWarning = diffDays <= 3
                const isCritical = r.status === 'critico'
                const urgency = getUrgencyInfo(diffDays)

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    onClick={() => navigate(`/repairs/${r.id}`)}
                    className={`w-full text-left border rounded-xl p-3 transition-all relative overflow-hidden ${
                      isCritical
                        ? isBravo
                          ? 'border-rose-300 bg-rose-50/50 shadow-sm critical-cell-glow'
                          : 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 via-rose-950/10 to-transparent shadow-[0_0_10px_rgba(244,63,94,0.08)] critical-cell-glow'
                        : isBravo
                          ? 'bg-bravo-input/40 border-bravo-border hover:bg-bravo-input/80 hover:border-bravo-accent/30 cursor-pointer'
                          : 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/60 hover:border-gray-600/50 cursor-pointer'
                    }`}
                  >
                    {/* Critical animated gradient overlay */}
                    {isCritical && (
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-rose-500/5 pointer-events-none" />
                    )}

                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                           <p className={`font-mono text-xs font-bold ${isBravo ? 'text-bravo-accent' : 'text-cyan-400'}`}>
                            {r.order_number}
                          </p>
                          {isCritical && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/15 border border-rose-500/25 px-1.5 py-px rounded-full">
                              <Flame size={7} />
                              Prioridad Alta
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${isBravo ? 'text-bravo-text' : 'text-gray-300'}`}>
                          {isBravo ? `${r.device_type} (${r.brand} ${r.model})` : `${r.brand} ${r.model}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-bold flex items-center gap-1 justify-end ${
                          isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-gray-400'
                        }`}>
                          {isUrgent && <AlertCircle size={10} />}
                          {diffDays <= 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : `${diffDays}d`}
                        </p>
                        <p className={`text-xs mt-0.5 ${isBravo ? 'text-bravo-text-muted' : 'text-gray-650'}`}>
                          {delivery.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>

                    {/* ── Progress Bar ── */}
                    <div className="mt-2.5 relative z-10">
                      <div className={`w-full h-[3px] rounded-full overflow-hidden ${isBravo ? 'bg-bravo-border' : 'bg-gray-800/80'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${urgency.percent}%` }}
                          transition={{ delay: i * 0.06 + 0.2, duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${urgency.color}`}
                          style={urgency.glow ? { boxShadow: '0 0 8px rgba(244,63,94,0.4)' } : undefined}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* ── Interactive Legend (Always Available) ── */}
          <div className={`mt-5 pt-4 border-t ${isBravo ? 'border-bravo-border' : 'border-gray-800/50'}`}>
            <div className="flex items-center justify-between mb-2.5">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isBravo ? 'text-bravo-text-muted' : 'text-gray-655'}`}>Estados</p>
              {statusFilters.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setStatusFilters([])}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                    isBravo
                      ? 'text-bravo-accent bg-bravo-accent/12 hover:bg-bravo-accent/20'
                      : 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                  }`}
                >
                  Limpiar
                </motion.button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const isActive = statusFilters.includes(status)
                return (
                  <motion.button
                    key={status}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => toggleStatusFilter(status)}
                    className={`flex items-center gap-1.5 py-1 px-1.5 rounded-md text-left transition-all cursor-pointer ${
                      isActive
                        ? isBravo
                          ? 'bg-bravo-accent/12 text-bravo-accent'
                          : 'bg-cyan-500/10 text-cyan-300'
                        : isBravo
                          ? 'text-bravo-text-muted hover:text-bravo-text'
                          : 'text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 breath-dot ${statusColors[status]}`}
                      style={isActive ? { animationDuration: '1.5s' } : undefined}
                    />
                    <span className="text-xs truncate">{label}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}