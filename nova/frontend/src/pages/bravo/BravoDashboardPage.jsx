import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Palette, Package, Calendar as CalendarIcon, Clock, ArrowRight, User, 
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, DollarSign, Image as ImageIcon, 
  AlertTriangle, Zap, TrendingUp, Search, Filter, Layers, Check, X, Phone, Download, 
  ExternalLink, Flame, MessageCircle, RefreshCw, ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus } from '../../api/repairs'
import { getInventoryItems } from '../../api/inventory'
import { createQAInspection } from '../../api/bravoBlueprint'
import BravoBackground from '../../components/bravo/BravoBackground'
import DeliveryCalendar from '../../components/DeliveryCalendar'
import WhatsAppButton from '../../components/WhatsAppButton'
import { generateBravoClientPDF } from '../../utils/generateBravoPDF'
import api from '../../api/client'

// Mapeo estilizado de columnas Kanban para taller de estampados
const KANBAN_COLUMNS = [
  {
    id: 'design',
    title: 'Diseño & Muestras',
    icon: Palette,
    statuses: ['pendiente', 'recibido', 'diagnostico', 'presupuesto_enviado', 'diseno_aprobado'],
    accentColor: '#a855f7',
    badgeClass: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
    headerGlow: 'from-purple-950/70 via-purple-900/30 to-transparent',
    borderClass: 'border-purple-500/30',
  },
  {
    id: 'waiting',
    title: 'Espera de Insumos',
    icon: Package,
    statuses: ['esperando_repuesto'],
    accentColor: '#f59e0b',
    badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    headerGlow: 'from-amber-950/70 via-amber-900/30 to-transparent',
    borderClass: 'border-amber-500/30',
  },
  {
    id: 'production',
    title: 'En Producción',
    icon: Zap,
    statuses: ['en_reparacion', 'critico', 'en_garantia'],
    accentColor: '#06b6d4',
    badgeClass: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
    headerGlow: 'from-cyan-950/70 via-cyan-900/30 to-transparent',
    borderClass: 'border-cyan-500/30',
  },
  {
    id: 'ready',
    title: 'Listo p/ Entrega',
    icon: CheckCircle2,
    statuses: ['listo'],
    accentColor: '#10b981',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    headerGlow: 'from-emerald-950/70 via-emerald-900/30 to-transparent',
    borderClass: 'border-emerald-500/30',
  }
]

const TECHNIQUE_COLORS = {
  dtf_textil: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  sublimacion: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  vinilo: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  dtf_uv: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  bordado: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  serigrafia: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
}

export default function BravoDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [productsCount, setProductsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [kanbanSearch, setKanbanSearch] = useState('')
  const [techniqueFilter, setTechniqueFilter] = useState('all')

  // Modal de entrega rápida
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [delivering, setDelivering] = useState(false)
  const [actionError, setActionError] = useState('')

  // Modal de Control de Calidad (QA)
  const [qaModalOrder, setQaModalOrder] = useState(null)
  const [qaChecklist, setQaChecklist] = useState({
    hilos_cortados: true,
    sin_manchas: true,
    curado_temperatura: true,
    empaque_correcto: true
  })
  const [qaComments, setQaComments] = useState('')
  const [qaSubmitting, setQaSubmitting] = useState(false)

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const [repairsRes, productsRes] = await Promise.all([
        getRepairs({ system: 'bravo', limit: 120 }),
        getInventoryItems({ system: 'bravo' }).catch(() => ({ data: [] })),
      ])
      setOrders(repairsRes.data || [])
      setProductsCount((productsRes.data || []).length)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtrar órdenes activas en el tablero
  const activeOrders = orders.filter(
    (o) => !['entregado', 'cancelado'].includes(o.status)
  )

  // Filtrar órdenes por texto de búsqueda y técnica
  const filteredActiveOrders = activeOrders.filter(o => {
    const matchSearch = 
      (o.order_number || '').toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.client?.name || '').toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.model || '').toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.brand || '').toLowerCase().includes(kanbanSearch.toLowerCase()) ||
      (o.device_type || '').toLowerCase().includes(kanbanSearch.toLowerCase())

    const matchTech = techniqueFilter === 'all' || (o.print_technique || '').toLowerCase() === techniqueFilter.toLowerCase()

    return matchSearch && matchTech
  })

  // Obtener etiqueta del botón de avance rápido según estado actual
  const getNextStageLabel = (orderItem) => {
    if (['pendiente', 'recibido', 'diagnostico', 'presupuesto_enviado', 'diseno_aprobado'].includes(orderItem.status)) {
      return '⚡ Pasar a Producción'
    } else if (orderItem.status === 'esperando_repuesto') {
      return '⚡ Continuar Producción'
    } else if (['en_reparacion', 'critico', 'en_garantia'].includes(orderItem.status)) {
      return '✅ Marcar Listo'
    } else if (orderItem.status === 'listo') {
      return '💰 Entregar & Cobrar'
    }
    return 'Avanzar'
  }

  // Avanzar estado rápidamente con actualización instantánea optimista
  const handleQuickAdvance = async (orderItem) => {
    setActionError('')
    let nextStatus = ''
    
    if (['pendiente', 'recibido', 'diagnostico', 'presupuesto_enviado', 'diseno_aprobado', 'esperando_repuesto'].includes(orderItem.status)) {
      nextStatus = 'en_reparacion'
    } else if (['en_reparacion', 'critico', 'en_garantia'].includes(orderItem.status)) {
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

    // Actualización optimista instantánea
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
      if (err.response?.status === 422 && nextStatus === 'listo') {
        setQaModalOrder(orderItem)
        setQaChecklist({
          hilos_cortados: true,
          sin_manchas: true,
          curado_temperatura: true,
          empaque_correcto: true
        })
        setQaComments('')
      } else {
        setActionError(err.response?.data?.detail || 'No se pudo actualizar el estado de la orden.')
      }
    }
  }

  // Enviar checklist QA y avanzar a listo
  const handleConfirmQA = async (e) => {
    e.preventDefault()
    if (!qaModalOrder) return
    setQaSubmitting(true)
    try {
      const passed = Object.values(qaChecklist).every(val => val === true)
      if (!passed) {
        alert('Debes marcar todos los puntos de calidad para aprobar la orden.')
        setQaSubmitting(false)
        return
      }

      await createQAInspection({
        order_id: qaModalOrder.id,
        checklist_results: qaChecklist,
        passed: true,
        comments: qaComments || 'Control de calidad aprobado desde el tablero Kanban'
      })

      await updateRepairStatus(qaModalOrder.id, {
        new_status: 'listo',
        note: 'Control de calidad aprobado y orden marcada como Lista'
      })

      setQaModalOrder(null)
      await fetchData(false)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || 'Error al guardar el control de calidad.')
    } finally {
      setQaSubmitting(false)
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
        note: `Pedido entregado y saldo cancelado en caja taller.`,
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
      label: 'En Taller (Activos)',
      value: activeOrders.length,
      icon: Sparkles,
      color: 'text-amber-400',
      bg: 'bg-zinc-900/70 border-amber-500/20 hover:border-amber-500/40',
      desc: 'En diseño o máquinas'
    },
    {
      label: 'Catálogo Base',
      value: productsCount,
      icon: Package,
      color: 'text-cyan-400',
      bg: 'bg-zinc-900/70 border-cyan-500/20 hover:border-cyan-500/40',
      desc: 'Prendas e insumos'
    },
    {
      label: 'Completados',
      value: orders.filter((o) => o.status === 'entregado').length,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-zinc-900/70 border-emerald-500/20 hover:border-emerald-500/40',
      desc: 'Histórico entregados'
    },
    {
      label: 'Urgentes / Atrasados',
      value: overdueOrders.length,
      icon: overdueOrders.length > 0 ? Flame : Clock,
      color: overdueOrders.length > 0 ? 'text-rose-400' : 'text-zinc-500',
      bg: overdueOrders.length > 0
        ? 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20 animate-pulse'
        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700',
      desc: overdueOrders.length > 0 ? '¡Atención inmediata!' : 'Al día con las fechas'
    },
  ]

  return (
    <div className="space-y-8 relative pb-16 text-left">
      <BravoBackground />

      {/* Luces de fondo ambientadas */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Banner Principal de Bravo Taller */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-r from-zinc-900/90 via-[#13131d]/90 to-zinc-900/90 border border-amber-500/20 p-6 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl"
      >
        <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
          <div className="relative">
            <img 
              src="/logo-bravo.jpg" 
              alt="Logo Bravo" 
              className="w-18 h-18 rounded-2xl object-cover border-2 border-amber-400/40 shadow-lg shadow-amber-500/10"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=250&auto=format&fit=crop"
              }}
            />
            <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full shadow-sm animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono tracking-widest bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Taller Quillota · En Vivo
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white mt-1 font-mono tracking-tight flex items-center gap-2">
              Personalizaciones Bravo
            </h2>
            <p className="text-zinc-400 text-xs mt-1 max-w-xl">
              Panel de control y flujo de producción en vivo. Estampados, sublimación, vinilo textil y DTF.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={() => navigate('/bravo/orders/new')}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Nuevo Pedido</span>
          </button>
          <button
            onClick={() => navigate('/bravo/cash-register')}
            className="px-4 py-2.5 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:text-white flex items-center gap-1.5"
          >
            <DollarSign size={14} className="text-emerald-400" />
            <span>Caja Chica</span>
          </button>
          <button
            onClick={() => fetchData(false)}
            className="p-2.5 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </motion.div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`border p-4 rounded-2xl flex items-center justify-between backdrop-blur-md transition-all duration-300 hover:shadow-xl ${stat.bg}`}
          >
            <div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-white mt-1 font-mono tracking-tight">{stat.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{stat.desc}</p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner">
              <stat.icon size={20} className={stat.color} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* TABLERO KANBAN DE PROCESOS REDISEÑADO */}
      <div className="space-y-4 relative z-10">
        
        {/* Barra de Filtros y Búsqueda Superior */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-3xl p-5 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Palette size={18} />
              </div>
              <div>
                <h3 className="font-mono font-black text-sm md:text-base tracking-wider text-white uppercase flex items-center gap-2">
                  Flujo de Producción de Taller
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Control visual por etapas desde el diseño hasta la entrega final.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/bravo/orders')}
                className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20 hover:border-amber-400/40"
              >
                <span>Ver Lista Completa</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Filtros: Buscador por texto + Botones de Técnica */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por N° orden, cliente, diseño, prenda o detalle..."
                value={kanbanSearch}
                onChange={e => setKanbanSearch(e.target.value)}
                className="w-full bg-black/40 border border-zinc-800 hover:border-amber-500/40 focus:border-amber-500/70 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
              />
              {kanbanSearch && (
                <button onClick={() => setKanbanSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Selector de Técnica de Estampado */}
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
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all border cursor-pointer ${
                    techniqueFilter === t.key
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20 font-black'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {actionError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-950/50 border border-rose-500/50 text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-lg">
            <AlertCircle size={16} />
            {actionError}
          </motion.div>
        )}

        {/* Tablero Kanban de 4 Columnas Fluidas */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[480px]">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl animate-pulse h-96" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {KANBAN_COLUMNS.map(col => {
              const colOrders = filteredActiveOrders.filter(o => col.statuses.includes(o.status))
              const ColIcon = col.icon

              return (
                <div 
                  key={col.id} 
                  className={`bg-[#0a0a10] border ${col.borderClass} rounded-3xl p-3.5 flex flex-col min-h-[500px] shadow-2xl backdrop-blur-md relative overflow-hidden`}
                >
                  
                  {/* Encabezado con efecto glow */}
                  <div className={`p-3 rounded-2xl border bg-gradient-to-b ${col.headerGlow} ${col.borderClass} mb-3 flex items-center justify-between shadow-lg`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-black/40 border border-white/10" style={{ color: col.accentColor }}>
                        <ColIcon size={14} />
                      </div>
                      <span className="font-mono text-xs font-black text-white tracking-wide">{col.title}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${col.badgeClass}`}>
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Lista de Tarjetas de Producción */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-1 bravo-scrollbar">
                    <AnimatePresence initial={false}>
                      {colOrders.length === 0 ? (
                        <div className="h-40 border border-dashed border-zinc-800/80 rounded-2xl flex flex-col items-center justify-center text-center p-4 my-auto bg-black/20">
                          <Layers size={22} className="text-zinc-700 mb-2" />
                          <p className="text-[11px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Sin órdenes activas</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Esta etapa está libre</p>
                        </div>
                      ) : (
                        colOrders.map(order => {
                          const total = parseFloat(order.repair_cost || 0)
                          const deposit = parseFloat(order.deposit || 0)
                          const balance = Math.max(0, total - deposit)
                          const paidPct = total > 0 ? Math.min(100, Math.round((deposit / total) * 100)) : 0
                          const fullyPaid = balance <= 0 && total > 0

                          // Evaluación de urgencia por fecha de entrega
                          let urgency = 'normal'
                          let urgencyLabel = ''
                          let urgencyChipClass = 'text-zinc-400 bg-zinc-900 border-zinc-800'
                          let cardBorder = 'border-zinc-800/80 hover:border-amber-400/50'

                          if (order.estimated_delivery) {
                            const todayMs = new Date().setHours(0,0,0,0)
                            const delMs = new Date(order.estimated_delivery + 'T00:00:00').getTime()
                            const diffDays = Math.ceil((delMs - todayMs) / (1000 * 60 * 60 * 24))

                            if (diffDays < 0) { 
                              urgency = 'overdue'
                              urgencyLabel = `Atrasado ${Math.abs(diffDays)}d`
                              urgencyChipClass = 'text-rose-300 bg-rose-950/60 border-rose-500/50 font-black animate-pulse'
                              cardBorder = 'border-rose-500/50 bg-gradient-to-b from-rose-950/20 to-[#0e0e16] shadow-lg shadow-rose-950/30'
                            } else if (diffDays === 0) {
                              urgency = 'today'
                              urgencyLabel = '¡Entrega Hoy!'
                              urgencyChipClass = 'text-amber-300 bg-amber-950/60 border-amber-500/50 font-black'
                              cardBorder = 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-[#0e0e16]'
                            } else if (diffDays <= 2) { 
                              urgency = 'soon'
                              urgencyLabel = `En ${diffDays} días`
                              urgencyChipClass = 'text-amber-400/90 bg-amber-950/30 border-amber-500/30 font-bold'
                            } else {
                              urgencyLabel = new Date(order.estimated_delivery + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
                            }
                          }

                          const techClass = TECHNIQUE_COLORS[order.print_technique?.toLowerCase()] || 'bg-zinc-800 text-zinc-300 border-zinc-700'

                          return (
                            <motion.div
                              layoutId={`card-${order.id}`}
                              key={order.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.16 }}
                              className={`bg-[#0f0f18] border rounded-2xl p-3.5 space-y-3 shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden ${cardBorder} hover:shadow-2xl hover:-translate-y-0.5`}
                              onClick={() => navigate(`/bravo/orders/${order.id || order.order_number}`)}
                            >
                              {/* Barra neón superior en hover */}
                              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                              {/* Boceto / Imagen de Referencia Prominente */}
                              {order.design_file_url && (
                                <div className="w-full h-28 rounded-xl overflow-hidden border border-zinc-800/80 relative shrink-0 bg-black flex items-center justify-center group/img">
                                  <img
                                    src={order.design_file_url.startsWith('http') ? order.design_file_url : `${api.defaults.baseURL}${order.design_file_url}`}
                                    alt="Boceto de diseño"
                                    className="w-full h-full object-cover opacity-85 group-hover/img:opacity-100 group-hover/img:scale-105 transition-all duration-300"
                                  />
                                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                                    <ImageIcon size={10} className="text-amber-400" />
                                    <span className="text-[8px] font-black text-amber-300 uppercase font-mono tracking-wider">Diseño</span>
                                  </div>
                                </div>
                              )}

                              {/* Encabezado de la Tarjeta: N° Orden + Técnica */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black font-mono text-amber-400 uppercase tracking-wide bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30">
                                    {order.order_number}
                                  </span>
                                </div>
                                {order.print_technique && (
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase font-mono border ${techClass}`}>
                                    {order.print_technique.replace('_', ' ')}
                                  </span>
                                )}
                              </div>

                              {/* Contenido: Prenda, Modelo & Cliente */}
                              <div className="space-y-1.5">
                                <h4 className="text-xs font-black text-white leading-snug truncate">
                                  {order.model || order.device_type || 'Personalización'}
                                </h4>
                                
                                <div className="flex items-center justify-between text-[11px] text-zinc-400 truncate font-mono">
                                  <span className="truncate">{order.device_type} {order.brand ? `· ${order.brand}` : ''}</span>
                                </div>

                                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-800/80">
                                  <div className="flex items-center gap-1 text-[11px] text-zinc-300 truncate">
                                    <User size={11} className="text-zinc-500 shrink-0" />
                                    <span className="truncate font-semibold">{order.client?.name || 'Cliente general'}</span>
                                  </div>
                                  
                                  {order.client?.phone && (
                                    <div onClick={e => e.stopPropagation()}>
                                      <WhatsAppButton client={order.client} repair={order} isBravo={true} />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Barra de Progreso de Pago */}
                              {total > 0 && (
                                <div className="space-y-1 bg-black/50 p-2 rounded-xl border border-white/5">
                                  <div className="flex items-center justify-between text-[9px] font-mono">
                                    <span className="text-zinc-400 font-medium">Total: ${total.toLocaleString('es-CL')}</span>
                                    <span className={fullyPaid ? 'text-emerald-400 font-black' : 'text-amber-400 font-bold'}>
                                      {fullyPaid ? '✓ 100% Pagado' : `$${balance.toLocaleString('es-CL')} pend.`}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        fullyPaid ? 'bg-emerald-500' : paidPct > 50 ? 'bg-amber-400' : 'bg-orange-500'
                                      }`}
                                      style={{ width: `${paidPct}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Pie de Tarjeta: Urgencia / Fecha + Botones de Acción */}
                              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-2">
                                {order.estimated_delivery ? (
                                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1 ${urgencyChipClass}`}>
                                    {urgency === 'overdue' ? <AlertTriangle size={10} /> : <CalendarIcon size={10} />}
                                    <span>{urgencyLabel}</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-zinc-600 font-mono">Sin fecha</span>
                                )}

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); generateBravoClientPDF(order, order.client) }}
                                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    title="Descargar Comprobante PDF"
                                  >
                                    <Download size={11} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleQuickAdvance(order) }}
                                    className="h-7 px-2.5 bg-zinc-800 hover:bg-amber-400 text-zinc-200 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-zinc-700/80 hover:border-amber-400 hover:shadow-md hover:shadow-amber-400/20 active:scale-95"
                                  >
                                    <span>{getNextStageLabel(order)}</span>
                                    <ChevronRight size={11} />
                                  </button>
                                </div>
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

      {/* Calendario Integrado de Entregas de Taller */}
      <div className="pt-4">
        <DeliveryCalendar system="bravo" />
      </div>

      {/* MODAL DE ENTREGA RÁPIDA CON COBRO EN CAJA */}
      <AnimatePresence>
        {deliveryModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e18] border border-amber-500/30 p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-5 text-left relative"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-400" />
                    Cobro & Entrega de Pedido
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Orden #{deliveryModalOrder.order_number}</p>
                </div>
                <button onClick={() => setDeliveryModalOrder(null)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#12121e] border border-zinc-800/80 p-4 rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Costo Total:</span>
                  <span className="font-bold text-white">${parseFloat(deliveryModalOrder.repair_cost || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Abono Registrado:</span>
                  <span className="font-bold text-emerald-400">-${parseFloat(deliveryModalOrder.deposit || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-2 font-bold text-sm">
                  <span className="text-zinc-300">Saldo Pendiente a Cobrar:</span>
                  <span className="text-amber-400">
                    ${(parseFloat(deliveryModalOrder.repair_cost || 0) - parseFloat(deliveryModalOrder.deposit || 0)).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-amber-400 block uppercase font-bold tracking-wider">Medio de Pago del Saldo *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">📲 Transferencia Electrónica</option>
                    <option value="debito">💳 Tarjeta Débito (POS)</option>
                    <option value="credito">💳 Tarjeta Crédito (POS)</option>
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

      {/* MODAL CHECKLIST QA CONTROL DE CALIDAD */}
      <AnimatePresence>
        {qaModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e18] border border-cyan-500/30 p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-5 text-left relative"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <ShieldCheck size={18} className="text-cyan-400" />
                    Control de Calidad (QA)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Orden #{qaModalOrder.order_number} · Verificación previa para pasar a Listo</p>
                </div>
                <button onClick={() => setQaModalOrder(null)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmQA} className="space-y-4">
                <div className="space-y-2 bg-zinc-950 p-4 border border-zinc-800/80 rounded-2xl">
                  {[
                    { key: 'hilos_cortados', label: '✂️ Hilos cortados y terminación limpia' },
                    { key: 'sin_manchas', label: '🧼 Sin manchas de tinta o manipulación' },
                    { key: 'curado_temperatura', label: '🔥 Curado y fijado térmico verificado' },
                    { key: 'empaque_correcto', label: '📦 Empaque y etiqueta listos' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-zinc-900 rounded-xl transition-colors">
                      <input
                        type="checkbox"
                        checked={qaChecklist[item.key]}
                        onChange={e => setQaChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-zinc-900 border-zinc-700"
                      />
                      <span className="text-xs text-zinc-200 font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 block uppercase font-bold tracking-wider">Notas u observaciones de taller</label>
                  <textarea
                    rows={2}
                    value={qaComments}
                    onChange={e => setQaComments(e.target.value)}
                    placeholder="Ej: Estampado verificado con plancha a 160°C..."
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={qaSubmitting}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-cyan-950/40 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Aprobar Calidad y Marcar como Listo
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
