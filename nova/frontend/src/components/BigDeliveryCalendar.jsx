import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Flame, 
  Maximize, 
  Minimize, 
  Tv, 
  Search, 
  TrendingUp, 
  Cpu, 
  Laptop, 
  Smartphone, 
  Gamepad2, 
  Tablet, 
  Sparkles, 
  X,
  CalendarDays,
  ListTodo
} from 'lucide-react'
import { getRepairs, updateRepair } from '../api/repairs'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  recibido:            'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  diagnostico:         'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
  esperando_repuesto:  'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]',
  presupuesto_enviado: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]',
  en_reparacion:       'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]',
  listo:               'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
  critico:             'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse border border-rose-400',
  en_garantia:         'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]',
}

const STATUS_BG_MUTED = {
  recibido:            'bg-blue-500/10 border-blue-500/30 text-blue-400',
  diagnostico:         'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  esperando_repuesto:  'bg-orange-500/10 border-orange-500/30 text-orange-400',
  presupuesto_enviado: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  en_reparacion:       'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  listo:               'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  critico:             'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[inset_0_0_8px_rgba(244,63,94,0.15)]',
  en_garantia:         'bg-pink-500/10 border-pink-500/30 text-pink-400',
}

const STATUS_LABELS = {
  recibido: 'Recibido',
  diagnostico: 'Diagnóstico',
  esperando_repuesto: 'Espera Repuesto',
  presupuesto_enviado: 'Pto. Enviado',
  en_reparacion: 'En Reparación',
  listo: 'Listo',
  critico: 'Crítico 🚨',
  en_garantia: 'En Garantía'
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// Retorna un icono según el tipo de dispositivo o marca
function getDeviceIcon(deviceType) {
  const type = (deviceType || '').toLowerCase()
  if (type.includes('celular') || type.includes('telefono') || type.includes('iphone') || type.includes('teléfono')) {
    return <Smartphone size={12} className="text-cyan-400" />
  }
  if (type.includes('laptop') || type.includes('notebook') || type.includes('computador') || type.includes('macbook')) {
    return <Laptop size={12} className="text-purple-400" />
  }
  if (type.includes('consola') || type.includes('ps5') || type.includes('xbox') || type.includes('nintendo') || type.includes('play')) {
    return <Gamepad2 size={12} className="text-orange-400" />
  }
  if (type.includes('tablet') || type.includes('ipad')) {
    return <Tablet size={12} className="text-emerald-400" />
  }
  return <Cpu size={12} className="text-gray-400" />
}

export default function BigDeliveryCalendar({ system = 'nova' }) {
  const navigate = useNavigate()
  const calendarRef = useRef(null)

  // Estados del calendario
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const [today] = useState(new Date())
  const [selectedRepair, setSelectedRepair] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week' | 'timeline'
  
  // Controles de interactividad y proyección
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState([])
  const [isTvMode, setIsTvMode] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [direction, setDirection] = useState(0)

  // Animación del indicador LIVE
  const [pulseLive, setPulseLive] = useState(false)

  // Fetch de reparaciones
  const fetchRepairs = (isSilent = false) => {
    if (!isSilent) setLoading(true)
    setPulseLive(true)
    getRepairs({ system })
      .then(res => {
        // Filtramos para obtener reparaciones estimadas que no estén entregadas ni canceladas
        const valid = res.data.filter(r => r.estimated_delivery && !['entregado', 'cancelado'].includes(r.status))
        setRepairs(valid)
        setLastRefreshed(new Date())
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false)
        setTimeout(() => setPulseLive(false), 1000)
      })
  }

  // Carga inicial y auto-refresco cada 45 segundos para proyección
  useEffect(() => {
    fetchRepairs()
    const interval = setInterval(() => {
      fetchRepairs(true)
    }, 45000)
    return () => clearInterval(interval)
  }, [system])

  // Manejo de reprogramación interactiva
  const handleReschedule = async (repairId, newDate) => {
    if (!newDate) return
    try {
      setLoading(true)
      await updateRepair(repairId, { estimated_delivery: newDate })
      // Actualizar localmente la reparación seleccionada si corresponde
      if (selectedRepair && selectedRepair.id === repairId) {
        setSelectedRepair(prev => ({ ...prev, estimated_delivery: newDate }))
      }
      fetchRepairs(true)
    } catch (err) {
      console.error(err)
      alert("Error al reprogramar la entrega de la orden.")
    } finally {
      setLoading(false)
    }
  }

  // Pantalla Completa nativa (Fullscreen API)
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      calendarRef.current.requestFullscreen().then(() => {
        setIsFullScreen(true)
      }).catch(err => {
        console.error(`Error al intentar pantalla completa: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
      setIsFullScreen(false)
    }
  }

  // Escuchar cambios de fullscreen nativo (por ejemplo si se sale con ESC)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Filtrado de reparaciones en tiempo real
  const filteredRepairs = repairs.filter(r => {
    if (statusFilters.length > 0 && !statusFilters.includes(r.status)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const client = r.client?.name?.toLowerCase() || ''
      const order = r.order_number?.toLowerCase() || ''
      const brand = r.brand?.toLowerCase() || ''
      const model = r.model?.toLowerCase() || ''
      const issue = r.reported_issue?.toLowerCase() || ''
      return client.includes(q) || order.includes(q) || brand.includes(q) || model.includes(q) || issue.includes(q)
    }
    return true
  })

  // Agrupamiento por fecha para fácil consulta
  const repairsByDate = filteredRepairs.reduce((acc, r) => {
    const key = r.estimated_delivery.split('T')[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  // Calendario: Construcción del mes
  const firstDayIndex = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()
  
  // Agregar días del mes anterior para rellenar la cuadrícula
  const prevMonthDaysCount = new Date(current.year, current.month, 0).getDate()
  const prevDays = Array.from({ length: firstDayIndex }, (_, i) => {
    return {
      day: prevMonthDaysCount - firstDayIndex + i + 1,
      isCurrentMonth: false,
      monthOffset: -1
    }
  })

  // Días del mes actual
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => {
    return {
      day: i + 1,
      isCurrentMonth: true,
      monthOffset: 0
    }
  })

  // Días del mes siguiente para completar cuadrícula (hasta 42 celdas)
  const totalCellsNeeded = 42
  const nextDaysCount = totalCellsNeeded - (prevDays.length + currentDays.length)
  const nextDays = Array.from({ length: nextDaysCount }, (_, i) => {
    return {
      day: i + 1,
      isCurrentMonth: false,
      monthOffset: 1
    }
  })

  const allCells = [...prevDays, ...currentDays, ...nextDays]

  // Navegación de meses
  const changeMonth = (offset) => {
    setDirection(offset)
    setCurrent(c => {
      let newMonth = c.month + offset
      let newYear = c.year
      if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
      } else if (newMonth > 11) {
        newMonth = 0
        newYear += 1
      }
      return { year: newYear, month: newMonth }
    })
  }

  // Helpers de verificación de fecha
  const getDateKey = (cell) => {
    let m = current.month + cell.monthOffset
    let y = current.year
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    const mStr = String(m + 1).padStart(2, '0')
    const dStr = String(cell.day).padStart(2, '0')
    return `${y}-${mStr}-${dStr}`
  }

  const checkIsToday = (cell) => {
    if (cell.monthOffset !== 0) return false
    return cell.day === today.getDate() &&
      current.month === today.getMonth() &&
      current.year === today.getFullYear()
  }

  const checkIsPast = (cell) => {
    let m = current.month + cell.monthOffset
    let y = current.year
    if (m < 0) { m = 11; y -= 1 }
    else if (m > 11) { m = 0; y += 1 }
    const cellDate = new Date(y, m, cell.day)
    cellDate.setHours(0,0,0,0)
    const t = new Date()
    t.setHours(0,0,0,0)
    return cellDate < t
  }

  // Métricas mensuales simplificadas y de alta visibilidad para proyección
  const stats = (() => {
    const todayStr = today.toISOString().split('T')[0]
    const todayRepairs = filteredRepairs.filter(r => r.estimated_delivery.split('T')[0] === todayStr)

    const totalMonthRepairs = filteredRepairs.filter(r => {
      const d = new Date(r.estimated_delivery)
      return d.getMonth() === current.month && d.getFullYear() === current.year
    })
    const ready = totalMonthRepairs.filter(r => r.status === 'listo').length
    const critical = totalMonthRepairs.filter(r => r.status === 'critico').length

    return { todayCount: todayRepairs.length, ready, critical, total: totalMonthRepairs.length }
  })()

  // Lista de próximas entregas para el panel lateral
  const upcomingDeliveries = [...filteredRepairs]
    .sort((a, b) => new Date(a.estimated_delivery) - new Date(b.estimated_delivery))
    .slice(0, 8)

  return (
    <>
      <style>{`
        /* Efecto de borde dinámico neón en rotación */
        @keyframes gradient-border {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animated-border-flow {
          position: relative;
          background: #0d0e12;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .animated-border-flow::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(90deg, #f43f5e, #f97316, #ef4444, #f43f5e);
          background-size: 300% 300%;
          border-radius: 13px;
          z-index: -1;
          animation: gradient-border 3s ease infinite;
          opacity: 0.85;
          filter: blur(2px);
        }

        .animated-border-flow-today::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(90deg, var(--color-cyan-400), var(--color-purple-400), var(--color-blue-400), var(--color-cyan-400));
          background-size: 300% 300%;
          border-radius: 13px;
          z-index: -1;
          animation: gradient-border 4s ease infinite;
          opacity: 0.85;
          filter: blur(2px);
        }

        /* Efecto respiración / latido para estado crítico */
        @keyframes pulse-critical-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(244,63,94,0.15), inset 0 0 5px rgba(244,63,94,0.1);
            border-color: rgba(244,63,94,0.3);
          }
          50% {
            box-shadow: 0 0 25px rgba(244,63,94,0.45), inset 0 0 12px rgba(244,63,94,0.25);
            border-color: rgba(244,63,94,0.7);
          }
        }
        .critical-glow-pulse {
          animation: pulse-critical-glow 2s infinite ease-in-out;
        }

        /* Desvanecimiento de scrollbars */
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }
      `}</style>

      <div 
        ref={calendarRef}
        className={`w-full flex flex-col bg-[#050508] text-white select-none transition-all duration-300 relative ${
          isTvMode ? 'p-6 h-screen' : 'min-h-[82vh]'
        }`}
      >
        {/* ================= BARRA DE HERRAMIENTAS SUPERIOR ================= */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 relative z-20 pb-4 border-b border-gray-900/50">
          {/* Título e Indicador LIVE */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <CalendarDays size={20} className="animate-pulse" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent uppercase leading-none">
                  Entregas Proyectables
                </h2>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5 font-semibold">Taller Nova Tecnologies</p>
              </div>
            </div>

            {/* Badge de refresco LIVE */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-950 border border-gray-800/80">
              <span className={`w-2 h-2 rounded-full bg-emerald-550 relative ${pulseLive ? 'scale-125' : ''}`}>
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LIVE</span>
              <span className="text-[9px] text-gray-600 hidden sm:inline">
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Buscador & Controles (Ocultos en Modo TV Puro de Proyección si no hay interacción) */}
          <div className={`flex flex-wrap items-center gap-3 w-full md:w-auto justify-end transition-opacity duration-300 ${isTvMode ? 'opacity-85 hover:opacity-100' : ''}`}>
            {/* Buscador Integrado */}
            {!isTvMode && (
              <div className="relative min-w-[200px] max-w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar orden, cliente..."
                  className="w-full bg-gray-900/40 border border-gray-800 hover:border-gray-700/80 focus:border-cyan-500/50 focus:outline-none rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 transition-all placeholder-gray-500 backdrop-blur-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer">
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Selector de Vista */}
            <div className="flex bg-gray-950/80 p-1 border border-gray-800/80 rounded-xl">
              {[
                { id: 'month', label: 'Mes', icon: <CalendarDays size={12} /> },
                { id: 'week', label: 'Semana', icon: <Clock size={12} /> },
                { id: 'timeline', label: 'Timeline', icon: <ListTodo size={12} /> }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setViewMode(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === opt.id
                      ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
                  }`}
                >
                  {opt.icon}
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Botón de Modo Proyección TV */}
            <button
              onClick={() => setIsTvMode(!isTvMode)}
              className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                isTvMode 
                  ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                  : 'bg-gray-950/85 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900/50'
              }`}
              title="Modo Proyección para TV (Optimiza espacios y fuentes)"
            >
              <Tv size={16} className={isTvMode ? 'animate-bounce' : ''} />
            </button>

            {/* Botón Pantalla Completa */}
            <button
              onClick={toggleFullScreen}
              className="p-2 rounded-xl bg-gray-950/85 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900/50 flex items-center justify-center cursor-pointer transition-all"
              title="Pantalla Completa"
            >
              {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>

        {/* ================= CONTENEDOR PRINCIPAL ================= */}
        <div className={`grid grid-cols-1 ${isTvMode ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 flex-1 items-stretch`}>
          
          {/* ================= COLUMNA DEL CALENDARIO PRINCIPAL (VISTA GRANDE) ================= */}
          <div className={`${isTvMode ? 'lg:col-span-3' : 'lg:col-span-2'} flex flex-col justify-between bg-gray-900/25 border border-gray-850/50 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md`}>
            
            {/* Header del Calendario (Mes y Navegación) */}
            <div className="flex items-center justify-between mb-6 z-10">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold uppercase tracking-widest ${isTvMode ? 'text-lg text-cyan-400' : 'text-gray-400'}`}>
                  {MONTHS[current.month]} {current.year}
                </span>
                <span className="text-[10px] font-bold text-gray-650 bg-gray-950 px-2 py-0.5 rounded border border-gray-855">
                  {filteredRepairs.length} entregas filtradas
                </span>
              </div>

              {/* Botones de control mensual */}
              <div className="flex items-center gap-1.5 bg-gray-950/70 p-1 border border-gray-855 rounded-xl">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => changeMonth(-1)}
                  className="p-2 hover:bg-gray-900 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </motion.button>
                <button
                  onClick={() => setCurrent({ year: new Date().getFullYear(), month: new Date().getMonth() })}
                  className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1.5 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  Hoy
                </button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => changeMonth(1)}
                  className="p-2 hover:bg-gray-900 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </motion.button>
              </div>
            </div>

            {/* CUADRICULA DEL CALENDARIO SEGÚN LA VISTA */}
            <div className="flex-1 min-h-[460px] relative z-10 flex flex-col justify-between">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`${viewMode}-${current.year}-${current.month}`}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 50, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -direction * 50, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="w-full h-full flex-1 flex flex-col"
                >
                  {/* ====== VISTA DE MES ====== */}
                  {viewMode === 'month' && (
                    <div className="w-full flex-1 flex flex-col justify-between">
                      {/* Cabeceras de días de la semana */}
                      <div className="grid grid-cols-7 border-b border-gray-900/50 pb-2 mb-2">
                        {(isTvMode ? DAYS : DAYS_SHORT).map(d => (
                          <div 
                            key={d} 
                            className={`text-center text-[10px] font-extrabold uppercase tracking-widest text-gray-500`}
                          >
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Cuadrícula de 42 celdas */}
                      <div className="grid grid-cols-7 gap-2 flex-1 items-stretch">
                        {allCells.map((cell, idx) => {
                          const dateKey = getDateKey(cell);
                          const dayRepairs = repairsByDate[dateKey] || [];
                          const hasRepairs = dayRepairs.length > 0;
                          const isTodayCell = checkIsToday(cell);
                          const isPastCell = checkIsPast(cell);
                          const hasCriticalRepair = dayRepairs.some(r => r.status === 'critico');

                          // Estilo base de celda
                          let borderClass = 'border-gray-900/50 bg-gray-950/20';
                          let textClass = cell.isCurrentMonth ? 'text-gray-300' : 'text-gray-700';

                          if (isTodayCell) {
                            borderClass = 'border-cyan-500/40 bg-cyan-950/5 shadow-[0_0_15px_rgba(6,182,212,0.06)]';
                            textClass = 'text-white font-black';
                          } else if (hasRepairs) {
                            borderClass = 'border-gray-800 bg-gray-900/10 hover:border-gray-700';
                            textClass = cell.isCurrentMonth ? 'text-white font-bold' : 'text-gray-500';
                          }

                          return (
                            <motion.div
                              key={`${dateKey}-${idx}`}
                              whileHover={hasRepairs ? { scale: 1.02, y: -2, zIndex: 10 } : { scale: 1.01 }}
                              className={`rounded-xl border p-2 flex flex-col min-h-[75px] transition-all relative overflow-hidden group ${
                                hasCriticalRepair 
                                  ? 'animated-border-flow critical-glow-pulse' 
                                  : isTodayCell 
                                    ? 'animated-border-flow-today' 
                                    : borderClass
                              }`}
                            >
                              {/* Número de Día */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[11px] ${textClass}`}>
                                  {cell.day}
                                </span>
                                {isTodayCell && (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full border border-cyan-500/20 hidden sm:inline-block">
                                    HOY
                                  </span>
                                )}
                                {hasCriticalRepair && (
                                  <span className="text-[8px] font-bold text-rose-400 animate-pulse flex items-center gap-0.5">
                                    <Flame size={9} />
                                    <span className="hidden sm:inline">CRÍTICO</span>
                                  </span>
                                )}
                              </div>

                              {/* Lista de Reparaciones dentro del día - Versión Desktop/Tablet */}
                              <div className="hidden sm:flex flex-1 flex-col gap-1 overflow-y-auto custom-scroll max-h-[70px]">
                                {dayRepairs.slice(0, isTvMode ? 3 : 2).map(r => (
                                  <div
                                    key={r.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedRepair(r)
                                    }}
                                    className={`p-1 px-1.5 rounded-lg border text-[9px] cursor-pointer flex items-center gap-1.5 transition-all hover:translate-x-0.5 ${
                                      STATUS_BG_MUTED[r.status] || 'bg-gray-800 border-gray-700 text-gray-300'
                                    }`}
                                  >
                                    {getDeviceIcon(r.device_type)}
                                    <span className="font-mono font-bold shrink-0">{r.order_number}</span>
                                    <span className="truncate flex-1 hidden md:inline">{r.brand} {r.model}</span>
                                  </div>
                                ))}
                                
                                {/* Indicador de más elementos */}
                                {dayRepairs.length > (isTvMode ? 3 : 2) && (
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedRepair(dayRepairs[0])
                                    }}
                                    className="text-[8px] text-gray-500 font-bold hover:text-cyan-400 text-center cursor-pointer py-0.5 transition-colors"
                                  >
                                    + {dayRepairs.length - (isTvMode ? 3 : 2)} más...
                                  </div>
                                )}
                              </div>

                              {/* Versión Ultra-compacta para Móviles (Puntos de colores de estados) */}
                              <div className="flex sm:hidden items-center justify-center gap-1 mt-auto pt-1 flex-wrap">
                                {dayRepairs.slice(0, 4).map((r, idx) => (
                                  <span 
                                    key={idx} 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedRepair(r)
                                    }}
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      r.status === 'critico' ? 'bg-rose-500 animate-pulse' :
                                      r.status === 'listo' ? 'bg-emerald-500' :
                                      r.status === 'en_reparacion' ? 'bg-cyan-500' : 'bg-gray-500'
                                    }`} 
                                  />
                                ))}
                                {dayRepairs.length > 4 && (
                                  <span className="text-[7px] text-gray-500 font-bold">+{dayRepairs.length - 4}</span>
                                )}
                              </div>


                              {/* Efecto Glow de fondo al hacer hover */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ====== VISTA DE SEMANA ====== */}
                  {viewMode === 'week' && (
                    <div className="w-full flex-1 flex flex-col justify-between">
                      {/* Generar los 7 días de la semana seleccionada */}
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 flex-1 items-stretch">
                        {Array.from({ length: 7 }).map((_, idx) => {
                          // Calcular la fecha correspondiente
                          const currentWeekDay = new Date(current.year, current.month, 15) // día medio del mes para referencia
                          const startOfWeek = new Date(currentWeekDay)
                          startOfWeek.setDate(currentWeekDay.getDate() - currentWeekDay.getDay() + idx)
                          
                          const dKey = startOfWeek.toISOString().split('T')[0]
                          const dayRepairs = repairsByDate[dKey] || []
                          const isTodayCell = startOfWeek.toDateString() === today.toDateString()
                          const hasCritical = dayRepairs.some(r => r.status === 'critico')

                          return (
                            <div
                              key={idx}
                              className={`rounded-2xl border p-4 flex flex-col justify-between min-h-[300px] transition-all relative ${
                                isTodayCell
                                  ? 'border-cyan-500 bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.08)]'
                                  : hasCritical
                                    ? 'border-rose-500/30 bg-rose-950/5 critical-glow-pulse'
                                    : 'border-gray-850 bg-gray-950/30'
                              }`}
                            >
                              {/* Header del Día */}
                              <div className="border-b border-gray-900 pb-2 mb-3">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isTodayCell ? 'text-cyan-400' : 'text-gray-500'}`}>
                                  {DAYS[idx]}
                                </p>
                                <div className="flex items-baseline gap-2 mt-1">
                                  <span className="text-xl font-bold text-white">{startOfWeek.getDate()}</span>
                                  <span className="text-[10px] text-gray-500">
                                    {startOfWeek.toLocaleDateString('es-CL', { month: 'short' })}
                                  </span>
                                </div>
                              </div>

                              {/* Listado de entregas */}
                              <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scroll max-h-[350px] pr-1">
                                {dayRepairs.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-8 opacity-25">
                                    <Clock size={16} className="text-gray-500 mb-1" />
                                    <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500">Sin Entregas</span>
                                  </div>
                                ) : (
                                  dayRepairs.map(r => (
                                    <motion.div
                                      key={r.id}
                                      whileHover={{ scale: 1.03 }}
                                      onClick={() => setSelectedRepair(r)}
                                      className={`p-2.5 rounded-xl border text-[10px] cursor-pointer text-left relative overflow-hidden transition-all ${
                                        STATUS_BG_MUTED[r.status] || 'bg-gray-800 border-gray-700 text-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono font-black">{r.order_number}</span>
                                        {getDeviceIcon(r.device_type)}
                                      </div>
                                      <p className="text-white font-bold truncate">{r.brand} {r.model}</p>
                                      {r.client && (
                                        <p className="text-[9px] text-gray-400 truncate mt-0.5">Cl: {r.client.name}</p>
                                      )}
                                    </motion.div>
                                  ))
                                )}
                              </div>

                              {/* Footer de Celda */}
                              <div className="pt-2 border-t border-gray-900/60 mt-3 text-right">
                                <span className="text-[9px] font-bold text-gray-650 uppercase tracking-widest">
                                  {dayRepairs.length} {dayRepairs.length === 1 ? 'Entrega' : 'Entregas'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ====== VISTA DE TIMELINE (CRONOLÓGICO) ====== */}
                  {viewMode === 'timeline' && (
                    <div className="w-full flex-1 flex flex-col">
                      <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scroll pr-2">
                        {filteredRepairs.length === 0 ? (
                          <div className="text-center py-20">
                            <CalendarDays size={36} className="mx-auto text-gray-800 mb-3" />
                            <p className="text-gray-500 text-xs uppercase tracking-wider">No se encontraron entregas programadas</p>
                          </div>
                        ) : (
                          [...filteredRepairs]
                            .sort((a,b) => new Date(a.estimated_delivery) - new Date(b.estimated_delivery))
                            .map((r, i) => {
                              const devDate = new Date(r.estimated_delivery + 'T12:00:00')
                              const isTodayDev = devDate.toDateString() === today.toDateString()
                              const isCrit = r.status === 'critico'

                              return (
                                <motion.div
                                  key={r.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  onClick={() => setSelectedRepair(r)}
                                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all hover:bg-gray-900/20 ${
                                    isCrit
                                      ? 'border-rose-500/50 bg-rose-950/10 critical-glow-pulse'
                                      : isTodayDev
                                        ? 'border-cyan-500/40 bg-cyan-950/5'
                                        : 'border-gray-850 bg-gray-950/30 hover:border-gray-700'
                                  }`}
                                >
                                  {/* Izquierda: Fecha, Orden y Dispositivo */}
                                  <div className="flex items-center gap-4 text-left">
                                    <div className="text-center shrink-0 w-12 py-1.5 rounded-lg bg-gray-950 border border-gray-900">
                                      <p className="text-sm font-bold text-white leading-none">{devDate.getDate()}</p>
                                      <p className="text-[8px] font-black uppercase text-gray-500 tracking-wider mt-0.5">
                                        {devDate.toLocaleDateString('es-CL', { month: 'short' })}
                                      </p>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-mono text-xs font-black ${isCrit ? 'text-rose-400' : 'text-cyan-400'}`}>
                                          {r.order_number}
                                        </span>
                                        {r.device_type && (
                                          <span className="text-[8px] bg-gray-900 px-1.5 py-0.5 rounded text-gray-500 border border-gray-850">
                                            {r.device_type}
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-white text-xs font-bold mt-1">{r.brand} {r.model}</h4>
                                      <p className="text-[10px] text-gray-500">Cliente: {r.client?.name}</p>
                                    </div>
                                  </div>

                                  {/* Derecha: Estado, Urgencia y Icono */}
                                  <div className="flex items-center gap-4 ml-auto sm:ml-0">
                                    <div className="text-right">
                                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase border ${
                                        STATUS_BG_MUTED[r.status] || 'bg-gray-850 border-gray-800'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-500'}`} />
                                        {STATUS_LABELS[r.status] || r.status}
                                      </span>
                                      {r.reported_issue && (
                                        <p className="text-[9px] text-gray-600 truncate max-w-[150px] mt-1">Falla: {r.reported_issue}</p>
                                      )}
                                    </div>
                                    <ChevronRight size={14} className="text-gray-600" />
                                  </div>
                                </motion.div>
                              )
                            })
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ================= COLUMNA LATERAL (ANÁLISIS, ESTADÍSTICAS Y KPI'S) ================= */}
          <div className="bg-gray-900/25 border border-gray-850/50 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md relative">
            <div className="space-y-6">
              
              {/* Sección de KPI's Simplificada para Pantalla */}
              <div>
                <h3 className="font-extrabold text-xs tracking-widest text-cyan-400 uppercase flex items-center gap-2 mb-4">
                  <TrendingUp size={14} /> Foco Diario & Estado
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {/* Entregas HOY */}
                  <div className="bg-gray-950/70 p-3 rounded-xl border border-gray-850 flex flex-col items-center justify-center text-center">
                    <span className={`text-3xl font-black mb-1 ${
                      stats.todayCount > 0 ? 'text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]' : 'text-gray-600'
                    }`}>
                      {stats.todayCount}
                    </span>
                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Hoy</span>
                  </div>

                  {/* Críticos */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${
                    stats.critical > 0 
                      ? 'bg-rose-950/30 border-rose-500/40 critical-glow-pulse text-rose-400' 
                      : 'bg-gray-950/70 border-gray-850 text-gray-650'
                  }`}>
                    <span className="text-3xl font-black mb-1">
                      {stats.critical}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-wider">Urgentes</span>
                  </div>

                  {/* Listos */}
                  <div className="bg-gray-950/70 p-3 rounded-xl border border-gray-855 flex flex-col items-center justify-center text-center">
                    <span className={`text-3xl font-black mb-1 ${
                      stats.ready > 0 ? 'text-emerald-400' : 'text-gray-650'
                    }`}>
                      {stats.ready}
                    </span>
                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Listos</span>
                  </div>
                </div>

                <div className="mt-3 bg-gray-950/40 px-3 py-2.5 rounded-lg border border-gray-900 text-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    Mes actual: {stats.total} entregas programadas
                  </span>
                </div>
              </div>

              {/* Filtros Interactivos */}
              <div>
                <h3 className="font-extrabold text-xs tracking-widest text-purple-400 uppercase flex items-center gap-2 mb-3">
                  Filtros por Estado
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(STATUS_LABELS).map(([statusKey, label]) => {
                    const isActive = statusFilters.includes(statusKey)
                    const count = filteredRepairs.filter(r => r.status === statusKey).length

                    return (
                      <button
                        key={statusKey}
                        onClick={() => {
                          if (isActive) setStatusFilters(statusFilters.filter(s => s !== statusKey))
                          else setStatusFilters([...statusFilters, statusKey])
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                            : 'bg-transparent border-gray-900 text-gray-500 hover:text-gray-400 hover:border-gray-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[statusKey]}`} />
                        {label}
                        <span className="ml-1 text-[8px] bg-gray-950 px-1 rounded text-gray-500">{count}</span>
                      </button>
                    )
                  })}
                  {statusFilters.length > 0 && (
                    <button 
                      onClick={() => setStatusFilters([])} 
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-extrabold uppercase tracking-widest underline px-2 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Próximas entregas - Vertical Timeline */}
              <div className="text-left">
                <h3 className="font-extrabold text-xs tracking-widest text-orange-400 uppercase flex items-center gap-2 mb-3">
                  <Clock size={14} /> Cronograma Inmediato
                </h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scroll pr-1">
                  {upcomingDeliveries.length === 0 ? (
                    <div className="text-center py-8 opacity-25">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sin entregas próximas</p>
                    </div>
                  ) : (
                    upcomingDeliveries.map(r => {
                      const limit = new Date(r.estimated_delivery + 'T12:00:00')
                      const diffDays = Math.ceil((limit - new Date()) / (1000 * 60 * 60 * 24))
                      const isTodayDev = diffDays === 0
                      const isPastDev = diffDays < 0
                      
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRepair(r)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-gray-950/40 ${
                            r.status === 'critico'
                              ? 'border-rose-500/30 bg-rose-950/5'
                              : 'border-gray-900 bg-gray-955/30 hover:border-gray-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-black text-gray-400">{r.order_number}</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[r.status]}`} />
                            </div>
                            <h4 className="text-white text-xs font-bold truncate mt-0.5">{r.brand} {r.model}</h4>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-black uppercase ${
                              isPastDev 
                                ? 'text-gray-600' 
                                : isTodayDev 
                                  ? 'text-rose-400 animate-pulse' 
                                  : diffDays === 1 
                                    ? 'text-orange-400' 
                                    : 'text-gray-400'
                            }`}>
                              {isPastDev ? 'Atrasado' : isTodayDev ? 'Hoy' : diffDays === 1 ? 'Mañana' : `${diffDays} días`}
                            </span>
                            <p className="text-[9px] text-gray-600 mt-0.5">
                              {limit.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Créditos de Marca / Proyección */}
            <div className="pt-4 border-t border-gray-900/60 mt-6 flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase tracking-widest">
              <span>Nova Global OS</span>
              <span className="flex items-center gap-1">
                <Sparkles size={8} className="text-cyan-400 animate-spin" /> PROJECTION SUITE
              </span>
            </div>

          </div>

        </div>

        {/* ================= DRAWER (CAJÓN) DE DETALLES LATERAL ================= */}
        <AnimatePresence>
          {selectedRepair && (
            <>
              {/* Backdrop Oscuro con desenfoque */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedRepair(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
              />

              {/* Panel Deslizable */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-[#0c0d12] border-l border-gray-855 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 p-6 flex flex-col justify-between text-left overflow-y-auto"
              >
                <div>
                  {/* Header del Drawer */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-900 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-sm font-black">{selectedRepair.order_number}</span>
                      <span className="text-gray-500 font-bold">|</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        STATUS_BG_MUTED[selectedRepair.status]
                      }`}>
                        {STATUS_LABELS[selectedRepair.status] || selectedRepair.status}
                      </span>
                    </div>
                    <button 
                      onClick={() => setSelectedRepair(null)}
                      className="p-1.5 hover:bg-gray-900 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Cuerpo de Detalles */}
                  <div className="space-y-6">
                    
                    {/* Sección Dispositivo */}
                    <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-900">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                          {getDeviceIcon(selectedRepair.device_type)}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Equipo Técnico</p>
                          <h4 className="text-white text-base font-extrabold">{selectedRepair.brand} {selectedRepair.model}</h4>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs mt-3 pt-3 border-t border-gray-900/60">
                        <div>
                          <p className="text-gray-500 font-bold text-[9px] uppercase tracking-wider">Tipo</p>
                          <p className="text-gray-300 mt-0.5">{selectedRepair.device_type || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-bold text-[9px] uppercase tracking-wider">Contraseña Equipo</p>
                          <p className="text-gray-300 mt-0.5 font-mono bg-gray-900 px-2 py-0.5 rounded border border-gray-850 inline-block">
                            {selectedRepair.device_password || 'Ninguna'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Información del Cliente */}
                    <div className="space-y-2">
                      <h4 className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Información de Contacto</h4>
                      <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-900 space-y-3">
                        <div>
                          <p className="text-gray-500 font-bold text-[9px] uppercase tracking-wider">Nombre del Cliente</p>
                          <p className="text-gray-200 text-sm font-bold mt-0.5">{selectedRepair.client?.name || 'Anónimo'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-900/50">
                          <div>
                            <p className="text-gray-500 font-bold text-[9px] uppercase tracking-wider">Teléfono</p>
                            <p className="text-cyan-400 font-bold mt-0.5">{selectedRepair.client?.phone || 'Sin número'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-bold text-[9px] uppercase tracking-wider">Email</p>
                            <p className="text-gray-300 mt-0.5 truncate">{selectedRepair.client?.email || 'Sin email'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Falla Reportada */}
                    <div className="space-y-2">
                      <h4 className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Problema o Falla</h4>
                      <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-900">
                        <p className="text-xs text-gray-350 leading-relaxed italic">
                          "{selectedRepair.reported_issue || 'No hay descripción de la falla registrada.'}"
                        </p>
                      </div>
                    </div>

                    {/* Control de Reprogramación */}
                    <div className="space-y-3">
                      <h4 className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Reprogramar Fecha de Entrega</h4>
                      <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-900 flex flex-col gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                            <Clock size={12} className="text-cyan-400" /> Seleccionar Nueva Fecha:
                          </label>
                          <input
                            type="date"
                            defaultValue={selectedRepair.estimated_delivery ? selectedRepair.estimated_delivery.split('T')[0] : ''}
                            onChange={(e) => handleReschedule(selectedRepair.id, e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 text-gray-200 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                        <p className="text-[9px] text-gray-500 leading-relaxed">
                          ⚠️ Al cambiar la fecha de entrega, el calendario se reorganizará automáticamente y la ficha técnica en el servidor se actualizará.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Footer de Acciones del Drawer */}
                <div className="pt-4 border-t border-gray-900 mt-6 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedRepair(null)
                      navigate(`/repairs/${selectedRepair.id}`)
                    }}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold uppercase tracking-wider text-xs py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.35)] cursor-pointer text-center"
                  >
                    Ver Orden Completa
                  </button>
                  <button
                    onClick={() => setSelectedRepair(null)}
                    className="px-4 py-3 bg-gray-900 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer text-xs font-bold uppercase tracking-wider"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </>
  )
}
