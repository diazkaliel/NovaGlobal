import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, X, Globe, Save, Trash2, Edit2, 
  HelpCircle, Phone, Mail, MapPin, Check,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Star,
  Layout, Sparkles, Printer, Truck, HeartHandshake, Award,
  Clock, Share2, Info, Eye, RefreshCw, Shirt, Sliders, Database, Zap,
  Monitor, Smartphone, ExternalLink, Scissors
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getWebConfig, updateWebConfig } from '../../api/public'
import { getBravoOrderStats } from '../../api/bravoOrders'
import BravoBackground from '../../components/bravo/BravoBackground'

const inputClass = "w-full bg-[#14151b] border border-[#2b2d3d] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none transition-all duration-200 placeholder-stone-500"
const textareaClass = "w-full bg-[#14151b] border border-[#2b2d3d] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none transition-all duration-200 placeholder-stone-500 resize-y min-h-[85px]"
const btnClass = "px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.25)] disabled:opacity-50"

function FormField({ label, hint, children }) {
  return (
    <div className="space-y-1.5 text-left">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-semibold uppercase tracking-wider text-amber-200/80 font-mono">
          {label}
        </label>
        {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// =========================================================================
// FEATURE 2: LIVE PREVIEW MOCKUP CARD (SIMULADOR BRAVO EN TIEMPO REAL)
// =========================================================================
function BravoLivePreviewMockup({ hero = {}, stats = [] }) {
  const [previewMode, setPreviewMode] = useState('desktop')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const bannerActive = Boolean(hero.banner_active)
  const bannerText = hero.banner_text || '¡Precios especiales por mayor a partir de 10 unidades!'

  return (
    <div className="bg-[#10121a]/95 border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md transition-all">
      {/* Mockup Header Controls */}
      <div className="px-4 py-2.5 bg-[#171923] border-b border-[#252838] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold ml-2 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={11} /> Vista Previa Textil en Vivo
          </span>
          <span className="text-[11px] text-stone-500 font-mono hidden sm:inline">personalizacionesbravo.cl</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0c0d12] rounded-lg p-0.5 border border-[#252838]">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                previewMode === 'desktop' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <Monitor size={11} />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                previewMode === 'mobile' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <Smartphone size={11} />
              <span className="hidden sm:inline">Móvil</span>
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-stone-500 hover:text-amber-400 hover:bg-[#202330] transition-all cursor-pointer"
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
            className="p-4 sm:p-6 bg-gradient-to-b from-[#12141c] to-[#0a0b10] flex justify-center overflow-hidden"
          >
            <div 
              className={`w-full transition-all duration-300 ${
                previewMode === 'mobile' ? 'max-w-xs border-x border-amber-500/20 px-3 py-4 rounded-3xl bg-[#0c0d13] shadow-2xl' : 'max-w-4xl'
              }`}
            >
              {/* Mini Banner */}
              {bannerActive && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 py-1 px-3 bg-gradient-to-r from-amber-600/30 via-amber-500/40 to-amber-600/30 border border-amber-500/40 rounded-full text-center text-[10px] font-mono text-amber-200 tracking-wide flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                >
                  <Award size={10} className="text-amber-300 shrink-0" />
                  <span className="truncate">{bannerText}</span>
                </motion.div>
              )}

              {/* Mini Hero Content */}
              <div className="text-center space-y-3">
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-[9px] font-mono text-amber-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {hero.badge || 'TALLER DE PERSONALIZACIÓN Y ESTAMPADOS'}
                </div>

                {/* Title */}
                <h3 className={`font-black tracking-tight text-white ${previewMode === 'mobile' ? 'text-lg leading-tight' : 'text-2xl sm:text-3xl'}`}>
                  <span>{hero.title_prefix || 'DISEÑO & ESTAMPADO'}{' '}</span>
                  <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 bg-clip-text text-transparent">
                    {hero.title_highlight || 'TEXTIL PROFESIONAL'}
                  </span>
                </h3>

                {/* Description */}
                <p className={`text-stone-300 mx-auto leading-relaxed line-clamp-3 ${previewMode === 'mobile' ? 'text-[10px]' : 'text-xs max-w-2xl'}`}>
                  {hero.description || 'Confección y personalización de poleras, polerones, tazones, gorros y merchandising para empresas.'}
                </p>

                {/* CTAs */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    <Shirt size={10} />
                    {hero.cta_quote_text || 'Cotizar Pedido'}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-[#1a1c26] border border-[#2f3244] text-amber-200 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} className="text-amber-400" />
                    {hero.cta_catalog_text || 'Ver Catálogo Base'}
                  </span>
                </div>

                {/* Stats Preview Pills */}
                {stats && stats.length > 0 && (
                  <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-[#252838] mt-3">
                    {stats.map((s, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-[#141620] border border-[#272a3b] text-center">
                        <div className="text-xs sm:text-sm font-black font-mono text-amber-400 tracking-tight">{s.value}</div>
                        <div className="text-[9px] text-stone-400 font-medium truncate">{s.label}</div>
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
// PÁGINA PRINCIPAL BRAVO CMS (MASTER-DETAIL LAYOUT)
// =========================================================================
export default function BravoAdminWebPage() {
  const navigate = useNavigate()

  // Master Navigation Groups
  const NAV_SECTIONS = [
    {
      group: 'DISEÑO & PORTADA',
      items: [
        { id: 'hero', label: 'Hero & Portada', icon: Layout, desc: 'Titulares, badge y banner de descuentos' },
        { id: 'lookbook', label: 'Productos Destacados', icon: Sparkles, desc: 'Tazón, Polera, Stanley y Termo en detalle' },
        { id: 'features', label: 'Beneficios & Cifras', icon: Award, desc: '4 ventajas clave y métricas de taller' },
        { id: 'techniques', label: 'Técnicas de Taller', icon: Scissors, desc: 'DTF Textil, Sublimación y DTF UV' },
      ]
    },
    {
      group: 'CANALES & CONTENIDO',
      items: [
        { id: 'contact', label: 'Contacto & Taller', icon: MapPin, desc: 'Horarios de taller, WhatsApp y mapa' },
        { id: 'prices', label: 'Catálogo & Tarifario', icon: Clock, desc: 'Precios base por prenda y tiempos' },
        { id: 'faqs', label: 'Preguntas Frecuentes', icon: HelpCircle, desc: 'Resolución de dudas sobre archivos' },
        { id: 'policies', label: 'Políticas de Pedido', icon: HeartHandshake, desc: 'Condiciones de abono (50%) y muestras' },
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
        badge: 'TALLER DE PERSONALIZACIÓN Y ESTAMPADOS',
        title_prefix: 'DISEÑO & ESTAMPADO',
        title_highlight: 'TEXTIL PROFESIONAL',
        description: 'Confección y personalización de poleras, polerones, tazones, gorros y merchandising para empresas, eventos y uso personal en Quillota y todo Chile.',
        cta_quote_text: 'Cotizar Pedido',
        cta_catalog_text: 'Ver Catálogo Base',
        banner_active: false,
        banner_text: '¡Precios especiales por mayor a partir de 10 unidades!',
        logo_url: '/logo-bravo.jpg',
        location_tag: 'Taller Oficial · Quillota'
      },
      lookbook: {
        section_tag: 'Selección de Taller · Producción de Autor',
        section_title: 'Tres Soportes Emblemáticos en Detalle.',
        section_desc: 'Cada soporte virgen es seleccionado por su pureza molecular y comportamiento ante la temperatura de curado en Quillota.',
        tazon: {
          tag: '01 / Cerámica Vitrificada',
          subtitle: 'Sublimación Óptica 360° · Fusión a 200°C',
          title: 'Tazón Cerámico 11oz Glaze HD',
          description: 'Cerámica AAA de blancura absoluta con barniz vitrificado de alta pureza. Las tintas fotográficas se gasifican dentro del polímero, produciendo un acabado espejado indestructible resistente al lavavajillas industrial y microondas.',
          image: '/mockups/tazon_front_hd.png',
          spec1_label: 'Capacidad',
          spec1_val: '325 ml / 11 oz',
          spec2_label: 'Acabado',
          spec2_val: 'Ultra-Glossy',
          spec3_label: 'Garantía',
          spec3_val: 'Anti-Lavado'
        },
        polera: {
          tag: '02 / Algodón Premium 240g',
          subtitle: 'Confección Textil Pesada · DTF Ultra HD',
          title: 'Polera Heavyweight 240g',
          description: 'Confeccionada con algodón peinado chileno de 240 GSM. Caída estructurada de silueta limpia, cuello rib reforzado de 3cm y tacto cero al lavado mediante poliamidas elastoméricas de formulación europea.',
          image: '/mockups/polera_front.png',
          spec1_label: 'Gramaje',
          spec1_val: '240 GSM Chileno',
          spec2_label: 'Estampado',
          spec2_val: 'DTF Elastomérico',
          spec3_label: 'Costuras',
          spec3_val: 'Overlock Doble'
        },
        stanley: {
          tag: '03 / Acero Térmico Inox',
          subtitle: 'DTF UV con Relieve 3D · Aislamiento al Vacío',
          title: 'Vaso Térmico Tipo Stanley 40oz',
          description: 'Acero quirúrgico 18/8 con doble pared aislada al vacío. Conserva líquidos fríos por 24 horas y calientes por 12 horas. Incluye manilla ergonómica reforzada, tapa hermética giratoria y bombilla de acero reutilizable.',
          image: '/mockups/stanley_front_hd.png',
          spec1_label: 'Capacidad',
          spec1_val: '1.18 L / 40 oz',
          spec2_label: 'Retención',
          spec2_val: '24h Frío / 12h Calor',
          spec3_label: 'Adherencia',
          spec3_val: 'DTF UV 3D'
        },
        termo: {
          tag: '03 / Acero Térmico Inox',
          subtitle: 'DTF UV con Barniz 3D · Aislamiento al Vacío',
          title: 'Botella Térmica Inox 500ml Pro',
          description: 'Cuerpo tubular compacto en acero inoxidable 304 con tapa a rosca de sellado hermético al 100%. Acabado mate antideslizante de alta resistencia al roce y adherencia DTF UV de máxima nitidez.',
          image: '/mockups/termo_front_hd.png',
          spec1_label: 'Capacidad',
          spec1_val: '500 ml Pro',
          spec2_label: 'Retención',
          spec2_val: '18h Frío / 10h Calor',
          spec3_label: 'Cierre',
          spec3_val: 'Hermético 100%'
        }
      },
      features: [
        {
          icon: 'Sparkles',
          title: 'Sin Mínimo de Compra',
          description: 'Estampa tu diseño desde 1 sola unidad o encarga cientos para tu empresa o delegación.'
        },
        {
          icon: 'Printer',
          title: 'Tecnología DTF Ultra HD',
          description: 'Impresiones full color con máxima durabilidad, elasticidad y resistencia a los lavados.'
        },
        {
          icon: 'Truck',
          title: 'Envíos a Todo Chile',
          description: 'Retiro en taller en Quillota o despachos express a cualquier región del país.'
        },
        {
          icon: 'HeartHandshake',
          title: 'Asesoría Gráfica',
          description: 'Revisamos y optimizamos tu diseño antes de imprimir para asegurar acabados nítidos.'
        }
      ],
      stats: [
        { value: '+12.000', label: 'Prendas Personalizadas' },
        { value: '24-48h', label: 'Tiempo Promedio Express' },
        { value: '100%', label: 'Clientes Satisfechos' },
        { value: 'DTF / UV / Subli', label: 'Tecnologías de Vanguardia' }
      ],
      techniques: [
        { name: 'DTF Textil Ultra HD', desc: 'Microcápsulas de tinta pigmentada con poliamida elastomérica transferidas a 160°C. Resistencia a más de 50 lavados.' },
        { name: 'Sublimación Óptica 360°', desc: 'Vitrificado térmico a 200°C con gasificación de tinta en polímero cerámico y metálico. Apto para lavavajillas.' },
        { name: 'DTF UV con Barniz 3D', desc: 'Curado UV de alta adherencia con relieve táctil y barniz brillante sobre rígidos, acero, acrílico y cerámica.' }
      ],
      contact: {
        schedule: 'Lunes a Viernes 09:30 a 18:30 hrs | Sábados 10:00 a 14:00 hrs',
        instagram: 'https://instagram.com/personalizacionesbravo',
        facebook: 'https://facebook.com/personalizacionesbravo',
        tiktok: 'https://tiktok.com/@personalizacionesbravo',
        google_maps_url: 'https://maps.google.com'
      },
      policies: {
        order_terms: 'Los trabajos se inician con un abono previo del 50%. El saldo se cancela contra entrega en taller o antes del despacho.',
        proof_terms: 'Siempre enviamos un fotomontaje o muestra digital para tu aprobación expresa antes de mandar a producción.'
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
    category: 'Poleras'
  })
  const [showPriceForm, setShowPriceForm] = useState(false)
  const [priceCategoryFilter, setPriceCategoryFilter] = useState('all')

  // Edit FAQ modal state
  const [editingFaqIndex, setEditingFaqIndex] = useState(null)
  const [faqForm, setFaqForm] = useState({ q: '', a: '' })
  const [showFaqForm, setShowFaqForm] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getWebConfig('bravo')
      if (res.data) {
        const d = res.data
        setConfig(prev => ({
          ...prev,
          whatsapp: d.whatsapp || '',
          phone: d.phone || '',
          email: d.email || '',
          address: d.address || '',
          reference_prices: d.reference_prices || [],
          faqs: d.faqs || [],
          content: {
            ...prev.content,
            ...(d.content || {}),
            hero: { ...prev.content.hero, ...(d.content?.hero || {}) },
            lookbook: {
              ...prev.content.lookbook,
              ...(d.content?.lookbook || {}),
              tazon: { ...prev.content.lookbook.tazon, ...(d.content?.lookbook?.tazon || {}) },
              polera: { ...prev.content.lookbook.polera, ...(d.content?.lookbook?.polera || {}) },
              stanley: { ...prev.content.lookbook.stanley, ...(d.content?.lookbook?.stanley || {}) },
              termo: { ...prev.content.lookbook.termo, ...(d.content?.lookbook?.termo || {}) }
            }
          }
        }))
      }
    } catch (err) {
      console.error(err)
      setError('Error al cargar la configuración de Bravo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateWebConfig({
        system: 'bravo',
        whatsapp: config.whatsapp,
        phone: config.phone,
        email: config.email,
        address: config.address,
        reference_prices: config.reference_prices || [],
        faqs: config.faqs || [],
        content: config.content || {}
      })
      setSuccess('¡Configuración de Bravo guardada y sincronizada exitosamente!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error(err)
      setError('Error al persistir cambios en el servidor.')
    } finally {
      setSaving(false)
    }
  }

  // Update helpers
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

  const updateFeature = (idx, field, val) => {
    setConfig(prev => {
      const updated = [...prev.content.features]
      updated[idx] = { ...updated[idx], [field]: val }
      return {
        ...prev,
        content: { ...prev.content, features: updated }
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

  const updateTechnique = (idx, field, val) => {
    setConfig(prev => {
      const updated = [...prev.content.techniques]
      updated[idx] = { ...updated[idx], [field]: val }
      return {
        ...prev,
        content: { ...prev.content, techniques: updated }
      }
    })
  }

  const updateLookbookHeader = (field, val) => {
    setConfig(prev => ({
      ...prev,
      content: {
        ...prev.content,
        lookbook: {
          ...(prev.content?.lookbook || {}),
          [field]: val
        }
      }
    }))
  }

  const updateLookbookItem = (prodKey, field, val) => {
    setConfig(prev => ({
      ...prev,
      content: {
        ...prev.content,
        lookbook: {
          ...(prev.content?.lookbook || {}),
          [prodKey]: {
            ...(prev.content?.lookbook?.[prodKey] || {}),
            [field]: val
          }
        }
      }
    }))
  }

  // =========================================================================
  // FEATURE 3: PRESET BUTTONS & DB SYNC PARA BRAVO
  // =========================================================================
  const handleLoadRecommendedPresets = () => {
    const recommendedStats = [
      { value: '+12.000', label: 'Prendas Personalizadas' },
      { value: '24-48h', label: 'Despacho Express' },
      { value: '100%', label: 'Clientes Satisfechos' },
      { value: 'DTF / UV / Subli', label: 'Tecnología Ultra HD' }
    ]
    setConfig(prev => ({
      ...prev,
      content: {
        ...prev.content,
        stats: recommendedStats
      }
    }))
    setSuccess('💡 Métricas recomendadas de Bravo cargadas.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSyncWithRealDatabase = async () => {
    setSyncingStats(true)
    setError('')
    try {
      const res = await getBravoOrderStats()
      const data = res.data

      const totalOrders = data.total_orders || 150
      const successRate = data.success_rate || 98.0
      const avgSla = Math.ceil(data.avg_sla_hours || 24)

      const dbSyncedStats = [
        { value: `+${totalOrders * 5}`, label: 'Prendas Confeccionadas' },
        { value: `${avgSla}h`, label: 'Turnaround Promedio' },
        { value: `${successRate}%`, label: 'Entregas Conformes' },
        { value: 'DTF / Vinilo', label: 'Maquinaria Calibrada' }
      ]

      setConfig(prev => ({
        ...prev,
        content: {
          ...prev.content,
          stats: dbSyncedStats
        }
      }))
      setSuccess(`⚡ ¡Sincronizado con base de datos de Bravo! (${totalOrders} órdenes consolidadas).`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      console.error(err)
      setError('Error al consultar estadísticas del taller textil en BD.')
    } finally {
      setSyncingStats(false)
    }
  }

  // Price modal
  const handleOpenPriceModal = (index = null) => {
    if (index !== null) {
      setEditingPriceIndex(index)
      setPriceForm({ ...config.reference_prices[index] })
    } else {
      setEditingPriceIndex(null)
      setPriceForm({ device: '', service: '', price: '', time: '', category: 'Poleras' })
    }
    setShowPriceForm(true)
  }

  const handleSavePrice = () => {
    if (!priceForm.device || !priceForm.service || !priceForm.price) {
      alert('Por favor complete prenda, técnica y precio.')
      return
    }
    const updated = [...(config.reference_prices || [])]
    if (editingPriceIndex !== null) {
      updated[editingPriceIndex] = priceForm
    } else {
      updated.push(priceForm)
    }
    setConfig(prev => ({ ...prev, reference_prices: updated }))
    setShowPriceForm(false)
  }

  const handleDeletePrice = (index) => {
    if (!window.confirm('¿Eliminar este precio de referencia textil?')) return
    const updated = config.reference_prices.filter((_, i) => i !== index)
    setConfig(prev => ({ ...prev, reference_prices: updated }))
  }

  // FAQ modal
  const handleOpenFaqModal = (index = null) => {
    if (index !== null) {
      setEditingFaqIndex(index)
      const current = config.faqs[index]
      setFaqForm({ q: current.question || current.q || '', a: current.answer || current.a || '' })
    } else {
      setEditingFaqIndex(null)
      setFaqForm({ q: '', a: '' })
    }
    setShowFaqForm(true)
  }

  const handleSaveFaq = () => {
    if (!faqForm.q || !faqForm.a) {
      alert('Por favor complete pregunta y respuesta.')
      return
    }
    const normalizedFaq = { question: faqForm.q, answer: faqForm.a, q: faqForm.q, a: faqForm.a }
    const updated = [...(config.faqs || [])]
    if (editingFaqIndex !== null) {
      updated[editingFaqIndex] = normalizedFaq
    } else {
      updated.push(normalizedFaq)
    }
    setConfig(prev => ({ ...prev, faqs: updated }))
    setShowFaqForm(false)
  }

  const handleDeleteFaq = (index) => {
    if (!window.confirm('¿Eliminar esta pregunta frecuente?')) return
    const updated = config.faqs.filter((_, i) => i !== index)
    setConfig(prev => ({ ...prev, faqs: updated }))
  }

  return (
    <div className="relative min-h-screen bg-[#0b0c10] text-stone-200 p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-black">
      <BravoBackground />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#252838]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/bravo/orders')}
              className="p-2.5 rounded-xl bg-[#151722] hover:bg-amber-500/20 text-stone-400 hover:text-amber-400 border border-[#252838] transition-all cursor-pointer"
              title="Volver a Órdenes Textiles"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-mono">
                  Editor CMS Web <span className="text-amber-400">Bravo</span>
                </h1>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Gestión dinámica del taller de personalización textil y estampados para la web pública
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <a
              href="/bravo-public"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-[#151722] hover:bg-[#1f2233] text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
              className="p-3.5 bg-amber-950/60 border border-amber-500/50 rounded-xl flex items-center justify-between text-amber-200 text-xs shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                <span>{success}</span>
              </div>
              <button onClick={() => setSuccess('')} className="hover:text-white cursor-pointer"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            MASTER-DETAIL GRID ARCHITECTURE (BRAVO)
           ========================================================================= */}
        <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* 1. MASTER: LEFT VERTICAL NAVIGATION */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">
            <div className="bg-[#12141d]/90 border border-[#252838] rounded-2xl p-3.5 backdrop-blur-md shadow-xl space-y-4">
              
              {NAV_SECTIONS.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1.5">
                  <div className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
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
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                              : 'text-stone-400 hover:text-white hover:bg-[#1b1e2c] border border-transparent'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-[#1a1d29] text-stone-400'}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{item.label}</div>
                            <div className="text-[10px] text-stone-400 truncate">{item.desc}</div>
                          </div>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-[#252838] flex items-center justify-between text-[10px] font-mono text-stone-400 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Taller Conectado
                </span>
                <span className="text-amber-400">PostgreSQL</span>
              </div>
            </div>
          </aside>

          {/* 2. DETAIL: RIGHT WORKSPACE AREA */}
          <main className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
            
            {/* Top: Bravo Live Preview Mockup Card */}
            <BravoLivePreviewMockup 
              hero={config.content?.hero || {}} 
              stats={config.content?.stats || []} 
            />

            {/* Active Content Editor Card */}
            <div className="bg-[#12141e]/90 border border-[#252838] rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-amber-400">
                  <RefreshCw className="animate-spin" size={24} />
                  <span className="text-xs font-mono">Cargando configuración textil...</span>
                </div>
              ) : (
                <>
                  {/* TAB 1: HERO & PORTADA */}
                  {activeTab === 'hero' && (
                    <div className="space-y-6">
                      <div className="border-b border-[#252838] pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Layout className="text-amber-400" size={16} /> Portada Principal (Hero)
                        </h2>
                        <p className="text-xs text-stone-400 mt-1">Titulares de taller gráfico, propuesta de valor y botones de llamado a la acción.</p>
                      </div>

                      {/* Promo Ticker Banner */}
                      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="text-amber-400" size={16} />
                            <span className="text-xs font-bold text-white uppercase">Cinta de Anuncio Superior (Promoción Textil)</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(config.content?.hero?.banner_active)}
                              onChange={(e) => updateHero('banner_active', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[#1b1d28] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        </div>
                        {config.content?.hero?.banner_active && (
                          <FormField label="Texto de la Promoción Textil" hint="Visible en la cinta superior de la landing">
                            <input
                              type="text"
                              value={config.content?.hero?.banner_text || ''}
                              onChange={(e) => updateHero('banner_text', e.target.value)}
                              placeholder="Ej: ¡Precios especiales por mayor a partir de 10 unidades!"
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
                            placeholder="TALLER DE PERSONALIZACIÓN Y ESTAMPADOS"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Prefijo del Título" hint="Texto antes del gradiente">
                          <input
                            type="text"
                            value={config.content?.hero?.title_prefix || ''}
                            onChange={(e) => updateHero('title_prefix', e.target.value)}
                            placeholder="DISEÑO & ESTAMPADO"
                            className={inputClass}
                          />
                        </FormField>

                        <div className="sm:col-span-2">
                          <FormField label="Palabra / Frase Destacada" hint="Gradiente ámbar/dorado de impacto">
                            <input
                              type="text"
                              value={config.content?.hero?.title_highlight || ''}
                              onChange={(e) => updateHero('title_highlight', e.target.value)}
                              placeholder="TEXTIL PROFESIONAL"
                              className={inputClass}
                            />
                          </FormField>
                        </div>

                        <div className="sm:col-span-2">
                          <FormField label="Descripción Comercial" hint="Bajada explicativa de prendas y servicios">
                            <textarea
                              value={config.content?.hero?.description || ''}
                              onChange={(e) => updateHero('description', e.target.value)}
                              className={textareaClass}
                            />
                          </FormField>
                        </div>

                        <FormField label="Texto Botón Cotizar" hint="Llamada a la acción principal">
                          <input
                            type="text"
                            value={config.content?.hero?.cta_quote_text || ''}
                            onChange={(e) => updateHero('cta_quote_text', e.target.value)}
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Texto Botón Catálogo" hint="Acción secundaria">
                          <input
                            type="text"
                            value={config.content?.hero?.cta_catalog_text || ''}
                            onChange={(e) => updateHero('cta_catalog_text', e.target.value)}
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="URL del Logotipo / Medallón" hint="Ruta de imagen de taller">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={config.content?.hero?.logo_url || ''}
                              onChange={(e) => updateHero('logo_url', e.target.value)}
                              placeholder="/logo-bravo.jpg"
                              className={inputClass}
                            />
                            {config.content?.hero?.logo_url && (
                              <img
                                src={config.content.hero.logo_url}
                                alt="Logo Preview"
                                className="w-9 h-9 object-cover rounded-full border border-amber-400/50 shrink-0"
                              />
                            )}
                          </div>
                        </FormField>

                        <FormField label="Localidad / Frase del Badge" hint="Ej: Taller Oficial · Quillota">
                          <input
                            type="text"
                            value={config.content?.hero?.location_tag || ''}
                            onChange={(e) => updateHero('location_tag', e.target.value)}
                            placeholder="Taller Oficial · Quillota"
                            className={inputClass}
                          />
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* TAB: PRODUCTOS DESTACADOS (LOOKBOOK) */}
                  {activeTab === 'lookbook' && (
                    <div className="space-y-8">
                      <div className="border-b border-[#252838] pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Sparkles className="text-amber-400" size={16} /> Productos Destacados (Lookbook de Autor)
                        </h2>
                        <p className="text-xs text-stone-400 mt-1">
                          Edición integral de textos, fichas técnicas e imágenes de los tres soportes emblemáticos presentados en la web pública.
                        </p>
                      </div>

                      {/* Cabecera general de la sección */}
                      <div className="p-4 rounded-xl bg-[#0e1017] border border-[#252838] space-y-4">
                        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
                          Cabecera de la Sección Lookbook
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Tag / Píldora Superior">
                            <input
                              type="text"
                              value={config.content?.lookbook?.section_tag || ''}
                              onChange={(e) => updateLookbookHeader('section_tag', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Título de la Sección">
                            <input
                              type="text"
                              value={config.content?.lookbook?.section_title || ''}
                              onChange={(e) => updateLookbookHeader('section_title', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <div className="sm:col-span-2">
                            <FormField label="Bajada Descriptiva">
                              <textarea
                                value={config.content?.lookbook?.section_desc || ''}
                                onChange={(e) => updateLookbookHeader('section_desc', e.target.value)}
                                className={textareaClass}
                              />
                            </FormField>
                          </div>
                        </div>
                      </div>

                      {/* Producto 1: Tazón Cerámico */}
                      <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#252838] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#252838] pb-3">
                          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Soporte 01 · Tazón Cerámico Glaze HD
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">Cerámica Vitrificada</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Tag de Soporte">
                            <input
                              type="text"
                              value={config.content?.lookbook?.tazon?.tag || ''}
                              onChange={(e) => updateLookbookItem('tazon', 'tag', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Subtítulo Técnico">
                            <input
                              type="text"
                              value={config.content?.lookbook?.tazon?.subtitle || ''}
                              onChange={(e) => updateLookbookItem('tazon', 'subtitle', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Título Comercial">
                            <input
                              type="text"
                              value={config.content?.lookbook?.tazon?.title || ''}
                              onChange={(e) => updateLookbookItem('tazon', 'title', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Ruta / URL de la Imagen" hint="PNG o WebP con fondo transparente">
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={config.content?.lookbook?.tazon?.image || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'image', e.target.value)}
                                className={inputClass}
                              />
                              {config.content?.lookbook?.tazon?.image && (
                                <img
                                  src={config.content.lookbook.tazon.image}
                                  alt="Preview"
                                  className="w-9 h-9 object-contain bg-black/60 rounded-lg border border-[#2b2d3d] p-0.5 shrink-0"
                                />
                              )}
                            </div>
                          </FormField>
                          <div className="sm:col-span-2">
                            <FormField label="Descripción del Producto y Proceso">
                              <textarea
                                value={config.content?.lookbook?.tazon?.description || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'description', e.target.value)}
                                className={textareaClass}
                              />
                            </FormField>
                          </div>
                        </div>

                        {/* Especificaciones Técnicas */}
                        <div className="pt-2 border-t border-[#252838] space-y-2">
                          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                            Especificaciones Técnicas (3 Columnas)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Etiqueta (ej: Capacidad)"
                                value={config.content?.lookbook?.tazon?.spec1_label || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'spec1_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Valor (ej: 325 ml / 11 oz)"
                                value={config.content?.lookbook?.tazon?.spec1_val || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'spec1_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Etiqueta (ej: Acabado)"
                                value={config.content?.lookbook?.tazon?.spec2_label || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'spec2_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Valor (ej: Ultra-Glossy)"
                                value={config.content?.lookbook?.tazon?.spec2_val || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'spec2_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Etiqueta (ej: Garantía)"
                                value={config.content?.lookbook?.tazon?.spec3_label || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'spec3_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Valor (ej: Anti-Lavado)"
                                value={config.content?.lookbook?.tazon?.spec3_val || ''}
                                onChange={(e) => updateLookbookItem('tazon', 'spec3_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Producto 2: Polera Heavyweight */}
                      <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#252838] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#252838] pb-3">
                          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Soporte 02 · Polera Heavyweight 240g
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">Textil Pesado</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Tag de Soporte">
                            <input
                              type="text"
                              value={config.content?.lookbook?.polera?.tag || ''}
                              onChange={(e) => updateLookbookItem('polera', 'tag', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Subtítulo Técnico">
                            <input
                              type="text"
                              value={config.content?.lookbook?.polera?.subtitle || ''}
                              onChange={(e) => updateLookbookItem('polera', 'subtitle', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Título Comercial">
                            <input
                              type="text"
                              value={config.content?.lookbook?.polera?.title || ''}
                              onChange={(e) => updateLookbookItem('polera', 'title', e.target.value)}
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Ruta / URL de la Imagen" hint="PNG o WebP con fondo transparente">
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={config.content?.lookbook?.polera?.image || ''}
                                onChange={(e) => updateLookbookItem('polera', 'image', e.target.value)}
                                className={inputClass}
                              />
                              {config.content?.lookbook?.polera?.image && (
                                <img
                                  src={config.content.lookbook.polera.image}
                                  alt="Preview"
                                  className="w-9 h-9 object-contain bg-black/60 rounded-lg border border-[#2b2d3d] p-0.5 shrink-0"
                                />
                              )}
                            </div>
                          </FormField>
                          <div className="sm:col-span-2">
                            <FormField label="Descripción del Producto y Proceso">
                              <textarea
                                value={config.content?.lookbook?.polera?.description || ''}
                                onChange={(e) => updateLookbookItem('polera', 'description', e.target.value)}
                                className={textareaClass}
                              />
                            </FormField>
                          </div>
                        </div>

                        {/* Especificaciones Técnicas */}
                        <div className="pt-2 border-t border-[#252838] space-y-2">
                          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                            Especificaciones Técnicas (3 Columnas)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Etiqueta (ej: Gramaje)"
                                value={config.content?.lookbook?.polera?.spec1_label || ''}
                                onChange={(e) => updateLookbookItem('polera', 'spec1_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Valor (ej: 240 GSM Chileno)"
                                value={config.content?.lookbook?.polera?.spec1_val || ''}
                                onChange={(e) => updateLookbookItem('polera', 'spec1_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Etiqueta (ej: Estampado)"
                                value={config.content?.lookbook?.polera?.spec2_label || ''}
                                onChange={(e) => updateLookbookItem('polera', 'spec2_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Valor (ej: DTF Elastomérico)"
                                value={config.content?.lookbook?.polera?.spec2_val || ''}
                                onChange={(e) => updateLookbookItem('polera', 'spec2_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Etiqueta (ej: Costuras)"
                                value={config.content?.lookbook?.polera?.spec3_label || ''}
                                onChange={(e) => updateLookbookItem('polera', 'spec3_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Valor (ej: Overlock Doble)"
                                value={config.content?.lookbook?.polera?.spec3_val || ''}
                                onChange={(e) => updateLookbookItem('polera', 'spec3_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Producto 3: Soportes Térmicos (Stanley & Termo) */}
                      <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#252838] space-y-6">
                        <div className="flex items-center justify-between border-b border-[#252838] pb-3">
                          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Soporte 03 · Línea Térmica Inox (Stanley & Termo)
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">Acero Quirúrgico</span>
                        </div>

                        {/* Configuración Stanley */}
                        <div className="space-y-3 p-4 rounded-xl bg-[#14151e] border border-[#252838]">
                          <span className="text-xs font-bold text-amber-300 font-mono uppercase block">
                            Sub-Producto A: Vaso Térmico Stanley 40oz
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Título Comercial Stanley">
                              <input
                                type="text"
                                value={config.content?.lookbook?.stanley?.title || ''}
                                onChange={(e) => updateLookbookItem('stanley', 'title', e.target.value)}
                                className={inputClass}
                              />
                            </FormField>
                            <FormField label="Ruta / URL Imagen Stanley" hint="Mockup aislado en alta resolución">
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={config.content?.lookbook?.stanley?.image || ''}
                                  onChange={(e) => updateLookbookItem('stanley', 'image', e.target.value)}
                                  className={inputClass}
                                />
                                {config.content?.lookbook?.stanley?.image && (
                                  <img
                                    src={config.content.lookbook.stanley.image}
                                    alt="Preview"
                                    className="w-9 h-9 object-contain bg-black/60 rounded-lg border border-[#2b2d3d] p-0.5 shrink-0"
                                  />
                                )}
                              </div>
                            </FormField>
                            <div className="sm:col-span-2">
                              <FormField label="Descripción Stanley">
                                <textarea
                                  value={config.content?.lookbook?.stanley?.description || ''}
                                  onChange={(e) => updateLookbookItem('stanley', 'description', e.target.value)}
                                  className={textareaClass}
                                />
                              </FormField>
                            </div>
                          </div>
                          {/* Specs Stanley */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Capacidad"
                                value={config.content?.lookbook?.stanley?.spec1_label || ''}
                                onChange={(e) => updateLookbookItem('stanley', 'spec1_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="1.18 L / 40 oz"
                                value={config.content?.lookbook?.stanley?.spec1_val || ''}
                                onChange={(e) => updateLookbookItem('stanley', 'spec1_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Retención"
                                value={config.content?.lookbook?.stanley?.spec2_label || ''}
                                onChange={(e) => updateLookbookItem('stanley', 'spec2_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="24h Frío / 12h Calor"
                                value={config.content?.lookbook?.stanley?.spec2_val || ''}
                                onChange={(e) => updateLookbookItem('stanley', 'spec2_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Adherencia"
                                value={config.content?.lookbook?.stanley?.spec3_label || ''}
                                onChange={(e) => updateLookbookItem('stanley', 'spec3_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="DTF UV 3D"
                                value={config.content?.lookbook?.stanley?.spec3_val || ''}
                                onChange={(e) => updateLookbookItem('stanley', 'spec3_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Configuración Termo */}
                        <div className="space-y-3 p-4 rounded-xl bg-[#14151e] border border-[#252838]">
                          <span className="text-xs font-bold text-amber-300 font-mono uppercase block">
                            Sub-Producto B: Botella Térmica Inox 500ml Pro
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Título Comercial Termo">
                              <input
                                type="text"
                                value={config.content?.lookbook?.termo?.title || ''}
                                onChange={(e) => updateLookbookItem('termo', 'title', e.target.value)}
                                className={inputClass}
                              />
                            </FormField>
                            <FormField label="Ruta / URL Imagen Termo" hint="Mockup aislado en alta resolución">
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={config.content?.lookbook?.termo?.image || ''}
                                  onChange={(e) => updateLookbookItem('termo', 'image', e.target.value)}
                                  className={inputClass}
                                />
                                {config.content?.lookbook?.termo?.image && (
                                  <img
                                    src={config.content.lookbook.termo.image}
                                    alt="Preview"
                                    className="w-9 h-9 object-contain bg-black/60 rounded-lg border border-[#2b2d3d] p-0.5 shrink-0"
                                  />
                                )}
                              </div>
                            </FormField>
                            <div className="sm:col-span-2">
                              <FormField label="Descripción Termo">
                                <textarea
                                  value={config.content?.lookbook?.termo?.description || ''}
                                  onChange={(e) => updateLookbookItem('termo', 'description', e.target.value)}
                                  className={textareaClass}
                                />
                              </FormField>
                            </div>
                          </div>
                          {/* Specs Termo */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Capacidad"
                                value={config.content?.lookbook?.termo?.spec1_label || ''}
                                onChange={(e) => updateLookbookItem('termo', 'spec1_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="500 ml Pro"
                                value={config.content?.lookbook?.termo?.spec1_val || ''}
                                onChange={(e) => updateLookbookItem('termo', 'spec1_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Retención"
                                value={config.content?.lookbook?.termo?.spec2_label || ''}
                                onChange={(e) => updateLookbookItem('termo', 'spec2_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="18h Frío / 10h Calor"
                                value={config.content?.lookbook?.termo?.spec2_val || ''}
                                onChange={(e) => updateLookbookItem('termo', 'spec2_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Cierre"
                                value={config.content?.lookbook?.termo?.spec3_label || ''}
                                onChange={(e) => updateLookbookItem('termo', 'spec3_label', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-amber-200/80 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Hermético 100%"
                                value={config.content?.lookbook?.termo?.spec3_val || ''}
                                onChange={(e) => updateLookbookItem('termo', 'spec3_val', e.target.value)}
                                className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: BENEFICIOS Y CIFRAS CON PRESETS */}
                  {activeTab === 'features' && (
                    <div className="space-y-8">
                      <div className="border-b border-[#252838] pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Award className="text-amber-400" size={16} /> Beneficios y Cifras de Taller
                        </h2>
                        <p className="text-xs text-stone-400 mt-1">Configura las 4 propuestas de valor diferenciales y los indicadores destacados.</p>
                      </div>

                      {/* 4 Feature Cards */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-400" /> Propuesta de Valor Diferencial (4 Módulos)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(config.content?.features || []).map((feat, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-[#0e1017] border border-[#252838] space-y-3 text-left">
                              <div className="flex items-center justify-between border-b border-[#252838] pb-2">
                                <span className="text-xs font-mono font-bold text-amber-400">Beneficio #{idx + 1}</span>
                              </div>
                              <FormField label="Título del Beneficio">
                                <input
                                  type="text"
                                  value={feat.title || ''}
                                  onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                                  className={inputClass}
                                />
                              </FormField>
                              <FormField label="Descripción">
                                <textarea
                                  value={feat.description || ''}
                                  onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                                  className="w-full bg-[#14151b] border border-[#2b2d3d] rounded-xl p-2.5 text-xs text-white min-h-[60px]"
                                />
                              </FormField>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FEATURE 3: STATS PRESETS & DB SYNC */}
                      <div className="space-y-4 pt-4 border-t border-[#252838]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                              <Sliders size={14} className="text-amber-400" /> Indicadores Textil Destacados
                            </h3>
                            <p className="text-[11px] text-stone-400">Puebla las métricas del taller o sincronízalas con las órdenes reales de PostgreSQL.</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleLoadRecommendedPresets}
                              className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
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
                              title="Calcular valores a partir de pedidos textiles en PostgreSQL"
                            >
                              {syncingStats ? <RefreshCw className="animate-spin" size={12} /> : <Zap size={12} />}
                              <span>⚡ Sincronizar con BD</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {(config.content?.stats || []).map((stat, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-[#0e1017] border border-[#252838] space-y-3 text-left">
                              <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">Métrica #{idx + 1}</div>
                              <FormField label="Valor Numérico / Cifra">
                                <input
                                  type="text"
                                  value={stat.value || ''}
                                  onChange={(e) => updateStat(idx, 'value', e.target.value)}
                                  placeholder="+12.000"
                                  className={inputClass}
                                />
                              </FormField>
                              <FormField label="Etiqueta / Concepto">
                                <input
                                  type="text"
                                  value={stat.label || ''}
                                  onChange={(e) => updateStat(idx, 'label', e.target.value)}
                                  placeholder="Prendas Personalizadas"
                                  className={inputClass}
                                />
                              </FormField>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TÉCNICAS DE ESTAMPADO */}
                  {activeTab === 'techniques' && (
                    <div className="space-y-6">
                      <div className="border-b border-[#252838] pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Scissors className="text-amber-400" size={16} /> Técnicas de Estampado y Producción
                        </h2>
                        <p className="text-xs text-stone-400 mt-1">Describe los métodos de estampado para que el cliente elija el proceso ideal para su pedido.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(config.content?.techniques || []).map((tech, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-[#0e1017] border border-[#252838] space-y-3 text-left">
                            <div className="text-xs font-mono font-bold text-amber-400 border-b border-[#252838] pb-1.5">
                              Técnica #{idx + 1}
                            </div>
                            <FormField label="Nombre de la Técnica">
                              <input
                                type="text"
                                value={tech.name || ''}
                                onChange={(e) => updateTechnique(idx, 'name', e.target.value)}
                                className={inputClass}
                              />
                            </FormField>
                            <FormField label="Descripción y Usos Recomendados">
                              <textarea
                                value={tech.desc || ''}
                                onChange={(e) => updateTechnique(idx, 'desc', e.target.value)}
                                rows={3}
                                className={textareaClass}
                              />
                            </FormField>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: CONTACTO Y TALLER */}
                  {activeTab === 'contact' && (
                    <div className="space-y-6">
                      <div className="border-b border-[#252838] pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <MapPin className="text-amber-400" size={16} /> Canales de Ventas & Taller
                        </h2>
                        <p className="text-xs text-stone-400 mt-1">Teléfonos, WhatsApp de ventas, horarios de taller físico y redes sociales.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="WhatsApp de Ventas" hint="Formato internacional">
                          <input
                            type="text"
                            value={config.whatsapp || ''}
                            onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
                            placeholder="+56912345678"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Teléfono Fijo / Taller" hint="Llamadas de pedidos">
                          <input
                            type="text"
                            value={config.phone || ''}
                            onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                            placeholder="+56 33 2456789"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Correo Electrónico de Ventas">
                          <input
                            type="email"
                            value={config.email || ''}
                            onChange={(e) => setConfig({ ...config, email: e.target.value })}
                            placeholder="ventas@personalizacionesbravo.cl"
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Dirección del Taller">
                          <input
                            type="text"
                            value={config.address || ''}
                            onChange={(e) => setConfig({ ...config, address: e.target.value })}
                            placeholder="Av. Valparaíso 456, Quillota"
                            className={inputClass}
                          />
                        </FormField>

                        <div className="sm:col-span-2">
                          <FormField label="Horarios de Atención del Taller" hint="Jornada para retiro de prendas">
                            <input
                              type="text"
                              value={config.content?.contact?.schedule || ''}
                              onChange={(e) => updateContactExtra('schedule', e.target.value)}
                              placeholder="Lunes a Viernes 09:30 a 18:30 hrs | Sábados 10:00 a 14:00 hrs"
                              className={inputClass}
                            />
                          </FormField>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#252838] space-y-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Share2 size={14} className="text-amber-400" /> Presencia Digital & Redes Sociales
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Instagram URL">
                            <input
                              type="url"
                              value={config.content?.contact?.instagram || ''}
                              onChange={(e) => updateContactExtra('instagram', e.target.value)}
                              placeholder="https://instagram.com/personalizacionesbravo"
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="Facebook URL">
                            <input
                              type="url"
                              value={config.content?.contact?.facebook || ''}
                              onChange={(e) => updateContactExtra('facebook', e.target.value)}
                              placeholder="https://facebook.com/personalizacionesbravo"
                              className={inputClass}
                            />
                          </FormField>
                          <FormField label="TikTok URL">
                            <input
                              type="url"
                              value={config.content?.contact?.tiktok || ''}
                              onChange={(e) => updateContactExtra('tiktok', e.target.value)}
                              placeholder="https://tiktok.com/@personalizacionesbravo"
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

                  {/* TAB 5: CATÁLOGO Y TARIFAS */}
                  {activeTab === 'prices' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#252838] pb-4">
                        <div>
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            <Clock className="text-amber-400" size={16} /> Precios Base y Catálogo Textil
                          </h2>
                          <p className="text-xs text-stone-400 mt-1">Precios referenciales por prenda e impresión en la web pública.</p>
                        </div>
                        <button
                          onClick={() => handleOpenPriceModal()}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        >
                          <Plus size={14} /> <span>Nuevo Producto</span>
                        </button>
                      </div>

                      {/* Filter by Category */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {['all', 'Poleras', 'Polerones', 'Tazones', 'Jockeys', 'Accesorios'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setPriceCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                              priceCategoryFilter === cat 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' 
                                : 'bg-[#14151e] text-stone-400 hover:text-white border border-[#252838]'
                            }`}
                          >
                            {cat === 'all' ? 'Todos' : cat}
                          </button>
                        ))}
                      </div>

                      {/* Prices Table */}
                      <div className="overflow-x-auto rounded-xl border border-[#252838]">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-[#151722] border-b border-[#252838] font-mono uppercase text-stone-400 text-[11px]">
                            <tr>
                              <th className="p-3">Categoría</th>
                              <th className="p-3">Artículo / Prenda</th>
                              <th className="p-3">Técnica / Trabajo</th>
                              <th className="p-3">Precio Base</th>
                              <th className="p-3">Plazo</th>
                              <th className="p-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#252838] bg-[#0d0f15]">
                            {(config.reference_prices || [])
                              .filter(p => priceCategoryFilter === 'all' || p.category === priceCategoryFilter)
                              .map((p, idx) => (
                                <tr key={idx} className="hover:bg-[#151722]/40 transition-colors">
                                  <td className="p-3 font-mono text-amber-400">{p.category || 'Poleras'}</td>
                                  <td className="p-3 font-semibold text-white">{p.device}</td>
                                  <td className="p-3 text-stone-300">{p.service}</td>
                                  <td className="p-3 font-mono font-bold text-emerald-400">{p.price}</td>
                                  <td className="p-3 font-mono text-stone-400">{p.time}</td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleOpenPriceModal(idx)}
                                        className="p-1.5 rounded-lg bg-[#1b1e2c] hover:bg-amber-500/20 text-stone-400 hover:text-amber-300 cursor-pointer"
                                        title="Editar"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeletePrice(idx)}
                                        className="p-1.5 rounded-lg bg-[#1b1e2c] hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 cursor-pointer"
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
                                <td colSpan="6" className="p-8 text-center text-stone-500 text-xs font-mono">
                                  No hay precios configurados para Bravo.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: PREGUNTAS FRECUENTES */}
                  {activeTab === 'faqs' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#252838] pb-4">
                        <div>
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            <HelpCircle className="text-amber-400" size={16} /> Preguntas Frecuentes (FAQs)
                          </h2>
                          <p className="text-xs text-stone-400 mt-1">Dudas usuales sobre formatos de archivos (PNG/Vector), tiempos de despacho y muestras.</p>
                        </div>
                        <button
                          onClick={() => handleOpenFaqModal()}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        >
                          <Plus size={14} /> <span>Nueva FAQ</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(config.faqs || []).map((faq, idx) => {
                          const question = faq.question || faq.q || ''
                          const answer = faq.answer || faq.a || ''
                          return (
                            <div key={idx} className="p-4 rounded-xl bg-[#0e1017] border border-[#252838] space-y-2 text-left">
                              <div className="flex items-start justify-between gap-3">
                                <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                                  <span className="font-mono text-amber-400 text-xs">Q{idx + 1}:</span>
                                  <span>{question}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleOpenFaqModal(idx)}
                                    className="p-1.5 rounded-lg bg-[#171924] hover:bg-amber-500/20 text-stone-400 hover:text-amber-300 cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFaq(idx)}
                                    className="p-1.5 rounded-lg bg-[#171924] hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-stone-400 pl-6 leading-relaxed">{answer}</p>
                            </div>
                          )
                        })}

                        {(config.faqs || []).length === 0 && (
                          <div className="p-10 text-center text-stone-500 text-xs font-mono border border-dashed border-[#252838] rounded-xl">
                            No hay preguntas frecuentes registradas.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 7: POLÍTICAS DE PEDIDO */}
                  {activeTab === 'policies' && (
                    <div className="space-y-6">
                      <div className="border-b border-[#252838] pb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <HeartHandshake className="text-amber-400" size={16} /> Políticas de Pedido y Aprobación
                        </h2>
                        <p className="text-xs text-stone-400 mt-1">Normas de abonos previos, muestras digitales y garantías de confección.</p>
                      </div>

                      <div className="space-y-4">
                        <FormField label="Términos de Pago y Abonos" hint="Condiciones comerciales (ej. 50% anticipo)">
                          <textarea
                            value={config.content?.policies?.order_terms || ''}
                            onChange={(e) => updatePolicy('order_terms', e.target.value)}
                            rows={4}
                            className={textareaClass}
                          />
                        </FormField>

                        <FormField label="Aprobación de Muestras y Fotomontajes" hint="Validación de color y diseño">
                          <textarea
                            value={config.content?.policies?.proof_terms || ''}
                            onChange={(e) => updatePolicy('proof_terms', e.target.value)}
                            rows={4}
                            className={textareaClass}
                          />
                        </FormField>
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
        {showPriceForm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151722] border border-[#2b2d3d] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-[#2b2d3d] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  {editingPriceIndex !== null ? 'Editar Artículo' : 'Nuevo Artículo Textil'}
                </h3>
                <button onClick={() => setShowPriceForm(false)} className="text-stone-400 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <FormField label="Categoría Textil">
                  <select
                    value={priceForm.category}
                    onChange={(e) => setPriceForm({ ...priceForm, category: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Poleras">Poleras</option>
                    <option value="Polerones">Polerones</option>
                    <option value="Tazones">Tazones</option>
                    <option value="Jockeys">Jockeys</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </FormField>

                <FormField label="Artículo / Prenda Base">
                  <input
                    type="text"
                    value={priceForm.device}
                    onChange={(e) => setPriceForm({ ...priceForm, device: e.target.value })}
                    placeholder="Ej: Polera 100% Algodón Gildan"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Técnica / Estampado">
                  <input
                    type="text"
                    value={priceForm.service}
                    onChange={(e) => setPriceForm({ ...priceForm, service: e.target.value })}
                    placeholder="Ej: DTF Pecho y Espalda"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Precio Estimado">
                  <input
                    type="text"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                    placeholder="Ej: Desde $9.990 c/u"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Tiempo de Entrega">
                  <input
                    type="text"
                    value={priceForm.time}
                    onChange={(e) => setPriceForm({ ...priceForm, time: e.target.value })}
                    placeholder="Ej: 24 a 48 Horas"
                    className={inputClass}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2b2d3d]">
                <button
                  type="button"
                  onClick={() => setShowPriceForm(false)}
                  className="px-4 py-2 bg-[#202230] hover:bg-[#282a3c] text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePrice}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer"
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
        {showFaqForm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151722] border border-[#2b2d3d] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-[#2b2d3d] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  {editingFaqIndex !== null ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}
                </h3>
                <button onClick={() => setShowFaqForm(false)} className="text-stone-400 hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <FormField label="Pregunta">
                  <input
                    type="text"
                    value={faqForm.q}
                    onChange={(e) => setFaqForm({ ...faqForm, q: e.target.value })}
                    placeholder="Ej: ¿En qué formato debo enviar mi diseño?"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Respuesta Detallada">
                  <textarea
                    value={faqForm.a}
                    onChange={(e) => setFaqForm({ ...faqForm, a: e.target.value })}
                    rows={4}
                    placeholder="Ej: Preferimos archivos PNG en alta resolución (300 DPI) con fondo transparente..."
                    className={textareaClass}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2b2d3d]">
                <button
                  type="button"
                  onClick={() => setShowFaqForm(false)}
                  className="px-4 py-2 bg-[#202230] hover:bg-[#282a3c] text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFaq}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer"
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
