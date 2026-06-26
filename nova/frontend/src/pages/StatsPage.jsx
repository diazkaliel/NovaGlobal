import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Activity, Wrench, DollarSign, Sparkles, Clock, Cpu } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import { getRepairStats } from '../api/repairs'

function InteractiveLineChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  
  if (data.length === 0) {
    return (
      <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 text-center min-h-[200px] flex items-center justify-center">
        <p className="text-gray-500 text-xs">Sin datos de ingresos suficientes</p>
      </div>
    )
  }

  const maxIncome = Math.max(...data.map(d => d.income), 1000)
  const points = data.map((d, i) => {
    const x = 40 + i * (420 / Math.max(data.length - 1, 1))
    const y = 170 - (d.income / maxIncome) * 140
    return { x, y, ...d }
  })
  
  const pathD = data.length > 1 
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : `M 40 ${points[0].y} L 460 ${points[0].y}`
    
  const areaD = data.length > 1
    ? `${pathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`
    : `M 40 ${points[0].y} L 460 ${points[0].y} L 460 170 L 40 170 Z`

  return (
    <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 text-left">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Historial de Ingresos Semestral</h4>
      
      <svg viewBox="0 0 500 200" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cyan-400)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-cyan-400)" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = 170 - ratio * 140
          return (
            <line key={idx} x1="40" y1={y} x2="460" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          )
        })}
        
        <path d={areaD} fill="url(#chartGradient)" />
        <path d={pathD} fill="none" stroke="var(--color-cyan-400)" strokeWidth="2.5" filter="url(#glow)" />
        
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={hoveredPoint === idx ? 6 : 4}
            fill={hoveredPoint === idx ? 'var(--color-purple-400)' : 'var(--color-cyan-400)'}
            stroke="#050508"
            strokeWidth="1.5"
            className="transition-all duration-150 cursor-pointer"
            onMouseEnter={() => setHoveredPoint(idx)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
        
        {points.map((p, idx) => (
          <text key={idx} x={p.x} y="190" textAnchor="middle" fill="#475569" className="text-[10px] font-semibold">{p.month}</text>
        ))}
      </svg>

      <AnimatePresence>
        {hoveredPoint !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-gray-950 border border-gray-800 p-2.5 rounded-lg shadow-xl pointer-events-none text-left z-20"
          >
            <p className="text-[10px] font-bold text-purple-400 uppercase">{data[hoveredPoint].month}</p>
            <p className="text-xs font-bold text-white mt-0.5">Ingresos: <span className="text-cyan-400">${data[hoveredPoint].income.toLocaleString('es-CL')}</span></p>
            <p className="text-[10px] text-gray-500 mt-0.5">Reparaciones: {data[hoveredPoint].repairs} equipos</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DeviceDistributionChart({ data = [] }) {
  const [activeIndex, setActiveIndex] = useState(null)
  
  const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0)
  
  if (totalPercentage === 0) {
    return (
      <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 text-center min-h-[200px] flex items-center justify-center w-full">
        <p className="text-gray-500 text-xs">Sin datos de equipos para graficar</p>
      </div>
    )
  }

  const r = 40
  const circ = 2 * Math.PI * r
  let accumulatedPercent = 0

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6 text-left">
      <div className="relative w-36 h-36 flex-shrink-0 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
          
          {data.map((item, idx) => {
            const strokeDashOffset = circ - (item.percentage / 100) * circ
            const strokeDashArray = circ
            const rotationOffset = (accumulatedPercent / 100) * circ
            accumulatedPercent += item.percentage
            
            if (item.percentage === 0) return null
            
            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={r}
                fill="transparent"
                stroke={item.color}
                strokeWidth={activeIndex === idx ? 12 : 9}
                strokeDasharray={strokeDashArray}
                strokeDashoffset={strokeDashOffset}
                style={{
                  strokeDashoffset: strokeDashOffset,
                  transformOrigin: '50px 50px',
                  transform: `rotate(${(rotationOffset / circ) * 360}deg)`,
                }}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            )
          })}
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeIndex !== null ? (
            <>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{data[activeIndex].name}</p>
              <p className="text-lg font-black text-white">{data[activeIndex].percentage}%</p>
            </>
          ) : (
            <>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Equipos</p>
              <p className="text-lg font-black text-white">100%</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-2 text-left w-full">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Distribución por Dispositivo</h4>
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
              activeIndex === idx ? 'bg-gray-800/40' : ''
            }`}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-gray-300">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-white">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_repairs: 0,
    success_rate: 100.0,
    total_earnings: 0.0,
    avg_sla_hours: 24,
    device_share: [],
    income_history: []
  })

  useEffect(() => {
    getRepairStats({ system: 'nova' })
      .then(res => {
        setStats(res.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
  
  const vitalStats = [
    { label: 'Tasa de Éxito', value: `${stats.success_rate}%`, icon: Sparkles, color: 'text-cyan-400', desc: 'Reparaciones sin reclamos' },
    { label: 'Trabajos Realizados', value: `${stats.total_repairs}`, icon: Wrench, color: 'text-purple-400', desc: 'Historial total de Nova' },
    { label: 'Ganancia Estimada', value: `$${stats.total_earnings.toLocaleString('es-CL')}`, icon: DollarSign, color: 'text-emerald-400', desc: 'Acumulado Nova' },
    { label: 'Tiempo Promedio SLA', value: `${stats.avg_sla_hours}h`, icon: Clock, color: 'text-blue-400', desc: 'Promedio de entrega' }
  ]

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Activity size={16} />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-bold tracking-widest text-gray-300 uppercase leading-none">
                  Estadísticas Vitales
                </h1>
                <p className="text-gray-650 text-[9px] uppercase tracking-wider mt-0.5">Nova Tecnologies</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 w-full flex-1 space-y-6">
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-28 bg-gray-950/60 border border-gray-800/60 rounded-2xl p-5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vitalStats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-950/60 border border-gray-800/60 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between shadow-lg text-left"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  <stat.icon size={14} className={stat.color} />
                </div>
                <p className="text-2xl font-black text-white truncate">{stat.value}</p>
                <p className="text-[10px] text-gray-500 mt-1">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts Container */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-64 bg-gray-950/60 border border-gray-800/60 rounded-2xl" />
            <div className="h-64 bg-gray-950/60 border border-gray-800/60 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InteractiveLineChart data={stats.income_history} />
            <DeviceDistributionChart data={stats.device_share} />
          </div>
        )}

        {/* Vital Health Metrics Bar */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-2xl p-4.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md">
          <div className="flex items-center gap-2 text-xs">
            <Cpu size={14} className="text-cyan-400" />
            <span className="text-gray-500">Estado del Taller & Servidores:</span>
            <span className="text-emerald-400 font-bold">100% Operativo / Estable</span>
          </div>
          
          <div className="flex items-center gap-5 text-[11px] text-gray-500">
            <div>
              Carga CPU: <span className="text-gray-300 font-bold">12%</span>
            </div>
            <div>
              Latencia DB: <span className="text-gray-300 font-bold">18ms</span>
            </div>
            <div>
              Sesiones: <span className="text-gray-300 font-bold">4 Activas</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
