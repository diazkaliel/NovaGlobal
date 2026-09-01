import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getWhatsAppLink } from '../utils/whatsapp'

const MESSAGE_TYPES_NOVA = [
  { key: 'listo',       label: '✅ Equipo listo para retirar',   color: '#34d399' },
  { key: 'diagnostico', label: '🔍 En diagnóstico técnico',       color: '#fbbf24' },
  { key: 'presupuesto', label: '💰 Enviar presupuesto',          color: '#a78bfa' },
  { key: 'demora',      label: '⏳ Notificar demora',            color: '#fb923c' },
  { key: 'consulta',    label: '💬 Chatear con el cliente',     color: '#38bdf8' },
]

const MESSAGE_TYPES_BRAVO = [
  { key: 'listo_bravo',      label: '✅ Pedido listo p/ entrega',    color: '#34d399' },
  { key: 'diseno_bravo',     label: '🎨 Muestra de diseño lista',    color: '#fbbf24' },
  { key: 'produccion_bravo', label: '🧵 En producción en taller',    color: '#38bdf8' },
  { key: 'cotizacion_bravo', label: '💰 Enviar cotización/valor',    color: '#a78bfa' },
  { key: 'consulta_bravo',   label: '💬 Chatear con el cliente',     color: '#e2e8f0' },
]

export default function WhatsAppButton({ 
  client, 
  repair, 
  phone, 
  clientName, 
  orderNumber, 
  isBravo = false 
}) {
  const [open, setOpen] = useState(false)
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, isAbove: false })
  const buttonRef = useRef(null)

  // Extraer datos unificados independientemente de la forma en que se pasen los props
  const activeClient = client || (phone ? { phone, name: clientName || 'Cliente' } : (repair?.client || null))
  const activeRepair = repair || (orderNumber ? { order_number: orderNumber } : null)
  
  // Detectar si la orden pertenece a Bravo por propiedad de modelo o prop explícito
  const isBravoSystem = isBravo || activeRepair?.system === 'bravo'
  const messageTypes = isBravoSystem ? MESSAGE_TYPES_BRAVO : MESSAGE_TYPES_NOVA

  const updatePosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 280
    const menuHeight = 270
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    let isAbove = false
    let top = rect.bottom + 6

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      isAbove = true
      top = rect.top - menuHeight - 6
      if (top < 10) top = 10
    }

    // Alinear a la derecha del botón, sin desbordar los bordes de la pantalla
    let left = rect.right - menuWidth
    if (left < 12) left = 12
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12
    }

    setMenuCoords({ top, left, isAbove })
  }

  // Cerrar al hacer scroll o redimensionar para evitar menús flotantes desfasados
  useEffect(() => {
    if (!open) return
    
    updatePosition()

    const handleScrollOrResize = () => {
      setOpen(false)
    }

    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open])

  if (!activeClient?.phone) return null

  const costNum = Number(activeRepair?.repair_cost || 0)
  const depositNum = Number(activeRepair?.deposit || 0)
  const balance = (costNum > 0 || depositNum > 0) ? Math.max(0, costNum - depositNum) : null

  const handleClick = (e, type) => {
    e.stopPropagation()
    const link = getWhatsAppLink(activeClient.phone, type, {
      name:        activeClient.name,
      brand:       activeRepair?.brand,
      model:       activeRepair?.model || activeRepair?.device_type,
      device_type: activeRepair?.device_type,
      order:       activeRepair?.order_number,
      cost:        activeRepair?.repair_cost,
      balance:     balance,
    })
    window.open(link, '_blank')
    setOpen(false)
  }

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open) {
      updatePosition()
    }
    setOpen(!open)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white border-none cursor-pointer transition-all shadow-[0_0_15px_rgba(37,211,102,0.18)] hover:shadow-[0_0_22px_rgba(37,211,102,0.35)] hover:scale-[1.03] active:scale-[0.97] select-none shrink-0"
        title="Enviar WhatsApp al cliente"
      >
        <MessageCircle size={14} className="shrink-0" />
        <span className="hidden sm:inline font-medium">WhatsApp</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* RENDERIZADO EN PORTAL GLOBAL (document.body) PARA EVITAR SOLAPAMIENTOS DE TARJETAS */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop transparente para capturar clics exteriores */}
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999998,
                  backgroundColor: 'transparent',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                }}
              />

              {/* Menú Dropdown Flotante con Máxima Prioridad */}
              <motion.div
                initial={{ opacity: 0, y: menuCoords.isAbove ? 8 : -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: menuCoords.isAbove ? 8 : -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: menuCoords.top,
                  left: menuCoords.left,
                  width: 280,
                  zIndex: 999999,
                  background: '#0f172a', /* Slate 900 sólido con alto contraste */
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
                }}
              >
                {/* Cabecera del Destinatario */}
                <div style={{
                  padding: '12px 16px',
                  background: isBravoSystem 
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(15, 23, 42, 0.9))' 
                    : 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(15, 23, 42, 0.9))',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      {isBravoSystem ? 'Personalizaciones Bravo' : 'Nova Tecnologies'}
                    </p>
                    {activeRepair?.order_number && (
                      <span style={{ fontSize: 10, color: isBravoSystem ? '#fbbf24' : '#22d3ee', fontFamily: 'monospace', fontWeight: 700 }}>
                        #{activeRepair.order_number}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeClient.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 1 }}>
                    {activeClient.phone}
                  </p>
                </div>

                {/* Lista de Plantillas Predefinidas */}
                <div style={{ padding: '6px 0' }}>
                  {messageTypes.map((type, i) => (
                    <motion.button
                      key={type.key}
                      type="button"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={(e) => handleClick(e, type.key)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: type.color,
                        fontSize: 12.5,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'background 0.12s, transform 0.12s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'
                        e.currentTarget.style.paddingLeft = '18px'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.paddingLeft = '16px'
                      }}
                    >
                      {type.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}