import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Activity, Wrench, DollarSign, Sparkles, Clock, Cpu, TrendingUp, Layers, Percent } from 'lucide-react'
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

  const themeColor = '#22d3ee' // cyan-400
 
  return (
    <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 text-left">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Historial de Ingresos Semestral</h4>
      
      <svg viewBox="0 0 500 200" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
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
        <path d={pathD} fill="none" stroke={themeColor} strokeWidth="2.5" filter="url(#glow)" />
        
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={hoveredPoint === idx ? 6 : 4}
            fill={hoveredPoint === idx ? '#a855f7' : themeColor}
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
            <p className="text-[10px] font-bold text-orange-405 uppercase">{data[hoveredPoint].month}</p>
            <p className="text-xs font-bold text-white mt-0.5">Ingresos: <span className="text-cyan-400">${data[hoveredPoint].income.toLocaleString('es-CL')}</span></p>
            <p className="text-[10px] text-gray-500 mt-0.5">Reparaciones: {data[hoveredPoint].repairs} unidades</p>
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
        <p className="text-gray-500 text-xs">Sin datos para graficar</p>
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
              <p className="text-[9px] text-gray-550 font-bold uppercase tracking-wider">{data[activeIndex].name}</p>
              <p className="text-lg font-black text-white">{data[activeIndex].percentage}%</p>
            </>
          ) : (
            <>
              <p className="text-[9px] text-gray-550 font-bold uppercase tracking-wider">Equipos</p>
              <p className="text-lg font-black text-white">100%</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-2 text-left w-full">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Distribución por Tipo</h4>
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
    income_history: [],
    average_ticket: 0,
    total_costs: 0,
    estimated_net_profit: 0,
    net_margin: 0,
    pending_collect: 0
  })

  useEffect(() => {
    setLoading(true)
    getRepairStats({ system: 'nova' })
      .then(res => {
        setStats({
          total_repairs: res.data.total_repairs,
          success_rate: res.data.success_rate,
          total_earnings: res.data.total_earnings,
          avg_sla_hours: res.data.avg_sla_hours,
          device_share: res.data.device_share,
          income_history: res.data.income_history,
          average_ticket: res.data.average_ticket || 0,
          total_costs: res.data.total_costs || 0,
          estimated_net_profit: res.data.estimated_net_profit || 0,
          net_margin: res.data.net_margin || 0,
          pending_collect: res.data.pending_collect || 0
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
  
  const vitalStats = [
    { label: 'Tasa de Éxito', value: `${stats.success_rate}%`, icon: Sparkles, color: 'text-cyan-400', desc: 'Reparaciones sin reclamos' },
    { label: 'Trabajos Realizados', value: `${stats.total_repairs}`, icon: Wrench, color: 'text-purple-400', desc: 'Historial total de Nova' },
    { label: 'Facturado Neto', value: `$${stats.total_earnings.toLocaleString('es-CL')}`, icon: DollarSign, color: 'text-emerald-400', desc: 'Reparaciones completadas' },
    { label: 'SLA Promedio', value: `${stats.avg_sla_hours}h`, icon: Clock, color: 'text-blue-400', desc: 'Promedio de entrega' }
  ]

  const advancedStats = [
    { label: 'Costo de Insumos', value: `$${stats.total_costs.toLocaleString('es-CL')}`, icon: Layers, color: 'text-rose-455', desc: 'Materiales consumidos' },
    { label: 'Utilidad Neta', value: `$${stats.estimated_net_profit.toLocaleString('es-CL')}`, icon: TrendingUp, color: 'text-emerald-400', desc: 'Ganancia real calculada' },
    { label: 'Ticket Promedio', value: `$${stats.average_ticket.toLocaleString('es-CL')}`, icon: Percent, color: 'text-purple-400', desc: 'Valor medio de órdenes' },
    { label: 'Pendiente de Cobro', value: `$${stats.pending_collect.toLocaleString('es-CL')}`, icon: Clock, color: 'text-amber-500', desc: 'Equipos listos sin retirar' }
  ]

  const getBusinessDiagnostic = () => {
    if (stats.total_repairs === 0) return 'No hay suficientes datos registrados para realizar un diagnóstico comercial.'
    
    let diagnosis = []
    
    if (stats.net_margin > 65) {
      diagnosis.push('Excelente rentabilidad operativa. Tu margen neto supera el 65%, lo que demuestra que tus precios de venta están perfectamente optimizados contra el costo de tus insumos.')
    } else if (stats.net_margin > 40) {
      diagnosis.push('Rentabilidad saludable y dentro del promedio óptimo de la industria (entre 40% y 65%). Continúa manteniendo este nivel de cotización.')
    } else if (stats.net_margin > 0) {
      diagnosis.push('Tu margen neto está bajo el 40%. Se recomienda revisar las tarifas de mano de obra o cotizar alternativas de insumos y repuestos más competitivas.')
    }

    if (stats.avg_sla_hours <= 18) {
      diagnosis.push('La velocidad de tu taller es extraordinaria (menos de 18 horas promedio). Esta eficiencia en tiempos de entrega (SLA) es un factor crítico de fidelización del cliente.')
    } else if (stats.avg_sla_hours > 36) {
      diagnosis.push('El SLA promedio supera las 36 horas. Se aconseja identificar cuellos de botella en la fase de diagnóstico o mejorar la velocidad de reposición de stock.')
    }

    if (stats.pending_collect > 80000) {
      diagnosis.push(`Atención: Tienes $${stats.pending_collect.toLocaleString('es-CL')} pendientes de pago en órdenes finalizadas listas para entrega. Activa recordatorios automáticos al cliente para optimizar tu flujo de caja.`)
    } else {
      diagnosis.push('Tu flujo de caja de retiros pendientes es óptimo; la mayor parte de las órdenes listas han sido recolectadas y pagadas.')
    }

    return diagnosis.join(' ')
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex flex-col" style={{ background: '#050508' }}>
      <AnimatedBackground />
      
      {/* Background Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-left">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Activity size={16} />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-widest text-gray-300 uppercase leading-none">
                  Análisis Corporativo
                </h1>
                <p className="text-gray-500 text-[9px] uppercase tracking-wider mt-1">Nova Tech</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 w-full flex-1 space-y-6">
        
        {/* Vital stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-28 rounded-2xl p-5 border bg-gray-950/60 border-gray-800/60" />
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
                className="border backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between bg-gray-950/60 border-gray-800/60 hover:shadow-cyan-950/15 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  <stat.icon size={13} className={stat.color} />
                </div>
                <p className="text-2xl font-black text-white truncate">{stat.value}</p>
                <p className="text-[9px] text-gray-500 mt-1">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-64 rounded-2xl border bg-gray-950/60 border-gray-800/60" />
            <div className="h-64 rounded-2xl border bg-gray-950/60 border-gray-800/60" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InteractiveLineChart data={stats.income_history} />
            <DeviceDistributionChart data={stats.device_share} />
          </div>
        )}

        {/* Advanced financial details */}
        <div className="space-y-4 text-left">
          <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase">Análisis de Rentabilidad Financiera</h3>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 rounded-xl border bg-gray-950/60 border-gray-800/60" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {advancedStats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + idx * 0.04 }}
                  className="border rounded-xl p-4.5 text-left bg-gray-955/40 border-gray-900 hover:border-gray-800 transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <stat.icon size={11} className={stat.color} />
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <p className="text-lg font-bold text-white tracking-tight">{stat.value}</p>
                  <p className="text-[9px] text-gray-550 mt-1">{stat.desc}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* AI Performance diagnosis block */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border rounded-2xl p-5 text-left bg-gradient-to-br from-gray-950/60 to-cyan-950/5 border-gray-850 relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="p-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 animate-pulse flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-widest uppercase text-white leading-none">Diagnóstico de Rendimiento Comercial</h4>
                <p className="text-[8px] text-gray-550 uppercase tracking-wider mt-1">Análisis cuantitativo de salud corporativa</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-gray-300 font-medium">
              {getBusinessDiagnostic()}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
