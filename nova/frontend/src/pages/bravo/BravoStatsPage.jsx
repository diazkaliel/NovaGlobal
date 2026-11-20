import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft, Activity, DollarSign, Sparkles, Clock, Cpu,
  TrendingUp, TrendingDown, Layers, RefreshCw, Download, Printer,
  AlertTriangle, CheckCircle2, Users, CreditCard, ShoppingBag,
  ChevronRight, ArrowUpRight, Minus, Wrench, Gauge
} from 'lucide-react'
import BravoBackground from '../../components/bravo/BravoBackground'
import { getRepairStats } from '../../api/repairs'
import { getSaleStats } from '../../api/sales'

// Curva editorial paciente definida en design/DESIGN.md y bravo.css
const BRAVO_EASE = [0.19, 1, 0.22, 1]

const formatCLP = (value) => {
  const num = Number(value || 0)
  return num.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

const formatCompactCLP = (value) => {
  const num = Number(value || 0)
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return `${num < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${num < 0 ? '-' : ''}$${Math.round(abs / 1_000)}k`
  return formatCLP(num)
}

const formatDateShort = (iso) => {
  if (!iso) return '—'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta / POS',
  debito: 'Débito',
  credito: 'Crédito',
  webpay: 'Webpay',
  no_especificado: 'Otro / Sin registrar',
}

// Contador numérico suave que respeta prefers-reduced-motion
function AnimatedMetric({ value, formatter = (v) => Math.round(v).toLocaleString('es-CL'), duration = 850 }) {
  const reduced = useReducedMotion()
  const target = Number(value || 0)
  const [display, setDisplay] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(target)
      return
    }
    let frameId
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplay(from + (target - from) * eased)
      if (progress < 1) frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [target, duration, reduced])

  return <span className="tabular-nums">{formatter(display)}</span>
}

// 1. CURVA SEMESTRAL EDITORIAL DE INGRESOS, PEDIDOS Y TICKET
function BravoRevenueChart({ data = [] }) {
  const reduced = useReducedMotion()
  const [metric, setMetric] = useState('income')
  const [activeIdx, setActiveIdx] = useState(null)

  const metrics = {
    income: {
      label: 'Ingresos CLP',
      unit: 'CLP',
      valueOf: (d) => Number(d.income || 0),
      format: (v) => formatCLP(v),
      shortFormat: (v) => formatCompactCLP(v),
    },
    repairs: {
      label: 'Pedidos',
      unit: 'pedidos',
      valueOf: (d) => Number(d.repairs || 0),
      format: (v) => `${Math.round(v)} pedidos`,
      shortFormat: (v) => `${Math.round(v)}`,
    },
    ticket: {
      label: 'Ticket Promedio',
      unit: 'CLP',
      valueOf: (d) => (d.repairs > 0 ? Number(d.income || 0) / Number(d.repairs) : 0),
      format: (v) => formatCLP(v),
      shortFormat: (v) => formatCompactCLP(v),
    },
  }

  const currentMetric = metrics[metric]
  const values = data.map((d) => currentMetric.valueOf(d))
  const maxVal = Math.max(...values, 1)

  const latestVal = values.length >= 1 ? values[values.length - 1] : 0
  const prevVal = values.length >= 2 ? values[values.length - 2] : 0
  const deltaPct = prevVal > 0 ? ((latestVal - prevVal) / prevVal) * 100 : null

  const chartW = 540
  const chartH = 210
  const padL = 56
  const padR = 24
  const padT = 24
  const padB = 34
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  const points = data.map((d, i) => {
    const val = currentMetric.valueOf(d)
    const x = data.length > 1 ? padL + (i / (data.length - 1)) * plotW : padL + plotW / 2
    const y = padT + plotH - (val / maxVal) * plotH
    return { x, y, val, ...d }
  })

  const linePath = points.length > 1
    ? `M ${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`
    : points.length === 1
      ? `M ${padL} ${points[0].y.toFixed(1)} L ${chartW - padR} ${points[0].y.toFixed(1)}`
      : ''

  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : ''

  const selectedPoint = activeIdx !== null ? points[activeIdx] : points[points.length - 1]

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: BRAVO_EASE }}
      className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(210,177,111,0.18)] pb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
            Curva Semestral · 6 Meses
          </p>
          <h2 className="text-lg font-light tracking-tight text-[#f2eee6] mt-1">
            Evolución de {currentMetric.label}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(metrics).map(([key, cfg]) => {
            const active = metric === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                className={`px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.08em] border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#d4af67] text-[#10100f] border-[#d4af67] font-semibold'
                    : 'bg-transparent text-[#b1aba0] border-[rgba(210,177,111,0.25)] hover:text-[#f2eee6] hover:border-[rgba(210,177,111,0.55)]'
                }`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lectura rápida del mes seleccionado o último mes */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 py-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#b1aba0]">
            {activeIdx !== null ? `Mes seleccionado · ${selectedPoint?.month}` : `Último mes registrado · ${selectedPoint?.month || '—'}`}
          </p>
          <p className="text-3xl font-light text-[#f2eee6] tabular-nums mt-0.5">
            {selectedPoint ? currentMetric.format(selectedPoint.val) : '—'}
          </p>
          {selectedPoint && (
            <p className="text-xs text-[#b1aba0] mt-1">
              {selectedPoint.repairs} pedidos ingresados · {formatCLP(selectedPoint.income)} facturados
            </p>
          )}
        </div>

        {deltaPct !== null && (
          <div className={`px-3.5 py-1.5 rounded-[75px] border text-xs font-mono flex items-center gap-1.5 ${
            deltaPct > 0
              ? 'border-[rgba(212,175,103,0.45)] text-[#f0ce8c] bg-[#241f15]'
              : deltaPct < 0
                ? 'border-[rgba(211,89,71,0.45)] text-[#f0a396] bg-[#241614]'
                : 'border-[rgba(210,177,111,0.2)] text-[#b1aba0]'
          }`}>
            {deltaPct > 0 ? <TrendingUp size={13} /> : deltaPct < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
            <span>{deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}% vs mes anterior</span>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="min-h-[190px] flex items-center justify-center border border-dashed border-[rgba(210,177,111,0.2)] text-xs font-mono text-[#b1aba0] uppercase tracking-widest">
          Sin historial mensual suficiente
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="bravoBrassFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4af67" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#d4af67" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Rejilla horizontal editorial */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padT + plotH - ratio * plotH
              const labelVal = maxVal * ratio
              return (
                <g key={idx}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                    stroke="rgba(210, 177, 111, 0.14)"
                    strokeWidth="1"
                    strokeDasharray={ratio === 0 ? undefined : '2 4'}
                  />
                  <text
                    x={padL - 10}
                    y={y + 3}
                    textAnchor="end"
                    fill="#8e877b"
                    className="text-[9px] font-mono"
                  >
                    {currentMetric.shortFormat(labelVal)}
                  </text>
                </g>
              )
            })}

            {/* Área translúcida */}
            {areaPath && (
              <motion.path
                key={`area-${metric}`}
                d={areaPath}
                fill="url(#bravoBrassFill)"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, ease: BRAVO_EASE }}
              />
            )}

            {/* Línea principal animada */}
            {linePath && (
              <motion.path
                key={`line-${metric}`}
                d={linePath}
                fill="none"
                stroke="#d4af67"
                strokeWidth="2"
                initial={reduced ? false : { pathLength: 0, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.05, ease: BRAVO_EASE }}
              />
            )}

            {/* Línea guía vertical al inspeccionar */}
            {activeIdx !== null && points[activeIdx] && (
              <line
                x1={points[activeIdx].x}
                y1={padT}
                x2={points[activeIdx].x}
                y2={padT + plotH}
                stroke="rgba(240, 206, 140, 0.45)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}

            {/* Nodos interactivos */}
            {points.map((p, idx) => {
              const isSelected = activeIdx === idx || (activeIdx === null && idx === points.length - 1)
              return (
                <g key={`${metric}-${p.month}-${idx}`}>
                  {/* Área táctil amplia */}
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
                    fill={isSelected ? '#f0ce8c' : '#090909'}
                    stroke="#d4af67"
                    strokeWidth="2"
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.month}: ${currentMetric.format(p.val)}`}
                    onFocus={() => setActiveIdx(idx)}
                    onBlur={() => setActiveIdx(null)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseLeave={() => setActiveIdx(null)}
                    onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
                    className="cursor-pointer"
                    initial={reduced ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15 + idx * 0.06, duration: 0.45, ease: BRAVO_EASE }}
                  />
                  <text
                    x={p.x}
                    y={chartH - 10}
                    textAnchor="middle"
                    fill={isSelected ? '#f0ce8c' : '#9f988c'}
                    className="text-[10px] font-mono uppercase"
                  >
                    {p.month}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </motion.section>
  )
}

// 2. COMPARACIÓN DE PERÍODOS (7 DÍAS VS 28 DÍAS) NATIVA EN ESTILO BRAVO
function BravoPeriodComparison({ days = [] }) {
  const reduced = useReducedMotion()
  const [range, setRange] = useState(7)
  const [metric, setMetric] = useState('profit')
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const metricDefs = {
    profit: { label: 'Margen', format: formatCLP },
    value: { label: 'Facturado', format: formatCLP },
    orders: { label: 'Completados', format: (v) => `${Math.round(v)} ped.` },
    materials: { label: 'Insumos', format: formatCLP },
  }

  const currentSlice = days.slice(-range)
  const previousSlice = days.slice(-range * 2, -range)

  const sumMetric = (arr) => arr.reduce((acc, item) => acc + Number(item?.[metric] || 0), 0)
  const currentTotal = sumMetric(currentSlice)
  const previousTotal = sumMetric(previousSlice)
  const diff = currentTotal - previousTotal
  const pct = previousTotal > 0 ? (diff / previousTotal) * 100 : null

  const maxAbs = Math.max(
    1,
    ...currentSlice.map((d) => Math.abs(Number(d?.[metric] || 0))),
    ...previousSlice.map((d) => Math.abs(Number(d?.[metric] || 0)))
  )

  const inspectedCur = hoveredIdx !== null ? currentSlice[hoveredIdx] : null
  const inspectedPrev = hoveredIdx !== null ? previousSlice[hoveredIdx] : null

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: BRAVO_EASE }}
      className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(210,177,111,0.18)] pb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
            Ritmo Comparativo · Período vs Anterior
          </p>
          <h2 className="text-lg font-light text-[#f2eee6] mt-1">
            Últimos {range} días frente a los {range} días previos
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border border-[rgba(210,177,111,0.25)] p-0.5 rounded-[75px]">
            {[7, 28].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRange(r); setHoveredIdx(null) }}
                className={`px-3.5 py-1 text-[11px] font-mono uppercase cursor-pointer transition-colors ${
                  range === r ? 'bg-[#d4af67] text-[#10100f] font-semibold' : 'text-[#b1aba0] hover:text-[#f2eee6]'
                }`}
              >
                {r} días
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {Object.entries(metricDefs).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                className={`px-3 py-1 text-[11px] font-mono uppercase border cursor-pointer transition-colors ${
                  metric === key
                    ? 'border-[#d4af67] text-[#f0ce8c] bg-[#251f15]'
                    : 'border-[rgba(210,177,111,0.2)] text-[#b1aba0] hover:text-[#f2eee6]'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Narrativa ejecutiva clara */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#121213] border border-[rgba(210,177,111,0.16)] p-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#b1aba0]">
            Período Actual ({range}d)
          </span>
          <p className="text-2xl font-light text-[#f0ce8c] tabular-nums mt-1">
            {metricDefs[metric].format(currentTotal)}
          </p>
        </div>
        <div className="md:border-l md:border-[rgba(210,177,111,0.16)] md:pl-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#b1aba0]">
            Período Anterior ({range}d)
          </span>
          <p className="text-2xl font-light text-[#b1aba0] tabular-nums mt-1">
            {metricDefs[metric].format(previousTotal)}
          </p>
        </div>
        <div className="md:border-l md:border-[rgba(210,177,111,0.16)] md:pl-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#b1aba0]">
            Variación Neta
          </span>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-2xl font-light tabular-nums ${
              diff > 0 ? 'text-[#f0ce8c]' : diff < 0 ? 'text-[#e5988a]' : 'text-[#b1aba0]'
            }`}>
              {diff > 0 ? '+' : ''}{metricDefs[metric].format(diff)}
            </p>
            {pct !== null && (
              <span className="text-xs font-mono text-[#b1aba0]">
                ({pct > 0 ? '+' : ''}{pct.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Barras comparativas animadas */}
      {currentSlice.length === 0 ? (
        <p className="text-xs font-mono text-[#b1aba0] py-8 text-center uppercase tracking-widest">
          Sin movimientos cerrados en los últimos {range} días
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#b1aba0] uppercase tracking-[0.12em]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#d4af67] inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#4e4941] inline-block" /> Anterior
              </span>
            </div>
            <span className="text-[#f0ce8c]">
              {inspectedCur
                ? `${formatDateShort(inspectedCur.date)}: ${metricDefs[metric].format(inspectedCur[metric])} · Ant. ${formatDateShort(inspectedPrev?.date)}: ${metricDefs[metric].format(inspectedPrev?.[metric] || 0)}`
                : 'Pasa el cursor o toca un día para inspeccionar'}
            </span>
          </div>

          <div
            className="grid items-end gap-1.5 h-44 pt-4 border-b border-[rgba(210,177,111,0.2)] pb-1"
            style={{ gridTemplateColumns: `repeat(${currentSlice.length}, minmax(0, 1fr))` }}
          >
            {currentSlice.map((day, idx) => {
              const prevDay = previousSlice[idx]
              const curVal = Number(day?.[metric] || 0)
              const prevVal = Number(prevDay?.[metric] || 0)
              const curH = Math.max(curVal !== 0 ? 6 : 2, (Math.abs(curVal) / maxAbs) * 100)
              const prevH = Math.max(prevVal !== 0 ? 6 : 2, (Math.abs(prevVal) / maxAbs) * 100)
              const isHover = hoveredIdx === idx

              return (
                <div
                  key={day.date}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                  className={`h-full flex flex-col justify-end items-center gap-1 cursor-pointer transition-colors px-0.5 ${
                    isHover ? 'bg-[rgba(212,175,103,0.08)]' : ''
                  }`}
                >
                  <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                    <motion.div
                      key={`prev-${range}-${metric}-${day.date}`}
                      initial={reduced ? false : { height: '2%' }}
                      animate={{ height: `${prevH}%` }}
                      transition={{ duration: 0.7, delay: idx * 0.015, ease: BRAVO_EASE }}
                      className="w-1/2 max-w-[14px] bg-[#4e4941]"
                    />
                    <motion.div
                      key={`cur-${range}-${metric}-${day.date}`}
                      initial={reduced ? false : { height: '2%' }}
                      animate={{ height: `${curH}%` }}
                      transition={{ duration: 0.75, delay: 0.05 + idx * 0.015, ease: BRAVO_EASE }}
                      className={`w-1/2 max-w-[14px] ${curVal < 0 ? 'bg-[#c96a5b]' : isHover ? 'bg-[#f0ce8c]' : 'bg-[#d4af67]'}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between text-[10px] font-mono text-[#8e877b]">
            <span>{formatDateShort(currentSlice[0]?.date)}</span>
            <span>{formatDateShort(currentSlice[Math.floor(currentSlice.length / 2)]?.date)}</span>
            <span>{formatDateShort(currentSlice[currentSlice.length - 1]?.date)}</span>
          </div>
        </div>
      )}
    </motion.section>
  )
}

// 3. EMBUDO DE PRODUCCIÓN POR ETAPA
function BravoProductionFunnel({ stages = [] }) {
  const reduced = useReducedMotion()
  const maxCount = Math.max(1, ...stages.map((s) => Number(s.count || 0)))
  const totalCount = stages.reduce((acc, s) => acc + Number(s.count || 0), 0)

  const stageTone = (code) => {
    if (code === 'entregado') return '#d4af67'
    if (code === 'listo') return '#f0ce8c'
    if (code === 'en_reparacion') return '#c59956'
    if (code === 'cancelado') return '#9c5a4f'
    return '#8f8678'
  }

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: BRAVO_EASE }}
      className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(210,177,111,0.18)] pb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
            Flujo del Atelier
          </p>
          <h2 className="text-lg font-light text-[#f2eee6] mt-1">
            Embudo de Pedidos por Etapa
          </h2>
        </div>
        <Link
          to="/bravo/orders"
          className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#d4af67] hover:text-[#f0ce8c] flex items-center gap-1"
        >
          Ver órdenes <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="space-y-3.5 mt-5">
        {stages.length === 0 ? (
          <p className="text-xs font-mono text-[#b1aba0] py-6 text-center">Sin pedidos registrados</p>
        ) : (
          stages.map((stage, idx) => {
            const pctWidth = (Number(stage.count || 0) / maxCount) * 100
            const sharePct = totalCount > 0 ? ((stage.count / totalCount) * 100).toFixed(0) : 0
            return (
              <div key={stage.status} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[#f2eee6] font-medium">{stage.label}</span>
                  <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                    <span className="text-[#b1aba0]">{formatCLP(stage.total_value)}</span>
                    <span className="text-[#f0ce8c] font-semibold w-14 text-right">
                      {stage.count} ({sharePct}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#111112] border border-[rgba(210,177,111,0.14)] overflow-hidden">
                  <motion.div
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${Math.max(stage.count > 0 ? 4 : 0, pctWidth)}%` }}
                    transition={{ duration: 0.85, delay: idx * 0.07, ease: BRAVO_EASE }}
                    className="h-full"
                    style={{ backgroundColor: stageTone(stage.status) }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </motion.section>
  )
}

// 4. MIX DE PRENDAS (DONA ANIMADA) + TÉCNICAS DE ESTAMPADO
function BravoCraftMix({ deviceShare = [], techniques = [] }) {
  const reduced = useReducedMotion()
  const [activeSlice, setActiveSlice] = useState(null)

  const totalPct = deviceShare.reduce((sum, i) => sum + Number(i.percentage || 0), 0)
  const totalOrders = deviceShare.reduce((sum, i) => sum + Number(i.count || 0), 0)
  const maxTechOrders = Math.max(1, ...techniques.map((t) => Number(t.orders || 0)))

  const r = 40
  const circ = 2 * Math.PI * r
  let accPct = 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Proporción de Prendas */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between"
      >
        <div className="border-b border-[rgba(210,177,111,0.18)] pb-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
            Catálogo Producido
          </p>
          <h2 className="text-lg font-light text-[#f2eee6] mt-1">
            Proporción por Tipo de Prenda
          </h2>
        </div>

        {totalPct === 0 ? (
          <div className="min-h-[200px] flex items-center justify-center text-xs font-mono text-[#b1aba0]">
            Sin prendas registradas para graficar
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-5">
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(210,177,111,0.12)" strokeWidth="9" />
                {deviceShare.map((item, idx) => {
                  const pct = Number(item.percentage || 0)
                  const dashOffset = circ - (pct / 100) * circ
                  const rotationDeg = (accPct / 100) * 360
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
                      strokeWidth={activeSlice === idx ? 12 : 9}
                      strokeDasharray={circ}
                      initial={reduced ? { strokeDashoffset: dashOffset } : { strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: dashOffset }}
                      transition={{ duration: 0.95, delay: idx * 0.1, ease: BRAVO_EASE }}
                      style={{ transformOrigin: '50px 50px', transform: `rotate(${rotationDeg}deg)` }}
                      className="cursor-pointer transition-[stroke-width] duration-300"
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
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#b1aba0] truncate max-w-[90px]">
                      {deviceShare[activeSlice].name}
                    </span>
                    <span className="text-xl font-light text-[#f0ce8c] tabular-nums">
                      {deviceShare[activeSlice].percentage}%
                    </span>
                    <span className="text-[10px] font-mono text-[#b1aba0]">
                      {deviceShare[activeSlice].count ?? 0} ped.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#b1aba0]">Total</span>
                    <span className="text-xl font-light text-[#f2eee6] tabular-nums">{totalOrders}</span>
                    <span className="text-[10px] font-mono text-[#b1aba0]">órdenes</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 w-full space-y-2">
              {deviceShare.map((item, idx) => (
                <div
                  key={item.name}
                  tabIndex={0}
                  onMouseEnter={() => setActiveSlice(idx)}
                  onMouseLeave={() => setActiveSlice(null)}
                  onFocus={() => setActiveSlice(idx)}
                  onBlur={() => setActiveSlice(null)}
                  onClick={() => setActiveSlice(activeSlice === idx ? null : idx)}
                  className={`flex items-center justify-between px-3 py-2 border transition-colors cursor-pointer ${
                    activeSlice === idx
                      ? 'border-[rgba(212,175,103,0.55)] bg-[#231f17]'
                      : 'border-[rgba(210,177,111,0.14)] bg-[#121213]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-[#f2eee6]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                    <span className="text-[#b1aba0]">{item.count ?? 0} uds</span>
                    <span className="text-[#f0ce8c] font-semibold w-12 text-right">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {/* Técnicas de Estampado */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between"
      >
        <div className="border-b border-[rgba(210,177,111,0.18)] pb-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
            Técnicas & Procesos
          </p>
          <h2 className="text-lg font-light text-[#f2eee6] mt-1">
            Rendimiento por Proceso de Estampado
          </h2>
        </div>

        {techniques.length === 0 ? (
          <div className="min-h-[200px] flex items-center justify-center text-xs font-mono text-[#b1aba0]">
            Aún no hay procesos registrados
          </div>
        ) : (
          <div className="space-y-3.5 pt-5">
            {techniques.map((tech, idx) => {
              const barPct = (Number(tech.orders || 0) / maxTechOrders) * 100
              return (
                <div key={tech.name} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: tech.color }} />
                      <span className="text-[#f2eee6] font-medium truncate">{tech.name}</span>
                      <span className="text-[10px] font-mono text-[#b1aba0]">
                        {tech.completed}/{tech.orders} listos
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums text-[11px] flex-shrink-0">
                      <span className="text-[#f0ce8c] font-semibold">{formatCLP(tech.agreed_value)}</span>
                      <span className="text-[#b1aba0] w-11 text-right">{tech.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#111112] overflow-hidden">
                    <motion.div
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${Math.max(4, barPct)}%` }}
                      transition={{ duration: 0.85, delay: idx * 0.08, ease: BRAVO_EASE }}
                      className="h-full"
                      style={{ backgroundColor: tech.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.section>
    </div>
  )
}

// 5. ESTRUCTURA FINANCIERA + MEDIOS DE PAGO & POS
function BravoFinancePanel({ stats, saleStats }) {
  const reduced = useReducedMotion()
  const [focusSeg, setFocusSeg] = useState(null)

  const ordersRev = Number(stats.total_earnings || 0)
  const posRev = Number(saleStats?.total_revenue || 0)
  const costs = Number(stats.total_costs || 0)
  const wasteCost = Number(stats.qa_stats?.total_waste_cost || 0)
  const margin = Math.max(0, ordersRev - costs - wasteCost)
  const denom = Math.max(1, costs + wasteCost + margin)

  const costPct = (costs / denom) * 100
  const wastePct = (wasteCost / denom) * 100
  const marginPct = (margin / denom) * 100

  // Combinar medios de pago de pedidos + POS
  const combinedPayments = useMemo(() => {
    const map = {}
    for (const item of stats.payment_methods || []) {
      const key = (item.method || 'no_especificado').toLowerCase()
      map[key] = { method: key, count: (map[key]?.count || 0) + Number(item.count || 0), total: (map[key]?.total || 0) + Number(item.total || 0) }
    }
    for (const item of saleStats?.by_payment_method || []) {
      const key = (item.method || 'no_especificado').toLowerCase()
      map[key] = { method: key, count: (map[key]?.count || 0) + Number(item.count || 0), total: (map[key]?.total || 0) + Number(item.total || 0) }
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [stats.payment_methods, saleStats])

  const totalPayments = Math.max(1, combinedPayments.reduce((s, p) => s + p.total, 0))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Composición de Rentabilidad */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between gap-5"
      >
        <div className="border-b border-[rgba(210,177,111,0.18)] pb-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
            Salud Financiera · Pedidos Cerrados
          </p>
          <h2 className="text-lg font-light text-[#f2eee6] mt-1">
            Desglose de Costos, Mermas y Margen
          </h2>
        </div>

        <div className="space-y-4">
          <div className="h-7 w-full bg-[#111112] border border-[rgba(210,177,111,0.2)] flex overflow-hidden">
            <motion.div
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${marginPct}%` }}
              transition={{ duration: 0.9, ease: BRAVO_EASE }}
              onMouseEnter={() => setFocusSeg('margin')}
              onMouseLeave={() => setFocusSeg(null)}
              className="bg-[#d4af67] flex items-center justify-center cursor-pointer transition-opacity"
              style={{ opacity: focusSeg && focusSeg !== 'margin' ? 0.45 : 1 }}
            >
              {marginPct >= 14 && (
                <span className="text-[10px] font-mono font-bold text-[#10100f]">{marginPct.toFixed(0)}%</span>
              )}
            </motion.div>
            <motion.div
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${costPct}%` }}
              transition={{ duration: 0.9, delay: 0.1, ease: BRAVO_EASE }}
              onMouseEnter={() => setFocusSeg('costs')}
              onMouseLeave={() => setFocusSeg(null)}
              className="bg-[#7b6747] flex items-center justify-center cursor-pointer transition-opacity"
              style={{ opacity: focusSeg && focusSeg !== 'costs' ? 0.45 : 1 }}
            >
              {costPct >= 14 && (
                <span className="text-[10px] font-mono font-bold text-[#f2eee6]">{costPct.toFixed(0)}%</span>
              )}
            </motion.div>
            {wastePct > 0 && (
              <motion.div
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${wastePct}%` }}
                transition={{ duration: 0.9, delay: 0.18, ease: BRAVO_EASE }}
                onMouseEnter={() => setFocusSeg('waste')}
                onMouseLeave={() => setFocusSeg(null)}
                className="bg-[#b25849] flex items-center justify-center cursor-pointer transition-opacity"
                style={{ opacity: focusSeg && focusSeg !== 'waste' ? 0.45 : 1 }}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 border transition-colors ${focusSeg === 'margin' ? 'border-[#d4af67] bg-[#241f15]' : 'border-[rgba(210,177,111,0.16)] bg-[#121213]'}`}>
              <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#b1aba0]">Margen Operativo</p>
              <p className="text-base font-normal text-[#f0ce8c] tabular-nums mt-1">{formatCLP(margin)}</p>
            </div>
            <div className={`p-3 border transition-colors ${focusSeg === 'costs' ? 'border-[#d4af67] bg-[#241f15]' : 'border-[rgba(210,177,111,0.16)] bg-[#121213]'}`}>
              <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#b1aba0]">Insumos</p>
              <p className="text-base font-normal text-[#f2eee6] tabular-nums mt-1">{formatCLP(costs)}</p>
            </div>
            <div className={`p-3 border transition-colors ${focusSeg === 'waste' ? 'border-[#c96a5b] bg-[#241614]' : 'border-[rgba(210,177,111,0.16)] bg-[#121213]'}`}>
              <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#b1aba0]">Mermas QA</p>
              <p className="text-base font-normal text-[#e5988a] tabular-nums mt-1">{formatCLP(wasteCost)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[rgba(210,177,111,0.16)] text-xs font-mono text-[#b1aba0]">
          <span>Ticket medio pedidos: <strong className="text-[#f2eee6]">{formatCLP(stats.average_ticket)}</strong></span>
          <span>Ventas POS directas: <strong className="text-[#f0ce8c]">{formatCLP(posRev)}</strong> ({saleStats?.sales_count || 0})</span>
        </div>
      </motion.section>

      {/* Medios de Pago & Flujo Semanal */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between gap-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[rgba(210,177,111,0.18)] pb-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
              Tesorería & Cobranza
            </p>
            <h2 className="text-lg font-light text-[#f2eee6] mt-1">
              Ingresos por Medio de Pago
            </h2>
          </div>
          <Link
            to="/bravo/sales"
            className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#d4af67] hover:text-[#f0ce8c] flex items-center gap-1"
          >
            Ventas POS <ArrowUpRight size={13} />
          </Link>
        </div>

        {combinedPayments.length === 0 ? (
          <div className="min-h-[150px] flex items-center justify-center text-xs font-mono text-[#b1aba0]">
            Aún no hay pagos clasificados por método
          </div>
        ) : (
          <div className="space-y-3">
            {combinedPayments.map((pm, idx) => {
              const pct = (pm.total / totalPayments) * 100
              return (
                <div key={pm.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#f2eee6] flex items-center gap-2">
                      <CreditCard size={12} className="text-[#d4af67]" />
                      {PAYMENT_LABELS[pm.method] || pm.method}
                      <span className="text-[10px] font-mono text-[#b1aba0]">({pm.count} mov.)</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#f0ce8c]">
                      {formatCLP(pm.total)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#111112] overflow-hidden">
                    <motion.div
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${Math.max(4, pct)}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.08, ease: BRAVO_EASE }}
                      className="h-full bg-[#d4af67]"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[rgba(210,177,111,0.16)] text-xs font-mono text-[#b1aba0]">
          <span>Por cobrar total (abiertos)</span>
          <strong className="text-[#f0ce8c] tabular-nums">
            {formatCLP(stats.open_balance?.amount || 0)} ({stats.open_balance?.orders || 0} ped.)
          </strong>
        </div>
      </motion.section>
    </div>
  )
}

// 6. PRIORIDADES ACCIONABLES + TOP CLIENTES
function BravoActionDeck({ workshop, topClients = [] }) {
  const reduced = useReducedMotion()
  const maxSpent = Math.max(1, ...topClients.map((c) => Number(c.total_spent || 0)))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Entregas urgentes */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between border-b border-[rgba(210,177,111,0.18)] pb-3.5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">Agenda Crítica</p>
              <h3 className="text-base font-light text-[#f2eee6] mt-0.5">Prioridad de Producción</h3>
            </div>
            <span className={`px-3 py-1 rounded-[75px] text-[10px] font-mono uppercase border ${
              (workshop?.overdue || 0) > 0
                ? 'border-[#c96a5b] text-[#f0a396] bg-[#241614]'
                : 'border-[rgba(212,175,103,0.4)] text-[#f0ce8c]'
            }`}>
              {workshop?.overdue || 0} atras. · {workshop?.due_today || 0} hoy
            </span>
          </div>

          <div className="divide-y divide-[rgba(210,177,111,0.14)] mt-3">
            {(workshop?.deliveries || []).length === 0 ? (
              <p className="py-8 text-center text-xs font-mono text-[#b1aba0]">
                Sin entregas vencidas ni programadas para hoy.
              </p>
            ) : (
              workshop.deliveries.map((order) => (
                <Link
                  key={order.id}
                  to={`/bravo/orders/${order.id}`}
                  className="flex items-center justify-between py-3 group hover:bg-[#221f1a] px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-mono text-[#f0ce8c] font-semibold">{order.number}</p>
                    <p className="text-xs text-[#f2eee6] truncate mt-0.5">
                      {order.client_name || 'Cliente'} {order.title ? `· ${order.title}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-mono text-[#e5988a] tabular-nums">
                      {formatDateShort(order.date)}
                    </span>
                    <ChevronRight size={14} className="text-[#b1aba0] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {(workshop?.undated || 0) > 0 && (
          <p className="mt-4 pt-3 border-t border-[rgba(210,177,111,0.15)] text-[11px] font-mono text-[#f0ce8c]">
            Atención: {workshop.undated} pedidos en producción sin fecha de entrega asignada.
          </p>
        )}
      </motion.section>

      {/* Cobros pendientes en retiro */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.78, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between border-b border-[rgba(210,177,111,0.18)] pb-3.5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">Caja Pendiente</p>
              <h3 className="text-base font-light text-[#f2eee6] mt-0.5">Cobros al Retirar</h3>
            </div>
            <Clock size={15} className="text-[#d4af67]" />
          </div>

          <div className="divide-y divide-[rgba(210,177,111,0.14)] mt-3">
            {(workshop?.collections || []).length === 0 ? (
              <p className="py-8 text-center text-xs font-mono text-[#b1aba0]">
                Todos los pedidos listos están saldados.
              </p>
            ) : (
              workshop.collections.map((order) => (
                <Link
                  key={order.id}
                  to={`/bravo/orders/${order.id}`}
                  className="flex items-center justify-between py-3 group hover:bg-[#221f1a] px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-mono text-[#f2eee6] font-semibold">{order.number}</p>
                    <p className="text-xs text-[#b1aba0] truncate mt-0.5">
                      {order.client_name || 'Cliente'} {order.title ? `· ${order.title}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-[#f0ce8c] font-semibold tabular-nums">
                      {formatCLP(order.balance)}
                    </span>
                    <ChevronRight size={14} className="text-[#b1aba0] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <p className="mt-4 pt-3 border-t border-[rgba(210,177,111,0.15)] text-[11px] font-mono text-[#b1aba0]">
          Pedidos en estado <strong className="text-[#f2eee6]">Listo</strong> ordenados por mayor saldo.
        </p>
      </motion.section>

      {/* Top 5 Clientes Bravo */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between border-b border-[rgba(210,177,111,0.18)] pb-3.5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">Fidelización</p>
              <h3 className="text-base font-light text-[#f2eee6] mt-0.5">Clientes Principales</h3>
            </div>
            <Users size={15} className="text-[#d4af67]" />
          </div>

          <div className="space-y-3 mt-4">
            {topClients.length === 0 ? (
              <p className="py-8 text-center text-xs font-mono text-[#b1aba0]">Sin clientes registrados aún.</p>
            ) : (
              topClients.map((client, idx) => {
                const widthPct = (Number(client.total_spent || 0) / maxSpent) * 100
                return (
                  <Link
                    key={client.id}
                    to={`/bravo/clients/${client.id}`}
                    className="block group py-1"
                  >
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="text-[#f2eee6] group-hover:text-[#f0ce8c] transition-colors truncate pr-2">
                        <span className="font-mono text-[#b1aba0] mr-2">0{idx + 1}</span>
                        {client.name}
                      </span>
                      <span className="font-mono text-[#f0ce8c] tabular-nums flex-shrink-0">
                        {formatCLP(client.total_spent)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 bg-[#111112] overflow-hidden">
                        <motion.div
                          initial={reduced ? false : { width: 0 }}
                          animate={{ width: `${Math.max(6, widthPct)}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.08, ease: BRAVO_EASE }}
                          className="h-full bg-[#d4af67]"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#b1aba0] flex-shrink-0">
                        {client.orders} ped.
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </motion.section>
    </div>
  )
}

// 7. CONTROL DE CALIDAD (QA) CON ARCO ANIMADO + FLOTA DE MAQUINARIAS
function BravoQualityAndMachines({ qa, machines }) {
  const reduced = useReducedMotion()
  const hasInspections = Number(qa?.inspections || 0) > 0
  const passRate = hasInspections ? Number(qa?.pass_rate || 0) : 0

  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (passRate / 100) * circumference

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* QA Arc Gauge */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between gap-5"
      >
        <div className="flex items-center justify-between border-b border-[rgba(210,177,111,0.18)] pb-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
              Aseguramiento de Calidad
            </p>
            <h2 className="text-lg font-light text-[#f2eee6] mt-1">
              Inspecciones QA & Control de Mermas
            </h2>
          </div>
          <Sparkles size={16} className="text-[#d4af67]" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(210,177,111,0.14)" strokeWidth="7" />
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={hasInspections ? '#d4af67' : '#524c43'}
                strokeWidth="7"
                strokeDasharray={circumference}
                initial={reduced ? { strokeDashoffset } : { strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.1, ease: BRAVO_EASE }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-light text-[#f0ce8c] tabular-nums">
                {hasInspections ? `${passRate.toFixed(0)}%` : '—'}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#b1aba0]">
                {hasInspections ? `${qa.inspections} insp.` : 'Sin insp.'}
              </span>
            </div>
          </div>

          <div className="flex-1 w-full grid grid-cols-2 gap-3">
            <div className="bg-[#121213] border border-[rgba(210,177,111,0.16)] p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#b1aba0]">Mermas Físicas</p>
              <p className="text-2xl font-light text-[#e5988a] tabular-nums mt-1">
                {qa?.total_waste_units || 0} <span className="text-xs font-mono">uds</span>
              </p>
            </div>
            <div className="bg-[#121213] border border-[rgba(210,177,111,0.16)] p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#b1aba0]">Costo Descarte</p>
              <p className="text-2xl font-light text-[#f2eee6] tabular-nums mt-1">
                {formatCLP(qa?.total_waste_cost || 0)}
              </p>
            </div>
            <p className="col-span-2 text-xs text-[#b1aba0] leading-relaxed">
              Las mermas registran prendas o insumos descartados por calibración, temperatura o acabado para medir su impacto real sobre el margen del atelier.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Maquinaria */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.82, ease: BRAVO_EASE }}
        className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6 flex flex-col justify-between gap-4"
      >
        <div className="flex items-center justify-between border-b border-[rgba(210,177,111,0.18)] pb-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">
              Infraestructura Física
            </p>
            <h2 className="text-lg font-light text-[#f2eee6] mt-1">
              Estado de Maquinarias
            </h2>
          </div>
          <Link
            to="/bravo/machines"
            className="px-3.5 py-1.5 rounded-[75px] border border-[rgba(210,177,111,0.35)] text-[11px] font-mono uppercase tracking-[0.1em] text-[#f0ce8c] hover:bg-[#251f15] transition-colors"
          >
            Gestionar
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-[#121213] border border-[rgba(210,177,111,0.16)] p-3 text-center">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#b1aba0]">Activas</p>
            <p className="text-xl font-light text-[#f0ce8c] tabular-nums mt-0.5">{machines?.active || 0}</p>
          </div>
          <div className="border-x border-[rgba(210,177,111,0.16)]">
            <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#b1aba0]">Mantención</p>
            <p className="text-xl font-light text-[#e5988a] tabular-nums mt-0.5">{machines?.maintenance || 0}</p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#b1aba0]">Reservas</p>
            <p className="text-xl font-light text-[#f2eee6] tabular-nums mt-0.5">{machines?.total_reservations || 0}</p>
          </div>
        </div>

        <div className="divide-y divide-[rgba(210,177,111,0.14)] max-h-44 overflow-y-auto pr-1">
          {(machines?.list || []).length === 0 ? (
            <p className="py-6 text-center text-xs font-mono text-[#b1aba0]">Sin máquinas registradas.</p>
          ) : (
            machines.list.map((m, idx) => (
              <div key={`${m.name}-${idx}`} className="flex items-center justify-between py-2.5 text-xs">
                <div className="min-w-0 pr-3">
                  <p className="text-[#f2eee6] font-medium truncate">{m.name}</p>
                  <p className="text-[10px] font-mono text-[#b1aba0]">
                    {m.type || 'Equipo'}{m.last_maintenance ? ` · Mant. ${m.last_maintenance}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.needs_supplies && (
                    <span className="px-2.5 py-0.5 rounded-[75px] border border-[#c96a5b] text-[#f0a396] text-[10px] font-mono uppercase">
                      Falta Insumo
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-[75px] border text-[10px] font-mono uppercase ${
                    m.status === 'active'
                      ? 'border-[rgba(212,175,103,0.45)] text-[#f0ce8c] bg-[#241f15]'
                      : 'border-[rgba(201,106,91,0.45)] text-[#e5988a] bg-[#241614]'
                  }`}>
                    {m.status === 'active' ? 'Operativa' : 'Mantención'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.section>
    </div>
  )
}

const BRAVO_TABS = [
  { id: 'overview', label: 'Vista General' },
  { id: 'production', label: 'Producción & Procesos' },
  { id: 'finance', label: 'Finanzas & Cobros' },
  { id: 'quality', label: 'Calidad & Maquinaria' },
]

export default function BravoStatsPage() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [stats, setStats] = useState(null)
  const [saleStats, setSaleStats] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setLoadError(false)

    Promise.all([
      getRepairStats({ system: 'bravo' }),
      getSaleStats({ system: 'bravo' }).catch(() => ({ data: { total_revenue: 0, sales_count: 0, average_ticket: 0, by_payment_method: [], daily_revenue: [] } })),
    ])
      .then(([repairRes, saleRes]) => {
        if (!mounted) return
        setStats(repairRes.data)
        setSaleStats(saleRes.data)
      })
      .catch(() => {
        if (mounted) setLoadError(true)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [attempt])

  const exportCsv = () => {
    if (!stats) return
    const rows = [
      ['Métrica', 'Valor'],
      ['Pedidos Registrados', stats.total_repairs],
      ['En Producción', stats.workshop?.in_production || 0],
      ['Facturación Pedidos Completados (CLP)', stats.total_earnings],
      ['Ventas Directas POS (CLP)', Number(saleStats?.total_revenue || 0)],
      ['Costo Insumos (CLP)', stats.total_costs],
      ['Margen Post-Insumos (CLP)', stats.estimated_net_profit],
      ['Margen (%)', `${stats.net_margin}%`],
      ['Ticket Promedio (CLP)', stats.average_ticket],
      ['Por Cobrar en Retiro (CLP)', stats.pending_collect],
      ['Por Cobrar Abiertos Total (CLP)', stats.open_balance?.amount || 0],
      ['Aprobación QA (%)', stats.qa_stats?.pass_rate || 0],
      ['Costo Mermas (CLP)', stats.qa_stats?.total_waste_cost || 0],
      [],
      ['Mes', 'Ingresos CLP', 'Pedidos'],
      ...(stats.income_history || []).map((m) => [m.month, m.income, m.repairs]),
    ]
    const csv = '\uFEFF' + rows.map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bravo-estadisticas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const combinedRevenue = Number(stats?.total_earnings || 0) + Number(saleStats?.total_revenue || 0)

  const kpis = stats ? [
    {
      label: 'Facturación Combinada',
      raw: combinedRevenue,
      formatter: formatCLP,
      icon: DollarSign,
      sub: `Pedidos ${formatCLP(stats.total_earnings)} · POS ${formatCLP(saleStats?.total_revenue || 0)}`,
      accent: true,
    },
    {
      label: 'Margen Post-Insumos',
      raw: Number(stats.estimated_net_profit || 0),
      formatter: formatCLP,
      icon: TrendingUp,
      badge: `${stats.net_margin || 0}%`,
      sub: `Insumos registrados: ${formatCLP(stats.total_costs)}`,
    },
    {
      label: 'En Producción Activa',
      raw: Number(stats.workshop?.in_production || 0),
      formatter: (v) => `${Math.round(v)} ped.`,
      icon: Wrench,
      sub: `${stats.workshop?.overdue || 0} atrasados · ${stats.workshop?.due_today || 0} hoy · ${stats.total_repairs} históricos`,
      alert: (stats.workshop?.overdue || 0) > 0,
    },
    {
      label: 'Por Cobrar en Retiro',
      raw: Number(stats.pending_collect || 0),
      formatter: formatCLP,
      icon: Clock,
      sub: `Saldo total abierto: ${formatCLP(stats.open_balance?.amount || 0)} (${stats.open_balance?.orders || 0} ped.)`,
    },
  ] : []

  return (
    <div className="space-y-8 relative text-left pb-12 max-w-[1260px] mx-auto">
      <BravoBackground />

      {/* Header Editorial */}
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[rgba(210,177,111,0.25)] pb-6">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => navigate('/bravo')}
            aria-label="Volver al panel de Bravo"
            className="mt-1 w-10 h-10 flex items-center justify-center border border-[rgba(210,177,111,0.3)] text-[#b1aba0] hover:text-[#f2eee6] hover:border-[#d4af67] transition-colors cursor-pointer"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#d4af67] flex items-center gap-2">
              <Activity size={12} /> Atelier Bravo · Analítica Operativa
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#f2eee6] mt-1">
              Signos Vitales del Negocio
            </h1>
            <p className="text-xs text-[#b1aba0] mt-1.5">
              Facturación real, ritmo de producción, rentabilidad de insumos, calidad QA y cobranza en vivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            disabled={loading}
            className="px-4 py-2 text-xs font-mono uppercase tracking-[0.1em] border border-[rgba(210,177,111,0.3)] text-[#f2eee6] hover:border-[#d4af67] hover:bg-[#231f17] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!stats}
            className="px-4 py-2 text-xs font-mono uppercase tracking-[0.1em] border border-[rgba(210,177,111,0.3)] text-[#f0ce8c] hover:bg-[#231f17] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Download size={13} />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-mono uppercase tracking-[0.1em] bg-[#d4af67] text-[#10100f] font-semibold hover:bg-[#ecc981] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Printer size={13} />
            Imprimir
          </button>
        </div>
      </header>

      {/* Error State */}
      {loadError && (
        <div role="alert" className="bg-[#19191a] border border-[#c96a5b] p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-[#f0a396]">
            <AlertTriangle size={18} />
            <span>No se pudieron cargar las estadísticas de Bravo.</span>
          </div>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="px-5 py-2 text-xs font-mono uppercase bg-[#d4af67] text-[#10100f] font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !loadError && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[#19191a] border border-[rgba(210,177,111,0.18)]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-[#19191a] border border-[rgba(210,177,111,0.18)]" />
            <div className="h-80 bg-[#19191a] border border-[rgba(210,177,111,0.18)]" />
          </div>
        </div>
      )}

      {!loading && !loadError && stats && (
        <>
          {/* KPI Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
              <motion.article
                key={kpi.label}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: idx * 0.07, ease: BRAVO_EASE }}
                className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] hover:border-[rgba(212,175,103,0.6)] p-5 flex flex-col justify-between transition-colors relative overflow-hidden"
              >
                {kpi.accent && <div className="absolute inset-x-0 top-0 h-[2px] bg-[#d4af67]" />}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#b1aba0]">
                    {kpi.label}
                  </span>
                  <kpi.icon size={14} className={kpi.alert ? 'text-[#e5988a]' : 'text-[#d4af67]'} />
                </div>

                <div className="flex items-baseline gap-2.5 my-3">
                  <p className={`text-2xl xl:text-3xl font-light tracking-tight ${kpi.accent ? 'text-[#f0ce8c]' : 'text-[#f2eee6]'}`}>
                    <AnimatedMetric value={kpi.raw} formatter={kpi.formatter} />
                  </p>
                  {kpi.badge && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-[75px] border border-[rgba(212,175,103,0.4)] text-[#f0ce8c]">
                      {kpi.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#b1aba0] leading-snug">{kpi.sub}</p>
              </motion.article>
            ))}
          </section>

          {/* Navigation Pill Tabs (75px radius, gliding layoutId) */}
          <nav aria-label="Secciones estadísticas de Bravo" className="flex flex-wrap items-center gap-2 print:hidden">
            {BRAVO_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-5 py-2.5 text-xs font-mono uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#10100f] border-[#d4af67] font-semibold'
                      : 'text-[#b1aba0] border-[rgba(210,177,111,0.25)] hover:text-[#f2eee6] hover:border-[rgba(210,177,111,0.5)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bravo-stats-active-tab"
                      transition={{ duration: 0.45, ease: BRAVO_EASE }}
                      className="absolute inset-0 bg-[#d4af67] rounded-[75px] -z-10"
                    />
                  )}
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {/* Animated Tab Views */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: BRAVO_EASE }}
              className="space-y-6"
            >
              {(activeTab === 'overview' || activeTab === 'finance') && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <BravoRevenueChart data={stats.income_history || []} />
                  <BravoPeriodComparison days={stats.comparison_days || []} />
                </div>
              )}

              {(activeTab === 'overview' || activeTab === 'production') && (
                <>
                  <BravoProductionFunnel stages={stats.status_breakdown || []} />
                  <BravoCraftMix
                    deviceShare={stats.device_share || []}
                    techniques={stats.print_technique_share || []}
                  />
                </>
              )}

              {(activeTab === 'overview' || activeTab === 'finance') && (
                <>
                  <BravoFinancePanel stats={stats} saleStats={saleStats} />
                  <BravoActionDeck
                    workshop={stats.workshop}
                    topClients={stats.top_clients || []}
                  />
                </>
              )}

              {activeTab === 'production' && (
                <BravoActionDeck
                  workshop={stats.workshop}
                  topClients={stats.top_clients || []}
                />
              )}

              {(activeTab === 'overview' || activeTab === 'quality') && (
                <BravoQualityAndMachines
                  qa={stats.qa_stats}
                  machines={stats.machine_stats}
                />
              )}

              {/* Auditoría rápida de últimos pedidos completados en Finanzas */}
              {activeTab === 'finance' && (stats.recent_completed || []).length > 0 && (
                <section className="bg-[#19191a] border border-[rgba(210,177,111,0.25)] p-6">
                  <div className="border-b border-[rgba(210,177,111,0.18)] pb-4 mb-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#b1aba0]">Auditoría Reciente</p>
                    <h2 className="text-lg font-light text-[#f2eee6] mt-1">Últimos Pedidos Listos y Entregados</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left tabular-nums">
                      <thead className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#b1aba0] border-b border-[rgba(210,177,111,0.18)]">
                        <tr>
                          <th className="py-2.5 pr-4">Orden</th>
                          <th className="py-2.5 pr-4">Cliente</th>
                          <th className="py-2.5 pr-4">Detalle</th>
                          <th className="py-2.5 pr-4 text-right">Cobrado</th>
                          <th className="py-2.5 pr-4 text-right">Insumos</th>
                          <th className="py-2.5 text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(210,177,111,0.12)]">
                        {stats.recent_completed.map((row) => (
                          <tr key={row.id} className="hover:bg-[#221f1a] transition-colors">
                            <td className="py-3 pr-4 font-mono">
                              <Link to={`/bravo/orders/${row.id}`} className="text-[#f0ce8c] hover:underline">
                                {row.order_number}
                              </Link>
                            </td>
                            <td className="py-3 pr-4 text-[#f2eee6]">{row.client_name}</td>
                            <td className="py-3 pr-4 text-[#b1aba0] max-w-[220px] truncate">{row.title}</td>
                            <td className="py-3 pr-4 text-right font-mono text-[#f2eee6]">{formatCLP(row.revenue)}</td>
                            <td className="py-3 pr-4 text-right font-mono text-[#b1aba0]">{formatCLP(row.cost)}</td>
                            <td className="py-3 text-right font-mono text-[#f0ce8c] font-semibold">{formatCLP(row.margin)}</td>
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
    </div>
  )
}
