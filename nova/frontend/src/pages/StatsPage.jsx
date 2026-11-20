import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft, Activity, DollarSign, TrendingUp, TrendingDown, Clock,
  Wrench, RefreshCw, Download, Printer, AlertTriangle, CheckCircle2,
  Users, CreditCard, ShoppingBag, ChevronRight, ArrowUpRight, Minus,
  ShieldCheck, Gauge, Smartphone, Laptop, Gamepad2, Box, Wallet
} from 'lucide-react'
import { getRepairStats } from '../api/repairs'
import { getSaleStats } from '../api/sales'

// Física técnica ágil exclusiva de Nova (independiente de Bravo)
const NOVA_EASE = [0.22, 1, 0.36, 1]

const pesos = (n) => Number(n || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const compactPesos = (n) => {
  const num = Number(n || 0)
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return `${num < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${num < 0 ? '-' : ''}$${Math.round(abs / 1_000)}k`
  return pesos(num)
}

const shortDate = (iso) => {
  if (!iso) return '—'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

const PAYMENT_NAMES = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta / POS',
  debito: 'Débito',
  credito: 'Crédito',
  webpay: 'Webpay',
  no_especificado: 'Otro / Sin registrar',
}

function AnimatedCounter({ value, formatter = (v) => Math.round(v).toLocaleString('es-CL'), duration = 680 }) {
  const reduced = useReducedMotion()
  const target = Number(value || 0)
  const [val, setVal] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced) {
      setVal(target)
      return
    }
    let raf
    const start = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduced])

  return <span className="tabular-nums">{formatter(val)}</span>
}

// 1. GRÁFICO SEMESTRAL DE TELEMETRÍA DEL LABORATORIO
function NovaTrendChart({ data = [] }) {
  const reduced = useReducedMotion()
  const [mode, setMode] = useState('income')
  const [activeIdx, setActiveIdx] = useState(null)

  const modes = {
    income: {
      label: 'Ingresos',
      color: '#22d3ee',
      valueOf: (d) => Number(d.income || 0),
      format: pesos,
      axisFormat: compactPesos,
    },
    repairs: {
      label: 'Equipos',
      color: '#38bdf8',
      valueOf: (d) => Number(d.repairs || 0),
      format: (v) => `${Math.round(v)} equipos`,
      axisFormat: (v) => `${Math.round(v)}`,
    },
    ticket: {
      label: 'Ticket Medio',
      color: '#10b981',
      valueOf: (d) => (d.repairs > 0 ? Number(d.income || 0) / Number(d.repairs) : 0),
      format: pesos,
      axisFormat: compactPesos,
    },
  }

  const activeMode = modes[mode]
  const vals = data.map((d) => activeMode.valueOf(d))
  const maxVal = Math.max(...vals, 1)

  const lastVal = vals.length ? vals[vals.length - 1] : 0
  const prevVal = vals.length >= 2 ? vals[vals.length - 2] : 0
  const deltaPct = prevVal > 0 ? ((lastVal - prevVal) / prevVal) * 100 : null

  const W = 540
  const H = 215
  const padL = 56
  const padR = 22
  const padT = 22
  const padB = 34
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const pts = data.map((d, i) => {
    const v = activeMode.valueOf(d)
    const x = data.length > 1 ? padL + (i / (data.length - 1)) * plotW : padL + plotW / 2
    const y = padT + plotH - (v / maxVal) * plotH
    return { x, y, v, ...d }
  })

  // Curva suavizada tipo catmull/quadratic ligera
  const linePath = pts.length > 1
    ? pts.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        const prev = pts[i - 1]
        const cx = ((prev.x + p.x) / 2).toFixed(1)
        return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      }, '')
    : pts.length === 1
      ? `M ${padL} ${pts[0].y.toFixed(1)} L ${W - padR} ${pts[0].y.toFixed(1)}`
      : ''

  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : ''

  const focusPoint = activeIdx !== null ? pts[activeIdx] : pts[pts.length - 1]

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: NOVA_EASE }}
      className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
            Tendencia Semestral
          </span>
          <h2 className="text-base font-bold text-white mt-0.5">
            Evolución de {activeMode.label} del Taller
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          {Object.entries(modes).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-xs text-slate-400">
            {activeIdx !== null ? `Detalle de ${focusPoint?.month}` : `Último mes (${focusPoint?.month || '—'})`}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums mt-0.5">
            {focusPoint ? activeMode.format(focusPoint.v) : '—'}
          </p>
          {focusPoint && (
            <p className="text-xs text-slate-400 mt-0.5">
              {focusPoint.repairs} órdenes ingresadas · {pesos(focusPoint.income)} completados
            </p>
          )}
        </div>

        {deltaPct !== null && (
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
            deltaPct > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : deltaPct < 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-800/70 border-slate-700 text-slate-300'
          }`}>
            {deltaPct > 0 ? <TrendingUp size={14} /> : deltaPct < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
            {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}% vs mes previo
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-44 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
          Sin datos suficientes para graficar tendencia
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={`novaArea-${mode}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeMode.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={activeMode.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padT + plotH - ratio * plotH
            return (
              <g key={idx}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.12)"
                  strokeDasharray={ratio === 0 ? undefined : '3 4'}
                />
                <text x={padL - 8} y={y + 3} textAnchor="end" fill="#64748b" className="text-[10px] font-mono">
                  {activeMode.axisFormat(maxVal * ratio)}
                </text>
              </g>
            )
          })}

          {areaPath && (
            <motion.path
              key={`a-${mode}`}
              d={areaPath}
              fill={`url(#novaArea-${mode})`}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}

          {linePath && (
            <motion.path
              key={`l-${mode}`}
              d={linePath}
              fill="none"
              stroke={activeMode.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.75, ease: NOVA_EASE }}
            />
          )}

          {activeIdx !== null && pts[activeIdx] && (
            <line
              x1={pts[activeIdx].x}
              y1={padT}
              x2={pts[activeIdx].x}
              y2={padT + plotH}
              stroke="rgba(34, 211, 238, 0.35)"
              strokeDasharray="3 3"
            />
          )}

          {pts.map((p, idx) => {
            const isSelected = activeIdx === idx || (activeIdx === null && idx === pts.length - 1)
            return (
              <g key={`${mode}-${p.month}-${idx}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
                />
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 5.5 : 3.5}
                  fill={isSelected ? activeMode.color : '#0b111c'}
                  stroke={activeMode.color}
                  strokeWidth="2"
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.month}: ${activeMode.format(p.v)}`}
                  onFocus={() => setActiveIdx(idx)}
                  onBlur={() => setActiveIdx(null)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
                  className="cursor-pointer"
                  initial={reduced ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.08 + idx * 0.05 }}
                />
                <text
                  x={p.x}
                  y={H - 10}
                  textAnchor="middle"
                  fill={isSelected ? '#e2e8f0' : '#64748b'}
                  className="text-[10px] font-semibold"
                >
                  {p.month}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </motion.section>
  )
}

// 2. COMPARATIVA DIARIA (7D VS 28D) NATIVA DE NOVA
function NovaPeriodTelemetry({ days = [] }) {
  const reduced = useReducedMotion()
  const [range, setRange] = useState(7)
  const [metric, setMetric] = useState('profit')
  const [hoverIdx, setHoverIdx] = useState(null)

  const metrics = {
    profit: { label: 'Margen', format: pesos },
    value: { label: 'Facturado', format: pesos },
    orders: { label: 'Listos', format: (v) => `${Math.round(v)} eq.` },
    materials: { label: 'Repuestos', format: pesos },
  }

  const cur = days.slice(-range)
  const prev = days.slice(-range * 2, -range)

  const sumOf = (arr) => arr.reduce((acc, d) => acc + Number(d?.[metric] || 0), 0)
  const curSum = sumOf(cur)
  const prevSum = sumOf(prev)
  const diff = curSum - prevSum
  const pct = prevSum > 0 ? (diff / prevSum) * 100 : null

  const maxBar = Math.max(
    1,
    ...cur.map((d) => Math.abs(Number(d?.[metric] || 0))),
    ...prev.map((d) => Math.abs(Number(d?.[metric] || 0)))
  )

  const inspectedCur = hoverIdx !== null ? cur[hoverIdx] : null
  const inspectedPrev = hoverIdx !== null ? prev[hoverIdx] : null

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: NOVA_EASE }}
      className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
            Comparativa de Períodos
          </span>
          <h2 className="text-base font-bold text-white mt-0.5">
            Últimos {range} días vs {range} días anteriores
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
            {[7, 28].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRange(r); setHoverIdx(null) }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  range === r ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            {Object.entries(metrics).map(([k, cfg]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMetric(k)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                  metric === k
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5">
        <div>
          <p className="text-[11px] text-slate-400">Actual ({range}d)</p>
          <p className="text-lg sm:text-xl font-bold text-cyan-300 tabular-nums mt-0.5">
            {metrics[metric].format(curSum)}
          </p>
        </div>
        <div className="border-l border-slate-800 pl-3">
          <p className="text-[11px] text-slate-400">Anterior ({range}d)</p>
          <p className="text-lg sm:text-xl font-bold text-slate-300 tabular-nums mt-0.5">
            {metrics[metric].format(prevSum)}
          </p>
        </div>
        <div className="border-l border-slate-800 pl-3">
          <p className="text-[11px] text-slate-400">Diferencia</p>
          <p className={`text-lg sm:text-xl font-bold tabular-nums mt-0.5 ${
            diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {diff > 0 ? '+' : ''}{metrics[metric].format(diff)}
            {pct !== null && <span className="text-xs font-normal ml-1">({pct > 0 ? '+' : ''}{pct.toFixed(0)}%)</span>}
          </p>
        </div>
      </div>

      {cur.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">Sin cierres en los últimos {range} días</p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-600 inline-block" /> Anterior</span>
            </div>
            <span className="text-cyan-300 font-medium">
              {inspectedCur
                ? `${shortDate(inspectedCur.date)}: ${metrics[metric].format(inspectedCur[metric])} · Ant. ${shortDate(inspectedPrev?.date)}: ${metrics[metric].format(inspectedPrev?.[metric] || 0)}`
                : 'Toca o pasa el cursor sobre una barra'}
            </span>
          </div>

          <div
            className="grid items-end gap-1.5 h-40 pt-3 border-b border-slate-800 pb-1"
            style={{ gridTemplateColumns: `repeat(${cur.length}, minmax(0, 1fr))` }}
          >
            {cur.map((d, idx) => {
              const p = prev[idx]
              const cVal = Number(d?.[metric] || 0)
              const pVal = Number(p?.[metric] || 0)
              const cH = Math.max(cVal !== 0 ? 7 : 2, (Math.abs(cVal) / maxBar) * 100)
              const pH = Math.max(pVal !== 0 ? 7 : 2, (Math.abs(pVal) / maxBar) * 100)
              const isHover = hoverIdx === idx

              return (
                <div
                  key={d.date}
                  tabIndex={0}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onFocus={() => setHoverIdx(idx)}
                  onBlur={() => setHoverIdx(null)}
                  onClick={() => setHoverIdx(hoverIdx === idx ? null : idx)}
                  className={`h-full flex items-end justify-center gap-0.5 rounded-t-md px-0.5 cursor-pointer transition-colors ${
                    isHover ? 'bg-cyan-500/10' : ''
                  }`}
                >
                  <motion.div
                    key={`np-${range}-${metric}-${d.date}`}
                    initial={reduced ? false : { height: '2%' }}
                    animate={{ height: `${pH}%` }}
                    transition={{ duration: 0.45, delay: idx * 0.012, ease: NOVA_EASE }}
                    className="w-1/2 max-w-[14px] rounded-t-sm bg-slate-600"
                  />
                  <motion.div
                    key={`nc-${range}-${metric}-${d.date}`}
                    initial={reduced ? false : { height: '2%' }}
                    animate={{ height: `${cH}%` }}
                    transition={{ duration: 0.5, delay: 0.03 + idx * 0.012, ease: NOVA_EASE }}
                    className={`w-1/2 max-w-[14px] rounded-t-sm ${
                      cVal < 0 ? 'bg-rose-400' : isHover ? 'bg-cyan-300' : 'bg-cyan-400'
                    }`}
                  />
                </div>
              )
            })}
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>{shortDate(cur[0]?.date)}</span>
            <span>{shortDate(cur[Math.floor(cur.length / 2)]?.date)}</span>
            <span>{shortDate(cur[cur.length - 1]?.date)}</span>
          </div>
        </div>
      )}
    </motion.section>
  )
}

// 3. FLUJO DEL TALLER + ALERTAS OPERATIVAS
function NovaWorkshopPipeline({ stages = [], activeRepairs, workshop }) {
  const reduced = useReducedMotion()
  const maxCount = Math.max(1, ...stages.map((s) => Number(s.count || 0)))
  const totalCount = stages.reduce((acc, s) => acc + Number(s.count || 0), 0)

  const stageColor = (code) => {
    switch (code) {
      case 'recibido': return 'bg-sky-400'
      case 'diagnostico': return 'bg-indigo-400'
      case 'en_reparacion': return 'bg-cyan-400'
      case 'listo': return 'bg-amber-400'
      case 'entregado': return 'bg-emerald-400'
      case 'cancelado': return 'bg-rose-400'
      default: return 'bg-slate-400'
    }
  }

  const alerts = [
    { label: 'Sin técnico asignado', value: activeRepairs?.unassigned ?? 0, tone: (activeRepairs?.unassigned || 0) > 0 ? 'amber' : 'ok' },
    { label: 'Sin fecha de entrega', value: activeRepairs?.without_date ?? 0, tone: (activeRepairs?.without_date || 0) > 0 ? 'amber' : 'ok' },
    { label: 'Reingresos garantía', value: activeRepairs?.warranty ?? 0, tone: (activeRepairs?.warranty || 0) > 0 ? 'rose' : 'ok' },
    { label: 'Vencidas / Para hoy', value: (workshop?.overdue || 0) + (workshop?.due_today || 0), tone: (workshop?.overdue || 0) > 0 ? 'rose' : 'ok' },
  ]

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: NOVA_EASE }}
      className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
            Flujo Técnico en Vivo
          </span>
          <h2 className="text-base font-bold text-white mt-0.5">
            Distribución por Estado & Alertas de Banco
          </h2>
        </div>
        <Link
          to="/repairs"
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
        >
          Ir al tablero <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Alert Chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {alerts.map((a) => (
          <div
            key={a.label}
            className={`rounded-xl border p-3.5 transition-colors ${
              a.tone === 'rose'
                ? 'bg-rose-500/10 border-rose-500/30'
                : a.tone === 'amber'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-900/70 border-slate-800'
            }`}
          >
            <p className="text-[11px] text-slate-300">{a.label}</p>
            <p className={`text-2xl font-extrabold tabular-nums mt-1 ${
              a.tone === 'rose' ? 'text-rose-300' : a.tone === 'amber' ? 'text-amber-300' : 'text-emerald-300'
            }`}>
              {a.value}
            </p>
          </div>
        ))}
      </div>

      {/* Stage Funnel */}
      <div className="space-y-3">
        {stages.map((st, idx) => {
          const widthPct = (Number(st.count || 0) / maxCount) * 100
          const share = totalCount > 0 ? ((st.count / totalCount) * 100).toFixed(0) : 0
          return (
            <div key={st.status} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{st.label}</span>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-slate-400">{pesos(st.total_value)}</span>
                  <span className="font-bold text-white w-16 text-right">{st.count} ({share}%)</span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <motion.div
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${Math.max(st.count > 0 ? 4 : 0, widthPct)}%` }}
                  transition={{ duration: 0.55, delay: idx * 0.05, ease: NOVA_EASE }}
                  className={`h-full rounded-full ${stageColor(st.status)}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}

// 4. DONA INTERACTIVA DE EQUIPOS + MARGEN SEMANAL
function NovaDevicesAndWeekly({ deviceShare = [], weeklyProfit = [] }) {
  const reduced = useReducedMotion()
  const [activeSlice, setActiveSlice] = useState(null)

  const totalPct = deviceShare.reduce((s, d) => s + Number(d.percentage || 0), 0)
  const totalDevices = deviceShare.reduce((s, d) => s + Number(d.count || 0), 0)
  const r = 40
  const circ = 2 * Math.PI * r
  let accPct = 0

  const iconForDevice = (name) => {
    const lower = (name || '').toLowerCase()
    if (lower.includes('celul')) return Smartphone
    if (lower.includes('note')) return Laptop
    if (lower.includes('consol')) return Gamepad2
    return Box
  }

  const weekTotal = weeklyProfit.reduce((s, d) => s + Number(d.profit || 0), 0)
  const weekOrders = weeklyProfit.reduce((s, d) => s + Number(d.orders || 0), 0)
  const maxWeek = Math.max(1, ...weeklyProfit.map((d) => Math.abs(Number(d.profit || 0))))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Distribución por tipo de equipo */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: NOVA_EASE }}
        className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between"
      >
        <div className="pb-4 border-b border-slate-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
            Parque Técnico
          </span>
          <h2 className="text-base font-bold text-white mt-0.5">
            Distribución por Tipo de Equipo
          </h2>
        </div>

        {totalPct === 0 ? (
          <div className="min-h-[200px] flex items-center justify-center text-xs text-slate-500">
            Sin equipos registrados todavía
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-5">
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(148,163,184,0.12)" strokeWidth="10" />
                {deviceShare.map((item, idx) => {
                  const pct = Number(item.percentage || 0)
                  const dashOffset = circ - (pct / 100) * circ
                  const rot = (accPct / 100) * 360
                  accPct += pct
                  if (pct <= 0) return null

                  return (
                    <motion.circle
                      key={item.name}
                      cx="50"
                      cy="50"
                      r={r}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={activeSlice === idx ? 13 : 10}
                      strokeDasharray={circ}
                      initial={reduced ? { strokeDashoffset: dashOffset } : { strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: dashOffset }}
                      transition={{ duration: 0.75, delay: idx * 0.08, ease: NOVA_EASE }}
                      style={{ transformOrigin: '50px 50px', transform: `rotate(${rot}deg)` }}
                      className="cursor-pointer transition-[stroke-width] duration-200"
                      onMouseEnter={() => setActiveSlice(idx)}
                      onMouseLeave={() => setActiveSlice(null)}
                      onClick={() => setActiveSlice(activeSlice === idx ? null : idx)}
                    />
                  )
                })}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                {activeSlice !== null && deviceShare[activeSlice] ? (
                  <>
                    <span className="text-[10px] font-semibold uppercase text-slate-400 truncate max-w-[85px]">
                      {deviceShare[activeSlice].name}
                    </span>
                    <span className="text-xl font-extrabold text-white tabular-nums">
                      {deviceShare[activeSlice].percentage}%
                    </span>
                    <span className="text-[10px] text-cyan-300">
                      {deviceShare[activeSlice].count ?? 0} eq.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Equipos</span>
                    <span className="text-xl font-extrabold text-white tabular-nums">{totalDevices}</span>
                    <span className="text-[10px] text-slate-400">total</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 w-full space-y-2">
              {deviceShare.map((item, idx) => {
                const Icon = iconForDevice(item.name)
                return (
                  <div
                    key={item.name}
                    tabIndex={0}
                    onMouseEnter={() => setActiveSlice(idx)}
                    onMouseLeave={() => setActiveSlice(null)}
                    onFocus={() => setActiveSlice(idx)}
                    onBlur={() => setActiveSlice(null)}
                    onClick={() => setActiveSlice(activeSlice === idx ? null : idx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                      activeSlice === idx
                        ? 'bg-slate-800/80 border-cyan-500/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <Icon size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-slate-400">{item.count ?? 0} uds</span>
                      <span className="font-bold text-white w-11 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </motion.section>

      {/* Margen de la semana en curso */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: NOVA_EASE }}
        className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between"
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Semana Actual (Chile)
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Margen Diario Post-Repuestos
            </h2>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-emerald-400 tabular-nums">{pesos(weekTotal)}</p>
            <p className="text-[11px] text-slate-400">{weekOrders} completadas</p>
          </div>
        </div>

        <div className="space-y-2.5 pt-4">
          {weeklyProfit.map((day, idx) => {
            const val = Number(day.profit || 0)
            const wPct = (Math.abs(val) / maxWeek) * 100
            return (
              <div key={day.date} className="grid grid-cols-[4.5rem_1fr_2.2rem_5.5rem] items-center gap-2.5 text-xs">
                <span className="text-slate-300 capitalize">
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}
                </span>
                <div className="h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <motion.div
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${val !== 0 ? Math.max(5, wPct) : 0}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05, ease: NOVA_EASE }}
                    className={`h-full rounded-full ${val < 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                  />
                </div>
                <span className="text-[11px] text-slate-400 text-center tabular-nums">{day.orders}</span>
                <span className={`text-right font-semibold tabular-nums ${val < 0 ? 'text-rose-300' : 'text-slate-100'}`}>
                  {pesos(val)}
                </span>
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-800/70">
          Calculado sobre reparaciones pasadas a Listo/Entregado menos el costo de repuestos utilizados.
        </p>
      </motion.section>
    </div>
  )
}

// 5. RENTABILIDAD REAL (TALLER + POS) Y MEDIOS DE PAGO
function NovaFinanceAndPayments({ stats, saleStats }) {
  const reduced = useReducedMotion()

  const repairRev = Number(stats.total_earnings || 0)
  const posRev = Number(saleStats?.total_revenue || 0)
  const partsCost = Number(stats.total_costs || 0)
  const repairNet = Math.max(0, repairRev - partsCost)
  const grandTotal = Math.max(1, repairNet + partsCost + posRev)

  const netPct = (repairNet / grandTotal) * 100
  const posPct = (posRev / grandTotal) * 100
  const partsPct = (partsCost / grandTotal) * 100

  const mergedPayments = useMemo(() => {
    const acc = {}
    for (const row of stats.payment_methods || []) {
      const k = (row.method || 'no_especificado').toLowerCase()
      acc[k] = { method: k, count: (acc[k]?.count || 0) + Number(row.count || 0), total: (acc[k]?.total || 0) + Number(row.total || 0) }
    }
    for (const row of saleStats?.by_payment_method || []) {
      const k = (row.method || 'no_especificado').toLowerCase()
      acc[k] = { method: k, count: (acc[k]?.count || 0) + Number(row.count || 0), total: (acc[k]?.total || 0) + Number(row.total || 0) }
    }
    return Object.values(acc).sort((a, b) => b.total - a.total)
  }, [stats.payment_methods, saleStats])

  const totalPayments = Math.max(1, mergedPayments.reduce((s, x) => s + x.total, 0))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: NOVA_EASE }}
        className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between gap-5"
      >
        <div className="pb-4 border-b border-slate-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Estructura Económica
          </span>
          <h2 className="text-base font-bold text-white mt-0.5">
            Composición de Ingresos: Taller + POS vs Repuestos
          </h2>
        </div>

        <div className="space-y-4">
          <div className="h-7 w-full rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex">
            <motion.div
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${netPct}%` }}
              transition={{ duration: 0.65, ease: NOVA_EASE }}
              className="bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-slate-950"
            >
              {netPct >= 14 ? `${netPct.toFixed(0)}%` : ''}
            </motion.div>
            {posPct > 0 && (
              <motion.div
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${posPct}%` }}
                transition={{ duration: 0.65, delay: 0.08, ease: NOVA_EASE }}
                className="bg-cyan-400 flex items-center justify-center text-[10px] font-bold text-slate-950"
              >
                {posPct >= 14 ? `${posPct.toFixed(0)}%` : ''}
              </motion.div>
            )}
            <motion.div
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${partsPct}%` }}
              transition={{ duration: 0.65, delay: 0.14, ease: NOVA_EASE }}
              className="bg-amber-500/80 flex items-center justify-center text-[10px] font-bold text-slate-950"
            >
              {partsPct >= 14 ? `${partsPct.toFixed(0)}%` : ''}
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
              <p className="text-[11px] text-emerald-400 font-semibold">Margen Taller</p>
              <p className="text-base font-bold text-white tabular-nums mt-1">{pesos(repairNet)}</p>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
              <p className="text-[11px] text-cyan-400 font-semibold">Ventas POS</p>
              <p className="text-base font-bold text-white tabular-nums mt-1">{pesos(posRev)}</p>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
              <p className="text-[11px] text-amber-400 font-semibold">Costo Repuestos</p>
              <p className="text-base font-bold text-white tabular-nums mt-1">{pesos(partsCost)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-slate-800/70 text-xs text-slate-400">
          <span>Ticket medio taller: <strong className="text-white">{pesos(stats.average_ticket)}</strong></span>
          <span>Ventas POS registradas: <strong className="text-cyan-300">{saleStats?.sales_count || 0}</strong></span>
        </div>
      </motion.section>

      <motion.section
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: NOVA_EASE }}
        className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between gap-5"
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
              Flujo de Caja
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Ingresos por Medio de Pago
            </h2>
          </div>
          <Link to="/sales" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
            Ir a Ventas <ArrowUpRight size={14} />
          </Link>
        </div>

        {mergedPayments.length === 0 ? (
          <div className="min-h-[140px] flex items-center justify-center text-xs text-slate-500">
            Sin pagos registrados por método todavía
          </div>
        ) : (
          <div className="space-y-3">
            {mergedPayments.map((pm, idx) => {
              const pct = (pm.total / totalPayments) * 100
              return (
                <div key={pm.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium flex items-center gap-2">
                      <CreditCard size={13} className="text-cyan-400" />
                      {PAYMENT_NAMES[pm.method] || pm.method}
                      <span className="text-[11px] text-slate-500">({pm.count})</span>
                    </span>
                    <span className="font-semibold text-white tabular-nums">
                      {pesos(pm.total)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <motion.div
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${Math.max(4, pct)}%` }}
                      transition={{ duration: 0.55, delay: idx * 0.06, ease: NOVA_EASE }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-400"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-between pt-3 border-t border-slate-800/70 text-xs text-slate-400">
          <span>Pendiente en equipos listos</span>
          <strong className="text-amber-300 tabular-nums">{pesos(stats.pending_collect)}</strong>
        </div>
      </motion.section>
    </div>
  )
}

// 6. ACCIONES PRIORITARIAS, TOP CLIENTES Y DIAGNÓSTICO EJECUTIVO
function NovaOperationsAndClients({ stats }) {
  const reduced = useReducedMotion()
  const work = stats.workshop || {}
  const topClients = stats.top_clients || []
  const maxSpent = Math.max(1, ...topClients.map((c) => Number(c.total_spent || 0)))

  // Diagnóstico automático basado en métricas reales
  const insights = useMemo(() => {
    const list = []
    if ((work.overdue || 0) > 0) {
      list.push({
        level: 'danger',
        title: `${work.overdue} reparación(es) con entrega vencida`,
        desc: 'Prioriza estos equipos en banco y avisa al cliente desde la ficha de orden.',
      })
    } else {
      list.push({
        level: 'ok',
        title: 'Entregas al día sin atrasos vencidos',
        desc: 'Todas las órdenes activas con fecha comprometida están dentro de plazo.',
      })
    }

    if ((stats.pending_collect || 0) > 0) {
      list.push({
        level: 'warn',
        title: `${pesos(stats.pending_collect)} esperando retiro en mostrador`,
        desc: 'Hay equipos listos con saldo pendiente. Coordinar retiro libera caja inmediata.',
      })
    } else {
      list.push({
        level: 'ok',
        title: 'Cobranza de equipos listos al día',
        desc: 'No tienes saldos retenidos en equipos terminados esperando retiro.',
      })
    }

    if ((stats.active_repairs?.unassigned || 0) > 0) {
      list.push({
        level: 'warn',
        title: `${stats.active_repairs.unassigned} orden(es) sin técnico asignado`,
        desc: 'Asignar responsable reduce el tiempo de diagnóstico y mejora tu SLA promedio.',
      })
    } else {
      list.push({
        level: 'ok',
        title: `Margen del taller en ${stats.net_margin || 0}%`,
        desc: `Tasa de resolución vigente del ${stats.success_rate || 0}% con SLA medio de ${stats.avg_sla_hours || 0} h.`,
      })
    }
    return list
  }, [stats, work])

  return (
    <div className="space-y-6">
      {/* Diagnóstico Ejecutivo en semáforo */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((ins, i) => (
          <motion.div
            key={ins.title}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: NOVA_EASE }}
            className={`rounded-2xl border p-4 flex items-start gap-3 ${
              ins.level === 'danger'
                ? 'bg-rose-500/10 border-rose-500/30'
                : ins.level === 'warn'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            {ins.level === 'ok' ? (
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className={ins.level === 'danger' ? 'text-rose-400 flex-shrink-0 mt-0.5' : 'text-amber-400 flex-shrink-0 mt-0.5'} />
            )}
            <div>
              <h3 className="text-xs font-bold text-white">{ins.title}</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{ins.desc}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entregas Urgentes */}
        <section className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Prioridad</p>
                <h3 className="text-sm font-bold text-white">Entregas Urgentes</h3>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                {work.overdue || 0} venc. · {work.due_today || 0} hoy
              </span>
            </div>

            <div className="divide-y divide-slate-800/70 mt-2">
              {(work.deliveries || []).length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Sin entregas vencidas ni para hoy.</p>
              ) : (
                work.deliveries.map((r) => (
                  <Link
                    key={r.id}
                    to={`/repairs/${r.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-xl hover:bg-slate-900/80 transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-cyan-300">{r.number}</p>
                      <p className="text-xs text-slate-200 truncate">
                        {r.client_name || 'Cliente'} {r.title ? `· ${r.title}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] font-semibold text-rose-300 tabular-nums">{shortDate(r.date)}</span>
                      <ChevronRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Cobros en retiro */}
        <section className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Mostrador</p>
                <h3 className="text-sm font-bold text-white">Listos por Cobrar</h3>
              </div>
              <Wallet size={16} className="text-amber-400" />
            </div>

            <div className="divide-y divide-slate-800/70 mt-2">
              {(work.collections || []).length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Sin saldos pendientes en equipos listos.</p>
              ) : (
                work.collections.map((r) => (
                  <Link
                    key={r.id}
                    to={`/repairs/${r.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-xl hover:bg-slate-900/80 transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white">{r.number}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {r.client_name || 'Cliente'} {r.title ? `· ${r.title}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold text-amber-300 tabular-nums">{pesos(r.balance)}</span>
                      <ChevronRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Top Clientes */}
        <section className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">Ranking</p>
                <h3 className="text-sm font-bold text-white">Top Clientes del Taller</h3>
              </div>
              <Users size={16} className="text-sky-400" />
            </div>

            <div className="space-y-3 mt-4">
              {topClients.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">Sin clientes registrados aún.</p>
              ) : (
                topClients.map((c, idx) => {
                  const pct = (Number(c.total_spent || 0) / maxSpent) * 100
                  return (
                    <Link key={c.id} to={`/clients/${c.id}`} className="block group">
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="text-slate-200 font-medium group-hover:text-cyan-300 transition-colors truncate pr-2">
                          <span className="text-slate-500 font-mono mr-1.5">#{idx + 1}</span>
                          {c.name}
                        </span>
                        <span className="font-bold text-white tabular-nums flex-shrink-0">{pesos(c.total_spent)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-900 overflow-hidden">
                          <motion.div
                            initial={reduced ? false : { width: 0 }}
                            animate={{ width: `${Math.max(6, pct)}%` }}
                            transition={{ duration: 0.55, delay: idx * 0.06, ease: NOVA_EASE }}
                            className="h-full rounded-full bg-cyan-400"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{c.orders} órd.</span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

const NOVA_TABS = [
  { id: 'summary', label: 'Resumen General' },
  { id: 'finance', label: 'Finanzas & POS' },
  { id: 'workshop', label: 'Taller & Equipos' },
  { id: 'clients', label: 'Cobros & Clientes' },
]

export default function StatsPage() {
  const reduced = useReducedMotion()
  const [activeTab, setActiveTab] = useState('summary')
  const [stats, setStats] = useState(null)
  const [saleStats, setSaleStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)

    Promise.all([
      getRepairStats({ system: 'nova' }),
      getSaleStats({ system: 'nova' }).catch(() => ({ data: { total_revenue: 0, sales_count: 0, average_ticket: 0, by_payment_method: [], daily_revenue: [] } })),
    ])
      .then(([repairRes, saleRes]) => {
        if (!active) return
        setStats(repairRes.data)
        setSaleStats(saleRes.data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [refresh])

  const exportCsv = () => {
    if (!stats) return
    const rows = [
      ['Indicador', 'Valor'],
      ['Órdenes Registradas', stats.total_repairs],
      ['En Curso', stats.workshop?.in_production || 0],
      ['Ingresos Taller Completados (CLP)', stats.total_earnings],
      ['Ingresos Ventas POS (CLP)', Number(saleStats?.total_revenue || 0)],
      ['Costo Repuestos (CLP)', stats.total_costs],
      ['Utilidad Estimada Taller (CLP)', stats.estimated_net_profit],
      ['Margen (%)', `${stats.net_margin}%`],
      ['SLA Promedio (Horas)', stats.avg_sla_hours],
      ['Tasa de Éxito (%)', `${stats.success_rate}%`],
      ['Por Cobrar Abiertos (CLP)', stats.open_balance?.amount || 0],
      ['Por Cobrar Listos para Retiro (CLP)', stats.pending_collect],
      [],
      ['Mes', 'Ingresos CLP', 'Equipos'],
      ...(stats.income_history || []).map((m) => [m.month, m.income, m.repairs]),
    ]
    const csv = '\uFEFF' + rows.map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nova-estadisticas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalCombined = Number(stats?.total_earnings || 0) + Number(saleStats?.total_revenue || 0)

  const kpiCards = stats ? [
    {
      label: 'Ingresos Totales',
      raw: totalCombined,
      formatter: pesos,
      icon: DollarSign,
      bar: 'from-cyan-400 to-sky-500',
      iconColor: 'text-cyan-400',
      sub: `Taller ${pesos(stats.total_earnings)} · POS ${pesos(saleStats?.total_revenue || 0)}`,
    },
    {
      label: 'Utilidad Neta Taller',
      raw: Number(stats.estimated_net_profit || 0),
      formatter: pesos,
      icon: TrendingUp,
      bar: 'from-emerald-400 to-teal-500',
      iconColor: 'text-emerald-400',
      badge: `${stats.net_margin || 0}% margen`,
      sub: `Repuestos descontados: ${pesos(stats.total_costs)}`,
    },
    {
      label: 'SLA Promedio & Éxito',
      raw: Number(stats.avg_sla_hours || 0),
      formatter: (v) => `${v.toFixed(1)} h`,
      icon: Gauge,
      bar: 'from-sky-400 to-indigo-400',
      iconColor: 'text-sky-400',
      badge: stats.non_cancelled ? `${stats.success_rate}% éxito` : 'Sin datos',
      sub: stats.measured_times ? `Medido en ${stats.measured_times} cierres reales` : 'Estimado base hasta registrar cierres',
    },
    {
      label: 'Saldo por Cobrar',
      raw: Number(stats.open_balance?.amount || 0),
      formatter: pesos,
      icon: Wallet,
      bar: 'from-amber-400 to-orange-400',
      iconColor: 'text-amber-400',
      sub: `${pesos(stats.pending_collect)} ya listos para retiro (${stats.open_balance?.orders || 0} abiertas)`,
    },
  ] : []

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 text-left text-slate-100 pb-12">
      {/* Header Técnico Nova */}
      <header className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <Link
            to="/dashboard"
            aria-label="Volver al panel principal de Nova"
            className="mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Laboratorio Nova · Analítica en Vivo
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
              Estadísticas del Taller y Ventas
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Rendimiento técnico, márgenes reales descontando repuestos, ventas POS y alertas accionables.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setRefresh((n) => n + 1)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!stats}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:border-cyan-500/40 text-xs font-semibold text-cyan-300 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertTriangle size={18} className="text-rose-400" />
            <span>No se pudieron cargar las estadísticas de Nova.</span>
          </div>
          <button
            type="button"
            onClick={() => setRefresh((n) => n + 1)}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-[#0b111c] border border-slate-800" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 rounded-2xl bg-[#0b111c] border border-slate-800" />
            <div className="h-80 rounded-2xl bg-[#0b111c] border border-slate-800" />
          </div>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, idx) => (
              <motion.article
                key={card.label}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.05, ease: NOVA_EASE }}
                className="relative overflow-hidden rounded-2xl border border-slate-800 hover:border-slate-700 bg-[#0b111c] p-5 flex flex-col justify-between transition-colors"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.bar}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-400">{card.label}</span>
                  <card.icon size={16} className={card.iconColor} />
                </div>

                <div className="flex flex-wrap items-baseline gap-2 my-3">
                  <p className="text-2xl font-extrabold text-white tracking-tight">
                    <AnimatedCounter value={card.raw} formatter={card.formatter} />
                  </p>
                  {card.badge && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-cyan-300">
                      {card.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">{card.sub}</p>
              </motion.article>
            ))}
          </section>

          {/* Tabs con indicador animado */}
          <nav aria-label="Secciones de estadísticas Nova" className="flex flex-wrap items-center gap-2 print:hidden">
            {NOVA_TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    active ? 'text-slate-950' : 'text-slate-400 hover:text-slate-200 bg-slate-900/70 border border-slate-800'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nova-stats-active-tab"
                      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      className="absolute inset-0 rounded-xl bg-cyan-400 -z-10"
                    />
                  )}
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {/* Contenido dinámico por pestaña */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: NOVA_EASE }}
              className="space-y-6"
            >
              {(activeTab === 'summary' || activeTab === 'finance') && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <NovaTrendChart data={stats.income_history || []} />
                  <NovaPeriodTelemetry days={stats.comparison_days || []} />
                </div>
              )}

              {(activeTab === 'summary' || activeTab === 'workshop') && (
                <>
                  <NovaWorkshopPipeline
                    stages={stats.status_breakdown || []}
                    activeRepairs={stats.active_repairs}
                    workshop={stats.workshop}
                  />
                  <NovaDevicesAndWeekly
                    deviceShare={stats.device_share || []}
                    weeklyProfit={stats.weekly_profit || []}
                  />
                </>
              )}

              {(activeTab === 'summary' || activeTab === 'finance') && (
                <NovaFinanceAndPayments stats={stats} saleStats={saleStats} />
              )}

              {(activeTab === 'summary' || activeTab === 'clients') && (
                <NovaOperationsAndClients stats={stats} />
              )}

              {/* Tabla de últimos equipos completados en pestaña Finanzas */}
              {activeTab === 'finance' && (stats.recent_completed || []).length > 0 && (
                <section className="rounded-2xl border border-slate-800 bg-[#0b111c] p-5">
                  <div className="pb-4 mb-3 border-b border-slate-800/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                      Detalle de Cierres
                    </span>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      Últimas Reparaciones Completadas
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left tabular-nums">
                      <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 pr-4">Orden</th>
                          <th className="py-2.5 pr-4">Cliente</th>
                          <th className="py-2.5 pr-4">Equipo</th>
                          <th className="py-2.5 pr-4 text-right">Cobrado</th>
                          <th className="py-2.5 pr-4 text-right">Repuestos</th>
                          <th className="py-2.5 text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {stats.recent_completed.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-3 pr-4 font-bold">
                              <Link to={`/repairs/${row.id}`} className="text-cyan-300 hover:underline">
                                {row.order_number}
                              </Link>
                            </td>
                            <td className="py-3 pr-4 text-slate-200">{row.client_name}</td>
                            <td className="py-3 pr-4 text-slate-400 max-w-[220px] truncate">{row.title}</td>
                            <td className="py-3 pr-4 text-right text-slate-200">{pesos(row.revenue)}</td>
                            <td className="py-3 pr-4 text-right text-amber-300">{pesos(row.cost)}</td>
                            <td className="py-3 text-right font-bold text-emerald-400">{pesos(row.margin)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </main>
  )
}
