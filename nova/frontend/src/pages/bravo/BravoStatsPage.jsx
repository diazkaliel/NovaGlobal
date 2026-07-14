import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Activity, Wrench, DollarSign, Sparkles, Clock, Cpu, TrendingUp, TrendingDown, Layers, Percent } from 'lucide-react'
import BravoBackground from '../../components/bravo/BravoBackground'
import { getRepairStats } from '../../api/repairs'

function InteractiveLineChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  
  if (data.length === 0) {
    return (
      <div className="relative bg-white border border-bravo-border rounded-2xl p-5 text-center min-h-[200px] flex items-center justify-center shadow-xs">
        <p className="text-bravo-text-muted text-xs">Sin datos de ingresos suficientes</p>
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

  const themeColor = '#d97706' // Warm amber
 
  return (
    <div className="relative bg-bravo-card border border-bravo-border rounded-2xl p-5 text-left shadow-xs">
      <h4 className="text-xs font-bold text-bravo-text-muted uppercase tracking-widest mb-4">Historial de Ingresos Semestral</h4>
      
      <svg viewBox="0 0 500 200" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = 170 - ratio * 140
          return (
            <line key={idx} x1="40" y1={y} x2="460" y2={y} stroke="rgba(44, 24, 16, 0.05)" strokeWidth="1" />
          )
        })}
        
        <path d={areaD} fill="url(#chartGradient)" />
        <path d={pathD} fill="none" stroke={themeColor} strokeWidth="2.5" />
        
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={hoveredPoint === idx ? 6 : 4}
            fill={hoveredPoint === idx ? '#f97316' : themeColor}
            stroke="#ffffff"
            strokeWidth="1.5"
            className="transition-all duration-150 cursor-pointer"
            onMouseEnter={() => setHoveredPoint(idx)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
        
        {points.map((p, idx) => (
          <text key={idx} x={p.x} y="190" textAnchor="middle" fill="#8b6c52" className="text-[10px] font-bold">{p.month}</text>
        ))}
      </svg>

      <AnimatePresence>
        {hoveredPoint !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-white border border-bravo-border p-2.5 rounded-lg shadow-lg pointer-events-none text-left z-20"
          >
            <p className="text-[10px] font-bold text-amber-700 uppercase">{data[hoveredPoint].month}</p>
            <p className="text-xs font-bold text-bravo-text mt-0.5">Ingresos: <span className="text-amber-800">${data[hoveredPoint].income.toLocaleString('es-CL')}</span></p>
            <p className="text-[10px] text-bravo-text-muted mt-0.5">Proyectos: {data[hoveredPoint].repairs} unidades</p>
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
      <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 text-center min-h-[200px] flex items-center justify-center w-full shadow-xs">
        <p className="text-bravo-text-muted text-xs">Sin datos para graficar</p>
      </div>
    )
  }

  const r = 40
  const circ = 2 * Math.PI * r
  let accumulatedPercent = 0

  return (
    <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6 text-left shadow-xs">
      <div className="relative w-36 h-36 flex-shrink-0 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(0,0,0,0.02)" strokeWidth="10" />
          
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
              <p className="text-[9px] text-bravo-text-muted font-bold uppercase tracking-wider">{data[activeIndex].name}</p>
              <p className="text-lg font-black text-bravo-text">{data[activeIndex].percentage}%</p>
            </>
          ) : (
            <>
              <p className="text-[9px] text-bravo-text-muted font-bold uppercase tracking-wider">Categorías</p>
              <p className="text-lg font-black text-bravo-text">100%</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-2 text-left w-full">
        <h4 className="text-xs font-bold text-bravo-text-muted uppercase tracking-widest mb-3">Distribución por Tipo</h4>
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
              activeIndex === idx ? 'bg-stone-100' : ''
            }`}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-bravo-text">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-bravo-text">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrintTechniqueChart({ data = [] }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0)
  
  if (totalPercentage === 0) {
    return (
      <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 text-center min-h-[200px] flex items-center justify-center w-full shadow-xs">
        <p className="text-bravo-text-muted text-xs">Sin datos de técnicas de estampado</p>
      </div>
    )
  }

  const r = 40
  const circ = 2 * Math.PI * r
  let accumulatedPercent = 0

  return (
    <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6 text-left shadow-xs">
      <div className="relative w-36 h-36 flex-shrink-0 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(0,0,0,0.02)" strokeWidth="10" />
          
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
              <p className="text-[9px] text-bravo-text-muted font-bold uppercase tracking-wider">{data[activeIndex].name}</p>
              <p className="text-lg font-black text-bravo-text">{data[activeIndex].percentage}%</p>
            </>
          ) : (
            <>
              <p className="text-[9px] text-bravo-text-muted font-bold uppercase tracking-wider">Técnicas</p>
              <p className="text-lg font-black text-bravo-text">100%</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-2 text-left w-full">
        <h4 className="text-xs font-bold text-bravo-text-muted uppercase tracking-widest mb-3">Técnicas de Estampado</h4>
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
              activeIndex === idx ? 'bg-stone-100' : ''
            }`}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-bravo-text">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-bravo-text">{item.percentage}%</span>
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
    { label: 'Tasa de Éxito', value: `${stats.success_rate}%`, icon: Sparkles, color: 'text-amber-600', desc: 'Trabajos sin reclamos' },
    { label: 'Proyectos Realizados', value: `${stats.total_repairs}`, icon: Wrench, color: 'text-orange-600', desc: 'Historial de Bravo' },
    { label: 'Facturado Neto', value: `$${stats.total_earnings.toLocaleString('es-CL')}`, icon: DollarSign, color: 'text-amber-700', desc: 'Trabajos completados' },
    { label: 'Tiempo Prod. Promedio', value: `${stats.avg_sla_hours}h`, icon: Clock, color: 'text-blue-600', desc: 'Promedio de entrega' }
  ]

  const advancedStats = [
    { label: 'Costo de Insumos', value: `$${stats.total_costs.toLocaleString('es-CL')}`, icon: Layers, color: 'text-rose-600', desc: 'Materiales consumidos' },
    { label: 'Utilidad Neta', value: `$${stats.estimated_net_profit.toLocaleString('es-CL')}`, icon: TrendingUp, color: 'text-emerald-700', desc: 'Ganancia real calculada' },
    { label: 'Ticket Promedio', value: `$${stats.average_ticket.toLocaleString('es-CL')}`, icon: Percent, color: 'text-purple-600', desc: 'Valor medio de órdenes' },
    { label: 'Pendiente de Cobro', value: `$${stats.pending_collect.toLocaleString('es-CL')}`, icon: Clock, color: 'text-amber-600', desc: 'Trabajos listos sin retirar' }
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
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-bravo-border pb-5">
        <button
          onClick={() => navigate('/bravo')}
          className="text-bravo-text-muted hover:text-bravo-text transition-colors p-1.5 hover:bg-stone-250/50 rounded-lg cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg border border-bravo-border bg-bravo-accent/10 text-amber-600 flex items-center justify-center">
            <Activity size={16} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-bravo-text uppercase leading-none">
              Análisis Corporativo
            </h1>
            <p className="text-bravo-text-muted text-[9px] uppercase tracking-wider mt-1">Estudio Bravo</p>
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
              className="bg-bravo-card border border-bravo-border/60 hover:shadow-md rounded-2xl p-5 flex flex-col justify-between shadow-xs transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[9px] font-bold text-bravo-text-muted uppercase tracking-wider">{stat.label}</span>
                <stat.icon size={13} className={stat.color} />
              </div>
              <p className="text-2xl font-black text-bravo-text truncate">{stat.value}</p>
              <p className="text-[9px] text-bravo-text-muted mt-1">{stat.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-64 rounded-2xl border border-bravo-border bg-bravo-card" />
          <div className="h-64 rounded-2xl border border-bravo-border bg-bravo-card" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InteractiveLineChart data={stats.income_history} />
            <DeviceDistributionChart data={stats.device_share} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1">
            <PrintTechniqueChart data={stats.print_technique_share} />
          </div>
        </div>
      )}

      {/* Advanced financial details */}
      <div className="space-y-4">
        <h3 className="text-xs font-black tracking-widest text-bravo-text-muted uppercase">Análisis de Rentabilidad Financiera</h3>
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
                  <span className="text-[9px] font-bold text-bravo-text-muted uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-bravo-text tracking-tight">{stat.value}</p>
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
            <div className="flex items-center gap-2 border-b border-bravo-border pb-3">
              <Sparkles size={16} className="text-orange-500" />
              <h4 className="text-xs font-bold text-bravo-text uppercase tracking-widest">Aseguramiento de Calidad (QA)</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-stone-50 border border-bravo-border/60 rounded-xl p-3 text-center">
                <p className="text-[9px] font-bold text-bravo-text-muted uppercase tracking-wider">Aprobación QA</p>
                <p className="text-lg font-black text-emerald-600 mt-1">{stats.qa_stats.pass_rate}%</p>
              </div>
              <div className="bg-stone-50 border border-bravo-border/60 rounded-xl p-3 text-center">
                <p className="text-[9px] font-bold text-bravo-text-muted uppercase tracking-wider">Mermas Físicas</p>
                <p className="text-lg font-black text-rose-600 mt-1">{stats.qa_stats.total_waste_units} und</p>
              </div>
              <div className="bg-stone-50 border border-bravo-border/60 rounded-xl p-3 text-center">
                <p className="text-[9px] font-bold text-bravo-text-muted uppercase tracking-wider">Costo por Mermas</p>
                <p className="text-lg font-black text-bravo-text mt-1">${stats.qa_stats.total_waste_cost.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <p className="text-[10px] text-bravo-text-muted leading-relaxed">
              La merma representa el descarte físico de material durante la producción debido a fallas de calibración, manchas de calor o costuras deficientes. Mantener la tasa de aprobación sobre el 95% minimiza el desperdicio operativo.
            </p>
          </div>

          {/* Machines Card */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 text-left shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-bravo-border pb-3">
              <Cpu size={16} className="text-blue-500" />
              <h4 className="text-xs font-bold text-bravo-text uppercase tracking-widest">Maquinaria de Producción</h4>
            </div>
            <div className="flex justify-around items-center py-1 bg-stone-50 border border-bravo-border/60 rounded-xl">
              <div className="text-center">
                <p className="text-[9px] font-bold text-bravo-text-muted uppercase">Activas</p>
                <p className="text-base font-black text-emerald-600">{stats.machine_stats.active}</p>
              </div>
              <div className="w-[1px] h-6 bg-bravo-border" />
              <div className="text-center">
                <p className="text-[9px] font-bold text-bravo-text-muted uppercase">Mantenimiento</p>
                <p className="text-base font-black text-amber-600">{stats.machine_stats.maintenance}</p>
              </div>
              <div className="w-[1px] h-6 bg-bravo-border" />
              <div className="text-center">
                <p className="text-[9px] font-bold text-bravo-text-muted uppercase">Total Reservas</p>
                <p className="text-base font-black text-blue-600">{stats.machine_stats.total_reservations}</p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-[105px] overflow-y-auto pr-1">
              {stats.machine_stats.list.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] py-1 border-b border-bravo-border/40 last:border-0">
                  <span className="font-semibold text-bravo-text truncate max-w-[170px]">{m.name}</span>
                  <div className="flex items-center gap-2">
                    {m.needs_supplies && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[8px] font-bold border border-rose-100">Falta insumos</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                      m.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
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
        <div className="border border-bravo-border/60 bg-gradient-to-br from-white to-amber-500/5 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="p-1.5 rounded-xl border border-bravo-border bg-bravo-accent/10 text-amber-600 animate-pulse flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-widest uppercase text-bravo-text leading-none">Diagnóstico de Rendimiento Comercial</h4>
              <p className="text-[8px] text-bravo-text-muted uppercase tracking-wider mt-1">Análisis cuantitativo de salud corporativa</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-bravo-text font-medium">
            {getBusinessDiagnostic()}
          </p>
        </div>
      )}
    </div>
  )
}
