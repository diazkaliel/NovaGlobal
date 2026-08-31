import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench, Users, Package, ChevronRight, Smartphone,
  BarChart3, Calendar, ClipboardList, Plus,
  Activity, AlertTriangle, CheckCircle2, Zap, Globe, RefreshCw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import DeliveryCalendar from '../components/DeliveryCalendar'
import KanbanBoard from '../components/KanbanBoard'
import { getRepairs, updateRepairStatus } from '../api/repairs'

/* ─── Animated counter mini-component ─── */
function AnimatedCounter({ target, duration = 1000 }) {
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

/* ─── Module definitions ─── */
const modules = [
  {
    title: 'Reparaciones',
    description: 'Gestión de órdenes, diagnósticos y estado de equipos en taller.',
    icon: Wrench,
    path: '/repairs',
    accent: 'var(--color-cyan-400)',
    accentBg: 'rgba(0, 242, 254, .08)',
    accentBorder: 'rgba(0, 242, 254, .20)',
    accentHover: 'rgba(0, 242, 254, .14)',
    accentGlow: 'rgba(0, 242, 254, .12)',
  },
  {
    title: 'Clientes',
    description: 'Directorio, historial de servicios y comunicación automatizada.',
    icon: Users,
    path: '/clients',
    accent: 'var(--color-purple-400)',
    accentBg: 'rgba(168, 85, 247, .08)',
    accentBorder: 'rgba(168, 85, 247, .20)',
    accentHover: 'rgba(168, 85, 247, .14)',
    accentGlow: 'rgba(168, 85, 247, .12)',
  },
  {
    title: 'Inventario & Repuestos',
    description: 'Control de stock, piezas de recambio y alertas de reposición.',
    icon: Package,
    path: '/inventory',
    accent: 'var(--color-emerald-450)',
    accentBg: 'rgba(6, 214, 160, .08)',
    accentBorder: 'rgba(6, 214, 160, .20)',
    accentHover: 'rgba(6, 214, 160, .14)',
    accentGlow: 'rgba(6, 214, 160, .12)',
  },
  {
    title: 'Valores de Pantallas',
    description: 'Consulta rápida de precios de pantallas al cliente, costos y márgenes.',
    icon: Smartphone,
    path: '/screen-prices',
    accent: 'var(--color-rose-455)',
    accentBg: 'rgba(255, 0, 110, .08)',
    accentBorder: 'rgba(255, 0, 110, .20)',
    accentHover: 'rgba(255, 0, 110, .14)',
    accentGlow: 'rgba(255, 0, 110, .12)',
  },
  {
    title: 'Estadísticas Vitales',
    description: 'Métricas financieras, rendimiento del taller y gráficos interactivos.',
    icon: BarChart3,
    path: '/stats',
    accent: 'var(--color-blue-400)',
    accentBg: 'rgba(58, 134, 255, .08)',
    accentBorder: 'rgba(58, 134, 255, .20)',
    accentHover: 'rgba(58, 134, 255, .14)',
    accentGlow: 'rgba(58, 134, 255, .12)',
  },
  {
    title: 'Cotizador Rápido',
    description: 'Diagnóstico express y presupuesto directo en mostrador.',
    icon: ClipboardList,
    path: '/diagnostics',
    accent: 'var(--color-yellow-450)',
    accentBg: 'rgba(255, 209, 102, .08)',
    accentBorder: 'rgba(255, 209, 102, .20)',
    accentHover: 'rgba(255, 209, 102, .14)',
    accentGlow: 'rgba(255, 209, 102, .12)',
  },
  {
    title: 'Administrar Web',
    description: 'Configuración pública de WhatsApp, tarifas y preguntas frecuentes.',
    icon: Globe,
    path: '/admin-web',
    accent: 'var(--color-cyan-400)',
    accentBg: 'rgba(0, 242, 254, .08)',
    accentBorder: 'rgba(0, 242, 254, .20)',
    accentHover: 'rgba(0, 242, 254, .14)',
    accentGlow: 'rgba(0, 242, 254, .12)',
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionError, setActionError] = useState('')

  // Cargar lista de reparaciones desde el backend
  const fetchRepairsData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await getRepairs({ system: 'nova', limit: 120 })
      const data = Array.isArray(res.data) ? res.data : []
      setRepairs(data)
    } catch (err) {
      console.error('Error al cargar reparaciones del dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRepairsData(true)
  }, [])

  // Manejador de transición de estado con actualización optimista instantánea
  const handleStatusChange = async (order, newStatus, paymentData = null) => {
    setActionError('')
    const previousRepairs = [...repairs]

    // Actualización optimista inmediata en el estado de React
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
      // Refresco silencioso para sincronizar datos del servidor
      await fetchRepairsData(false)
    } catch (err) {
      console.error('Error al actualizar estado:', err)
      setActionError('No se pudo actualizar el estado de la orden. Restaurando cambios.')
      setRepairs(previousRepairs)
    }
  }

  // Métricas reactivas para las tarjetas superiores
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const active = repairs.filter(
      r => !['entregado', 'cancelado', 'listo'].includes(r.status)
    ).length
    const ready = repairs.filter(r => r.status === 'listo').length
    const critical = repairs.filter(r => {
      if (['entregado', 'cancelado'].includes(r.status)) return false
      if (r.status === 'critico') return true
      if (r.estimated_delivery && r.estimated_delivery < todayStr) return true
      return false
    }).length
    const today = repairs.filter(r => {
      if (['entregado', 'cancelado'].includes(r.status)) return false
      return r.estimated_delivery && r.estimated_delivery.split('T')[0] === todayStr
    }).length

    return { active, ready, critical, today }
  }, [repairs])

  // Fecha actual formateada
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
    <>
      <div className="min-h-screen bg-[#050508] text-[#f1f5f9] relative overflow-hidden flex flex-col font-sans">
        <AnimatedBackground />

        {/* Ambient glow blobs */}
        <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <main className="relative z-10 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col space-y-8">
          
          {/* ─── HERO HEADER: BIENVENIDA & ACCIONES PRINCIPALES ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-cyan-400 font-mono mb-1">
                Centro de Operaciones · Nova Technologies
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Hola, <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{user?.name || 'Técnico'}</span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-medium">{formattedDate}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Botón Refrescar */}
              <button
                onClick={() => fetchRepairsData(false)}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
              </button>

              {/* Botón Nueva Reparación */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/repairs/new')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:brightness-110 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>Nueva Reparación</span>
              </motion.button>
            </div>
          </div>

          {/* ─── STATS SUMMARY ROW ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Activas */}
            <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] backdrop-blur-md relative overflow-hidden flex items-center gap-3.5 shadow-lg">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Activity size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-white leading-none">
                  <AnimatedCounter target={stats.active} />
                </div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                  En Taller / Activas
                </div>
              </div>
            </div>

            {/* Listas */}
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] backdrop-blur-md relative overflow-hidden flex items-center gap-3.5 shadow-lg">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-white leading-none">
                  <AnimatedCounter target={stats.ready} />
                </div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                  Listas para Retiro
                </div>
              </div>
            </div>

            {/* Vencidas / Críticas */}
            <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] backdrop-blur-md relative overflow-hidden flex items-center gap-3.5 shadow-lg">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle size={20} className={stats.critical > 0 ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="text-2xl font-black text-white leading-none">
                  <AnimatedCounter target={stats.critical} />
                </div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                  Vencidas / Críticas
                </div>
              </div>
            </div>

            {/* Entregas Hoy */}
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] backdrop-blur-md relative overflow-hidden flex items-center gap-3.5 shadow-lg">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-white leading-none">
                  <AnimatedCounter target={stats.today} />
                </div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                  Compromiso Hoy
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje de Error de Acción si ocurre */}
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} />
              {actionError}
            </div>
          )}

          {/* ─── TABLERO KANBAN PRINCIPAL ─── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-cyan-400" />
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-zinc-200">
                  Flujo de Reparaciones en Vivo
                </h2>
              </div>
              <button
                onClick={() => navigate('/repairs')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                Ver Lista Detallada <ChevronRight size={14} />
              </button>
            </div>

            {/* Componente Kanban interactivo */}
            <KanbanBoard
              orders={repairs}
              onStatusChange={handleStatusChange}
              onRefresh={() => fetchRepairsData(false)}
              system="nova"
              loading={loading}
            />
          </section>

          {/* ─── MÓDULOS DE GESTIÓN RÁPIDA ─── */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-purple-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-zinc-200">
                Módulos de Gestión
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {modules.map((mod, i) => (
                <motion.button
                  key={mod.title}
                  onClick={() => navigate(mod.path)}
                  whileHover={{ y: -3 }}
                  className="text-left p-4 rounded-2xl border border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer flex flex-col justify-between group shadow-md backdrop-blur-sm"
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
                      <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
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
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-cyan-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-zinc-200">
                Calendario de Entregas & Planificación
              </h2>
            </div>
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md">
              <DeliveryCalendar />
            </div>
          </section>

        </main>
      </div>
    </>
  )
}