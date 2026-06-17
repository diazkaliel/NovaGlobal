import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getWhatsAppLink } from '../utils/whatsapp'

const MESSAGE_TYPES = [
  { key: 'listo',       label: '✅ Equipo listo para retirar',  color: '#34d399' },
  { key: 'diagnostico', label: '🔍 En diagnóstico',             color: '#fbbf24' },
  { key: 'presupuesto', label: '💰 Enviar presupuesto',         color: '#a78bfa' },
  { key: 'demora',      label: '⏳ Notificar demora',           color: '#fb923c' },
]

export default function WhatsAppButton({ client, repair }) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState('bottom')
  const ref = useRef(null)

  // Cierra al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Eleva el z-index de la fila para que el menú no quede detrás de otras filas en la tabla
  useEffect(() => {
    if (!ref.current) return
    const row = ref.current.closest('.repair-row')
    if (row) {
      if (open) {
        row.style.position = 'relative'
        row.style.zIndex = '50'
      } else {
        row.style.position = ''
        row.style.zIndex = ''
      }
    }
  }, [open])

  if (!client?.phone) return null

  const balance = repair?.repair_cost && repair?.deposit
    ? Number(repair.repair_cost) - Number(repair.deposit)
    : null

  const handleClick = (e, type) => {
    e.stopPropagation()
    const link = getWhatsAppLink(client.phone, type, {
      name:    client.name,
      brand:   repair?.brand,
      model:   repair?.model,
      order:   repair?.order_number,
      cost:    repair?.repair_cost,
      balance: balance,
    })
    window.open(link, '_blank')
    setOpen(false)
  }

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open && ref.current) {
      // Calculamos el espacio debajo del botón antes de abrir
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      
      if (spaceBelow < 250) {
        setMenuPosition('top')
      } else {
        setMenuPosition('bottom')
      }
    }
    setOpen(!open)
  }

  return (
    <>
      {/* Overlay que bloquea clicks en el resto de la página */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
          }}
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
          }}
        />
      )}

      <div ref={ref} style={{ position: 'relative' }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <MessageCircle size={15} />
          WhatsApp
          <ChevronDown
            size={13}
            style={{
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: menuPosition === 'top' ? 8 : -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: menuPosition === 'top' ? 8 : -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                right: 0,
                ...(menuPosition === 'top' ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
                zIndex: 9999,
                background: '#1e293b', /* Un gris pizarra sólido para asegurar contraste */
                backdropFilter: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 10px 40px 10px rgba(0,0,0,0.8)', /* Sombra más densa para resaltarlo */
                minWidth: 260,
              }}
            >
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>
                  Enviar mensaje a
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                  {client.name}
                </p>
                <p style={{ fontSize: 12, color: '#475569' }}>
                  {client.phone}
                </p>
              </div>

              {/* Opciones */}
              {MESSAGE_TYPES.map((type, i) => (
                <motion.button
                  key={type.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={(e) => handleClick(e, type.key)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: i < MESSAGE_TYPES.length - 1
                      ? '1px solid rgba(255,255,255,0.04)'
                      : 'none',
                    cursor: 'pointer',
                    color: type.color,
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {type.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}