import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Activity, Wrench, DollarSign, Sparkles, Clock, Cpu, 
  TrendingUp, TrendingDown, Layers, Percent, AlertCircle, FileText,
  TrendingUp as TrendUpIcon, ShieldAlert, BarChart2, PieChart
} from 'lucide-react'
import BravoBackground from '../../components/bravo/BravoBackground'
import { getRepairStats } from '../../api/repairs'

const money = value => Number(value).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })

function WeeklyOverview({ days, balance }) {
  const largest = Math.max(1, ...days.map(day => Math.abs(Number(day.profit))))
  const total = days.reduce((sum, day) => sum + Number(day.profit), 0)
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-bravo-border bg-bravo-card p-5">
        <h2 className="font-bold">Margen semanal después de insumos</h2>
        <p className="text-xl font-bold mt-1">{money(total)}</p>
        <p className="text-xs text-bravo-text-muted mb-4">Valor de pedidos listos o entregados menos insumos registrados. Aún faltan mano de obra, arriendo y otros gastos para calcular la utilidad neta.</p>
        {days.map(day => (
          <div key={day.date} className="grid grid-cols-[5rem_1fr_6rem] gap-2 items-center text-xs py-1">
            <span>{new Date(day.date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}</span>
            <div className="bg-white/5 rounded"><div className={Number(day.profit) < 0 ? 'h-2 bg-rose-400' : 'h-2 bg-amber-400'} style={{ width: Math.abs(day.profit) / largest * 100 + '%' }} /></div>
            <span className="text-right">{money(day.profit)}</span>
          </div>
        ))}
        <p className="mt-3 text-sm">{days.reduce((n, day) => n + day.orders, 0)} pedidos completados esta semana</p>
      </div>
      <div className="rounded-2xl border border-bravo-border bg-bravo-card p-5">
        <h2 className="font-bold">Por cobrar en pedidos abiertos</h2>
        <p className="text-xl font-bold mt-1">{money(balance.amount)}</p>
        <p className="text-sm">{balance.orders} pedidos con saldo pendiente</p>
        <p className="text-xs text-bravo-text-muted mt-3">Total acordado menos abonos. Incluye pedidos en producción y listos para retiro.</p>
      </div>
    </section>
  )
}

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
        <p className="text-[10px] text-bravo-text-muted mt-1 leading-relaxed">Costo registrado de materiales y margen acumulado de los pedidos listos o entregados.</p>
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
              <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold">Margen después de insumos</span>
            </div>
            <p className="text-sm font-black text-white font-mono mt-1">${profit.toLocaleString('es-CL')}</p>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 flex justify-between font-mono border-t border-bravo-border/15 pt-2">
        <span>Valor de pedidos completados</span>
        <span className="text-bravo-accent font-black">${earnings.toLocaleString('es-CL')}</span>
      </div>
    </div>
  )
}

function Priorities({ workshop }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-bravo-border bg-bravo-card p-5">
        <h2 className="font-bold">Prioridad de producción</h2>
        <p className="my-2">{workshop.overdue} atrasados · {workshop.due_today} para hoy</p>
        <p className="text-xs text-bravo-text-muted">Primeros cinco por fecha de entrega.</p>
        {workshop.deliveries.map(order => <Link className="flex justify-between py-2 underline" key={order.id} to={'/bravo/orders/' + order.id}><span>{order.number}</span><span>{order.date.split('-').reverse().join('/')}</span></Link>)}
        {workshop.deliveries.length === 0 && <p className="mt-2">Sin entregas programadas pendientes hasta hoy.</p>}
        {workshop.undated > 0 && <p className="mt-2 text-amber-400">{workshop.undated} en producción sin fecha asignada.</p>}
      </div>
      <div className="rounded-2xl border border-bravo-border bg-bravo-card p-5">
        <h2 className="font-bold">Cobros al retirar</h2>
        <p className="text-xs text-bravo-text-muted my-2">Hasta cinco pedidos listos, ordenados de mayor a menor saldo. Abre la ficha para coordinar el retiro.</p>
        {workshop.collections.map(order => <Link className="flex justify-between py-2 underline" key={order.id} to={'/bravo/orders/' + order.id}><span>{order.number}</span><span>{money(order.balance)}</span></Link>)}
        {workshop.collections.length === 0 && <p>Sin saldos pendientes en pedidos listos.</p>}
      </div>
    </section>
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
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)

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
    setLoadError(false)
    getRepairStats({ system: 'bravo' })
      .then(res => {
        setStats({
          weekly_profit: res.data.weekly_profit,
          open_balance: res.data.open_balance,
          workshop: res.data.workshop,
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
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [attempt])
  
  if (loadError) return <button onClick={() => setAttempt(n => n + 1)}>No se pudieron cargar las estadísticas. Reintentar</button>

  const vitalStats = [
    { label: 'En producción', value: stats.workshop?.in_production ?? '—', icon: Wrench, desc: 'Pedidos abiertos que aún requieren trabajo' },
    { label: 'Pedidos registrados', value: stats.total_repairs, icon: Layers, desc: 'Todos los estados, desde el inicio' },
    { label: 'Valor de pedidos completados', value: money(stats.total_earnings), icon: DollarSign, desc: 'Acumulado de listos y entregados' },
    { label: 'Ticket promedio', value: money(stats.average_ticket), icon: Percent, desc: 'Valor por pedido listo o entregado' }
  ]

  const advancedStats = [
    { label: 'Costo de Insumos', value: `$${stats.total_costs.toLocaleString('es-CL')}`, icon: Layers, color: 'text-rose-400', desc: 'Materiales consumidos' },
    { label: 'Margen estimado', value: `$${stats.estimated_net_profit.toLocaleString('es-CL')}`, icon: TrendingUp, color: 'text-emerald-400', desc: 'Según insumos registrados' },
    { label: 'Ticket Promedio', value: `$${stats.average_ticket.toLocaleString('es-CL')}`, icon: Percent, color: 'text-purple-400', desc: 'Valor medio de órdenes' },
    { label: 'Por cobrar en retiro', value: `$${stats.pending_collect.toLocaleString('es-CL')}`, icon: Clock, color: 'text-amber-500', desc: 'Trabajos listos sin retirar' }
  ]

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
              Signos vitales de Bravo
            </h1>
            <p className="text-bravo-text-muted text-[9px] uppercase tracking-wider mt-1 font-mono">Estudio Bravo</p>
          </div>
        </div>
      </div>

      {!loading && stats.weekly_profit && stats.open_balance && <WeeklyOverview days={stats.weekly_profit} balance={stats.open_balance} />}

      {!loading && stats.workshop && <Priorities workshop={stats.workshop} />}

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
        <div>
          {/* Estructura Financiera */}
          <FinancialStructureChart 
            earnings={stats.total_earnings} 
            costs={stats.total_costs} 
            profit={stats.estimated_net_profit} 
          />
          {/* Ocupación de Maquinarias */}
          
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
                <p className="text-lg font-black text-emerald-400 mt-1 font-mono">{stats.qa_stats.inspections ? stats.qa_stats.pass_rate + '%' : 'Sin inspecciones'}</p>
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
              La merma representa el descarte físico de material durante la producción debido a fallas de calibración, manchas de calor o costuras deficientes.
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

    </div>
  )
}
