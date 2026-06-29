import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, Wrench, ChevronRight, Calendar, Palette } from 'lucide-react'
import { getClient } from '../../api/clients'
import { getRepairs } from '../../api/repairs'
import BravoBackground from '../../components/bravo/BravoBackground'

const STATUS_CONFIG_BRAVO = {
  recibido:            { label: 'Recibido',            dot: '#3a86ff', badge: 'bg-blue-50/70 border-blue-200 text-blue-700' },
  diagnostico:         { label: 'En Diseño',          dot: '#ffd166', badge: 'bg-yellow-50/70 border-yellow-200 text-yellow-800' },
  esperando_repuesto:  { label: 'Espera Insumos',      dot: '#f77f00', badge: 'bg-orange-50/70 border-orange-200 text-orange-700' },
  presupuesto_enviado: { label: 'Muestra Muestra',         dot: '#a855f7', badge: 'bg-purple-50/70 border-purple-200 text-purple-700' },
  en_reparacion:       { label: 'En Producción',        dot: '#00d2de', badge: 'bg-cyan-50/70 border-cyan-200 text-cyan-800' },
  listo:               { label: 'Listo p/ Entrega',                dot: '#06d6a0', badge: 'bg-emerald-50/70 border-emerald-250 text-emerald-800' },
  entregado:           { label: 'Entregado',            dot: '#4a596e', badge: 'bg-stone-100 border-stone-200 text-stone-600' },
  cancelado:           { label: 'Cancelado',            dot: '#ff006e', badge: 'bg-red-50 border-red-200 text-red-700' },
  critico:             { label: 'Crítico 🚨',           dot: '#ff006e', badge: 'bg-rose-100 border-rose-200 text-rose-800 font-bold' },
}

export default function BravoClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchClientData = async () => {
    try {
      setLoading(true)
      const [clientRes, repairsRes] = await Promise.all([
        getClient(id),
        getRepairs({ client_id: id, system: 'bravo' })
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

  const getStatusBadge = (status) => {
    return STATUS_CONFIG_BRAVO[status]?.badge || 'bg-stone-100 border-stone-200 text-stone-600'
  }

  const getStatusLabel = (status) => {
    return STATUS_CONFIG_BRAVO[status]?.label || status
  }

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-bravo-accent/30 border-t-bravo-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="text-center py-20 bg-bravo-card border border-bravo-border rounded-2xl max-w-xl mx-auto">
        <p className="text-red-700 text-sm font-semibold">{error || 'Cliente no encontrado'}</p>
        <button onClick={() => navigate('/bravo/clients')} className="mt-4 text-bravo-accent font-bold text-xs uppercase tracking-wider">Volver a la lista</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative text-left">
      <BravoBackground />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-bravo-border pb-5">
        <button
          onClick={() => navigate('/bravo/clients')}
          className="text-bravo-text-muted hover:text-bravo-text transition-colors p-1.5 hover:bg-stone-200/50 rounded-lg cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-sm font-bold tracking-widest text-bravo-accent uppercase">
            Ficha del Cliente
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Client Info */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-bravo-accent/10 border border-bravo-accent/25 flex items-center justify-center mx-auto mb-4">
              <User size={30} className="text-amber-700" />
            </div>
            <h2 className="text-bravo-text font-black text-lg truncate" title={client.name}>{client.name}</h2>
            {client.dni && <p className="text-bravo-text-muted font-mono text-xs mt-1">RUT: {client.dni}</p>}
          </div>

          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 space-y-3.5 shadow-xs">
            <h3 className="text-[10px] font-black text-bravo-text uppercase tracking-wider border-b border-stone-200/50 pb-2">Información de Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-bravo-text">
                <Phone size={14} className="text-bravo-text-muted shrink-0" />
                <span className="truncate">{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2.5 text-xs text-bravo-text">
                  <Mail size={14} className="text-bravo-text-muted shrink-0" />
                  <span className="truncate" title={client.email}>{client.email}</span>
                </div>
              )}
              {client.city && (
                <div className="flex items-center gap-2.5 text-xs text-bravo-text">
                  <MapPin size={14} className="text-bravo-text-muted shrink-0" />
                  <span className="truncate">{client.city}</span>
                </div>
              )}
            </div>
          </div>

          {client.contact_description && (
            <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 shadow-xs">
              <h3 className="text-[10px] font-black text-bravo-text uppercase tracking-wider border-b border-stone-200/50 pb-2 mb-2">Nota Comercial</h3>
              <p className="text-xs text-bravo-text-muted leading-relaxed font-medium">{client.contact_description}</p>
            </div>
          )}
        </div>

        {/* Right Column: Order History */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-stone-200/60 pb-3.5 mb-4.5 flex items-center gap-2">
              <Palette size={16} className="text-bravo-accent" />
              Historial de Proyectos en el Estudio
            </h3>

            {repairs.length === 0 ? (
              <div className="text-center py-12 text-bravo-text-muted italic bg-stone-50 border border-dashed border-bravo-border rounded-xl">
                Este cliente no registra órdenes de trabajo activas en Bravo.
              </div>
            ) : (
              <div className="space-y-3">
                {repairs.map(rep => (
                  <div
                    key={rep.id}
                    onClick={() => navigate(`/bravo/orders/${rep.id}`)}
                    className="flex items-center justify-between p-4 bg-white border border-bravo-border hover:border-bravo-accent/40 rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
                  >
                    <div className="min-w-0 text-left space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-bravo-accent">{rep.order_number}</span>
                        <span className="text-[10px] font-bold text-bravo-text-muted capitalize">{rep.device_type}</span>
                      </div>
                      <h4 className="text-xs font-bold text-bravo-text capitalize">{rep.brand} {rep.model}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-bravo-text-muted mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(rep.created_at).toLocaleDateString()}
                        </span>
                        {rep.repair_cost > 0 && (
                          <span className="font-bold">Total: {formatCurrency(rep.repair_cost)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getStatusBadge(rep.status)}`}>
                        {getStatusLabel(rep.status)}
                      </span>
                      <ChevronRight size={16} className="text-bravo-text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
