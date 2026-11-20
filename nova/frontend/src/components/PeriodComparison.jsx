import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import './periodComparison.css'

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
const count = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const shortDate = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const formatDate = row => shortDate.format(new Date(row.date + 'T12:00:00Z'))
const rangeLabel = rows => [rows[0], rows.at(-1)].map(formatDate).join(' – ')
const total = (days, key) => days.reduce((sum, row) => sum + Number(row[key]), 0)

function AnimatedValue({ value, format }) {
  const display = useRef(null)
  const previous = useRef(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) {
      previous.current = value
      display.current.textContent = format.format(value)
      return
    }
    const animation = animate(previous.current, value, { duration: 0.45, ease: 'easeOut', onUpdate(latest) {
      previous.current = latest
      if (display.current) display.current.textContent = format.format(Math.round(latest) || 0)
    } })
    return () => animation.stop()
  }, [value, format, reduce])
  return <><span aria-hidden="true" ref={display}>{format.format(value)}</span><span className="sr-only">{format.format(value)}</span></>
}

export default function PeriodComparison({ days = [], system }) {
  const [length, setLength] = useState(7)
  const [metric, setMetric] = useState('profit')
  const [fromEnd, setFromEnd] = useState(0)
  const bravo = system === 'bravo'
  const metrics = {
    orders: bravo ? 'Pedidos completados' : 'Reparaciones completadas',
    value: bravo ? 'Valor de pedidos' : 'Valor de reparaciones',
    materials: 'Costo de insumos',
    profit: 'Margen estimado',
  }
  if (!days || days.length < 14) return <p>Comparación por período pendiente de datos.</p>
  const period = days.length >= length * 2 ? length : 7
  const current = days.slice(-period)
  const previous = days.slice(-2 * period, -period)
  const index = period - 1 - Math.min(fromEnd, period - 1)
  const series = [...current, ...previous].map(day => Number(day[metric]))
  const high = Math.max(0, ...series)
  const low = Math.min(0, ...series)
  const scale = high - low || 1
  const baseline = -low / scale * 100
  const format = metric === 'orders' ? count : money
  const selectDay = i => setFromEnd(period - 1 - i)
  return <section className={'period-panel ' + (bravo ? 'period-bravo' : 'period-nova')}>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{bravo ? 'Comparación de pedidos' : 'Comparación de reparaciones'}</h2>
      <div role="group" aria-label="Período de comparación" className="period-switch">
        {[7, 28].map(n => <button key={n} disabled={days.length < n * 2} aria-pressed={n === period}
          onClick={() => { setLength(n); setFromEnd(0) }}>{n} días</button>)}
      </div>
    </header>
    <p className="mt-2 text-sm">Hasta ayer, hora de Chile. Cada trabajo cuenta al alcanzar por primera vez el estado listo o entregado.</p>
    <div className="period-kpis" role="group" aria-label="Indicador del gráfico">
      {Object.entries(metrics).map(([key, label]) => {
        const fmt = key === 'orders' ? count : money
        const value = total(current, key)
        const delta = value - total(previous, key)
        return <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>
          <span>{label}</span><strong><AnimatedValue value={value} format={fmt}/></strong>
          <small>{delta > 0 ? '+' : ''}{fmt.format(delta)} vs. anterior</small>
        </button>
      })}
    </div>
    <figure className="mt-6">
      <figcaption className="font-semibold">{metrics[metric]} por día</figcaption>
      <div className="period-legend"><span>Actual · {rangeLabel(current)}</span><span>Anterior · {rangeLabel(previous)}</span></div>
      <div className="period-plot" aria-hidden="true">
        <div className="period-axis" style={{bottom: baseline + '%'}} />
        {current.map((day, i) => <div key={day.date} className={'period-day ' + (i === index ? 'selected' : '')}
          onPointerEnter={() => selectDay(i)} onClick={() => selectDay(i)}>
          {[day, previous[i]].map((row, j) => {
            const v = Number(row[metric])
            return <i key={j} style={{bottom: (baseline + Math.min(v, 0) / scale * 100) + '%', height: Math.abs(v) / scale * 100 + '%'}} />
          })}
        </div>)}
      </div>
      <div className="flex justify-between text-xs mt-2"><span>{formatDate(current[0])}</span><span>{formatDate(current.at(-1))}</span></div>
      <label className="block mt-4 text-sm">Explorar día
        <input type="range" className="period-slider" min="0" max={period - 1} value={index}
          aria-valuetext={formatDate(current[index]) + ', ' + format.format(current[index][metric])}
          onChange={e => selectDay(Number(e.target.value))}/>
      </label>
      <p className="period-detail"><strong>{formatDate(current[index])} · {format.format(current[index][metric])}</strong>
        <span>Anterior · {formatDate(previous[index])} · {format.format(previous[index][metric])}</span></p>
    </figure>
    <details className="mt-4 text-sm"><summary className="cursor-pointer">Ver totales de ambos períodos</summary>
      <div className="overflow-x-auto"><table className="w-full text-right mt-2"><thead><tr><th className="text-left">Indicador</th><th>Actual</th><th>Anterior</th></tr></thead>
        <tbody>{Object.entries(metrics).map(([key, label]) => <tr key={key}><th scope="row" className="py-2 text-left font-normal">{label}</th>
          {[current, previous].map((rows, i) => <td key={i}>{(key === 'orders' ? count : money).format(total(rows, key))}</td>)}</tr>)}</tbody></table></div>
    </details>
    <p className="mt-3 text-xs">El margen descuenta los insumos a su costo registrado actual. Excluye mano de obra y gastos generales.</p>
    {!total(current, 'orders') && <p className="mt-2 text-sm">Sin trabajos completados en el período seleccionado.</p>}
  </section>
}
