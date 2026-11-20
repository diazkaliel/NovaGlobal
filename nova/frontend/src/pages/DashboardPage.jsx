import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench, Users, Package, ChevronRight, Smartphone,
  BarChart3, Calendar, ClipboardList, Plus,
  Activity, AlertTriangle, CheckCircle2, Zap, Globe, RefreshCw,
  DollarSign, Coins, Shield, TrendingUp, Wallet, Check, Eye, Filter
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PickupQueue } from '../components/NovaWorkshop'
import DeliveryCalendar from '../components/DeliveryCalendar'
import KanbanBoard from '../components/KanbanBoard'
import { getRepairs, updateRepairStatus, getRepairStats } from '../api/repairs'
import { getCashRegisterStatus, openCashRegisterSession } from '../api/cashRegister'
import { getInventoryItems } from '../api/inventory'
import { getSaleStats } from '../api/sales'

function AnimatedCounter({ target, duration = 800 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) { setCount(0); return }
    let start = null
    let raf
    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      } else {
        setCount(target)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return <span>{count}</span>
}

const modules = [
  {
    title: 'Reparaciones',
    description: 'Gestión de órdenes, diagnósticos, garantías y estados en taller.',
    icon: Wrench,
    path: '/repairs',
    accent: '#22d3ee',
    accentBg: 'rgba(34, 211, 238, 0.08)',
    accentBorder: 'rgba(34, 211, 238, 0.22)',
  },
  {
    title: 'Punto de Venta (POS)',
    description: 'Venta directa de accesorios, cobro con lector de barras y boletas.',
    icon: DollarSign,
    path: '/sales',
    accent: '#10b981',
    accentBg: 'rgba(16, 185, 129, 0.08)',
    accentBorder: 'rgba(16, 185, 129, 0.22)',
  },
  {
    title: 'Caja Chica & Arqueo',
    description: 'Control de efectivo en gaveta, ingresos/egresos y cierres diarios.',
    icon: Coins,
    path: '/cash-register',
    accent: '#fbbf24',
    accentBg: 'rgba(251, 191, 36, 0.08)',
    accentBorder: 'rgba(251, 191, 36, 0.22)',
  },
  {
    title: 'Inventario & Repuestos',
    description: 'Control de stock de piezas, insumos, alertas y códigos de barra.',
    icon: Package,
    path: '/inventory',
    accent: '#34d399',
    accentBg: 'rgba(52, 211, 153, 0.08)',
    accentBorder: 'rgba(52, 211, 153, 0.22)',
  },
  {
    title: 'Valores de Pantallas',
    description: 'Catálogo rápido de pantallas por marca, calidades, costos y márgenes.',
    icon: Smartphone,
    path: '/screen-prices',
    accent: '#38bdf8',
    accentBg: 'rgba(56, 189, 248, 0.08)',
    accentBorder: 'rgba(56, 189, 248, 0.22)',
  },
  {
    title: 'Cotizador Rápido',
    description: 'Presupuesto express en mostrador conectado a pantallas e inventario.',
    icon: ClipboardList,
    path: '/diagnostics',
    accent: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.08)',
    accentBorder: 'rgba(245, 158, 11, 0.22)',
  },
  {
    title: 'Clientes',
    description: 'Directorio de clientes, historial de equipos e importación CSV.',
    icon: Users,
    path: '/clients',
    accent: '#818cf8',
    accentBg: 'rgba(129, 140, 248, 0.08)',
    accentBorder: 'rgba(129, 140, 248, 0.22)',
  },
  {
    title: 'Estadísticas & Finanzas',
    description: 'Rentabilidad neta, costos de insumos, SLA de entrega y métricas.',
    icon: BarChart3,
    path: '/stats',
    accent: '#60a5fa',
    accentBg: 'rgba(96, 165, 250, 0.08)',
    accentBorder: 'rgba(96, 165, 250, 0.22)',
  },
  {
    title: 'Calendario Proyectable',
    description: 'Planificación mensual/semanal y modo proyección TV para taller.',
    icon: Calendar,
    path: '/calendar',
    accent: '#22d3ee',
    accentBg: 'rgba(34, 211, 238, 0.08)',
    accentBorder: 'rgba(34, 211, 238, 0.22)',
  },
  {
    title: 'Configuración Web',
    description: 'Editor CMS de portada pública, tarifas, reseñas y bot WhatsApp.',
    icon: Globe,
    path: '/admin-web',
    accent: '#38bdf8',
    accentBg: 'rgba(56, 189, 248, 0.08)',
    accentBorder: 'rgba(56, 189, 248, 0.22)',
  },
]

const isQATestOrder = (r) => {
  const b = (r.brand || '').toLowerCase().trim()
  const m = (r.model || '').toLowerCase().trim()
  return (b === 'prueba' && m === 'qa') || (b === 'algodón' && m === 'estampado')
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [repairStats, setRepairStats] = useState(null)
  const [saleStats, setSaleStats] = useState(null)
  const [cashStatus, setCashStatus] = useState({ is_open: false, current_session: null })
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [hideTestOrders, setHideTestOrders] = useState(true)

  // Quick Cash Open Modal
  const [showQuickCashModal, setShowQuickCashModal] = useState(false)
  const [quickCashInitial, setQuickCashInitial] = useState('50000')
  const [openingCash, setOpeningCash] = useState(false)

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    else setRefreshing(true)

    try {
      const [repRes, statsRes, salesRes, cashRes, invRes] = await Promise.allSettled([
        getRepairs({ system: 'nova', limit: 200 }),
        getRepairStats({ system: 'nova' }),
        getSaleStats({ system: 'nova' }),
        getCashRegisterStatus({ system: 'nova' }),
        getInventoryItems({ system: 'nova', limit: 300 })
      ])

      if (repRes.status === 'fulfilled') {
        setRepairs(Array.isArray(repRes.value.data) ? repRes.value.data : [])
      }
      if (statsRes.status === 'fulfilled') {
        setRepairStats(statsRes.value.data)
      }
      if (salesRes.status === 'fulfilled') {
        setSaleStats(salesRes.value.data)
      }
      if (cashRes.status === 'fulfilled') {
        setCashStatus(cashRes.value.data || { is_open: false, current_session: null })
      }
      if (invRes.status === 'fulfilled') {
        setInventory(Array.isArray(invRes.value.data) ? invRes.value.data : [])
      }
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData(true)
  }, [])

  const handleQuickOpenCash = async (e) => {
    e.preventDefault()
    setOpeningCash(true)
    setActionError('')
    try {
      const res = await openCashRegisterSession({
        system: 'nova',
        initial_balance: parseFloat(quickCashInitial) || 0
      })
      setCashStatus({ is_open: true, current_session: res.data })
      setShowQuickCashModal(false)
    } catch (err) {
      setActionError(err.response?.data?.detail || 'No se pudo abrir la caja chica.')
    } finally {
      setOpeningCash(false)
    }
  }

  const handleStatusChange = async (order, newStatus, paymentData = null) => {
    setActionError('')
    const previousRepairs = [...repairs]

    setRepairs(prev =>
      prev.map(r => (r.id === order.id ? { ...r, status: newStatus } : r))
    )

    try {
      const payload = {
        new_status: newStatus,
        note: paymentData?.note || `Estado actualizado a ${newStatus} desde el Tablero Kanban del Dashboard`,
        payment_amount: paymentData?.payment_amount,
        payment_method: paymentData?.payment_method
      }
      await updateRepairStatus(order.id, payload)
      await fetchDashboardData(false)
    } catch (err) {
      console.error('Error al actualizar estado:', err)
      const detail = err.response?.data?.detail || 'No se pudo actualizar el estado de la orden.'
      setActionError(detail)
      setRepairs(previousRepairs)
    }
  }

  const qaOrdersCount = useMemo(() => repairs.filter(isQATestOrder).length, [repairs])

  const visibleRepairs = useMemo(() => {
    if (!hideTestOrders) return repairs
    return repairs.filter(r => !isQATestOrder(r))
  }, [repairs, hideTestOrders])

  const pendingWebOrders = useMemo(() => {
    return visibleRepairs.filter(r => r.status === 'pendiente')
  }, [visibleRepairs])

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const active = visibleRepairs.filter(
      r => !['entregado', 'cancelado', 'listo'].includes(r.status)
    ).length
    const ready = visibleRepairs.filter(r => r.status === 'listo').length
    const critical = visibleRepairs.filter(r => {
      if (['entregado', 'cancelado'].includes(r.status)) return false
      if (r.status === 'critico') return true
      if (r.estimated_delivery && r.estimated_delivery < todayStr) return true
      return false
    }).length
    const today = visibleRepairs.filter(r => {
      if (['entregado', 'cancelado'].includes(r.status)) return false
      return r.estimated_delivery && r.estimated_delivery.split('T')[0] === todayStr
    }).length

    // Métricas financieras en vivo de las órdenes
    const activeReceivable = visibleRepairs
      .filter(r => !['entregado', 'cancelado'].includes(r.status))
      .reduce((sum, r) => sum + Math.max(0, Number(r.repair_cost || 0) - Number(r.deposit || 0)), 0)

    const readyReceivable = visibleRepairs
      .filter(r => r.status === 'listo')
      .reduce((sum, r) => sum + Math.max(0, Number(r.repair_cost || 0) - Number(r.deposit || 0)), 0)

    const totalDepositsActive = visibleRepairs
      .filter(r => !['entregado', 'cancelado'].includes(r.status))
      .reduce((sum, r) => sum + Number(r.deposit || 0), 0)

    return { active, ready, critical, today, activeReceivable, readyReceivable, totalDepositsActive }
  }, [visibleRepairs])

  const inventorySummary = useMemo(() => {
    const lowStockItems = inventory.filter(i => i.stock <= i.min_stock)
    const insumosCount = inventory.filter(i => i.category === 'insumo').length
    const totalValuation = inventory.reduce((sum, i) => {
      const unit = Number(i.sale_price || 0) > 0 ? Number(i.sale_price) : Number(i.cost_price || 0)
      return sum + (Number(i.stock || 0) * unit)
    }, 0)
    return {
      total: inventory.length,
      insumosCount,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 3),
      totalValuation
    }
  }, [inventory])

  const cashSummary = useMemo(() => {
    const sess = cashStatus?.current_session
    if (!cashStatus?.is_open || !sess) {
      return { isOpen: false, expectedCash: 0, todayIncome: 0, txCount: 0 }
    }
    let cashIn = 0, cashOut = 0, digitalIn = 0
    ;(sess.transactions || []).forEach(t => {
      const amt = Number(t.amount || 0)
      const m = (t.payment_method || 'efectivo').toLowerCase()
      if (t.transaction_type === 'ingreso') {
        if (m === 'efectivo') cashIn += amt
        else digitalIn += amt
      } else if (m === 'efectivo') {
        cashOut += amt
      }
    })
    const expectedCash = Number(sess.initial_balance || 0) + cashIn - cashOut
    return {
      isOpen: true,
      expectedCash,
      todayIncome: cashIn + digitalIn,
      txCount: (sess.transactions || []).length
    }
  }, [cashStatus])

  const formattedDate = useMemo(() => {
    const d = new Date().toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return d.charAt(0).toUpperCase() + d.slice(1)
  }, [])

  return (
    <div className="relative flex flex-col space-y-7 text-left">


      {/* ─── HERO HEADER: BIENVENIDA, ESTADO DE CAJA & ACCIONES PRINCIPALES ─── */}
      <div className="nova-dashboard-heading relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">

            {cashSummary.isOpen ? (
              <button
                onClick={() => navigate('/cash-register')}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/12 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                title="Ir a Caja Chica"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Caja Abierta · Gaveta: ${cashSummary.expectedCash.toLocaleString('es-CL')}
              </button>
            ) : (
              <button
                onClick={() => setShowQuickCashModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/12 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                title="Abrir Caja Chica Rápida"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Caja Cerrada · Abrir Ahora
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Resumen del taller
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">{formattedDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Actualizar panel administrativo"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>

          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all cursor-pointer"
          >
            <DollarSign size={14} />
            <span>Terminal POS / Ventas</span>
          </button>

          <button
            onClick={() => navigate('/diagnostics')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all cursor-pointer"
          >
            <ClipboardList size={14} />
            <span>Cotizador Rápido</span>
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/repairs/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-[0_4px_14px_rgba(34,211,238,0.22)] cursor-pointer"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Nueva Reparación</span>
          </motion.button>
        </div>
      </div>

      {/* ─── FILA 1: INDICADORES OPERATIVOS DE TALLER ─── */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => navigate('/repairs')}
          className="p-4 rounded-2xl border border-cyan-500/20 bg-[#0b101b]/85 hover:border-cyan-500/40 backdrop-blur-md flex items-center gap-3.5 shadow-md cursor-pointer transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-500/12 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-white leading-none">
              <AnimatedCounter target={stats.active} />
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              En Taller / Activas
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/repairs')}
          className="p-4 rounded-2xl border border-emerald-500/20 bg-[#0b101b]/85 hover:border-emerald-500/40 backdrop-blur-md flex items-center gap-3.5 shadow-md cursor-pointer transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-white leading-none">
              <AnimatedCounter target={stats.ready} />
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Listas para Retiro
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/repairs')}
          className="p-4 rounded-2xl border border-rose-500/20 bg-[#0b101b]/85 hover:border-rose-500/40 backdrop-blur-md flex items-center gap-3.5 shadow-md cursor-pointer transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-500/12 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-white leading-none">
              <AnimatedCounter target={stats.critical} />
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Vencidas / Críticas
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/calendar')}
          className="p-4 rounded-2xl border border-amber-500/20 bg-[#0b101b]/85 hover:border-amber-500/40 backdrop-blur-md flex items-center gap-3.5 shadow-md cursor-pointer transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-white leading-none">
              <AnimatedCounter target={stats.today} />
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Compromiso Hoy
            </div>
          </div>
        </div>
      </div>

      {/* ─── FILA 2: RESUMEN ADMINISTRATIVO, FINANCIERO & DE INVENTARIO ─── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Facturación & Rentabilidad */}
        <div className="p-4 rounded-2xl border border-slate-800/90 bg-[#0b101b]/90 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-400">
              Facturación & Rentabilidad
            </span>
            <TrendingUp size={15} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-xl font-black text-white font-mono">
              ${Number((repairStats?.total_earnings || 0) + Number(saleStats?.total_revenue || 0)).toLocaleString('es-CL')}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Taller: <strong className="text-slate-200">${Number(repairStats?.total_earnings || 0).toLocaleString('es-CL')}</strong> · POS: <strong className="text-slate-200">${Number(saleStats?.total_revenue || 0).toLocaleString('es-CL')}</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-bold">
              Utilidad Neta: ${Number(repairStats?.estimated_net_profit || 0).toLocaleString('es-CL')}
            </span>
            <button
              onClick={() => navigate('/stats')}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Ver Finanzas <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 2: Cuentas por Cobrar en Taller */}
        <div className="p-4 rounded-2xl border border-slate-800/90 bg-[#0b101b]/90 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
              Cuentas por Cobrar (Taller)
            </span>
            <Wallet size={15} className="text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-black text-white font-mono">
              ${stats.activeReceivable.toLocaleString('es-CL')}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              En equipos listos: <strong className="text-emerald-400">${stats.readyReceivable.toLocaleString('es-CL')}</strong> · Abonos: <strong className="text-slate-200">${stats.totalDepositsActive.toLocaleString('es-CL')}</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {stats.ready} {stats.ready === 1 ? 'equipo listo' : 'equipos listos'} p/ retiro
            </span>
            <button
              onClick={() => navigate('/repairs')}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Gestionar Cobros <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 3: Estado de Caja Chica */}
        <div className="p-4 rounded-2xl border border-slate-800/90 bg-[#0b101b]/90 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
              Control de Caja Chica
            </span>
            <Coins size={15} className="text-emerald-400" />
          </div>
          {cashSummary.isOpen ? (
            <>
              <div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  ${cashSummary.expectedCash.toLocaleString('es-CL')}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Efectivo en gaveta · Recaudado hoy: <strong className="text-white">${cashSummary.todayIncome.toLocaleString('es-CL')}</strong>
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-semibold">
                  ● Sesión Abierta ({cashSummary.txCount} movs)
                </span>
                <button
                  onClick={() => navigate('/cash-register')}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  Arqueo / Cierre <ChevronRight size={12} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-sm font-bold text-amber-300">
                  Sesión de Caja Cerrada
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Abre la caja diaria para registrar cobros en efectivo y entregas.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => setShowQuickCashModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-400 text-slate-950 font-black text-[10px] uppercase tracking-wider hover:bg-cyan-300 transition-all cursor-pointer"
                >
                  Abrir Caja Rápida
                </button>
                <button
                  onClick={() => navigate('/cash-register')}
                  className="text-slate-400 hover:text-white font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  Ir a Caja <ChevronRight size={12} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Card 4: Salud de Inventario & Stock Crítico */}
        <div className="p-4 rounded-2xl border border-slate-800/90 bg-[#0b101b]/90 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-400">
              Inventario & Repuestos
            </span>
            <Package size={15} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white font-mono">
                {inventorySummary.total} ítems
              </span>
              {inventorySummary.lowStockCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  {inventorySummary.lowStockCount} stock bajo
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {inventorySummary.lowStockItems.length > 0
                ? `Reponer: ${inventorySummary.lowStockItems.map(i => `${i.name} (${i.stock})`).join(', ')}`
                : `Valorizado: $${inventorySummary.totalValuation.toLocaleString('es-CL')}`
              }
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {inventorySummary.insumosCount} repuestos de taller
            </span>
            <button
              onClick={() => navigate('/inventory')}
              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Ver Stock <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── BANDEJA DE SOLICITUDES WEB PENDIENTES DE APROBACIÓN ─── */}
      {pendingWebOrders.length > 0 && (
        <div className="relative z-10 p-4 rounded-2xl border border-amber-500/35 bg-amber-950/15 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Solicitudes Web Pendientes de Aprobación ({pendingWebOrders.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-200/80">
              Pre-registradas por clientes desde el portal público de Nova
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingWebOrders.map(order => (
              <div
                key={order.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/25 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-400">{order.order_number}</span>
                    <span className="text-xs font-bold text-white truncate">{order.brand} {order.model}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {order.client?.name || 'Cliente Web'} · {order.reported_issue}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStatusChange(order, 'recibido', { note: 'Solicitud web aprobada e ingresada a taller' })}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase cursor-pointer transition-all"
                    title="Aprobar e ingresar a recepción"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => navigate(`/repairs/${order.id}`)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Ver ficha completa"
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actionError && (
        <div className="relative z-10 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          {actionError.toLowerCase().includes('caja') && (
            <button
              onClick={() => setShowQuickCashModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider cursor-pointer shrink-0"
            >
              Abrir Caja Ahora
            </button>
          )}
        </div>
      )}

      <PickupQueue repairs={repairs} />

      {/* ─── TABLERO KANBAN PRINCIPAL ─── */}
      <section className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-cyan-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
              Flujo de Reparaciones en Vivo
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {qaOrdersCount > 0 && (
              <button
                onClick={() => setHideTestOrders(!hideTestOrders)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  hideTestOrders
                    ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
                    : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                }`}
              >
                <Filter size={12} />
                <span>{hideTestOrders ? `Ocultando ${qaOrdersCount} órdenes QA` : 'Mostrando órdenes QA'}</span>
              </button>
            )}

            <button
              onClick={() => navigate('/repairs')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ver Lista Detallada <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <KanbanBoard
          orders={visibleRepairs}
          onStatusChange={handleStatusChange}
          onRefresh={() => fetchDashboardData(false)}
          system="nova"
          loading={loading}
        />
      </section>

      {/* ─── MÓDULOS DE GESTIÓN RÁPIDA ─── */}
      <section className="relative z-10 space-y-4 pt-4 border-t border-slate-800/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-cyan-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
              Módulos Administrativos y de Taller
            </h2>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/users-attendance')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Shield size={13} />
              <span>Centro de Control, Personal & Auditoría</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {modules.map((mod) => (
            <motion.button
              key={mod.title}
              onClick={() => navigate(mod.path)}
              whileHover={{ y: -2 }}
              className="text-left p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 bg-[#0b101b]/75 hover:bg-[#0f1625] transition-all cursor-pointer flex flex-col justify-between group shadow-md backdrop-blur-sm"
            >
              <div className="space-y-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    background: mod.accentBg,
                    borderColor: mod.accentBorder,
                    color: mod.accent,
                  }}
                >
                  <mod.icon size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-white transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    {mod.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-4 text-cyan-400 group-hover:translate-x-1 transition-transform">
                Acceder <ChevronRight size={12} />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ─── CALENDARIO DE ENTREGAS ─── */}
      <section className="relative z-10 space-y-4 pt-4 border-t border-slate-800/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-cyan-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
              Calendario de Entregas & Planificación
            </h2>
          </div>
          <button
            onClick={() => navigate('/calendar')}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            Abrir Modo Proyección TV <ChevronRight size={14} />
          </button>
        </div>
        <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#0b101b]/80 backdrop-blur-md">
          <DeliveryCalendar />
        </div>
      </section>

      {/* ─── MODAL DE APERTURA RÁPIDA DE CAJA CHICA ─── */}
      <AnimatePresence>
        {showQuickCashModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setShowQuickCashModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0b101b] border border-cyan-500/35 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Coins size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Apertura Rápida de Caja</h3>
                    <p className="text-[11px] text-slate-400">Habilita el registro de cobros y entregas del día</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickCashModal(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleQuickOpenCash} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-1.5">
                    Fondo Inicial en Efectivo en Gaveta ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quickCashInitial}
                    onChange={e => setQuickCashInitial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                    placeholder="Ej: 50000"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQuickCashModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={openingCash}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {openingCash ? 'Abriendo...' : 'Abrir Caja Chica'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
