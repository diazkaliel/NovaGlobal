import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, Wrench, ChevronRight, Calendar, Palette, Copy, Check, Trash2, PlusCircle, X } from 'lucide-react'
import { getClient, updateClient, deleteClient } from '../../api/clients'
import { getRepairs } from '../../api/repairs'
import { getBrandKits, createBrandKit, deleteBrandKit } from '../../api/bravoBlueprint'
import BravoBackground from '../../components/bravo/BravoBackground'

const STATUS_CONFIG_BRAVO = {
  recibido:            { label: 'Recibido',            dot: '#3a86ff', badge: 'bg-blue-50/70 border-blue-200 text-blue-700' },
  diagnostico:         { label: 'En Diseño',          dot: '#ffd166', badge: 'bg-yellow-50/70 border-yellow-200 text-yellow-800' },
  esperando_repuesto:  { label: 'Espera Insumos',      dot: '#f77f00', badge: 'bg-orange-50/70 border-orange-200 text-orange-700' },
  presupuesto_enviado: { label: 'Muestra Enviada',         dot: '#a855f7', badge: 'bg-purple-50/70 border-purple-200 text-purple-700' },
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
  const [brandKits, setBrandKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente de forma permanente? Esta acción no se puede deshacer.')) {
      try {
        setLoading(true)
        await deleteClient(id)
        navigate('/bravo/clients')
      } catch (err) {
        console.error(err)
        setError('No se pudo eliminar el cliente.')
        setLoading(false)
      }
    }
  }
  
  // Brand Kit states
  const [copiedColor, setCopiedColor] = useState(null)
  const [showAddKit, setShowAddKit] = useState(false)
  const [newKit, setNewKit] = useState({
    brand_name: '',
    colors: [{ name: 'Corporativo', hex: '#1E3A8A', pantone: '286 C' }],
    typographies: [{ usage: 'Títulos', font_family: 'Montserrat', source: 'Google Fonts' }],
    guidelines: ''
  })

  const fetchClientData = async () => {
    try {
      setLoading(true)
      const [clientRes, repairsRes, brandKitsRes] = await Promise.all([
        getClient(id),
        getRepairs({ client_id: id, system: 'bravo' }),
        getBrandKits(id)
      ])
      const clientData = clientRes.data
      // Mapear campos de base de datos a terminología de Bravo
      clientData.dni = clientData.rut
      clientData.contact_description = clientData.city
      setClient(clientData)
      setRepairs(repairsRes.data)
      setBrandKits(brandKitsRes.data)
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

  const handleCopyColor = (hex) => {
    navigator.clipboard.writeText(hex)
    setCopiedColor(hex)
    setTimeout(() => setCopiedColor(null), 1800)
  }

  const handleCreateBrandKit = async (e) => {
    e.preventDefault()
    if (!newKit.brand_name) return
    try {
      await createBrandKit({
        client_id: parseInt(id),
        ...newKit
      })
      setNewKit({
        brand_name: '',
        colors: [{ name: 'Corporativo', hex: '#1E3A8A', pantone: '286 C' }],
        typographies: [{ usage: 'Títulos', font_family: 'Montserrat', source: 'Google Fonts' }],
        guidelines: ''
      })
      setShowAddKit(false)
      fetchClientData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || 'Error al guardar la identidad de marca.')
    }
  }

  const handleDeleteBrandKit = async (kitId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este Brand Kit?')) {
      try {
        await deleteBrandKit(kitId)
        fetchClientData()
      } catch (err) {
        console.error(err)
        alert('Error al eliminar la identidad de marca.')
      }
    }
  }

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

            <div className="flex gap-2 justify-center mt-4 border-t border-bravo-border/60 pt-4">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3.5 py-1.5 bg-white border border-bravo-border hover:border-stone-300 text-bravo-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="px-3.5 py-1.5 bg-white border border-bravo-border hover:border-red-500/40 text-red-500 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Eliminar
              </button>
            </div>
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

          {/* 2. Biblioteca de Perfiles de Marca (Brand Kits) */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-xs mt-4">
            <div className="flex justify-between items-center border-b border-stone-200/60 pb-3.5 mb-4.5">
              <h3 className="text-sm font-black text-bravo-text uppercase tracking-widest flex items-center gap-2">
                <Palette size={16} className="text-bravo-accent" />
                Identidades de Marca (Brand Kits)
              </h3>
              <button
                onClick={() => setShowAddKit(true)}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-900 bg-[#f4ebd9] hover:bg-[#ebdcb9] border border-bravo-accent/15 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <PlusCircle size={12} />
                Nuevo Kit
              </button>
            </div>

            {brandKits.length === 0 ? (
              <div className="text-center py-10 text-bravo-text-muted italic bg-stone-50 border border-dashed border-bravo-border rounded-xl text-xs">
                Sin identidades de marca registradas. Agrega los códigos cromáticos y tipografías para asegurar la consistencia del diseño.
              </div>
            ) : (
              <div className="space-y-6">
                {brandKits.map(kit => (
                  <div key={kit.id} className="p-4 bg-white border border-bravo-border rounded-xl space-y-4 relative">
                    <button
                      onClick={() => handleDeleteBrandKit(kit.id)}
                      className="absolute top-3 right-3 p-1 text-stone-400 hover:text-red-600 rounded transition-colors"
                      title="Eliminar Brand Kit"
                    >
                      <Trash2 size={13} />
                    </button>

                    <div>
                      <h4 className="font-extrabold text-xs text-bravo-text uppercase tracking-wide">{kit.brand_name}</h4>
                      {kit.guidelines && (
                        <p className="text-[10px] text-bravo-text-muted mt-1 leading-relaxed">{kit.guidelines}</p>
                      )}
                    </div>

                    {/* Paleta Cromática */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Colores de Marca (Click para copiar)</span>
                      <div className="flex flex-wrap gap-2">
                        {kit.colors.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleCopyColor(c.hex)}
                            className="flex items-center gap-2 p-1.5 bg-stone-50 border border-stone-200/50 hover:border-amber-500/30 rounded-lg cursor-pointer transition-all hover:scale-102 group relative"
                            title={`Copiar ${c.hex}`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-stone-300"
                              style={{ backgroundColor: c.hex }}
                            />
                            <div className="text-[9px] pr-1.5 text-left leading-none">
                              <p className="font-bold text-stone-700">{c.name}</p>
                              <p className="font-mono text-stone-400 mt-0.5">{c.hex} {c.pantone ? `(${c.pantone})` : ''}</p>
                            </div>

                            {copiedColor === c.hex && (
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-stone-900 text-white text-[8px] rounded flex items-center gap-0.5 font-bold shadow">
                                <Check size={8} /> Copiado
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tipografías */}
                    <div className="space-y-1.5 border-t border-stone-100 pt-3">
                      <span className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Tipografías Autorizadas</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {kit.typographies.map((t, idx) => (
                          <div key={idx} className="p-2 bg-stone-50/50 border border-stone-150 rounded-lg text-left text-[10px]">
                            <p className="text-bravo-text-muted font-medium">{t.usage}</p>
                            <p className="font-bold text-bravo-text mt-0.5 font-mono">{t.font_family} <span className="text-[8px] text-stone-400 font-normal">({t.source})</span></p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ADD BRAND KIT */}
      {showAddKit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowAddKit(false)}>
          <div className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-bravo-border pb-3">
              <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider">Crear Perfil de Marca (Brand Kit)</h3>
              <button onClick={() => setShowAddKit(false)} className="p-1 hover:bg-bravo-sidebar rounded"><X size={15} /></button>
            </div>

            <form onSubmit={handleCreateBrandKit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Nombre de Marca *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Logo Corporativo Bravo"
                  value={newKit.brand_name}
                  onChange={e => setNewKit({ ...newKit, brand_name: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs focus:outline-none"
                />
              </div>

              {/* Color Único inicial */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Color Primario (Hex) *</label>
                  <input
                    type="text"
                    required
                    placeholder="#1E3A8A"
                    value={newKit.colors[0].hex}
                    onChange={e => {
                      const updated = [...newKit.colors]
                      updated[0].hex = e.target.value
                      setNewKit({ ...newKit, colors: updated })
                    }}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 px-3 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Pantone (Opc.)</label>
                  <input
                    type="text"
                    placeholder="286 C"
                    value={newKit.colors[0].pantone}
                    onChange={e => {
                      const updated = [...newKit.colors]
                      updated[0].pantone = e.target.value
                      setNewKit({ ...newKit, colors: updated })
                    }}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tipografía Única inicial */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Fuente Principal *</label>
                  <input
                    type="text"
                    required
                    placeholder="Montserrat"
                    value={newKit.typographies[0].font_family}
                    onChange={e => {
                      const updated = [...newKit.typographies]
                      updated[0].font_family = e.target.value
                      setNewKit({ ...newKit, typographies: updated })
                    }}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 px-3 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Uso tipografía</label>
                  <input
                    type="text"
                    value={newKit.typographies[0].usage}
                    onChange={e => {
                      const updated = [...newKit.typographies]
                      updated[0].usage = e.target.value
                      setNewKit({ ...newKit, typographies: updated })
                    }}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Restricciones / Directrices</label>
                <textarea
                  placeholder="Ej: No estampar en color negro directo. Margen mínimo de seguridad de 2 cm."
                  rows={2}
                  value={newKit.guidelines}
                  onChange={e => setNewKit({ ...newKit, guidelines: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
              >
                Guardar Kit de Marca
              </button>
            </form>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showEditModal && (
          <BravoEditClientModal
            client={client}
            onClose={() => setShowEditModal(false)}
            onUpdated={() => {
              setShowEditModal(false)
              fetchClientData()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function BravoEditClientModal({ client, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: client.name || '',
    phone: client.phone || '',
    email: client.email || '',
    dni: client.dni || '',
    contact_description: client.contact_description || ''
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
        rut: form.dni || null,
        city: form.contact_description || null,
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

  const modalInputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all placeholder-stone-400"

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
        className="bg-bravo-card border border-bravo-border backdrop-blur-xl shadow-xl text-bravo-text rounded-2xl p-6 w-full max-w-md text-left"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-bravo-text">Editar Cliente</h2>
          <button onClick={onClose} className="text-bravo-text-muted hover:text-bravo-text transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold">
              Nombre completo <span className="text-bravo-accent font-black">*</span>
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
            <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold">
              Teléfono <span className="text-bravo-accent font-black">*</span>
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
              <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold">RUT / DNI</label>
              <input
                value={form.dni}
                onChange={e => setForm({ ...form, dni: e.target.value })}
                placeholder="12.345.678-9"
                className={modalInputClass}
              />
            </div>
            <div>
              <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold">Ciudad</label>
              <input
                value={form.contact_description}
                onChange={e => setForm({ ...form, contact_description: e.target.value })}
                placeholder="Santiago"
                className={modalInputClass}
              />
            </div>
          </div>
          <div>
            <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="correo@email.com"
              className={modalInputClass}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-2.5 text-sm text-center font-medium bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl font-bold text-sm text-black cursor-pointer shadow-md shadow-amber-500/10"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}
