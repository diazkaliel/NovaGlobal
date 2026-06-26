import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import { Palette, Package, Calendar as CalendarIcon, Clock, ArrowRight, User, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs } from '../../api/repairs'
import { getInventoryItems } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import DeliveryCalendar from '../../components/DeliveryCalendar'
import BravoLayout from '../../components/bravo/BravoLayout'

const STATUS_LABELS = {
  recibido: 'Recibido',
  diagnostico: 'En Diseño',
  esperando_repuesto: 'Espera Insumos',
  presupuesto_enviado: 'Muestra Enviada',
  en_reparacion: 'En Producción',
  listo: 'Listo p/ Entrega',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const STATUS_STYLES = {
  recibido: 'bg-amber-100/80 text-amber-900 border border-amber-300/40 shadow-sm shadow-amber-500/5',
  diagnostico: 'bg-orange-100/80 text-orange-900 border border-orange-300/40 shadow-sm shadow-orange-500/5',
  esperando_repuesto: 'bg-yellow-100/90 text-yellow-955 border border-yellow-300/40 shadow-sm shadow-yellow-500/5',
  presupuesto_enviado: 'bg-purple-100/80 text-purple-900 border border-purple-300/40 shadow-sm shadow-purple-500/5',
  en_reparacion: 'bg-sky-100/95 text-sky-900 border border-sky-300/50 shadow-sm shadow-sky-500/5 font-bold',
  listo: 'bg-emerald-100/90 text-emerald-900 border border-emerald-300/40 shadow-sm shadow-emerald-500/5 font-bold',
  entregado: 'bg-stone-100 text-stone-700 border border-stone-300/50',
  cancelado: 'bg-red-100/80 text-red-900 border border-red-300/40',
  critico: 'bg-red-200/90 text-red-955 border border-red-400 font-extrabold animate-pulse shadow-sm shadow-red-500/20',
}

export default function BravoDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [productsCount, setProductsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
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
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const activeOrders = orders.filter(
    (o) => !['entregado', 'cancelado'].includes(o.status)
  )

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
      desc: 'Ordenes completadas'
    },
  ]

  return (
    <BravoLayout>
      <div className="space-y-8 relative">
        <BravoBackground />

        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1.5 border-b border-bravo-border pb-6 text-left"
        >
          <p className="text-[10px] font-bold tracking-widest text-bravo-accent/80 uppercase">
            Estudio de Personalizaciones Bravo
          </p>
          <h2 className="text-3xl font-black text-bravo-text leading-tight">
            Resumen del <span className="bg-gradient-to-r from-bravo-accent via-amber-500 to-bravo-accent-warm bg-clip-text text-transparent">Estudio</span>
          </h2>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`border p-5 rounded-2xl flex items-center justify-between backdrop-blur-md transition-all duration-300 hover:shadow-md hover:shadow-bravo-glow ${stat.bg}`}
            >
              <div>
                <p className="text-bravo-text-muted text-[10px] font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-3xl font-black text-bravo-text mt-1">{stat.value}</p>
                <p className="text-[10px] text-bravo-text-muted mt-1">{stat.desc}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/90 border border-bravo-border shadow-xs text-bravo-accent">
                <stat.icon size={22} className={stat.color} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Active Orders List (Full width, grid) */}
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs tracking-widest text-bravo-text uppercase flex items-center gap-2">
              <Palette size={16} className="text-bravo-accent" />
              Trabajos en Producción ({activeOrders.length})
            </h3>
            {activeOrders.length > 6 && (
              <button
                type="button"
                onClick={() => navigate('/bravo')} // o a ordenes de bravo
                className="text-xs text-bravo-accent hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                Ver todos <ArrowRight size={12} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white/40 border border-bravo-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="bg-bravo-card border border-bravo-border rounded-2xl p-10 text-center flex flex-col items-center shadow-md">
              <div className="w-14 h-14 rounded-full bg-bravo-accent/12 border border-bravo-accent/25 flex items-center justify-center mb-4">
                <Palette size={26} className="text-bravo-accent/60" />
              </div>
              <p className="text-stone-400 text-sm font-semibold">No hay trabajos activos de personalización</p>
              <p className="text-stone-600 text-xs mt-1">Comienza agregando un nuevo proyecto al estudio</p>
              <button
                onClick={() => navigate('/bravo/orders/new')}
                className="mt-5 px-5 py-2.5 bg-gradient-to-r from-bravo-accent to-bravo-accent-warm hover:from-amber-600 hover:to-orange-700 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-accent-warm/20"
              >
                Crear Primera Orden
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOrders.slice(0, 6).map((order) => {
                const deliveryDate = order.estimated_delivery
                  ? new Date(order.estimated_delivery + 'T12:00:00')
                  : null
                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/repairs/${order.id}`)}
                    className="bg-bravo-card border border-bravo-border hover:border-bravo-accent/35 hover:shadow-md hover:shadow-bravo-glow rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 cursor-pointer"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-bravo-accent font-mono tracking-wide">
                          {order.order_number}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_STYLES[order.status] || 'bg-stone-200 text-stone-600 border border-stone-300'}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <h4 className="text-[15px] font-bold text-bravo-text truncate capitalize">
                        {order.device_type} <span className="text-bravo-text-muted text-xs font-normal">| {order.brand} {order.model}</span>
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-bravo-text-muted">
                        <User size={12} className="text-bravo-text-muted" />
                        <span className="truncate">{order.client?.name || 'Cliente sin nombre'}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center shrink-0 pt-3 sm:pt-0 border-t border-bravo-border sm:border-0">
                      <p className="text-[15px] font-extrabold text-bravo-text">
                        ${Number(order.repair_cost || 0).toLocaleString('es-CL')}
                      </p>
                      {deliveryDate ? (
                        <p className="text-[10px] text-bravo-text-muted mt-1 flex items-center gap-1">
                          <Clock size={10} className="text-bravo-accent/70" />
                          Entrega: {deliveryDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </p>
                      ) : (
                        <p className="text-[10px] text-bravo-text-muted mt-1">Sin fecha fijada</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Delivery Calendar (Full width) */}
        <div className="space-y-4 text-left">
          <h3 className="font-bold text-xs tracking-widest text-bravo-text uppercase flex items-center gap-2">
            <CalendarIcon size={16} className="text-bravo-accent-warm" />
            Planificación y Entregas del Mes
          </h3>
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-1.5 overflow-hidden shadow-md">
            <DeliveryCalendar system="bravo" />
          </div>
        </div>
      </div>
    </BravoLayout>
  )
}
