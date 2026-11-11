import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react'
import { getBravoOrders, updateBravoOrderStatus } from '../../api/bravo'
import './BravoProductionBoardPage.css'

const PAGE_SIZE = 100
const STAGES = [
  { id: 'ingreso', title: 'Ingreso', statuses: ['recibido'], color: '#dec189' },
  { id: 'diseno', title: 'Diseño y muestra', statuses: ['diagnostico', 'presupuesto_enviado'], color: '#8ea7e2' },
  { id: 'insumos', title: 'Espera insumos', statuses: ['esperando_repuesto'], color: '#e9a76d' },
  { id: 'produccion', title: 'Producción', statuses: ['en_reparacion'], color: '#67c5cc' },
  { id: 'entrega', title: 'Listas', statuses: ['listo'], color: '#8ac9a1' },
  { id: 'atencion', title: 'Atención', statuses: ['critico'], color: '#e88e7e' },
]

const NEXT_STEP = {
  recibido: { status: 'diagnostico', label: 'Pasar a diseño' },
  diagnostico: { status: 'presupuesto_enviado', label: 'Muestra enviada' },
  presupuesto_enviado: { status: 'en_reparacion', label: 'Iniciar producción' },
  esperando_repuesto: { status: 'en_reparacion', label: 'Retomar producción' },
  en_reparacion: { status: 'listo', label: 'Marcar lista' },
}

function WorkCard({ order, changing, onAdvance, onHold, onOpen }) {
  const nextStep = NEXT_STEP[order.status]
  return (
    <article className="bravo-work-card">
      <div className="bravo-work-card-top">
        <span>{order.order_number}</span>
        {order.estimated_delivery && <span className="bravo-work-date">
          <CalendarDays size={12}/>{order.estimated_delivery}
        </span>}
      </div>
      <h3>{order.client?.name || 'Cliente sin nombre'}</h3>
      <p>{order.device_type || 'Personalización'} {order.model ? '· ' + order.model : ''}</p>
      <div className="bravo-work-card-actions">
        <button type="button" onClick={() => onOpen(order.id)} className="bravo-work-open">
          Ver ficha <ChevronRight size={14}/>
        </button>
        {nextStep && (
          <button type="button" onClick={() => onAdvance(order, nextStep.status)}
            disabled={changing} className="bravo-work-advance">
            {changing ? 'Actualizando…' : nextStep.label}<ArrowRight size={14}/>
          </button>
        )}
      </div>
      {order.status === 'diagnostico' && (
        <button type="button" disabled={changing} className="bravo-work-hold"
          onClick={() => onHold(order)}>Esperar insumos</button>
      )}
    </article>
  )
}

export default function BravoProductionBoardPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyOrderId, setBusyOrderId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    setLoading(true)
    setError('')
    getBravoOrders({ active_only: true, limit: PAGE_SIZE, skip: page * PAGE_SIZE })
      .then(response => {
        if (!isCurrent) return
        const fetched = response.data
        setOrders(previous => page === 0 ? fetched : [
          ...previous, ...fetched.filter(order => !previous.some(existing => existing.id === order.id)),
        ])
        setHasMore(fetched.length === PAGE_SIZE)
      })
      .catch(() => { if (isCurrent) setError('No se pudieron consultar las órdenes de producción.') })
      .finally(() => { if (isCurrent) setLoading(false) })
    return () => { isCurrent = false }
  }, [page, refreshToken])

  const stageOrders = useMemo(() => STAGES.map(stage => ({
    ...stage,
    orders: orders.filter(order => stage.statuses.includes(order.status)),
  })), [orders])

  const refresh = () => {
    setPage(0)
    setRefreshToken(current => current + 1)
  }

  const advance = async (order, nextStatus) => {
    if (busyOrderId !== null) return
    setBusyOrderId(order.id)
    setError('')
    try {
      const updated = await updateBravoOrderStatus(
        order.id, nextStatus, 'Avance registrado desde tablero BRAVO'
      )
      // Esperamos respuesta del servidor para no representar movimientos que fallaron.
      setOrders(current => current.map(existing =>
        existing.id === order.id ? updated.data : existing
      ))
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo actualizar el estado. Reintenta desde la ficha.')
    } finally {
      setBusyOrderId(null)
    }
  }

  return (
    <div className="bravo-workspace">
      <div className="bravo-workspace-topline">
        <span>BRAVO / PRODUCCIÓN EN TIEMPO REAL</span>
        <span>VISTA DE ÓRDENES ACTIVAS</span>
      </div>
      <div className="bravo-workspace-heading">
        <div>
          <span>01 / TABLERO DE TALLER</span>
          <h1>Todo en <em>movimiento.</em></h1>
          <p>El estado de cada orden sale de BRAVO. Los cambios se guardan en su historial.</p>
        </div>
        <div className="bravo-workspace-tools">
          <button type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={16}/> Actualizar
          </button>
          <button type="button" className="bravo-workspace-create"
            onClick={() => navigate('/bravo/orders/new')}>
            Nueva orden <ArrowRight size={16}/>
          </button>
        </div>
      </div>
      <div className="bravo-workspace-stats">
        <div><span>ÓRDENES VISIBLES</span><strong>{orders.length}</strong></div>
        <div><span>EN PRODUCCIÓN</span><strong>{orders.filter(order => order.status === 'en_reparacion').length}</strong></div>
        <div><span>LISTAS PARA ENTREGA</span><strong>{orders.filter(order => order.status === 'listo').length}</strong></div>
      </div>
      {error && <div role="alert" className="bravo-workspace-error"><AlertTriangle size={16}/>{error}</div>}
      <div className="bravo-workspace-scroll" role="region" tabIndex={0} aria-label="Etapas de producción; desplázate horizontalmente para verlas">
        <div className="bravo-workspace-columns">
          {stageOrders.map(stage => (
            <section key={stage.id} className="bravo-workspace-stage" style={{ '--stage-accent': stage.color }}>
              <div className="bravo-workspace-stage-heading">
                <div><span className="bravo-stage-marker"/><h2>{stage.title}</h2></div>
                <strong>{stage.orders.length}</strong>
              </div>
              <div className="bravo-workspace-stage-body">
                {stage.orders.map(order => (
                  <WorkCard key={order.id} order={order} changing={busyOrderId === order.id}
                    onAdvance={advance}
                    onHold={selected => advance(selected, 'esperando_repuesto')}
                    onOpen={orderId => navigate(`/bravo/orders/${orderId}`)}/>
                ))}
                {stage.orders.length === 0 && <p className="bravo-work-empty">No hay órdenes en esta etapa.</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className="bravo-workspace-footer">
        <p>Los cambios de estado se guardan en BRAVO. «Listas» pasan a «Entregadas» desde su ficha, después de verificar la entrega.</p>
        {loading && <span role="status">Sincronizando órdenes…</span>}
        {!loading && hasMore && <button type="button" onClick={() => setPage(value => value + 1)}>Cargar más órdenes</button>}
      </div>
    </div>
  )
}
