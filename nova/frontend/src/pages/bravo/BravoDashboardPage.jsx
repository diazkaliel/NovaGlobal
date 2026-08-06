import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Palette, Package, Calendar as CalendarIcon, Clock, ArrowRight, User, 
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, DollarSign, Image as ImageIcon, 
  AlertTriangle, Zap, TrendingUp, Search, Filter, Layers, Check, X, Phone
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus } from '../../api/repairs'
import { getInventoryItems } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import DeliveryCalendar from '../../components/DeliveryCalendar'
import api from '../../api/client'

// Mapeo de columnas Kanban con estética neón profesional
const KANBAN_COLUMNS = [
  {
    id: 'design',
    title: '🎨 Diseño & Muestras',
    shortTitle: 'Diseño',
    statuses: ['diagnostico', 'presupuesto_enviado', 'recibido'],
    headerBg: 'bg-gradient-to-r from-violet-950/60 to-purple-950/40 border-violet-500/30 text-violet-300',
    dotColor: '#a855f7',
    glowColor: 'shadow-purple-500/10'
  },
  {
    id: 'waiting',
    title: '📦 Espera Materiales',
    shortTitle: 'Espera Insumos',
    statuses: ['esperando_repuesto'],
    headerBg: 'bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border-amber-500/30 text-amber-300',
    dotColor: '#f59e0b',
    glowColor: 'shadow-amber-500/10'
  },
  {
    id: 'production',
    title: '⚡ En Producción',
    shortTitle: 'Producción',
    statuses: ['en_reparacion'],
    headerBg: 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border-cyan-500/30 text-cyan-300',
    dotColor: '#06b6d4',
    glowColor: 'shadow-cyan-500/10'
  },
  {
    id: 'ready',
    title: '✅ Listo para Entrega',
    shortTitle: 'Listo',
    statuses: ['listo'],
    headerBg: 'bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border-emerald-500/30 text-emerald-300',
    dotColor: '#10b981',
    glowColor: 'shadow-emerald-500/10'
  }
]

export default function BravoDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [productsCount, setProductsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Filtro de búsqueda y técnica dentro del tablero
  const [kanbanSearch, setKanbanSearch] = useState('')
  const [techniqueFilter, setTechniqueFilter] = useState('all')

  // Estados para Modal de Entrega Rápida
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [delivering, setDelivering] = useState(false)
  const [actionError, setActionError] = useState('')

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const [repairsRes, productsRes] = await Promise.all([
        getRepairs({ system: 'bravo' }),
        getInventoryItems({ system: 'bravo' }),
      ])
      setOrders(repairsRes.data)
      setProductsCount(productsRes.data.length)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtrar órdenes activas (excluye entregado y cancelado)
  const activeOrders = orders.filter(
    (o) => !['entregado', 'cancelado'].includes(o.status)
  )

  // Filtrar órdenes por texto de búsqueda y técnica
  const filteredActiveOrders = activeOrders.filter(o => {
    const matchSearch = 
      o.order_number.toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.client?.name || '').toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.model || '').toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.brand || '').toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.device_type || '').toLowerCase().includes(kanbanSearch.toLowerCase())

    const matchTech = techniqueFilter === 'all' || (o.print_technique || '').toLowerCase() === techniqueFilter.toLowerCase()

    return matchSearch && matchTech
  })

  // Obtener etiqueta del botón de avance rápido según estado actual
  const getNextStageLabel = (orderItem) => {
    if (orderItem.status === 'diagnostico' || orderItem.status === 'presupuesto_enviado' || orderItem.status === 'recibido') {
      return 'Iniciar Producción'
    } else if (orderItem.status === 'esperando_repuesto') {
      return 'Avanzar a Producción'
    } else if (orderItem.status === 'en_reparacion') {
      return 'Marcar Listo'
    } else if (orderItem.status === 'listo') {
      return '✓ Entregar'
    }
    return 'Avanzar'
  }

  // Avanzar estado rápidamente con actualización instantánea optimista
  const handleQuickAdvance = async (orderItem) => {
    setActionError('')
    let nextStatus = ''
    
    if (orderItem.status === 'diagnostico' || orderItem.status === 'presupuesto_enviado' || orderItem.status === 'esperando_repuesto' || orderItem.status === 'recibido') {
      nextStatus = 'en_reparacion'
    } else if (orderItem.status === 'en_reparacion') {
      nextStatus = 'listo'
    } else if (orderItem.status === 'listo') {
      const total = parseFloat(orderItem.repair_cost || 0)
      const deposit = parseFloat(orderItem.deposit || 0)
      if (total - deposit > 0) {
        setDeliveryModalOrder(orderItem)
        return
      } else {
        nextStatus = 'entregado'
      }
    }

    if (!nextStatus) return

    // Actualización optimista instantánea sin pantalla de carga
    const previousOrders = [...orders]
    setOrders(prev => prev.map(o => o.id === orderItem.id ? { ...o, status: nextStatus } : o))

    try {
      await updateRepairStatus(orderItem.id, {
        new_status: nextStatus,
        note: `Estado avanzado rápidamente desde el Tablero Kanban`
      })
      await fetchData(false)
    } catch (err) {
      console.error(err)
      setOrders(previousOrders)
      setActionError('No se pudo actualizar el estado de la orden.')
    }
  }

  // Confirmar entrega en el modal (con cobro de saldo pendiente)
  const handleConfirmDelivery = async () => {
    if (!deliveryModalOrder) return
    setDelivering(true)
    setActionError('')
    
    const targetId = deliveryModalOrder.id
    const previousOrders = [...orders]
    setOrders(prev => prev.map(o => o.id === targetId ? { ...o, status: 'entregado' } : o))
    setDeliveryModalOrder(null)

    try {
      const balance = parseFloat(deliveryModalOrder.repair_cost || 0) - parseFloat(deliveryModalOrder.deposit || 0)
      await updateRepairStatus(targetId, {
        new_status: 'entregado',
        note: `Pedido entregado y saldo pagado en Quillota.`,
        payment_amount: balance,
        payment_method: paymentMethod
      })
      await fetchData(false)
    } catch (err) {
      console.error(err)
      setOrders(previousOrders)
      setActionError('Ocurrió un error al procesar el pago y entrega.')
    } finally {
      setDelivering(false)
    }
  }

  // Calcular órdenes atrasadas
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueOrders = activeOrders.filter(o => {
    if (!o.estimated_delivery) return false
    const del = new Date(o.estimated_delivery + 'T00:00:00')
    return del < today
  })

  const stats = [
    {
      label: 'Proyectos Activos',
      value: activeOrders.length,
      icon: Sparkles,
      color: 'text-bravo-accent',
      bg: 'bg-bravo-card border-bravo-border hover:border-bravo-accent/35 shadow-xs',
      desc: 'En diseño o producción'
    },
    {
      label: 'Productos Base',
      value: productsCount,
      icon: Package,
      color: 'text-bravo-accent-warm',
      bg: 'bg-bravo-card border-bravo-border hover:border-bravo-accent/35 shadow-xs',
      desc: 'Modelos personalizables'
    },
    {
      label: 'Entregados',
      value: orders.filter((o) => o.status === 'entregado').length,
      icon: CalendarIcon,
      color: 'text-bravo-accent',
      bg: 'bg-bravo-card border-bravo-border hover:border-bravo-accent/35 shadow-xs',
      desc: 'Órdenes completadas'
    },
    {
      label: 'Atrasados',
      value: overdueOrders.length,
      icon: AlertTriangle,
      color: overdueOrders.length > 0 ? 'text-rose-400' : 'text-zinc-500',
      bg: overdueOrders.length > 0
        ? 'bg-rose-950/40 border-rose-700/40 hover:border-rose-500/50 shadow-xs'
        : 'bg-bravo-card border-bravo-border hover:border-bravo-accent/35 shadow-xs',
      desc: 'Fecha de entrega vencida'
    },
  ]

  return (
    <>
      <div className="space-y-8 relative pb-16">
        <BravoBackground />

        {/* Efecto de resplandor futurista */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Banner de Bienvenida con accesos directos */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-zinc-900/60 border border-bravo-border p-6 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 text-left backdrop-blur-md"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
            <img 
              src="/logo-bravo.jpg" 
              alt="Logo Bravo" 
              className="w-20 h-20 rounded-2xl object-cover border-2 border-bravo-accent/40 shadow-lg shadow-bravo-glow/10"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=250&auto=format&fit=crop"
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono tracking-widest bg-bravo-accent/15 border border-bravo-accent/30 text-bravo-accent">
                  Taller Quilpué / Quillota
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1 font-mono tracking-tight">
                Personalizaciones Bravo
              </h2>
              <p className="text-bravo-text-muted text-xs mt-1 max-w-xl">
                Centro de comando de estampados, serigrafía, vinilo y sublimación. Gestiona tus pedidos y producción en vivo.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 relative z-10 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={() => navigate('/bravo/orders/new')}
              className="px-5 py-2.5 bg-gradient-to-r from-bravo-accent to-bravo-accent-warm hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-bravo-glow/10"
            >
              Nuevo Pedido
            </button>
            <button
              onClick={() => navigate('/bravo/sales')}
              className="px-4 py-2.5 bg-zinc-800 border border-zinc-700/60 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Caja Chica
            </button>
          </div>
        </motion.div>

        {/* Panel de Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`border p-5 rounded-2xl flex items-center justify-between backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:shadow-bravo-glow/10 ${stat.bg}`}
            >
              <div>
                <p className="text-bravo-text-muted text-[10px] font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-3xl font-black text-white mt-1 font-mono">{stat.value}</p>
                <p className="text-[10px] text-bravo-text-muted mt-1">{stat.desc}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-bravo-border shadow-xs text-bravo-accent">
                <stat.icon size={22} className={stat.color} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABLERO KANBAN DE PROCESOS DE TALLER REDISEÑADO */}
        <div className="space-y-4 text-left relative z-10">
          
          {/* Header del Tablero + Buscador y Filtro por Técnica */}
          <div className="bg-zinc-900/80 border border-bravo-border/60 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h3 className="font-mono font-black text-base tracking-wider text-white uppercase flex items-center gap-2.5">
                  <Palette size={20} className="text-bravo-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  Tablero de Procesos de Taller
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Seguimiento en vivo del flujo de estampado y confección de pedidos.</p>
              </div>

              <button
                onClick={() => navigate('/bravo/orders')}
                className="text-xs font-mono font-bold text-bravo-accent hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
              >
                Ver Todas las Órdenes <ArrowRight size={14} />
              </button>
            </div>

            {/* Barra de Filtros Integrada */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar orden, cliente o diseño en el tablero..."
                  value={kanbanSearch}
                  onChange={e => setKanbanSearch(e.target.value)}
                  className="w-full bg-bravo-input border border-bravo-border/60 hover:border-bravo-accent/40 focus:border-bravo-accent/60 rounded-2xl pl-10 pr-8 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                />
                {kanbanSearch && (
                  <button onClick={() => setKanbanSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filtro por Técnica */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold mr-1">Técnica:</span>
                {[
                  { key: 'all', label: 'Todas' },
                  { key: 'dtf_textil', label: 'DTF Textil' },
                  { key: 'sublimacion', label: 'Sublimación' },
                  { key: 'vinilo', label: 'Vinilo' },
                  { key: 'dtf_uv', label: 'DTF UV' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTechniqueFilter(t.key)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all border ${
                      techniqueFilter === t.key
                        ? 'bg-bravo-accent text-black border-bravo-accent shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {actionError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-950/40 border border-rose-500/40 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-lg">
              <AlertCircle size={16} />
              {actionError}
            </motion.div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 min-h-[450px]">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-3xl animate-pulse h-96" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
              {KANBAN_COLUMNS.map(col => {
                const colOrders = filteredActiveOrders.filter(o => col.statuses.includes(o.status))
                const pct = activeOrders.length > 0 ? Math.round((colOrders.length / activeOrders.length) * 100) : 0

                return (
                  <div key={col.id} className="bg-[#0c0c12] border border-zinc-800/80 rounded-3xl p-4 flex flex-col min-h-[480px] shadow-2xl backdrop-blur-md relative overflow-hidden">
                    
                    {/* Encabezado de Columna Neón */}
                    <div className={`p-3 rounded-2xl border text-xs font-extrabold mb-4 flex items-center justify-between shadow-lg ${col.headerBg} ${col.glowColor}`}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: col.dotColor, boxShadow: `0 0 8px ${col.dotColor}` }} />
                        <span className="font-mono">{col.title}</span>
                      </div>
                      <span className="bg-black/50 border border-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black text-white">
                        {colOrders.length}
                      </span>
                    </div>

                    {/* Barra de Proporción sutil de la columna */}
                    <div className="w-full h-1 bg-zinc-900 rounded-full mb-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: col.dotColor }} />
                    </div>

                    {/* Lista de Tarjetas / Fichas de Producción */}
                    <div className="space-y-3.5 flex-1 overflow-y-auto bravo-scrollbar max-h-[600px] pr-1">
                      <AnimatePresence initial={false}>
                        {colOrders.length === 0 ? (
                          <div className="h-32 border border-dashed border-zinc-800/80 rounded-2xl flex flex-col items-center justify-center text-center p-4 my-auto">
                            <Layers size={20} className="text-zinc-700 mb-1.5" />
                            <p className="text-[10px] text-zinc-600 font-mono font-bold uppercase tracking-wider">Sin órdenes en esta etapa</p>
                          </div>
                        ) : (
                          colOrders.map(order => {
                            const total = parseFloat(order.repair_cost || 0)
                            const deposit = parseFloat(order.deposit || 0)
                            const balance = total - deposit
                            const paidPct = total > 0 ? Math.min(100, Math.round((deposit / total) * 100)) : 0
                            const fullyPaid = balance <= 0

                            // Urgencia de entrega
                            let urgency = 'normal'
                            let urgencyColor = 'text-zinc-500'
                            let urgencyBg = 'border-zinc-800 hover:border-amber-400/50'
                            if (order.estimated_delivery) {
                              const todayMs = new Date().setHours(0,0,0,0)
                              const delMs = new Date(order.estimated_delivery + 'T00:00:00').getTime()
                              const diffDays = Math.ceil((delMs - todayMs) / (1000 * 60 * 60 * 24))
                              if (diffDays < 0) { 
                                urgency = 'overdue'
                                urgencyColor = 'text-rose-400 font-black animate-pulse'
                                urgencyBg = 'border-rose-500/40 bg-rose-950/10 hover:border-rose-500/70 shadow-lg shadow-rose-950/20'
                              }
                              else if (diffDays <= 2) { 
                                urgency = 'soon'
                                urgencyColor = 'text-amber-400 font-bold'
                                urgencyBg = 'border-amber-500/30 hover:border-amber-400/60'
                              }
                            }

                            return (
                              <motion.div
                                layoutId={`card-${order.id}`}
                                key={order.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.18 }}
                                className={`bg-[#0e0e15] border rounded-2xl p-4 space-y-3 shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden ${urgencyBg} hover:shadow-2xl hover:-translate-y-0.5`}
                                onClick={() => navigate(`/bravo/orders/${order.id || order.order_number}`)}
                              >
                                {/* Borde neón superior */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bravo-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Boceto miniatura si existe */}
                                {order.design_file_url && (
                                  <div className="w-full h-24 rounded-xl overflow-hidden border border-zinc-800 relative shrink-0 bg-black flex items-center justify-center group/img">
                                    <img
                                      src={order.design_file_url.startsWith('http') ? order.design_file_url : `${api.defaults.baseURL}${order.design_file_url}`}
                                      alt="Boceto"
                                      className="w-full h-full object-cover opacity-85 group-hover/img:opacity-100 group-hover/img:scale-105 transition-all duration-300"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded-lg border border-zinc-800/80 flex items-center gap-1">
                                      <ImageIcon size={10} className="text-bravo-accent" />
                                      <span className="text-[8px] font-black text-bravo-accent uppercase font-mono">Boceto</span>
                                    </div>
                                  </div>
                                )}

                                {/* N° de orden + Técnica badge */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-black font-mono text-bravo-accent uppercase tracking-wide">
                                    {order.order_number}
                                  </span>
                                  {order.print_technique && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                                      {order.print_technique}
                                    </span>
                                  )}
                                </div>

                                {/* Nombre del diseño + prenda + cliente */}
                                <div className="space-y-1">
                                  <h4 className="text-xs font-black text-white leading-snug capitalize truncate">{order.model}</h4>
                                  <p className="text-[10px] text-zinc-400 truncate capitalize font-mono">{order.device_type} · {order.brand}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate pt-1 border-t border-zinc-800/60">
                                    <User size={10} className="text-zinc-500 shrink-0" />
                                    <span className="truncate">{order.client?.name || 'Cliente general'}</span>
                                  </div>
                                </div>

                                {/* Barra de progreso de pago */}
                                {total > 0 && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[9px] font-mono">
                                      <span className="text-zinc-500">Pago</span>
                                      <span className={fullyPaid ? 'text-emerald-400 font-black' : 'text-amber-400 font-bold'}>
                                        {fullyPaid ? '✅ Pagado Total' : `$${balance.toLocaleString('es-CL')} pend.`}
                                      </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          fullyPaid ? 'bg-emerald-500' : paidPct > 50 ? 'bg-amber-400' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${paidPct}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Fecha Entrega + Botón Avanzar Rápido */}
                                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 gap-2">
                                  {order.estimated_delivery ? (
                                    <div className={`text-[9px] font-mono flex items-center gap-1 ${urgencyColor}`}>
                                      {urgency === 'overdue' ? <AlertTriangle size={10} /> : <CalendarIcon size={10} />}
                                      {urgency === 'overdue' ? 'Atrasado' : new Date(order.estimated_delivery + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-zinc-600 font-mono">Sin fecha</div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleQuickAdvance(order) }}
                                    className="h-7 px-2.5 bg-zinc-800 hover:bg-bravo-accent text-zinc-300 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-zinc-700/60 hover:border-bravo-accent hover:shadow-md hover:shadow-bravo-glow/20"
                                  >
                                    <span>{getNextStageLabel(order)}</span>
                                    <ChevronRight size={10} />
                                  </button>
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
          )}

        </div>

        {/* Calendario Integrado de Entregas */}
        <div className="pt-4">
          <DeliveryCalendar system="bravo" />
        </div>

      </div>

      {/* MODAL ENTREGA RÁPIDA (CON COBRO EN CAJA) */}
      <AnimatePresence>
        {deliveryModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e15] border border-bravo-border p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-5 text-left relative"
            >
              <div className="flex justify-between items-center border-b border-bravo-border/40 pb-4">
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-400" />
                    Cobro y Entrega de Pedido
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Orden {deliveryModalOrder.order_number}</p>
                </div>
                <button onClick={() => setDeliveryModalOrder(null)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#101017] border border-bravo-border/40 p-4 rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Total:</span>
                  <span className="font-bold text-white">${parseFloat(deliveryModalOrder.repair_cost || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Abono Registrado:</span>
                  <span className="font-bold text-emerald-400">-${parseFloat(deliveryModalOrder.deposit || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-2 font-bold text-sm">
                  <span className="text-zinc-300">Saldo Pendiente:</span>
                  <span className="text-amber-400">
                    ${(parseFloat(deliveryModalOrder.repair_cost || 0) - parseFloat(deliveryModalOrder.deposit || 0)).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Medio de Pago del Saldo *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">📲 Transferencia</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmDelivery}
                  disabled={delivering}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Confirmar Cobro y Entregar Pedido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
