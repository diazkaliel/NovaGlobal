import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle } from 'lucide-react'
import { getUpcomingDeliveries } from '../api/repairs'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  recibido:            'bg-blue-500',
  diagnostico:         'bg-yellow-500',
  esperando_repuesto:  'bg-orange-500',
  presupuesto_enviado: 'bg-purple-500',
  en_reparacion:       'bg-cyan-500',
  listo:               'bg-emerald-500',
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function DeliveryCalendar() {
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [today] = useState(new Date())
  const [current, setCurrent] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUpcomingDeliveries(60)
      .then(res => setRepairs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Agrupa reparaciones por fecha
  const repairsByDate = repairs.reduce((acc, r) => {
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

  const prevMonth = () => setCurrent(c => {
    if (c.month === 0) return { year: c.year - 1, month: 11 }
    return { ...c, month: c.month - 1 }
  })

  const nextMonth = () => setCurrent(c => {
    if (c.month === 11) return { year: c.year + 1, month: 0 }
    return { ...c, month: c.month + 1 }
  })

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
  const upcoming = repairs
    .filter(r => r.estimated_delivery)
    .sort((a, b) => new Date(a.estimated_delivery) - new Date(b.estimated_delivery))
    .slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Calendario */}
      <div className="lg:col-span-2 bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-sm tracking-wider text-gray-300 flex items-center gap-2">
            <Calendar size={16} className="text-cyan-400" />
            Calendario de Entregas
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              {MONTHS[current.month]} {current.year}
            </span>
            <div className="flex gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-gray-600 font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-1">
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
                whileHover={hasRepairs ? { scale: 1.1 } : {}}
                whileTap={hasRepairs ? { scale: 0.95 } : {}}
                onClick={() => hasRepairs && setSelected(selected === key ? null : key)}
                className={`
                  relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-xs font-medium transition-all
                  ${todayCell
                    ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/50 text-white'
                    : pastCell
                    ? 'text-gray-700'
                    : 'text-gray-400 hover:bg-gray-800/50'
                  }
                  ${hasRepairs && !todayCell ? 'border border-gray-700/50 text-white cursor-pointer' : ''}
                  ${selected === key ? 'border border-cyan-500/70 bg-cyan-500/10' : ''}
                `}
              >
                <span>{day}</span>
                {hasRepairs && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                    {dayRepairs.slice(0, 3).map((r, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-500'}`}
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
        </div>

        {/* Popup del día seleccionado */}
        <AnimatePresence>
          {selected && repairsByDate[selected] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 border border-gray-700/50 rounded-xl overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-gray-800/50 border-b border-gray-700/50">
                <p className="text-xs font-semibold text-gray-300">
                  Entregas del {new Date(selected + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              {repairsByDate[selected].map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/repairs/${r.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors border-b border-gray-800/30 last:border-0"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[r.status] || 'bg-gray-500'}`} />
                  <span className="text-cyan-400 font-mono text-xs font-bold shrink-0">{r.order_number}</span>
                  <span className="text-gray-300 text-xs truncate">{r.brand} {r.model}</span>
                  <ChevronRight size={12} className="text-gray-600 shrink-0 ml-auto" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panel de próximas entregas */}
      <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-5">
        <h3 className="font-bold text-sm tracking-wider text-gray-300 flex items-center gap-2 mb-5">
          <Clock size={16} className="text-purple-400" />
          Próximas Entregas
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-800/50 rounded-xl animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={32} className="mx-auto text-gray-800 mb-2" />
            <p className="text-gray-600 text-xs">Sin entregas programadas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r, i) => {
              const delivery = new Date(r.estimated_delivery + 'T12:00:00')
              const diffDays = Math.ceil((delivery - new Date()) / (1000 * 60 * 60 * 24))
              const isUrgent = diffDays <= 1
              const isWarning = diffDays <= 3

              return (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/repairs/${r.id}`)}
                  className="w-full text-left bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/30 hover:border-gray-600/50 rounded-xl p-3 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-cyan-400 font-mono text-xs font-bold">{r.order_number}</p>
                      <p className="text-gray-300 text-xs truncate mt-0.5">{r.brand} {r.model}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-bold flex items-center gap-1 justify-end ${
                        isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-gray-400'
                      }`}>
                        {isUrgent && <AlertCircle size={10} />}
                        {diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : `${diffDays}d`}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {delivery.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-5 pt-4 border-t border-gray-800/50">
          <p className="text-gray-600 text-xs mb-2">Estados</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                <span className="text-gray-600 text-xs truncate capitalize">
                  {status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}