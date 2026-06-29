import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, Wrench, ChevronRight, Calendar, Palette } from 'lucide-react'
import { getClient } from '../api/clients'
import { getRepairs } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    </>
  )
}
