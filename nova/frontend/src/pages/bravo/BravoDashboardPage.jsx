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
  recibido: 'bg-amber-900/10 text-amber-500 border border-amber-900/30',
  diagnostico: 'bg-orange-950/20 text-orange-400 border border-orange-900/30',
  esperando_repuesto: 'bg-amber-950/20 text-yellow-600 border border-amber-900/20',
  presupuesto_enviado: 'bg-yellow-600/10 text-yellow-400 border border-yellow-600/20',
  en_reparacion: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.05)]',
  listo: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
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
      color: 'text-amber-400',
      bg: 'from-amber-950/20 to-stone-900/10 border-amber-500/10 hover:border-amber-500/25',
      desc: 'En diseño o producción'
    },
    {
      label: 'Productos Base',
      value: productsCount,
      icon: Package,
      color: 'text-orange-400',
      bg: 'from-orange-950/20 to-stone-900/10 border-orange-500/10 hover:border-orange-500/25',
      desc: 'Modelos personalizables'
    },
    {
      label: 'Entregados',
      value: orders.filter((o) => o.status === 'entregado').length,
      icon: CalendarIcon,
      color: 'text-yellow-400',
      bg: 'from-yellow-950/20 to-stone-900/10 border-yellow-500/10 hover:border-yellow-500/25',
      desc: 'Ordenes completadas'
    },
  ]

  return (
    <BravoLayout>
      <div className="space-y-8 relative">
        <BravoBackground />

        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1.5 border-b border-stone-900/80 pb-6 text-left"
        >
          <p className="text-[10px] font-bold tracking-widest text-amber-500/70 uppercase">
            Estudio de Personalizaciones Bravo
          </p>
          <h2 className="text-3xl font-black text-white leading-tight">
            Resumen del <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">Estudio</span>
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
              className={`border p-5 rounded-2xl flex items-center justify-between bg-gradient-to-br backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:shadow-amber-950/5 ${stat.bg}`}
            >
              <div>
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
                <p className="text-[10px] text-stone-400 mt-1">{stat.desc}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-850 shadow-inner text-amber-500">
                <stat.icon size={22} className={stat.color} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Active Orders List (Full width, grid) */}
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs tracking-widest text-stone-400 uppercase flex items-center gap-2">
              <Palette size={16} className="text-amber-400" />
              Trabajos en Producción ({activeOrders.length})
            </h3>
            {activeOrders.length > 6 && (
              <button
                type="button"
                onClick={() => navigate('/bravo')} // o a ordenes de bravo
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                Ver todos <ArrowRight size={12} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-stone-900/50 rounded-2xl animate-pulse border border-stone-900" />
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="bg-stone-950/40 border border-stone-900 rounded-2xl p-10 text-center flex flex-col items-center shadow-lg">
              <div className="w-14 h-14 rounded-full bg-amber-500/5 border border-amber-500/10 flex items-center justify-center mb-4">
                <Palette size={26} className="text-amber-500/50" />
              </div>
              <p className="text-stone-400 text-sm font-semibold">No hay trabajos activos de personalización</p>
              <p className="text-stone-600 text-xs mt-1">Comienza agregando un nuevo proyecto al estudio</p>
              <button
                onClick={() => navigate('/bravo/orders/new')}
                className="mt-5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-950/15"
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
                    className="bg-gradient-to-br from-stone-950/90 to-stone-900/40 border border-stone-900 hover:border-amber-500/20 hover:shadow-md hover:shadow-amber-950/5 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-500 font-mono tracking-wide">
                          {order.order_number}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_STYLES[order.status] || 'bg-stone-800 text-stone-400'}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <h4 className="text-[15px] font-bold text-stone-200 truncate capitalize">
                        {order.device_type} <span className="text-stone-500 text-xs font-normal">| {order.brand} {order.model}</span>
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <User size={12} className="text-stone-600" />
                        <span className="truncate">{order.client?.name || 'Cliente sin nombre'}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center shrink-0 pt-3 sm:pt-0 border-t border-stone-900/50 sm:border-0">
                      <p className="text-[15px] font-extrabold text-stone-200">
                        ${Number(order.repair_cost || 0).toLocaleString('es-CL')}
                      </p>
                      {deliveryDate ? (
                        <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                          <Clock size={10} className="text-amber-500/70" />
                          Entrega: {deliveryDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </p>
                      ) : (
                        <p className="text-[10px] text-stone-600 mt-1">Sin fecha fijada</p>
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
          <h3 className="font-bold text-xs tracking-widest text-stone-400 uppercase flex items-center gap-2">
            <CalendarIcon size={16} className="text-orange-400" />
            Planificación y Entregas del Mes
          </h3>
          <div className="bg-stone-950/60 border border-stone-900 rounded-2xl p-1.5 overflow-hidden shadow-lg">
            <DeliveryCalendar system="bravo" />
          </div>
        </div>
      </div>
    </BravoLayout>
  )
}
