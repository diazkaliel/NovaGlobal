export default function KanbanMoveSelect({ order, columns, onMove, disabled }) {
  return (
    <select
      aria-label={`Mover orden ${order.order_number} a otra columna`}
      className="w-full rounded-lg border border-white/15 bg-zinc-900 px-2 py-1.5 text-xs text-white"
      value=""
      disabled={disabled}
      onClick={event => event.stopPropagation()}
      onChange={event => onMove(order, columns.find(column => column.id === event.target.value))}
    >
      <option value="" disabled>Mover a…</option>
      {columns.filter(column => !column.statuses.includes(order.status)).map(column => (
        <option key={column.id} value={column.id}>{column.shortTitle || column.title}</option>
      ))}
    </select>
  )
}
