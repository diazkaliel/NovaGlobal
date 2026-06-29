import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, User, Phone, Mail, MapPin, CreditCard,
  Wrench, ChevronRight, Calendar, Palette, X, Save, Edit2,
  Trash2, Download, AlertTriangle, Play, Check, CheckCircle2, History, Plus
} from 'lucide-react'
import { getRepair, updateRepair, deleteRepair, updateRepairStatus } from '../../api/repairs'
import { getInventoryItems, useItemsInRepair } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import WhatsAppButton from '../../components/WhatsAppButton'
import { generateRepairPDF } from '../../utils/generateRepairPDF'
import api from '../../api/client'

const STATUS_CONFIG_BRAVO = {
  recibido:            { label: 'Recibido',            dot: '#3a86ff', badge: 'bg-blue-50/70 border-blue-200 text-blue-700' },
  diagnostico:         { label: 'En Diseño',          dot: '#ffd166', badge: 'bg-yellow-50/70 border-yellow-200 text-yellow-800' },
  esperando_repuesto:  { label: 'Espera Insumos',      dot: '#f77f00', badge: 'bg-orange-50/70 border-orange-200 text-orange-700' },
  presupuesto_enviado: { label: 'Muestra Enviada',         dot: '#a855f7', badge: 'bg-purple-50/70 border-purple-200 text-purple-700' },
  en_reparacion:       { label: 'En Producción',        dot: '#00d2de', badge: 'bg-cyan-50/70 border-cyan-200 text-cyan-800 font-bold' },
  listo:               { label: 'Listo p/ Entrega',                dot: '#06d6a0', badge: 'bg-emerald-50/70 border-emerald-250 text-emerald-800 font-bold' },
  entregado:           { label: 'Entregado',            dot: '#4a596e', badge: 'bg-stone-100 border-stone-200 text-stone-600' },
  cancelado:           { label: 'Cancelado',            dot: '#ff006e', badge: 'bg-red-50 border-red-200 text-red-700' },
  critico:             { label: 'Crítico 🚨',           dot: '#ff006e', badge: 'bg-rose-100 border-rose-200 text-rose-800 font-black animate-pulse' },
}

const inputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all"

export default function BravoOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [repair, setRepair] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const history = repair?.history || []

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    device_type: '',
    brand: '',
    model: '',
    reported_issue: '',
    estimated_delivery: '',
    accessories: '',
    repair_cost: '',
    deposit: '',
    deposit_payment_method: '',
    final_payment_method: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    client_city: ''
  })

  // Material usage section state
  const [inventoryItems, setInventoryItems] = useState([])
  const [selectedSupply, setSelectedSupply] = useState('')
  const [supplyQuantity, setSupplyQuantity] = useState(1)
  const [addingSupply, setAddingSupply] = useState(false)

  const fetchRepair = async () => {
    try {
      setLoading(true)
      const res = await getRepair(id)
      setRepair(res.data)
      setClient(res.data.client)

      setFormData({
        device_type: res.data.device_type || '',
        brand: res.data.brand || '',
        model: res.data.model || '',
        reported_issue: res.data.reported_issue || '',
        estimated_delivery: res.data.estimated_delivery || '',
        accessories: res.data.accessories || '',
        repair_cost: res.data.repair_cost !== null ? res.data.repair_cost : '',
        deposit: res.data.deposit !== null ? res.data.deposit : '',
        deposit_payment_method: res.data.deposit_payment_method || 'efectivo',
        final_payment_method: res.data.final_payment_method || 'efectivo',
        client_name: res.data.client?.name || '',
        client_phone: res.data.client?.phone || '',
        client_email: res.data.client?.email || '',
        client_city: res.data.client?.city || ''
      })

      // Fetch inventory
      const [invRes] = await Promise.all([
        getInventoryItems({ system: 'bravo' })
      ])
      setInventoryItems(invRes.data)
    } catch (err) {
      console.error(err)
      setError('Error al obtener la información de la orden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepair()
  }, [id])

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente esta orden de trabajo? Esta acción es irreversible.`)) {
      try {
        await deleteRepair(id)
        navigate('/bravo/orders')
      } catch (err) {
        setError('Error al eliminar la orden de trabajo.')
      }
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await updateRepairStatus(id, newStatus)
      setSuccess('Estado actualizado con éxito.')
      setTimeout(() => setSuccess(''), 3000)
      fetchRepair()
    } catch (err) {
      setError('Error al actualizar el estado de la orden.')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const cost = formData.repair_cost === '' ? 0 : parseFloat(formData.repair_cost)
    const dep = formData.deposit === '' ? 0 : parseFloat(formData.deposit)

    if (cost < 0 || dep < 0) {
      setError('Los montos no pueden ser negativos.')
      setSaving(false)
      return
    }

    if (dep > cost) {
      setError('El abono no puede superar el valor total del trabajo.')
      setSaving(false)
      return
    }

    try {
      // 1. Update repair details
      await updateRepair(id, {
        device_type: formData.device_type,
        brand: formData.brand,
        model: formData.model,
        reported_issue: formData.reported_issue,
        repair_cost: cost,
        deposit: dep,
        deposit_payment_method: formData.deposit_payment_method || null,
        final_payment_method: formData.final_payment_method || null,
        estimated_delivery: formData.estimated_delivery || null,
        accessories: formData.accessories || null
      })

      // 2. Update client details
      if (repair.client_id) {
        await api.patch(`/clients/${repair.client_id}`, {
          name: formData.client_name,
          phone: formData.client_phone,
          email: formData.client_email || null,
          city: formData.client_city || null
        })
      }

      setSuccess('Orden y cliente actualizados con éxito.')
      setTimeout(() => setSuccess(''), 3500)
      setIsEditing(false)
      fetchRepair()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSupply = async () => {
    if (!selectedSupply) return
    setAddingSupply(true)
    setError('')
    try {
      await useItemsInRepair(id, [
        {
          item_id: selectedSupply,
          quantity: parseInt(supplyQuantity) || 1
        }
      ])
      setSuccess('Material asignado con éxito a la orden.')
      setTimeout(() => setSuccess(''), 3000)
      setSelectedSupply('')
      setSupplyQuantity(1)
      fetchRepair()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al descontar el material.')
    } finally {
      setAddingSupply(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-bravo-accent/30 border-t-bravo-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!repair) {
    return (
      <div className="text-center py-20 bg-bravo-card border border-bravo-border rounded-2xl">
        <p className="text-bravo-text-muted">No se pudo encontrar la orden de trabajo especificada.</p>
        <button onClick={() => navigate('/bravo/orders')} className="mt-4 text-bravo-accent font-bold">Volver</button>
      </div>
    )
  }

  const balance = (repair.repair_cost || 0) - (repair.deposit || 0)
  const activeCfg = STATUS_CONFIG_BRAVO[repair.status] ?? STATUS_CONFIG_BRAVO.recibido

  return (
    <div className="space-y-6 relative text-left">
      <BravoBackground />

      {/* Ambient glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

      {/* Success/Error Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="bg-bravo-card border border-bravo-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bravo/orders')}
            className="w-9 h-9 border border-bravo-border bg-white text-bravo-text-muted hover:text-bravo-text hover:border-stone-300 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-xs"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="text-base font-black font-mono tracking-wider text-bravo-accent flex items-center gap-2">
              {repair.order_number}
              {repair.status === 'critico' && <span className="bg-red-50 border border-red-200 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Crítico</span>}
            </div>
            <div className="text-[10px] text-bravo-text-muted mt-0.5">
              Registrado el {new Date(repair.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <StatusBadge status={repair.status} />

          <WhatsAppButton 
            phone={client?.phone} 
            clientName={client?.name} 
            orderNumber={repair.order_number} 
            status={repair.status}
            deviceLabel={`${repair.device_type} ${repair.brand} ${repair.model}`}
            customLabelMap={STATUS_LABELS_BRAVO}
            isBravo={true}
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-stone-300 transition-colors shadow-xs cursor-pointer"
            onClick={() => generateRepairPDF(repair, client)}
          >
            <Download size={13} />
            Imprimir Recibo
          </motion.button>

          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setIsEditing(false); setError(''); }}
                className="p-2 bg-white border border-bravo-border rounded-xl text-bravo-text-muted hover:text-bravo-text hover:border-stone-350 cursor-pointer shadow-xs"
                title="Cancelar Edición"
              >
                <X size={14} />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
              >
                <Save size={13} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-stone-300 cursor-pointer shadow-xs"
              >
                <Edit2 size={12} />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="p-2 border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 rounded-xl cursor-pointer"
                title="Eliminar Orden"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form / Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border pb-3.5 mb-4.5 flex items-center gap-2">
              <Palette size={16} className="text-bravo-accent" />
              Especificación del Proyecto
            </h2>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Tipo de Producto</label>
                    <input value={formData.device_type} onChange={e => setFormData({ ...formData, device_type: e.target.value })} className={inputClass} placeholder="Polera, Tazón..." />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Color / Tipo</label>
                    <input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className={inputClass} placeholder="Negra, Cerámica..." />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Modelo / Talla</label>
                    <input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className={inputClass} placeholder="Talla L, Mágica..." />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Especificaciones / Detalles del Diseño</label>
                  <textarea value={formData.reported_issue} onChange={e => setFormData({ ...formData, reported_issue: e.target.value })} className={`${inputClass} min-h-[90px]`} placeholder="Sublimado frontal con logo corporativo de 15x15cm..." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Fecha Entrega Estimada</label>
                    <input type="date" value={formData.estimated_delivery} onChange={e => setFormData({ ...formData, estimated_delivery: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Accesorios / Observación</label>
                    <input value={formData.accessories} onChange={e => setFormData({ ...formData, accessories: e.target.value })} className={inputClass} placeholder="Entrega con caja de regalo..." />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Producto</p>
                    <p className="text-sm font-bold text-bravo-text mt-0.5 capitalize">{repair.device_type}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Color / Base</p>
                    <p className="text-sm font-bold text-bravo-text mt-0.5 capitalize">{repair.brand}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Talla / Variante</p>
                    <p className="text-sm font-bold text-bravo-text mt-0.5 uppercase">{repair.model}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Detalles del Pedido</p>
                  <p className="text-xs text-bravo-text leading-relaxed bg-stone-50 border border-bravo-border p-3.5 rounded-xl mt-1.5">
                    {repair.reported_issue || 'Sin especificaciones añadidas'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Accesorios / Embalaje</p>
                    <p className="text-xs font-semibold text-bravo-text mt-0.5">{repair.accessories || 'Ninguno especificado'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Planificación de Entrega</p>
                    <p className="text-xs font-semibold text-bravo-text mt-0.5 flex items-center gap-1">
                      <Calendar size={12} className="text-bravo-accent" />
                      {repair.estimated_delivery ? new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No programada'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Used Supplies Section */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border pb-3.5 mb-4.5 flex items-center gap-2">
              <Wrench size={15} className="text-bravo-accent" />
              Insumos y Materiales Consumidos
            </h2>

            {/* List current used supplies */}
            {repair.usage_records?.length === 0 ? (
              <p className="text-xs text-bravo-text-muted italic bg-stone-50/50 p-4 border border-dashed border-bravo-border rounded-xl text-center">
                Aún no se han registrado insumos para esta orden.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {repair.usage_records?.map(rec => (
                  <div key={rec.id} className="flex justify-between items-center p-3 bg-stone-50 border border-bravo-border rounded-xl text-xs">
                    <span className="font-semibold text-bravo-text">{rec.inventory_item?.name}</span>
                    <span className="font-bold bg-stone-200 text-stone-700 px-2 py-0.5 rounded-lg">Cantidad: {rec.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Form to add supply */}
            <div className="bg-stone-50/40 p-4 rounded-xl border border-bravo-border flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 text-left">
                <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Insumo / Elemento físico</label>
                <select 
                  value={selectedSupply} 
                  onChange={e => setSelectedSupply(e.target.value)} 
                  className="w-full bg-white border border-bravo-border rounded-xl px-3 py-2 text-xs text-bravo-text"
                >
                  <option value="">-- Seleccionar insumo --</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (Stock: {item.stock})</option>
                  ))}
                </select>
              </div>

              <div className="w-24 text-left">
                <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Cantidad</label>
                <input 
                  type="number" 
                  min="1" 
                  value={supplyQuantity} 
                  onChange={e => setSupplyQuantity(e.target.value)} 
                  className="w-full bg-white border border-bravo-border rounded-xl px-3 py-2 text-xs text-bravo-text"
                />
              </div>

              <button
                type="button"
                onClick={handleAddSupply}
                disabled={addingSupply || !selectedSupply}
                className="px-4 py-2 bg-bravo-text text-white hover:bg-stone-850 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Status */}
        <div className="space-y-6">
          {/* Status logs */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border pb-3.5 mb-4">
              Control de Estado
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {Object.keys(STATUS_CONFIG_BRAVO).map(st => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`w-full text-left py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    repair.status === st 
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 font-extrabold shadow-sm'
                      : 'bg-white border-bravo-border text-bravo-text-muted hover:border-stone-300 hover:text-bravo-text'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG_BRAVO[st].dot }} />
                    {STATUS_CONFIG_BRAVO[st].label}
                  </span>
                  {repair.status === st && <Check size={12} className="text-amber-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Financials & Payments */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border pb-3.5 mb-4 flex items-center gap-2">
              <CreditCard size={15} className="text-bravo-accent" />
              Pagos y Presupuesto
            </h2>

            {isEditing ? (
              <div className="space-y-4.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1 block">Precio Total ($)</label>
                  <input type="number" min="0" value={formData.repair_cost} onChange={e => setFormData({ ...formData, repair_cost: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1 block">Abono Inicial ($)</label>
                  <input type="number" min="0" value={formData.deposit} onChange={e => setFormData({ ...formData, deposit: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Método Pago Abono</label>
                  <select value={formData.deposit_payment_method} onChange={e => setFormData({ ...formData, deposit_payment_method: e.target.value })} className="w-full bg-white border border-bravo-border rounded-xl px-3 py-2 text-xs text-bravo-text">
                    <option value="efectivo">Efectivo 💵</option>
                    <option value="transferencia">Transferencia 🏦</option>
                    <option value="tarjeta">Tarjeta 💳</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Método Pago Final</label>
                  <select value={formData.final_payment_method} onChange={e => setFormData({ ...formData, final_payment_method: e.target.value })} className="w-full bg-white border border-bravo-border rounded-xl px-3 py-2 text-xs text-bravo-text">
                    <option value="efectivo">Efectivo 💵</option>
                    <option value="transferencia">Transferencia 🏦</option>
                    <option value="tarjeta">Tarjeta 💳</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex justify-between border-b border-stone-200/50 pb-2">
                  <span className="text-xs text-bravo-text-muted">Valor Total</span>
                  <span className="text-sm font-black text-bravo-text">${Number(repair.repair_cost || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200/50 pb-2">
                  <span className="text-xs text-bravo-text-muted">Abono Inicial</span>
                  <div>
                    <span className="text-sm font-bold text-stone-750">${Number(repair.deposit || 0).toLocaleString('es-CL')}</span>
                    {repair.deposit > 0 && (
                      <span className="text-[9px] uppercase tracking-wider text-bravo-accent font-bold block text-right mt-0.5 capitalize">
                        {repair.deposit_payment_method || 'efectivo'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-xs font-bold text-bravo-text">Saldo Restante</span>
                  <div className="text-right">
                    <span className={`text-base font-black ${balance > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                      ${balance.toLocaleString('es-CL')}
                    </span>
                    {balance === 0 && repair.final_payment_method && (
                      <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold block mt-0.5 capitalize">
                        Pagado ({repair.final_payment_method})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Client Details */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-sm text-left">
            <h2 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border pb-3.5 mb-4 flex items-center gap-2">
              <User size={15} className="text-bravo-accent" />
              Datos del Cliente
            </h2>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1 block">Nombre</label>
                  <input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1 block">Teléfono / WhatsApp</label>
                  <input value={formData.client_phone} onChange={e => setFormData({ ...formData, client_phone: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1 block">Correo Electrónico</label>
                  <input type="email" value={formData.client_email} onChange={e => setFormData({ ...formData, client_email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1 block">Ciudad / Comuna</label>
                  <input value={formData.client_city} onChange={e => setFormData({ ...formData, client_city: e.target.value })} className={inputClass} />
                </div>
              </div>
            ) : client ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <User size={14} className="text-bravo-text-muted shrink-0" />
                  <span className="text-xs font-bold text-bravo-text truncate">{client.name}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-bravo-text-muted shrink-0" />
                  <span className="text-xs text-bravo-text truncate">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail size={14} className="text-bravo-text-muted shrink-0" />
                    <span className="text-xs text-bravo-text truncate">{client.email}</span>
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className="text-bravo-text-muted shrink-0" />
                    <span className="text-xs text-bravo-text truncate">{client.city}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-bravo-text-muted italic text-center">No hay cliente registrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
