import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getBravoCalendarOrders } from '../../api/bravo'

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const dateKey = (day) =>
  [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'),
    String(day.getDate()).padStart(2, '0')].join('-')

const monthStart = (year, month) => new Date(year, month, 1)
const moveMonth = (year, month, movement) => {
  const next = new Date(year, month + movement, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

export default function BravoCalendar() {
  const navigate = useNavigate()
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: new Date().getFullYear(), month: new Date().getMonth(),
  }))
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(dateKey(new Date()))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    const firstDay = monthStart(visibleMonth.year, visibleMonth.month)
    const lastDay = new Date(visibleMonth.year, visibleMonth.month + 1, 0)
    setLoading(true)
    setLoadError('')
    getBravoCalendarOrders({ start: dateKey(firstDay), end: dateKey(lastDay) })
      .then(response => {
        if (active) setOrders(response.data)
      })
      .catch(() => {
        if (active) setLoadError('No se pudieron cargar las entregas.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [visibleMonth.year, visibleMonth.month])

  const calendarDays = useMemo(() => {
    const first = monthStart(visibleMonth.year, visibleMonth.month)
    const offset = (first.getDay() + 6) % 7
    const numberOfDays = new Date(visibleMonth.year, visibleMonth.month + 1, 0).getDate()
    return Array.from({ length: offset + numberOfDays }, (_, index) => {
      const day = index - offset + 1
      return day < 1 ? null : new Date(visibleMonth.year, visibleMonth.month, day)
    })
  }, [visibleMonth.year, visibleMonth.month])

  const ordersByDay = useMemo(() => {
    const grouped = new Map()
    for (const order of orders) {
      const existing = grouped.get(order.estimated_delivery) || []
      existing.push(order)
      grouped.set(order.estimated_delivery, existing)
    }
    return grouped
  }, [orders])

  const visibleOrders = ordersByDay.get(selected) || []
  const today = dateKey(new Date())
  const upcoming = orders.filter(order => order.estimated_delivery >= today).slice(0, 8)

  const changeMonth = (direction) => {
    const next = moveMonth(visibleMonth.year, visibleMonth.month, direction)
    setVisibleMonth(next)
    setSelected(dateKey(monthStart(next.year, next.month)))
  }

  return (
    <section className="bravo-calendar bg-bravo-card border border-bravo-border p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-bravo-accent font-bold">
            Agenda de producción
          </p>
          <h3 className="text-lg font-semibold capitalize text-bravo-text mt-1">
            {MONTHS[visibleMonth.month]} {visibleMonth.year}
          </h3>
        </div>
        <nav aria-label="Cambiar mes" className="flex gap-2 shrink-0">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior"
            className="border border-bravo-border bg-bravo-input p-2.5 text-bravo-text"><ChevronLeft size={18}/></button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente"
            className="border border-bravo-border bg-bravo-input p-2.5 text-bravo-text"><ChevronRight size={18}/></button>
        </nav>
      </div>

      {loadError && <p role="alert" className="text-red-700 text-sm mb-3">{loadError}</p>}
      {loading && <p role="status" className="text-bravo-text-muted text-sm mb-3">Cargando entregas…</p>}

      <div className="hidden sm:block">
        <div className="grid grid-cols-7 text-center text-[10px] uppercase text-bravo-text-muted mb-2">
          {DAYS.map((weekday, index) => <span key={index} className="py-2">{weekday}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} aria-hidden="true" />
            const key = dateKey(day)
            const dailyOrders = ordersByDay.get(key) || []
            return (
              <button key={key} type="button" onClick={() => setSelected(key)}
                aria-pressed={selected === key}
                aria-label={`${day.getDate()} de ${MONTHS[visibleMonth.month]}, ${dailyOrders.length} entregas`}
                className={`bravo-calendar-day min-h-[66px] border text-left p-2 flex flex-col justify-between
                  ${selected === key ? 'border-bravo-accent bg-amber-50' : 'border-bravo-border bg-bravo-input'}
                  ${key === today ? 'font-bold' : ''}`}>
                <span className="text-xs text-bravo-text">{day.getDate()}</span>
                {dailyOrders.length > 0 && (
                  <span className="text-[10px] text-bravo-accent font-bold">
                    {dailyOrders.length} {dailyOrders.length === 1 ? 'orden' : 'órdenes'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="sm:hidden">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-bravo-text-muted mb-3">
          Próximas entregas
        </p>
        {upcoming.length === 0 && <p className="text-sm text-bravo-text-muted py-5">Sin entregas pendientes este mes.</p>}
        <div className="space-y-2">
          {upcoming.map(order => (
            <button type="button" key={order.id} onClick={() => navigate(`/bravo/orders/${order.id}`)}
              className="w-full flex items-center justify-between gap-3 border border-bravo-border bg-bravo-input px-3 py-3 text-left">
              <span className="min-w-0">
                <span className="block text-xs font-bold text-bravo-text">{order.order_number}</span>
                <span className="block text-xs text-bravo-text-muted truncate">{order.client?.name || order.device_type}</span>
              </span>
              <span className="text-xs font-semibold text-bravo-accent shrink-0">{order.estimated_delivery?.split('-').reverse().join('/')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hidden sm:block border-t border-bravo-border pt-4 mt-4">
        <p className="text-[11px] uppercase tracking-wider text-bravo-text-muted font-semibold mb-3">
          {selected === today ? 'Hoy' : selected.split('-').reverse().join('/')} · {visibleOrders.length} entregas
        </p>
        {visibleOrders.length === 0 ? (
          <p className="text-sm text-bravo-text-muted py-2">No hay órdenes para esta fecha.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {visibleOrders.map(order => (
              <button type="button" key={order.id}
                onClick={() => navigate(`/bravo/orders/${order.id}`)}
                className="border border-bravo-border bg-bravo-input px-4 py-3 text-left flex items-start gap-2">
                <CalendarDays size={16} className="text-bravo-accent shrink-0"/>
                <span>
                  <span className="block font-bold text-xs">{order.order_number}</span>
                  <span className="block text-xs text-bravo-text-muted">{order.client?.name || 'Sin cliente'} · {order.device_type}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
