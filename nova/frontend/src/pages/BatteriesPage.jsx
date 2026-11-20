import { useEffect, useState } from 'react'
import { loadAllPages } from '../api/allPages'
import { getInventoryItems } from '../api/inventory'
import { parseError } from '../utils/errors'
import { EditStockModal, NewItemModal } from './InventoryPage'

const normalize = text => (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function BatteriesPage() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('available')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let active = true
    setError('')
    setItems(null)
    loadAllPages(getInventoryItems, { system: 'nova', batteries_only: true }, 200)
      .then(rows => { if (active) setItems(rows) })
      .catch(err => { if (active) setError(parseError(err, 'No se pudo cargar el stock de baterías.')) })
    return () => { active = false }
  }, [revision])

  function refresh() {
    setCreating(false)
    setEditing(null)
    setRevision(value => value + 1)
  }

  const visible = (items || []).filter(item => {
    if (availability === 'available' && item.stock <= 0) return false
    if (availability === 'empty' && item.stock > 0) return false
    return normalize(item.name + ' ' + (item.barcode || '')).includes(normalize(search.trim()))
  })

  return <section className="space-y-6 text-left">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div><h1 className="text-3xl font-semibold tracking-tight">Baterías</h1>
        <p className="mt-1 text-sm text-slate-400">Stock por modelo en el inventario de Nova.</p></div>
      <button className="nova-cta px-5 py-2.5" onClick={() => setCreating(true)}>Registrar batería</button>
    </header>
    {error ? <div role="alert">{error} <button className="underline" onClick={refresh}>Reintentar</button></div>
      : !items ? <p role="status">Cargando baterías…</p> : <>
        <dl className="nova-stock-summary">{[
          ['Unidades en stock', items.reduce((sum, row) => sum + row.stock, 0)],
          ['Referencias disponibles', items.filter(row => row.stock > 0).length],
          ['Referencias en mínimo o agotadas', items.filter(row => row.stock <= row.min_stock).length],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="flex flex-wrap gap-3">
          <input aria-label="Buscar modelo o código" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" placeholder="Buscar modelo o código" value={search} onChange={e => setSearch(e.target.value)} />
          <select aria-label="Disponibilidad" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" value={availability} onChange={e => setAvailability(e.target.value)}>
            <option value="available">En stock</option><option value="empty">Agotadas</option><option value="all">Todas</option>
          </select>
        </div>
        {visible.length ? <div className="overflow-x-auto"><table className="w-full text-sm tabular-nums">
          <thead className="text-slate-400"><tr><th className="p-3">Referencia</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Mínimo</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{visible.map(item => <tr className="border-t border-slate-800" key={item.id}>
            <th scope="row" className="p-3 font-semibold">{item.name}<small className="block text-slate-400">{item.barcode}</small></th>
            <td className={'p-3 text-right ' + (item.stock <= item.min_stock ? 'text-amber-300' : '')}>{item.stock}</td>
            <td className="p-3 text-right">{item.min_stock}</td>
            <td className="text-right"><button className="text-cyan-300 underline" aria-label={'Ajustar stock de ' + item.name} onClick={() => setEditing(item)}>Ajustar</button></td>
          </tr>)}</tbody>
        </table></div> : <p role="status">No hay baterías que coincidan con los filtros.</p>}
      </>}
    {creating && <NewItemModal battery onClose={() => setCreating(false)} onCreated={refresh} />}
    {editing && <EditStockModal item={editing} onClose={() => setEditing(null)} onUpdated={refresh} />}
  </section>
}
