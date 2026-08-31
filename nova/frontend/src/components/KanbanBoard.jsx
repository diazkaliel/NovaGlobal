import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench, Smartphone, Laptop, Tablet, Gamepad2, Cpu,
  Search, Filter, Calendar, Clock, AlertTriangle, CheckCircle2,
  Zap, User, Phone, ArrowRight, Check, X, FileText,
  Download, Copy, ExternalLink, ShieldCheck, ChevronRight,
  Layers, DollarSign, LayoutGrid, List, Sparkles, MessageCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import WhatsAppButton from './WhatsAppButton'
import { generateRepairPDF } from '../utils/generateRepairPDF'
import api from '../api/client'

// Columnas de flujo de trabajo para NOVA (Servicio Técnico)
const NOVA_COLUMNS = [
  {
    id: 'reception',
    title: '📥 Recepción & Diagnóstico',
    shortTitle: 'Recepción',
    statuses: ['recibido', 'diagnostico', 'pendiente', 'presupuesto_enviado'],
    headerBg: 'from-violet-950/70 via-purple-900/40 to-violet-950/60 border-violet-500/30 text-violet-300',
    dotColor: '#a855f7',
    glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
    accentBorder: 'border-violet-500/40',
    emptyMsg: 'Sin equipos en recepción ni diagnóstico'
  },
  {
    id: 'waiting',
    title: '⏳ Espera de Repuestos',
    shortTitle: 'Espera Repuesto',
    statuses: ['esperando_repuesto'],
    headerBg: 'from-amber-950/70 via-yellow-900/40 to-amber-950/60 border-amber-500/30 text-amber-300',
    dotColor: '#f59e0b',
    glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    accentBorder: 'border-amber-500/40',
    emptyMsg: 'No hay órdenes esperando piezas'
  },
  {
    id: 'in_progress',
    title: '⚡ En Taller / Reparación',
    shortTitle: 'En Reparación',
    statuses: ['en_reparacion'],
    headerBg: 'from-cyan-950/70 via-blue-900/40 to-cyan-950/60 border-cyan-500/30 text-cyan-300',
    dotColor: '#06b6d4',
    glowColor: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    accentBorder: 'border-cyan-500/40',
    emptyMsg: 'Taller libre. Ninguna reparación en curso'
  },
  {
    id: 'ready',
    title: '🚀 Listo para Retiro',
    shortTitle: 'Listo',
    statuses: ['listo', 'en_garantia'],
    headerBg: 'from-emerald-950/70 via-teal-900/40 to-emerald-950/60 border-emerald-500/30 text-emerald-300',
    dotColor: '#10b981',
    glowColor: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    accentBorder: 'border-emerald-500/40',
    emptyMsg: 'No hay equipos listos pendientes de entrega'
  }
]

// Columnas de flujo de trabajo para BRAVO (Personalizaciones)
const BRAVO_COLUMNS = [
  {
    id: 'design',
    title: '🎨 Diseño & Muestras',
    shortTitle: 'Diseño',
    statuses: ['recibido', 'diagnostico', 'pendiente', 'presupuesto_enviado'],
    headerBg: 'from-violet-950/70 via-purple-900/40 to-violet-950/60 border-violet-500/30 text-violet-300',
    dotColor: '#a855f7',
    glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
    accentBorder: 'border-violet-500/40',
    emptyMsg: 'Sin bocetos ni diseños pendientes'
  },
  {
    id: 'waiting',
    title: '📦 Espera de Insumos',
    shortTitle: 'Espera Materiales',
    statuses: ['esperando_repuesto'],
    headerBg: 'from-amber-950/70 via-yellow-900/40 to-amber-950/60 border-amber-500/30 text-amber-300',
    dotColor: '#f59e0b',
    glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    accentBorder: 'border-amber-500/40',
    emptyMsg: 'Insumos al día. Nada en espera'
  },
  {
    id: 'production',
    title: '⚡ En Estampado / Taller',
    shortTitle: 'Producción',
    statuses: ['en_reparacion'],
    headerBg: 'from-cyan-950/70 via-blue-900/40 to-cyan-950/60 border-cyan-500/30 text-cyan-300',
    dotColor: '#06b6d4',
    glowColor: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    accentBorder: 'border-cyan-500/40',
    emptyMsg: 'Mesa de trabajo libre'
  },
  {
    id: 'ready',
    title: '🚀 Listo para Despacho',
    shortTitle: 'Listo',
    statuses: ['listo', 'en_garantia'],
    headerBg: 'from-emerald-950/70 via-teal-900/40 to-emerald-950/60 border-emerald-500/30 text-emerald-300',
    dotColor: '#10b981',
    glowColor: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    accentBorder: 'border-emerald-500/40',
    emptyMsg: 'Sin pedidos listos para despachar'
  }
]

// Icono según tipo de dispositivo
function getDeviceIcon(deviceType) {
  const dt = (deviceType || '').toLowerCase()
  if (dt.includes('laptop') || dt.includes('notebook') || dt.includes('computador') || dt.includes('macbook')) {
    return Laptop
  }
  if (dt.includes('tablet') || dt.includes('ipad')) {
    return Tablet
  }
  if (dt.includes('consola') || dt.includes('playstation') || dt.includes('nintendo') || dt.includes('xbox')) {
    return Gamepad2
  }
  if (dt.includes('pc') || dt.includes('escritorio') || dt.includes('torre')) {
    return Cpu
  }
  return Smartphone
}

export default function KanbanBoard({
  orders = [],
  onStatusChange,
  onRefresh,
  system = 'nova',
  technicians = [],
  loading = false
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('all') // 'all', 'overdue', 'today', 'tomorrow'
  const [techFilter, setTechFilter] = useState('all')
  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'list'
  const [copiedId, setCopiedId] = useState(null)

  // Estado para Modal de Cobro & Entrega
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null)
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState('efectivo')
  const [submittingDelivery, setSubmittingDelivery] = useState(false)

  const columns = system === 'bravo' ? BRAVO_COLUMNS : NOVA_COLUMNS

  // Filtrar solo órdenes activas (excluye entregadas y canceladas del tablero operativo)
  const activeOrders = useMemo(() => {
    return orders.filter(o => !['entregado', 'cancelado'].includes(o.status))
  }, [orders])

  // Calcular métricas de urgencia
  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }, [])

  const tomorrowStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }, [])

  // Filtrado reactivo en memoria
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    return activeOrders.filter(order => {
      // 1. Filtro de búsqueda
      if (q) {
        const orderNum = (order.order_number || '').toLowerCase()
        const clientName = (order.client?.name || '').toLowerCase()
        const clientPhone = (order.client?.phone || '').toLowerCase()
        const brand = (order.brand || '').toLowerCase()
        const model = (order.model || '').toLowerCase()
        const issue = (order.reported_issue || '').toLowerCase()
        const techName = (order.technician?.name || '').toLowerCase()

        const match =
          orderNum.includes(q) ||
          clientName.includes(q) ||
          clientPhone.includes(q) ||
          brand.includes(q) ||
          model.includes(q) ||
          issue.includes(q) ||
          techName.includes(q)

        if (!match) return false
      }

      // 2. Filtro de técnico asignado
      if (techFilter !== 'all') {
        if (techFilter === 'unassigned' && order.technician_id) return false
        if (techFilter !== 'unassigned' && String(order.technician_id) !== String(techFilter)) return false
      }

      // 3. Filtro de urgencia
      if (urgencyFilter === 'overdue') {
        if (!order.estimated_delivery || order.estimated_delivery >= todayStr) return false
      } else if (urgencyFilter === 'today') {
        if (order.estimated_delivery !== todayStr) return false
      } else if (urgencyFilter === 'tomorrow') {
        if (order.estimated_delivery !== tomorrowStr) return false
      }

      return true
    })
  }, [activeOrders, search, techFilter, urgencyFilter, todayStr, tomorrowStr])

  // Conteo de métricas rápidas
  const countOverdue = useMemo(() => {
    return activeOrders.filter(o => o.estimated_delivery && o.estimated_delivery < todayStr).length
  }, [activeOrders, todayStr])

  const countToday = useMemo(() => {
    return activeOrders.filter(o => o.estimated_delivery === todayStr).length
  }, [activeOrders, todayStr])

  const countReady = useMemo(() => {
    return activeOrders.filter(o => ['listo', 'en_garantia'].includes(o.status)).length
  }, [activeOrders])

  // Copiar número de orden al portapapeles
  const handleCopyOrderNumber = (e, orderNumber, id) => {
    e.stopPropagation()
    navigator.clipboard.writeText(orderNumber)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Avanzar estado al siguiente paso del flujo
  const handleAdvanceStatus = async (e, order) => {
    e.stopPropagation()
    let nextStatus = ''

    if (['recibido', 'diagnostico', 'pendiente', 'presupuesto_enviado'].includes(order.status)) {
      nextStatus = 'en_reparacion'
    } else if (order.status === 'esperando_repuesto') {
      nextStatus = 'en_reparacion'
    } else if (order.status === 'en_reparacion') {
      nextStatus = 'listo'
    } else if (['listo', 'en_garantia'].includes(order.status)) {
      const total = Number(order.repair_cost || 0)
      const deposit = Number(order.deposit || 0)
      const balance = total - deposit

      if (balance > 0) {
        // Si hay saldo pendiente, abrir modal de liquidación y cobro
        setDeliveryModalOrder(order)
        return
      } else {
        nextStatus = 'entregado'
      }
    }

    if (nextStatus && onStatusChange) {
      await onStatusChange(order, nextStatus)
    }
  }

  // Confirmar entrega con pago desde el modal
  const handleConfirmDeliveryWithPayment = async () => {
    if (!deliveryModalOrder || !onStatusChange) return
    setSubmittingDelivery(true)
    try {
      const total = Number(deliveryModalOrder.repair_cost || 0)
      const deposit = Number(deliveryModalOrder.deposit || 0)
      const balance = Math.max(0, total - deposit)

      await onStatusChange(deliveryModalOrder, 'entregado', {
        payment_amount: balance,
        payment_method: deliveryPaymentMethod,
        note: `Entrega completada. Saldo liquidado vía ${deliveryPaymentMethod}`
      })
      setDeliveryModalOrder(null)
    } catch (err) {
      console.error('Error al confirmar entrega:', err)
    } finally {
      setSubmittingDelivery(false)
    }
  }

  // Descargar PDF Comprobante
  const handleDownloadPDF = (e, order) => {
    e.stopPropagation()
    try {
      generateRepairPDF(order, order.client)
    } catch (err) {
      console.error('Error al generar PDF:', err)
    }
  }

  // Obtener texto del botón de avance según estado
  const getAdvanceLabel = (status) => {
    if (['recibido', 'diagnostico', 'pendiente', 'presupuesto_enviado'].includes(status)) {
      return '⚡ Iniciar Taller'
    }
    if (status === 'esperando_repuesto') {
      return '⚡ Reanudar'
    }
    if (status === 'en_reparacion') {
      return '✓ Marcar Listo'
    }
    if (['listo', 'en_garantia'].includes(status)) {
      return '🚀 Entregar'
    }
    return 'Avanzar'
  }

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* ─── BARRA DE CONTROL, BÚSQUEDA Y FILTROS ─── */}
      <div className="bg-[#0b0d14]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Input de Búsqueda */}
        <div className="relative flex-1 max-w-lg">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por orden (#ORD-001), cliente, celular, marca, modelo o falla..."
            className="w-full bg-zinc-950/80 border border-zinc-800/90 hover:border-cyan-500/40 focus:border-cyan-400 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all shadow-inner font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Pills de Filtrado Rápido */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Todas */}
          <button
            onClick={() => setUrgencyFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              urgencyFilter === 'all'
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            Todas ({activeOrders.length})
          </button>

          {/* Vencidas */}
          <button
            onClick={() => setUrgencyFilter(urgencyFilter === 'overdue' ? 'all' : 'overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              urgencyFilter === 'overdue'
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)] animate-pulse'
                : countOverdue > 0
                ? 'bg-rose-950/30 border-rose-800/40 text-rose-400 hover:border-rose-600'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <AlertTriangle size={13} className={countOverdue > 0 ? 'text-rose-400' : ''} />
            Vencidas {countOverdue > 0 && <span className="bg-rose-500 text-black px-1.5 py-0.2 rounded-full text-[10px] font-black">{countOverdue}</span>}
          </button>

          {/* Hoy */}
          <button
            onClick={() => setUrgencyFilter(urgencyFilter === 'today' ? 'all' : 'today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              urgencyFilter === 'today'
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap size={13} className={countToday > 0 ? 'text-amber-400' : ''} />
            Para Hoy {countToday > 0 && <span className="bg-amber-500 text-black px-1.5 py-0.2 rounded-full text-[10px] font-black">{countToday}</span>}
          </button>

          {/* Listas */}
          <button
            onClick={() => setUrgencyFilter(urgencyFilter === 'ready' ? 'all' : 'ready')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              urgencyFilter === 'ready'
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 size={13} className={countReady > 0 ? 'text-emerald-400' : ''} />
            Listas {countReady > 0 && <span className="bg-emerald-500 text-black px-1.5 py-0.2 rounded-full text-[10px] font-black">{countReady}</span>}
          </button>

          {/* Switch de Vistas (Kanban vs Lista) */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 ml-auto">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Vista Tablero Kanban"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Vista Lista Compacta"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── CONTENEDOR PRINCIPAL DEL KANBAN O LISTA ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-4 h-96 animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        /* ════════════════════════ VISTA TABLERO KANBAN ════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {columns.map(col => {
            const colOrders = filteredOrders.filter(o => col.statuses.includes(o.status))
            const pct = activeOrders.length > 0 ? Math.round((colOrders.length / activeOrders.length) * 100) : 0

            return (
              <div
                key={col.id}
                className={`bg-[#0a0c13]/90 border border-zinc-800/90 rounded-3xl p-3.5 flex flex-col min-h-[560px] shadow-2xl backdrop-blur-xl relative overflow-hidden group/col`}
              >
                {/* Encabezado de Columna Neón */}
                <div className={`p-3 rounded-2xl border text-xs font-black mb-3 flex items-center justify-between shadow-lg bg-gradient-to-r ${col.headerBg} ${col.glowColor}`}>
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: col.dotColor, boxShadow: `0 0 10px ${col.dotColor}` }}
                    />
                    <span className="truncate tracking-wide">{col.title}</span>
                  </div>
                  <span className="bg-black/60 border border-white/10 px-2.5 py-0.5 rounded-full text-xs font-mono font-black text-white shrink-0 shadow-inner">
                    {colOrders.length}
                  </span>
                </div>

                {/* Micro barra de proporción de órdenes */}
                <div className="w-full h-1 bg-zinc-950 rounded-full mb-3 overflow-hidden border border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: col.dotColor }}
                  />
                </div>

                {/* Lista de Tarjetas de Órdenes */}
                <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[640px] pr-1 custom-scroll">
                  <AnimatePresence initial={false}>
                    {colOrders.length === 0 ? (
                      <div className="h-44 border border-dashed border-zinc-800/80 rounded-2xl flex flex-col items-center justify-center text-center p-5 my-auto select-none">
                        <Layers size={22} className="text-zinc-700 mb-2 stroke-[1.5]" />
                        <p className="text-[11px] text-zinc-500 font-semibold max-w-[180px] leading-relaxed">
                          {col.emptyMsg}
                        </p>
                      </div>
                    ) : (
                      colOrders.map(order => {
                        const total = Number(order.repair_cost || 0)
                        const deposit = Number(order.deposit || 0)
                        const balance = Math.max(0, total - deposit)
                        const fullyPaid = total > 0 && balance === 0
                        const DeviceIconComponent = getDeviceIcon(order.device_type)

                        // Cálculo de Urgencia / Semáforo de Entrega
                        let isOverdue = false
                        let isDueToday = false
                        let isDueTomorrow = false
                        let daysDiff = null

                        if (order.estimated_delivery) {
                          const today = new Date().setHours(0, 0, 0, 0)
                          const delDate = new Date(order.estimated_delivery + 'T00:00:00').getTime()
                          daysDiff = Math.ceil((delDate - today) / (1000 * 60 * 60 * 24))

                          if (daysDiff < 0) isOverdue = true
                          else if (daysDiff === 0) isDueToday = true
                          else if (daysDiff === 1) isDueTomorrow = true
                        }

                        return (
                          <motion.div
                            key={order.id}
                            layout
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.94 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => navigate(system === 'bravo' ? `/bravo/orders/${order.id || order.order_number}` : `/repairs/${order.id}`)}
                            className={`bg-[#0d101a] border rounded-2xl p-3.5 space-y-3 shadow-lg transition-all duration-200 cursor-pointer group/card relative overflow-hidden ${
                              isOverdue
                                ? 'border-rose-500/50 hover:border-rose-400 shadow-rose-950/20 bg-rose-950/10'
                                : isDueToday
                                ? 'border-amber-500/40 hover:border-amber-400 bg-amber-950/10'
                                : 'border-zinc-800/90 hover:border-cyan-500/50 hover:bg-[#101422]'
                            } hover:shadow-2xl hover:-translate-y-0.5`}
                          >
                            {/* Borde sutil superior en hover */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />

                            {/* ─── FILA 1: NÚMERO DE ORDEN + BADGES DE URGENCIA ─── */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-extrabold text-cyan-300 tracking-wide bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg shadow-inner">
                                  {order.order_number}
                                </span>
                                <button
                                  onClick={(e) => handleCopyOrderNumber(e, order.order_number, order.id)}
                                  className="text-zinc-500 hover:text-cyan-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
                                  title="Copiar N° de Orden"
                                >
                                  {copiedId === order.id ? (
                                    <Check size={12} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>

                              {/* Badges de Semáforo / Fecha */}
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                  <AlertTriangle size={10} />
                                  Vencido {Math.abs(daysDiff)}d
                                </span>
                              ) : isDueToday ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Zap size={10} />
                                  Entrega Hoy
                                </span>
                              ) : isDueTomorrow ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                  <Clock size={10} />
                                  Mañana
                                </span>
                              ) : order.estimated_delivery ? (
                                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                  <Calendar size={10} />
                                  {order.estimated_delivery}
                                </span>
                              ) : null}
                            </div>

                            {/* ─── FILA 2: DISPOSITIVO / PRODUCTO & MARCA ─── */}
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-cyan-400 group-hover/card:border-cyan-500/40 group-hover/card:scale-105 transition-all">
                                <DeviceIconComponent size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-zinc-100 truncate group-hover/card:text-cyan-200 transition-colors">
                                  {order.brand} {order.model}
                                </h4>
                                <p className="text-[10px] text-zinc-400 truncate capitalize font-mono">
                                  {order.device_type}
                                </p>
                              </div>
                            </div>

                            {/* ─── FILA 3: FALLA / DETALLE DEL TRABAJO ─── */}
                            {order.reported_issue && (
                              <div className="bg-black/40 border border-white/5 rounded-xl p-2 text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                                <span className="text-zinc-500 font-semibold mr-1">Falla:</span>
                                {order.reported_issue}
                              </div>
                            )}

                            {/* ─── FILA 4: CLIENTE + BOTÓN WHATSAPP DIRECTO ─── */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                              <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] truncate">
                                <User size={12} className="text-zinc-500 shrink-0" />
                                <span className="font-semibold truncate">
                                  {order.client?.name || 'Cliente sin registrar'}
                                </span>
                              </div>

                              {/* Dropdown de WhatsApp con mensajes predefinidos */}
                              {order.client?.phone && (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <WhatsAppButton
                                    client={order.client}
                                    repair={order}
                                    isBravo={system === 'bravo'}
                                  />
                                </div>
                              )}
                            </div>

                            {/* ─── FILA 5: FINANZAS (COSTO / ABONO / SALDO) ─── */}
                            {total > 0 && (
                              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-zinc-400 font-semibold">Total:</span>
                                  <span className="text-white font-bold">${total.toLocaleString('es-CL')}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-zinc-500">Saldo:</span>
                                  <span
                                    className={`font-black px-1.5 py-0.2 rounded-md ${
                                      fullyPaid
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    }`}
                                  >
                                    {fullyPaid ? '✅ Pagado Total' : `$${balance.toLocaleString('es-CL')} pend.`}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* ─── FILA 6: ACCIONES RÁPIDAS (BOTONES DE ACCIÓN) ─── */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                              {/* Descargar Comprobante PDF */}
                              <button
                                onClick={(e) => handleDownloadPDF(e, order)}
                                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                title="Descargar comprobante de orden en PDF"
                              >
                                <Download size={13} />
                              </button>

                              {/* Botón de Avance Rápido */}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={(e) => handleAdvanceStatus(e, order)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)] hover:shadow-[0_0_16px_rgba(34,211,238,0.4)] transition-all cursor-pointer"
                              >
                                <span>{getAdvanceLabel(order.status)}</span>
                                <ChevronRight size={13} className="stroke-[3]" />
                              </motion.button>
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ════════════════════════ VISTA LISTA COMPACTA ════════════════════════ */
        <div className="bg-[#0b0d14]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Orden</th>
                  <th className="py-3.5 px-4 font-bold">Equipo / Producto</th>
                  <th className="py-3.5 px-4 font-bold">Cliente</th>
                  <th className="py-3.5 px-4 font-bold">Falla / Servicio</th>
                  <th className="py-3.5 px-4 font-bold">Entrega</th>
                  <th className="py-3.5 px-4 font-bold">Total / Saldo</th>
                  <th className="py-3.5 px-4 font-bold">Estado</th>
                  <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-zinc-500 font-semibold">
                      No se encontraron órdenes activas con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const total = Number(order.repair_cost || 0)
                    const deposit = Number(order.deposit || 0)
                    const balance = Math.max(0, total - deposit)
                    const fullyPaid = total > 0 && balance === 0

                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(system === 'bravo' ? `/bravo/orders/${order.id || order.order_number}` : `/repairs/${order.id}`)}
                        className="hover:bg-cyan-500/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                          {order.order_number}
                        </td>
                        <td className="py-3 px-4 text-white font-semibold whitespace-nowrap">
                          {order.brand} {order.model}
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[140px]">{order.client?.name || '—'}</span>
                            {order.client?.phone && (
                              <div onClick={e => e.stopPropagation()}>
                                <WhatsAppButton client={order.client} repair={order} isBravo={system === 'bravo'} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 max-w-[200px] truncate">
                          {order.reported_issue || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                          {order.estimated_delivery || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="text-white font-bold">${total.toLocaleString('es-CL')}</div>
                          <div className={`text-[10px] ${fullyPaid ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                            {fullyPaid ? 'Pagado Total' : `Pend: $${balance.toLocaleString('es-CL')}`}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleDownloadPDF(e, order)}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-400"
                              title="PDF"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              onClick={(e) => handleAdvanceStatus(e, order)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 flex items-center gap-1"
                            >
                              <span>{getAdvanceLabel(order.status)}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL DE ENTREGA & LIQUIDACIÓN DE SALDO ─── */}
      <AnimatePresence>
        {deliveryModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0f111a] border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Confirmar Entrega y Cobro</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">Orden #{deliveryModalOrder.order_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeliveryModalOrder(null)}
                  className="p-1 rounded-xl text-zinc-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Resumen Financiero */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Cliente:</span>
                  <span className="text-white font-bold">{deliveryModalOrder.client?.name || 'Cliente general'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Equipo / Trabajo:</span>
                  <span className="text-white font-bold">{deliveryModalOrder.brand} {deliveryModalOrder.model}</span>
                </div>
                <div className="flex justify-between text-zinc-400 border-t border-zinc-800/60 pt-2">
                  <span>Costo Total:</span>
                  <span className="text-white">${Number(deliveryModalOrder.repair_cost || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Abono Previo:</span>
                  <span className="text-emerald-400">-${Number(deliveryModalOrder.deposit || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-300 border-t border-zinc-800 pt-2">
                  <span>Saldo a Cobrar:</span>
                  <span>
                    ${Math.max(0, Number(deliveryModalOrder.repair_cost || 0) - Number(deliveryModalOrder.deposit || 0)).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              {/* Selector de Método de Pago */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Método de Pago para Liquidación:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'efectivo', label: '💵 Efectivo' },
                    { key: 'transferencia', label: '📱 Transferencia' },
                    { key: 'debito', label: '💳 Tarjeta/Débito' }
                  ].map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setDeliveryPaymentMethod(m.key)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        deliveryPaymentMethod === m.key
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliveryModalOrder(null)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submittingDelivery}
                  onClick={handleConfirmDeliveryWithPayment}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black text-xs font-black shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingDelivery ? 'Procesando...' : '✓ Entregar y Cobrar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
