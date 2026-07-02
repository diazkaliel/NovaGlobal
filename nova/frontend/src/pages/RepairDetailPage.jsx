import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Calendar, DollarSign, User, Wrench,
  ChevronRight, Edit2, Save, X, Download, Flame, Trash2, Printer
} from 'lucide-react'
import { getRepair, updateRepairStatus, updateRepair, deleteRepair } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'
import { generateRepairPDF } from '../utils/generateRepairPDF'
import api from '../api/client'
import WhatsAppButton from '../components/WhatsAppButton'
import { parseError } from '../utils/errors'
import JsBarcode from 'jsbarcode'

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG_NOVA = {
  recibido:            { label: 'Recibido',            dot: 'var(--color-blue-400)', badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  diagnostico:         { label: 'Diagnóstico',          dot: 'var(--color-yellow-450)', badge: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400' },
  esperando_repuesto:  { label: 'Espera Repuesto',      dot: 'var(--color-orange-450)', badge: 'bg-orange-500/10 border-orange-500/25 text-orange-400' },
  presupuesto_enviado: { label: 'Pto. Enviado',         dot: 'var(--color-purple-400)', badge: 'bg-purple-500/10 border-purple-500/25 text-purple-400' },
  en_reparacion:       { label: 'En reparación',        dot: 'var(--color-cyan-400)', badge: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400' },
  listo:               { label: 'Listo',                dot: 'var(--color-emerald-450)', badge: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' },
  entregado:           { label: 'Entregado',            dot: 'var(--color-gray-550)', badge: 'bg-gray-500/10 border-gray-500/20 text-gray-550' },
  cancelado:           { label: 'Cancelado',            dot: 'var(--color-rose-455)', badge: 'bg-red-500/10 border-red-500/20 text-red-455' },
  critico:             { label: 'Crítico 🚨',           dot: 'var(--color-rose-455)', badge: 'bg-rose-500/20 border-rose-500/40 text-rose-455 font-black animate-pulse shadow-[inset_0_0_6px_rgba(244,63,94,0.15)]' },
  en_garantia:         { label: 'En Garantía',          dot: '#ec4899', badge: 'bg-pink-500/10 border-pink-500/25 text-pink-400 font-bold' },
}

const STATUS_CONFIG_BRAVO = {
  recibido:            { label: 'Recibido',            dot: '#d97706', badge: 'bg-amber-100/80 text-amber-900 border border-amber-300/40 shadow-sm shadow-amber-500/5' },
  diagnostico:         { label: 'En Diseño',          dot: '#ea580c', badge: 'bg-orange-100/80 text-orange-900 border border-orange-300/40 shadow-sm shadow-orange-500/5' },
  esperando_repuesto:  { label: 'Espera Insumos',      dot: '#eab308', badge: 'bg-yellow-100/90 text-yellow-955 border border-yellow-300/40 shadow-sm shadow-yellow-500/5' },
  presupuesto_enviado: { label: 'Muestra Enviada',     dot: '#8b5cf6', badge: 'bg-purple-100/80 text-purple-900 border border-purple-300/40 shadow-sm shadow-purple-500/5' },
  en_reparacion:       { label: 'En Producción',       dot: '#0284c7', badge: 'bg-sky-100/95 text-sky-900 border border-sky-300/50 shadow-sm shadow-sky-500/5 font-bold' },
  listo:               { label: 'Listo p/ Entrega',    dot: '#059669', badge: 'bg-emerald-100/90 text-emerald-900 border border-emerald-300/40 shadow-sm shadow-emerald-500/5 font-bold' },
  entregado:           { label: 'Entregado',            dot: '#78716c', badge: 'bg-stone-100 text-stone-700 border border-stone-300/50' },
  cancelado:           { label: 'Cancelado',            dot: '#dc2626', badge: 'bg-red-100/80 text-red-900 border border-red-300/40' },
  critico:             { label: 'Crítico 🚨',           dot: '#ef4444', badge: 'bg-red-200/90 text-red-955 border border-red-400 font-extrabold animate-pulse shadow-sm shadow-red-500/20' },
  en_garantia:         { label: 'En Garantía',          dot: '#ec4899', badge: 'bg-pink-100/90 text-pink-900 border border-pink-300/40 shadow-sm font-bold shadow-pink-500/5' },
}

const isBravoSystem = () => (localStorage.getItem('selected_system') || 'nova') === 'bravo'
const ALL_STATUSES = Object.keys(STATUS_CONFIG_NOVA)

// ─── Componentes de Bloqueo ──────────────────────────────────────────────────
function MiniPatternPreview({ pattern }) {
  const parts = pattern.replace('Patrón: ', '').split('-').map(Number).filter(Boolean)
  const dots = [
    { id: 1, x: 20, y: 20 },
    { id: 2, x: 60, y: 20 },
    { id: 3, x: 100, y: 20 },
    { id: 4, x: 20, y: 60 },
    { id: 5, x: 60, y: 60 },
    { id: 6, x: 100, y: 60 },
    { id: 7, x: 20, y: 100 },
    { id: 8, x: 60, y: 100 },
    { id: 9, x: 100, y: 100 },
  ]
  return (
    <div className="flex flex-col items-center gap-1 p-2 bg-gray-955/65 border border-gray-850 rounded-xl w-fit">
      <svg width="120" height="120" viewBox="0 0 120 120" className="select-none">
        {parts.map((dotId, index) => {
          if (index === 0) return null
          const prevDot = dots.find(d => d.id === parts[index - 1])
          const currDot = dots.find(d => d.id === dotId)
          if (!prevDot || !currDot) return null
          return (
            <line
              key={`line-${index}`}
              x1={prevDot.x}
              y1={prevDot.y}
              x2={currDot.x}
              y2={currDot.y}
              stroke="var(--color-cyan-400)"
              strokeWidth="4"
              strokeLinecap="round"
              className="drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]"
            />
          )
        })}
        {dots.map(dot => {
          const active = parts.includes(dot.id)
          const isLast = parts[parts.length - 1] === dot.id
          return (
            <g key={dot.id}>
              <circle
                cx={dot.x}
                cy={dot.y}
                r="3"
                fill={active ? "var(--color-cyan-400)" : "#475569"}
                style={active ? { filter: 'drop-shadow(0 0 3px var(--color-cyan-400))' } : {}}
              />
              {active && isLast && (
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="1.5"
                  fill="#ffffff"
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function PasswordViewer({ password }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-white">
        {show ? password : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] uppercase font-bold text-gray-400 hover:text-white hover:border-gray-700 transition-colors cursor-pointer active:scale-95"
      >
        {show ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}

function PatternLock({ value, onChange }) {
  const [path, setPath] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currCoords, setCurrCoords] = useState(null)
  const svgRef = useRef(null)

  const dots = [
    { id: 1, x: 40, y: 40 },
    { id: 2, x: 120, y: 40 },
    { id: 3, x: 200, y: 40 },
    { id: 4, x: 40, y: 120 },
    { id: 5, x: 120, y: 120 },
    { id: 6, x: 200, y: 120 },
    { id: 7, x: 40, y: 200 },
    { id: 8, x: 120, y: 200 },
    { id: 9, x: 200, y: 200 },
  ]

  const checkCollision = (clientX, clientY) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 240
    const y = ((clientY - rect.top) / rect.height) * 240

    for (const dot of dots) {
      const dist = Math.hypot(dot.x - x, dot.y - y)
      if (dist < 22) {
        return dot.id
      }
    }
    return null
  }

  const handleStart = (clientX, clientY) => {
    setIsDrawing(true)
    const dotId = checkCollision(clientX, clientY)
    if (dotId) {
      setPath([dotId])
    } else {
      setPath([])
    }
  }

  const handleMove = (clientX, clientY) => {
    if (!isDrawing) return
    if (!svgRef.current) return
    
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 240
    const y = ((clientY - rect.top) / rect.height) * 240
    setCurrCoords({ x, y })

    const dotId = checkCollision(clientX, clientY)
    if (dotId && !path.includes(dotId)) {
      setPath(prev => [...prev, dotId])
    }
  }

  const handleEnd = () => {
    setIsDrawing(false)
    setCurrCoords(null)
    if (path.length > 0) {
      onChange(`Patrón: ${path.join('-')}`)
    } else {
      onChange('')
    }
  }

  const onMouseDown = (e) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const onMouseMove = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    handleMove(e.clientX, e.clientY)
  }

  const onMouseUp = () => {
    handleEnd()
  }

  const onTouchStart = (e) => {
    if (e.touches.length === 0) return
    e.preventDefault()
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const onTouchMove = (e) => {
    if (!isDrawing || e.touches.length === 0) return
    e.preventDefault()
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const onTouchEnd = () => {
    handleEnd()
  }

  const clearPattern = () => {
    setPath([])
    onChange('')
  }

  useEffect(() => {
    if (!value) {
      setPath([])
    } else if (value.startsWith('Patrón: ')) {
      const parts = value.replace('Patrón: ', '').split('-').map(Number).filter(Boolean)
      setPath(parts)
    }
  }, [value])

  return (
    <div className="flex flex-col items-center gap-3 bg-gray-955/70 border border-gray-800 rounded-2xl p-4 w-fit mx-auto select-none">
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider h-4">
        {path.length > 0 ? `Patrón ingresado: ${path.join(' ➔ ')}` : 'Dibuja el patrón uniendo los puntos'}
      </div>
      
      <svg
        ref={svgRef}
        width="240"
        height="240"
        viewBox="0 0 240 240"
        className="cursor-pointer select-none touch-none bg-gray-900/40 rounded-xl"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {path.map((dotId, index) => {
          if (index === 0) return null
          const prevDot = dots.find(d => d.id === path[index - 1])
          const currDot = dots.find(d => d.id === dotId)
          if (!prevDot || !currDot) return null
          return (
            <line
              key={`line-${index}`}
              x1={prevDot.x}
              y1={prevDot.y}
              x2={currDot.x}
              y2={currDot.y}
              stroke="var(--color-cyan-400)"
              strokeWidth="6"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          )
        })}

        {isDrawing && path.length > 0 && currCoords && (
          <line
            x1={dots.find(d => d.id === path[path.length - 1]).x}
            y1={dots.find(d => d.id === path[path.length - 1]).y}
            x2={currCoords.x}
            y2={currCoords.y}
            stroke="var(--color-cyan-400)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="4 4"
            className="opacity-70"
          />
        )}

        {dots.map(dot => {
          const active = path.includes(dot.id)
          const isLast = path[path.length - 1] === dot.id
          return (
            <g key={dot.id}>
              <circle
                cx={dot.x}
                cy={dot.y}
                r="18"
                fill="transparent"
                stroke={active ? "rgba(34, 211, 238, 0.25)" : "transparent"}
                strokeWidth="2"
                className="transition-all duration-150"
              />
              <circle
                cx={dot.x}
                cy={dot.y}
                r={active ? "8" : "6"}
                fill={active ? "var(--color-cyan-400)" : "#374151"}
                className="transition-all duration-150"
                style={active ? { filter: 'drop-shadow(0 0 6px var(--color-cyan-400))' } : {}}
              />
              {active && isLast && (
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="3"
                  fill="#ffffff"
                />
              )}
            </g>
          )
        })}
      </svg>

      <button
        type="button"
        onClick={clearPattern}
        className="px-3 py-1 rounded-lg bg-gray-900 border border-gray-800 text-[10px] uppercase font-bold text-gray-400 hover:text-white hover:border-gray-700 transition-all cursor-pointer active:scale-95"
      >
        Limpiar
      </button>
    </div>
  )
}

// ─── InfoCard ───────────────────────────────────────────────────────────────
function InfoCard({ title, icon: Icon, iconColor, children, delay = 0 }) {
  const isBravo = isBravoSystem()
  return (
    <motion.div
      className={`${
        isBravo
          ? 'bg-bravo-card border border-bravo-border shadow-xs text-bravo-text'
          : 'bg-[#0c0d12]/60 border border-gray-850 shadow-xl text-white'
      } rounded-2xl p-6 relative overflow-visible hover:border-stone-300/40 transition-all duration-300 backdrop-blur-md text-left`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
    >
      <div className={`flex items-center gap-2 mb-5 pb-3 border-b ${isBravo ? 'border-bravo-border/60' : 'border-gray-900/60'}`}>
        {Icon && (
          <span className="p-1.5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${iconColor}15`, color: iconColor }}>
            <Icon size={14} />
          </span>
        )}
        <span className={`text-[10px] font-extrabold tracking-wider uppercase ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>{title}</span>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  )
}

// ─── InfoRow ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, accent, isEditing, editKey, formData, setFormData, type = 'text', multiline = false }) {
  const isBravo = isBravoSystem()
  if (!isEditing && !value && value !== 0) return null
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 border-b ${isBravo ? 'border-bravo-border/60' : 'border-gray-900/30'} last:border-b-0`}>
      <span className={`text-xs pt-1 shrink-0 font-medium ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>{label}</span>
      {isEditing && editKey ? (
        multiline ? (
          <textarea
            value={formData[editKey] || ''}
            onChange={e => setFormData({ ...formData, [editKey]: e.target.value })}
            className={isBravo
              ? "w-full max-w-[240px] bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none transition-all resize-none text-left"
              : "w-full max-w-[240px] bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all resize-none text-left"}
            rows={2}
          />
        ) : (
          <input
            type={type}
            value={formData[editKey] || ''}
            onChange={e => setFormData({ ...formData, [editKey]: e.target.value })}
            className={isBravo
              ? "w-full max-w-[200px] bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all text-right"
              : "w-full max-w-[200px] bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition-all text-right"}
          />
        )
      ) : (
        <span className={`text-xs font-bold text-right break-words max-w-[280px] ${isBravo ? 'text-bravo-text' : 'text-gray-250'}`} style={accent ? { color: accent } : {}}>
          {value}
        </span>
      )}
    </div>
  )
}

// ─── StatusBadge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isBravo = isBravoSystem()
  const config = isBravo ? STATUS_CONFIG_BRAVO : STATUS_CONFIG_NOVA
  const cfg = config[status] ?? config.recibido
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${cfg.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: isBravo ? undefined : `0 0 8px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  )
}

export function printRepairSticker(repair, client, isBravo = false) {
  if (!repair) return

  const clientName = client?.name || repair.client?.name || 'Cliente'
  const brand = repair.brand || ''
  const model = repair.model || ''
  const orderNumber = repair.order_number || ''
  const title = isBravo ? 'BRAVO' : 'NOVA GLOBAL'

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(`
    <html>
      <head>
        <title>Imprimir Sticker</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 3mm 4mm;
            font-family: 'Inter', system-ui, sans-serif;
            background: white;
            color: black;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            width: 62mm;
            height: 29mm;
            overflow: hidden;
          }
          .header-title {
            font-size: 7.5px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #000000;
            margin-bottom: 1px;
          }
          .order-id {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: -0.01em;
            line-height: 1.1;
            margin-bottom: 1px;
          }
          .meta-text {
            font-size: 9px;
            font-weight: 700;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          .device-text {
            font-size: 8px;
            font-weight: 500;
            color: #374151;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            margin-bottom: 2px;
          }
          .barcode-box {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 25px;
          }
          #barcode {
            max-width: 100%;
            height: 25px;
          }
        </style>
      </head>
      <body>
        <div class="header-title">${title}</div>
        <div class="order-id">${orderNumber}</div>
        <div class="meta-text">${clientName}</div>
        <div class="device-text">${brand} ${model}</div>
        <div class="barcode-box">
          <svg id="barcode"></svg>
        </div>
      </body>
    </html>
  `)
  doc.close()

  const svgEl = doc.getElementById('barcode')
  if (svgEl) {
    try {
      JsBarcode(svgEl, orderNumber, {
        format: 'CODE128',
        width: 1.3,
        height: 25,
        displayValue: false,
        margin: 0
      })
    } catch (e) {
      console.error('Error generando el código de barras en el sticker:', e)
    }
  }

  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('Error disparando la impresión:', e)
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      }, 1500)
    }
  }, 350)
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function RepairDetailPage() {
  const { id }      = useParams()
  const navigate    = useNavigate()

  const [repair,         setRepair]         = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [changingStatus, setChangingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [note,           setNote]           = useState('')
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [isEditing,      setIsEditing]      = useState(false)
  const [formData,       setFormData]       = useState({})
  const [saving,         setSaving]         = useState(false)
  const [client,         setClient]         = useState(null)
  const [criticalAlertData, setCriticalAlertData] = useState(null)
  const [lockType,       setLockType]       = useState('none')
  const [error,          setError]          = useState('')

  useEffect(() => {
    if (repair?.client_id) {
      api.get(`/clients/${repair.client_id}`)
        .then(res => setClient(res.data))
        .catch(console.error)
    }
  }, [repair])

  const fetchRepair = async () => {
    try {
      const res = await getRepair(id)
      const repairData = res.data
      const clientData = repairData.client
      setRepair(repairData)
      setFormData({
        device_type:        repairData.device_type,
        brand:              repairData.brand,
        model:              repairData.model,
        reported_issue:     repairData.reported_issue,
        accessories:        repairData.accessories || '',
        device_password:    repairData.device_password || '',
        repair_cost:        repairData.repair_cost || '',
        deposit:            repairData.deposit || '',
        deposit_payment_method: repairData.deposit_payment_method || '',
        final_payment_method:   repairData.final_payment_method || '',
        estimated_delivery: repairData.estimated_delivery
          ? repairData.estimated_delivery.split('T')[0] : '',
        // Client fields
        client_name:        clientData?.name || '',
        client_phone:       clientData?.phone || '',
        client_email:       clientData?.email || '',
        client_city:        clientData?.city || '',
      })
    } catch {
      navigate('/repairs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRepair() }, [id])

  useEffect(() => {
    if (repair) {
      const pass = repair.device_password || ''
      if (!pass) {
        setLockType('none')
      } else if (pass.startsWith('Patrón: ')) {
        setLockType('pattern')
      } else {
        setLockType('password')
      }
    }
  }, [repair, isEditing])

  const handleStatusChange = async () => {
    if (!selectedStatus) return
    
    if (selectedStatus === 'entregado') {
      const cost = parseFloat(repair?.repair_cost || 0)
      const dep = parseFloat(repair?.deposit || 0)
      setPaymentAmount(Math.max(0, cost - dep).toString())
      setPaymentMethod('efectivo')
      setShowPaymentModal(true)
      return
    }

    setChangingStatus(true)
    try {
      const res = await updateRepairStatus(id, { new_status: selectedStatus, note })
      const updatedRepair = res.data
      await fetchRepair()
      setShowStatusForm(false)
      setNote('')
      setSelectedStatus('')

      // Desplegar modal si es crítico y el cliente es recurrente
      if (selectedStatus === 'critico' && updatedRepair.client_repairs_count > 1) {
        setCriticalAlertData({
          clientName: updatedRepair.client?.name || client?.name || 'Cliente',
          orderNumber: updatedRepair.order_number,
          count: updatedRepair.client_repairs_count,
        })
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cambiar el estado.')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleDeliverConfirm = async () => {
    setChangingStatus(true)
    try {
      await updateRepairStatus(id, {
        new_status: 'entregado',
        note: note,
        payment_amount: parseFloat(paymentAmount || 0),
        payment_method: paymentMethod
      })
      await fetchRepair()
      setShowStatusForm(false)
      setShowPaymentModal(false)
      setNote('')
      setSelectedStatus('')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al entregar la reparación.')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleSave = async () => {
    if (lockType === 'pattern' && (!formData.device_password || !formData.device_password.startsWith('Patrón: '))) {
      setError('Por favor dibuja un patrón en la cuadrícula.')
      return
    }

    const cost = formData.repair_cost ? parseFloat(formData.repair_cost) : null
    const dep = formData.deposit ? parseFloat(formData.deposit) : null

    if (cost !== null && cost < 0) {
      setError('El valor de la reparación no puede ser negativo.')
      return
    }
    if (dep !== null && dep < 0) {
      setError('El abono recibido no puede ser negativo.')
      return
    }
    if (cost !== null && dep !== null && dep > cost) {
      setError('El abono no puede ser mayor al valor total de la reparación.')
      return
    }

    setSaving(true)
    setError('')
    try {
      // 1. Update repair
      await updateRepair(id, {
        device_type:        formData.device_type,
        brand:              formData.brand,
        model:              formData.model,
        reported_issue:     formData.reported_issue,
        device_password:    lockType === 'none' ? null : (formData.device_password || null),
        repair_cost:        cost,
        deposit:            dep,
        deposit_payment_method: formData.deposit_payment_method || null,
        final_payment_method:   formData.final_payment_method || null,
        estimated_delivery: formData.estimated_delivery || null,
        accessories:        formData.accessories || null,
      })

      // 2. Update client details
      if (repair.client_id) {
        await api.patch(`/clients/${repair.client_id}`, {
          name: formData.client_name,
          phone: formData.client_phone,
          email: formData.client_email || null,
          city: formData.client_city || null,
        })
      }

      await fetchRepair()
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      setError(parseError(err, 'Error al guardar los cambios.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la orden de reparación ${repair.order_number}? Esta acción no se puede deshacer y eliminará todo su historial.`)) {
      try {
        await deleteRepair(id)
        navigate(isBravo ? '/bravo' : '/repairs')
      } catch (err) {
        setError(parseError(err, 'Error al eliminar la reparación.'))
      }
    }
  }

  // ── Loading ──
  const selectedSystem = 'nova'
  const isBravo = false

  if (loading) {
    if (isBravo) {
      return (
        <>
          <div className="min-h-[55vh] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-bravo-accent/30 border-t-bravo-accent rounded-full animate-spin" />
          </div>
        </>
      )
    }
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!repair) return null

  const config  = isBravo ? STATUS_CONFIG_BRAVO : STATUS_CONFIG_NOVA
  const cfg     = config[repair.status] ?? config.recibido
  const balance = repair.repair_cost && repair.deposit
    ? repair.repair_cost - repair.deposit
    : null

  const content = (
    <div className="space-y-6 text-left relative">
      {isBravo && <BravoBackground />}

      {/* Glow ambient blobs */}
      {isBravo ? (
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none -z-10" />
      ) : (
        <>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
        </>
      )}

      {/* Error alert box */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-xs text-left flex items-start gap-2.5 shadow-md relative z-10"
        >
          <X 
            size={14} 
            className="shrink-0 mt-0.5 cursor-pointer text-red-400 hover:text-red-300" 
            onClick={() => setError('')} 
          />
          <div className="flex-1 font-medium">{error}</div>
        </motion.div>
      )}

      {/* ── Navbar/Header ── */}
      <div className={`relative z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border rounded-2xl ${
        isBravo ? 'bg-bravo-card border-bravo-border shadow-xs' : 'bg-gray-900/10 backdrop-blur-md border-gray-850'
      }`}>
        <div className="flex items-center gap-3">
          <button
            className={`w-9 h-9 border rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
              isBravo 
                ? 'border-bravo-border bg-white/50 text-bravo-text-muted hover:text-bravo-text hover:border-stone-300 shadow-xs' 
                : 'border-gray-850 bg-gray-950/40 text-gray-400 hover:text-white hover:border-gray-700 shadow-md'
            }`}
            onClick={() => navigate(isBravo ? '/bravo' : '/repairs')}
            aria-label="Volver"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className={`text-base font-black font-mono tracking-wider flex items-center gap-2 ${
              isBravo ? 'text-amber-650' : 'text-cyan-400'
            }`}>
              {repair.order_number}
              {repair.status === 'critico' && (
                <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold ${
                  isBravo ? 'bg-red-50 border-red-200 text-red-750' : 'bg-rose-500/20 border-rose-500/30 text-rose-450 animate-pulse'
                }`}>
                  ⚠️ CRÍTICO
                </span>
              )}
            </div>
            <div className={`text-[10px] mt-0.5 ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>
              Ingresado el {new Date(repair.created_at).toLocaleDateString('es-CL', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <StatusBadge status={repair.status} />

          <div className="scale-95 origin-right">
            <WhatsAppButton client={client || repair.client} repair={repair} />
          </div>

          <motion.button
            className={
              isBravo
                ? "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-bravo-border hover:border-stone-300 hover:text-bravo-text text-bravo-text-muted cursor-pointer transition-all shadow-xs"
                : "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.05)]"
            }
            onClick={() => generateRepairPDF(repair, client)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            <Download size={13} />
            <span>PDF</span>
          </motion.button>

          <motion.button
            className={
              isBravo
                ? "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-bravo-border hover:border-stone-300 hover:text-bravo-text text-bravo-text-muted cursor-pointer transition-all shadow-xs"
                : "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.05)]"
            }
            onClick={() => printRepairSticker(repair, client, isBravo)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            title="Imprimir etiqueta autoadhesiva para el equipo"
          >
            <Printer size={13} />
            <span>Sticker</span>
          </motion.button>

          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <button
                className={
                  isBravo
                    ? "w-8.5 h-8.5 rounded-xl border border-bravo-border hover:border-stone-300 bg-white text-bravo-text-muted hover:text-bravo-text flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                    : "w-8.5 h-8.5 rounded-xl border border-gray-850 hover:border-gray-755 bg-gray-900/40 text-gray-450 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
                }
                onClick={() => {
                  setError('')
                  setIsEditing(false)
                  fetchRepair()
                }}
                aria-label="Cancelar edición"
              >
                <X size={14} />
              </button>
              <button
                className={
                  isBravo
                    ? "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black cursor-pointer transition-all hover:opacity-95 shadow-sm shadow-amber-500/10 disabled:opacity-50"
                    : "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-650 text-white cursor-pointer transition-all hover:opacity-95 shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"
                }
                style={isBravo ? { background: 'linear-gradient(135deg, #fbbf24, #f97316)' } : {}}
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={13} />
                <span>{saving ? 'Guardando…' : 'Guardar'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                className={
                  isBravo
                    ? "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-stone-300 cursor-pointer transition-all active:scale-97 shadow-xs"
                    : "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900/60 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800/60 cursor-pointer transition-all active:scale-97"
                }
                onClick={() => {
                  setError('')
                  setIsEditing(true)
                }}
              >
                <Edit2 size={12} />
                <span>Editar</span>
              </button>
              <button
                className={
                  isBravo
                    ? "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-red-200 text-red-650 hover:border-red-300 cursor-pointer transition-all active:scale-97 shadow-xs"
                    : "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-955/10 border border-red-950/40 text-red-400 hover:text-white hover:bg-red-900/40 cursor-pointer transition-all active:scale-97"
                }
                onClick={handleDelete}
              >
                <Trash2 size={12} />
                <span>Eliminar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

         {/* Cliente */}
        <InfoCard title="Cliente" icon={User} iconColor={isBravo ? "#d97706" : "#a78bfa"} delay={0.05}>
          {isEditing ? (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-1 text-left">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>Nombre del Cliente</label>
                <input
                  value={formData.client_name}
                  onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                  className={isBravo
                    ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all"
                    : "w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition-all"}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>Teléfono</label>
                <input
                  value={formData.client_phone}
                  onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
                  className={isBravo
                    ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all"
                    : "w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition-all"}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>Email</label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={e => setFormData({ ...formData, client_email: e.target.value })}
                  className={isBravo
                    ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all"
                    : "w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition-all"}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>Ciudad</label>
                <input
                  value={formData.client_city}
                  onChange={e => setFormData({ ...formData, client_city: e.target.value })}
                  className={isBravo
                    ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all"
                    : "w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition-all"}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3.5 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isBravo ? 'bg-bravo-accent/12 border border-bravo-accent/25' : 'bg-purple-500/10 border border-purple-500/20'
                }`}>
                  <User size={16} className={isBravo ? "text-amber-650" : "text-purple-400"} />
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-bold truncate ${isBravo ? 'text-bravo-text' : 'text-gray-200'}`}>{repair.client?.name || 'Cliente desconocido'}</div>
                  <div className={`text-[10px] truncate mt-0.5 ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>RUT: {repair.client?.rut || 'No registrado'}</div>
                </div>
              </div>
              <InfoRow label="Teléfono" value={repair.client?.phone || '—'} />
              <InfoRow label="Email"    value={repair.client?.email || '—'} />
              <InfoRow label="Ciudad"   value={repair.client?.city  || '—'} />
            </>
          )}
        </InfoCard>

        {/* Dispositivo */}
        <InfoCard title="Dispositivo" icon={Wrench} iconColor={isBravo ? "#ea580c" : "#38bdf8"} delay={0.1}>
          <div className="flex items-center gap-3.5 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isBravo ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-cyan-500/10 border border-cyan-500/20'
            }`}>
              <Wrench size={16} className={isBravo ? "text-orange-655" : "text-cyan-400"} />
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Marca"
                    className={isBravo
                      ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-2.5 py-1.5 text-xs text-bravo-text focus:outline-none transition-all"
                      : "w-full bg-gray-950 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all"}
                  />
                  <input
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Modelo"
                    className={isBravo
                      ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-2.5 py-1.5 text-xs text-bravo-text focus:outline-none transition-all"
                      : "w-full bg-gray-950 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none transition-all"}
                  />
                </div>
              ) : (
                <div className={`text-sm font-bold truncate ${isBravo ? 'text-bravo-text' : 'text-gray-200'}`}>{repair.brand} {repair.model}</div>
              )}
              {isEditing ? (
                <select
                  value={formData.device_type}
                  onChange={e => setFormData({ ...formData, device_type: e.target.value })}
                  className={isBravo
                    ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-2.5 py-1.5 text-[10px] text-bravo-text focus:outline-none cursor-pointer mt-2"
                    : "w-full bg-gray-950 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-2.5 py-1.5 text-[10px] text-gray-400 focus:outline-none cursor-pointer mt-2"}
                >
                  {['phone','laptop','tablet','console','desktop','other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isBravo ? 'text-orange-600' : 'text-cyan-450/80'}`}>{repair.device_type}</div>
              )}
            </div>
          </div>
          <InfoRow label="Problema"   value={repair.reported_issue} isEditing={isEditing} editKey="reported_issue" formData={formData} setFormData={setFormData} multiline />
          <InfoRow label="Accesorios" value={repair.accessories}    isEditing={isEditing} editKey="accessories"     formData={formData} setFormData={setFormData} />
          
          {isEditing ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>
                  Tipo de Bloqueo del Dispositivo
                </label>
                <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isBravo ? 'bg-white/60 border border-bravo-border' : 'bg-gray-950/60 border border-gray-800'}`}>
                  {[
                    { key: 'none', label: 'Sin Clave' },
                    { key: 'password', label: 'Contraseña' },
                    { key: 'pattern', label: 'Patrón' }
                  ].map((item) => {
                    const active = lockType === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setLockType(item.key)
                          setFormData(prev => ({ ...prev, device_password: '' }))
                        }}
                        className={`py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                          active
                            ? isBravo
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700'
                              : 'bg-cyan-500/10 border border-cyan-500/35 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.1)]'
                            : 'bg-transparent border border-transparent text-gray-500 hover:text-gray-450'
                        }`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {lockType === 'password' && (
                  <motion.div
                    key="edit-lock-password"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>
                      Contraseña / PIN del equipo
                    </label>
                    <input
                      value={formData.device_password || ''}
                      onChange={e => setFormData({ ...formData, device_password: e.target.value })}
                      placeholder="Ingresa la contraseña o PIN..."
                      className={isBravo
                        ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all"
                        : "w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition-all"}
                    />
                  </motion.div>
                )}

                {lockType === 'pattern' && (
                  <motion.div
                    key="edit-lock-pattern"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>
                      Patrón del dispositivo
                    </label>
                    <PatternLock
                      value={formData.device_password || ''}
                      onChange={(val) => setFormData(prev => ({ ...prev, device_password: val }))}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className={`flex flex-col gap-2 py-2.5 border-t mt-2 ${isBravo ? 'border-bravo-border/60' : 'border-gray-900/30'}`}>
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-medium ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>Tipo de Bloqueo</span>
                <span className={`text-xs font-bold text-right ${isBravo ? 'text-bravo-text' : 'text-gray-250'}`}>
                  {!repair.device_password 
                    ? 'Sin Clave' 
                    : repair.device_password.startsWith('Patrón: ') 
                      ? 'Patrón' 
                      : 'Contraseña'
                  }
                </span>
              </div>
              
              {repair.device_password && (
                <div className="flex items-start justify-between w-full mt-1.5">
                  <span className={`text-xs pt-1 font-medium ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>Clave / Patrón</span>
                  {repair.device_password.startsWith('Patrón: ') ? (
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-lg">
                        {repair.device_password.replace('Patrón: ', '')}
                      </span>
                      <MiniPatternPreview pattern={repair.device_password} />
                    </div>
                  ) : (
                    <PasswordViewer password={repair.device_password} />
                  )}
                </div>
              )}
            </div>
          )}
        </InfoCard>

        {/* Fechas y costos */}
        <InfoCard title="Fechas y costos" icon={Calendar} iconColor={isBravo ? "#ca8a04" : "#34d399"} delay={0.15}>
          <InfoRow
            label="Fecha ingreso"
            value={new Date(repair.created_at).toLocaleDateString('es-CL')}
          />
          <InfoRow
            label="Entrega estimada"
            value={repair.estimated_delivery
              ? new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })
              : 'No definida'
            }
            accent={repair.estimated_delivery ? (isBravo ? '#ea580c' : '#38bdf8') : undefined}
            isEditing={isEditing} editKey="estimated_delivery"
            formData={formData} setFormData={setFormData} type="date"
          />
          <InfoRow
            label="Valor reparación"
            value={repair.repair_cost
              ? `$${Number(repair.repair_cost).toLocaleString('es-CL')}`
              : 'No definido'
            }
            accent={isBravo ? '#059669' : '#34d399'}
            isEditing={isEditing} editKey="repair_cost"
            formData={formData} setFormData={setFormData} type="number"
          />
          <InfoRow
            label="Abono recibido"
            value={repair.deposit
              ? `$${Number(repair.deposit).toLocaleString('es-CL')}`
              : '—'
            }
            accent={isBravo ? '#d97706' : '#fbbf24'}
            isEditing={isEditing} editKey="deposit"
            formData={formData} setFormData={setFormData} type="number"
          />

          {isEditing ? (
            <div className={`flex items-start justify-between gap-4 py-2.5 border-b ${isBravo ? 'border-bravo-border/60' : 'border-gray-900/30'}`}>
              <span className={`text-xs pt-1 shrink-0 font-medium ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>Método de Abono</span>
              <select
                value={formData.deposit_payment_method}
                onChange={e => setFormData({ ...formData, deposit_payment_method: e.target.value })}
                className={isBravo
                  ? "w-full max-w-[200px] bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none cursor-pointer text-right"
                  : "w-full max-w-[200px] bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer text-right"}
              >
                <option value="">Sin definir / Ninguno</option>
                <option value="efectivo">Efectivo 💵</option>
                <option value="transferencia">Transferencia 🏦</option>
                <option value="tarjeta">Tarjeta 💳</option>
              </select>
            </div>
          ) : (
            repair.deposit_payment_method && (
              <InfoRow
                label="Método de Abono"
                value={repair.deposit_payment_method === 'efectivo' ? 'Efectivo 💵' : repair.deposit_payment_method === 'transferencia' ? 'Transferencia 🏦' : 'Tarjeta 💳'}
              />
            )
          )}

          {isEditing ? (
            <div className={`flex items-start justify-between gap-4 py-2.5 border-b ${isBravo ? 'border-bravo-border/60' : 'border-gray-900/30'} last:border-b-0`}>
              <span className={`text-xs pt-1 shrink-0 font-medium ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>Método de Pago Final</span>
              <select
                value={formData.final_payment_method}
                onChange={e => setFormData({ ...formData, final_payment_method: e.target.value })}
                className={isBravo
                  ? "w-full max-w-[200px] bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none cursor-pointer text-right"
                  : "w-full max-w-[200px] bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer text-right"}
              >
                <option value="">Sin definir / Ninguno</option>
                <option value="efectivo">Efectivo 💵</option>
                <option value="transferencia">Transferencia 🏦</option>
                <option value="tarjeta">Tarjeta 💳</option>
              </select>
            </div>
          ) : (
            repair.final_payment_method && (
              <InfoRow
                label="Método de Pago Final"
                value={repair.final_payment_method === 'efectivo' ? 'Efectivo 💵' : repair.final_payment_method === 'transferencia' ? 'Transferencia 🏦' : 'Tarjeta 💳'}
              />
            )
          )}
          {balance !== null && !isEditing && (
            <div className={`flex justify-between items-center pt-3 mt-1 border-t ${isBravo ? 'border-bravo-border/60' : 'border-gray-900/60'}`}>
              <span className={`text-xs font-medium ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>Saldo pendiente</span>
              <span className="text-xs font-black" style={{ color: balance > 0 ? '#ef4444' : (isBravo ? '#059669' : '#10b981') }}>
                ${Number(balance).toLocaleString('es-CL')}
              </span>
            </div>
          )}
        </InfoCard>

        {/* Estado de la reparación */}
        <InfoCard title="Estado de la reparación" icon={Wrench} iconColor={cfg.dot} delay={0.2}>
          {!showStatusForm ? (
            <div className={`flex items-center gap-3.5 p-3.5 border rounded-xl ${
              isBravo ? 'bg-white/50 border-bravo-border' : 'bg-gray-950/45 border-gray-900/50'
            }`}>
              {/* Pulsing ring indicator */}
              <div className="relative w-2.5 h-2.5 shrink-0">
                <span className="absolute inset-0 rounded-full border border-white/10" style={{ backgroundColor: cfg.dot }} />
                <span className="absolute -inset-1 rounded-full animate-ping opacity-60" style={{ backgroundColor: cfg.dot }} />
              </div>
              <span className="text-xs font-bold" style={{ color: cfg.dot }}>{cfg.label}</span>
              <button
                className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-97 cursor-pointer ${
                  isBravo 
                    ? 'text-bravo-accent bg-bravo-accent/12 border-bravo-accent/25 hover:bg-bravo-accent/18' 
                    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15'
                }`}
                onClick={() => setShowStatusForm(true)}
              >
                Actualizar <ChevronRight size={13} />
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_STATUSES.map(s => {
                  const c = config[s]
                  const selected = selectedStatus === s
                  const current  = s === repair.status
                  return (
                    <button
                      key={s}
                      disabled={current}
                      onClick={() => setSelectedStatus(s)}
                      className={`px-2 py-2.5 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        selected
                          ? isBravo 
                            ? 'scale-102 border-amber-500 text-amber-750 shadow-xs'
                            : 'scale-102 border-cyan-500/40 text-cyan-400 shadow-md'
                          : current
                            ? isBravo
                              ? 'opacity-35 cursor-not-allowed border-stone-200 bg-stone-100 text-stone-450'
                              : 'opacity-30 cursor-not-allowed border-gray-950 bg-gray-950/20 text-gray-655'
                            : isBravo
                              ? 'border-bravo-border bg-white/40 text-bravo-text-muted hover:border-stone-300 hover:text-bravo-text'
                              : 'border-gray-900 bg-gray-950/40 text-gray-500 hover:border-gray-800 hover:text-gray-300'
                      }`}
                      style={selected ? {
                        backgroundColor: `color-mix(in srgb, ${c.dot} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${c.dot} 40%, transparent)`,
                        color: c.dot,
                        boxShadow: `0 0 10px color-mix(in srgb, ${c.dot} 15%, transparent)`
                      } : {}}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <textarea
                className={isBravo
                  ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none transition-all resize-none placeholder-stone-400"
                  : "w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all resize-none placeholder-gray-700"}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Nota sobre el cambio (opcional)…"
                rows={2}
              />
              <div className={`flex justify-end gap-2 pt-3 border-t ${isBravo ? 'border-bravo-border/60' : 'border-gray-900/60'}`}>
                <button
                  className={isBravo
                    ? "px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-stone-300 cursor-pointer transition-all"
                    : "px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-950/60 border border-gray-850 text-gray-400 hover:text-white cursor-pointer transition-all"}
                  onClick={() => { setShowStatusForm(false); setSelectedStatus(''); setNote('') }}
                >
                  Cancelar
                </button>
                <button
                  className={isBravo
                    ? "px-3.5 py-2 rounded-xl text-xs font-bold text-black cursor-pointer transition-all hover:opacity-95 shadow-sm shadow-amber-500/10 disabled:opacity-50"
                    : "px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-650 text-white cursor-pointer transition-all hover:opacity-95 shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50"}
                  style={isBravo ? { background: 'linear-gradient(135deg, #fbbf24, #f97316)' } : {}}
                  onClick={handleStatusChange}
                  disabled={!selectedStatus || changingStatus}
                >
                  {changingStatus ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          )}
        </InfoCard>
      </div>

      {/* Historial */}
      <InfoCard title="Historial de estados" delay={0.25}>
        {!repair.history?.length ? (
          <p className="text-xs text-gray-650 text-center py-4">Sin historial registrado</p>
        ) : (
          <div className={`relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] text-left ${
            isBravo ? 'before:bg-bravo-border' : 'before:bg-gray-900/60'
          }`}>
            {[...repair.history].reverse().map((h, i) => {
              const hCfg = config[h.new_status]
              const from = config[h.previous_status]
              return (
                <motion.div
                  key={h.id}
                  className="relative text-left"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                >
                  {/* Timeline dot */}
                  <span
                    className={`absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full border ${isBravo ? 'border-white' : 'border-gray-955'}`}
                    style={{
                      backgroundColor: hCfg?.dot || '#64748b',
                      boxShadow: isBravo ? undefined : `0 0 8px ${hCfg?.dot || '#64748b'}`
                    }}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {from && (
                        <>
                          <span className={`text-[10px] font-medium ${isBravo ? 'text-bravo-text-muted' : 'text-gray-550'}`}>{from.label}</span>
                          <span className={`text-[9px] ${isBravo ? 'text-stone-350' : 'text-gray-600'}`}>→</span>
                        </>
                      )}
                      <span className="text-[11px] font-bold" style={{ color: hCfg?.dot }}>{hCfg?.label}</span>
                    </div>
                    <span className={`text-[9px] font-mono ${isBravo ? 'text-bravo-text-muted' : 'text-gray-500'}`}>
                      {new Date(h.changed_at).toLocaleDateString('es-CL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {h.note && (
                    <p className={`text-xs mt-2 p-3 rounded-xl border leading-relaxed font-sans ${
                      isBravo ? 'text-bravo-text bg-white/40 border-bravo-border' : 'text-gray-450 bg-gray-955/30 border-gray-900/50'
                    }`}>
                      {h.note}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </InfoCard>

      {/* Modal de Alerta Crítica Premium */}
      <AnimatePresence>
        {criticalAlertData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className={isBravo 
                ? "w-full max-w-md bg-white border-2 border-red-500 rounded-2xl p-6 shadow-xl relative overflow-hidden text-center" 
                : "w-full max-w-md bg-[#0c0507] border-2 border-rose-500/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.35)] relative overflow-hidden text-center"
              }
            >
              {/* Borde neón superior */}
              <div className={isBravo 
                ? "absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-amber-500 to-red-500" 
                : "absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 animate-pulse"
              } />

              {/* Fuego ambient loop */}
              <div className={isBravo 
                ? "absolute -right-12 -bottom-12 opacity-5 pointer-events-none text-red-500" 
                : "absolute -right-12 -bottom-12 opacity-5 pointer-events-none text-rose-500 animate-pulse"
              }>
                <Flame size={150} />
              </div>

              {/* Icono de Alerta */}
              <div className={isBravo 
                ? "inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-655 border border-red-200 mb-4" 
                : "inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/25 mb-4 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              }>
                <Flame size={24} className="animate-bounce" />
              </div>

              <h3 className={isBravo 
                ? "text-lg font-black tracking-widest text-red-750 uppercase mb-2" 
                : "text-lg font-black tracking-widest text-rose-350 uppercase mb-2"
              }>
                ¡Prioridad Crítica Detectada!
              </h3>

              <div className={isBravo 
                ? "text-xs text-stone-600 leading-relaxed space-y-4 mb-6 text-center" 
                : "text-xs text-rose-200/85 leading-relaxed space-y-4 mb-6 text-center"
              }>
                <p>
                  El equipo técnico bajo la orden <strong className={isBravo ? "text-stone-855 font-mono text-sm" : "text-white font-mono text-sm"}>{criticalAlertData.orderNumber}</strong> ha sido clasificado como <strong>CRÍTICO</strong>.
                </p>
                
                {/* Caja de cliente recurrente */}
                <div className={isBravo 
                  ? "bg-red-50 border border-red-200 rounded-xl p-4 text-left" 
                  : "bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 text-left"
                }>
                  <p className={isBravo 
                    ? "text-[9px] font-black tracking-widest text-red-600 uppercase" 
                    : "text-[9px] font-black tracking-widest text-rose-400 uppercase"
                  }>
                    ⚠️ ALERTA DE CLIENTE RECURRENTE:
                  </p>
                  <p className={isBravo 
                    ? "text-stone-900 text-sm font-extrabold mt-1" 
                    : "text-white text-sm font-extrabold mt-1"
                  }>
                    {criticalAlertData.clientName}
                  </p>
                  <p className={isBravo 
                    ? "text-stone-600 text-[11px] mt-1.5" 
                    : "text-gray-400 text-[11px] mt-1.5"
                  }>
                    Este cliente ya registra <strong className={isBravo ? "text-red-700 font-bold" : "text-rose-400 font-bold"}>{criticalAlertData.count}</strong> visitas en el sistema técnico. Requiere atención preferencial.
                  </p>
                </div>
              </div>

              {/* Botón de Confirmación */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCriticalAlertData(null)}
                  className={isBravo 
                    ? "bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl shadow-md cursor-pointer transition-all border-none" 
                    : "bg-rose-500 hover:bg-rose-400 text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] cursor-pointer transition-all border-none"
                  }
                >
                  Entendido y Priorizado
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={isBravo 
                ? "bg-stone-50 border border-bravo-border rounded-2xl max-w-md w-full p-6 shadow-xl text-stone-800 space-y-5" 
                : "bg-[#0e111a]/95 border border-gray-900 rounded-2xl max-w-md w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-white space-y-5"
              }
            >
              {/* Header */}
              <div>
                <h3 className={isBravo ? "text-lg font-black text-amber-700" : "text-lg font-black text-cyan-400"}>
                  Registrar Entrega y Pago
                </h3>
                <p className={isBravo ? "text-xs text-stone-500 mt-1" : "text-xs text-gray-500 mt-1"}>
                  Por favor, ingresa los detalles del cobro final para registrar la transacción.
                </p>
              </div>

              {/* Resumen de Costos */}
              <div className={isBravo ? "bg-stone-100 p-4 rounded-xl space-y-2 text-xs" : "bg-gray-950/50 p-4 rounded-xl space-y-2 text-xs border border-gray-900"}>
                <div className="flex justify-between">
                  <span className={isBravo ? "text-stone-500" : "text-gray-400"}>Costo Total:</span>
                  <span className="font-bold">${parseFloat(repair?.repair_cost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isBravo ? "text-stone-500" : "text-gray-400"}>Abono recibido:</span>
                  <span className="font-bold text-green-500">${parseFloat(repair?.deposit || 0).toLocaleString()}</span>
                </div>
                <div className={`border-t pt-2 flex justify-between font-extrabold ${isBravo ? 'border-stone-200' : 'border-gray-900'}`}>
                  <span>Monto sugerido a pagar:</span>
                  <span className={isBravo ? "text-amber-700" : "text-cyan-400"}>
                    ${Math.max(0, parseFloat(repair?.repair_cost || 0) - parseFloat(repair?.deposit || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold uppercase tracking-wider opacity-85">Monto Pagado ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className={isBravo
                      ? "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3.5 py-2.5 text-xs text-bravo-text focus:outline-none transition-all"
                      : "w-full bg-gray-950/80 border border-gray-850 hover:border-gray-700/80 focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all"
                    }
                    placeholder="Monto cobrado"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold uppercase tracking-wider opacity-85">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={isBravo
                      ? "w-full bg-bravo-input border border-bravo-border focus:border-bravo-accent rounded-xl px-3.5 py-2.5 text-xs text-bravo-text focus:outline-none transition-all"
                      : "w-full bg-gray-950/80 border border-gray-850 focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all"
                    }
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="tarjeta_debito">Tarjeta de Débito</option>
                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                  </select>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className={isBravo
                    ? "px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-bravo-border text-bravo-text-muted hover:text-bravo-text cursor-pointer transition-all"
                    : "px-4 py-2 rounded-xl text-xs font-semibold bg-gray-950/60 border border-gray-850 text-gray-400 hover:text-white cursor-pointer transition-all"
                  }
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeliverConfirm}
                  disabled={!paymentAmount || changingStatus}
                  className={isBravo
                    ? "px-5 py-2 rounded-xl text-xs font-bold text-black cursor-pointer transition-all hover:opacity-95 shadow-sm shadow-amber-500/10 disabled:opacity-50"
                    : "px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-650 text-white cursor-pointer transition-all hover:opacity-95 shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50"
                  }
                  style={isBravo ? { background: 'linear-gradient(135deg, #fbbf24, #f97316)' } : {}}
                >
                  {changingStatus ? 'Procesando...' : 'Confirmar Entrega'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )

  if (isBravo) {
    return (
      <>
        {content}
      </>
    )
  }

  return (
    <>
      {content}
    </>
  )
}