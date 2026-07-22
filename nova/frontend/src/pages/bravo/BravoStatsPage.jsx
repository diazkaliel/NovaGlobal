import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Activity, Wrench, DollarSign, Sparkles, Clock, Cpu, 
  TrendingUp, TrendingDown, Layers, Percent, AlertCircle, FileText,
  TrendingUp as TrendUpIcon, ShieldAlert, BarChart2, PieChart
} from 'lucide-react'
import BravoBackground from '../../components/bravo/BravoBackground'
import { getRepairStats } from '../../api/repairs'

// 1. HISTORIAL DE INGRESOS SEMESTRAL
function InteractiveLineChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  
  if (data.length === 0) {
    return (
      <div className="relative bg-bravo-card border border-bravo-border/60 rounded-2xl p-6 text-center min-h-[220px] flex items-center justify-center shadow-lg">
        <p className="text-bravo-text-muted text-xs font-mono uppercase">Sin datos de ingresos suficientes</p>
      </div>
    )
  }

  const maxIncome = Math.max(...data.map(d => d.income), 1000)
  const points = data.map((d, i) => {
    const x = 45 + i * (410 / Math.max(data.length - 1, 1))
    const y = 160 - (d.income / maxIncome) * 120
    return { x, y, ...d }
  })
  
  const pathD = data.length > 1 
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : `M 45 ${points[0].y} L 455 ${points[0].y}`
    
  const areaD = data.length > 1
    ? `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`
    : `M 45 ${points[0].y} L 455 ${points[0].y} L 455 160 L 45 160 Z`
 
  const themeColor = '#fbbf24' // Yellow Accent

  return (
    <div className="relative bg-bravo-card border border-bravo-border/60 rounded-2xl p-5 text-left shadow-xl flex flex-col justify-between min-h-[260px]">
      <div>
        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 font-mono flex items-center gap-1.5 border-b border-bravo-border/20 pb-2">
          <TrendingUp size={13} className="text-bravo-accent" />
          Historial de Ingresos Semestral
        </h4>
      </div>
      
      <div className="flex-1 flex items-center">
        <svg viewBox="0 0 500 200" className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Guías Horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = 160 - ratio * 120
            return (
              <line key={idx} x1="45" y1={y} x2="455" y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3 3" />
            )
          })}
          
          <path d={areaD} fill="url(#chartGradient)" />
          <path d={pathD} fill="none" stroke={themeColor} strokeWidth="2.5" className="drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]" />
          
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint === idx ? 6 : 4}
              fill={hoveredPoint === idx ? '#fbbf24' : '#101017'}
              stroke="#fbbf24"
              strokeWidth="2"
              className="transition-all duration-150 cursor-pointer"
              onMouseEnter={() => setHoveredPoint(idx)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
          
          {points.map((p, idx) => (
            <text key={idx} x={p.x} y="185" textAnchor="middle" fill="#a1a1aa" className="text-[9px] font-bold font-mono">{p.month}</text>
          ))}
        </svg>
      </div>

      <AnimatePresence>
        {hoveredPoint !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#101017] border border-bravo-border p-3 rounded-xl shadow-2xl pointer-events-none text-left z-20 w-44 font-sans"
          >
            <p className="text-[10px] font-black text-bravo-accent uppercase font-mono">{data[hoveredPoint].month}</p>
            <p className="text-xs font-black text-white mt-1 font-mono">Ingresos: <span className="text-bravo-accent">${data[hoveredPoint].income.toLocaleString('es-CL')}</span></p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Pedidos: {data[hoveredPoint].repairs} uds</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 2. DISTRIBUCIÓN POR TIPO DE PRENDA
function DeviceDistributionChart({ data = [] }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0)
  
  if (totalPercentage === 0) {
    return (
      <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-6 text-center min-h-[260px] flex items-center justify-center w-full shadow-lg">
        <p className="text-bravo-text-muted text-xs font-mono uppercase">Sin datos para graficar</p>
      </div>
    )
  }

  const r = 40
  const circ = 2 * Math.PI * r
  let accumulatedPercent = 0

  return (
    <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6 text-left shadow-xl font-sans min-h-[260px]">
      <div className="relative w-32 h-32 flex-shrink-0 mx-auto">
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
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider font-mono truncate max-w-[80px]">{data[activeIndex].name}</p>
              <p className="text-base font-black text-white font-mono mt-0.5">{data[activeIndex].percentage}%</p>
            </>
          ) : (
            <>
              <p className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider font-mono">Categorías</p>
              <p className="text-base font-black text-white font-mono mt-0.5">100%</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-1 w-full max-h-[220px] overflow-y-auto pr-1 bravo-scrollbar">
        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 font-mono flex items-center gap-1.5 border-b border-bravo-border/20 pb-2">
          <Layers size={13} className="text-bravo-accent" />
          Proporción de Prendas
        </h4>
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer border ${
              activeIndex === idx ? 'bg-white/[0.03] border-bravo-border/30' : 'border-transparent'
            }`}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] font-semibold text-stone-300">{item.name}</span>
            </div>
            <span className="text-[11px] font-black text-white font-mono">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 3. COMPARATIVA ESTRUCTURA FINANCIERA (BARRA APILADA INTERACTIVA)
function FinancialStructureChart({ earnings = 0, costs = 0, profit = 0 }) {
  const [hoveredSegment, setHoveredSegment] = useState(null) // 'costs' o 'profit'
  const total = costs + profit
  const costPct = total > 0 ? (costs / total) * 100 : 0
  const profitPct = total > 0 ? (profit / total) * 100 : 0

  return (
    <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-5 shadow-xl text-left space-y-4 font-sans min-h-[260px] flex flex-col justify-between">
      <div>
        <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-bravo-border/20 pb-2">
          <DollarSign size={13} className="text-bravo-accent" />
          Margen y Distribución Financiera
        </h4>
        <p className="text-[10px] text-bravo-text-muted mt-1 leading-relaxed">Representación de la rentabilidad real de Bravo contra los costos de insumos y materia prima.</p>
      </div>

      <div className="space-y-4">
        {/* Barra de Proporción Apilada */}
        <div className="h-6 w-full rounded-xl bg-zinc-950 overflow-hidden flex border border-bravo-border/20 relative">
          <div 
            style={{ width: `${costPct}%` }} 
            className="bg-rose-500/25 border-r border-rose-500/20 hover:bg-rose-500/40 transition-all cursor-pointer flex items-center justify-center"
            onMouseEnter={() => setHoveredSegment('costs')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            {costPct > 15 && <span className="text-[9px] font-bold text-rose-400 font-mono">{costPct.toFixed(0)}%</span>}
          </div>
          <div 
            style={{ width: `${profitPct}%` }} 
            className="bg-emerald-500/25 hover:bg-emerald-500/40 transition-all cursor-pointer flex items-center justify-center"
            onMouseEnter={() => setHoveredSegment('profit')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            {profitPct > 15 && <span className="text-[9px] font-bold text-emerald-400 font-mono">{profitPct.toFixed(0)}%</span>}
          </div>
        </div>

        {/* Leyenda y Totales */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className={`p-2.5 rounded-xl border transition-all ${
              hoveredSegment === 'costs' ? 'bg-rose-950/20 border-rose-500/35' : 'bg-[#101017] border-bravo-border/30'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-rose-450" />
              <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold">Costo Insumos</span>
            </div>
            <p className="text-sm font-black text-white font-mono mt-1">${costs.toLocaleString('es-CL')}</p>
          </div>

          <div 
            className={`p-2.5 rounded-xl border transition-all ${
              hoveredSegment === 'profit' ? 'bg-emerald-950/20 border-emerald-500/35' : 'bg-[#101017] border-bravo-border/30'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-emerald-450" />
              <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold">Utilidad Neta</span>
            </div>
            <p className="text-sm font-black text-white font-mono mt-1">${profit.toLocaleString('es-CL')}</p>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 flex justify-between font-mono border-t border-bravo-border/15 pt-2">
        <span>Facturado Bruto:</span>
        <span className="text-bravo-accent font-black">${earnings.toLocaleString('es-CL')}</span>
      </div>
    </div>
  )
}

// 4. GRÁFICO DE CARGA Y OCUPACIÓN DE MAQUINARIAS
function MachineLoadChart({ machines = [] }) {
  const [hoveredMachine, setHoveredMachine] = useState(null)
  
  const formattedData = machines.map(m => {
    // 13 horas disponibles de 8:00 a 20:00
    const reservationsCount = m.reservations ? m.reservations.length : 0
    const loadPercentage = Math.min(100, Math.round((reservationsCount / 13) * 100))
    return { ...m, load: loadPercentage, hours: reservationsCount }
  })

  return (
    <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-5 shadow-xl text-left space-y-4 font-sans min-h-[260px] flex flex-col justify-between">
      <div>
        <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-bravo-border/20 pb-2">
          <Cpu size={13} className="text-bravo-accent" />
          Carga Operativa de Maquinaria
        </h4>
        <p className="text-[10px] text-bravo-text-muted mt-1 leading-relaxed">Porcentaje de ocupación de las 13 horas laborables diarias del taller.</p>
      </div>

      <div className="space-y-3.5 flex-1 flex flex-col justify-center">
        {formattedData.length === 0 ? (
          <p className="text-xs text-stone-500 italic text-center py-6">No hay maquinaria registrada</p>
        ) : (
          formattedData.map((m, idx) => {
            const isHigh = m.load > 70
            const isLow = m.load < 20
            const barColor = isHigh 
              ? 'bg-rose-500' 
              : isLow 
                ? 'bg-zinc-650' 
                : 'bg-bravo-accent'

            return (
              <div 
                key={m.id} 
                className="space-y-1.5"
                onMouseEnter={() => setHoveredMachine(idx)}
                onMouseLeave={() => setHoveredMachine(null)}
              >
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-white truncate max-w-[180px]">{m.name}</span>
                  <span className="font-mono text-zinc-400 font-bold">{m.load}% ({m.hours}h reservadas)</span>
                </div>
                <div className="h-2 w-full bg-zinc-950 border border-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${m.load}%` }} 
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${barColor} ${isHigh ? 'animate-pulse' : ''}`} 
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {hoveredMachine !== null && (
        <div className="text-[9px] font-mono text-bravo-accent uppercase font-black text-center animate-fade-in border-t border-bravo-border/15 pt-2">
          {formattedData[hoveredMachine].load > 70 
            ? '⚠️ Sobrecarga operativa. Cuello de botella detectado.' 
            : formattedData[hoveredMachine].load < 20 
              ? '💤 Capacidad subutilizada en este equipo.' 
              : '⚡ Carga operativa estable.'
          }
        </div>
      )}
    </div>
  )
}

// 5. TÉCNICAS DE ESTAMPADO
function PrintTechniqueChart({ data = [] }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0)
  
  if (totalPercentage === 0) {
    return (
      <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-6 text-center min-h-[260px] flex items-center justify-center w-full shadow-lg">
        <p className="text-bravo-text-muted text-xs font-mono uppercase">Sin datos de técnicas de estampado</p>
      </div>
    )
  }

  const r = 40
  const circ = 2 * Math.PI * r
  let accumulatedPercent = 0

  return (
    <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6 text-left shadow-xl font-sans min-h-[260px]">
      <div className="relative w-32 h-32 flex-shrink-0 mx-auto">
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
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider font-mono truncate max-w-[80px]">{data[activeIndex].name}</p>
              <p className="text-base font-black text-white font-mono mt-0.5">{data[activeIndex].percentage}%</p>
            </>
          ) : (
            <>
              <p className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider font-mono">Técnicas</p>
              <p className="text-base font-black text-white font-mono mt-0.5">100%</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-1 w-full max-h-[220px] overflow-y-auto pr-1 bravo-scrollbar">
        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 font-mono flex items-center gap-1.5 border-b border-bravo-border/20 pb-2">
          <Sparkles size={13} className="text-bravo-accent" />
          Técnicas de Estampado
        </h4>
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer border ${
              activeIndex === idx ? 'bg-white/[0.03] border-bravo-border/30' : 'border-transparent'
            }`}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] font-semibold text-stone-300">{item.name}</span>
            </div>
            <span className="text-[11px] font-black text-white font-mono">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BravoStatsPage() {
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
    pending_collect: 0,
    print_technique_share: [],
    qa_stats: {
      pass_rate: 100.0,
      total_waste_units: 0,
      total_waste_cost: 0.0
    },
    machine_stats: {
      active: 0,
      maintenance: 0,
      total_reservations: 0,
      list: []
    }
  })

  useEffect(() => {
    setLoading(true)
    getRepairStats({ system: 'bravo' })
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
          pending_collect: res.data.pending_collect || 0,
          print_technique_share: res.data.print_technique_share || [],
          qa_stats: res.data.qa_stats || { pass_rate: 100.0, total_waste_units: 0, total_waste_cost: 0.0 },
          machine_stats: res.data.machine_stats || { active: 0, maintenance: 0, total_reservations: 0, list: [] }
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
  
  const vitalStats = [
    { label: 'Tasa de Éxito', value: `${stats.success_rate}%`, icon: Sparkles, color: 'text-amber-500', desc: 'Trabajos sin reclamos' },
    { label: 'Proyectos Realizados', value: `${stats.total_repairs}`, icon: Wrench, color: 'text-amber-500', desc: 'Historial de Bravo' },
    { label: 'Facturado Neto', value: `$${stats.total_earnings.toLocaleString('es-CL')}`, icon: DollarSign, color: 'text-amber-500', desc: 'Trabajos completados' },
    { label: 'Tiempo Prod. Promedio', value: `${stats.avg_sla_hours}h`, icon: Clock, color: 'text-amber-500', desc: 'Promedio de entrega' }
  ]

  const advancedStats = [
    { label: 'Costo de Insumos', value: `$${stats.total_costs.toLocaleString('es-CL')}`, icon: Layers, color: 'text-rose-400', desc: 'Materiales consumidos' },
    { label: 'Utilidad Neta', value: `$${stats.estimated_net_profit.toLocaleString('es-CL')}`, icon: TrendingUp, color: 'text-emerald-400', desc: 'Ganancia real calculada' },
    { label: 'Ticket Promedio', value: `$${stats.average_ticket.toLocaleString('es-CL')}`, icon: Percent, color: 'text-purple-400', desc: 'Valor medio de órdenes' },
    { label: 'Pendiente de Cobro', value: `$${stats.pending_collect.toLocaleString('es-CL')}`, icon: Clock, color: 'text-amber-500', desc: 'Trabajos listos sin retirar' }
  ]

  const getBusinessDiagnostic = () => {
    if (stats.total_repairs === 0) return 'No hay suficientes datos registrados en el estudio para realizar un diagnóstico comercial.'
    
    let diagnosis = []
    
    if (stats.net_margin > 65) {
      diagnosis.push('Excelente rentabilidad operativa en el estudio. El margen neto supera el 65%, indicando una correcta tasación del valor de marca y mano de obra artística contra los costos base de las prendas.')
    } else if (stats.net_margin > 40) {
      diagnosis.push('Rentabilidad de producción textil saludable y dentro del promedio óptimo (entre 40% y 65%).')
    } else if (stats.net_margin > 0) {
      diagnosis.push('El margen neto del taller está bajo el 40%. Se recomienda optimizar compras de prendas lisas por volumen o revisar las tarifas cobradas por técnicas complejas de bordado o DTF.')
    }

    if (stats.qa_stats.pass_rate < 90) {
      diagnosis.push(`Alerta: La tasa de aprobación de Control de Calidad está en ${stats.qa_stats.pass_rate}%. Esto genera pérdidas directas en insumos que ya suman $${stats.qa_stats.total_waste_cost.toLocaleString('es-CL')}. Se sugiere calibrar calandras y plotters de corte inmediatamente.`)
    } else {
      diagnosis.push('El control de calidad mantiene niveles excelentes de aprobación (bajo nivel de mermas).')
    }

    if (stats.machine_stats.maintenance > 0) {
      diagnosis.push(`Tienes maquinaria en mantenimiento, lo que reduce la capacidad instalada para cumplir el SLA promedio de ${stats.avg_sla_hours} horas. Planifica entregas holgadas para DTF/Bordado.`)
    }

    if (stats.pending_collect > 80000) {
      diagnosis.push(`Atención: Tienes $${stats.pending_collect.toLocaleString('es-CL')} pendientes de cobro en pedidos listos para retiro. Activa notificaciones automatizadas de cobranza para asegurar la liquidez del taller.`)
    }

    return diagnosis.join(' ')
  }

  return (
    <div className="space-y-6 relative text-left">
      <BravoBackground />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-bravo-border pb-5">
        <button
          type="button"
          onClick={() => navigate('/bravo')}
          className="text-bravo-text-muted hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg border border-bravo-border bg-bravo-accent/15 text-bravo-accent flex items-center justify-center">
            <Activity size={16} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-white uppercase leading-none">
              Análisis Corporativo
            </h1>
            <p className="text-bravo-text-muted text-[9px] uppercase tracking-wider mt-1 font-mono">Estudio Bravo</p>
          </div>
        </div>
      </div>

      {/* Vital stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 rounded-2xl p-5 border border-bravo-border bg-bravo-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vitalStats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-bravo-card border border-bravo-border/60 hover:border-bravo-accent/40 hover:shadow-md rounded-2xl p-5 flex flex-col justify-between shadow-xs transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[9px] font-bold text-bravo-text-muted uppercase tracking-wider font-mono">{stat.label}</span>
                <stat.icon size={13} className={stat.color} />
              </div>
              <p className="text-2xl font-black text-white font-mono truncate">{stat.value}</p>
              <p className="text-[9px] text-bravo-text-muted mt-1">{stat.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Section: Fila 1 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-64 rounded-2xl border border-bravo-border bg-bravo-card" />
          <div className="h-64 rounded-2xl border border-bravo-border bg-bravo-card" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InteractiveLineChart data={stats.income_history} />
          <DeviceDistributionChart data={stats.device_share} />
        </div>
      )}

      {/* Charts Section: Fila 2 (Nuevos Gráficos Relevantes para Administración) */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Estructura Financiera */}
          <FinancialStructureChart 
            earnings={stats.total_earnings} 
            costs={stats.total_costs} 
            profit={stats.estimated_net_profit} 
          />
          {/* Ocupación de Maquinarias */}
          <MachineLoadChart machines={stats.machine_stats.list} />
        </div>
      )}

      {/* Charts Section: Fila 3 */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-1">
          <PrintTechniqueChart data={stats.print_technique_share} />
        </div>
      )}

      {/* Advanced financial details */}
      <div className="space-y-4">
        <h3 className="text-xs font-black tracking-widest text-bravo-text-muted uppercase font-mono">Resumen de Métricas Financieras</h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-xl border border-bravo-border bg-bravo-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {advancedStats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-bravo-card border border-bravo-border/40 hover:border-bravo-accent/30 rounded-xl p-4.5 transition-all shadow-xs"
              >
                <div className="flex items-center gap-1.5 mb-2.5">
                  <stat.icon size={11} className={stat.color} />
                  <span className="text-[9px] font-bold text-bravo-text-muted uppercase tracking-wider font-mono">{stat.label}</span>
                </div>
                <p className="text-lg font-black text-white tracking-tight font-mono">{stat.value}</p>
                <p className="text-[9px] text-bravo-text-muted mt-1">{stat.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control de Calidad (QA) y Maquinaria */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QA Card */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 text-left shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-bravo-border/30 pb-3">
              <Sparkles size={16} className="text-bravo-accent" />
              <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Aseguramiento de Calidad (QA)</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#101017] border border-bravo-border/50 rounded-xl p-3 text-center">
                <p className="text-[8px] font-bold text-bravo-text-muted uppercase tracking-wider font-mono">Aprobación QA</p>
                <p className="text-lg font-black text-emerald-400 mt-1 font-mono">{stats.qa_stats.pass_rate}%</p>
              </div>
              <div className="bg-[#101017] border border-bravo-border/50 rounded-xl p-3 text-center">
                <p className="text-[8px] font-bold text-bravo-text-muted uppercase tracking-wider font-mono">Mermas Físicas</p>
                <p className="text-lg font-black text-rose-400 mt-1 font-mono">{stats.qa_stats.total_waste_units} und</p>
              </div>
              <div className="bg-[#101017] border border-bravo-border/50 rounded-xl p-3 text-center">
                <p className="text-[8px] font-bold text-bravo-text-muted uppercase tracking-wider font-mono">Costo Mermas</p>
                <p className="text-lg font-black text-white mt-1 font-mono">${stats.qa_stats.total_waste_cost.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
              La merma representa el descarte físico de material durante la producción debido a fallas de calibración, manchas de calor o costuras deficientes. Mantener la tasa de aprobación sobre el 95% minimiza el desperdicio operativo.
            </p>
          </div>

          {/* Machines Card */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 text-left shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-bravo-border/30 pb-3">
              <Cpu size={16} className="text-bravo-accent" />
              <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Estado Físico de Equipos</h4>
            </div>
            <div className="flex justify-around items-center py-2.5 bg-[#101017] border border-bravo-border/50 rounded-xl">
              <div className="text-center">
                <p className="text-[8px] font-bold text-bravo-text-muted uppercase font-mono">Activas</p>
                <p className="text-base font-black text-emerald-450 font-mono mt-0.5">{stats.machine_stats.active}</p>
              </div>
              <div className="w-[1px] h-6 bg-bravo-border/30" />
              <div className="text-center">
                <p className="text-[8px] font-bold text-bravo-text-muted uppercase font-mono">En Mantención</p>
                <p className="text-base font-black text-amber-500 font-mono mt-0.5">{stats.machine_stats.maintenance}</p>
              </div>
              <div className="w-[1px] h-6 bg-bravo-border/30" />
              <div className="text-center">
                <p className="text-[8px] font-bold text-bravo-text-muted uppercase font-mono">Total Reservas</p>
                <p className="text-base font-black text-bravo-accent font-mono mt-0.5">{stats.machine_stats.total_reservations}</p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[105px] overflow-y-auto pr-1">
              {stats.machine_stats.list.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] py-1.5 border-b border-bravo-border/20 last:border-0">
                  <span className="font-semibold text-white truncate max-w-[170px] font-sans">{m.name}</span>
                  <div className="flex items-center gap-2">
                    {m.needs_supplies && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase">Insumos 🚨</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      m.status === 'active' 
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' 
                        : 'bg-amber-950/50 border border-amber-500/30 text-amber-400'
                    }`}>
                      {m.status === 'active' ? 'Activa' : 'Mant.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Qualitative Diagnostic block */}
      {!loading && (
        <div className="border border-bravo-border bg-gradient-to-br from-bravo-card to-bravo-accent/5 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-xl border border-bravo-border bg-bravo-accent/15 text-bravo-accent animate-pulse flex items-center justify-center">
              <FileText size={14} />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-widest uppercase text-white leading-none font-mono">Diagnóstico de Rendimiento Comercial</h4>
              <p className="text-[8px] text-bravo-text-muted uppercase tracking-wider mt-1 font-mono">Análisis cuantitativo de salud corporativa</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-350 font-medium font-sans">
            {getBusinessDiagnostic()}
          </p>
        </div>
      )}
    </div>
  )
}
