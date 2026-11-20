import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

const base = '/nova/workshop'
const panel = 'relative rounded-xl border border-slate-700 bg-slate-950 p-5 space-y-4 text-slate-100'
const button = 'inline-block px-3 py-2 rounded-lg border border-cyan-700 text-cyan-200 text-sm hover:bg-cyan-950 disabled:opacity-50'
const input = 'block mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2'
const money = n => Number(n).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
const date = d => new Date(d).toLocaleDateString('es-CL')
const errorText = e => typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'No se pudo completar la operación. Intenta nuevamente.'

function useWorkshop(path, refreshKey) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    api.get(base + path).then(r => { if (active) setData(r.data) })
      .catch(e => { if (active) setError(errorText(e)) })
    return () => { active = false }
  }, [path, refreshKey, version])
  return { data, error, reload: () => setVersion(v => v + 1) }
}

function Feedback({ error, reload }) {
  return error && <p role="alert" className="text-amber-300">{error} <button className={button} onClick={reload}>Reintentar consulta</button></p>
}

export function PickupQueue({ repairs }) {
  const { data, error, reload } = useWorkshop('/pickups', repairs)
  const [noticeError, setNoticeError] = useState('')
  const [busy, setBusy] = useState(null)
  async function confirmNotice(id) {
    setBusy(id)
    setNoticeError('')
    try { await api.post(base + '/orders/' + id + '/pickup-notice'); reload() }
    catch (e) { setNoticeError(errorText(e)) }
    finally { setBusy(null) }
  }
  return <section className={panel}>
    <h2 className="text-lg font-bold">Equipos listos para retiro</h2>
    <Feedback error={error} reload={reload} />
    {noticeError && <p role="alert">{noticeError}</p>}
    {!error && (!data ? <p>Cargando retiros…</p> : data.length === 0 ? <p>No hay equipos pendientes de retiro.</p> : <>
      <p>{data.length} equipos · Saldo conocido por cobrar {money(data.reduce((s, r) => s + Number(r.balance || 0), 0))}</p>
      <div className="overflow-auto max-h-96"><table className="w-full text-left text-sm">
        <thead><tr>{['Orden y equipo','Cliente','Tiempo listo','Abono','Saldo','Último aviso','Retiro'].map(t => <th className="p-2" key={t}>{t}</th>)}</tr></thead>
        <tbody>{data.map(r => {
          let phone = (r.phone || '').replace(/\D/g, '')
          if (phone.length === 9) phone = '56' + phone
          const message = 'Hola ' + r.client + ', tu ' + r.device + ' de la orden ' + r.number + ' está listo para retiro en Nova.' + (r.balance == null ? '' : ' Saldo pendiente: ' + money(r.balance) + '.')
          return <tr key={r.id} className="border-t border-slate-800">
            <td className="p-2">{r.number}<br/>{r.device}</td><td>{r.client}</td>
            <td>{r.ready_at ? Math.max(0, Math.floor((Date.now()-Date.parse(r.ready_at))/86400000)) + ' días' : 'Sin fecha'}</td>
            <td>{money(r.deposit)}</td><td>{r.balance == null ? 'Sin precio' : money(r.balance)}</td>
            <td>{r.notified_at ? new Date(r.notified_at).toLocaleString('es-CL') : 'Sin registrar'}</td>
            <td className="p-2"><div className="flex flex-wrap gap-2">
              {phone && <a className={button} target="_blank" rel="noreferrer" href={'https://wa.me/' + phone + '?text=' + encodeURIComponent(message)}>Avisar por WhatsApp</a>}
              <button className={button} disabled={busy !== null} onClick={() => confirmNotice(r.id)}>Confirmar aviso realizado</button>
              <Link className={button} to={'/repairs/' + r.id}>Entrega y cobro</Link>
            </div></td>
          </tr>
        })}</tbody></table></div>
    </>)}
  </section>
}

export function WorkshopOrder({ repair }) {
  const path = '/orders/' + repair.id
  const { data, error, reload } = useWorkshop(path, repair.device_identifier + ':' + repair.status)
  const navigate = useNavigate()
  const draft = useLocation().state?.estimateDraft
  const [description, setDescription] = useState(draft?.description ?? repair.reported_issue ?? '')
  const [amount, setAmount] = useState(draft?.amount ?? repair.repair_cost ?? '')
  const [issue, setIssue] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event, warranty) {
    event.preventDefault()
    setActionError('')
    setBusy(true)
    try {
      const result = await api.post(base + path + (warranty ? '/warranty' : '/estimates'),
        warranty ? { issue } : { description, amount })
      if (warranty) navigate('/repairs/' + result.data.id)
      else reload()
    } catch (e) { setActionError(errorText(e)) }
    finally { setBusy(false) }
  }
  return <section className={panel}>
    <h2 className="text-lg font-bold">Presupuesto de la orden</h2>
    {actionError && <p role="alert">{actionError}</p>}
    <Feedback error={error} reload={reload}/>
    {!['listo','entregado','cancelado'].includes(repair.status) && <form onSubmit={e => submit(e, false)} className="grid gap-3">
      <Link className="text-cyan-300" to="/diagnostics" state={{estimateOrderId:repair.id}}>Calcular con el cotizador rápido</Link>
      <label>Trabajo ofrecido<textarea className={input} required maxLength={2000} value={description} onChange={e => setDescription(e.target.value)}/></label>
      <label>Total en pesos<input className={input} required type="number" min="1" max="99999999" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <button className={button} disabled={busy}>Generar enlace para el cliente</button>
    </form>}
    {data?.estimates.map(q => <article key={q.token} className="border-t border-slate-700 pt-2">
      <strong>{money(q.amount)} · {q.decision}</strong> · {date(q.decided_at || q.created_at)}
      <p>{q.description}</p>
      {q.decision === 'pendiente' && <label>Enlace para compartir<input className={input} readOnly onFocus={e => e.target.select()} value={window.location.origin + '/nova/presupuesto/' + q.token}/></label>}
    </article>)}
    <h2 className="text-lg font-bold">Historial del equipo y garantías</h2>
    {repair.warranty_origin_id && <Link className={button} to={'/repairs/' + repair.warranty_origin_id}>Ver orden original y repuestos utilizados</Link>}
    {data?.history.map(h => <div key={h.id}><Link className="text-cyan-300" to={'/repairs/' + h.id}>{h.number}</Link> · {date(h.date)} · {h.status} {h.origin ? '· Reingreso' : ''}<p>{h.issue}</p></div>)}
    {repair.status === 'entregado' && <form onSubmit={e => submit(e,true)} className="space-y-2">
      <label>Falla reportada al reingresar<textarea className={input} required maxLength={2000} value={issue} onChange={e => setIssue(e.target.value)}/></label>
      <button className={button} disabled={busy}>Crear orden de reingreso por garantía</button>
    </form>}
  </section>
}

export function CustomerEstimate() {
  const { token } = useParams()
  return <EstimateDecision key={token} token={token}/>
}

function EstimateDecision({ token }) {
  const path = '/estimates/' + token
  const { data, error, reload } = useWorkshop(path)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  async function decide(decision) {
    setBusy(true)
    setFailure('')
    try { await api.post(base + path, {decision}); reload() }
    catch(e) { setFailure(errorText(e)); reload() }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-slate-950 p-5 text-white"><section className={panel + ' max-w-xl mx-auto mt-10'}>
    <h1 className="text-2xl font-bold">Presupuesto de Nova</h1>
    <Feedback error={error} reload={reload}/>
    {failure && <p role="alert">{failure}</p>}
    {!data && !error && <p>Cargando presupuesto…</p>}
    {data && <><p>{data.number} · {data.device}</p><p className="whitespace-pre-wrap">{data.description}</p>
      <p className="text-xl">Total {money(data.amount)}</p><p>Estado: {data.decision}</p>
      {data.decision === 'pendiente' && <div className="flex gap-3">
        <button className={button} disabled={busy} onClick={() => decide('aprobado')}>Aprobar presupuesto</button>
        <button className={button} disabled={busy} onClick={() => decide('rechazado')}>Rechazar</button>
      </div>}</>}
  </section></main>
}
