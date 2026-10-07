import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Menu, X, ExternalLink, Box, ArrowRight, MessageSquare,
  Sparkles, Check, RefreshCw, Camera, Trash2, Eye,
  Layers, Zap, ShieldCheck, Ruler, Scissors, Droplets
} from 'lucide-react'
import {
  getPublicProducts, requestOrder, trackRepair, getWebConfig,
  getTrackComments, createTrackComment, uploadPublicDesign
} from '../../api/public'
import Bravo3DSimulator from '../../components/bravo/Bravo3DSimulator'
import BravoHero3DCanvas from '../../components/bravo/BravoHero3DCanvas'
import BravoLiveChatWidget from '../../components/bravo/BravoLiveChatWidget'
import { getRandomProductType } from '../../utils/bravoMockupProducts'
import { BRAVO_CORE_CATALOG, BRAVO_CATEGORIES, mergeCatalogWithBackend } from '../../utils/bravoCatalogData'
import { parseError } from '../../utils/errors'

// Convierte un DataURL de canvas a un File estándar para subirlo al servidor
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

// Curva de movimiento característica de Monopo Saigon: fluida, paciente y elegante
const MONOPO_EASE = [0.19, 1, 0.22, 1]

// ─── CURSOR MAGNÉTICO PERSONALIZADO ───────────────────────────────────────────
// Reemplaza el cursor del navegador con un dot elegante que sigue con spring physics.
// La escala aumenta al hoverar sobre elementos interactivos, dando sensación de peso real.
function BravoCursor() {
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springConfig = { damping: 28, stiffness: 300, mass: 0.5 }
  const springX = useSpring(cursorX, springConfig)
  const springY = useSpring(cursorY, springConfig)
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onMove = (e) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
      if (!isVisible) setIsVisible(true)
    }

    // Detecta cualquier elemento interactivo para agrandar el cursor
    const onEnter = (e) => {
      if (e.target.closest('button, a, [role="button"], input, textarea, select')) {
        setIsHovering(true)
      }
    }
    const onLeave = () => setIsHovering(false)

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [cursorX, cursorY, isVisible])

  // Solo renderizamos en desktop — en touch el cursor nativo es correcto
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return null

  return (
    <>
      {/* Dot principal */}
      <motion.div
        style={{ x: springX, y: springY }}
        animate={{
          scale: isHovering ? 3.5 : 1,
          opacity: isVisible ? 1 : 0,
          backgroundColor: isHovering ? 'rgba(255,172,46,0.25)' : 'rgba(255,255,255,0.9)',
          border: isHovering ? '1px solid rgba(255,172,46,0.6)' : '1px solid transparent'
        }}
        transition={{ scale: { type: 'spring', damping: 18, stiffness: 250 }, opacity: { duration: 0.2 } }}
        className="fixed top-0 left-0 w-3 h-3 rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      />
    </>
  )
}

// ─── MARQUEE DE CREDENCIALES ─────────────────────────────────────────────────
// Banda de movimiento continuo que rompe la monotonía entre secciones estáticas.
// La duplicación del contenido (× 2) garantiza un loop perfecto sin salto visible.
const MARQUEE_ITEMS = [
  'DTF Textil por Metro (32cm)',
  'DTF UV con Barniz 3D (28cm)',
  'Sublimación Óptica 360°',
  'Stickers DTF UV con Relieve',
  'Garantía 50+ Lavados',
  'Taller Quillota · Chile',
  'Producción Continua en Bobina',
  'Mínimo 1 Unidad o Metraje Libre',
  'Muestras Digitales en 3D',
  'Despacho Express a Todo Chile',
]

function InfiniteMarquee({ reverse = false }) {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div className="overflow-hidden border-y border-white/8 bg-[#0a0a0a] py-3 select-none">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
      >
        {items.map((item, i) => (
          <span key={i} className="text-[10px] uppercase tracking-[0.28em] text-ash-mist font-mono shrink-0 flex items-center gap-10">
            {item}
            <span className="text-amber-500/60 text-[8px]">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

const STATUS_STEPS = [
  { key: 'recibido', label: '01 / Recepción', desc: 'Solicitud ingresada al taller' },
  { key: 'diagnostico', label: '02 / Preprensa', desc: 'Calibración vectorial y muestra digital' },
  { key: 'en_reparacion', label: '03 / Producción', desc: 'Estampado térmico o curado UV en curso' },
  { key: 'listo', label: '04 / Control Calidad', desc: 'Curado, empaque y listo para entrega' },
  { key: 'entregado', label: '05 / Finalizado', desc: 'Pedido retirado por el cliente' }
]

export default function BravoPublicPage() {
  const navigate = useNavigate()

  // Navigation & Scroll Refs
  const homeRef = useRef(null)
  const heroRef = useRef(null)
  const studioRef = useRef(null)
  const catalogRef = useRef(null)
  const dtfRef = useRef(null)
  const manifestoRef = useRef(null)
  const trackRef = useRef(null)
  const quoteRef = useRef(null)

  // Estado interactivo de sección DTF por Metro
  const [dtfActiveTab, setDtfActiveTab] = useState('textil') // 'textil' | 'uv'
  const [dtfMeters, setDtfMeters] = useState(3)

  // Parallax del Hero — el headline se desplaza a 40% de la velocidad de scroll
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  })
  const heroTextY = useTransform(heroScrollProgress, [0, 1], ['0%', '40%'])
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.65], [1, 0])
  // Watermark logo parallax (más lento que el texto para dar profundidad z)
  const heroLogoY = useTransform(heroScrollProgress, [0, 1], ['0%', '20%'])
  // Indicador de scroll se desvanece rápido al empezar a bajar
  const scrollIndicatorOpacity = useTransform(heroScrollProgress, [0, 0.15], [1, 0])

  // Configuración dinámica CMS
  const [config, setConfig] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cookieConsent, setCookieConsent] = useState(() => {
    return localStorage.getItem('bravo_cookie_consent') === 'true'
  })

  // Catálogo de Productos
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Formulario de Cotización
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    client_rut: '',
    client_city: '',
    device_type: 'Polera',
    brand: 'Personalizado',
    model: 'Estampado Premium',
    reported_issue: '',
    accessories: ''
  })
  const [formSuccess, setFormSuccess] = useState(null)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Estado del Mockup 3D vinculado al proyecto
  const [capturedMockup, setCapturedMockup] = useState(null)
  const [mockupDetails, setMockupDetails] = useState(null)
  const [includeMockup, setIncludeMockup] = useState(true)
  const [previewFaceTab, setPreviewFaceTab] = useState('combined')
  const captureMethodRef = useRef(null)

  // Handler cuando el usuario hace clic en "Agendar Proyecto con este Diseño" en el simulador 3D
  const handleProceedToQuoteFromSimulator = useCallback((data) => {
    if (data?.snapshotUrl) {
      setCapturedMockup(data.snapshotUrl)
      setMockupDetails(data)
      setIncludeMockup(true)
      setPreviewFaceTab(data.hasBackView ? 'combined' : 'front')

      // Construcción enriquecida del modelo y especificaciones de ambas caras
      let specs = `${data.label || data.productType} · Color ${data.currentColor || 'Estándar'}`
      if (data.hasBackView) {
        const fArt = data.frontDesign?.artworkName ? ` (${data.frontDesign.artworkName})` : ''
        const bArt = data.backDesign?.artworkName ? ` (${data.backDesign.artworkName})` : ''
        const fStr = data.frontDesign?.enabled ? `Frente DTF ${data.frontDesign.format || 'A4'}${fArt}` : 'Frente liso'
        const bStr = data.backDesign?.enabled ? `Espalda DTF ${data.backDesign.format || 'A4'}${bArt}` : 'Espalda lisa'
        specs += ` · [${fStr} | ${bStr}]`
      } else {
        const art = data.frontDesign?.artworkName ? ` (${data.frontDesign.artworkName})` : ''
        specs += ` · DTF ${data.frontDesign?.format || data.format || 'A4'}${art}`
      }

      setFormData(prev => ({
        ...prev,
        device_type: data.resolvedType || data.productType || prev.device_type,
        model: specs
      }))
    }
    // Scroll suave directo al formulario de agendamiento
    setTimeout(() => {
      if (quoteRef.current) {
        quoteRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }, [])

  // Captura manual desde el formulario
  const handleManualCapture = async () => {
    if (captureMethodRef.current) {
      try {
        const result = await captureMethodRef.current()
        if (result) {
          if (typeof result === 'object' && result.snapshotUrl) {
            handleProceedToQuoteFromSimulator(result)
          } else if (typeof result === 'string') {
            setCapturedMockup(result)
            setIncludeMockup(true)
            setMockupDetails({
              productType: simulatorType,
              label: simulatorType,
              format: 'A4'
            })
            setPreviewFaceTab('front')
            setFormData(prev => ({
              ...prev,
              device_type: simulatorType || prev.device_type
            }))
          }
        }
      } catch (err) {
        console.error('Error al capturar mockup manualmente:', err)
      }
    }
  }

  // Rastreo de Pedidos en Vivo
  const [orderNumber, setOrderNumber] = useState('')
  const [rutOrPhone, setRutOrPhone] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [trackLoading, setTrackLoading] = useState(false)
  const [orderComments, setOrderComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // Simulador de Mockups State
  const [simulatorType, setSimulatorType] = useState(() => getRandomProductType())
  const [activeThermalTab, setActiveThermalTab] = useState('stanley')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const productParam = searchParams.get('product')
    if (productParam) {
      setSimulatorType(productParam)
      if (window.location.hash === '#studio' && studioRef.current) {
        setTimeout(() => {
          studioRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 200)
      }
    }
  }, [searchParams])

  // Hero carousel removido — el lookbook inferior ya cubre la galería de productos.
  // El hero ahora sigue la filosofía Monopo Saigon: headline monumental + atmósfera, nada más.

  const fetchWebConfig = useCallback(async () => {
    try {
      const res = await getWebConfig({ system: 'bravo' })
      setConfig(res.data)
    } catch (err) {
      console.error('Error al cargar configuración web:', err)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const res = await getPublicProducts()
      setProducts(res.data || [])
    } catch (err) {
      console.error('Error al cargar productos:', err)
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebConfig()
    fetchProducts()
  }, [fetchWebConfig, fetchProducts])

  // Polling de mensajes del taller cuando hay una orden rastreada activa
  useEffect(() => {
    if (!trackResult?.order_number || !orderNumber.trim()) return
    const interval = setInterval(async () => {
      try {
        const commRes = await getTrackComments(orderNumber.trim(), rutOrPhone.trim())
        setOrderComments(commRes.data || [])
      } catch { /* silencioso — no interrumpir la UX si falla un poll */ }
    }, 10000)
    return () => clearInterval(interval)
  }, [trackResult?.order_number, orderNumber, rutOrPhone])

  const scrollToSection = (ref) => {
    setMobileMenuOpen(false)
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Manejo de Cotización / Agendamiento de Proyecto
  const handleQuoteSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    setFormSuccess(null)

    try {
      let uploadedMockupUrl = null
      let uploadedDesignUrl = null

      // 1. Subir el mockup renderizado (canvas composite con prenda + estampa)
      if (includeMockup && capturedMockup) {
        try {
          const snapshotToUpload = mockupDetails?.snapshotUrl || capturedMockup
          const file = dataURLtoFile(snapshotToUpload, `mockup_dual_${Date.now()}.png`)
          const uploadData = new FormData()
          uploadData.append('file', file)
          const uploadRes = await uploadPublicDesign(uploadData)
          uploadedMockupUrl = uploadRes.data?.url
        } catch (uploadErr) {
          console.warn('No se pudo subir la imagen del mockup al servidor, enviando proyecto de todos modos:', uploadErr)
        }
      }

      // 2. Subir el arte original del cliente (logo/foto en alta resolución para impresión)
      const originalArtwork = mockupDetails?.frontDesign?.uploadedArtworkUrl
        || mockupDetails?.backDesign?.uploadedArtworkUrl
      if (originalArtwork && originalArtwork.startsWith('data:')) {
        try {
          const ext = originalArtwork.match(/data:image\/(\w+)/)?.[1] || 'png'
          const artFile = dataURLtoFile(originalArtwork, `arte_original_${Date.now()}.${ext}`)
          const artFormData = new FormData()
          artFormData.append('file', artFile)
          const artRes = await uploadPublicDesign(artFormData)
          uploadedDesignUrl = artRes.data?.url
        } catch (artErr) {
          console.warn('No se pudo subir el arte original:', artErr)
        }
      }

      const res = await requestOrder({
        ...formData,
        mockup_file_url: uploadedMockupUrl || undefined,
        design_file_url: uploadedDesignUrl || undefined,
        system: 'bravo'
      })
      setFormSuccess(res.data)
      setFormData({
        client_name: '', client_phone: '', client_email: '', client_rut: '',
        client_city: '', device_type: simulatorType || 'Polera', brand: 'Personalizado',
        model: 'Estampado Premium', reported_issue: '', accessories: ''
      })
    } catch (err) {
      setFormError(parseError(err, 'No pudimos registrar tu solicitud. Por favor intenta nuevamente.'))
    } finally {
      setFormLoading(false)
    }
  }

  // Manejo de Rastreo
  const handleTrack = async (e) => {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setTrackLoading(true)
    setTrackError('')
    setTrackResult(null)

    try {
      const res = await trackRepair(orderNumber.trim(), rutOrPhone.trim())
      setTrackResult(res.data)
      if (res.data?.order_number) {
        const commRes = await getTrackComments(orderNumber.trim(), rutOrPhone.trim())
        setOrderComments(commRes.data || [])
      }
    } catch (err) {
      setTrackError(parseError(err, 'No encontramos una orden con los datos ingresados.'))
    } finally {
      setTrackLoading(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim() || !trackResult?.order_number) return
    setCommentSubmitting(true)
    try {
      await createTrackComment({
        order_number: orderNumber.trim(),
        rut_or_phone: rutOrPhone.trim(),
        message: newCommentText.trim()
      })
      const commRes = await getTrackComments(orderNumber.trim(), rutOrPhone.trim())
      setOrderComments(commRes.data || [])
      setNewCommentText('')
    } catch {
      alert('Error al enviar mensaje.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleWhatsAppContact = (productTitle) => {
    const phone = (config?.whatsapp || config?.phone || '+56967547300').replace(/[^0-9]/g, '')
    const msg = encodeURIComponent(
      productTitle
        ? `Hola Personalizaciones Bravo, deseo cotizar el producto: ${productTitle}`
        : 'Hola Personalizaciones Bravo, deseo realizar una cotización de proyecto de personalización.'
    )
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  const handleAcceptCookies = () => {
    localStorage.setItem('bravo_cookie_consent', 'true')
    setCookieConsent(true)
  }

  const handleOpenInSimulator = (productTypeKey) => {
    setSimulatorType(productTypeKey)
    scrollToSection(studioRef)
  }

  const handleSelectDtfMetraje = (type, meters) => {
    const isTextil = type === 'textil'
    const productKey = isTextil ? 'DTF Textil' : 'DTF UV'
    const unitPrice = isTextil ? 4500 : 5500
    const discount = meters >= 10 ? 0.15 : meters >= 5 ? 0.10 : 0
    const finalPricePerMeter = Math.round(unitPrice * (1 - discount))
    const totalCost = finalPricePerMeter * meters

    setFormData(prev => ({
      ...prev,
      device_type: productKey,
      brand: isTextil ? 'Film PET 32cm' : 'Film UV 28cm Barniz',
      model: `${meters} Mts Lineales (${meters * 100} cm) · $${totalCost.toLocaleString('es-CL')}`,
      reported_issue: `Cotización de producción continua por metro: ${meters} metros lineales de ${productKey}. ${
        isTextil
          ? 'Ancho 32cm, poliamida termoplástica elástica 90A, doble pase de blanco HD.'
          : 'Ancho 28cm, tinta UV curable con barniz brillante y relieve 3D para superficies rígidas.'
      }`
    }))

    if (quoteRef.current) {
      quoteRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const allCatalogProducts = useMemo(() => {
    return mergeCatalogWithBackend(products)
  }, [products])

  const filteredCatalog = useMemo(() => {
    if (selectedCategory === 'all') return allCatalogProducts
    return allCatalogProducts.filter(p => {
      const cat = (p.category || '').toLowerCase()
      if (selectedCategory === 'ceramica') {
        return cat === 'ceramica' || cat === 'vidrio'
      }
      return cat === selectedCategory.toLowerCase()
    })
  }, [allCatalogProducts, selectedCategory])


  return (
    <div className="bg-obsidian text-paper font-roobert antialiased selection:bg-paper selection:text-obsidian min-h-screen relative overflow-x-hidden cursor-none">
      
      {/* Cursor personalizado — solo activo en dispositivos con puntero fino */}
      <BravoCursor />

      {/* ─── NAVEGACIÓN MONOPO SAIGON (Fixed 66px, Hairline Border, Zero Rounding) ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[66px] bg-[#000000]/90 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 flex items-center justify-between transition-colors">
        
        {/* Identidad de Marca: Logotipo Oficial + Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => scrollToSection(homeRef)}
            className="flex items-center gap-3.5 text-left cursor-pointer border-none bg-transparent group focus-visible:outline-none"
            aria-label="Ir al inicio de Personalizaciones Bravo"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-amber-500/35 group-hover:border-amber-400/80 transition-all duration-500 shrink-0 bg-black shadow-[0_0_12px_rgba(255,172,46,0.15)] group-hover:shadow-[0_0_18px_rgba(255,172,46,0.3)]">
              <img
                src="/logo-bravo.jpg"
                alt="Personalizaciones Bravo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] sm:text-[13px] tracking-[0.18em] font-medium uppercase text-white group-hover:text-ash-mist transition-colors leading-tight">
                Personalizaciones Bravo
              </span>
              <span className="text-[9px] tracking-[0.18em] text-[#8e95a5] uppercase font-light leading-tight">
                Taller de Autor · Quillota
              </span>
            </div>
          </button>
        </div>

        {/* Enlaces de Menú Desktop (Sharp 0px, Generous Whitespace, 11px Roobert Weight 400) */}
        <nav className="hidden md:flex items-center gap-7 text-[11px] uppercase tracking-[0.18em] font-normal text-ash-mist">
          <button onClick={() => scrollToSection(homeRef)} className="hover:text-white transition-colors cursor-pointer focus-visible:outline-none">
            Inicio
          </button>
          <button onClick={() => scrollToSection(studioRef)} className="hover:text-white transition-colors cursor-pointer focus-visible:outline-none">
            Estudio 3D
          </button>
          <button onClick={() => scrollToSection(catalogRef)} className="hover:text-white transition-colors cursor-pointer focus-visible:outline-none">
            Colección
          </button>
          <button onClick={() => scrollToSection(dtfRef)} className="hover:text-amber-400 text-amber-300 font-medium transition-colors cursor-pointer focus-visible:outline-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            DTF por Metro
          </button>
          <button onClick={() => scrollToSection(manifestoRef)} className="hover:text-white transition-colors cursor-pointer focus-visible:outline-none">
            Técnicas
          </button>
          <button onClick={() => scrollToSection(trackRef)} className="hover:text-white transition-colors cursor-pointer focus-visible:outline-none">
            Rastreo
          </button>
          <button onClick={() => scrollToSection(quoteRef)} className="hover:text-white transition-colors cursor-pointer focus-visible:outline-none">
            Cotizar
          </button>
        </nav>

        {/* CTA Ghost Pill Buttons (Full Pill 75px Radius) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bravo/catalogo')}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-[75px] border border-white/20 hover:border-white/50 text-[#9a9a9a] hover:text-white px-4 py-1.5 text-[10px] tracking-[0.16em] uppercase font-normal transition-all duration-700 cursor-pointer bg-transparent focus-visible:outline-none"
          >
            <span>Catálogo</span>
            <ExternalLink size={11} />
          </button>

          <button
            onClick={() => scrollToSection(quoteRef)}
            className="rounded-[75px] border border-white/40 hover:border-white text-white px-5 sm:px-6 py-2 text-[11px] tracking-[0.15em] uppercase font-normal transition-all duration-700 ease-monopo cursor-pointer bg-transparent focus-visible:outline-none"
          >
            Solicitar Muestra
          </button>

          {/* Toggle Menú Móvil */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 text-white/80 hover:text-white focus-visible:outline-none cursor-pointer"
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Menú Móvil Colapsable (Editorial Monopo Drawer) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: MONOPO_EASE }}
            className="fixed top-[66px] left-0 right-0 z-40 bg-obsidian/95 backdrop-blur-xl border-b border-white/10 p-6 md:hidden flex flex-col gap-4 text-left"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <img src="/logo-bravo.jpg" alt="Bravo" className="w-8 h-8 rounded-full border border-white/20" />
              <span className="text-xs uppercase tracking-widest text-white">Navegación de Taller</span>
            </div>
            <button onClick={() => scrollToSection(homeRef)} className="text-left text-xs uppercase tracking-[0.2em] text-[#9a9a9a] hover:text-white py-2">
              01 / Inicio
            </button>
            <button onClick={() => scrollToSection(studioRef)} className="text-left text-xs uppercase tracking-[0.2em] text-[#9a9a9a] hover:text-white py-2">
              02 / Estudio 3D en Vivo
            </button>
            <button onClick={() => scrollToSection(catalogRef)} className="text-left text-xs uppercase tracking-[0.2em] text-[#9a9a9a] hover:text-white py-2">
              03 / Colección de Soportes
            </button>
            <button onClick={() => scrollToSection(dtfRef)} className="text-left text-xs uppercase tracking-[0.2em] text-amber-300 hover:text-white py-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              03.B / DTF Textil & UV por Metro
            </button>
            <button onClick={() => scrollToSection(manifestoRef)} className="text-left text-xs uppercase tracking-[0.2em] text-[#9a9a9a] hover:text-white py-2">
              04 / Capacidad Técnica
            </button>
            <button onClick={() => scrollToSection(trackRef)} className="text-left text-xs uppercase tracking-[0.2em] text-[#9a9a9a] hover:text-white py-2">
              05 / Rastreo de Orden
            </button>
            <button onClick={() => scrollToSection(quoteRef)} className="text-left text-xs uppercase tracking-[0.2em] text-[#9a9a9a] hover:text-white py-2">
              06 / Cotizador de Pedido
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/bravo/catalogo'); }}
              className="mt-2 text-center rounded-[75px] border border-white/40 text-white py-2.5 text-xs uppercase tracking-widest"
            >
              Explorar Catálogo Extendido →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ROTATING SCROLL INDICATOR (Bottom-Left Typographic Ornament) ─── */}
      <div className="hidden lg:flex fixed left-8 bottom-8 z-40 items-center justify-center pointer-events-none select-none">
        <div className="relative w-24 h-24 flex items-center justify-center animate-[spin_24s_linear_infinite]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path
              id="circlePath"
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
              fill="none"
            />
            <text className="font-system-ui text-[8.5px] uppercase tracking-[0.24em] fill-ash-mist font-normal">
              <textPath href="#circlePath" startOffset="0%">
                PERSONALIZACIONES BRAVO · TALLER DE PERSONALIZACIÓN · MATERIA PRIMA ·
              </textPath>
            </text>
          </svg>
        </div>
        <div className="absolute w-1.5 h-1.5 bg-white rounded-full" />
      </div>

      {/* ─── HERO ATMÓSFERA IRIDISCENTE (Liquid Iridescence Behind Editorial Silence) ─── */}
      <section
        id="home"
        ref={(el) => { homeRef.current = el; heroRef.current = el }}
        className="relative h-screen flex items-center justify-center overflow-hidden bg-obsidian"
      >
        {/* Three.js iridescent WebGL canvas */}
        <BravoHero3DCanvas />

        {/* Sello de Marca al Fondo del Hero (Watermark de Autor difuminado con máscara radial suave) */}
        <motion.div
          style={{
            y: heroLogoY,
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 72%)',
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] md:w-[620px] lg:w-[740px] aspect-square pointer-events-none select-none z-[2] flex items-center justify-center opacity-20 sm:opacity-25"
        >
          <img
            src={config?.content?.hero?.logo_url || '/logo-bravo.jpg'}
            alt="Personalizaciones Bravo"
            aria-hidden="true"
            className="w-full h-full object-cover rounded-full mix-blend-screen animate-float-gentle"
          />
        </motion.div>

        {/* Fallback: atmósfera cromática orgánica (sage → amber → oxblood) */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen overflow-hidden z-[1]">
          <div
            className="w-[140vw] h-[120vh] -left-[20vw] -top-[20vh] absolute blur-[130px] animate-molten-drift"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(160, 224, 171, 0.42) 0%, rgba(255, 172, 46, 0.38) 42%, rgba(165, 45, 37, 0.32) 75%, transparent 100%)'
            }}
          />
        </div>

        {/* Banner CMS — aparece solo si está configurado */}
        {config?.content?.hero?.banner_active && (
          <div className="absolute top-[66px] left-0 right-0 z-20 bg-white/5 border-b border-white/10 py-2.5 px-6 text-center text-[11px] text-ash-mist tracking-[0.15em] uppercase font-normal">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {config.content.hero.banner_text || '¡Precios especiales por mayor a partir de 10 unidades!'}
            </span>
          </div>
        )}

        {/* Contenido editorial centrado — el parallax aplica solo a este bloque */}
        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        >
          {/* Micro-label de identidad */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: MONOPO_EASE, delay: 0.3 }}
            className="text-[11px] sm:text-[12px] uppercase tracking-[0.3em] text-ash-mist font-normal block mb-8"
          >
            {config?.content?.hero?.badge || 'Taller de Personalización · Quillota'}
          </motion.span>

          {/* Headline monumental — divide en dos líneas con espaciado y padding seguro para evitar recorte tipográfico */}
          <div className="overflow-hidden py-1 px-3">
            <motion.h1
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, ease: MONOPO_EASE, delay: 0.4 }}
              className="text-[clamp(32px,7vw,96px)] font-light tracking-[-0.02em] text-white leading-[0.95] uppercase break-words"
              style={{ textWrap: 'balance' }}
            >
              {config?.content?.hero?.title_prefix || 'Materia Prima'}
            </motion.h1>
          </div>
          <div className="overflow-hidden py-1 px-3">
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, ease: MONOPO_EASE, delay: 0.58 }}
              className="text-[clamp(32px,7vw,96px)] font-light tracking-[-0.02em] leading-[0.95] uppercase break-words"
              style={{ textWrap: 'balance' }}
            >
              {/* La segunda línea con gradiente amber/blanco con padding lateral para que ninguna letra quede cortada */}
              <span
                className="inline-block px-2 pb-1"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,172,46,0.55) 60%, rgba(255,255,255,0.35) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {config?.content?.hero?.title_highlight || 'Convertida en Arte'}
              </span>
            </motion.div>
          </div>

          {/* Subtítulo contenido — sin menciones a grabado láser ni bordado */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: MONOPO_EASE, delay: 1.1 }}
            className="mt-8 text-[14px] sm:text-[16px] text-ash-mist font-normal leading-relaxed max-w-xl mx-auto px-2"
            style={{ textWrap: 'pretty' }}
          >
            {config?.content?.hero?.description || 'Estampado DTF Textil, DTF UV con relieve 3D y sublimación óptica de alta fidelidad. Cada pieza con precisión de taller artesanal.'}
          </motion.p>

          {/* Ghost Pill CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: MONOPO_EASE, delay: 1.4 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <motion.button
              onClick={() => scrollToSection(studioRef)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-[75px] border border-white/30 hover:border-amber-400/60 hover:bg-amber-400/5 text-white px-8 py-3 text-[11px] tracking-[0.15em] uppercase font-normal transition-colors duration-500 cursor-pointer bg-transparent focus-visible:outline-none"
            >
              {config?.content?.hero?.cta_quote_text || 'Diseñar en 3D'}
            </motion.button>
            <motion.button
              onClick={() => scrollToSection(quoteRef)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-[75px] border border-white/10 hover:border-white/30 text-ash-mist hover:text-white px-8 py-3 text-[11px] tracking-[0.15em] uppercase font-normal transition-colors duration-500 cursor-pointer bg-transparent focus-visible:outline-none"
            >
              {config?.content?.hero?.cta_catalog_text || 'Solicitar Cotización'}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Indicador de scroll — desaparece al bajar */}
        <motion.div
          style={{ opacity: scrollIndicatorOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-[9px] uppercase tracking-[0.3em] text-felt-gray">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
            className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent"
          />
        </motion.div>

        {/* Franja inferior: metadata geográfica mínima */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12 w-full flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-felt-gray py-6 border-t border-white/5">
            <span>Taller de Autor · Quillota</span>
            <span>Región de Valparaíso, Chile</span>
          </div>
        </div>
      </section>

      {/* ─── MARQUEE DE CREDENCIALES (Movimiento Continuo Entre Secciones) ─── */}
      <InfiniteMarquee />

      {/* ─── CIFRAS DE TALLER Y PROCESO (Sección de credibilidad y contenido) ─── */}
      <section className="py-24 bg-obsidian border-t border-white/10 relative overflow-hidden">
        <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12">
          
          {/* Galería Editorial Asimétrica de 3 Productos Destacados (Lookbook Alternado) */}
          {(() => {
            const lb = config?.content?.lookbook || {}
            const lbHeader = {
              tag: lb.section_tag || 'Selección de Taller · Producción de Autor',
              title: lb.section_title || 'Tres Soportes Emblemáticos en Detalle.',
              desc: lb.section_desc || 'Cada soporte virgen es seleccionado por su pureza molecular y comportamiento ante la temperatura de curado en Quillota.'
            }
            const lbTazon = {
              tag: lb.tazon?.tag || '01 / Cerámica Vitrificada',
              subtitle: lb.tazon?.subtitle || 'Sublimación Óptica 360° · Fusión a 200°C',
              title: lb.tazon?.title || 'Tazón Cerámico 11oz Glaze HD',
              description: lb.tazon?.description || 'Cerámica AAA de blancura absoluta con barniz vitrificado de alta pureza. Las tintas fotográficas se gasifican dentro del polímero, produciendo un acabado espejado indestructible resistente al lavavajillas industrial y microondas.',
              image: lb.tazon?.image || '/mockups/tazon_front_hd.png',
              spec1: { label: lb.tazon?.spec1_label || 'Capacidad', val: lb.tazon?.spec1_val || '325 ml / 11 oz' },
              spec2: { label: lb.tazon?.spec2_label || 'Acabado', val: lb.tazon?.spec2_val || 'Ultra-Glossy' },
              spec3: { label: lb.tazon?.spec3_label || 'Garantía', val: lb.tazon?.spec3_val || 'Anti-Lavado' }
            }
            const lbPolera = {
              tag: lb.polera?.tag || '02 / Algodón Premium 240g',
              subtitle: lb.polera?.subtitle || 'Confección Textil Pesada · DTF Ultra HD',
              title: lb.polera?.title || 'Polera Heavyweight 240g',
              description: lb.polera?.description || 'Confeccionada con algodón peinado chileno de 240 GSM. Caída estructurada de silueta limpia, cuello rib reforzado de 3cm y tacto cero al lavado mediante poliamidas elastoméricas de formulación europea.',
              image: lb.polera?.image || '/mockups/polera_front.png',
              spec1: { label: lb.polera?.spec1_label || 'Gramaje', val: lb.polera?.spec1_val || '240 GSM Chileno' },
              spec2: { label: lb.polera?.spec2_label || 'Estampado', val: lb.polera?.spec2_val || 'DTF Elastomérico' },
              spec3: { label: lb.polera?.spec3_label || 'Costuras', val: lb.polera?.spec3_val || 'Overlock Doble' }
            }
            const lbStanley = {
              tag: lb.stanley?.tag || '03 / Acero Térmico Inox',
              subtitle: lb.stanley?.subtitle || 'DTF UV con Relieve 3D · Aislamiento al Vacío',
              title: lb.stanley?.title || 'Vaso Térmico Tipo Stanley 40oz',
              description: lb.stanley?.description || 'Acero quirúrgico 18/8 con doble pared aislada al vacío. Conserva líquidos fríos por 24 horas y calientes por 12 horas. Incluye manilla ergonómica reforzada, tapa hermética giratoria y bombilla de acero reutilizable.',
              image: lb.stanley?.image || '/mockups/stanley_front_hd.png',
              spec1: { label: lb.stanley?.spec1_label || 'Capacidad', val: lb.stanley?.spec1_val || '1.18 L / 40 oz' },
              spec2: { label: lb.stanley?.spec2_label || 'Retención', val: lb.stanley?.spec2_val || '24h Frío / 12h Calor' },
              spec3: { label: lb.stanley?.spec3_label || 'Personalizado', val: lb.stanley?.spec3_val || 'DTF UV 3D' }
            }
            const lbTermo = {
              tag: lb.termo?.tag || '03 / Acero Térmico Inox',
              subtitle: lb.termo?.subtitle || 'DTF UV Rígidos · Aislamiento al Vacío',
              title: lb.termo?.title || 'Botella Térmica Inox 500ml Pro',
              description: lb.termo?.description || 'Cuerpo tubular compacto en acero inoxidable 304 con tapa a rosca de sellado hermético al 100%. Acabado mate antideslizante de alta resistencia al roce y personalización DTF UV de alta adherencia con relieve.',
              image: lb.termo?.image || '/mockups/termo_front_hd.png',
              spec1: { label: lb.termo?.spec1_label || 'Capacidad', val: lb.termo?.spec1_val || '500 ml Pro' },
              spec2: { label: lb.termo?.spec2_label || 'Retención', val: lb.termo?.spec2_val || '18h Frío / 10h Calor' },
              spec3: { label: lb.termo?.spec3_label || 'Cierre', val: lb.termo?.spec3_val || 'Hermético 100%' }
            }

            return (
              <div className="space-y-24 mb-24 text-left">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, ease: MONOPO_EASE }}
                  className="space-y-3 pb-8 border-b border-white/10"
                >
                  <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist font-mono block">
                    {lbHeader.tag}
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-light tracking-[-0.02em] text-white uppercase" style={{ textWrap: 'balance' }}>
                    {lbHeader.title}
                  </h2>
                  <p className="text-sm text-ash-mist max-w-xl font-normal leading-relaxed" style={{ textWrap: 'pretty' }}>
                    {lbHeader.desc}
                  </p>
                </motion.div>

                {/* Ítem 1: Tazón Cerámico (Imagen Izquierda, Texto Derecha) */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.9, ease: MONOPO_EASE }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
                >
                  <div className="lg:col-span-6 bg-[#090b10] border border-white/10 p-8 sm:p-12 relative group flex items-center justify-center min-h-[360px] sm:min-h-[420px]">
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-3 py-1 rounded-[75px] bg-black/80 border border-white/15 text-[9px] uppercase tracking-widest text-ash-mist font-mono">
                        {lbTazon.tag}
                      </span>
                    </div>
                    <img
                      src={lbTazon.image}
                      alt={lbTazon.title}
                      className="max-h-72 max-w-full object-contain group-hover:scale-105 transition-transform duration-700 ease-monopo relative z-10"
                      onError={(e) => { e.target.src = '/mockups/tazon_front.png' }}
                    />
                  </div>

                  <div className="lg:col-span-6 space-y-6 lg:pl-6">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300/80 font-mono">
                        {lbTazon.subtitle}
                      </span>
                      <h3 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
                        {lbTazon.title}
                      </h3>
                      <p className="text-sm text-ash-mist leading-relaxed pt-2" style={{ textWrap: 'pretty' }}>
                        {lbTazon.description}
                      </p>
                    </div>

                    {/* Especificaciones técnicas rápidas */}
                    <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10 text-left">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbTazon.spec1.label}</span>
                        <span className="text-xs text-white font-medium">{lbTazon.spec1.val}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbTazon.spec2.label}</span>
                        <span className="text-xs text-white font-medium">{lbTazon.spec2.val}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbTazon.spec3.label}</span>
                        <span className="text-xs text-white font-medium">{lbTazon.spec3.val}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => handleOpenInSimulator('Tazón')}
                        className="rounded-[75px] bg-white hover:bg-ash-mist text-black px-6 py-2.5 text-[11px] tracking-[0.14em] uppercase font-medium transition-all duration-300 cursor-pointer flex items-center gap-2 focus-visible:outline-none"
                      >
                        <Box size={13} />
                        <span>Personalizar en 3D</span>
                      </button>
                      <button
                        onClick={() => handleWhatsAppContact(lbTazon.title)}
                        className="rounded-[75px] border border-white/20 hover:border-white text-white px-6 py-2.5 text-[11px] tracking-[0.14em] uppercase font-normal transition-all duration-300 cursor-pointer bg-transparent flex items-center gap-2 focus-visible:outline-none hover:bg-white/5"
                      >
                        <MessageSquare size={13} />
                        <span>Cotizar Lote</span>
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Ítem 2: Polera Heavyweight (Texto Izquierda, Imagen Derecha) */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.9, ease: MONOPO_EASE }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
                >
                  <div className="lg:col-span-6 space-y-6 order-2 lg:order-1 lg:pr-6">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300/80 font-mono">
                        {lbPolera.subtitle}
                      </span>
                      <h3 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
                        {lbPolera.title}
                      </h3>
                      <p className="text-sm text-ash-mist leading-relaxed pt-2" style={{ textWrap: 'pretty' }}>
                        {lbPolera.description}
                      </p>
                    </div>

                    {/* Especificaciones técnicas rápidas */}
                    <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10 text-left">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbPolera.spec1.label}</span>
                        <span className="text-xs text-white font-medium">{lbPolera.spec1.val}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbPolera.spec2.label}</span>
                        <span className="text-xs text-white font-medium">{lbPolera.spec2.val}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbPolera.spec3.label}</span>
                        <span className="text-xs text-white font-medium">{lbPolera.spec3.val}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => handleOpenInSimulator('Polera')}
                        className="rounded-[75px] bg-white hover:bg-ash-mist text-black px-6 py-2.5 text-[11px] tracking-[0.14em] uppercase font-medium transition-all duration-300 cursor-pointer flex items-center gap-2 focus-visible:outline-none"
                      >
                        <Box size={13} />
                        <span>Personalizar en 3D</span>
                      </button>
                      <button
                        onClick={() => handleWhatsAppContact(lbPolera.title)}
                        className="rounded-[75px] border border-white/20 hover:border-white text-white px-6 py-2.5 text-[11px] tracking-[0.14em] uppercase font-normal transition-all duration-300 cursor-pointer bg-transparent flex items-center gap-2 focus-visible:outline-none hover:bg-white/5"
                      >
                        <MessageSquare size={13} />
                        <span>Cotizar Lote</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-[#090b10] border border-white/10 p-8 sm:p-12 relative group flex items-center justify-center min-h-[360px] sm:min-h-[420px] order-1 lg:order-2">
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-3 py-1 rounded-[75px] bg-black/80 border border-white/15 text-[9px] uppercase tracking-widest text-ash-mist font-mono">
                        {lbPolera.tag}
                      </span>
                    </div>
                    <img
                      src={lbPolera.image}
                      alt={lbPolera.title}
                      className="max-h-72 max-w-full object-contain group-hover:scale-105 transition-transform duration-700 ease-monopo relative z-10"
                      onError={(e) => { e.target.src = '/mockups/polera_front.png' }}
                    />
                  </div>
                </motion.div>

                {/* Ítem 3: Rediseño Línea Térmica (Stanley 40oz & Botella Inox 500ml sin sombras artificiales) */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.9, ease: MONOPO_EASE }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
                >
                  {/* Pedestal de Fotografía HD sin filtros de sombra artificiales */}
                  <div className="lg:col-span-6 bg-[#090b10] border border-white/10 p-8 sm:p-12 relative group flex items-center justify-center min-h-[380px] sm:min-h-[440px]">
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-[75px] bg-black/80 border border-white/15 text-[9px] uppercase tracking-widest text-ash-mist font-mono">
                        {activeThermalTab === 'stanley' ? lbStanley.tag : lbTermo.tag}
                      </span>
                    </div>

                    {/* Selector de Producto Térmico */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/90 p-1 rounded-[75px] border border-white/15">
                      <button
                        onClick={() => setActiveThermalTab('stanley')}
                        className={`px-3 py-1 rounded-[75px] text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                          activeThermalTab === 'stanley'
                            ? 'bg-white text-black font-semibold'
                            : 'text-ash-mist hover:text-white'
                        }`}
                      >
                        Stanley 40oz
                      </button>
                      <button
                        onClick={() => setActiveThermalTab('termo')}
                        className={`px-3 py-1 rounded-[75px] text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                          activeThermalTab === 'termo'
                            ? 'bg-white text-black font-semibold'
                            : 'text-ash-mist hover:text-white'
                        }`}
                      >
                        Termo 500ml
                      </button>
                    </div>

                    {activeThermalTab === 'stanley' ? (
                      <img
                        key="stanley-img"
                        src={lbStanley.image}
                        alt={lbStanley.title}
                        className="max-h-80 max-w-full object-contain group-hover:scale-105 transition-transform duration-700 ease-monopo relative z-10"
                        onError={(e) => { e.target.src = '/mockups/stanley_front.png' }}
                      />
                    ) : (
                      <img
                        key="termo-img"
                        src={lbTermo.image}
                        alt={lbTermo.title}
                        className="max-h-80 max-w-full object-contain group-hover:scale-105 transition-transform duration-700 ease-monopo relative z-10"
                        onError={(e) => { e.target.src = '/mockups/termo_front.png' }}
                      />
                    )}
                  </div>

                  <div className="lg:col-span-6 space-y-6 lg:pl-6">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300/80 font-mono">
                        {activeThermalTab === 'stanley' ? lbStanley.subtitle : lbTermo.subtitle}
                      </span>

                      {activeThermalTab === 'stanley' ? (
                        <>
                          <h3 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
                            {lbStanley.title}
                          </h3>
                          <p className="text-sm text-ash-mist leading-relaxed pt-2" style={{ textWrap: 'pretty' }}>
                            {lbStanley.description}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
                            {lbTermo.title}
                          </h3>
                          <p className="text-sm text-ash-mist leading-relaxed pt-2" style={{ textWrap: 'pretty' }}>
                            {lbTermo.description}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Especificaciones técnicas rápidas según producto activo */}
                    {activeThermalTab === 'stanley' ? (
                      <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10 text-left">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbStanley.spec1.label}</span>
                          <span className="text-xs text-white font-medium">{lbStanley.spec1.val}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbStanley.spec2.label}</span>
                          <span className="text-xs text-white font-medium">{lbStanley.spec2.val}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbStanley.spec3.label}</span>
                          <span className="text-xs text-white font-medium">{lbStanley.spec3.val}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10 text-left">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbTermo.spec1.label}</span>
                          <span className="text-xs text-white font-medium">{lbTermo.spec1.val}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbTermo.spec2.label}</span>
                          <span className="text-xs text-white font-medium">{lbTermo.spec2.val}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-felt-gray block font-mono">{lbTermo.spec3.label}</span>
                          <span className="text-xs text-white font-medium">{lbTermo.spec3.val}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => handleOpenInSimulator(activeThermalTab === 'stanley' ? 'Stanley' : 'Termo')}
                        className="rounded-[75px] bg-white hover:bg-ash-mist text-black px-6 py-2.5 text-[11px] tracking-[0.14em] uppercase font-medium transition-all duration-300 cursor-pointer flex items-center gap-2 focus-visible:outline-none"
                      >
                        <Box size={13} />
                        <span>Personalizar en 3D</span>
                      </button>
                      <button
                        onClick={() => handleWhatsAppContact(activeThermalTab === 'stanley' ? lbStanley.title : lbTermo.title)}
                        className="rounded-[75px] border border-white/20 hover:border-white text-white px-6 py-2.5 text-[11px] tracking-[0.14em] uppercase font-normal transition-all duration-300 cursor-pointer bg-transparent flex items-center gap-2 focus-visible:outline-none hover:bg-white/5"
                      >
                        <MessageSquare size={13} />
                        <span>Cotizar Lote</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )
          })()}

          {/* Proceso en 4 pasos — numeración monumental con línea conectora */}
          <div className="mt-24 text-left">
            <div className="flex items-center gap-4 mb-12">
              <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist font-mono shrink-0">
                Cómo Funciona
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {[
                { step: '01', title: 'Diseña tu Arte', desc: 'Sube tu imagen o diseña en vivo usando nuestro simulador 3D fotorrealista con física de caída e iluminación de estudio.', accent: 'rgba(255,172,46,0.8)' },
                { step: '02', title: 'Aprobación Digital', desc: 'Recibe una muestra vectorial calibrada en pantalla antes de imprimir. Ajustamos colores, posición y tamaño hasta tu aprobación.', accent: 'rgba(160,224,171,0.8)' },
                { step: '03', title: 'Producción Artesanal', desc: 'Cada pieza pasa por preprensa, estampado térmico DTF o aplicación UV y control de calidad en nuestro taller de Quillota.', accent: 'rgba(255,172,46,0.8)' },
                { step: '04', title: 'Entrega Garantizada', desc: 'Embalaje protector y despacho express a todo Chile. Cada pedido incluye garantía de durabilidad de 50+ lavados.', accent: 'rgba(160,224,171,0.8)' }
              ].map((item, idx) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: MONOPO_EASE, delay: idx * 0.15 }}
                  className="group relative border-l border-white/10 hover:border-white/30 pl-8 pr-6 py-8 transition-colors duration-500"
                >
                  {/* Número monumental como elemento visual dominante */}
                  <div
                    className="text-[80px] sm:text-[96px] font-light leading-none mb-4 select-none transition-all duration-500"
                    style={{ color: 'transparent', WebkitTextStroke: `1px ${item.accent}`, opacity: 0.4 }}
                  >
                    {item.step}
                  </div>
                  {/* Línea de acento que aparece al hover */}
                  <div
                    className="absolute top-0 left-0 w-0 h-px group-hover:w-full transition-all duration-700 ease-out"
                    style={{ background: `linear-gradient(90deg, ${item.accent}, transparent)` }}
                  />
                  <h3 className="text-base font-normal text-white tracking-tight mb-2 group-hover:text-amber-100 transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ash-mist leading-relaxed" style={{ textWrap: 'pretty' }}>
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SEGUNDO MARQUEE (Invertido, entre lookbook y simulador) ─── */}
      <InfiniteMarquee reverse />

      {/* ─── ESTUDIO INTERACTIVO 3D & SIMULADOR (Dark Surface, Obsidian #000000) ─── */}
      <section id="studio" ref={studioRef} className="py-24 bg-obsidian border-t border-white/10 relative overflow-hidden">
        {/* Sello editorial de taller — identidad discreta tipo imprenta */}
        <div className="absolute top-8 right-8 w-12 h-12 pointer-events-none select-none opacity-[0.12] z-0">
          <img src="/logo-bravo.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover rounded-full" />
        </div>

        <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: MONOPO_EASE }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 text-left"
          >
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist block mb-2">
                02 / Herramienta de Composición
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-[-0.02em] text-white uppercase" style={{ textWrap: 'balance' }}>
                Simulador de Estudio en Vivo.
              </h2>
            </div>
            <p className="text-sm text-ash-mist max-w-sm font-normal leading-relaxed" style={{ textWrap: 'pretty' }}>
              Prueba tu arte vectorial o imagotipo en tiempo real sobre prendas y soportes volumétricos calibrados con física de caída e iluminación fotográfica.
            </p>
          </motion.div>

          {/* Componente Simulador Enmarcado con 0px Radius */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1, ease: MONOPO_EASE, delay: 0.2 }}
            className="border border-white/15 bg-[#09090b]"
          >
            <Bravo3DSimulator
              simulatorType={simulatorType}
              onProductChange={setSimulatorType}
              onProceedToQuote={handleProceedToQuoteFromSimulator}
              onCaptureReady={(fn) => { captureMethodRef.current = fn }}
            />
          </motion.div>

          {/* ─── MÓDULO INTEGRADO: INICIAR PROYECTO PERSONALIZADO CON MOCKUP ─── */}
          <div id="quote" ref={quoteRef} className="mt-20 pt-16 border-t border-white/10 text-left">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist font-mono block mb-2">
                  02.B / Solicitud & Agendamiento de Taller
                </span>
                <h3 className="text-3xl sm:text-5xl font-light tracking-[-0.02em] text-white uppercase balance-text">
                  Iniciar Proyecto Personalizado.
                </h3>
              </div>
              <p className="text-xs text-ash-mist max-w-md font-normal leading-relaxed pretty-text">
                Envía tus requerimientos directamente al taller de Quillota. Puedes adjuntar el mockup generado arriba en el Simulador 3D para que preparemos la muestra digital idéntica.
              </p>
            </div>

            {/* Panel Principal: Si hay mockup capturado vs Solicitud tradicional */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              
              {/* Columna Izquierda: Tarjeta Fotorrealista de Mockup 3D */}
              <div className="lg:col-span-5 space-y-4">
                {capturedMockup ? (
                  <div className="p-6 bg-[#090b10] border border-amber-500/30 rounded-none relative">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="px-3 py-1 rounded-[75px] bg-amber-500/15 text-amber-300 font-mono text-[9px] uppercase tracking-widest border border-amber-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Mockup 3D de Autor
                      </span>
                      <button
                        type="button"
                        onClick={() => setCapturedMockup(null)}
                        className="text-[10px] text-white/40 hover:text-rose-400 transition-colors flex items-center gap-1 font-mono uppercase cursor-pointer"
                        title="Quitar mockup de la solicitud"
                      >
                        <Trash2 size={11} />
                        <span>Descartar</span>
                      </button>
                    </div>

                    {/* Selector de Vistas de Previsualización (si el producto admite Frente y Espalda) */}
                    {mockupDetails?.hasBackView && (
                      <div className="flex items-center gap-1 p-1 bg-black/60 border border-white/10 my-3">
                        <button
                          type="button"
                          onClick={() => setPreviewFaceTab('combined')}
                          className={`flex-1 py-1.5 px-2 text-[10px] font-mono tracking-wider uppercase transition-all cursor-pointer ${
                            previewFaceTab === 'combined'
                              ? 'bg-amber-400 text-black font-bold shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          Ficha Dual
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFaceTab('front')}
                          className={`flex-1 py-1.5 px-2 text-[10px] font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            previewFaceTab === 'front'
                              ? 'bg-amber-400 text-black font-bold shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>Frente</span>
                          {mockupDetails.frontDesign?.enabled && (
                            <span className={`w-1.5 h-1.5 rounded-full ${previewFaceTab === 'front' ? 'bg-black' : 'bg-amber-400'}`} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFaceTab('back')}
                          className={`flex-1 py-1.5 px-2 text-[10px] font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            previewFaceTab === 'back'
                              ? 'bg-amber-400 text-black font-bold shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>Reverso</span>
                          {mockupDetails.backDesign?.enabled && (
                            <span className={`w-1.5 h-1.5 rounded-full ${previewFaceTab === 'back' ? 'bg-black' : 'bg-amber-400'}`} />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Previsualización del Render Canvas */}
                    <div className={`w-full ${previewFaceTab === 'combined' && mockupDetails?.hasBackView ? 'aspect-[16/9]' : 'aspect-square'} max-h-72 flex items-center justify-center p-3 bg-black/50 border border-white/10 my-3 relative overflow-hidden`}>
                      <img
                        src={
                          previewFaceTab === 'front' && mockupDetails?.frontSnapshotUrl
                            ? mockupDetails.frontSnapshotUrl
                            : previewFaceTab === 'back' && mockupDetails?.backSnapshotUrl
                            ? mockupDetails.backSnapshotUrl
                            : (mockupDetails?.snapshotUrl || capturedMockup)
                        }
                        alt="Mockup Generado"
                        className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 border border-white/15 text-[9px] font-mono text-amber-400 uppercase tracking-widest pointer-events-none">
                        {previewFaceTab === 'combined' && mockupDetails?.hasBackView
                          ? 'Ficha Técnica Frente + Reverso'
                          : previewFaceTab === 'back'
                          ? 'Vista Posterior'
                          : 'Vista Frontal'}
                      </div>
                    </div>

                    {/* Especificaciones Técnicas */}
                    <div className="space-y-1.5 text-[11px] font-mono text-ash-mist pb-3 border-b border-white/10">
                      <div className="flex justify-between">
                        <span className="text-felt-gray uppercase">Soporte:</span>
                        <span className="text-white font-medium">{mockupDetails?.label || formData.device_type}</span>
                      </div>
                      {mockupDetails?.currentColor && (
                        <div className="flex justify-between items-center">
                          <span className="text-felt-gray uppercase">Color Base:</span>
                          <span className="inline-flex items-center gap-1.5 text-white">
                            <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: mockupDetails.currentColor }} />
                            <span>{mockupDetails.currentColor}</span>
                          </span>
                        </div>
                      )}
                      {mockupDetails?.hasBackView ? (
                        <>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-felt-gray uppercase shrink-0">Estampa Frente:</span>
                            <span className={`text-right ${mockupDetails.frontDesign?.enabled ? 'text-amber-300 font-medium' : 'text-white/40'}`}>
                              {mockupDetails.frontDesign?.enabled
                                ? `DTF ${mockupDetails.frontDesign.format || 'A4'}${mockupDetails.frontDesign.artworkName ? ` · ${mockupDetails.frontDesign.artworkName}` : ''}`
                                : 'Liso (Sin estampa)'}
                            </span>
                          </div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-felt-gray uppercase shrink-0">Estampa Reverso:</span>
                            <span className={`text-right ${mockupDetails.backDesign?.enabled ? 'text-amber-300 font-medium' : 'text-white/40'}`}>
                              {mockupDetails.backDesign?.enabled
                                ? `DTF ${mockupDetails.backDesign.format || 'A4'}${mockupDetails.backDesign.artworkName ? ` · ${mockupDetails.backDesign.artworkName}` : ''}`
                                : 'Liso (Sin estampa)'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-felt-gray uppercase shrink-0">Técnica:</span>
                          <span className="text-amber-300 text-right">
                            {mockupDetails?.frontDesign?.artworkName
                              ? `DTF ${mockupDetails.frontDesign.format || 'A4'} · ${mockupDetails.frontDesign.artworkName}`
                              : `DTF Formato ${mockupDetails?.format || 'A4'}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Checkbox: Adjuntar al proyecto si el cliente lo desea */}
                    <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 hover:border-amber-400/40 rounded-none cursor-pointer transition-colors mt-4 select-none">
                      <input
                        type="checkbox"
                        checked={includeMockup}
                        onChange={(e) => setIncludeMockup(e.target.checked)}
                        className="mt-0.5 accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs text-white font-medium">
                          {includeMockup ? '✓ Mockup 3D adjunto al pedido' : 'No adjuntar mockup 3D'}
                        </span>
                        <span className="text-[10px] text-ash-mist">
                          {includeMockup
                            ? 'El taller recibirá esta muestra visual exacta para calibrar la producción.'
                            : 'El proyecto se enviará solo como requerimiento de texto sin la imagen.'}
                        </span>
                      </div>
                    </label>

                    {/* Botón para recapturar si hizo cambios en el 3D */}
                    <button
                      type="button"
                      onClick={handleManualCapture}
                      className="mt-3 w-full py-2 rounded-[75px] border border-white/15 hover:border-white/40 text-ash-mist hover:text-white text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={11} />
                      <span>Actualizar Captura del Simulador</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-[#090b10] border border-dashed border-white/15 space-y-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-amber-400">
                      <Camera size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm text-white font-medium mb-1">
                        ¿Quieres que tu proyecto lleve un mockup 3D?
                      </h4>
                      <p className="text-xs text-ash-mist leading-relaxed pretty-text">
                        Puedes diseñar tu estampa en el simulador superior y pulsar <strong>"Agendar con este Diseño"</strong> para adjuntarlo automáticamente, o capturar la vista activa.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleManualCapture}
                      className="w-full py-2.5 rounded-[75px] bg-white/5 hover:bg-white/10 border border-white/20 hover:border-amber-400/50 text-white text-[10px] uppercase font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles size={12} className="text-amber-400" />
                      <span>Capturar Diseño del Simulador</span>
                    </button>
                  </div>
                )}

                {/* Micro-garantía de taller */}
                <div className="p-4 bg-obsidian border border-white/5 text-[11px] text-felt-gray space-y-1 font-mono">
                  <p className="text-white">✓ Taller de Autor en Quillota</p>
                  <p>• Muestra digital preprensa antes de estampar</p>
                  <p>• Despacho a todo Chile o retiro directo</p>
                </div>
              </div>

              {/* Columna Derecha: Formulario de Datos */}
              <div className="lg:col-span-7">
                <form onSubmit={handleQuoteSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-ash-mist font-mono">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={formData.client_name}
                        onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                        placeholder="Ej. Matías Silva"
                        className="w-full bg-[#09090b] border border-white/20 px-4 py-2.5 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-ash-mist font-mono">Teléfono / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={formData.client_phone}
                        onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
                        placeholder="+56 9 1234 5678"
                        className="w-full bg-[#09090b] border border-white/20 px-4 py-2.5 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-ash-mist font-mono">Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        value={formData.client_email}
                        onChange={e => setFormData({ ...formData, client_email: e.target.value })}
                        placeholder="contacto@estudio.cl"
                        className="w-full bg-[#09090b] border border-white/20 px-4 py-2.5 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-ash-mist font-mono">Ciudad / Comuna</label>
                      <input
                        type="text"
                        value={formData.client_city}
                        onChange={e => setFormData({ ...formData, client_city: e.target.value })}
                        placeholder="Ej. Quillota, Viña del Mar, Santiago"
                        className="w-full bg-[#09090b] border border-white/20 px-4 py-2.5 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-ash-mist font-mono">Soporte Seleccionado</label>
                      <select
                        value={formData.device_type}
                        onChange={e => {
                          setFormData({ ...formData, device_type: e.target.value })
                          setSimulatorType(e.target.value)
                        }}
                        className="w-full bg-[#09090b] border border-white/20 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors cursor-pointer"
                      >
                        <option value="Polera">Polera Algodón 240g</option>
                        <option value="Polerón">Polerón Hoodie 320g</option>
                        <option value="Cuello Redondo">Polerón Cuello Redondo</option>
                        <option value="Tazón">Tazón Cerámico 11oz</option>
                        <option value="Stanley">Vaso Térmico Stanley 40oz</option>
                        <option value="Termo">Botella Térmica Inox 500ml</option>
                        <option value="Jockey">Jockey 5 Paneles</option>
                        <option value="Totebag">Bolsa Totebag Lienzo</option>
                        <option value="Chopero">Vaso Chopero Cerámico</option>
                        <option value="Otro">Otro requerimiento a medida</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-ash-mist font-mono">Especificación / Tallas</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                        placeholder="Ej. Tallas M y L, acabado mate"
                        className="w-full bg-[#09090b] border border-white/20 px-4 py-2.5 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-ash-mist font-mono">
                      Detalle del Encargo & Cantidades Estimadas *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.reported_issue}
                      onChange={e => setFormData({ ...formData, reported_issue: e.target.value })}
                      placeholder="Indica cuántas unidades requieres, colores, ubicaciones de impresión o si tienes fecha límite de entrega."
                      className="w-full bg-[#09090b] border border-white/20 px-4 py-3 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 border border-rose-500/40 text-rose-400 text-xs font-mono">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-4 border border-emerald-500/40 bg-emerald-500/10 text-white text-xs space-y-1">
                      <p className="font-semibold uppercase tracking-wider text-emerald-300">✓ Solicitud Registrada con Éxito</p>
                      <p className="text-white">
                        N° de Orden Generado: <strong>{formSuccess.order_number || formSuccess.id}</strong>
                      </p>
                      {formSuccess.mockup_file_url && (
                        <p className="text-amber-300 text-[11px]">✓ Mockup 3D adjuntado y guardado en taller.</p>
                      )}
                      <p className="text-ash-mist text-[11px]">
                        Un impresor de Quillota revisará tu encargo y te responderá por WhatsApp a la brevedad.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full sm:w-auto rounded-[75px] bg-white hover:bg-amber-400 text-black px-10 py-3.5 text-xs uppercase tracking-[0.2em] font-medium transition-all duration-500 cursor-pointer focus-visible:outline-none flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <span>Procesando Proyecto...</span>
                    ) : (
                      <>
                        <span>{includeMockup && capturedMockup ? 'Agendar Proyecto con Mockup 3D' : 'Enviar Solicitud al Taller'}</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COLECCIÓN DE SOPORTES FÍSICOS (Dark Luxury Atelier, Monopo Saigon 0px/75px) ─── */}
      <section id="catalog" ref={catalogRef} className="py-28 bg-[#06080d] text-paper border-t border-white/10 relative overflow-hidden">
        {/* Sello editorial de taller */}
        <div className="absolute bottom-8 right-8 w-12 h-12 pointer-events-none select-none opacity-[0.12] z-0">
          <img src="/logo-bravo.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover rounded-full" />
        </div>

        <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12 relative z-10">
          
          {/* Encabezado Editorial de Sección */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: MONOPO_EASE }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 text-left"
          >
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist font-mono block mb-2">
                03 / Colección de Soportes Físicos
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-[-0.02em] text-white uppercase" style={{ textWrap: 'balance' }}>
                Soportes Vírgenes de Autor.
              </h2>
              <p className="text-sm text-ash-mist max-w-xl font-normal leading-relaxed mt-3" style={{ textWrap: 'pretty' }}>
                Prendas y objetos en blanco seleccionados por su gramaje, durabilidad y compatibilidad molecular con tintas textiles, DTF UV y sublimación térmica. Elige cualquier producto para personalizarlo en vivo en el Simulador 3D.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/bravo/catalogo')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[75px] border border-white/20 hover:border-white text-white text-[11px] uppercase tracking-[0.16em] font-normal transition-all duration-300 cursor-pointer focus-visible:outline-none"
              >
                <span>Ver Catálogo Completo</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </motion.div>

          {/* Filtros de Categoría con Píldoras de 75px Radius */}
          <div className="flex gap-2.5 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {BRAVO_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-5 py-2 rounded-[75px] text-[11px] uppercase tracking-[0.16em] font-normal transition-all duration-300 whitespace-nowrap cursor-pointer focus-visible:outline-none ${
                  selectedCategory === cat.key
                    ? 'bg-white text-black font-medium'
                    : 'bg-white/5 text-ash-mist hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Banner de Estado de Producción en Quillota */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-10 bg-[#0b0e14] border border-white/10 text-xs text-ash-mist">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-mono text-[11px] uppercase tracking-wider">
                Taller Quillota · Región de Valparaíso
              </span>
              <span className="hidden sm:inline text-felt-gray">·</span>
              <span className="hidden sm:inline text-ash-mist text-[11px]">
                Prendas y soportes disponibles para simulación 3D y producción inmediata.
              </span>
            </div>
            <button
              onClick={() => scrollToSection(studioRef)}
              className="text-[10px] uppercase tracking-widest text-white hover:text-ash-mist inline-flex items-center gap-1.5 border-b border-white/30 hover:border-white transition-colors cursor-pointer"
            >
              <span>Subir al Simulador 3D</span>
              <ArrowRight size={11} />
            </button>
          </div>

          {/* Grid de Productos con Contraste Radical Monopo (0px Radius, Sharp Frame) */}
          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-96 bg-[#0b0e14] border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {filteredCatalog.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.7, ease: MONOPO_EASE, delay: (idx % 3) * 0.12 }}
                  className="group flex flex-col justify-between bg-[#0b0e14] border border-white/10 hover:border-white/40 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
                >
                  {/* Pedestal de Imagen (Sharp 0px, Contrast Frame) */}
                  <div className="w-full h-72 bg-[#06080d] border-b border-white/10 flex items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

                    {/* Tags de especificación */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-[75px] bg-black/80 backdrop-blur-sm border border-white/15 text-[9px] uppercase tracking-widest text-ash-mist font-mono">
                        {product.badge || 'Taller'}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-[75px] bg-white/10 backdrop-blur-sm border border-white/20 text-[9px] uppercase tracking-widest text-white font-mono">
                        {product.technique}
                      </span>
                    </div>

                    {/* Imagen de Soporte con Zoom Suave */}
                    <img
                      src={product.image_url || '/mockups/polera_front.png'}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-700 ease-monopo relative z-0"
                      onError={(e) => { e.target.src = '/mockups/polera_front.png' }}
                    />
                  </div>

                  {/* Ficha Editorial & Especificaciones */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8e95a5] font-mono">
                          {product.categoryLabel || product.category}
                        </span>
                        <span className="text-base font-light tracking-tight text-white font-mono">
                          ${Number(product.sale_price || product.price).toLocaleString('es-CL')}
                        </span>
                      </div>

                      <h3 className="text-base font-normal text-white tracking-tight leading-snug">
                        {product.name}
                      </h3>

                      <p className="text-xs text-ash-mist font-light leading-relaxed line-clamp-2">
                        {product.description}
                      </p>

                      <div className="pt-1">
                        <span className="text-[10px] text-felt-gray font-mono block">
                          {product.spec}
                        </span>
                      </div>
                    </div>

                    {/* Botones de Acción (Geometría Monopo: Píldoras 75px) */}
                    <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => handleOpenInSimulator(product.typeKey)}
                        className="rounded-[75px] bg-white hover:bg-ash-mist text-black py-2.5 px-3 text-[10px] tracking-[0.14em] uppercase font-medium transition-all duration-300 cursor-pointer text-center focus-visible:outline-none flex items-center justify-center gap-1.5"
                        title={`Personalizar ${product.name} en el Simulador 3D`}
                      >
                        <Box size={12} />
                        <span>Simular 3D</span>
                      </button>

                      <button
                        onClick={() => handleWhatsAppContact(product.name)}
                        className="rounded-[75px] border border-white/20 hover:border-white text-white py-2.5 px-3 text-[10px] tracking-[0.14em] uppercase font-normal transition-all duration-300 cursor-pointer bg-transparent text-center focus-visible:outline-none flex items-center justify-center gap-1.5 hover:bg-white/5"
                        title={`Cotizar ${product.name} por WhatsApp`}
                      >
                        <MessageSquare size={12} />
                        <span>Cotizar</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Enlace para ver todo el catálogo */}
          <div className="mt-16 text-center pt-8 border-t border-white/10">
            <button
              onClick={() => navigate('/bravo/catalogo')}
              className="rounded-[75px] bg-white hover:bg-ash-mist text-black px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-medium transition-all duration-500 cursor-pointer inline-flex items-center gap-2"
            >
              <span>Explorar Todo el Inventario de Soportes</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── SECCIÓN: IMPRESIÓN DTF TEXTIL & UV POR METRO LINEAL (Producción Industrial en Bobina) ─── */}
      <section id="dtf" ref={dtfRef} className="py-28 bg-[#07090f] text-paper border-t border-white/10 relative overflow-hidden text-left">
        {/* Grilla técnica milimétrica de fondo simulando mesa de corte de plotter */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Marcas de registro de corte de plotter (Cruces de calibración en esquinas) */}
        <div className="absolute top-6 left-6 text-white/25 font-mono text-[9px] sm:text-[10px] select-none pointer-events-none tracking-widest hidden sm:block">
          + REG: X:000 Y:000 [CALIBRATED BRAVO]
        </div>
        <div className="absolute top-6 right-6 text-white/25 font-mono text-[9px] sm:text-[10px] select-none pointer-events-none tracking-widest hidden sm:block">
          + RIP 2400 DPI [EPSON I3200 PRECISION]
        </div>

        <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12 relative z-10">
          
          {/* Header de la sección */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: MONOPO_EASE }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
                <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist font-mono">
                  03.B / Suministro Continuo por Metro
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-[-0.02em] text-white uppercase" style={{ textWrap: 'balance' }}>
                DTF Textil & UV por Metro.
              </h2>
              <p className="text-sm text-ash-mist max-w-2xl font-normal leading-relaxed pt-1 pretty-text">
                Fabricación industrial de transfers termoadhesivos y stickers de máxima adhesión en rollo continuo. Despachamos metros lineales horneados o curados listos para estampar en tu taller o aplicar en frío sobre soportes rígidos.
              </p>
            </motion.div>

            {/* Selector de Pestaña: Textil vs UV */}
            <div className="flex bg-black/80 border border-white/15 p-1 rounded-[75px] shrink-0 self-start md:self-end">
              <button
                type="button"
                onClick={() => setDtfActiveTab('textil')}
                className={`px-5 py-2 rounded-[75px] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  dtfActiveTab === 'textil'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>DTF Textil (32cm)</span>
              </button>
              <button
                type="button"
                onClick={() => setDtfActiveTab('uv')}
                className={`px-5 py-2 rounded-[75px] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  dtfActiveTab === 'uv'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Zap size={13} />
                <span>DTF UV Rígidos (28cm)</span>
              </button>
            </div>
          </div>

          {/* Comparativa Interactiva / Detalle de la Técnica Seleccionada */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-16">
            
            {/* Columna Izquierda: Arquitectura Molecular de Capas */}
            <motion.div
              key={dtfActiveTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: MONOPO_EASE }}
              className="lg:col-span-6 bg-[#0b0e15] border border-white/15 p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden group shadow-2xl"
            >
              {/* Badge de Ancho de Bobina */}
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-2">
                  <Ruler size={14} className="text-amber-400" />
                  <span className="text-xs uppercase font-mono text-white font-bold tracking-wider">
                    {dtfActiveTab === 'textil' ? 'Bobina Continua · 32 cm de Ancho' : 'Bobina Continua · 28 cm de Ancho'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded-md">
                  {dtfActiveTab === 'textil' ? 'Curado Térmico 160°C' : 'Adhesión Instantánea en Frío'}
                </span>
              </div>

              {/* Diagrama de Capas Estilizado (Corte Transversal) */}
              <div className="my-8 py-6 px-4 bg-black/60 border border-white/10 rounded-xl space-y-3 font-mono text-[11px]">
                <div className="text-[9px] uppercase tracking-widest text-ash-mist pb-1 border-b border-white/10 flex items-center justify-between">
                  <span>Estructura de Capas de Impresión:</span>
                  <span className="text-amber-400 font-bold">1:1 Escala Real</span>
                </div>

                {dtfActiveTab === 'textil' ? (
                  <>
                    <div className="flex items-center gap-3 p-2 bg-amber-400/15 border-l-2 border-amber-400 text-amber-200">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C4</span>
                      <span>Poliamida Termoplástica Elástica 90A (Adhesión Térmica)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-white/10 border-l-2 border-white/60 text-white">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C3</span>
                      <span>Tinta Blanca Micro-Opaca de Bloqueo (Dual Head)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-cyan-500/20 via-rose-500/20 to-amber-500/20 border-l-2 border-cyan-400 text-white">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C2</span>
                      <span>Colorimetría CMYK HD · Tintas Pigmentadas Japonesas</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-zinc-800/80 border-l-2 border-zinc-500 text-zinc-400">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C1</span>
                      <span>Film Portador PET 75µm con Tratamiento Antiestático</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-2 bg-amber-400/20 border-l-2 border-amber-400 text-amber-300">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C4</span>
                      <span>Barniz Selectivo Brillante con Relieve Táctil 3D (Gloss Varnish)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-indigo-500/20 via-pink-500/20 to-amber-500/20 border-l-2 border-indigo-400 text-white">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C3</span>
                      <span>Tintas Curadas con Lámpara UV LED en Frío (CMYK)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-white/10 border-l-2 border-white/60 text-white">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C2</span>
                      <span>Base de Tinta Blanca de Alta Densidad (Bloqueo Total)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-emerald-500/15 border-l-2 border-emerald-400 text-emerald-300">
                      <span className="w-5 text-center font-bold text-[10px] opacity-70">C1</span>
                      <span>Film Transfer Film A + B con Adhesivo Acrílico Resistente</span>
                    </div>
                  </>
                )}
              </div>

              {/* Especificaciones Técnicas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-left font-mono">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-felt-gray block">Resolución</span>
                  <span className="text-xs text-white font-medium">2400 × 1200 DPI</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-felt-gray block">
                    {dtfActiveTab === 'textil' ? 'Temperatura' : 'Curado'}
                  </span>
                  <span className="text-xs text-white font-medium">
                    {dtfActiveTab === 'textil' ? '160°C · 15 Seg' : 'LED UV Frío'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-felt-gray block">Pelado</span>
                  <span className="text-xs text-white font-medium">En Frío (Cold Peel)</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-felt-gray block">Mínimo</span>
                  <span className="text-xs text-amber-400 font-bold">Desde 1 Metro</span>
                </div>
              </div>
            </motion.div>

            {/* Columna Derecha: Explicación de Usos, Sustratos y Estimador de Metraje */}
            <motion.div
              key={`${dtfActiveTab}-details`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: MONOPO_EASE }}
              className="lg:col-span-6 bg-[#090b10] border border-white/15 p-7 sm:p-10 flex flex-col justify-between text-left shadow-2xl"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300">
                    {dtfActiveTab === 'textil' ? 'Técnica Textil Industrial' : 'Stickers y Rígidos de Alta Resistencia'}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-tight">
                  {dtfActiveTab === 'textil' ? 'DTF Textil Continuo (32 cm)' : 'DTF UV con Barniz y Relieve (28 cm)'}
                </h3>
                <p className="text-xs text-ash-mist leading-relaxed mt-3 pretty-text">
                  {dtfActiveTab === 'textil'
                    ? 'La tecnología preferida por marcas de streetwear y talleres de confección. Imprime cualquier cantidad de colores, degradados hiperrealistas y detalles milimétricos. El film se entrega horneado con poliamida activada, listo para ser aplicado con plancha transfer sobre algodón, poliéster, telas oscuras o mezclas.'
                    : 'El nuevo estándar en personalización de superficies rígidas sin necesidad de prensas térmicas. Con tecnología UV LED, el film transfiere directamente sobre vidrio, metal, acero inoxidable, acrílico, cerámica o madera con un acabado brillante en relieve 3D indestructible.'}
                </p>

                {/* Lista de Ventajas y Sustratos Compatibles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 py-4 border-y border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-mono text-white/50 block mb-2">
                      Sustratos Aptos:
                    </span>
                    <ul className="space-y-1.5 text-white/80 font-mono text-[11px]">
                      {dtfActiveTab === 'textil' ? (
                        <>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Algodón 100% y Poliéster</li>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Telas Oscuras y Claras</li>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Mezclas, Denim, Canvas y Drill</li>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Jockeys, Polerones y Bolsas</li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Vasos y Botellas Tipo Stanley</li>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Termos de Acero Inoxidable</li>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Tazones de Cerámica y Vidrio</li>
                          <li className="flex items-center gap-1.5"><Check size={12} className="text-amber-400 shrink-0" /> Acrílico, Madera y Carcasas</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-mono text-white/50 block mb-2">
                      Garantía de Rendimiento:
                    </span>
                    <ul className="space-y-1.5 text-white/80 font-mono text-[11px]">
                      {dtfActiveTab === 'textil' ? (
                        <>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Más de 50 lavados sin daño</li>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Tacto suave y elástico</li>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Cero cuarteado al estirar</li>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> No requiere pelado previo</li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Impermeable y lavable</li>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Relieve táctil 3D con barniz</li>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Resistente al roce y rayos UV</li>
                          <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-400 shrink-0" /> Aplicación en frío sin máquina</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Calculador / Selector de Metros Rápido */}
                <div className="bg-black/60 p-4 border border-white/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ash-mist uppercase">Metraje de Bobina a Cotizar:</span>
                    <span className="text-white font-bold">{dtfMeters} Metro{dtfMeters > 1 ? 's' : ''} ({dtfMeters * 100} cm)</span>
                  </div>

                  <div className="flex gap-2">
                    {[1, 3, 5, 10, 20].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDtfMeters(m)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          dtfMeters === m
                            ? 'bg-amber-400 text-black font-bold shadow-md'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>

                  {/* Resumen de Valor Estimado */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-felt-gray uppercase">Valor Estimado Taller:</span>
                      <span className="text-lg font-bold text-amber-400">
                        ${Math.round(
                          (dtfActiveTab === 'textil' ? 4500 : 5500) *
                          (1 - (dtfMeters >= 10 ? 0.15 : dtfMeters >= 5 ? 0.10 : 0)) *
                          dtfMeters
                        ).toLocaleString('es-CL')}
                        <span className="text-[10px] text-white/50 font-normal ml-1">
                          (${Math.round(
                            (dtfActiveTab === 'textil' ? 4500 : 5500) *
                            (1 - (dtfMeters >= 10 ? 0.15 : dtfMeters >= 5 ? 0.10 : 0))
                          ).toLocaleString('es-CL')}/m)
                        </span>
                      </span>
                    </div>

                    {dtfMeters >= 5 && (
                      <span className="text-[10px] uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                        {dtfMeters >= 10 ? '15% Descuento por Volumen' : '10% Descuento por Volumen'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción Inmediata */}
              <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleSelectDtfMetraje(dtfActiveTab, dtfMeters)}
                  className="flex-1 rounded-[75px] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black py-3 px-6 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
                >
                  <ArrowRight size={13} />
                  <span>Cotizar {dtfMeters}m de {dtfActiveTab === 'textil' ? 'DTF Textil' : 'DTF UV'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const phone = (config?.whatsapp || config?.phone || '+56967547300').replace(/[^0-9]/g, '')
                    const msg = encodeURIComponent(
                      `Hola Personalizaciones Bravo, deseo cotizar ${dtfMeters} metros lineales de ${dtfActiveTab === 'textil' ? 'DTF Textil (32cm de ancho)' : 'DTF UV (28cm con relieve 3D)'} para retiro en Quillota / despacho a región.`
                    )
                    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
                  }}
                  className="rounded-[75px] border border-white/20 hover:border-white text-white py-3 px-5 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer bg-transparent hover:bg-white/5 flex items-center gap-2"
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp Taller</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Fila de Certificación y Recomendaciones de Preparación de Archivo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-black/40 border border-white/10 text-left font-mono">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-amber-400 font-bold block tracking-wider">
                01 / Formato de Bobina
              </span>
              <p className="text-xs text-ash-mist leading-relaxed">
                Envía tus archivos en PNG transparente a 300 DPI, TIFF o PDF vectorial en escala real 1:1 respetando el ancho útil (32cm para Textil, 28cm para UV).
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-amber-400 font-bold block tracking-wider">
                02 / Sin Límite de Diseños
              </span>
              <p className="text-xs text-ash-mist leading-relaxed">
                Acomoda tantos logotipos, isotipos y patrones como quepan a lo largo del metro lineal. No cobramos por número de imágenes, solo por metro de film impreso.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-amber-400 font-bold block tracking-wider">
                03 / Despacho a Todo Chile
              </span>
              <p className="text-xs text-ash-mist leading-relaxed">
                Los rollos se embalan protegidos contra humedad y pliegues en tubos rígidos. Envíos diarios vía Starken, Chilexpress o retiro directo en taller Quillota.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MANIFIESTO Y TÉCNICAS (Dark Surface, Raleway Heading Counterpoint) ─── */}
      <section id="manifesto" ref={manifestoRef} className="py-28 bg-obsidian border-t border-white/10 text-left relative overflow-hidden">
        {/* Sello editorial de taller — marca de imprenta */}
        <div className="absolute top-8 right-8 w-12 h-12 pointer-events-none select-none opacity-[0.12] z-0">
          <img src="/logo-bravo.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover rounded-full" />
        </div>

        <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12 space-y-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: MONOPO_EASE }}
            className="space-y-4"
          >
            <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist block">
              04 / Capacidad Técnica
            </span>
            <h2 className="font-raleway text-3xl sm:text-5xl lg:text-[54px] font-normal text-white leading-[1.39] tracking-[-0.01em] max-w-3xl" style={{ textWrap: 'balance' }}>
              Fidelidad cromática inalterable sobre cualquier sustrato físico.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-white/15">
            {(() => {
              // Filtrar estrictamente cualquier mención de bordado o grabado láser (técnicas no realizadas por el taller)
              const rawTechs = (config?.content?.techniques || []).filter(
                t => !t.name?.toLowerCase().includes('bordad') && 
                     !t.desc?.toLowerCase().includes('bordad') &&
                     !t.name?.toLowerCase().includes('laser') &&
                     !t.name?.toLowerCase().includes('láser') &&
                     !t.desc?.toLowerCase().includes('laser') &&
                     !t.desc?.toLowerCase().includes('láser')
              )

              const fallbackTechs = [
                {
                  num: '01',
                  tag: 'DTF Textil',
                  title: 'Estampado Digital Direct-to-Film',
                  spec: '1440 DPI · CMYK + Doble Blanco',
                  desc: 'Microcápsulas de tinta pigmentada con poliamida elastomérica transferidas a 160°C. Resistencia probada a más de 50 ciclos de lavado industrial sin cuarteado ni pérdida de saturación.'
                },
                {
                  num: '02',
                  tag: 'Sublimación HD',
                  title: 'Vitrificado Térmico 360°',
                  spec: '200°C · Fusión Molecular',
                  desc: 'Gasificación de tintas foto-ópticas que penetran la capa de polímero cerámico. Acabado brillante espejado o mate satinado, 100% apto para lavavajillas y microondas.'
                },
                {
                  num: '03',
                  tag: 'DTF UV con Barniz 3D',
                  title: 'Adhesión en Frío para Rígidos',
                  spec: 'UV LED · Relieve Táctil 3D',
                  desc: 'Curado instantáneo de tintas UV con barniz brillante que genera textura y relieve tridimensional sobre botellas térmicas, termos, vidrio, metal, cerámica y madera.'
                }
              ]

              // Si vienen técnicas CMS válidas y sin bordado ni láser, usarlas; sino usar el fallback artesanal exacto
              const techsToRender = rawTechs.length >= 3
                ? rawTechs.slice(0, 3).map((t, idx) => ({
                    num: `0${idx + 1}`,
                    tag: t.name || fallbackTechs[idx]?.tag || 'Técnica de Taller',
                    title: t.name || fallbackTechs[idx]?.title || 'Proceso de Personalización',
                    spec: idx === 0 ? '1440 DPI · Ultra HD' : idx === 1 ? '200°C · Vitrificado' : 'Relieve Táctil 3D',
                    desc: t.desc || fallbackTechs[idx]?.desc || 'Calibración precisa y acabado industrial garantizado en taller.'
                  }))
                : fallbackTechs

              return techsToRender
            })().map((tech, idx) => (
              <motion.div
                key={tech.num}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: MONOPO_EASE, delay: idx * 0.18 }}
                className="group relative p-8 bg-[#09090b] border border-white/10 hover:border-amber-500/30 transition-all duration-700 overflow-hidden text-left"
              >
                {/* Overlay de acento ámbar que se revela en diagonal al hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at bottom left, rgba(255,172,46,0.06) 0%, transparent 70%)'
                  }}
                />

                {/* Número como watermark de fondo — da profundidad z sin competir con el texto */}
                <div
                  className="absolute bottom-4 right-4 text-[120px] font-light leading-none pointer-events-none select-none transition-all duration-700 group-hover:opacity-60"
                  style={{ color: 'transparent', WebkitTextStroke: '1px rgba(255,172,46,0.12)' }}
                  aria-hidden="true"
                >
                  {tech.num}
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-mono text-ash-mist uppercase tracking-widest group-hover:text-amber-300/70 transition-colors duration-500">
                      {tech.num} / {tech.tag}
                    </span>
                    <span className="text-[9px] font-mono text-amber-300/80 px-2 py-0.5 rounded-[75px] bg-amber-500/10 border border-amber-500/20">
                      {tech.spec}
                    </span>
                  </div>

                  {/* Línea separadora que se acorta en hover para dar tensión visual */}
                  <div className="h-px w-full bg-white/10 group-hover:bg-amber-500/20 transition-colors duration-500" />

                  <h3 className="text-xl font-light text-white group-hover:text-amber-50 transition-colors duration-500 tracking-tight">
                    {tech.title}
                  </h3>
                  <p className="text-xs text-ash-mist leading-relaxed" style={{ textWrap: 'pretty' }}>
                    {tech.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PREGUNTAS FRECUENTES Y GARANTÍAS DE TALLER (Contenido Editorial de Confianza) ─── */}
      <section className="py-24 bg-obsidian border-t border-white/10 text-left relative overflow-hidden">
        <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: MONOPO_EASE }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4"
          >
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist font-mono block mb-2">
                Información de Taller
              </span>
              <h2 className="text-3xl sm:text-5xl font-light tracking-[-0.02em] text-white uppercase" style={{ textWrap: 'balance' }}>
                Preguntas Frecuentes & Garantías.
              </h2>
            </div>
            <p className="text-sm text-ash-mist max-w-sm font-normal leading-relaxed" style={{ textWrap: 'pretty' }}>
              Transparencia total sobre tiempos, volúmenes mínimos y requisitos de arte antes de ingresar tu pedido.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(config?.faqs && config.faqs.length > 0
              ? config.faqs
              : [
                  {
                    q: '¿Cuál es el pedido mínimo para estampar o grabar?',
                    a: 'Fabricamos desde 1 unidad para proyectos individuales, prototipos o regalos de autor. También contamos con escalas de precios mayoristas a partir de 10, 50 y 100+ unidades.'
                  },
                  {
                    q: '¿Qué formato de archivo debo entregar para mi arte?',
                    a: 'Recomendamos archivos vectoriales (AI, SVG, PDF vectorial) o imágenes PNG en alta resolución (300 DPI con fondo transparente). Si tu logo necesita vectorización o retoque, nuestro equipo lo calibra sin costo adicional.'
                  },
                  {
                    q: '¿Cómo funciona el despacho y el retiro en taller?',
                    a: 'Puedes retirar directamente en nuestro taller de Quillota sin costo. Para el resto del país, realizamos envíos express a todo Chile con número de seguimiento y embalaje reforzado.'
                  },
                  {
                    q: '¿Qué garantía tienen los estampados y aplicaciones?',
                    a: 'Nuestros estampados DTF Textil cuentan con garantía comprobada de más de 50 ciclos de lavado industrial sin desprenderse ni cuartearse. Las aplicaciones DTF UV cuentan con barniz de alta densidad resistente al agua, rayos solares y uso continuo.'
                  }
                ]
            ).map((faq, idx) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: MONOPO_EASE, delay: idx * 0.1 }}
                className="group relative border-b border-white/10 py-6 hover:border-white/25 transition-colors duration-500 cursor-default"
              >
                {/* Línea de acento izquierda — crece de arriba a abajo al hover */}
                <div className="absolute left-0 top-0 w-px h-0 group-hover:h-full bg-amber-500/60 transition-all duration-600 ease-out" />

                <div className="pl-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[9px] font-mono text-amber-400/60 mt-1 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-base font-normal text-white tracking-tight leading-snug group-hover:text-amber-50 transition-colors duration-300">
                      {faq.q}
                    </h3>
                  </div>
                  <p className="text-xs text-ash-mist leading-relaxed pl-7" style={{ textWrap: 'pretty' }}>
                    {faq.a}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RASTREO DE PEDIDOS EN VIVO (Austere Monochrome Tracker) ─── */}
      <section id="track" ref={trackRef} className="py-24 bg-[#09090b] border-t border-white/10 text-left">
        <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12">
          <div className="mb-12">
            <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist block mb-2">
              05 / Trazabilidad de Producción
            </span>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white uppercase balance-text">
              Rastrear Orden de Taller.
            </h2>
            <p className="text-xs text-ash-mist mt-1 pretty-text">
              Ingresa tu identificador de pedido (ej. BRAVO-2026-001 o N° de orden) para consultar el progreso y comunicarte en directo con el impresor.
            </p>
          </div>

          {/* Formulario de Búsqueda de Rastreo (0px Inputs, 75px Button) */}
          <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-12 gap-3 max-w-3xl mb-8">
            <div className="sm:col-span-5">
              <input
                type="text"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="Número de orden (ej: 1042 o BRAVO-001)"
                required
                className="w-full bg-obsidian border border-white/20 px-4 py-3 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                value={rutOrPhone}
                onChange={e => setRutOrPhone(e.target.value)}
                placeholder="RUT o Teléfono (opcional)"
                className="w-full bg-obsidian border border-white/20 px-4 py-3 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={trackLoading}
                className="w-full rounded-[75px] border border-white/40 hover:border-white text-white py-3 text-[11px] tracking-[0.15em] uppercase font-normal transition-all duration-700 cursor-pointer bg-transparent text-center focus-visible:outline-none"
              >
                {trackLoading ? 'Consultando...' : 'Consultar'}
              </button>
            </div>
          </form>

          {trackError && (
            <div className="p-4 border border-rose-500/40 text-rose-400 text-xs font-mono max-w-2xl">
              {trackError}
            </div>
          )}

          {/* Resultado de Rastreo con Timeline Estricto */}
          {trackResult && (
            <div className="border border-white/15 bg-obsidian p-8 max-w-3xl space-y-8 mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-ash-mist block">Orden {trackResult.order_number}</span>
                  <h3 className="text-xl font-normal text-white">{trackResult.device_type} — {trackResult.model}</h3>
                </div>
                <span className="px-4 py-1 rounded-[75px] border border-white/30 text-xs uppercase tracking-wider text-white">
                  Estado: {trackResult.status}
                </span>
              </div>

              {/* Pasos de Producción */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
                {STATUS_STEPS.map((step) => (
                  <div key={step.key} className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-ash-mist block">{step.label}</span>
                    <p className="text-[11px] text-felt-gray leading-tight">{step.desc}</p>
                  </div>
                ))}
              </div>

              {/* Bitácora de comentarios y chat con taller */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <span className="text-[11px] uppercase tracking-widest text-ash-mist block">
                  Mensajes con el Taller
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 bravo-scrollbar">
                  {orderComments.length === 0 ? (
                    <p className="text-xs text-felt-gray">Sin anotaciones registradas aún.</p>
                  ) : (
                    orderComments.map(c => (
                      <div key={c.id} className="text-xs border-b border-white/5 pb-2">
                        <span className="font-semibold text-white">{c.author_name}: </span>
                        <span className="text-ash-mist">{c.message}</span>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    placeholder="Escribe una pregunta para el impresor..."
                    className="flex-1 bg-obsidian border border-white/20 px-3 py-2 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting}
                    className="rounded-[75px] border border-white/40 hover:border-white text-white px-5 py-2 text-[10px] uppercase tracking-widest cursor-pointer bg-transparent focus-visible:outline-none"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* ─── FOOTER EDITORIAL (Tipografía Monumental + 3-Column Layout) ─── */}
      <footer className="relative bg-obsidian border-t border-white/10 text-left text-[11px] text-felt-gray font-normal overflow-hidden">
        
        {/* CTA pre-footer — franja de llamada a la acción antes del cierre */}
        <div className="relative border-b border-white/10 py-16 px-6 sm:px-12 text-center overflow-hidden">
          {/* Atmósfera ámbar sutil de fondo */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(ellipse at center bottom, rgba(255,172,46,0.3) 0%, transparent 70%)' }}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: MONOPO_EASE }}
            className="relative z-10"
          >
            <span className="text-[11px] uppercase tracking-[0.3em] text-ash-mist block mb-4">
              ¿Tienes un proyecto en mente?
            </span>
            <h2 className="text-[clamp(28px,6vw,72px)] font-light text-white tracking-[-0.03em] uppercase leading-[1.05] mb-8" style={{ textWrap: 'balance' }}>
              Hagámoslo real.
            </h2>
            <motion.button
              onClick={() => scrollToSection(quoteRef)}
              whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,172,46,0.08)', borderColor: 'rgba(255,172,46,0.5)' }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 rounded-[75px] border border-white/25 text-white px-10 py-4 text-[12px] tracking-[0.18em] uppercase font-normal transition-colors duration-500 cursor-pointer bg-transparent focus-visible:outline-none"
            >
              Iniciar Proyecto
              <ArrowRight size={14} />
            </motion.button>
          </motion.div>
        </div>

        {/* Wordmark tipográfico gigante — elemento de marca impreso en el fondo */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-end justify-center pointer-events-none select-none overflow-hidden h-48"
          aria-hidden="true"
        >
          <span
            className="text-[clamp(96px,22vw,280px)] font-light uppercase leading-none tracking-[-0.04em] whitespace-nowrap"
            style={{
              color: 'transparent',
              WebkitTextStroke: '1px rgba(255,255,255,0.04)',
              marginBottom: '-0.15em'
            }}
          >
            BRAVO
          </span>
        </div>

        <div className="relative z-10 max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 py-16">
          
          {/* Columna 1: Identidad & Logotipo Oficial */}
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-amber-500/40 shrink-0 bg-black shadow-[0_0_20px_rgba(255,172,46,0.18)]">
                <img
                  src="/logo-bravo.jpg"
                  alt="Personalizaciones Bravo Logotipo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-white uppercase tracking-[0.2em] block font-medium text-xs leading-tight">
                  Personalizaciones Bravo
                </span>
                <span className="text-[10px] text-amber-200/70 uppercase tracking-widest block leading-tight mt-0.5">
                  Taller de Autor · Quillota
                </span>
              </div>
            </div>

            <p className="leading-relaxed pretty-text">
              Taller de confección textil pesada, estampado DTF de tacto cero y personalización DTF UV de autor.
            </p>
            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              <p className="text-[#6d6d6d] text-[10px]">
                © {new Date().getFullYear()} Personalizaciones Bravo. Todos los derechos reservados.
              </p>
              <span className="text-[#444] text-[10px] hidden sm:inline">•</span>
              <a
                href="/login"
                className="text-[#6d6d6d] hover:text-amber-400 text-[10px] uppercase font-mono tracking-wider transition-colors inline-flex items-center gap-1"
                title="Acceso de Gestión y Producción de Taller"
              >
                <span>Acceso Taller</span>
              </a>
            </div>
          </div>

          {/* Columna 2: Ubicación & Contacto Directo */}
          <div className="space-y-2">
            <span className="text-white uppercase tracking-[0.2em] block font-normal text-xs">
              Ubicación & Atención
            </span>
            <p className="leading-tight text-white">
              {config?.content?.contact?.address || 'Quillota, Región de Valparaíso, Chile'}
            </p>
            <p className="leading-tight">
              {config?.content?.contact?.schedule || 'Lunes a Viernes: 09:30 - 18:30 hrs'}
            </p>
            <p className="pt-2 text-white font-mono text-[11px]">
              WhatsApp: {config?.phone || config?.whatsapp || '+56 9 6754 7300'}
            </p>
          </div>

          {/* Columna 3: Redes & Canales Digitales */}
          <div className="space-y-2">
            <span className="text-white uppercase tracking-[0.2em] block font-normal text-xs">
              Canales de Autor
            </span>
            <div className="flex flex-col gap-2 pt-1">
              <a
                href={config?.content?.contact?.instagram || 'https://www.instagram.com/personalizacionesbravo/'}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram / @personalizacionesbravo
              </a>
              <a
                href={`https://wa.me/${(config?.whatsapp || '+56967547300').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp Directo con Taller
              </a>
              <a
                href="mailto:personalizacionesbravo@gmail.com"
                className="hover:text-white transition-colors"
              >
                personalizacionesbravo@gmail.com
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── BANNER DE CUMPLIMIENTO / COOKIE NOTICE (Monopo Saigon Slate Pill) ─── */}
      {!cookieConsent && (
        <aside
          role="region"
          aria-label="Aviso de privacidad y cookies"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 max-w-md z-50 bg-[#373737]/90 backdrop-blur-md border border-white/20 p-4 text-white text-[12px] font-system-ui flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xl"
        >
          <p className="leading-tight text-white/90">
            Utilizamos almacenamiento local para preservar tus preferencias y pedidos en curso dentro del taller.
          </p>
          <button
            onClick={handleAcceptCookies}
            className="shrink-0 rounded-[75px] bg-[#636363] hover:bg-white hover:text-black border border-white/40 text-white px-5 py-1.5 text-[11px] tracking-wider uppercase font-medium transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </aside>
      )}

      {/* ─── CHAT DIRECTO FLOTANTE CON EL TALLER (SIN ORDEN PREVIA) ─── */}
      <BravoLiveChatWidget
        initialPhone={formData.client_phone || ''}
        initialName={formData.client_name || ''}
      />
    </div>
  )
}
