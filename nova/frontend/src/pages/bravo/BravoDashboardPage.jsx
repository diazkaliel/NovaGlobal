import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Package, Calendar as CalendarIcon, Clock, ArrowRight, User, Sparkles, CheckCircle2, ChevronRight, AlertCircle, DollarSign, Image as ImageIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus } from '../../api/repairs'
import { getInventoryItems } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import DeliveryCalendar from '../../components/DeliveryCalendar'
import api from '../../api/client'

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

// Mapeo de columnas Kanban
const KANBAN_COLUMNS = [
  {
    id: 'design',
    title: '🎨 Diseño y Muestras',
    statuses: ['diagnostico', 'presupuesto_enviado'],
    color: 'border-orange-500/30 text-orange-400 bg-orange-950/10'
  },
  {
    id: 'waiting',
    title: '📦 Espera Materiales',
    statuses: ['esperando_repuesto'],
    color: 'border-yellow-500/30 text-yellow-400 bg-yellow-950/10'
  },
  {
    id: 'production',
    title: '⚡ En Producción',
    statuses: ['en_reparacion', 'recibido'],
    color: 'border-amber-500/30 text-amber-400 bg-amber-950/10'
  },
  {
    id: 'ready',
    title: '✅ Listo p/ Entrega',
    statuses: ['listo'],
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/10'
  }
]

export default function BravoDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [productsCount, setProductsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Estados para Modal de Entrega Rápida
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [delivering, setDelivering] = useState(false)
  const [actionError, setActionError] = useState('')

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

  useEffect(() => {
    fetchData()
  }, [])

  // Filtrar órdenes activas (excluye entregado y cancelado)
  const activeOrders = orders.filter(
    (o) => !['entregado', 'cancelado'].includes(o.status)
  )

  // Avanzar estado rápidamente
  const handleQuickAdvance = async (orderItem) => {
    setActionError('')
    let nextStatus = ''
    
    // Determinar siguiente paso lógico
    if (orderItem.status === 'diagnostico' || orderItem.status === 'presupuesto_enviado' || orderItem.status === 'esperando_repuesto' || orderItem.status === 'recibido') {
      nextStatus = 'en_reparacion'
    } else if (orderItem.status === 'en_reparacion') {
      nextStatus = 'listo'
    } else if (orderItem.status === 'listo') {
      // Si está listo y tiene saldo pendiente, abre modal. Si no, lo entrega directo.
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

    try {
      setLoading(true)
      await updateRepairStatus(orderItem.id, {
        new_status: nextStatus,
        note: `Estado avanzado rápidamente desde el Tablero Kanban`
      })
      await fetchData()
    } catch (err) {
      console.error(err)
      setActionError('No se pudo actualizar el estado de la orden.')
    } finally {
      setLoading(false)
    }
  }

  // Confirmar entrega en el modal (con cobro de saldo pendiente)
  const handleConfirmDelivery = async () => {
    if (!deliveryModalOrder) return
    setDelivering(true)
    setActionError('')
    try {
      const balance = parseFloat(deliveryModalOrder.repair_cost || 0) - parseFloat(deliveryModalOrder.deposit || 0)
      await updateRepairStatus(deliveryModalOrder.id, {
        new_status: 'entregado',
        note: `Pedido entregado y saldo pagado en Quillota.`,
        payment_amount: balance,
        payment_method: paymentMethod
      })
      setDeliveryModalOrder(null)
      await fetchData()
    } catch (err) {
      console.error(err)
      setActionError('Ocurrió un error al procesar el pago y entrega.')
    } finally {
      setDelivering(false)
    }
  }

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
  ]

  return (
    <>
      <div className="space-y-8 relative pb-16">
        <BravoBackground />

        {/* Efecto de resplandor futurista */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />

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
              <p className="text-[10px] font-black tracking-widest text-bravo-accent uppercase font-mono">
                Estudio de Personalizaciones Bravo
              </p>
              <h2 className="text-2xl font-black text-white leading-tight mt-1">
                ¡Hola de nuevo, <span className="bg-gradient-to-r from-bravo-accent to-amber-600 bg-clip-text text-transparent capitalize">{user?.username || 'Diseñador'}</span>!
              </h2>
              <p className="text-xs text-bravo-text-muted mt-1.5 max-w-lg">
                Gestiona tus proyectos de estampado y bordado en Quillota. Visualiza los estados en el tablero de taller.
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
                <p className="text-[10px] text-bravo-text-muted mt-1">{stat.desc}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-bravo-border shadow-xs text-bravo-accent">
                <stat.icon size={22} className={stat.color} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABLERO KANBAN DE TALLER */}
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs tracking-widest text-white uppercase flex items-center gap-2">
              <Palette size={16} className="text-bravo-accent" />
              Tablero de Procesos de Taller
            </h3>
            <button
              onClick={() => navigate('/bravo/orders')}
              className="text-xs text-bravo-accent hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Listado de Órdenes <ArrowRight size={12} />
            </button>
          </div>

          {actionError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} />
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-64">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {KANBAN_COLUMNS.map(col => {
                // Filtrar órdenes que correspondan a los estados de esta columna
                const colOrders = activeOrders.filter(o => col.statuses.includes(o.status))

                return (
                  <div key={col.id} className="bg-zinc-950/40 border border-bravo-border/60 rounded-2xl p-4 flex flex-col min-h-[400px] shadow-lg backdrop-blur-xs">
                    {/* Encabezado de la columna */}
                    <div className={`p-2 rounded-xl border text-xs font-extrabold mb-3 flex items-center justify-between ${col.color}`}>
                      <span>{col.title}</span>
                      <span className="bg-black/30 px-2 py-0.5 rounded-full text-[10px]">{colOrders.length}</span>
                    </div>

                    {/* Lista de Tarjetas */}
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-[500px] pr-0.5">
                      {colOrders.length === 0 ? (
                        <div className="h-24 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-center p-4">
                          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">Vacío</p>
                        </div>
                      ) : (
                        colOrders.map(order => {
                          const balance = parseFloat(order.repair_cost || 0) - parseFloat(order.deposit || 0)
                          return (
                            <motion.div
                              layoutId={`card-${order.id}`}
                              key={order.id}
                              className="bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 rounded-xl p-3.5 space-y-3 shadow-md hover:shadow-bravo-glow/5 transition-all cursor-pointer group relative overflow-hidden"
                              onClick={() => navigate(`/bravo/orders/${order.id}`)}
                            >
                              {/* Decoración superior neón */}
                              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bravo-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                              {/* Boceto miniatura si existe */}
                              {order.design_file_url && (
                                <div className="w-full h-24 rounded-lg overflow-hidden border border-zinc-800 relative mb-1.5 shrink-0 bg-black flex items-center justify-center">
                                  <img
                                    src={order.design_file_url.startsWith('http') ? order.design_file_url : `${api.defaults.baseURL}${order.design_file_url}`}
                                    alt="Boceto"
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                  />
                                  <div className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-lg border border-zinc-800/80">
                                    <ImageIcon size={10} className="text-bravo-accent" />
                                  </div>
                                </div>
                              )}

                              {/* Identificación de Orden */}
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold font-mono text-bravo-accent uppercase tracking-wide">
                                  {order.order_number}
                                </span>
                                <span className="text-[9px] text-zinc-500">
                                  {order.print_technique ? order.print_technique.toUpperCase() : 'ESTAMPADO'}
                                </span>
                              </div>

                              {/* Detalles */}
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-white leading-tight capitalize truncate">
                                  {order.model}
                                </h4>
                                <p className="text-[10px] text-bravo-text-muted truncate capitalize">
                                  {order.device_type} · {order.brand}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] text-zinc-400 truncate pt-1 border-t border-zinc-800/50">
                                  <User size={10} className="text-zinc-500 shrink-0" />
                                  <span className="truncate">{order.client?.name}</span>
                                </div>
                              </div>

                              {/* Saldo y Acción Rápida */}
                              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 gap-2">
                                <div className="text-left shrink-0">
                                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Saldo</p>
                                  <p className={`text-xs font-bold font-mono ${balance > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                    ${balance.toLocaleString('es-CL')}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleQuickAdvance(order)
                                  }}
                                  className="h-7 px-2.5 bg-zinc-800 hover:bg-bravo-accent text-zinc-400 hover:text-black rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-zinc-700/60 hover:border-bravo-accent hover:shadow-md hover:shadow-bravo-glow/20"
                                >
                                  {order.status === 'listo' ? 'Entregar' : 'Avanzar'}
                                  <ChevronRight size={10} />
                                </button>
                              </div>
                            </motion.div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Calendario de entregas mensual */}
        <div className="space-y-4 text-left">
          <h3 className="font-bold text-xs tracking-widest text-white uppercase flex items-center gap-2">
            <CalendarIcon size={16} className="text-bravo-accent-warm" />
            Planificación y Entregas del Mes (Quillota)
          </h3>
          <div className="bg-zinc-950/40 border border-bravo-border/60 rounded-3xl p-2 overflow-hidden shadow-lg backdrop-blur-md">
            <DeliveryCalendar system="bravo" />
          </div>
        </div>
      </div>

      {/* MODAL DE ENTREGA RÁPIDA (CON SALDO PENDIENTE) */}
      <AnimatePresence>
        {deliveryModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Fondo translúcido */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeliveryModalOrder(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Ventana Modal */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-zinc-900 border border-bravo-accent/40 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl text-left"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <CheckCircle2 className="text-emerald-400" size={22} />
                  <h3 className="text-base font-black text-white">Registrar Pago y Entrega</h3>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">
                    Estás entregando el pedido <strong className="text-white">{deliveryModalOrder.order_number}</strong> ({deliveryModalOrder.model}) de <strong className="text-white">{deliveryModalOrder.client?.name}</strong>.
                  </p>

                  {/* Resumen Financiero */}
                  <div className="bg-black/40 border border-zinc-800 p-4 rounded-2xl space-y-2.5">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Costo Total:</span>
                      <span className="font-mono text-white">${parseFloat(deliveryModalOrder.repair_cost || 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Abono Recibido:</span>
                      <span className="font-mono text-white">${parseFloat(deliveryModalOrder.deposit || 0).toLocaleString('es-CL')}</span>
                    </div>
                    <hr className="border-zinc-800" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase">Saldo por Pagar:</span>
                      <span className="text-lg font-black font-mono text-orange-500">
                        ${(parseFloat(deliveryModalOrder.repair_cost || 0) - parseFloat(deliveryModalOrder.deposit || 0)).toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Método de pago */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-bravo-text-muted font-bold block">Método de Pago del Saldo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['efectivo', 'transferencia', 'debito_credito'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer text-center ${
                          paymentMethod === method
                            ? 'bg-bravo-accent border-bravo-accent text-black font-black'
                            : 'bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800 mt-4">
                  <button
                    type="button"
                    onClick={() => setDeliveryModalOrder(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelivery}
                    disabled={delivering}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
                  >
                    {delivering ? 'Procesando...' : 'Confirmar Entrega'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
