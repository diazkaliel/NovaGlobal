import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, User, Phone, Mail, MapPin, CreditCard,
  Wrench, ChevronRight, Calendar, Palette, X, Save, Edit2,
  Trash2, Download, AlertTriangle, Play, Check, CheckCircle2, History, Plus, Upload, Printer
} from 'lucide-react'
import { getRepair, updateRepair, deleteRepair, updateRepairStatus } from '../../api/repairs'
import { getInventoryItems, useItemsInRepair } from '../../api/inventory'
import { splitOrder, getBrandKits, createQAInspection, getQAInspection } from '../../api/bravoBlueprint'
import BravoBackground from '../../components/bravo/BravoBackground'
import WhatsAppButton from '../../components/WhatsAppButton'
import { generateBravoClientPDF, generateBravoProductionPDF } from '../../utils/generateBravoPDF'
import api from '../../api/client'
import JsBarcode from 'jsbarcode'

const STATUS_CONFIG_BRAVO = {
  recibido:            { label: 'Recibido',            dot: '#3a86ff', badge: 'bg-blue-950/40 border-blue-500/30 text-blue-400' },
  diagnostico:         { label: 'En Diseño',          dot: '#ffd166', badge: 'bg-yellow-950/40 border-yellow-500/30 text-yellow-400' },
  presupuesto_enviado: { label: 'Muestra Enviada',         dot: '#a855f7', badge: 'bg-purple-950/40 border-purple-500/30 text-purple-400' },
  diseno_aprobado:     { label: 'Diseño Aprobado',     dot: '#ec4899', badge: 'bg-pink-950/40 border-pink-500/30 text-pink-400' },
  esperando_repuesto:  { label: 'Espera Insumos',      dot: '#f77f00', badge: 'bg-orange-950/40 border-orange-500/30 text-orange-400' },
  en_reparacion:       { label: 'En Producción',        dot: '#00d2de', badge: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 font-bold' },
  listo:               { label: 'Listo p/ Entrega',                dot: '#06d6a0', badge: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 font-bold' },
  entregado:           { label: 'Entregado',            dot: '#4a596e', badge: 'bg-stone-900 border-stone-850 text-stone-400' },
  cancelado:           { label: 'Cancelado',            dot: '#ff006e', badge: 'bg-red-950/40 border-red-500/30 text-red-400' },
  critico:             { label: 'Crítico 🚨',           dot: '#ff006e', badge: 'bg-rose-950/60 border-rose-500/40 text-rose-400 font-black animate-pulse' },
  en_garantia:         { label: 'En Garantía',          dot: '#ec4899', badge: 'bg-pink-950/40 border-pink-500/30 text-pink-400 font-bold' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG_BRAVO[status] ?? STATUS_CONFIG_BRAVO.recibido
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${cfg.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  )
}

const STATUS_LABELS_BRAVO = {
  recibido:            'Recibido',
  diagnostico:         'En Diseño',
  presupuesto_enviado: 'Muestra Enviada',
  diseno_aprobado:     'Diseño Aprobado',
  esperando_repuesto:  'Espera Insumos',
  en_reparacion:       'En Producción',
  listo:               'Listo p/ Entrega',
  entregado:           'Entregado',
  cancelado:           'Cancelado',
}

const getChecklistTemplate = (deviceType, technique) => {
  const isMugOrBottle = ['tazon', 'botella', 'taza', 'mug', 'termo'].includes(String(deviceType || '').toLowerCase());
  const isEmbroidery = String(technique || '').toLowerCase() === 'bordado';
  
  if (isMugOrBottle) {
    return {
      sin_burbujas: { label: 'Sin Burbujas / Pliegues', desc: 'Sublimación uniforme sin burbujas de aire ni pliegues.' },
      centrado_correcto: { label: 'Centrado del Diseño', desc: 'Diseño perfectamente alineado según las especificaciones.' },
      brillo_esmalte: { label: 'Brillo y Esmalte', desc: 'Superficie brillante, colores vibrantes y sin opacidades.' },
      empaque_protector: { label: 'Empaque de Protección', desc: 'Empacado en caja individual con burbujas protectoras.' }
    };
  } else if (isEmbroidery) {
    return {
      tension_hilo: { label: 'Tensión del Hilo', desc: 'Bordado plano sin bucles sueltos ni fruncido de tela.' },
      hilos_cortados: { label: 'Limpieza de Hilos', desc: 'Hilos sobrantes cortados y entretela limpia en el reverso.' },
      sin_arrugas: { label: 'Sin Arrugas de Bastidor', desc: 'Tela libre de marcas pronunciadas o arrugas del bastidor.' },
      empaque_correcto: { label: 'Empaque y Rotulado', desc: 'Doblado y empaquetado en bolsa protectora con etiqueta legible.' }
    };
  } else {
    return {
      hilos_cortados: { label: 'Limpieza de Hilos', desc: 'Hilos sobrantes y costuras auxiliares removidos por completo.' },
      sin_manchas: { label: 'Inspección de Superficie', desc: 'Prenda limpia, libre de manchas de tinta o grasa de plancha.' },
      curado_temperatura: { label: 'Curado / Fijación', desc: 'Fijación térmica completa (sin desprendimientos al tacto).' },
      empaque_correcto: { label: 'Empaque y Rotulado', desc: 'Doblado y empaquetado en bolsa protectora con etiqueta legible.' }
    };
  }
};

const inputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all"

export function printRepairSticker(repair, client, isBravo = true) {
  if (!repair) return

  const clientName = client?.name || repair.client?.name || 'Cliente'
  const brand = repair.brand || ''
  const model = repair.model || ''
  const orderNumber = repair.order_number || ''
  const title = isBravo ? 'BRAVO' : 'NOVA GLOBAL'

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(`
    <html>
      <head>
        <title>Imprimir Sticker</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 3mm 4mm;
            font-family: 'Inter', system-ui, sans-serif;
            background: white;
            color: black;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            width: 62mm;
            height: 29mm;
            overflow: hidden;
          }
          .header-title {
            font-size: 7.5px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #000000;
            margin-bottom: 1px;
          }
          .order-id {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: -0.01em;
            line-height: 1.1;
            margin-bottom: 1px;
          }
          .meta-text {
            font-size: 9px;
            font-weight: 700;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          .device-text {
            font-size: 8px;
            font-weight: 500;
            color: #374151;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            margin-bottom: 2px;
          }
          .barcode-box {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 25px;
          }
          #barcode {
            max-width: 100%;
            height: 25px;
          }
        </style>
      </head>
      <body>
        <div class="header-title">${title}</div>
        <div class="order-id">${orderNumber}</div>
        <div class="meta-text">${clientName}</div>
        <div class="device-text">${brand} ${model}</div>
        <div class="barcode-box">
          <svg id="barcode"></svg>
        </div>
      </body>
    </html>
  `)
  doc.close()

  const svgEl = doc.getElementById('barcode')
  if (svgEl) {
    try {
      JsBarcode(svgEl, orderNumber, {
        format: 'CODE128',
        width: 1.3,
        height: 25,
        displayValue: false,
        margin: 0
      })
    } catch (e) {
      console.error('Error generando el código de barras en el sticker:', e)
    }
  }

  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('Error disparando la impresión:', e)
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      }, 1500)
    }
  }, 350)
}

export default function BravoOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [repair, setRepair] = useState(null)
  const [client, setClient] = useState(null)
  const [brandKits, setBrandKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // QA and Split modal states
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showQAModal, setShowQAModal] = useState(false)
  const [qaChecklist, setQaChecklist] = useState({
    hilos_cortados: false,
    sin_manchas: false,
    curado_temperatura: false,
    empaque_correcto: false
  })
  const [qaComments, setQaComments] = useState('')
  const [qaPassed, setQaPassed] = useState(false)
  const [qaApprovedRecord, setQaApprovedRecord] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [splitRatio, setSplitRatio] = useState(0.5)

  const history = repair?.history || []

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Lightbox de Boceto
  const [showImageLightbox, setShowImageLightbox] = useState(false)
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
    client_city: '',
    print_technique: '',
    print_location: '',
    print_dimensions: '',
    design_file_url: ''
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
        client_city: res.data.client?.city || '',
        print_technique: res.data.print_technique || 'vinilo',
        print_location: res.data.print_location || '',
        print_dimensions: res.data.print_dimensions || '',
        design_file_url: res.data.design_file_url || ''
      })

      // Fetch inventory, Brand Kits, and QA inspection records
      try {
        const [invRes, brandKitsRes] = await Promise.all([
          getInventoryItems({ system: 'bravo' }),
          getBrandKits(res.data.client_id)
        ])
        setInventoryItems(invRes.data)
        setBrandKits(brandKitsRes.data)
      } catch (err) {
        console.error('Error fetching support data:', err)
      }

      try {
        const qaRes = await getQAInspection(id)
        setQaApprovedRecord(qaRes.data)
        if (qaRes.data) {
          setQaChecklist(qaRes.data.checklist_results)
          setQaComments(qaRes.data.comments || '')
          setQaPassed(qaRes.data.passed)
        } else {
          const template = getChecklistTemplate(res.data.device_type, res.data.print_technique);
          const initialChecklist = {};
          Object.keys(template).forEach(key => {
            initialChecklist[key] = false;
          });
          setQaChecklist(initialChecklist);
        }
      } catch (err) {
        const template = getChecklistTemplate(res.data.device_type, res.data.print_technique);
        const initialChecklist = {};
        Object.keys(template).forEach(key => {
          initialChecklist[key] = false;
        });
        setQaChecklist(initialChecklist);
        setQaApprovedRecord(null)
      }
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
    if (newStatus === 'listo' && (!qaApprovedRecord || !qaApprovedRecord.passed)) {
      setError('Acción Bloqueada. Debes completar y aprobar el Control de Calidad (QA) antes de marcar el pedido como Listo.')
      setShowQAModal(true)
      return
    }

    if (newStatus === 'entregado') {
      const cost = parseFloat(repair?.repair_cost || 0)
      const dep = parseFloat(repair?.deposit || 0)
      setPaymentAmount(Math.max(0, cost - dep).toString())
      setPaymentMethod('efectivo')
      setShowPaymentModal(true)
      return
    }

    setError('')
    try {
      await updateRepairStatus(id, { new_status: newStatus })
      setSuccess('Estado actualizado con éxito.')
      setTimeout(() => setSuccess(''), 3000)
      fetchRepair()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al actualizar el estado de la orden.')
    }
  }

  const handleDeliverConfirm = async () => {
    setError('')
    try {
      await updateRepairStatus(id, {
        new_status: 'entregado',
        payment_amount: parseFloat(paymentAmount || 0),
        payment_method: paymentMethod
      })
      setSuccess('Orden entregada con éxito.')
      setTimeout(() => setSuccess(''), 3000)
      setShowPaymentModal(false)
      fetchRepair()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al entregar la orden.')
    }
  }

  const handleSubmitQA = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const passed = Object.values(qaChecklist).every(val => val === true)
      const res = await createQAInspection({
        order_id: parseInt(id),
        checklist_results: qaChecklist,
        passed: passed,
        comments: qaComments
      })
      setQaApprovedRecord(res.data)
      setSuccess(passed ? '¡Checklist de QA Aprobado! Ya puedes marcar el pedido como Listo.' : 'Checklist de QA guardado (No Aprobado aún).')
      setShowQAModal(false)
      fetchRepair()
    } catch (err) {
      console.error(err)
      setError('Error al registrar el control de calidad.')
    }
  }

  const handleSplitOrder = async () => {
    setError('')
    setSuccess('')
    try {
      const res = await splitOrder(id, splitRatio)
      setSuccess(`¡Pedido dividido con éxito! Se ha generado el lote parcial ${res.data.order_number}.`)
      setShowSplitModal(false)
      fetchRepair()
    } catch (err) {
      console.error(err)
      setError('Error al dividir el pedido.')
    }
  }

  const [uploadingDesign, setUploadingDesign] = useState(false)

  const handleDesignUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingDesign(true)
    setError('')
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      const res = await api.post('/inventory/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFormData(prev => ({ ...prev, design_file_url: res.data.file_url }))
    } catch (err) {
      console.error(err)
      setError('Error al subir el archivo de diseño.')
    } finally {
      setUploadingDesign(false)
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
        accessories: formData.accessories || null,
        design_file_url: formData.design_file_url || null,
        print_technique: formData.print_technique || null,
        print_location: formData.print_location || null,
        print_dimensions: formData.print_dimensions || null
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
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="relative z-20 bg-bravo-card border border-bravo-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bravo/orders')}
            className="w-9 h-9 border border-bravo-border bg-bravo-input text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/40 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-xs"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="text-base font-black font-mono tracking-wider text-bravo-accent flex items-center gap-2">
              {repair.order_number}
              {repair.status === 'critico' && <span className="bg-rose-950/60 border border-rose-500/40 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse uppercase">Crítico 🚨</span>}
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-bravo-input border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/40 transition-colors shadow-xs cursor-pointer"
            onClick={() => generateBravoClientPDF(repair, client)}
            title="Exportar guía de recepción para el cliente"
          >
            <Download size={13} />
            Guía Cliente
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-bravo-input border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/40 transition-colors shadow-xs cursor-pointer"
            onClick={() => generateBravoProductionPDF(repair, client)}
            title="Exportar hoja de producción interna para taller"
          >
            <Wrench size={13} />
            Guía Producción
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bravo-input border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/40 transition-colors shadow-xs cursor-pointer"
            onClick={() => printRepairSticker(repair, client, true)}
            title="Imprimir sticker térmico para etiquetar equipo"
          >
            <Printer size={13} />
            Imprimir Sticker
          </motion.button>

          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setIsEditing(false); setError(''); }}
                className="p-2 bg-bravo-input border border-bravo-border rounded-xl text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/40 cursor-pointer shadow-xs"
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bravo-input border border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-bravo-accent/40 cursor-pointer shadow-xs"
              >
                <Edit2 size={12} />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="p-2 border border-rose-500/30 bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 rounded-xl cursor-pointer"
                title="Eliminar Orden"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Superior de 3 Columnas: Cliente, Estado y Finanzas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Bloque 1: Datos del Cliente */}
        <div className="bg-bravo-card/50 backdrop-blur-md border border-bravo-border/40 hover:border-bravo-accent/40 rounded-2xl p-5 shadow-xs transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.05)] flex flex-col justify-between h-full">
          <div>
            <h2 className="text-xs font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border/40 pb-2.5 mb-3.5 flex items-center gap-2">
              <User size={14} className="text-bravo-accent animate-float-gentle" />
              Datos del Cliente
            </h2>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Nombre</label>
                  <input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 hover:border-bravo-accent/30 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Teléfono / WhatsApp</label>
                  <input value={formData.client_phone} onChange={e => setFormData({ ...formData, client_phone: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 hover:border-bravo-accent/30 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Correo Electrónico</label>
                  <input type="email" value={formData.client_email} onChange={e => setFormData({ ...formData, client_email: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 hover:border-bravo-accent/30 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Ciudad / Comuna</label>
                  <input value={formData.client_city} onChange={e => setFormData({ ...formData, client_city: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 hover:border-bravo-accent/30 focus:border-bravo-accent rounded-xl px-3 py-1.5 text-xs text-bravo-text focus:outline-none transition-all" />
                </div>
              </div>
            ) : client ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2 bg-bravo-input/30 hover:bg-bravo-input/60 border border-bravo-border/20 rounded-xl transition-all">
                  <User size={13} className="text-bravo-accent shrink-0" />
                  <span className="text-xs font-extrabold text-bravo-text truncate">{client.name}</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-bravo-input/30 hover:bg-bravo-input/60 border border-bravo-border/20 rounded-xl transition-all">
                  <Phone size={13} className="text-bravo-text-muted shrink-0" />
                  <span className="text-xs text-bravo-text-muted truncate font-mono">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-3 p-2 bg-bravo-input/30 hover:bg-bravo-input/60 border border-bravo-border/20 rounded-xl transition-all">
                    <Mail size={13} className="text-bravo-text-muted shrink-0" />
                    <span className="text-xs text-bravo-text-muted truncate font-mono">{client.email}</span>
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center gap-3 p-2 bg-bravo-input/30 hover:bg-bravo-input/60 border border-bravo-border/20 rounded-xl transition-all">
                    <MapPin size={13} className="text-bravo-text-muted shrink-0" />
                    <span className="text-xs text-bravo-text-muted truncate">{client.city}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-bravo-text-muted italic text-center py-6 bg-bravo-input/20 border border-dashed border-bravo-border/30 rounded-xl">No hay cliente registrado</p>
            )}
          </div>
        </div>

        {/* Bloque 2: Control de Estado */}
        <div className="bg-bravo-card/50 backdrop-blur-md border border-bravo-border/40 hover:border-bravo-accent/40 rounded-2xl p-5 shadow-xs transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.05)] flex flex-col justify-between h-full">
          <div>
            <h2 className="text-xs font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border/40 pb-2.5 mb-3.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeCfg.dot, boxShadow: `0 0 8px ${activeCfg.dot}` }} />
              Control de Estado
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(STATUS_CONFIG_BRAVO).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`text-left py-1.5 px-2.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                    repair.status === st 
                      ? 'bg-bravo-accent/15 border-bravo-accent/40 text-bravo-accent font-black shadow-xs'
                      : 'bg-bravo-input/40 border-bravo-border/20 text-bravo-text-muted hover:border-bravo-accent/30 hover:text-bravo-text'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_CONFIG_BRAVO[st].dot }} />
                    <span className="truncate">{STATUS_CONFIG_BRAVO[st].label.replace(' 🚨', '')}</span>
                  </span>
                  {repair.status === st && <Check size={10} className="text-bravo-accent shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bloque 3: Pagos y Presupuesto */}
        <div className="bg-bravo-card/50 backdrop-blur-md border border-bravo-border/40 hover:border-bravo-accent/40 rounded-2xl p-5 shadow-xs transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.05)] flex flex-col justify-between h-full">
          <div>
            <h2 className="text-xs font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border/40 pb-2.5 mb-3.5 flex items-center gap-2">
              <CreditCard size={14} className="text-bravo-accent" />
              Pagos y Presupuesto
            </h2>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Precio Total ($)</label>
                  <input type="number" min="0" value={formData.repair_cost} onChange={e => setFormData({ ...formData, repair_cost: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 hover:border-bravo-accent/30 focus:border-bravo-accent rounded-xl px-2.5 py-1 text-xs text-bravo-text focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Abono Inicial ($)</label>
                  <input type="number" min="0" value={formData.deposit} onChange={e => setFormData({ ...formData, deposit: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 hover:border-bravo-accent/30 focus:border-bravo-accent rounded-xl px-2.5 py-1 text-xs text-bravo-text focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Método Abono</label>
                  <select value={formData.deposit_payment_method} onChange={e => setFormData({ ...formData, deposit_payment_method: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 rounded-xl px-2 py-1 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50">
                    <option value="efectivo">Efectivo 💵</option>
                    <option value="transferencia">Transferencia 🏦</option>
                    <option value="tarjeta">Tarjeta 💳</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Método Final</label>
                  <select value={formData.final_payment_method} onChange={e => setFormData({ ...formData, final_payment_method: e.target.value })} className="w-full bg-bravo-bg border border-bravo-border/50 rounded-xl px-2 py-1 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50">
                    <option value="efectivo">Efectivo 💵</option>
                    <option value="transferencia">Transferencia 🏦</option>
                    <option value="tarjeta">Tarjeta 💳</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-[11px] text-bravo-text-muted">Valor Total</span>
                  <span className="text-xs font-black text-white">${Number(repair.repair_cost || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-[11px] text-bravo-text-muted">Abono Inicial</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">${Number(repair.deposit || 0).toLocaleString('es-CL')}</span>
                    {repair.deposit > 0 && (
                      <span className="text-[8px] uppercase tracking-wider text-amber-500 font-extrabold block capitalize">
                        {repair.deposit_payment_method || 'efectivo'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Indicador neón destacado de saldo */}
                {balance > 0 ? (
                  <div className="py-2.5 px-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center shadow-lg relative overflow-hidden group">
                    <span className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5 -translate-x-full animate-shimmer-sweep" />
                    <p className="text-[8px] uppercase tracking-widest text-orange-400 font-black relative z-10">Saldo Pendiente</p>
                    <p className="text-base font-black font-mono text-orange-500 mt-0.5 relative z-10">${balance.toLocaleString('es-CL')}</p>
                  </div>
                ) : (
                  <div className="py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center shadow-sm">
                    <p className="text-[8px] uppercase tracking-widest text-emerald-400 font-black">¡Totalmente Pagado!</p>
                    <p className="text-base font-black font-mono text-emerald-400 mt-0.5">$0</p>
                  </div>
                )}
              </div>
            )}
          </div>
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

                {/* Campos de Ficha Técnica */}
                <div className="border-t border-bravo-border pt-4 mt-2 space-y-4 text-left">
                  <h3 className="text-xs font-bold text-bravo-text uppercase tracking-wide">Ficha Técnica de Estampado</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Técnica</label>
                      <select
                        value={formData.print_technique}
                        onChange={e => setFormData({ ...formData, print_technique: e.target.value })}
                        className={inputClass}
                      >
                        <option value="vinilo">Vinilo Textil</option>
                        <option value="sublimacion">Sublimación</option>
                        <option value="dtf">DTF (Direct to Film)</option>
                        <option value="bordado">Bordado</option>
                        <option value="serigrafia">Serigrafía</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Ubicación</label>
                      <input value={formData.print_location} onChange={e => setFormData({ ...formData, print_location: e.target.value })} className={inputClass} placeholder="Pecho, Espalda..." />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Dimensiones</label>
                      <input value={formData.print_dimensions} onChange={e => setFormData({ ...formData, print_dimensions: e.target.value })} className={inputClass} placeholder="15x15 cm..." />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-bravo-text-muted mb-1.5 block">Boceto del Diseño</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center gap-2 px-4 py-2 border border-bravo-border rounded-xl bg-bravo-input hover:bg-stone-900 cursor-pointer text-xs font-bold text-bravo-text transition-colors">
                        <Upload size={14} className="text-bravo-accent" />
                        {uploadingDesign ? 'Subiendo boceto...' : 'Cambiar Boceto'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDesignUpload}
                          disabled={uploadingDesign}
                          className="hidden"
                        />
                      </label>
                      
                      {formData.design_file_url && (
                        <div className="flex items-center gap-2 bg-bravo-input border border-bravo-border rounded-xl p-1.5 pr-3">
                          <img 
                            src={formData.design_file_url.startsWith('http') ? formData.design_file_url : `${api.defaults.baseURL}${formData.design_file_url}`} 
                            alt="Boceto cargado" 
                            className="w-10 h-10 object-cover rounded-lg border border-bravo-border" 
                          />
                          <span className="text-[10px] text-emerald-800 font-bold font-mono">Boceto Cargado</span>
                        </div>
                      )}
                    </div>
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
                  <p className="text-xs text-bravo-text leading-relaxed bg-bravo-input border border-bravo-border p-3.5 rounded-xl mt-1.5">
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

                {/* Sección Ficha Técnica Vista inmutable */}
                <div className="border-t border-bravo-border/60 pt-4 mt-4 space-y-4 text-left">
                  <h3 className="text-xs font-black text-bravo-text uppercase tracking-widest flex items-center gap-1.5">
                    <Palette size={14} className="text-bravo-accent" />
                    Ficha Técnica de Estampado
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-bravo-input border border-bravo-border/60 p-4 rounded-xl text-xs">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Técnica</p>
                      <p className="font-bold text-bravo-text mt-0.5 uppercase font-mono">{repair.print_technique || 'No especificada'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Ubicación</p>
                      <p className="font-bold text-bravo-text mt-0.5">{repair.print_location || 'No especificada'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Medidas</p>
                      <p className="font-bold text-bravo-text mt-0.5">{repair.print_dimensions || 'No especificadas'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-bravo-text-muted">Boceto</p>
                      {repair.design_file_url ? (
                        <a 
                          href={repair.design_file_url.startsWith('http') ? repair.design_file_url : `${api.defaults.baseURL}${repair.design_file_url}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-bravo-accent hover:text-amber-600 font-bold mt-0.5 underline"
                        >
                          Ver Imagen &rarr;
                        </a>
                      ) : (
                        <p className="text-bravo-text-muted mt-0.5">No adjunto</p>
                      )}
                    </div>
                  </div>

                  {repair.design_file_url && (
                    <div className="space-y-2 max-w-sm">
                      <p className="text-[10px] uppercase font-bold text-bravo-text-muted">Visualización del Boceto</p>
                      <div 
                        onClick={() => setShowImageLightbox(true)}
                        className="border border-bravo-border rounded-2xl overflow-hidden bg-zinc-950/50 hover:border-bravo-accent/50 cursor-pointer relative group shadow-lg transition-all duration-300"
                      >
                        <img 
                          src={repair.design_file_url.startsWith('http') ? repair.design_file_url : `${api.defaults.baseURL}${repair.design_file_url}`} 
                          alt="Boceto de Producción" 
                          className="w-full h-auto max-h-64 object-contain mx-auto group-hover:scale-[1.02] transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-3.5 py-2 bg-black/75 border border-bravo-accent/30 text-bravo-accent rounded-xl text-xs font-bold uppercase tracking-wider shadow-md">
                            🔍 Ampliar Boceto
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Brand Kit Flotante del Cliente */}
                  {brandKits.length > 0 && (
                    <div className="bg-bravo-input border border-bravo-border p-4 rounded-xl space-y-3 mt-4 text-left">
                      <div className="flex items-center gap-1.5 border-b border-bravo-border/40 pb-1.5">
                        <Palette size={13} className="text-bravo-accent" />
                        <h4 className="text-[10px] font-black text-bravo-accent uppercase tracking-wider">Identidad de Marca Activa</h4>
                      </div>
                      
                      {brandKits.map(kit => (
                        <div key={kit.id} className="space-y-2">
                          <p className="text-[10px] font-bold text-bravo-text uppercase">{kit.brand_name}</p>
                          {kit.guidelines && (
                            <p className="text-[9px] text-bravo-text-muted leading-relaxed font-medium italic">"{kit.guidelines}"</p>
                          )}
                          
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {kit.colors.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                onClick={() => handleCopyColor(c.hex)}
                                className="flex items-center gap-1 p-1 bg-bravo-bg border border-bravo-border hover:border-bravo-accent/40 rounded-lg cursor-pointer text-[9px] font-bold relative group"
                                title={`Copiar ${c.hex}`}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-bravo-border shrink-0"
                                  style={{ backgroundColor: c.hex }}
                                />
                                <span className="font-mono text-bravo-text-muted pr-1">{c.hex}</span>
                                {copiedColor === c.hex && (
                                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-stone-900 text-white text-[8px] rounded font-bold shadow">
                                    ¡Copiado!
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
              <p className="text-xs text-bravo-text-muted italic bg-bravo-input border border-dashed border-bravo-border rounded-xl p-4 text-center">
                Aún no se han registrado insumos para esta orden.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {repair.usage_records?.map(rec => (
                  <div key={rec.id} className="flex justify-between items-center p-3 bg-bravo-input border border-bravo-border rounded-xl text-xs">
                    <span className="font-semibold text-bravo-text">{rec.inventory_item?.name}</span>
                    <span className="font-bold bg-bravo-bg border border-bravo-border text-bravo-accent px-2 py-0.5 rounded-lg">Cantidad: {rec.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Form to add supply */}
            <div className="bg-bravo-input border border-bravo-border p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 text-left">
                <label className="text-[9px] uppercase font-bold text-bravo-text-muted mb-1 block">Insumo / Elemento físico</label>
                <select 
                  value={selectedSupply} 
                  onChange={e => setSelectedSupply(e.target.value)} 
                  className="w-full bg-bravo-bg border border-bravo-border rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50"
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
                  className="w-full bg-bravo-bg border border-bravo-border rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50"
                />
              </div>

              <button
                type="button"
                onClick={handleAddSupply}
                disabled={addingSupply || !selectedSupply}
                className="px-4 py-2 font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-md text-black hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Status */}
        <div className="space-y-6">
          
          {/* CONTROL DE CALIDAD (QA) CARD */}
          <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border pb-3 flex items-center justify-between">
              <span>Auditoría de Calidad (QA)</span>
              {qaApprovedRecord?.passed ? (
                <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold uppercase">Aprobado</span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-950/40 text-bravo-accent border border-bravo-border rounded text-[9px] font-bold uppercase">Pendiente</span>
              )}
            </h2>

            {qaApprovedRecord ? (
              <div className="space-y-2 text-xs">
                <p className="text-bravo-text-muted font-medium leading-relaxed">
                  Inspección realizada con éxito. Cumple con todos los parámetros del taller.
                </p>
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-[10px] space-y-1">
                  <p className="flex justify-between"><span className="text-emerald-400 font-bold">Estado:</span> <span className="font-semibold text-emerald-400">Aprobado ✓</span></p>
                  <p className="flex justify-between"><span className="text-emerald-400 font-bold">Fecha:</span> <span className="text-bravo-text-muted">{new Date(qaApprovedRecord.inspected_at).toLocaleString()}</span></p>
                  {qaApprovedRecord.comments && (
                    <p className="text-bravo-text-muted italic mt-1">"{qaApprovedRecord.comments}"</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-bravo-text-muted">
                Este pedido requiere pasar la compuerta de revisión física antes de poder ser empaquetado y marcado como listo para el cliente.
              </p>
            )}

            <button
              onClick={() => setShowQAModal(true)}
              className="w-full py-2 bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 text-bravo-text font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs hover:text-bravo-accent"
            >
              {qaApprovedRecord ? 'Ver / Editar Checklist QA' : 'Realizar Auditoría QA'}
            </button>
          </div>

          {/* ACCIÓN DE DIVISION DE ORDENES (SPLIT) CARD */}
          {!repair.is_split_child && (
            <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-black text-bravo-text uppercase tracking-widest border-b border-bravo-border pb-3">
                Gestión de Entregas
              </h2>
              <p className="text-xs text-bravo-text-muted">
                ¿Necesitas despachar una entrega parcial de este lote corporativo? Divide el pedido de forma atómica.
              </p>
              <button
                onClick={() => setShowSplitModal(true)}
                className="w-full py-2 bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 text-bravo-text font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:text-bravo-accent"
              >
                Dividir para Entrega Parcial
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CHECKLIST CONTROL DE CALIDAD (QA) */}
      <AnimatePresence>
        {showQAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowQAModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-sm shadow-2xl relative space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  Control de Calidad (QA)
                </h3>
                <button onClick={() => setShowQAModal(false)} className="p-1 hover:bg-bravo-sidebar rounded"><X size={15} /></button>
              </div>

              <form onSubmit={handleSubmitQA} className="space-y-4 text-xs">
                <p className="text-[10px] text-bravo-text-muted italic leading-relaxed">
                  Para aprobar la inspección de esta orden ({repair.print_technique ? repair.print_technique.toUpperCase() : 'ESTAMPADO'}), confirma todos los puntos físicos obligatorios del taller:
                </p>

                <div className="space-y-3.5 bg-bravo-input border border-bravo-border p-4 rounded-xl">
                  {(() => {
                    const template = getChecklistTemplate(repair?.device_type, repair?.print_technique);
                    return Object.keys(template).map(key => (
                      <label key={key} className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!qaChecklist[key]}
                          onChange={e => setQaChecklist({ ...qaChecklist, [key]: e.target.checked })}
                          className="w-4 h-4 rounded text-bravo-accent border-bravo-border bg-bravo-bg focus:ring-0 mt-0.5 accent-amber-500"
                        />
                        <div className="text-left">
                          <p className="font-extrabold text-bravo-text leading-none">{template[key].label}</p>
                          <p className="text-[9px] text-bravo-text-muted mt-0.5">{template[key].desc}</p>
                        </div>
                      </label>
                    ));
                  })()}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Comentarios de Auditoría (Opc.)</label>
                  <input
                    type="text"
                    placeholder="Ej: Costura reforzada, logo centrado."
                    value={qaComments}
                    onChange={e => setQaComments(e.target.value)}
                    className="w-full bg-bravo-bg border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Registrar Inspección
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DIVIDIR PEDIDO (SPLIT) */}
      <AnimatePresence>
        {showSplitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowSplitModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-sm shadow-2xl relative space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider flex items-center gap-1.5">
                  <History size={16} />
                  Dividir Orden
                </h3>
                <button onClick={() => setShowSplitModal(false)} className="p-1 hover:bg-bravo-sidebar rounded"><X size={15} /></button>
              </div>

              <div className="space-y-4 text-xs text-left">
                <p className="text-bravo-text-muted leading-relaxed font-medium">
                  Al dividir el pedido, el sistema clonará de forma atómica este registro generando un lote parcial independiente en el Kanban para que sea procesado y despachado de forma anticipada.
                </p>

                <div className="space-y-2 bg-bravo-input border border-bravo-border p-3 rounded-xl">
                  <label className="text-[10px] uppercase font-bold text-bravo-accent mb-1 block">Proporción para el nuevo lote</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0.1" 
                      max="0.9" 
                      step="0.05" 
                      value={splitRatio} 
                      onChange={e => setSplitRatio(parseFloat(e.target.value))} 
                      className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono font-bold text-xs bg-zinc-950 px-2 py-0.5 rounded text-amber-500">
                      {(splitRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[9px] text-bravo-text-muted">
                    El lote principal ({repair.order_number}-A) conservará el {((1 - splitRatio) * 100).toFixed(0)}% del presupuesto.
                    El nuevo lote ({repair.order_number}-B) recibirá el {(splitRatio * 100).toFixed(0)}%.
                  </p>
                </div>

                <div className="p-3 bg-amber-950/40 border border-bravo-border text-bravo-text rounded-xl space-y-1.5">
                  <p className="font-bold text-[10px] uppercase text-bravo-accent">Lotes Generados:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px] font-mono text-bravo-text">
                    <li>{repair.order_number}-A (${(parseFloat(repair?.repair_cost || 0) * (1 - splitRatio)).toLocaleString(undefined, {maximumFractionDigits: 2})} / abono: ${(parseFloat(repair?.deposit || 0) * (1 - splitRatio)).toLocaleString(undefined, {maximumFractionDigits: 2})})</li>
                    <li>{repair.order_number}-B (${(parseFloat(repair?.repair_cost || 0) * splitRatio).toLocaleString(undefined, {maximumFractionDigits: 2})} / abono: ${(parseFloat(repair?.deposit || 0) * splitRatio).toLocaleString(undefined, {maximumFractionDigits: 2})})</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowSplitModal(false); setSplitRatio(0.5); }}
                    className="flex-1 py-2 bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 text-bravo-text-muted hover:text-bravo-text font-bold uppercase rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSplitOrder}
                    className="flex-1 py-2 bg-bravo-accent hover:bg-amber-600 text-black font-extrabold uppercase rounded-xl transition-all cursor-pointer text-center"
                  >
                    Confirmar División
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowPaymentModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-sm shadow-2xl relative space-y-4 text-bravo-text"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider">
                  Registrar Entrega y Pago
                </h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-bravo-sidebar rounded"><X size={15} /></button>
              </div>

              <p className="text-bravo-text-muted text-[11px] leading-relaxed">
                Por favor, ingresa los detalles del cobro final de esta orden de Bravo.
              </p>

              {/* Resumen de Costos */}
              <div className="bg-bravo-input border border-bravo-border p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-bravo-text-muted">Costo Total:</span>
                  <span className="font-bold">${parseFloat(repair?.repair_cost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bravo-text-muted">Abono recibido:</span>
                  <span className="font-bold text-emerald-400">${parseFloat(repair?.deposit || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-bravo-border/40 pt-2 flex justify-between font-extrabold">
                  <span>Monto sugerido a pagar:</span>
                  <span className="text-bravo-accent">
                    ${Math.max(0, parseFloat(repair?.repair_cost || 0) - parseFloat(repair?.deposit || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Formulario */}
              <div className="space-y-3">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-bravo-text-muted">Monto Pagado ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-bravo-bg border border-bravo-border hover:border-bravo-accent/50 focus:border-bravo-accent rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none transition-all"
                    placeholder="Monto cobrado"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-bravo-text-muted">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-bravo-bg border border-bravo-border focus:border-bravo-accent rounded-xl px-3 py-2 text-xs text-bravo-text focus:outline-none transition-all"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="tarjeta_debito">Tarjeta de Débito</option>
                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                  </select>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 bg-bravo-input border border-bravo-border hover:border-bravo-accent/35 text-bravo-text-muted hover:text-bravo-text font-bold uppercase rounded-xl transition-all cursor-pointer text-center text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeliverConfirm}
                  disabled={!paymentAmount}
                  className="flex-1 py-2 text-black font-extrabold uppercase rounded-xl transition-all cursor-pointer text-center text-xs disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
                >
                  Confirmar Entrega
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX DE IMAGEN (BOCETO AMPLIA) */}
      <AnimatePresence>
        {showImageLightbox && repair.design_file_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setShowImageLightbox(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Botón Cerrar */}
              <button 
                onClick={() => setShowImageLightbox(false)} 
                className="absolute top-4 right-4 p-2 bg-black/80 hover:bg-zinc-800 text-white rounded-full cursor-pointer z-10 border border-zinc-700"
              >
                <X size={20} />
              </button>

              <img 
                src={repair.design_file_url.startsWith('http') ? repair.design_file_url : `${api.defaults.baseURL}${repair.design_file_url}`} 
                alt="Boceto ampliado" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-zinc-800 shadow-2xl" 
              />
              <p className="text-xs text-zinc-400 mt-3 font-semibold bg-black/80 px-4 py-1.5 rounded-full border border-zinc-850">
                {repair.order_number} · Boceto de Personalización
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
