import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Sparkles, Send, CheckCircle, AlertTriangle, 
  Search, Clock, Calendar, HelpCircle, FileText, User, ShoppingCart,
  ArrowRight, ShieldCheck, Heart, Star, Phone, MessageSquare, Info,
  MapPin, Mail, Globe, ChevronDown, ChevronUp, MessageCircle, X,
  UploadCloud
} from 'lucide-react'
import { getPublicProducts, requestOrder, trackRepair, getWebConfig, simulateWhatsAppMessage, getTrackComments, createTrackComment, uploadPublicDesign, acceptQuote, rejectQuote } from '../../api/public'
import Bravo3DSimulator from '../../components/bravo/Bravo3DSimulator'
import { getRandomProductType, resolveProductType } from '../../utils/bravoMockupProducts'
import api from '../../api/client'

const STATUS_STEPS = [
  { key: 'recibido', label: 'Recibido', desc: 'Solicitud ingresada' },
  { key: 'diagnostico', label: 'Diseño en Progreso', desc: 'Revisión y bosquejo del diseño' },
  { key: 'en_reparacion', label: 'En Producción', desc: 'Estampado o confección en curso' },
  { key: 'listo', label: 'Listo para Entrega', desc: 'Pedido terminado y empaquetado' },
  { key: 'entregado', label: 'Entregado', desc: 'Pedido retirado' }
]

const STATUS_LABELS = {
  recibido: { text: 'Recibido', color: 'bg-bravo-accent/12 text-bravo-accent border-bravo-accent/25' },
  diagnostico: { text: 'Diseño en Progreso', color: 'bg-bravo-accent/12 text-bravo-accent border-bravo-accent/25' },
  esperando_repuesto: { text: 'Esperando Insumo', color: 'bg-bravo-accent-warm/12 text-bravo-accent-warm border-bravo-accent-warm/25' },
  presupuesto_enviado: { text: 'Cotización Enviada', color: 'bg-amber-600/12 text-amber-700 border-amber-600/25' },
  en_reparacion: { text: 'En Producción', color: 'bg-bravo-accent-warm/15 text-bravo-accent-warm border-bravo-accent-warm/30' },
  listo: { text: 'Listo para Entrega', color: 'bg-emerald-600/12 text-emerald-800 border-emerald-600/25' },
  entregado: { text: 'Entregado', color: 'bg-bravo-text-muted/12 text-bravo-text-muted border-bravo-border' },
  cancelado: { text: 'Cancelado', color: 'bg-rose-600/12 text-rose-800 border-rose-600/25' },
  en_garantia: { text: 'En Garantía', color: 'bg-pink-500/10 text-pink-500 border-pink-500/30 font-bold' }
}

const CAROUSEL_ITEMS = [
  { label: 'Inicio', emoji: '🏠', desc: 'Portada Principal', img: null },
  { label: 'Poleras', emoji: '👕', desc: 'Estampado de Ropa', img: '/mockups/polera_front.png' },
  { label: 'Polerones', emoji: '🧥', desc: 'Polerones y Hoodies', img: '/mockups/poleron_front.png' },
  { label: 'Tazones', emoji: '☕', desc: 'Tazones y Mugs', img: '/mockups/tazon_front.png' },
  { label: 'Jockeys', emoji: '🧢', desc: 'Gorras y Jockeys', img: '/mockups/jockey_front.png' },
  { label: 'Totebags', emoji: '👜', desc: 'Bolsas de Tela', img: '/mockups/totebag_front.png' },
  { label: 'Catálogo', emoji: '🛍️', desc: 'Ver Productos Base', img: null },
  { label: 'Cotizar', emoji: '📝', desc: 'Solicitar Pedido', img: null }
]

export default function BravoPublicPage({ devToggle }) {
  // Tabs: home, catalog, quote, track
  const [activeTab, setActiveTab] = useState('home')

  // Dynamic web config
  const [config, setConfig] = useState(null)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  // Products state
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')

  // Quote form state
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

  // Quick Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderProduct, setOrderProduct] = useState(null)
  const [orderForm, setOrderForm] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    quantity: 1,
    notes: ''
  })
  const [orderError, setOrderError] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)

  // Track state
  const [orderNumber, setOrderNumber] = useState('')
  const [rutOrPhone, setRutOrPhone] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [trackLoading, setTrackLoading] = useState(false)

  // Order/Repair Chat Comments State
  const [orderComments, setOrderComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  // Chatbot State
  const [showChatbot, setShowChatbot] = useState(false)
  const [chatMode, setChatMode] = useState('bot') // 'bot' | 'live'
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '🤖 *¡Hola! Bienvenido al asistente virtual de Bravo Estampados.*\n\n¿En qué podemos ayudarte hoy? Haz clic en las opciones abajo o escribe el número correspondiente:\n\n1️⃣ *Consultar estado de mi pedido* 📦\n2️⃣ *Ver catálogo de productos a la venta* 👕\n3️⃣ *Cotizar diseño personalizado* 🎨\n4️⃣ *Ubicación, horario y contacto* 📍\n5️⃣ *Hablar con un ejecutivo / Chat Interno* 💬\n6️⃣ *Preguntas frecuentes (FAQs)* ❓',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isWriting, setIsWriting] = useState(false)

  // Yamaha-Style Interactive Showcase State
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)
  const [heroActiveTab, setHeroActiveTab] = useState('top_features')

  // Simulador de Estampados State
  const [simulatorType, setSimulatorType] = useState(() => getRandomProductType()) // Initial random product
  const [simulatorImage, setSimulatorImage] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [scale, setScale] = useState(60) // 10% to 150%
  const [posX, setPosX] = useState(0) // -100 to 100
  const [posY, setPosY] = useState(0) // -100 to 100
  const capture3DRef = useRef(null)

  // Mobile Check
  const [isMobile, setIsMobile] = useState(false)

  // Scroll Refs
  const homeRef = useRef(null)
  const servicesRef = useRef(null)
  const catalogRef = useRef(null)
  const quoteRef = useRef(null)
  const trackRef = useRef(null)
  const faqsRef = useRef(null)

  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' })
    }
  }
  useEffect(() => {
    const handleCheckMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleCheckMobile()
    window.addEventListener('resize', handleCheckMobile)
    return () => window.removeEventListener('resize', handleCheckMobile)
  }, [])

  // Three.js refs
  const mountRef = useRef(null)
  const activeTabRef = useRef(activeTab)

  useEffect(() => {
    fetchWebConfig()
  }, [])

  const fetchWebConfig = async () => {
    try {
      const res = await getWebConfig({ system: 'bravo' })
      setConfig(res.data)
    } catch (err) {
      console.error('Error al cargar datos de contacto de Bravo:', err)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setOriginalFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSimulatorImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRutChange = (e) => {
    let val = e.target.value.replace(/[^0-9kK]/g, '')
    if (val.length > 9) val = val.slice(0, 9)
    
    if (val.length > 1) {
      const dv = val.slice(-1).toUpperCase()
      const body = val.slice(0, -1)
      val = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
    }
    setFormData(prev => ({ ...prev, client_rut: val }))
  }

  const handleWhatsAppOrder = (product) => {
    const whatsappNum = config?.whatsapp ? config.whatsapp.replace(/\+/g, '').replace(/\s/g, '') : '56967547300'
    const message = encodeURIComponent(`¡Hola! Estoy interesado en el producto "${product.name}" (Precio: $${parseFloat(product.sale_price).toLocaleString('es-CL')}) de su catálogo de Bravo. ¿Tienen disponibilidad?`)
    window.open(`https://wa.me/${whatsappNum}?text=${message}`, '_blank')
  }


  const handleOpenOrderModal = (product) => {
    setOrderProduct(product)
    setOrderForm({
      client_name: '',
      client_phone: '',
      client_email: '',
      quantity: 1,
      notes: ''
    })
    setOrderError('')
    setShowOrderModal(true)
  }

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    if (!orderForm.client_name || !orderForm.client_phone) {
      setOrderError('Por favor ingresa tu nombre y WhatsApp de contacto.')
      return
    }
    setOrderLoading(true)
    setOrderError('')
    try {
      const payload = {
        client_name: orderForm.client_name,
        client_phone: orderForm.client_phone,
        client_email: orderForm.client_email || null,
        device_type: 'Mercancía',
        brand: 'Pedido Catálogo',
        model: `${orderProduct.name} (Cant: ${orderForm.quantity})`,
        reported_issue: `Pedido en Línea del catálogo.\nProducto: ${orderProduct.name}\nCantidad: ${orderForm.quantity} unidades.\nPrecio Unitario: $${parseFloat(orderProduct.sale_price).toLocaleString('es-CL')}\nNotas: ${orderForm.notes || 'Ninguna.'}`,
        accessories: `${orderForm.quantity} unidades`
      }
      const response = await requestOrder(payload)
      setFormSuccess(response.data)
      setShowOrderModal(false)
      setActiveTab('quote') // Redirigir a pestaña donde se muestra el éxito
    } catch (err) {
      setOrderError('Error al enviar el pedido. Por favor intenta nuevamente.')
    } finally {
      setOrderLoading(false)
    }
  }

  // Sync tab state
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Load products when component mounts
  useEffect(() => {
    fetchProducts()
  }, [])

  const getProductImage = (prod) => {
    if (!prod) return '/mockups/polera_front.png'
    const img = prod.image_url || prod.image || prod.photo || prod.file_path
    if (img) {
      if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/mockups/')) {
        return img
      }
      const cleanPath = img.startsWith('/') ? img : `/${img}`
      return `${api.defaults.baseURL || ''}${cleanPath}`
    }
    const cat = (prod.category || prod.name || '').toLowerCase()
    if (cat.includes('poleron') || cat.includes('hoodie')) return '/mockups/poleron_front.png'
    if (cat.includes('tazon') || cat.includes('taza') || cat.includes('mug')) return '/mockups/tazon_front.png'
    if (cat.includes('jockey') || cat.includes('gorro') || cat.includes('cap')) return '/mockups/jockey_front.png'
    if (cat.includes('totebag') || cat.includes('bolso') || cat.includes('bolsa')) return '/mockups/totebag_front.png'
    if (cat.includes('chopero') || cat.includes('cerveza')) return '/mockups/chopero_front.png'
    if (cat.includes('stanley') || cat.includes('vaso')) return '/mockups/stanley_front.png'
    if (cat.includes('termo')) return '/mockups/termo_front.png'
    if (cat.includes('puzle') || cat.includes('puzzle')) return '/mockups/puzle_front.png'
    if (cat.includes('pechera')) return '/mockups/pechera_front.png'
    if (cat.includes('cuadro') || cat.includes('poster')) return '/mockups/poster_front.png'
    return '/mockups/polera_front.png'
  }

  const fetchProducts = async () => {
    setProductsLoading(true)
    setProductsError('')
    try {
      const response = await getPublicProducts()
      const productList = response.data || []
      // Shuffle products randomly every time user enters the page
      const shuffled = [...productList].sort(() => Math.random() - 0.5)
      setProducts(shuffled)
      if (shuffled.length > 0) {
        setSimulatorType(getRandomProductType(shuffled))
      }
    } catch (err) {
      setProductsError('No se pudo cargar el catálogo. Inténtalo más tarde.')
    } finally {
      setProductsLoading(false)
    }
  }

  // Pre-select product and open quote tab
  const handlePreSelectProduct = (product) => {
    setFormData({
      ...formData,
      device_type: product.name.split(' ')[0] || 'Polera',
      brand: 'Diseño de Catálogo',
      model: `${product.name} (Catálogo)`,
      reported_issue: `Deseo cotizar el producto: ${product.name}.`
    })
    setActiveTab('quote')
  }

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  // Submit quote request
  const handleQuoteSubmit = async (e) => {
    e.preventDefault()
    if (!formData.client_name || !formData.client_phone || !formData.device_type || !formData.reported_issue) {
      setFormError('Por favor completa los campos requeridos *')
      return
    }
    setFormLoading(true)
    setFormError('')
    setFormSuccess(null)
    try {
      let designFileUrl = null
      let mockupFileUrl = null

      // 1. Subir diseño original si existe
      if (originalFile) {
        const formDataOriginal = new FormData()
        formDataOriginal.append('file', originalFile)
        try {
          const resOriginal = await uploadPublicDesign(formDataOriginal)
          designFileUrl = resOriginal.data.url
        } catch (err) {
          console.error('Error al subir diseño original:', err)
        }
      }

      // 2. Capturar y subir mockup 3D si existe el simulador
      if (simulatorImage && capture3DRef.current) {
        const dataUrl = capture3DRef.current()
        if (dataUrl) {
          try {
            const blob = dataURLtoBlob(dataUrl)
            const fileMockup = new File([blob], 'mockup_preview.png', { type: 'image/png' })
            const formDataMockup = new FormData()
            formDataMockup.append('file', fileMockup)
            const resMockup = await uploadPublicDesign(formDataMockup)
            mockupFileUrl = resMockup.data.url
          } catch (err) {
            console.error('Error al capturar o subir previsualización del mockup:', err)
          }
        }
      }

      let finalIssue = formData.reported_issue
      if (simulatorImage) {
        finalIssue = `[DISEÑO WEB SIMULADO]\nArtículo Previsualizado: ${simulatorType}\nEscala: ${scale}%\nPosición: X:${posX}px, Y:${posY}px\n\nInstrucciones del cliente:\n${formData.reported_issue}\n\n* Nota: El cliente cargó un bosquejo. Favor solicitar archivo original por WhatsApp.`
      }

      const payload = {
        ...formData,
        client_email: formData.client_email.trim() || null,
        client_rut: formData.client_rut.trim() || null,
        client_city: formData.client_city.trim() || null,
        accessories: formData.accessories.trim() || null,
        reported_issue: finalIssue,
        design_file_url: designFileUrl,
        mockup_file_url: mockupFileUrl
      }

      const response = await requestOrder(payload)
      setFormSuccess(response.data)
      setFormData({
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
      // Reset simulator
      setSimulatorImage(null)
      setOriginalFile(null)
      setScale(60)
      setPosX(0)
      setPosY(0)
    } catch (err) {
      setFormError('Error al enviar la solicitud. Por favor intenta de nuevo.')
    } finally {
      setFormLoading(false)
    }
  }

  // Track search
  const handleTrackSearch = async (e) => {
    e.preventDefault()
    if (!orderNumber.trim() || !rutOrPhone.trim()) {
      setTrackError('Por favor ingresa ambos campos')
      return
    }
    setTrackLoading(true)
    setTrackError('')
    setTrackResult(null)
    try {
      const response = await trackRepair(orderNumber.trim().toUpperCase(), rutOrPhone.trim())
      setTrackResult(response.data)
      fetchOrderComments(orderNumber.trim().toUpperCase(), rutOrPhone.trim())
    } catch (err) {
      setTrackError('No se encontró el pedido con los datos ingresados.')
    } finally {
      setTrackLoading(false)
    }
  }

  const handleAcceptQuote = async () => {
    if (!trackResult) return
    if (!window.confirm("¿Estás seguro de que deseas aceptar este presupuesto y comenzar la producción?")) return
    
    setTrackLoading(true)
    try {
      await acceptQuote(trackResult.order_number, rutOrPhone.trim())
      setTrackError('')
      const response = await trackRepair(trackResult.order_number, rutOrPhone.trim())
      setTrackResult(response.data)
      fetchOrderComments(trackResult.order_number, rutOrPhone.trim())
    } catch (err) {
      setTrackError('Error al aceptar el presupuesto.')
    } finally {
      setTrackLoading(false)
    }
  }

  const handleRejectQuote = async () => {
    if (!trackResult) return
    const reason = window.prompt("Por favor indícanos el motivo de tu rechazo (opcional):", "")
    if (reason === null) return 
    
    setTrackLoading(true)
    try {
      await rejectQuote(trackResult.order_number, rutOrPhone.trim(), reason)
      setTrackError('')
      const response = await trackRepair(trackResult.order_number, rutOrPhone.trim())
      setTrackResult(response.data)
      fetchOrderComments(trackResult.order_number, rutOrPhone.trim())
    } catch (err) {
      setTrackError('Error al rechazar el presupuesto.')
    } finally {
      setTrackLoading(false)
    }
  }

  const fetchOrderComments = async (ordNum, userCreds) => {
    const oNum = ordNum || orderNumber.trim().toUpperCase()
    const creds = userCreds || rutOrPhone.trim()
    if (!oNum || !creds) return
    setCommentsLoading(true)
    try {
      const res = await getTrackComments(oNum, creds)
      setOrderComments(res.data)
    } catch (err) {
      console.error('Error al cargar comentarios:', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleSendOrderComment = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim() || !trackResult) return
    try {
      await createTrackComment({
        order_number: trackResult.order_number,
        rut_or_phone: rutOrPhone.trim(),
        message: newCommentText.trim()
      })
      setNewCommentText('')
      await fetchOrderComments(trackResult.order_number, rutOrPhone.trim())
    } catch (err) {
      console.error('Error al enviar comentario:', err)
    }
  }

  // Polling for comments
  useEffect(() => {
    if (!trackResult) return
    const interval = setInterval(() => {
      fetchOrderComments(trackResult.order_number, rutOrPhone.trim())
    }, 15000)
    return () => clearInterval(interval)
  }, [trackResult])


  // Initialize Three.js - 3D Floating cards carousel (Light theme styled)
  useEffect(() => {
    if (isMobile) return
    if (!mountRef.current) return

    const container = mountRef.current
    let width = container.clientWidth || window.innerWidth
    let height = container.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 1000)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Warm ambient light to suit the light theme
    const ambientLight = new THREE.AmbientLight(0xfffbf5, 1.1)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xd97706, 1.4)
    dirLight.position.set(0, 10, 10)
    scene.add(dirLight)

    // Particle System for floating ambient glow sparkles
    const particleCount = 180
    const particlesGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 22
      positions[i + 1] = (Math.random() - 0.5) * 16 - 0.5
      positions[i + 2] = (Math.random() - 0.5) * 22
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particlesMat = new THREE.PointsMaterial({
      color: 0xb4783c,
      size: 0.08,
      transparent: true,
      opacity: 0.45
    })
    const particleSystem = new THREE.Points(particlesGeo, particlesMat)
    scene.add(particleSystem)

    const group = new THREE.Group()
    group.position.y = -0.6 // Slightly lower group to frame text better
    scene.add(group)

    const radius = 6.8
    const itemsList = []

    const createCardTexture = (label, emoji, imgPath) => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 384
      const ctx = canvas.getContext('2d')
      const textureRefHolder = { texture: null }

      const draw = (imgElement) => {
        // Clear rect
        ctx.clearRect(0, 0, 256, 384)

        // Rounded premium white card background
        ctx.fillStyle = '#fffdf9'
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(4, 4, 248, 376, 28)
        } else {
          ctx.rect(4, 4, 248, 376)
        }
        ctx.fill()

        // Primary Coppery Border
        ctx.strokeStyle = '#b4783c'
        ctx.lineWidth = 7
        ctx.stroke()

        // Secondary fine inner border for luxury card feel
        ctx.strokeStyle = 'rgba(180, 120, 60, 0.18)'
        ctx.lineWidth = 1
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(14, 14, 228, 356, 20)
        } else {
          ctx.rect(14, 14, 228, 356)
        }
        ctx.stroke()

        // Light grid print texture
        ctx.strokeStyle = 'rgba(180, 120, 60, 0.06)'
        ctx.lineWidth = 1
        for (let i = 24; i < 256; i += 24) {
          ctx.beginPath()
          ctx.moveTo(i, 14)
          ctx.lineTo(i, 370)
          ctx.stroke()
        }

        // Draw Mockup Product Image if loaded
        if (imgElement) {
          const maxW = 160
          const maxH = 160
          const imgRatio = imgElement.width / imgElement.height
          let w = maxW
          let h = maxW / imgRatio
          if (h > maxH) {
            h = maxH
            w = maxH * imgRatio
          }
          const x = (256 - w) / 2
          const y = 75 + (maxH - h) / 2 // Centrado vertical en el area de producto

          ctx.save()
          // Sombra suave para el producto
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
          ctx.shadowBlur = 12
          ctx.shadowOffsetY = 6
          ctx.drawImage(imgElement, x, y, w, h)
          ctx.restore()
        }

        // Draw Emoji
        if (imgElement) {
          ctx.font = '32px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(emoji, 128, 55)
        } else {
          // Si no tiene imagen de producto (como Inicio o Catalogo), dibujar emoji grande en el centro
          ctx.font = '78px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(emoji, 128, 136)
        }

        // Draw Label
        ctx.fillStyle = '#2c1810'
        ctx.font = 'bold 24px "Outfit", "Sora", sans-serif'
        ctx.fillText(label, 128, 275)

        // Subheading
        ctx.fillStyle = '#b4783c'
        ctx.font = 'bold 11px "Outfit", "Sora", sans-serif'
        ctx.fillText('• CREATIVE CORE •', 128, 315)

        if (textureRefHolder.texture) {
          textureRefHolder.texture.needsUpdate = true
        }
      }

      // Primera pasada sincrona
      draw(null)

      const texture = new THREE.CanvasTexture(canvas)
      textureRefHolder.texture = texture

      // Cargar la imagen asincronamente
      if (imgPath) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          draw(img)
        }
        img.onerror = () => {
          console.error('[3D Carousel] Error loading card product image:', imgPath)
        }
        img.src = imgPath
      }

      return texture
    }

    CAROUSEL_ITEMS.forEach((opt, i) => {
      const angle = (i / CAROUSEL_ITEMS.length) * Math.PI * 2
      const cardGroup = new THREE.Group()

      // Card Mesh
      const geometry = new THREE.PlaneGeometry(2.8, 4.2)
      const texture = createCardTexture(opt.label, opt.emoji, opt.img)
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.96,
        shininess: 95,
        specular: 0xd97706,
        side: THREE.DoubleSide
      })

      const card = new THREE.Mesh(geometry, material)
      card.rotation.y = Math.PI // Flip card so it faces outwards to the camera
      cardGroup.add(card)

      // Edges outline
      const edges = new THREE.EdgesGeometry(geometry)
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb4783c, linewidth: 2 })
      const line = new THREE.LineSegments(edges, lineMaterial)
      cardGroup.add(line)

      // Positioning in cylindrical ring
      cardGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      cardGroup.lookAt(0, -0.6, 0) // Point at center

      group.add(cardGroup)
      itemsList.push({ group: cardGroup, angle: angle, index: i, data: opt })
    })

    camera.position.set(0, 1.5, 14.5)
    camera.lookAt(0, -0.6, 0)

    // Drag handlers
    let targetRotation = 0
    let currentRotation = 0
    let isDragging = false
    let startMouseX = 0
    let previousMouseX = 0

    const handleMouseDown = (e) => {
      isDragging = true
      startMouseX = e.clientX
      previousMouseX = e.clientX
    }

    const handleMouseMoveGL = (e) => {
      if (!isDragging) return
      const delta = e.clientX - previousMouseX
      targetRotation += delta * 0.006
      previousMouseX = e.clientX
    }

    const handleMouseUpGL = (e) => {
      isDragging = false
      const clickDist = Math.abs(e.clientX - startMouseX)
      if (clickDist < 5) {
        triggerRaycast(e.clientX, e.clientY)
      }
    }

    // Touch Support
    const handleTouchStart = (e) => {
      isDragging = true
      startMouseX = e.touches[0].clientX
      previousMouseX = e.touches[0].clientX
    }

    const handleTouchMove = (e) => {
      if (!isDragging) return
      const delta = e.touches[0].clientX - previousMouseX
      targetRotation += delta * 0.006
      previousMouseX = e.touches[0].clientX
    }

    const handleTouchEnd = (e) => {
      isDragging = false
      const clickDist = Math.abs(e.changedTouches[0].clientX - startMouseX)
      if (clickDist < 5) {
        triggerRaycast(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
      }
    }

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const triggerRaycast = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(group.children, true)

      if (intersects.length > 0) {
        let obj = intersects[0].object
        while (obj && obj !== group) {
          const found = itemsList.find(item => item.group === obj)
          if (found) {
            onCardClick(found.data)
            break
          }
          obj = obj.parent
        }
      }
    }

    const onCardClick = (itemData) => {
      if (itemData.label === 'Inicio') {
        setActiveTab('home')
      } else if (itemData.label === 'Catálogo') {
        setActiveTab('catalog')
      } else if (itemData.label === 'Cotizar') {
        setActiveTab('quote')
      } else if (itemData.label === 'Rastrear') {
        setActiveTab('track')
      } else if (itemData.label === 'Poleras') {
        setFormData(prev => ({ ...prev, device_type: 'Polera' }))
        setSimulatorType('Polera')
        setActiveTab('quote')
      } else if (itemData.label === 'Polerones') {
        setFormData(prev => ({ ...prev, device_type: 'Polerón' }))
        setSimulatorType('Polerón')
        setActiveTab('quote')
      } else if (itemData.label === 'Tazones') {
        setFormData(prev => ({ ...prev, device_type: 'Tazón' }))
        setSimulatorType('Tazón')
        setActiveTab('quote')
      } else if (itemData.label === 'Jockeys') {
        setFormData(prev => ({ ...prev, device_type: 'Jockey' }))
        setSimulatorType('Jockey')
        setActiveTab('quote')
      } else if (itemData.label === 'Totebags') {
        setFormData(prev => ({ ...prev, device_type: 'Totebag' }))
        setSimulatorType('Totebag')
        setActiveTab('quote')
      }
    }

    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMoveGL)
    window.addEventListener('mouseup', handleMouseUpGL)

    container.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    let animationFrameId

    function animate() {
      animationFrameId = requestAnimationFrame(animate)

      // Smooth rotate
      currentRotation += (targetRotation - currentRotation) * 0.1
      group.rotation.y = currentRotation

      // Slowly rotate particle field for atmospheric effect
      particleSystem.rotation.y += 0.0006
      particleSystem.rotation.x += 0.0002

      // Camera transitions based on current active tab - ACCOUNTING FOR SIDEBAR
      const tab = activeTabRef.current
      const isDesktop = window.innerWidth >= 1024
      
      // On desktop, the sidebar on the left occupies 256px.
      // Shifting camera to -1.2 (left) pushes the carousel to the right, centering it in the visible area.
      // On other tabs, the right panel occupies 600px, so we shift camera to 1.0 to push the carousel to the left.
      const targetCamX = tab === 'home' 
        ? (isDesktop ? -1.2 : 0) 
        : (isDesktop ? 1.0 : -2.5)

      const targetCamY = tab === 'home' ? 1.4 : 1.0
      const targetCamZ = tab === 'home' ? 14.5 : 12.0

      camera.position.x += (targetCamX - camera.position.x) * 0.08
      camera.position.y += (targetCamY - camera.position.y) * 0.08
      camera.position.z += (targetCamZ - camera.position.z) * 0.08

      if (!isDragging) {
        targetRotation += 0.0015
      }

      // floating cards
      itemsList.forEach((item, i) => {
        item.group.position.y = Math.sin(Date.now() * 0.001 + i) * 0.18
      })

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMoveGL)
      window.removeEventListener('mouseup', handleMouseUpGL)
      container.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      scene.clear()
      renderer.dispose()
    }
  }, [isMobile])

  // Handle Chatbot Message Submission & Quick Actions
  const handleSendChatMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault()
    const userMsgText = (textOverride || inputMessage).trim()
    if (!userMsgText) return

    if (!textOverride) setInputMessage('')

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setChatMessages(prev => [...prev, userMsg])
    setIsWriting(true)

    if (userMsgText === '5' || userMsgText.toLowerCase().includes('ejecutivo') || userMsgText.toLowerCase().includes('chat interno')) {
      setChatMode('live')
    }

    const isLiveMessage = chatMode === 'live' || userMsgText === '5' || userMsgText.toLowerCase().includes('ejecutivo') || userMsgText.toLowerCase().includes('chat interno')

    try {
      const response = await simulateWhatsAppMessage({ 
        message: userMsgText, 
        phone: '56967547300', 
        system: 'bravo',
        chat_mode: isLiveMessage ? 'live' : 'bot',
        client_name: 'Cliente Web Bravo'
      })
      
      setTimeout(() => {
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.data.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, botMsg])
        setIsWriting(false)
      }, 500)
    } catch (err) {
      setIsWriting(false)
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: '❌ *Error de comunicación:* No se pudo enviar la consulta.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages(prev => [...prev, errorMsg])
    }
  }

  const getStepStatus = (stepKey, currentStatus, history) => {
    const statusOrder = ['recibido', 'diagnostico', 'en_reparacion', 'listo', 'entregado']
    const currentIndex = statusOrder.indexOf(currentStatus)
    const stepIndex = statusOrder.indexOf(stepKey)
    const historyStep = history.find(h => h.new_status === stepKey)

    if (historyStep) {
      return { state: 'completed', date: historyStep.changed_at }
    }
    if (currentStatus === stepKey) {
      return { state: 'current', date: null }
    }
    if (stepIndex !== -1 && currentIndex !== -1 && stepIndex < currentIndex) {
      return { state: 'completed', date: null }
    }
    return { state: 'upcoming', date: null }
  }

  
  // Update active tab based on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id)
          }
        })
      },
      { threshold: 0.3 }
    )

    const sections = [homeRef, servicesRef, catalogRef, quoteRef, trackRef, faqsRef]
    sections.forEach((ref) => {
      if (ref.current) observer.observe(ref.current)
    })

    return () => {
      sections.forEach((ref) => {
        if (ref && ref.current) observer.unobserve(ref.current)
      })
    }
  }, [])

  // Default static hero slides if catalog products are not loaded yet
  const defaultHeroSlides = [
    {
      image: '/mockups/poleron_front.png',
      badge: 'EDICIÓN LIMITADA 2026',
      title: 'POLERONES HOODIE OVERSIZE',
      desc: 'Algodón Heavyweight 100% · Tinta DTF elástica no grietada · Corte urbano unisex con capuchón doble.',
      price: '$18.990 CLP',
      watermark: 'BRAVO 2026',
      product: null
    },
    {
      image: '/mockups/tazon_front.png',
      badge: 'SUBLIMACIÓN HD',
      title: 'TAZÓN CERÁMICO & MUG TÉRMICO',
      desc: 'Cerámica brillante 11oz · Sublimación fotográfica full color apta para lavavajillas y microondas.',
      price: '$4.990 CLP',
      watermark: 'DTF 1440',
      product: null
    },
    {
      image: '/mockups/stanley_front.png',
      badge: 'TRENDING DROP',
      title: 'STANLEY TUMBLER 40OZ & CHOPERO',
      desc: 'Vaso térmico acero 304 doble pared · Mantención 12h frío · Asa ergonómica y bombilla incluida.',
      price: '$14.990 CLP',
      watermark: 'STYLING',
      product: null
    },
    {
      image: '/mockups/chopero_front.png',
      badge: 'PRO RELEASES',
      title: 'LIENZO DTF TEXTIL 32CM & UV 28CM',
      desc: 'Transferencia directa PET en metros continuos · Blanco denso de alta resolución para marcas y emprendedores.',
      price: '$6.500 CLP / metro',
      watermark: 'DTF PRO',
      product: null
    }
  ]

  // Dynamic slides built directly from inventory products for sale returned from backend
  const heroSlides = products.length > 0
    ? products.map((prod) => ({
        image: getProductImage(prod),
        badge: (prod.category || 'PRODUCTO DE INVENTARIO').toUpperCase(),
        title: prod.name ? prod.name.toUpperCase() : 'PRODUCTO DISPONIBLE',
        desc: prod.description || 'Prenda u objeto disponible en inventario listo para venta directa y personalizado.',
        price: prod.sale_price ? `$${parseFloat(prod.sale_price).toLocaleString('es-CL')} CLP` : 'Consultar',
        watermark: prod.name ? prod.name.split(' ')[0].toUpperCase() : 'BRAVO',
        product: prod
      }))
    : defaultHeroSlides

  const currentHeroSlideIndex = heroSlideIndex % heroSlides.length
  const currentHeroSlide = heroSlides[currentHeroSlideIndex] || heroSlides[0]

  return (
    <div className="min-h-screen bg-bravo-bg font-sora text-bravo-text overflow-x-hidden selection:bg-bravo-accent selection:text-white">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bravo-sidebar/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection(homeRef)}>
              <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-lg group-hover:shadow-amber-500/50 transition-all">
                <div className="w-full h-full bg-[#120d09] rounded-full overflow-hidden border border-black/50">
                  <img src="/logo-bravo.jpg" alt="Bravo Logo" className="w-full h-full object-cover mix-blend-screen scale-110" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black tracking-widest text-lg leading-none uppercase">BRAVO</span>
                <span className="text-amber-500/80 text-[9px] font-bold tracking-[0.2em] uppercase font-mono mt-0.5">Personalizaciones</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              {[
                { id: 'home', label: 'Inicio', ref: homeRef },
                { id: 'services', label: 'Servicios', ref: servicesRef },
                { id: 'catalog', label: 'Catálogo', ref: catalogRef },
                { id: 'quote', label: 'Cotizar', ref: quoteRef },
                { id: 'track', label: 'Rastrear', ref: trackRef },
                { id: 'faqs', label: 'Ayuda', ref: faqsRef }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.ref)}
                  className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeTab === item.id ? 'text-bravo-accent' : 'text-bravo-text-muted hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              
              <button 
                onClick={() => { localStorage.removeItem('dev_override_system'); window.location.href = '/'; }}
                className="ml-4 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-[10px] uppercase font-bold tracking-widest transition-all flex items-center gap-1.5"
              >
                <Globe size={12} />
                Portal
              </button>
            </div>
            
            <div className="md:hidden">
              <button 
                onClick={() => { localStorage.removeItem('dev_override_system'); window.location.href = '/'; }}
                className="p-2 rounded-lg bg-white/5 text-white/50"
              >
                <Globe size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV OVERFLOW (if needed, but keeping it simple for now) */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-bravo-sidebar/95 border-b border-white/5 overflow-x-auto bravo-scrollbar">
        <div className="flex p-2 gap-2 min-w-max">
          {[
            { id: 'home', label: 'Inicio', ref: homeRef },
            { id: 'services', label: 'Servicios', ref: servicesRef },
            { id: 'catalog', label: 'Catálogo', ref: catalogRef },
            { id: 'quote', label: 'Cotizar', ref: quoteRef },
            { id: 'track', label: 'Rastrear', ref: trackRef },
            { id: 'faqs', label: 'Ayuda', ref: faqsRef }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.ref)}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap ${
                activeTab === item.id ? 'bg-bravo-accent/20 text-bravo-accent' : 'text-bravo-text-muted hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {/* LEFT PINNED SOCIAL SIDEBAR (Yamaha Style) */}
      <div className="hidden xl:flex fixed left-4 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-6 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl">
        <a href="https://www.instagram.com/personalizacionesbravo/" target="_blank" rel="noreferrer" title="Instagram @personalizacionesbravo" className="text-white/60 hover:text-amber-400 transition-colors p-1.5 hover:scale-110">
          <span className="material-symbols-outlined text-lg">photo_camera</span>
        </a>
        <a href="https://wa.me/56967547300" target="_blank" rel="noreferrer" title="WhatsApp +56 9 6754 7300" className="text-white/60 hover:text-emerald-400 transition-colors p-1.5 hover:scale-110">
          <MessageCircle size={18} />
        </a>
        <a href="mailto:personalizacionesbravo@gmail.com" title="Correo personalizacionesbravo@gmail.com" className="text-white/60 hover:text-amber-400 transition-colors p-1.5 hover:scale-110">
          <Mail size={18} />
        </a>
        <div className="w-px h-12 bg-white/20 my-1" />
        <span className="text-[9px] font-mono font-bold tracking-[0.3em] text-amber-400/80 uppercase [writing-mode:vertical-lr] rotate-180">
          BRAVO STYLING STUDIO
        </span>
      </div>

      {/* TOP ANNOUNCEMENT TICKER */}
      <div className="w-full bg-[#060403] border-b border-amber-500/20 py-2.5 overflow-hidden whitespace-nowrap text-[10px] font-mono tracking-[0.25em] text-amber-400 font-bold uppercase relative z-30 shadow-lg">
        <div className="inline-flex gap-8 animate-marquee">
          <span>⚡ DONDE LA IDEA SE CONVIERTE EN ROPA, VIDRIO Y METAL · BRAVO CUSTOMS STUDIO · IMPRESIÓN DTF TEXTIL & UV 1440 DPI ⚡</span>
          <span>⚡ DONDE LA IDEA SE CONVIERTE EN ROPA, VIDRIO Y METAL · BRAVO CUSTOMS STUDIO · IMPRESIÓN DTF TEXTIL & UV 1440 DPI ⚡</span>
          <span>⚡ DONDE LA IDEA SE CONVIERTE EN ROPA, VIDRIO Y METAL · BRAVO CUSTOMS STUDIO · IMPRESIÓN DTF TEXTIL & UV 1440 DPI ⚡</span>
        </div>
      </div>

      {/* HERO SHOWCASE SECTION (Carrusel dinámico del catálogo de inventario) */}
      <section id="home" ref={homeRef} className="relative min-h-[90vh] flex flex-col justify-between pt-12 pb-12 overflow-hidden bg-gradient-to-b from-[#040e0b] via-[#08070d] to-[#040307]">
        {/* Glow & Atmosphere */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <div className="absolute top-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-emerald-600/20 blur-[140px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-600/20 blur-[130px]" />
        </div>

        {/* GIANT SEMI-TRANSPARENT BACKGROUND WATERMARK */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-10">
          <span className="text-[22vw] font-black italic tracking-tighter text-white uppercase font-mono leading-none truncate max-w-full">
            {currentHeroSlide.watermark}
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex-grow flex flex-col justify-center">
          {/* Main Hero Slider Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Product Visualizer Pedestal */}
            <div className="lg:col-span-6 relative flex items-center justify-center py-8">
              {/* Previous / Next Arrow Controls */}
              <button 
                onClick={() => setHeroSlideIndex(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
                className="absolute left-0 z-20 p-3 rounded-full bg-black/60 border border-white/10 hover:border-amber-400 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md active:scale-90"
              >
                <ChevronDown size={20} className="rotate-90" />
              </button>

              <motion.div 
                key={currentHeroSlideIndex}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative w-full max-w-md h-[360px] sm:h-[420px] flex items-center justify-center p-4"
              >
                {/* Radial Glow Floor */}
                <div className="absolute inset-0 bg-radial from-amber-500/20 via-emerald-500/10 to-transparent blur-2xl" />
                <img 
                  src={currentHeroSlide.image} 
                  alt={currentHeroSlide.title} 
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] relative z-10 hover:scale-105 transition-transform duration-500 rounded-xl"
                  onError={(e) => { e.target.src = '/mockups/polera_front.png' }}
                />
                {/* Sombra de suelo */}
                <div className="absolute bottom-4 w-3/4 h-4 bg-black/80 rounded-full blur-lg pointer-events-none" />
              </motion.div>

              <button 
                onClick={() => setHeroSlideIndex(prev => (prev === heroSlides.length - 1 ? 0 : prev + 1))}
                className="absolute right-0 z-20 p-3 rounded-full bg-black/60 border border-white/10 hover:border-amber-400 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md active:scale-90"
              >
                <ChevronUp size={20} className="rotate-90" />
              </button>
            </div>

            {/* Right Information & Call to Action */}
            <div className="lg:col-span-6 space-y-6">
              <motion.div 
                key={`info-${currentHeroSlideIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
                  <Sparkles size={12} className="text-amber-400 animate-spin" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-amber-300">
                    {currentHeroSlide.badge}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter text-white uppercase leading-[0.95]">
                  {currentHeroSlide.title}
                </h1>

                <p className="text-xs sm:text-sm text-bravo-text-muted leading-relaxed font-mono uppercase tracking-wider line-clamp-3">
                  {currentHeroSlide.desc}
                </p>

                <div className="pt-2 flex items-baseline gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-bravo-text-muted uppercase block">Valor Venta</span>
                    <span className="text-3xl font-black text-amber-400 font-mono">
                      {currentHeroSlide.price}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4 flex-wrap">
                  <button 
                    onClick={() => {
                      if (currentHeroSlide.product) {
                        handleOpenOrderModal(currentHeroSlide.product)
                      } else {
                        scrollToSection(quoteRef)
                      }
                    }} 
                    className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <ShoppingBag size={16} /> PEDIR AHORA
                  </button>
                  <button 
                    onClick={() => {
                      if (currentHeroSlide.product) {
                        handlePreSelectProduct(currentHeroSlide.product)
                      }
                      scrollToSection(quoteRef)
                    }} 
                    className="px-8 py-4 bg-white/5 border border-amber-500/30 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-2 backdrop-blur-sm"
                  >
                    <Sparkles size={16} /> PERSONALIZAR EN SIMULADOR
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* BOTTOM PILLS BAR & SLIDE INDICATORS */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { key: 'top_features', label: '+ TOP FEATURES' },
                { key: 'gallery', label: '+ GALERÍA' },
                { key: 'specs', label: '+ ESPECIFICACIONES' },
                { key: 'accessories', label: '+ ACCESORIOS' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setHeroActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    heroActiveTab === tab.key
                      ? 'bg-amber-500/20 border border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Carousel Pagination Dots */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
              {heroSlides.slice(0, 10).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentHeroSlideIndex === idx ? 'w-8 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* YAMAHA-STYLE "ABOUT US / SOBRE BRAVO CUSTOMS" SECTION */}
      <section className="py-24 bg-[#08070d] relative border-t border-white/10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Story, Slogans & Guarantees */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-[10px] text-amber-400 tracking-[0.3em] font-mono font-bold uppercase block">
                ABOUT US / SOBRE BRAVO CUSTOMS
              </span>

              <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
                CREATIVIDAD Y PRECISIÓN EN CADA ESTAMPADO
              </h2>

              <p className="text-sm sm:text-base text-bravo-text-muted leading-relaxed font-medium">
                <strong className="text-white">Bravo Customs</strong> es la marca líder en personalización textil, indumentaria urbana y merchandising corporativo de alta gama. Fusionamos tecnología de impresión de vanguardia (<strong className="text-amber-400">DTF Textil 1440 DPI, DTF UV 3D y Sublimación HD</strong>) con un servicio de confección riguroso.
              </p>

              {/* Slogan Box */}
              <div className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border-l-4 border-amber-400 rounded-r-2xl">
                <p className="text-xs sm:text-sm font-mono font-bold text-amber-300 uppercase tracking-wider">
                  "Donde la idea se convierte en ropa, vidrio y metal. Tu marca merece destacar sin mínimos ni restricciones creativas."
                </p>
              </div>

              {/* Guarantees List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {[
                  'Tinta DTF elástica de máxima fijación',
                  'Sublimación fotográfica 100% lavado durable',
                  'Control de calidad unitario garantizado',
                  'Despacho exprés a todo Chile con número de envío'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-white/90">
                    <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Studio Card & Contact Specs (Yamaha Style) */}
            <div className="lg:col-span-5">
              <div className="bg-stone-900/80 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block mb-4">
                  ESTUDIO & ATENCIÓN DIRECTA
                </span>

                <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-6">
                  BRAVO CREATIVE STUDIO
                </h3>

                <div className="space-y-4 text-xs text-bravo-text-muted border-t border-b border-white/10 py-6 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-mono uppercase text-white/70">Atención WhatsApp:</span>
                    <a href="https://wa.me/56967547300" target="_blank" rel="noreferrer" className="font-mono font-bold text-amber-400 hover:underline">+56 9 6754 7300</a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono uppercase text-white/70">Horario de Estudio:</span>
                    <span className="font-mono text-white">Lun - Vie: 09:00 - 19:00</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono uppercase text-white/70 shrink-0">Ubicación Central:</span>
                    <span className="font-mono text-white text-right">Ramón Freire 45, Galería Freire Local 101, Quillota</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono uppercase text-white/70">Cobertura:</span>
                    <span className="font-mono text-emerald-400 font-bold">Envíos a Todo Chile 🇨🇱</span>
                  </div>
                </div>

                <button 
                  onClick={() => simulateWhatsAppMessage("Hola Bravo! Quisiera consultar por servicios de estampado y cotizaciones.")}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageSquare size={16} /> CONTACTAR VÍA WHATSAPP
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* YAMAHA-STYLE FEATURE DETAIL CAROUSEL ("TAP TO VIEW MORE") */}
      <section className="py-20 bg-[#050409] border-t border-b border-white/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-[10px] text-amber-400 tracking-[0.3em] font-mono font-bold uppercase block mb-2">TECNOLOGÍA Y PROCESO</span>
              <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">ESPECIFICACIONES DE IMPACTO</h2>
            </div>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1">
              HAZ CLIC EN CADA TARJETA PARA COTIZAR <ArrowRight size={12} />
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Estampado DTF 1440 DPI',
                desc: 'Transferencia directa en film PET con tinta de alta elasticidad. Colores nítidos y lavable sin perder textura.',
                img: '/mockups/polera_front.png',
                type: 'Polera',
                badge: 'TEXTIL HD'
              },
              {
                title: 'DTF UV Relieve 3D',
                desc: 'Adherencia extrema sobre vidrio, metal, madera y plástico con textura táctil palpable al tacto.',
                img: '/mockups/chopero_front.png',
                type: 'Chopero',
                badge: 'RÍGIDOS 3D'
              },
              {
                title: 'Sublimación Fotográfica',
                desc: 'Brillo insuperable sobre tazones cerámicos, mugs y rompecabezas. Acabado brillante imborrable.',
                img: '/mockups/tazon_front.png',
                type: 'Tazón',
                badge: 'FULL COLOR'
              },
              {
                title: 'Confección & Costura',
                desc: 'Telas seleccionadas en algodón hilado fino y gabardinas pesadas con costuras reforzadas para alta durabilidad.',
                img: '/mockups/pechera_front.png',
                type: 'Pechera',
                badge: 'PREMIUM FABRIC'
              }
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => { setSimulatorType(card.type); scrollToSection(quoteRef); }}
                className="group relative rounded-3xl overflow-hidden bg-stone-900/60 border border-white/10 hover:border-amber-400/60 p-6 flex flex-col justify-between cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]"
              >
                <div className="relative h-44 flex items-center justify-center mb-4">
                  <img src={card.img} alt={card.title} className="max-h-full max-w-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-500" />
                </div>

                <div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-mono font-bold uppercase rounded-md mb-2 inline-block">
                    {card.badge}
                  </span>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">{card.title}</h3>
                  <p className="text-xs text-bravo-text-muted leading-relaxed line-clamp-3 mb-4">{card.desc}</p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  <span>PROBAR SIMULADOR</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES & PRODUCT SHOWCASE */}
      <section id="services" ref={servicesRef} className="py-24 bg-[#06050a] relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] text-amber-400 tracking-widest font-mono font-bold uppercase block mb-2">Colección Destacada</span>
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Drops Exclusivos</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { id: 'Polera', title: 'Poleras Premium', desc: 'Algodón 100% hilado fino. Estampado suave en DTF o vinilo textil.', icon: '👕', img: '/mockups/polera_front.png', tag: 'Top Ventas', colors: ['#1c1c1c', '#ffffff', '#6e7072', '#162238', '#9e1b1b'] },
              { id: 'Polerón', title: 'Polerones Hoodie', desc: 'Franela de algodón con capuchón. Ideal para vestuario corporativo.', icon: '🧥', img: '/mockups/poleron_front.png', tag: 'Invierno Premium', colors: ['#181818', '#f8f8f8', '#7c7e80', '#1a273e'] },
              { id: 'Tazón', title: 'Tazones Cerámicos', desc: 'Sublimación fotográfica full color 11oz. Apto para microondas.', icon: '☕', img: '/mockups/tazon_front.png', tag: 'Sublimación HD', colors: ['#ffffff', '#1f1f1f'] },
              { id: 'Jockey', title: 'Jockeys & Gorras', desc: 'Gorras personalizadas con estampado en frontal estructurado.', icon: '🧢', img: '/mockups/jockey_front.png', tag: 'Accesorios', colors: ['#1c1c1c', '#17233b', '#b01e1e'] },
              { id: 'Totebag', title: 'Totebags de Tela', desc: 'Bolsas ecológicas de tela crea resistente. Excelente para packaging.', icon: '👜', img: '/mockups/totebag_front.png', tag: 'Eco Friendly', colors: ['#e3d7c3', '#1c1c1c'] },
              { id: 'Chopero', title: 'Choperos de Vidrio', desc: 'Choperos de vidrio esmerilado para cerveza con diseño grabado/sublimado.', icon: '🍺', img: '/mockups/chopero_front.png', tag: 'Vidrio Esmerilado', colors: ['#e8eaf0'] },
              { id: 'Mug', title: 'Mugs Térmicos', desc: 'Mugs metálicos y de cerámica para bebidas calientes.', icon: '🍵', img: '/mockups/mug_front.png', tag: 'Térmico', colors: ['#ffffff', '#1c1c1c'] },
              { id: 'Termo', title: 'Termos Deportivos', desc: 'Termos de aluminio y acero inoxidable personalizados.', icon: '🌡️', img: '/mockups/termo_front.png', tag: 'Acero Inox', colors: ['#d0d4d9', '#1c1c1c'] },
              { id: 'Puzle', title: 'Puzles Sublimados', desc: 'Rompecabezas armables con acabado brillante para regalo o recuerdo.', icon: '🧩', img: '/mockups/puzle_front.png', tag: 'Regalo Único', colors: ['#ffffff'] },
              { id: 'Stanley', title: 'Tazón Tipo Stanley', desc: 'Vaso térmico sublimable tipo Stanley 40oz con asa y bombilla.', icon: '🥤', img: '/mockups/stanley_front.png', tag: 'Trending', colors: ['#ffffff', '#18181b', '#fb7185', '#38bdf8'] },
              { id: 'Pechera', title: 'Pechera Parrillera', desc: 'Delantal parrillero de gabardina con correas de cuero y bolsillos.', icon: '🍖', img: '/mockups/pechera_front.png', tag: 'Bbq Pro', colors: ['#18181b', '#78350f'] },
              { id: 'Cuadro', title: 'Cuadro Canvas', desc: 'Póster montado en bastidor de madera para arte o regalos.', icon: '🖼️', img: '/mockups/poster_front.png', tag: 'Arte Wall', colors: ['#18181b', '#ffffff', '#a16207'] }
            ].map((service, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: (idx % 3) * 0.1, duration: 0.5 }}
                onClick={() => { setSimulatorType(service.id); scrollToSection(quoteRef); }}
                className="group relative glass-card rounded-3xl p-6 cursor-pointer overflow-hidden border border-bravo-border/40 hover:border-amber-500/60 transition-all shine-card tilt-hover flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase tracking-widest rounded-lg">
                      {service.tag}
                    </span>
                    <div className="flex items-center gap-1">
                      {service.colors.map((cHex, cIdx) => (
                        <span key={cIdx} className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: cHex }} />
                      ))}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    <span>{service.icon}</span> {service.title}
                  </h3>
                  <p className="text-xs text-bravo-text-muted leading-relaxed line-clamp-2">{service.desc}</p>
                </div>

                <div className="relative w-full h-48 my-4 flex items-center justify-center bg-radial from-amber-500/10 via-black/20 to-transparent rounded-2xl p-2 border border-white/5 group-hover:border-amber-500/20 transition-all">
                  <img 
                    src={service.img} 
                    alt={service.title} 
                    className="max-h-full max-w-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] group-hover:scale-108 transition-transform duration-500" 
                  />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-3 bg-black/60 rounded-full blur-md pointer-events-none" />
                </div>

                <div className="relative z-10 pt-2 flex items-center justify-between border-t border-white/5">
                  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Personalizable
                  </span>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                    Diseñar <ArrowRight size={12} />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DTF PROMO SECTION */}
      <section className="py-20 bg-[#0c0a09] relative border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-amber-600/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[35vw] h-[35vw] rounded-full bg-orange-700/15 blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-14">
            <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block mb-2">Impresión Directa</span>
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">DTF Textil & UV</h2>
            <p className="text-bravo-text-muted text-sm mt-3 max-w-xl mx-auto">Tecnología de transferencia directa de alta resolución para textiles y superficies rígidas. Ideal para marcas, emprendedores y producción en volumen.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* DTF Textil */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              onClick={() => { setSimulatorType('DTF Textil'); scrollToSection(quoteRef); }}
              className="group relative glass-card rounded-3xl p-8 cursor-pointer hover:border-amber-500/40 transition-all shine-card"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center ring-glow">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">DTF Textil</h3>
                    <span className="text-[9px] text-bravo-accent font-mono uppercase tracking-widest">Lienzo 32cm × N metros</span>
                  </div>
                </div>
                <p className="text-sm text-bravo-text-muted leading-relaxed mb-6">Impresión en film PET especial que se transfiere a telas con plancha de calor. Perfecta para poleras, polerones, totebags y cualquier textil. Colores vibrantes y durables.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['Full Color', 'Telas Oscuras', 'Alta Durabilidad', 'Sin Mínimos'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/15 text-amber-300 text-[9px] font-bold uppercase tracking-wider rounded-lg">{tag}</span>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-bravo-accent uppercase tracking-widest flex items-center gap-1.5 group-hover:gap-3 transition-all">
                  Cotizar DTF Textil <ArrowRight size={12} />
                </span>
              </div>
            </motion.div>

            {/* DTF UV */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              onClick={() => { setSimulatorType('DTF UV'); scrollToSection(quoteRef); }}
              className="group relative glass-card rounded-3xl p-8 cursor-pointer hover:border-amber-500/40 transition-all shine-card"
            >
              <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center ring-glow">
                    <span className="text-2xl">💎</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">DTF UV</h3>
                    <span className="text-[9px] text-bravo-accent font-mono uppercase tracking-widest">Lienzo 28cm × N metros</span>
                  </div>
                </div>
                <p className="text-sm text-bravo-text-muted leading-relaxed mb-6">Transferencia UV para superficies rígidas y semirígidas: vidrio, metal, madera, plástico y cuero. Acabado brillante o mate con textura palpable al tacto.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['Superficies Rígidas', 'Efecto 3D', 'Textura Premium', 'Alta Definición'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/15 text-purple-300 text-[9px] font-bold uppercase tracking-wider rounded-lg">{tag}</span>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-bravo-accent uppercase tracking-widest flex items-center gap-1.5 group-hover:gap-3 transition-all">
                  Cotizar DTF UV <ArrowRight size={12} />
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CATALOG SECTION */}
      <section id="catalog" ref={catalogRef} className="py-24 bg-[#0c0a09] relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block mb-2">Catálogo</span>
              <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Artículos Base</h2>
              <p className="text-bravo-text-muted text-sm mt-2">Selecciona un producto para personalizar o comprar directamente.</p>
            </div>
            <button onClick={fetchProducts} className="self-start md:self-auto p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
              <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>

          {productsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-bravo-text-muted gap-3">
              <span className="w-8 h-8 border-2 border-bravo-accent/30 border-t-bravo-accent rounded-full animate-spin"></span>
              <span className="text-xs font-mono tracking-widest uppercase">Cargando catálogo...</span>
            </div>
          ) : productsError ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs text-center">
              {productsError}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 border border-dashed border-bravo-border/50 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
              <ShoppingBag size={32} className="text-bravo-text-muted/30" />
              <p className="text-bravo-text-muted text-sm">No hay productos disponibles por el momento.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.slice(0, 10).map((product, idx) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (idx % 3) * 0.1, duration: 0.4 }}
                    className="shine-card bg-bravo-card border border-bravo-border/50 rounded-2xl overflow-hidden hover:border-bravo-accent/50 transition-all flex flex-col group"
                  >
                    <div className="relative h-56 bg-stone-900/50 flex items-center justify-center p-4">
                      <img 
                        src={getProductImage(product)} 
                        alt={product.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 rounded-lg"
                        onError={(e) => { e.target.src = '/mockups/polera_front.png' }}
                      />
                      {product.stock > 0 ? (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase tracking-widest rounded-md backdrop-blur-md">
                          Disponible
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[9px] font-bold uppercase tracking-widest rounded-md backdrop-blur-md">
                          Agotado
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 flex-grow flex flex-col">
                      <h3 className="font-bold text-sm text-white mb-1 uppercase tracking-wide">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-bravo-text-muted line-clamp-2 mb-3">{product.description}</p>
                      )}
                      
                      <div className="mt-auto pt-4 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] text-bravo-text-muted uppercase font-mono block">Valor Base</span>
                          <span className="text-lg font-black text-bravo-accent">${parseFloat(product.sale_price).toLocaleString('es-CL')}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={() => handleWhatsAppOrder(product)}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <MessageSquare size={12} /> Consultar
                        </button>
                        <button 
                          onClick={() => {
                            setSimulatorType(product.category === 'Poleras' ? 'Polera' : product.category === 'Tazones' ? 'Tazón' : product.category === 'Jockeys' ? 'Jockey' : 'Polera')
                            handlePreSelectProduct(product)
                            scrollToSection(quoteRef)
                          }}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-bravo-accent/10 hover:bg-bravo-accent text-bravo-accent hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Sparkles size={12} /> Personalizar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Ver Todo el Catálogo */}
              {products.length > 10 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mt-10 text-center"
                >
                  <a
                    href="/bravo/catalogo"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-bravo-accent/10 border border-bravo-accent/30 hover:bg-bravo-accent hover:text-white text-bravo-accent rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer group"
                  >
                    <ShoppingBag size={16} />
                    Ver Todo el Catálogo ({products.length} productos)
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </motion.div>
              )}
              {products.length <= 10 && products.length > 0 && (
                <div className="mt-8 text-center">
                  <a
                    href="/bravo/catalogo"
                    className="text-bravo-text-muted hover:text-bravo-accent text-[10px] font-mono uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    Ver catálogo completo <ArrowRight size={10} />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* QUOTE SECTION */}
      <section id="quote" ref={quoteRef} className="py-24 bg-bravo-bg relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block mb-2">Diseño</span>
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Cotizar Diseño</h2>
            <p className="text-bravo-text-muted text-sm mt-2">Sube tu logo y simula cómo se verá antes de enviar tu solicitud.</p>
          </div>

          {formSuccess ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto bg-bravo-card border border-emerald-500/30 p-8 md:p-12 rounded-3xl text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">¡Solicitud Recibida!</h2>
                <p className="text-bravo-text-muted text-sm mb-6 max-w-md">Hemos recibido tu diseño y datos. Tu número de seguimiento es:</p>
                <div className="bg-black/40 border border-emerald-500/20 px-6 py-3 rounded-xl mb-8">
                  <span className="text-3xl font-black tracking-[0.2em] text-emerald-400 font-mono select-all">
                    {typeof formSuccess === 'object' ? formSuccess.order_number : formSuccess}
                  </span>
                </div>
                <p className="text-xs text-bravo-text-muted mb-8">Te contactaremos pronto con el presupuesto detallado.</p>
                <button 
                  onClick={() => { setFormSuccess(null); scrollToSection(trackRef); }}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-lg"
                >
                  Ir a Rastrear Pedido
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Simulator Component with Product Tabs and Control Panel */}
              <div className="bg-bravo-card border border-bravo-border rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                {/* Product Tabs */}
                <div className="flex border-b border-bravo-border/50 bg-[#0d0d1a] overflow-x-auto bravo-scrollbar snap-x">
                  {['Polera', 'Polerón', 'Tazón', 'Jockey', 'Totebag', 'Chopero', 'Mug', 'Termo', 'Puzle', 'Stanley', 'Pechera', 'Cuadro', 'DTF Textil', 'DTF UV'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSimulatorType(type)}
                      className={`flex-1 py-2.5 px-3 min-w-[70px] text-[10px] font-bold uppercase tracking-wider transition-colors snap-start whitespace-nowrap ${
                        simulatorType === type ? 'bg-bravo-accent/10 text-bravo-accent border-b-2 border-bravo-accent' : 'text-bravo-text-muted hover:bg-white/5 hover:text-white border-b-2 border-transparent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Canvas + Side Panel — Horizontal layout on desktop */}
                <div className="flex flex-col lg:flex-row">
                  {/* Canvas Area */}
                  <div className="flex-1 min-h-[380px] lg:min-h-[480px] relative">
                    <Bravo3DSimulator
                      simulatorType={simulatorType}
                      imageUrl={simulatorImage}
                      scale={scale}
                      posX={posX}
                      posY={posY}
                      onCaptureReady={(captureFn) => { capture3DRef.current = captureFn }}
                    />
                  </div>

                  {/* Side Control Panel */}
                  <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 bg-[#0a0912] border-t lg:border-t-0 lg:border-l border-bravo-border/30 p-4 lg:p-5 flex flex-col gap-5 overflow-y-auto lg:max-h-[530px] bravo-scrollbar">

                    {/* Upload Section */}
                    <div>
                      <span className="text-[10px] text-bravo-accent font-bold uppercase tracking-widest mb-2.5 block flex items-center gap-1.5">
                        <UploadCloud size={12} /> Diseño / Logo
                      </span>
                      <label className="relative flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-bravo-border/50 rounded-xl hover:bg-bravo-accent/5 hover:border-bravo-accent/60 transition-all cursor-pointer overflow-hidden group">
                        {simulatorImage ? (
                          <div className="absolute inset-0 flex items-center justify-between px-3 bg-[#18181b]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={simulatorImage} alt="Preview" className="h-11 w-11 object-contain bg-black/20 rounded-lg border border-white/10 shrink-0" />
                              <span className="text-[10px] text-white font-mono truncate">{originalFile?.name || 'Imagen cargada'}</span>
                            </div>
                            <button type="button" onClick={(e) => { e.preventDefault(); setSimulatorImage(null); setOriginalFile(null); setScale(60); setPosX(0); setPosY(0); }} className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors shrink-0">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-3">
                            <UploadCloud size={20} className="text-bravo-text-muted mb-1.5 group-hover:text-bravo-accent transition-colors" />
                            <p className="text-[10px] text-bravo-text"><span className="font-bold text-bravo-accent">Haz clic</span> o arrastra</p>
                            <p className="text-[8px] text-bravo-text-muted font-mono mt-0.5">PNG transparente recomendado</p>
                          </div>
                        )}
                        <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                      </label>
                    </div>

                    {/* Adjustments — only visible when image loaded */}
                    {simulatorImage && (
                      <div className="space-y-4">
                        {/* Scale */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-bravo-text-muted uppercase font-mono font-bold">Tamaño</span>
                            <span className="text-[10px] text-bravo-accent font-mono font-bold bg-bravo-accent/10 px-2 py-0.5 rounded-md">{scale}%</span>
                          </div>
                          <input type="range" min="10" max="150" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-bravo-accent h-1.5" />
                        </div>

                        {/* Position X */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-bravo-text-muted uppercase font-mono font-bold">Posición Horizontal</span>
                            <span className="text-[10px] text-white/40 font-mono">{posX > 0 ? `+${posX}` : posX}</span>
                          </div>
                          <input type="range" min="-70" max="70" value={posX} onChange={(e) => setPosX(Number(e.target.value))} className="w-full accent-bravo-accent h-1.5" />
                        </div>

                        {/* Position Y */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-bravo-text-muted uppercase font-mono font-bold">Posición Vertical</span>
                            <span className="text-[10px] text-white/40 font-mono">{posY > 0 ? `+${posY}` : posY}</span>
                          </div>
                          <input type="range" min="-70" max="70" value={posY} onChange={(e) => setPosY(Number(e.target.value))} className="w-full accent-bravo-accent h-1.5" />
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/5" />

                        {/* Reset Button */}
                        <button
                          type="button"
                          onClick={() => { setScale(60); setPosX(0); setPosY(0); }}
                          className="w-full py-2 text-[10px] font-bold uppercase tracking-wider text-bravo-text-muted hover:text-bravo-accent bg-white/5 hover:bg-bravo-accent/10 rounded-xl transition-all border border-white/5 hover:border-bravo-accent/20"
                        >
                          Centrar Diseño
                        </button>
                      </div>
                    )}

                    {/* Quick Guide */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                      <h4 className="text-[9px] font-black text-bravo-accent/70 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Sparkles size={10} /> Guía Rápida
                      </h4>
                      <div className="space-y-1.5 text-[9px] text-bravo-text-muted leading-relaxed">
                        <p><span className="text-bravo-accent font-bold">1.</span> Elige producto en las pestañas</p>
                        <p><span className="text-bravo-accent font-bold">2.</span> Sube tu logo o diseño (PNG)</p>
                        <p><span className="text-bravo-accent font-bold">3.</span> Ajusta posición y tamaño</p>
                        <p><span className="text-bravo-accent font-bold">4.</span> El mockup se adjunta automáticamente al cotizar</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Below Simulator */}
              <div className="bg-bravo-card border border-bravo-border rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto w-full">
                <form onSubmit={handleQuoteSubmit} className="space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wide border-b border-white/5 pb-2 mb-4">Datos del Cliente</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">Nombre Completo *</label>
                        <input type="text" required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors" placeholder="Ej: Juan Pérez" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">WhatsApp/Teléfono *</label>
                        <input type="text" required value={formData.client_phone} onChange={e => setFormData({...formData, client_phone: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors" placeholder="Ej: +56 9 1234 5678" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">RUT (Opcional)</label>
                        <input type="text" value={formData.client_rut} onChange={handleRutChange} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors" placeholder="Ej: 12.345.678-9" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">Email (Opcional)</label>
                        <input type="email" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors" placeholder="correo@ejemplo.com" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wide border-b border-white/5 pb-2 mb-4 mt-6">Detalles del Pedido</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">Tipo de Producto</label>
                        <select value={formData.device_type} onChange={e => setFormData({...formData, device_type: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors">
                          <option value="Polera">Polera</option>
                          <option value="Tazón">Tazón</option>
                          <option value="Jockey">Jockey</option>
                          <option value="Polerón">Polerón</option>
                          <option value="Totebag">Totebag</option>
                          <option value="Pechera">Pechera</option>
                          <option value="Chopero">Chopero</option>
                          <option value="Mug">Mug</option>
                          <option value="Termo">Termo</option>
                          <option value="Puzle">Puzle</option>
                          <option value="DTF Textil">DTF Textil (32cm × N metros)</option>
                          <option value="DTF UV">DTF UV (28cm × N metros)</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">Técnica</label>
                        <select value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors">
                          <option value="Estampado Premium">Recomendada (Automático)</option>
                          <option value="Vinilo Textil">Vinilo Textil</option>
                          <option value="Sublimación">Sublimación</option>
                          <option value="Serigrafía">Serigrafía</option>
                          <option value="DTF Textil">DTF Textil</option>
                          <option value="DTF UV">DTF UV</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">Cantidad</label>
                        <input type="number" min="1" value={formData.accessories} onChange={e => setFormData({...formData, accessories: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors" placeholder="1" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">Color y Talla(s)</label>
                        <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors" placeholder="Ej: Negra, Talla M y L" />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] text-bravo-accent uppercase font-mono font-bold block">Instrucciones Adicionales *</label>
                        <textarea required rows="3" value={formData.reported_issue} onChange={e => setFormData({...formData, reported_issue: e.target.value})} className="w-full bg-bravo-input border border-bravo-border/50 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none transition-colors resize-none" placeholder="Describe dónde va el logo, tamaños específicos o cualquier otro detalle..." />
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={formLoading}
                    className="w-full py-4 mt-4 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_14px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)] active:scale-95 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Procesando...</>
                    ) : (
                      <><Send size={16} /> Enviar Cotización</>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-bravo-text-muted mt-3">Al enviar, capturaremos el diseño del simulador (si existe) para adjuntarlo a tu solicitud.</p>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TRACK SECTION */}
      <section id="track" ref={trackRef} className="py-24 bg-[#0c0a09] relative border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block mb-2">Seguimiento</span>
          <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase mb-10">Rastrear Pedido</h2>

          <form onSubmit={handleTrackSearch} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 mb-12">
            <input type="text" required placeholder="N° Orden (Ej: ORDEN-1234)" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="flex-1 bg-bravo-input border border-bravo-border/50 rounded-xl px-4 py-3.5 text-sm text-white focus:border-bravo-accent outline-none" />
            <input type="text" required placeholder="RUT o Teléfono" value={rutOrPhone} onChange={(e) => setRutOrPhone(e.target.value)} className="flex-1 bg-bravo-input border border-bravo-border/50 rounded-xl px-4 py-3.5 text-sm text-white focus:border-bravo-accent outline-none" />
            <button type="submit" disabled={trackLoading} className="px-6 py-3.5 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center transition-colors">
              {trackLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Search size={20} />}
            </button>
          </form>

          {trackError && (
            <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm inline-flex items-center gap-2">
              <AlertTriangle size={16} /> {trackError}
            </div>
          )}

          <AnimatePresence>
            {trackResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-left bg-bravo-card border border-bravo-border rounded-2xl p-6 md:p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-5 mb-6 gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-widest font-mono">{trackResult.order_number}</h3>
                    <p className="text-sm text-bravo-text-muted">{trackResult.device_type} • {trackResult.model}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider ${STATUS_LABELS[trackResult.status]?.color || 'bg-white/10 text-white'}`}>
                    {STATUS_LABELS[trackResult.status]?.text || trackResult.status}
                  </div>
                </div>

                {trackResult.status === 'presupuesto_enviado' && (
                  <div className="mb-8 p-6 bg-purple-950/20 border border-purple-500/30 rounded-2xl">
                    <h4 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-2">Presupuesto Disponible</h4>
                    <p className="text-white text-sm mb-4">Hemos analizado tu solicitud. El costo total para este trabajo es de:</p>
                    <div className="text-3xl font-black text-white mb-6 font-mono tracking-tighter">
                      ${trackResult.repair_cost?.toLocaleString('es-CL') || '0'}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleAcceptQuote}
                        disabled={trackLoading}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(5,150,105,0.4)] disabled:opacity-50 cursor-pointer"
                      >
                        Aceptar y Comenzar
                      </button>
                      <button 
                        onClick={handleRejectQuote}
                        disabled={trackLoading}
                        className="flex-1 py-3 bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Stepper */}
                  <div>
                    <span className="text-[10px] font-mono text-bravo-accent tracking-widest block font-bold mb-6">ESTADO DEL TRABAJO</span>
                    <div className="relative pl-6 border-l-2 border-bravo-border/30 space-y-8 ml-2">
                      {STATUS_STEPS.map((step) => {
                        const stepStatus = getStepStatus(step.key, trackResult.status, trackResult.history)
                        return (
                          <div key={step.key} className="relative text-sm">
                            <div className={`absolute left-[-33px] top-0.5 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                              stepStatus.state === 'completed' ? 'bg-bravo-accent border-bravo-accent' : 
                              stepStatus.state === 'current' ? 'bg-bravo-bg border-bravo-accent animate-pulse' : 
                              'bg-bravo-bg border-stone-600'
                            }`}>
                              {stepStatus.state === 'completed' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                              <span className={`font-bold ${stepStatus.state === 'completed' ? 'text-bravo-accent' : stepStatus.state === 'current' ? 'text-amber-500' : 'text-stone-500'}`}>{step.label}</span>
                              {stepStatus.date && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {new Date(stepStatus.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {trackResult.estimated_delivery && (
                      <div className="mt-8 bg-bravo-accent/10 border border-bravo-accent/20 p-4 rounded-xl flex items-center gap-3">
                        <Calendar className="text-bravo-accent" size={20} />
                        <div>
                          <span className="text-[10px] text-bravo-accent uppercase font-bold font-mono block">Entrega Estimada</span>
                          <span className="text-sm text-white font-medium">{new Date(trackResult.estimated_delivery).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat */}
                  <div className="flex flex-col h-full">
                    <span className="text-[10px] font-mono text-bravo-accent tracking-widest block font-bold mb-6 flex items-center gap-2">
                      <MessageSquare size={14} /> CHAT CON EL TALLER
                    </span>
                    
                    <div className="flex-grow bg-[#09090b] border border-white/5 rounded-xl p-4 flex flex-col min-h-[300px]">
                      <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2 bravo-scrollbar">
                        {orderComments.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-center text-xs text-stone-500">
                            No hay mensajes.<br/>Envía una consulta directa al taller aquí.
                          </div>
                        ) : (
                          orderComments.map((msg) => {
                            const isClient = msg.sender === 'client';
                            return (
                              <div key={msg.id} className={`flex flex-col max-w-[85%] ${isClient ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                                <span className="text-[10px] text-stone-500 font-mono mb-1">{msg.author_name} ({isClient ? 'Tú' : 'Taller'})</span>
                                <div className={`p-3 rounded-xl text-xs leading-relaxed ${isClient ? 'bg-bravo-accent text-white rounded-tr-sm' : 'bg-[#18181b] border border-white/10 text-white rounded-tl-sm'}`}>
                                  {msg.message}
                                </div>
                                <span className="text-[9px] text-stone-600 font-mono mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )
                          })
                        )}
                      </div>
                      
                      <form onSubmit={handleSendOrderComment} className="flex gap-2 mt-auto">
                        <input type="text" value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Escribe al taller..." className="flex-grow bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-bravo-accent outline-none" />
                        <button type="submit" className="p-2 bg-bravo-accent hover:bg-amber-600 text-white rounded-lg transition-colors"><Send size={16}/></button>
                      </form>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faqs" ref={faqsRef} className="py-24 bg-bravo-bg relative">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block mb-2">Ayuda</span>
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Preguntas Frecuentes</h2>
          </div>

          {!config || !config.faqs || config.faqs.length === 0 ? (
            <div className="text-center text-bravo-text-muted text-sm border border-white/10 rounded-2xl p-8">No hay preguntas frecuentes registradas.</div>
          ) : (
            <div className="space-y-4">
              {config.faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={index} className="bg-bravo-card border border-bravo-border/50 rounded-xl overflow-hidden transition-all">
                    <button onClick={() => setOpenFaqIndex(isOpen ? null : index)} className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none">
                      <span className="font-bold text-sm text-white pr-4">{faq.q}</span>
                      {isOpen ? <ChevronUp size={18} className="text-bravo-accent shrink-0" /> : <ChevronDown size={18} className="text-stone-500 shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-6 pb-5 pt-1 text-sm text-bravo-text-muted leading-relaxed whitespace-pre-line border-t border-white/5">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#060403] border-t border-bravo-border/30 pt-16 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-bravo-accent/5 to-transparent opacity-50" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-bravo.jpg" alt="Logo" className="w-8 h-8 rounded border border-bravo-accent/50" />
                <span className="font-black text-xl tracking-widest uppercase text-white">BRAVO</span>
              </div>
              <p className="text-xs text-bravo-text-muted mb-6">Diseño textil premium, sublimación y personalización de artículos corporativos con calidad garantizada.</p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Creative Core Activo</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-4 text-sm">Enlaces</h4>
              <ul className="space-y-2 text-xs text-bravo-text-muted">
                <li><button onClick={() => scrollToSection(homeRef)} className="hover:text-bravo-accent transition-colors cursor-pointer">Inicio</button></li>
                <li><button onClick={() => scrollToSection(catalogRef)} className="hover:text-bravo-accent transition-colors cursor-pointer">Catálogo</button></li>
                <li><button onClick={() => scrollToSection(quoteRef)} className="hover:text-bravo-accent transition-colors cursor-pointer">Cotizar</button></li>
                <li><button onClick={() => scrollToSection(trackRef)} className="hover:text-bravo-accent transition-colors cursor-pointer">Rastrear Pedido</button></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-bold text-white uppercase tracking-wider mb-4 text-sm">Contacto</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-bravo-text-muted">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-bravo-accent shrink-0 mt-0.5" />
                  <span>{config?.address || "Ramón Freire 45, Galería Freire Local 101, Quillota"}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-bravo-accent shrink-0 mt-0.5" />
                  <a href="mailto:personalizacionesbravo@gmail.com" className="hover:text-white transition-colors">{config?.email || "personalizacionesbravo@gmail.com"}</a>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-bravo-accent shrink-0 mt-0.5" />
                  <a href="https://wa.me/56967547300" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{config?.phone || "+56 9 6754 7300"}</a>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <span className="material-symbols-outlined text-base text-bravo-accent shrink-0 mt-0.5">photo_camera</span>
                  <a href="https://www.instagram.com/personalizacionesbravo/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-mono">@personalizacionesbravo</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-stone-500 font-mono">
            <p>© {new Date().getFullYear()} Bravo Personalizaciones. Todos los derechos reservados.</p>
            <p>Powered by Nova Global</p>
          </div>
        </div>
      </footer>

      {/* MODAL: COMPRA RÁPIDA */}
      <AnimatePresence>
        {showOrderModal && orderProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowOrderModal(false)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-bravo-card border border-bravo-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative my-8">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[9px] text-bravo-accent tracking-widest font-mono font-bold uppercase block">Pedido Express</span>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Pedir en Línea</h3>
                </div>
                <button onClick={() => setShowOrderModal(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-4 p-3 bg-black/40 border border-white/5 rounded-xl items-center mb-5">
                <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  <img 
                    src={getProductImage(orderProduct)} 
                    alt={orderProduct.name} 
                    className="object-contain max-h-full rounded"
                    onError={(e) => { e.target.src = '/mockups/polera_front.png' }} 
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white leading-tight">{orderProduct.name}</h4>
                  <p className="text-xs text-bravo-accent font-black mt-1">${parseFloat(orderProduct.sale_price).toLocaleString('es-CL')}</p>
                </div>
              </div>

              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent uppercase font-bold block">Nombre Completo *</label>
                  <input type="text" required value={orderForm.client_name} onChange={e => setOrderForm({...orderForm, client_name: e.target.value})} className="w-full bg-bravo-input border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-bravo-accent uppercase font-bold block">Teléfono *</label>
                    <input type="text" required value={orderForm.client_phone} onChange={e => setOrderForm({...orderForm, client_phone: e.target.value})} className="w-full bg-bravo-input border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-bravo-accent uppercase font-bold block">Cantidad *</label>
                    <input type="number" min="1" required value={orderForm.quantity} onChange={e => setOrderForm({...orderForm, quantity: parseInt(e.target.value)||1})} className="w-full bg-bravo-input border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent uppercase font-bold block">Notas / Tallas</label>
                  <textarea rows="2" value={orderForm.notes} onChange={e => setOrderForm({...orderForm, notes: e.target.value})} className="w-full bg-bravo-input border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-bravo-accent outline-none resize-none" placeholder="Tallas, colores, etc." />
                </div>

                {orderError && (
                  <div className="p-2 bg-rose-500/10 text-rose-500 text-xs rounded-lg">{orderError}</div>
                )}

                <button type="submit" disabled={orderLoading} className="w-full py-3 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all mt-2 cursor-pointer">
                  {orderLoading ? 'Procesando...' : 'Confirmar Pedido'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING BUTTONS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <button onClick={() => { const num = config?.whatsapp ? config.whatsapp.replace(/[^0-9]/g, '') : '56967547300'; window.open(`https://wa.me/${num}?text=Hola%20Bravo!`, '_blank'); }} className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all group relative cursor-pointer">
          <Phone size={24} />
          <span className="absolute right-16 bg-black/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">WhatsApp</span>
        </button>
        <button onClick={() => setShowChatbot(!showChatbot)} className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all group relative cursor-pointer ${showChatbot ? 'bg-rose-600' : 'bg-bravo-accent'}`}>
          {showChatbot ? <X size={24} /> : <MessageCircle size={24} />}
          {!showChatbot && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-bravo-bg animate-pulse" />}
          <span className="absolute right-16 bg-black/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Asistente Bravo</span>
        </button>
      </div>

      {/* CHATBOT WINDOW */}
      <AnimatePresence>
        {showChatbot && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-24 right-6 w-[360px] h-[520px] bg-bravo-card border border-bravo-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 backdrop-blur-xl">
            {/* CHATBOT HEADER WITH MODE SWITCHER */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg shadow-inner">
                    {chatMode === 'live' ? '💬' : '🤖'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {chatMode === 'live' ? 'Atención al Cliente Bravo' : 'Asistente Virtual Bravo'}
                    </h4>
                    <span className="text-[9px] text-white/90 font-mono flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      {chatMode === 'live' ? 'Ejecutivo en Línea · Quillota' : 'Bot 24/7 Disponible'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowChatbot(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"><X size={18}/></button>
              </div>

              {/* MODE SELECTOR TABS */}
              <div className="grid grid-cols-2 p-0.5 bg-black/30 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                <button 
                  onClick={() => setChatMode('bot')}
                  className={`py-1 rounded-md transition-all ${chatMode === 'bot' ? 'bg-amber-500 text-black shadow' : 'text-white/70 hover:text-white'}`}
                >
                  🤖 Asistente Bot
                </button>
                <button 
                  onClick={() => {
                    setChatMode('live')
                    handleSendChatMessage(null, "5")
                  }}
                  className={`py-1 rounded-md transition-all flex items-center justify-center gap-1 ${chatMode === 'live' ? 'bg-amber-500 text-black shadow' : 'text-white/70 hover:text-white'}`}
                >
                  💬 Chat Interno
                </button>
              </div>
            </div>
            
            {/* MESSAGES CONTAINER */}
            <div className="flex-grow p-3.5 overflow-y-auto space-y-3 bg-black/25 flex flex-col bravo-scrollbar text-xs">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex flex-col max-w-[88%] ${msg.sender === 'bot' ? 'self-start items-start' : 'self-end items-end'}`}>
                  <div className={`p-3 rounded-2xl leading-relaxed shadow-md whitespace-pre-line ${msg.sender === 'bot' ? 'bg-[#18181b] border border-white/10 text-white rounded-tl-xs' : 'bg-bravo-accent text-white rounded-tr-xs font-medium'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-stone-500 mt-1 font-mono">{msg.time}</span>
                </div>
              ))}
              {isWriting && (
                <div className="self-start bg-[#18181b] border border-white/10 p-2.5 rounded-2xl rounded-tl-xs flex gap-1.5 items-center">
                  <span className="text-[10px] text-bravo-text-muted font-mono mr-1">Respondiendo</span>
                  <span className="w-1.5 h-1.5 bg-bravo-accent rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                  <span className="w-1.5 h-1.5 bg-bravo-accent rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                  <span className="w-1.5 h-1.5 bg-bravo-accent rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                </div>
              )}
            </div>

            {/* QUICK ACTION BUTTONS PILLS */}
            <div className="px-3 py-1.5 bg-[#0a0910] border-t border-white/5 overflow-x-auto bravo-scrollbar flex gap-1.5 text-[9px] shrink-0">
              <button onClick={() => handleSendChatMessage(null, "1")} className="px-2.5 py-1 bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 text-white/70 rounded-full border border-white/10 whitespace-nowrap transition-all font-mono">
                📦 Estado Orden
              </button>
              <button onClick={() => handleSendChatMessage(null, "2")} className="px-2.5 py-1 bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 text-white/70 rounded-full border border-white/10 whitespace-nowrap transition-all font-mono">
                👕 Catálogo
              </button>
              <button onClick={() => handleSendChatMessage(null, "3")} className="px-2.5 py-1 bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 text-white/70 rounded-full border border-white/10 whitespace-nowrap transition-all font-mono">
                🎨 Cotizar
              </button>
              <button onClick={() => { setChatMode('live'); handleSendChatMessage(null, "5"); }} className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 whitespace-nowrap font-mono font-bold hover:bg-amber-500/30 transition-all">
                💬 Chat Interno
              </button>
              <button onClick={() => handleSendChatMessage(null, "4")} className="px-2.5 py-1 bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 text-white/70 rounded-full border border-white/10 whitespace-nowrap transition-all font-mono">
                📍 Ubicación
              </button>
              <button onClick={() => handleSendChatMessage(null, "6")} className="px-2.5 py-1 bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 text-white/70 rounded-full border border-white/10 whitespace-nowrap transition-all font-mono">
                ❓ FAQs
              </button>
            </div>

            {/* INPUT FORM */}
            <form onSubmit={handleSendChatMessage} className="p-2.5 bg-[#0d0d1a] border-t border-white/10 flex gap-2">
              <input 
                type="text" 
                value={inputMessage} 
                onChange={e => setInputMessage(e.target.value)} 
                placeholder={chatMode === 'live' ? "Escribe un mensaje al ejecutivo..." : "Escribe una opción (1-6) o mensaje..."} 
                className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-bravo-accent outline-none placeholder:text-stone-600" 
              />
              <button type="submit" className="p-2 bg-bravo-accent hover:bg-amber-600 text-white rounded-xl cursor-pointer transition-colors">
                <Send size={16}/>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEV TOGGLE */}
      {devToggle}
    </div>
  )
}
