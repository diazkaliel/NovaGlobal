import { useRef, useState } from 'react'

export function useKanbanMove(onMove, disabled = false) {
  const dragged = useRef(null)
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const [target, setTarget] = useState(null)

  function clearDrag() {
    dragged.current = null
    setTarget(null)
  }

  async function move(order, column) {
    if (!order || !column || disabled || saving.current || column.statuses.includes(order.status)) return
    saving.current = true
    setBusy(true)
    try {
      await onMove(order, column.statuses[0])
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  function cardProps(order) {
    return {
      draggable: !disabled && !busy,
      onDragStartCapture(event) {
        if (event.target.closest('button, a, select, input, textarea')) {
          event.preventDefault()
          return
        }
        dragged.current = order
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(order.id))
      },
      onDragEndCapture: clearDrag,
    }
  }

  function columnProps(column) {
    return {
      onDragOver(event) {
        if (!dragged.current || disabled || busy || column.statuses.includes(dragged.current.status)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setTarget(column.id)
      },
      onDragLeave(event) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setTarget(current => current === column.id ? null : current)
        }
      },
      onDrop(event) {
        const order = dragged.current
        if (!order) return
        event.preventDefault()
        clearDrag()
        void move(order, column)
      },
      'data-drop-target': target === column.id || undefined,
    }
  }

  return { cardProps, columnProps, move, busy: disabled || busy }
}
