import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, Wrench, ChevronRight, Calendar, Palette, X } from 'lucide-react'
import { getClient, updateClient, deleteClient } from '../api/clients'
import { getRepairs } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente de forma permanente? Esta acción no se puede deshacer.')) {
      try {
        setLoading(true)
        await deleteClient(id)
        navigate('/clients')
      } catch (err) {
        console.error(err)
        setError('No se pudo eliminar el cliente.')
        setLoading(false)
      }
    }
  }

  const fetchClientData = async () => {
    try {
      setLoading(true)
      const system = localStorage.getItem('selected_system') || 'nova'
      const [clientRes, repairsRes] = await Promise.all([
        getClient(id),
        getRepairs({ client_id: id, system })
      ])
      setClient(clientRes.data)
      setRepairs(repairsRes.data)
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar la información del cliente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientData()
  }, [id])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  }

  const selectedSystem = 'nova'
  const isBravo = false

  // Estilo de estados de reparación
  const getStatusBadge = (status) => {
    if (isBravo) {
      const statuses = {
        recibido: 'bg-amber-50 text-amber-700 border-amber-200',
        diagnostico: 'bg-orange-50 text-orange-700 border-orange-200',
        esperando_repuesto: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        presupuesto_enviado: 'bg-amber-50/50 text-amber-755 border-amber-200/60',
        en_reparacion: 'bg-amber-100/70 text-amber-850 border-amber-200 shadow-xs',
        listo: 'bg-emerald-50 text-emerald-700 border-emerald-250',
        entregado: 'bg-stone-100 text-stone-600 border-stone-200',
        cancelado: 'bg-red-50 text-red-750 border-red-200'
      }
      return statuses[status] || 'bg-stone-100 text-stone-600 border-stone-200'
    } else {
      const statuses = {
        recibido: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        en_revision: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        presupuestado: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        reparado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        entregado: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        sin_arreglo: 'bg-red-500/10 text-red-400 border-red-500/20'
      }
      return statuses[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusLabel = (status) => {
    if (isBravo) {
      const labels = {
        recibido: 'Recibido',
        diagnostico: 'En Diseño',
        esperando_repuesto: 'Espera Insumos',
        presupuesto_enviado: 'Muestra Enviada',
        en_reparacion: 'En Producción',
        listo: 'Listo p/ Entrega',
        entregado: 'Entregado',
        cancelado: 'Cancelado',
      }
      return labels[status] || status.replace('_', ' ')
    } else {
      return status.replace('_', ' ')
    }
  }

  if (isBravo) {
    return (
      <>
        <div className="space-y-6 relative text-left">
          <BravoBackground />

          {/* Glow Effects */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

          {/* Page Header */}
          <div className="flex items-center gap-3 border-b border-bravo-border pb-5">
            <button
              onClick={() => navigate('/clients')}
              className="text-bravo-text-muted hover:text-bravo-text transition-colors p-1.5 hover:bg-stone-250/50 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-sm font-semibold tracking-widest text-bravo-accent uppercase">
                Ficha del Cliente
              </h1>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={() => navigate('/clients')}
                className="mt-4 text-bravo-accent hover:text-amber-550 text-sm transition-colors font-semibold cursor-pointer"
              >
                Volver a la lista
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Columna Izquierda: Información del Cliente */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 text-center shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-bravo-accent/12 border border-bravo-accent/25 flex items-center justify-center mx-auto mb-4">
                    <User size={30} className="text-amber-650" />
                  </div>
                  <h2 className="text-bravo-text font-bold text-lg">{client.name}</h2>
                  <p className="text-bravo-text-muted text-xs mt-1">ID: #{client.id}</p>
                </div>

                <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 space-y-4 shadow-xs">
                  <h3 className="text-bravo-text-muted text-xs uppercase tracking-wider font-bold mb-2">Datos de contacto</h3>
                  
                  <div className="flex items-start gap-3">
                    <Phone className="text-amber-650 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-bravo-text-muted text-[10px] uppercase">Teléfono</p>
                      <p className="text-bravo-text text-sm mt-0.5">{client.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="text-amber-650 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-bravo-text-muted text-[10px] uppercase">Email</p>
                      <p className="text-bravo-text text-sm mt-0.5 truncate max-w-[180px]">
                        {client.email || 'No registrado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CreditCard className="text-amber-650 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-bravo-text-muted text-[10px] uppercase">RUT / DNI</p>
                      <p className="text-bravo-text text-sm mt-0.5">{client.rut || 'No registrado'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="text-amber-650 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-bravo-text-muted text-[10px] uppercase">Ciudad</p>
                      <p className="text-bravo-text text-sm mt-0.5">{client.city || 'No registrado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Historial de Reparaciones */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-xs">
                  <h3 className="text-bravo-text font-bold text-base mb-4 flex items-center gap-2">
                    <Palette size={18} className="text-bravo-accent" />
                    Historial de Personalizaciones ({repairs.length})
                  </h3>

                  {repairs.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-bravo-border rounded-xl">
                      <p className="text-bravo-text-muted text-sm">Este cliente no registra trabajos en Bravo.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {repairs.map(rep => (
                        <div
                          key={rep.id}
                          onClick={() => navigate(`/repairs/${rep.id}`)}
                          className="bg-white/40 border border-bravo-border hover:border-stone-300 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-white/80"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-bravo-text font-semibold text-sm">
                                {rep.brand} {rep.model}
                              </span>
                              <span className="text-stone-300 text-xs">•</span>
                              <span className="text-bravo-accent font-mono text-xs">{rep.order_number}</span>
                            </div>
                            
                            <p className="text-bravo-text-muted text-xs line-clamp-1">{rep.reported_issue}</p>
                            
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-bravo-text-muted">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(rep.created_at).toLocaleDateString()}
                              </span>
                              {rep.repair_cost > 0 && (
                                <span>Costo: {formatCurrency(rep.repair_cost)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(rep.status)}`}>
                              {getStatusLabel(rep.status)}
                            </span>
                            <ChevronRight size={16} className="text-bravo-text-muted shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        .client-detail-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(95px);
        }
        .blob-purple { top: -10%; left: 20%; width: 400px; height: 400px; background: rgba(168,85,247,.035); }
        .blob-cyan { bottom: -10%; right: 20%; width: 400px; height: 400px; background: rgba(6,182,212,.035); }
      `}</style>

      <div className="client-detail-page">
        <AnimatedBackground />
        <div className="blob blob-purple" />
        <div className="blob blob-cyan" />

        {/* Navbar */}
        <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate('/clients')}
              className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-800/50 rounded-lg"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-sm font-semibold tracking-widest text-gray-300 uppercase">
              Ficha del Cliente
            </h1>
          </div>
        </nav>

        <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-red-500/5 border border-red-500/20 rounded-2xl">
              <p className="text-red-400 text-sm">{error}</p>
              <button 
                onClick={() => navigate('/clients')}
                className="mt-4 text-purple-400 hover:text-purple-300 text-sm transition-colors font-semibold"
              >
                Volver a la lista
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Columna Izquierda: Información del Cliente */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-gray-950/60 border border-gray-800/60 backdrop-blur-md rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <User size={30} className="text-purple-400" />
                  </div>
                  <h2 className="text-white font-bold text-lg">{client.name}</h2>
                  <p className="text-gray-500 text-xs mt-1">ID: #{client.id}</p>

                  <div className="flex gap-2 justify-center mt-4 border-t border-gray-800/40 pt-4">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-3.5 py-1.5 bg-gray-900 border border-gray-800 hover:border-purple-500/40 text-purple-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-3.5 py-1.5 bg-gray-900 border border-gray-800 hover:border-red-500/40 text-red-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="bg-gray-950/60 border border-gray-800/60 backdrop-blur-md rounded-2xl p-5 space-y-4 text-left">
                  <h3 className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">Datos de contacto</h3>
                  
                  <div className="flex items-start gap-3">
                    <Phone className="text-purple-400 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase">Teléfono</p>
                      <p className="text-white text-sm mt-0.5">{client.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="text-purple-400 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase">Email</p>
                      <p className="text-white text-sm mt-0.5 truncate max-w-[180px]">
                        {client.email || 'No registrado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CreditCard className="text-purple-400 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase">RUT / DNI</p>
                      <p className="text-white text-sm mt-0.5">{client.rut || 'No registrado'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="text-purple-400 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase">Ciudad</p>
                      <p className="text-white text-sm mt-0.5">{client.city || 'No registrado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Historial de Reparaciones */}
              <div className="md:col-span-2 space-y-4 text-left">
                <div className="bg-gray-950/60 border border-gray-800/60 backdrop-blur-md rounded-2xl p-6">
                  <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                    <Wrench size={18} className="text-cyan-400" />
                    Historial de Reparaciones ({repairs.length})
                  </h3>

                  {repairs.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-gray-800/80 rounded-xl">
                      <p className="text-gray-500 text-sm">Este cliente no registra reparaciones.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {repairs.map(rep => (
                        <div
                          key={rep.id}
                          onClick={() => navigate(`/repairs/${rep.id}`)}
                          className="bg-gray-900/40 border border-gray-800/50 hover:border-gray-700/80 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-gray-900/60"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">
                                {rep.brand} {rep.model}
                              </span>
                              <span className="text-gray-600 text-xs">•</span>
                              <span className="text-gray-500 text-xs">#{rep.order_number}</span>
                            </div>
                            
                            <p className="text-gray-400 text-xs line-clamp-1">{rep.reported_issue}</p>
                            
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(rep.created_at).toLocaleDateString()}
                              </span>
                              {rep.repair_cost > 0 && (
                                <span>Costo: {formatCurrency(rep.repair_cost)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(rep.status)}`}>
                              {rep.status.replace('_', ' ')}
                            </span>
                            <ChevronRight size={16} className="text-gray-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <EditClientModal
            client={client}
            onClose={() => setShowEditModal(false)}
            onUpdated={() => {
              setShowEditModal(false)
              fetchClientData()
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function EditClientModal({ client, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: client.name || '',
    phone: client.phone || '',
    email: client.email || '',
    rut: client.rut || '',
    city: client.city || ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        rut: form.rut || null,
        city: form.city || null,
      }
      await updateClient(client.id, payload)
      onUpdated()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al actualizar el cliente')
    } finally {
      setLoading(false)
    }
  }

  const modalInputClass = "w-full bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus:border-purple-500/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-950 border border-gray-800 text-white rounded-2xl p-6 w-full max-w-md text-left"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Editar Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
              Nombre completo <span className="text-purple-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Pérez"
              required
              className={modalInputClass}
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">
              Teléfono <span className="text-purple-500">*</span>
            </label>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+56 9 1234 5678"
              required
              className={modalInputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">RUT</label>
              <input
                value={form.rut}
                onChange={e => setForm({ ...form, rut: e.target.value })}
                placeholder="12.345.678-9"
                className={modalInputClass}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">Ciudad</label>
              <input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Santiago"
                className={modalInputClass}
              />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs tracking-wider uppercase block mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="correo@email.com"
              className={modalInputClass}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-2.5 text-sm text-center font-medium bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl font-bold text-sm text-white cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--color-purple-400), var(--color-cyan-400))' }}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}
