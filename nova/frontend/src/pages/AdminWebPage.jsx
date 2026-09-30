import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, X, Globe, Save, Trash2, Edit2, 
  Smartphone, Laptop, Gamepad, HelpCircle, Phone, Mail, MapPin, MessageSquare, Check,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Star, MessageCircle, Send,
  Layout, ShieldCheck, Clock, Award, Share2, Info, Eye, Sparkles, Wrench, RefreshCw,
  Sliders, Database, Zap, Monitor, CheckCircle, ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { 
  getWebConfig, updateWebConfig,
  getAdminComments, toggleCommentApproval, deleteComment,
  simulateWhatsAppMessage
} from '../api/public'
import { getRepairStats } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'

const inputClass = "w-full bg-gray-950/80 border border-gray-800 hover:border-gray-700 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-200 placeholder-gray-600"
const textareaClass = "w-full bg-gray-950/80 border border-gray-800 hover:border-gray-700 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-200 placeholder-gray-600 resize-y min-h-[85px]"
const btnClass = "px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"

function FormField({ label, hint, children }) {
  return (
    <div className="space-y-1.5 text-left">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-300 font-mono">
          {label}
        </label>
        {hint && <span className="text-[11px] text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// =========================================================================
// FEATURE 2: LIVE PREVIEW MOCKUP CARD (SIMULADOR EN TIEMPO REAL)
// =========================================================================
function LivePreviewMockup({ hero = {}, stats = [] }) {
  const [previewMode, setPreviewMode] = useState('desktop') // 'desktop' | 'mobile'
  const [isCollapsed, setIsCollapsed] = useState(false)

  const bannerActive = Boolean(hero.banner_active)
  const bannerText = hero.banner_text || '¡Diagnóstico sin costo al realizar tu reparación con nosotros!'

  return (
    <div className="bg-gray-950/90 border border-cyan-500/25 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md transition-all">
      {/* Mockup Header Controls */}
      <div className="px-4 py-2.5 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-mono text-cyan-400 font-bold ml-2 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={11} /> Vista Previa en Vivo
          </span>
          <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">novaglobal.cl</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Switcher */}
          <div className="flex items-center bg-gray-950 rounded-lg p-0.5 border border-gray-800">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                previewMode === 'desktop' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Modo Escritorio"
            >
              <Monitor size={11} />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                previewMode === 'mobile' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Modo Móvil"
            >
              <Smartphone size={11} />
              <span className="hidden sm:inline">Móvil</span>
            </button>
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-gray-800 transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir vista previa' : 'Minimizar vista previa'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Mockup Canvas */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-6 bg-gradient-to-b from-[#070b14] to-[#04060a] flex justify-center overflow-hidden"
          >
            <div 
              className={`w-full transition-all duration-300 ${
                previewMode === 'mobile' ? 'max-w-xs border-x border-cyan-500/20 px-3 py-4 rounded-3xl bg-gray-950/80 shadow-2xl' : 'max-w-4xl'
              }`}
            >
              {/* Mini Announcement Banner */}
              {bannerActive && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 py-1 px-3 bg-gradient-to-r from-cyan-600/30 via-cyan-500/40 to-cyan-600/30 border border-cyan-500/40 rounded-full text-center text-[10px] font-mono text-cyan-200 tracking-wide flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                >
                  <Award size={10} className="text-cyan-300 shrink-0" />
                  <span className="truncate">{bannerText}</span>
                </motion.div>
              )}

              {/* Mini Hero Content */}
              <div className="text-center space-y-3">
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {hero.badge || 'SISTEMA_ONLINE'}
                </div>

                {/* Dynamic Title */}
                <h3 className={`font-black tracking-tight text-white ${previewMode === 'mobile' ? 'text-lg leading-tight' : 'text-2xl sm:text-3xl'}`}>
                  <span>{hero.title_prefix || 'SERVICIO TÉCNICO'}{' '}</span>
                  <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
                    {hero.title_highlight || 'ESPECIALIZADO'}
                  </span>
                </h3>

                {/* Description */}
                <p className={`text-gray-400 mx-auto leading-relaxed line-clamp-3 ${previewMode === 'mobile' ? 'text-[10px]' : 'text-xs max-w-2xl'}`}>
                  {hero.description || 'Laboratorio de microelectrónica avanzado para dispositivos móviles, notebooks y consolas.'}
                </p>

                {/* CTAs */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-500 text-gray-950 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <MessageSquare size={10} />
                    {hero.cta_whatsapp_text || 'Cotizar por WhatsApp'}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} className="text-cyan-400" />
                    {hero.cta_track_text || 'Rastrear mi Orden'}
                  </span>
                </div>

                {/* Stats Preview Pills */}
                {stats && stats.length > 0 && (
                  <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-gray-800/60 mt-3">
                    {stats.map((s, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-gray-900/60 border border-gray-800/80 text-center">
                        <div className="text-xs sm:text-sm font-black font-mono text-cyan-400 tracking-tight">{s.value}</div>
                        <div className="text-[9px] text-gray-400 font-medium truncate">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =========================================================================
// PÁGINA PRINCIPAL DE ADMINISTRACIÓN WEB (MASTER-DETAIL LAYOUT)
// =========================================================================
export default function AdminWebPage() {
  const navigate = useNavigate()

  // Master Navigation Groups
  const NAV_SECTIONS = [
    {
      group: 'DISEÑO & PORTADA',
      items: [
        { id: 'hero', label: 'Hero & Portada', icon: Layout, desc: 'Titulares, badge y banner promocional' },
        { id: 'services', label: 'Servicios & Cifras', icon: Award, desc: 'Tarjetas de laboratorio y métricas' },
      ]
    },
    {
      group: 'CANALES & CONTENIDO',
      items: [
        { id: 'contact', label: 'Contacto & Horarios', icon: MapPin, desc: 'Canales oficiales, redes y dirección' },
        { id: 'prices', label: 'Precios de Referencia', icon: Clock, desc: 'Tarifario público por tipo de equipo' },
        { id: 'faqs', label: 'Preguntas Frecuentes', icon: HelpCircle, desc: 'Resolución de dudas frecuentes' },
        { id: 'policies', label: 'Políticas & Garantía', icon: ShieldCheck, desc: 'Términos de servicio y diagnósticos' },
      ]
    },
    {
      group: 'HERRAMIENTAS & TESTING',
      items: [
        { id: 'comments', label: 'Moderación de Reseñas', icon: Star, desc: 'Aprobar o desestimar opiniones' },
        { id: 'chatbot', label: 'Simulador WhatsApp Bot', icon: MessageCircle, desc: 'Consola de prueba del asistente IA' },
      ]
    }
  ]

  const [activeTab, setActiveTab] = useState('hero')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingStats, setSyncingStats] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Central config state
  const [config, setConfig] = useState({
    whatsapp: '',
    phone: '',
    email: '',
    address: '',
    reference_prices: [],
    faqs: [],
    content: {
      hero: {
        badge: 'SISTEMA_ONLINE',
        title_prefix: 'SERVICIO TÉCNICO',
        title_highlight: 'ESPECIALIZADO',
        description: 'Laboratorio de microelectrónica avanzado para dispositivos móviles, notebooks y consolas en Quillota. Consulta el progreso de tu orden en tiempo real con transparencia absoluta o cotiza directo con nuestros técnicos.',
        cta_whatsapp_text: 'Cotizar por WhatsApp',
        cta_track_text: 'Rastrear mi Orden',
        banner_active: false,
        banner_text: '¡Diagnóstico sin costo al realizar tu reparación con nosotros!'
      },
      services_cards: [
        {
          title: 'Celulares & Tablets',
          desc: 'Reemplazo de pantallas OLED/AMOLED, baterías de alto rendimiento, conectores de carga tipo C y cámaras.',
          badge: 'NIVEL_PROFESIONAL',
          time: '24-48 HRS',
          icon: 'Smartphone'
        },
        {
          title: 'Notebooks & PC',
          desc: 'Limpieza de ventiladores, repastado Honeywell PTM, ampliación de discos sólidos/RAM, cambio de pantallas y teclados.',
          badge: 'DIAG_EXPRESS',
          time: '48-72 HRS',
          icon: 'Laptop'
        },
        {
          title: 'Consolas de Juego',
          desc: 'Reparación de puertos HDMI, reballing APU, reparación de mandos (joystick drift) y mantención premium de metal líquido.',
          badge: 'CONSOLAS_Y_MANDOS',
          time: '24-72 HRS',
          icon: 'Gamepad'
        },
        {
          title: 'Micro-Soldadura',
          desc: 'Búsqueda de cortocircuitos térmicos en placas madre, reemplazo de integrados SMD/BGA y reconstrucción de pistas.',
          badge: 'ELECTRÓNICA_AVANZADA',
          time: '3-5 DÍAS',
          icon: 'Wrench'
        }
      ],
      stats: [
        { value: '+5.000', label: 'Equipos Reparados' },
        { value: '98%', label: 'Tasa de Éxito' },
        { value: '6 Meses', label: 'Garantía Máxima' },
        { value: '100%', label: 'Repuestos Certificados' }
      ],
      contact: {
        schedule: 'Lunes a Viernes 10:00 a 19:00 hrs | Sábados 10:30 a 14:30 hrs',
        instagram: 'https://instagram.com/novaglobal',
        facebook: 'https://facebook.com/novaglobal',
        tiktok: 'https://tiktok.com/@novaglobal',
        google_maps_url: 'https://maps.google.com'
      },
      policies: {
        warranty_text: 'Todas nuestras reparaciones cuentan con garantía legal y comercial de 3 a 6 meses respaldada por ticket digital. No cubre golpes, caídas posteriores o ingreso de líquidos post-entrega.',
        diagnostic_text: 'El diagnóstico es 100% gratuito si aceptas la cotización y realizas la reparación en nuestro laboratorio. Si retiras sin reparar se cobra un valor mínimo de laboratorio de $10.000.'
      }
    }
  })

  // Edit price modal state
  const [editingPriceIndex, setEditingPriceIndex] = useState(null)
  const [priceForm, setPriceForm] = useState({
    device: '',
    service: '',
    price: '',
    time: '',
    category: 'Celular'
  })
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [priceCategoryFilter, setPriceCategoryFilter] = useState('all')

  // Edit FAQ modal state
  const [editingFaqIndex, setEditingFaqIndex] = useState(null)
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' })
  const [showFaqModal, setShowFaqModal] = useState(false)

  // Comments moderation
  const [adminComments, setAdminComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)

  // Bot Simulator
  const [simInput, setSimInput] = useState('')
  const [simPhone, setSimPhone] = useState('+56912345678')
  const [simMessages, setSimMessages] = useState([
    { sender: 'bot', text: '👋 ¡Hola! Soy el asistente virtual de Nova. ¿En qué te puedo ayudar hoy?', time: '10:00' }
  ])
  const [simWriting, setSimWriting] = useState(false)

  // Load config on mount
  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    if (activeTab === 'comments') {
      fetchComments()
    }
  }, [activeTab])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const response = await getWebConfig('nova')
      const data = response.data
      setConfig(prev => ({
        ...prev,
        ...data,
        content: {
          ...prev.content,
          ...(data.content || {})
        }
      }))
    } catch (err) {
      console.error(err)
      setError('Error al cargar la configuración de Nova.')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    setLoadingComments(true)
    try {
      const response = await getAdminComments('nova')
      setAdminComments(response.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingComments(false)
    }
  }

  // Save all config
  const handleSaveAll = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateWebConfig({
        system: 'nova',
        whatsapp: config.whatsapp,
        phone: config.phone,
        email: config.email,
        address: config.address,
        reference_prices: config.reference_prices || [],
        faqs: config.faqs || [],
        content: config.content || {}
      })
      setSuccess('¡Configuración guardada y sincronizada con la web pública exitosamente!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error(err)
      setError('Error al persistir cambios en el servidor.')
    } finally {
      setSaving(false)
    }
  }

  // Helper update sub-object
  const updateHero = (field, val) => {
    setConfig(prev => ({
      ...prev,
      content: {
        ...prev.content,
        hero: { ...prev.content.hero, [field]: val }
      }
    }))
  }

  const updateContactExtra = (field, val) => {
    setConfig(prev => ({
      ...prev,
      content: {
        ...prev.content,
        contact: { ...prev.content.contact, [field]: val }
      }
    }))
  }

  const updatePolicy = (field, val) => {
    setConfig(prev => ({
      ...prev,
      content: {
        ...prev.content,
        policies: { ...prev.content.policies, [field]: val }
      }
    }))
  }

  const updateServiceCard = (idx, field, val) => {
    setConfig(prev => {
      const updated = [...prev.content.services_cards]
      updated[idx] = { ...updated[idx], [field]: val }
      return {
        ...prev,
        content: { ...prev.content, services_cards: updated }
      }
    })
  }

  const updateStat = (idx, field, val) => {
    setConfig(prev => {
      const updated = [...prev.content.stats]
      updated[idx] = { ...updated[idx], [field]: val }
      return {
        ...prev,
        content: { ...prev.content, stats: updated }
      }
    })
  }

  // =========================================================================
  // FEATURE 3: PRESET BUTTONS Y SINCRONIZACIÓN DE CIFRAS CON BASE DE DATOS
  // =========================================================================
  const handleLoadRecommendedPresets = () => {
    const recommendedStats = [
      { value: '+5.000', label: 'Equipos Reparados' },
      { value: '98.5%', label: 'Tasa de Éxito' },
      { value: '6 Meses', label: 'Garantía Máxima' },
      { value: '100%', label: 'Repuestos Certificados' }
    ]
    setConfig(prev => ({
      ...prev,
      content: {
        ...prev.content,
        stats: recommendedStats
      }
    }))
    setSuccess('💡 Métricas recomendadas cargadas en los campos de edición.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSyncWithRealDatabase = async () => {
    setSyncingStats(true)
    setError('')
    try {
      const res = await getRepairStats({ system: 'nova' })
      const data = res.data

      const totalCount = data.total_repairs || 0
      const successRate = data.success_rate || 98.0
      const avgSla = Math.ceil(data.avg_sla_hours || 24)

      const dbSyncedStats = [
        { value: `+${totalCount}`, label: 'Equipos Reparados' },
        { value: `${successRate}%`, label: 'Tasa de Éxito' },
        { value: `< ${avgSla} Horas`, label: 'Tiempo Promedio' },
        { value: '100%', label: 'Repuestos Originales' }
      ]

      setConfig(prev => ({
        ...prev,
        content: {
          ...prev.content,
          stats: dbSyncedStats
        }
      }))
      setSuccess(`⚡ ¡Sincronizado con PostgreSQL! ${totalCount} reparaciones y ${avgSla}h SLA promedio integrados.`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error(err)
      setError('Error al consultar estadísticas consolidadas en base de datos.')
    } finally {
      setSyncingStats(false)
    }
  }

  // Comment Moderation
  const handleApproveComment = async (id, currentApproval) => {
    try {
      const response = await toggleCommentApproval(id, !currentApproval)
      setAdminComments(prev => 
        prev.map(c => c.id === id ? { ...c, is_approved: response.data.is_approved } : c)
      )
      setSuccess(response.data.is_approved ? 'Comentario aprobado y publicado en la web.' : 'Comentario ocultado.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al actualizar estado del comentario.')
    }
  }

  const handleDeleteComment = async (id) => {
    if (!window.confirm('¿Eliminar permanentemente este comentario?')) return
    try {
      await deleteComment(id)
      setAdminComments(prev => prev.filter(c => c.id !== id))
      setSuccess('Comentario eliminado.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al eliminar comentario.')
    }
  }

  // Simulator
  const handleSendSimMessage = async (e) => {
    e.preventDefault()
    if (!simInput.trim()) return
    const userText = simInput.trim()
    setSimInput('')
    setSimMessages(prev => [...prev, { sender: 'user', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    setSimWriting(true)
    try {
      const response = await simulateWhatsAppMessage({ message: userText, phone: simPhone })
      setTimeout(() => {
        setSimMessages(prev => [...prev, { sender: 'bot', text: response.data.response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
        setSimWriting(false)
      }, 500)
    } catch (err) {
      setSimWriting(false)
      setSimMessages(prev => [...prev, { sender: 'bot', text: '❌ Error en endpoint bot.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    }
  }

  // Reference Price Operations
  const handleOpenPriceModal = (index = null) => {
    if (index !== null) {
      setEditingPriceIndex(index)
      setPriceForm({ ...config.reference_prices[index] })
    } else {
      setEditingPriceIndex(null)
      setPriceForm({ device: '', service: '', price: '', time: '', category: 'Celular' })
    }
    setShowPriceModal(true)
  }

  const handleSavePrice = () => {
    if (!priceForm.device || !priceForm.service || !priceForm.price) {
      alert('Por favor complete dispositivo, servicio y precio.')
      return
    }
    const updated = [...(config.reference_prices || [])]
    if (editingPriceIndex !== null) {
      updated[editingPriceIndex] = priceForm
    } else {
      updated.push(priceForm)
    }
    setConfig(prev => ({ ...prev, reference_prices: updated }))
    setShowPriceModal(false)
  }

  const handleDeletePrice = (index) => {
    if (!window.confirm('¿Eliminar este precio de referencia?')) return
    const updated = config.reference_prices.filter((_, i) => i !== index)
    setConfig(prev => ({ ...prev, reference_prices: updated }))
  }

  // FAQ Operations
  const handleOpenFaqModal = (index = null) => {
    if (index !== null) {
      setEditingFaqIndex(index)
      setFaqForm({ ...config.faqs[index] })
    } else {
      setEditingFaqIndex(null)
      setFaqForm({ question: '', answer: '' })
    }
    setShowFaqModal(true)
  }

  const handleSaveFaq = () => {
    if (!faqForm.question || !faqForm.answer) {
      alert('Por favor complete pregunta y respuesta.')
      return
    }
    const updated = [...(config.faqs || [])]
    if (editingFaqIndex !== null) {
      updated[editingFaqIndex] = faqForm
    } else {
      updated.push(faqForm)
    }
    setConfig(prev => ({ ...prev, faqs: updated }))
    setShowFaqModal(false)
  }

  const handleDeleteFaq = (index) => {
    if (!window.confirm('¿Eliminar esta pregunta frecuente?')) return
    const updated = config.faqs.filter((_, i) => i !== index)
    setConfig(prev => ({ ...prev, faqs: updated }))
  }

  return (
    <div className="relative min-h-screen bg-[#050811] text-gray-200 p-4 sm:p-6 lg:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      <AnimatedBackground />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/repairs')}
              className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 border border-gray-800 transition-all cursor-pointer"
              title="Volver al Panel Técnico"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-mono">
                  Editor CMS Web <span className="text-cyan-400">Nova</span>
                </h1>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Panel integral de administración y contenido para la landing pública de Nova
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <a
              href="/nova-public"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-gray-900/90 hover:bg-gray-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ExternalLink size={13} />
              <span>Ver Web Pública</span>
            </a>
            <button
              onClick={handleSaveAll}
              disabled={saving || loading}
              className={btnClass}
            >
              {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
              <span>{saving ? 'Guardando...' : 'Guardar Todo'}</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center justify-between text-rose-200 text-xs shadow-lg"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="hover:text-white cursor-pointer"><X size={14} /></button>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center justify-between text-emerald-200 text-xs shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{success}</span>
              </div>
              <button onClick={() => setSuccess('')} className="hover:text-white cursor-pointer"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            MASTER-DETAIL GRID ARCHITECTURE
           ========================================================================= */}
        <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* 1. MASTER: LEFT VERTICAL NAVIGATION SIDEBAR */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">
            <div className="bg-gray-900/80 border border-gray-800/90 rounded-2xl p-3.5 backdrop-blur-md shadow-xl space-y-4">
              
              {NAV_SECTIONS.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1.5">
                  <div className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                    {section.group}
                  </div>
                  <div className="space-y-1">
                    {section.items.map(item => {
                      const Icon = item.icon
                      const isActive = activeTab === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                            isActive
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800/60 border border-transparent'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800/70 text-gray-400'}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{item.label}</div>
                            <div className="text-[10px] text-gray-500 truncate">{item.desc}</div>
                          </div>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Status footer pill */}
              <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] font-mono text-gray-400 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  BD Conectada
                </span>
                <span className="text-cyan-400">PostgreSQL</span>
              </div>
            </div>
          </aside>

          {/* 2. DETAIL: RIGHT WORKSPACE AREA */}
          <main className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
            
            {/* Top: Interactive Live Preview Mockup Card */}
            <LivePreviewMockup 
              hero={config.content?.hero || {}} 
              stats={config.content?.stats || []} 
            />

            {/* Active Content Editor Card */}
            <div className="bg-gray-900/70 border border-gray-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-cyan-400">
                  <RefreshCw className="animate-spin" size={24} />
                  <span className="text-xs font-mono">Cargando configuración...</span>
                </div>
              ) : (
                <>
                  {/* TAB 1: HERO & PORTADA */}
                  {activeTab === 'hero' && (
                    <div className="space-y-6">
                      <div className="border-b border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Layout className="text-cyan-400" size={16} /> Portada Principal (Hero)
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Configura los titulares de impacto, la bajada comercial y los botones de acción iniciales.</p>
                      </div>

                      {/* Announcement Banner */}
                      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="text-cyan-400" size={16} />
                            <span className="text-xs font-bold text-white uppercase">Barra de Anuncio Superior (Promoción / Alerta)</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(config.content?.hero?.banner_active)}
                              onChange={(e) => updateHero('banner_active', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                          </label>
                        </div>
                        {config.content?.hero?.banner_active && (
                          <FormField label="Texto de la Promoción / Anuncio" hint="Visible en la cabecera de la página">
                            <input
                              type="text"
                              value={config.content?.hero?.banner_text || ''}
                              onChange={(e) => updateHero('banner_text', e.target.value)}
                              placeholder="Ej: ¡Diagnóstico sin costo al realizar tu reparación con nosotros!"
                              className={inputClass}
                            />
                          </FormField>
                        )}
                      </div>

                      {/* Titles & Texts Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Badge / Etiqueta Superior" hint="Píldora sobre el título">
                          <input
                            type="text"
                            value={config.content?.hero?.badge || ''}
                            onChange={(e) => updateHero('badge', e.target.value)}
                            placeholder="SISTEMA_ONLINE"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Prefijo del Título" hint="Texto principal antes del gradiente">
                          <input
                            type="text"
                            value={config.content?.hero?.title_prefix || ''}
                            onChange={(e) => updateHero('title_prefix', e.target.value)}
                            placeholder="SERVICIO TÉCNICO"
                            className={inputClass}
                          />
                        </FormField>

                        <div className="sm:col-span-2">
                          <FormField label="Palabra / Frase Destacada" hint="Se renderiza con gradiente cyan brillante">
                            <input
                              type="text"
                              value={config.content?.hero?.title_highlight || ''}
                              onChange={(e) => updateHero('title_highlight', e.target.value)}
                              placeholder="ESPECIALIZADO"
                              className={inputClass}
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-2">
                          <FormField label="Bajada / Descripción Comercial" hint="Explicación concisa de servicios">
                            <textarea
                              value={config.content?.hero?.description || ''}
                              onChange={(e) => updateHero('description', e.target.value)}
                              className={textareaClass}
                            />
                          </FormField>
                        </div>

                        <FormField label="Texto Botón WhatsApp" hint="Acción principal">
                          <input
                            type="text"
                            value={config.content?.hero?.cta_whatsapp_text || ''}
                            onChange={(e) => updateHero('cta_whatsapp_text', e.target.value)}
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Texto Botón Rastrear" hint="Acción secundaria">
                          <input
                            type="text"
                            value={config.content?.hero?.cta_track_text || ''}
                            onChange={(e) => updateHero('cta_track_text', e.target.value)}
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SERVICIOS Y CIFRAS (CON PRESET BUTTONS) */}
                  {activeTab === 'services' && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Award className="text-cyan-400" size={16} /> Servicios y Cifras de Impacto
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Gestiona las 4 tarjetas de especialidad y los indicadores numéricos del laboratorio.</p>
                      </div>

                      {/* Service Cards Editor */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Sparkles size={14} className="text-cyan-400" /> Especialidades del Laboratorio (4 Módulos)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(config.content?.services_cards || []).map((card, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                                <span className="text-xs font-mono font-bold text-cyan-400">Módulo #{idx + 1}</span>
                                <input
                                  type="text"
                                  value={card.badge || ''}
                                  onChange={(e) => updateServiceCard(idx, 'badge', e.target.value)}
                                  placeholder="BADGE_STATUS"
                                  className="text-[10px] font-mono bg-cyan-950/50 border border-cyan-500/30 rounded px-2 py-0.5 text-cyan-300 w-32 text-right"
                                />
                              </div>
                              <FormField label="Título del Servicio">
                                <input
                                  type="text"
                                  value={card.title || ''}
                                  onChange={(e) => updateServiceCard(idx, 'title', e.target.value)}
                                  className={inputClass}
                                />
                              </FormField>
                              <FormField label="Descripción">
                                <textarea
                                  value={card.desc || ''}
                                  onChange={(e) => updateServiceCard(idx, 'desc', e.target.value)}
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white min-h-[60px]"
                                />
                              </FormField>
                              <FormField label="Tiempo de Entrega Estimado">
                                <input
                                  type="text"
                                  value={card.time || ''}
                                  onChange={(e) => updateServiceCard(idx, 'time', e.target.value)}
                                  placeholder="24-48 HRS"
                                  className={inputClass}
                                />
                              </FormField>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FEATURE 3: STATS PRESETS & DB SYNC */}
                      <div className="space-y-4 pt-4 border-t border-gray-800">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                              <Sliders size={14} className="text-cyan-400" /> Indicadores Numéricos Destacados
                            </h3>
                            <p className="text-[11px] text-gray-400">Puebla las métricas comerciales manualmente o usa las sugerencias inteligentes y datos reales de BD.</p>
                          </div>

                          {/* Quick Action Presets */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleLoadRecommendedPresets}
                              className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              title="Cargar valores estándar de alta conversión"
                            >
                              <Sparkles size={12} />
                              <span>💡 Cargar Recomendados</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleSyncWithRealDatabase}
                              disabled={syncingStats}
                              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                              title="Calcular valores a partir de órdenes de trabajo en PostgreSQL"
                            >
                              {syncingStats ? <RefreshCw className="animate-spin" size={12} /> : <Zap size={12} />}
                              <span>⚡ Sincronizar con BD</span>
                            </button>
                          </div>
                        </div>

                        {/* 4 Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {(config.content?.stats || []).map((stat, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-3 text-left">
                              <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Métrica #{idx + 1}</div>
                              <FormField label="Valor Numérico / Cifra">
                                <input
                                  type="text"
                                  value={stat.value || ''}
                                  onChange={(e) => updateStat(idx, 'value', e.target.value)}
                                  placeholder="+5.000"
                                  className={inputClass}
                                />
                              </FormField>
                              <FormField label="Etiqueta / Concepto">
                                <input
                                  type="text"
                                  value={stat.label || ''}
                                  onChange={(e) => updateStat(idx, 'label', e.target.value)}
                                  placeholder="Equipos Reparados"
                                  className={inputClass}
                                />
                              </FormField>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CONTACTO Y CANALES */}
                  {activeTab === 'contact' && (
                    <div className="space-y-6">
                      <div className="border-b border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <MapPin className="text-cyan-400" size={16} /> Canales de Contacto & Ubicación
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Configura teléfonos, sucursal física, horarios de atención y enlaces a redes sociales.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="WhatsApp de Atención" hint="Formato con código internacional">
                          <input
                            type="text"
                            value={config.whatsapp || ''}
                            onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
                            placeholder="+56912345678"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Teléfono Fijo / Central" hint="Llamadas directas">
                          <input
                            type="text"
                            value={config.phone || ''}
                            onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                            placeholder="+56 33 2456789"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Correo Electrónico" hint="Contacto comercial">
                          <input
                            type="email"
                            value={config.email || ''}
                            onChange={(e) => setConfig({ ...config, email: e.target.value })}
                            placeholder="contacto@novaglobal.cl"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Dirección Física" hint="Ubicación visible en landing">
                          <input
                            type="text"
                            value={config.address || ''}
                            onChange={(e) => setConfig({ ...config, address: e.target.value })}
                            placeholder="O'Higgins 123, Quillota"
                            className={inputClass}
                          />
                        </FormField>

                        <div className="sm:col-span-2">
                          <FormField label="Horarios de Atención" hint="Días y horas de apertura de mesón">
                            <input
                              type="text"
                              value={config.content?.contact?.schedule || ''}
                              onChange={(e) => updateContactExtra('schedule', e.target.value)}
                              placeholder="Lunes a Viernes 10:00 a 19:00 hrs | Sábados 10:30 a 14:30 hrs"
                              className={inputClass}
                            />
                          </FormField>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-800 space-y-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Share2 size={14} className="text-cyan-400" /> Presencia Digital & Redes Sociales
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Instagram URL">
                            <input
                              type="url"
                              value={config.content?.contact?.instagram || ''}
                              onChange={(e) => updateContactExtra('instagram', e.target.value)}
                              placeholder="https://instagram.com/novaglobal"
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Facebook URL">
                            <input
                              type="url"
                              value={config.content?.contact?.facebook || ''}
                              onChange={(e) => updateContactExtra('facebook', e.target.value)}
                              placeholder="https://facebook.com/novaglobal"
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="TikTok URL">
                            <input
                              type="url"
                              value={config.content?.contact?.tiktok || ''}
                              onChange={(e) => updateContactExtra('tiktok', e.target.value)}
                              placeholder="https://tiktok.com/@novaglobal"
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Enlace Google Maps">
                            <input
                              type="url"
                              value={config.content?.contact?.google_maps_url || ''}
                              onChange={(e) => updateContactExtra('google_maps_url', e.target.value)}
                              placeholder="https://maps.google.com/..."
                              className={inputClass}
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: PRECIOS DE REFERENCIA */}
                  {activeTab === 'prices' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
                        <div>
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            <Clock className="text-cyan-400" size={16} /> Precios de Referencia Públicos
                          </h2>
                          <p className="text-xs text-gray-400 mt-1">Tarifas estimadas visibles en la tabla comparativa de la página web.</p>
                        </div>
                        <button
                          onClick={() => handleOpenPriceModal()}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        >
                          <Plus size={14} /> <span>Nuevo Precio</span>
                        </button>
                      </div>

                      {/* Filter by category */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {['all', 'Celular', 'Notebook', 'Consola'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setPriceCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                              priceCategoryFilter === cat 
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' 
                                : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'
                            }`}
                          >
                            {cat === 'all' ? 'Todos' : cat}
                          </button>
                        ))}
                      </div>

                      {/* Prices Table */}
                      <div className="overflow-x-auto rounded-xl border border-gray-800">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-gray-950/80 border-b border-gray-800 font-mono uppercase text-gray-400 text-[11px]">
                            <tr>
                              <th className="p-3">Categoría</th>
                              <th className="p-3">Dispositivo</th>
                              <th className="p-3">Servicio</th>
                              <th className="p-3">Precio Estimado</th>
                              <th className="p-3">Plazo</th>
                              <th className="p-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/60 bg-gray-950/30">
                            {(config.reference_prices || [])
                              .filter(p => priceCategoryFilter === 'all' || p.category === priceCategoryFilter)
                              .map((p, idx) => (
                                <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                                  <td className="p-3 font-mono text-cyan-400">{p.category || 'Celular'}</td>
                                  <td className="p-3 font-semibold text-white">{p.device}</td>
                                  <td className="p-3 text-gray-300">{p.service}</td>
                                  <td className="p-3 font-mono font-bold text-emerald-400">{p.price}</td>
                                  <td className="p-3 font-mono text-gray-400">{p.time}</td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleOpenPriceModal(idx)}
                                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-300 cursor-pointer"
                                        title="Editar"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeletePrice(idx)}
                                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 cursor-pointer"
                                        title="Eliminar"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            {(config.reference_prices || []).length === 0 && (
                              <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500 text-xs font-mono">
                                  No hay precios configurados. Añade el primero con el botón superior.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: PREGUNTAS FRECUENTES (FAQS) */}
                  {activeTab === 'faqs' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
                        <div>
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            <HelpCircle className="text-cyan-400" size={16} /> Preguntas Frecuentes (FAQs)
                          </h2>
                          <p className="text-xs text-gray-400 mt-1">Respuestas a dudas comunes que aparecen en el acordeón de la web y alimentan al bot de WhatsApp.</p>
                        </div>
                        <button
                          onClick={() => handleOpenFaqModal()}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        >
                          <Plus size={14} /> <span>Nueva FAQ</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(config.faqs || []).map((faq, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                                <span className="font-mono text-cyan-400 text-xs">Q{idx + 1}:</span>
                                <span>{faq.question}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenFaqModal(idx)}
                                  className="p-1.5 rounded-lg bg-gray-900 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-300 cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFaq(idx)}
                                  className="p-1.5 rounded-lg bg-gray-900 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 pl-6 leading-relaxed">{faq.answer}</p>
                          </div>
                        ))}

                        {(config.faqs || []).length === 0 && (
                          <div className="p-10 text-center text-gray-500 text-xs font-mono border border-dashed border-gray-800 rounded-xl">
                            No hay preguntas frecuentes registradas.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 6: POLÍTICAS Y GARANTÍAS */}
                  {activeTab === 'policies' && (
                    <div className="space-y-6">
                      <div className="border-b border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <ShieldCheck className="text-cyan-400" size={16} /> Términos, Políticas y Garantías
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Establece con claridad los alcances legales y operacionales de las garantías y diagnósticos.</p>
                      </div>

                      <div className="space-y-4">
                        <FormField label="Política de Garantía Técnica" hint="Condiciones de los 3 a 6 meses de garantía">
                          <textarea
                            value={config.content?.policies?.warranty_text || ''}
                            onChange={(e) => updatePolicy('warranty_text', e.target.value)}
                            rows={4}
                            className={textareaClass}
                          />
                        </FormField>

                        <FormField label="Política de Diagnóstico de Laboratorio" hint="Reglas de costo y excepciones">
                          <textarea
                            value={config.content?.policies?.diagnostic_text || ''}
                            onChange={(e) => updatePolicy('diagnostic_text', e.target.value)}
                            rows={4}
                            className={textareaClass}
                          />
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* TAB 7: MODERACIÓN DE RESEÑAS */}
                  {activeTab === 'comments' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                        <div>
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            <Star className="text-amber-400" size={16} /> Moderación de Comentarios Públicos
                          </h2>
                          <p className="text-xs text-gray-400 mt-1">Aprueba o desaprueba las opiniones de clientes antes de que aparezcan en la landing.</p>
                        </div>
                        <button
                          onClick={fetchComments}
                          className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer"
                          title="Recargar comentarios"
                        >
                          <RefreshCw size={14} className={loadingComments ? 'animate-spin' : ''} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {adminComments.map(comment => (
                          <div
                            key={comment.id}
                            className={`p-4 rounded-xl border transition-all ${
                              comment.is_approved
                                ? 'bg-gray-950/60 border-emerald-500/30'
                                : 'bg-gray-950/40 border-gray-800 opacity-75'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{comment.author_name}</span>
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {Array.from({ length: comment.rating || 5 }).map((_, i) => (
                                    <Star key={i} size={11} fill="currentColor" />
                                  ))}
                                </div>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                  comment.is_approved 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}>
                                  {comment.is_approved ? 'Publicado' : 'Pendiente'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApproveComment(comment.id, comment.is_approved)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                    comment.is_approved
                                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                  }`}
                                >
                                  {comment.is_approved ? <X size={12} /> : <Check size={12} />}
                                  <span>{comment.is_approved ? 'Ocultar' : 'Aprobar'}</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-300 mt-2 italic leading-relaxed">"{comment.comment}"</p>
                          </div>
                        ))}

                        {adminComments.length === 0 && !loadingComments && (
                          <div className="p-8 text-center text-gray-500 text-xs font-mono border border-dashed border-gray-800 rounded-xl">
                            No hay comentarios recibidos aún.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 8: SIMULADOR DE CHATBOT */}
                  {activeTab === 'chatbot' && (
                    <div className="space-y-6">
                      <div className="border-b border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <MessageCircle className="text-cyan-400" size={16} /> Simulador del Asistente Virtual WhatsApp
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Prueba las respuestas de la IA basadas en los datos de la sucursal, horarios y precios configurados.</p>
                      </div>

                      <div className="max-w-xl mx-auto rounded-2xl border border-gray-800 bg-gray-950/80 overflow-hidden shadow-2xl flex flex-col h-[460px]">
                        {/* Header Simulator */}
                        <div className="p-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold text-white font-mono">Nova Virtual Assistant</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">Consola de Test</span>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                          {simMessages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                  msg.sender === 'user'
                                    ? 'bg-cyan-600 text-white rounded-br-none'
                                    : 'bg-gray-800/90 text-gray-200 rounded-bl-none border border-gray-700/60'
                                }`}
                              >
                                {msg.text}
                              </div>
                              <span className="text-[9px] font-mono text-gray-600 mt-0.5 px-1">{msg.time}</span>
                            </div>
                          ))}
                          {simWriting && (
                            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono p-2">
                              <span className="animate-pulse">Escribiendo respuesta...</span>
                            </div>
                          )}
                        </div>

                        {/* Input Box */}
                        <form onSubmit={handleSendSimMessage} className="p-3 bg-gray-900/90 border-t border-gray-800 flex items-center gap-2">
                          <input
                            type="text"
                            value={simInput}
                            onChange={(e) => setSimInput(e.target.value)}
                            placeholder="Escribe como un cliente (ej: ¿cuánto sale cambiar pantalla iPhone 13?)"
                            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            type="submit"
                            disabled={!simInput.trim() || simWriting}
                            className="p-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            <Send size={14} />
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* MODAL EDITAR PRECIO */}
      <AnimatePresence>
        {showPriceModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  {editingPriceIndex !== null ? 'Editar Precio' : 'Nuevo Precio de Referencia'}
                </h3>
                <button onClick={() => setShowPriceModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <FormField label="Categoría de Dispositivo">
                  <select
                    value={priceForm.category}
                    onChange={(e) => setPriceForm({ ...priceForm, category: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Celular">Celular</option>
                    <option value="Notebook">Notebook</option>
                    <option value="Consola">Consola</option>
                    <option value="Otros">Otros</option>
                  </select>
                </FormField>

                <FormField label="Dispositivo / Modelo">
                  <input
                    type="text"
                    value={priceForm.device}
                    onChange={(e) => setPriceForm({ ...priceForm, device: e.target.value })}
                    placeholder="Ej: iPhone 13 / Samsung A54"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Servicio Realizado">
                  <input
                    type="text"
                    value={priceForm.service}
                    onChange={(e) => setPriceForm({ ...priceForm, service: e.target.value })}
                    placeholder="Ej: Cambio de Pantalla OLED"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Precio Estimado">
                  <input
                    type="text"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                    placeholder="Ej: Desde $45.000"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Tiempo de Entrega">
                  <input
                    type="text"
                    value={priceForm.time}
                    onChange={(e) => setPriceForm({ ...priceForm, time: e.target.value })}
                    placeholder="Ej: 24 Horas"
                    className={inputClass}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePrice}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDITAR FAQ */}
      <AnimatePresence>
        {showFaqModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  {editingFaqIndex !== null ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}
                </h3>
                <button onClick={() => setShowFaqModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <FormField label="Pregunta">
                  <input
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    placeholder="Ej: ¿Cobran por el diagnóstico?"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Respuesta Detallada">
                  <textarea
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    rows={4}
                    placeholder="Ej: El diagnóstico es 100% gratuito si aceptas la cotización..."
                    className={textareaClass}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFaq}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
