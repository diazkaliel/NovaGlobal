import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Sparkles, Send, CheckCircle, AlertTriangle, 
  Search, Clock, Calendar, HelpCircle, FileText, User, ShoppingCart,
  ArrowRight, ShieldCheck, Heart, Star, Phone, MessageSquare, Info,
  MapPin, Mail, Globe, ChevronDown, ChevronUp, MessageCircle, X
} from 'lucide-react'
import * as THREE from 'three'
import { getPublicProducts, requestOrder, trackRepair, getWebConfig, simulateWhatsAppMessage, getTrackComments, createTrackComment, uploadPublicDesign } from '../../api/public'
import Bravo3DSimulator from '../../components/bravo/Bravo3DSimulator'
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
  { label: 'Inicio', emoji: '🏠', desc: 'Portada Principal' },
  { label: 'Poleras', emoji: '👕', desc: 'Estampado de Ropa' },
  { label: 'Tazones', emoji: '☕', desc: 'Tazones y Mugs' },
  { label: 'Jockeys', emoji: '🧢', desc: 'Gorras y Jockeys' },
  { label: 'Catálogo', emoji: '🛍️', desc: 'Ver Productos Base' },
  { label: 'Cotizar', emoji: '📝', desc: 'Solicitar Pedido' }
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
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '🤖 *¡Hola! Bienvenido al asistente virtual de Bravo Estampados.*\n\n¿En qué puedo ayudarte hoy? Escribe el número de la opción que desees:\n\n1️⃣ *Consultar estado de mi pedido* 📦\n2️⃣ *Ver catálogo de productos base* 👕\n3️⃣ *Preguntas frecuentes (FAQs)* ❓\n4️⃣ *Ubicación y contacto* 📍\n5️⃣ *Cotizar diseño personalizado* 🎨',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isWriting, setIsWriting] = useState(false)

  // Simulador de Estampados State
  const [simulatorType, setSimulatorType] = useState('Polera') // Polera, Tazón, Jockey
  const [simulatorImage, setSimulatorImage] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [scale, setScale] = useState(60) // 10% to 150%
  const [posX, setPosX] = useState(0) // -100 to 100
  const [posY, setPosY] = useState(0) // -100 to 100
  const capture3DRef = useRef(null)

  // Mobile Check
  const [isMobile, setIsMobile] = useState(false)
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

  const handleWhatsAppOrder = (product) => {
    const whatsappNum = config?.whatsapp ? config.whatsapp.replace(/\+/g, '').replace(/\s/g, '') : '56987654321'
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

  // Load products when tab is 'catalog'
  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchProducts()
    }
  }, [activeTab])

  const fetchProducts = async () => {
    setProductsLoading(true)
    setProductsError('')
    try {
      const response = await getPublicProducts()
      setProducts(response.data)
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

    const createCardTexture = (label, emoji, colorHex) => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 384
      const ctx = canvas.getContext('2d')

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

      // Draw Emoji
      ctx.font = '78px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, 128, 136)

      // Draw Label
      ctx.fillStyle = '#2c1810'
      ctx.font = 'bold 25px "Outfit", "Sora", sans-serif'
      ctx.fillText(label, 128, 252)

      // Subheading
      ctx.fillStyle = '#b4783c'
      ctx.font = 'bold 11px "Outfit", "Sora", sans-serif'
      ctx.fillText('• CREATIVE CORE •', 128, 292)

      const texture = new THREE.CanvasTexture(canvas)
      return texture
    }

    CAROUSEL_ITEMS.forEach((opt, i) => {
      const angle = (i / CAROUSEL_ITEMS.length) * Math.PI * 2
      const cardGroup = new THREE.Group()

      // Card Mesh
      const geometry = new THREE.PlaneGeometry(2.8, 4.2)
      const texture = createCardTexture(opt.label, opt.emoji, '#d97706')
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
        setActiveTab('quote')
      } else if (itemData.label === 'Tazones') {
        setFormData(prev => ({ ...prev, device_type: 'Tazón' }))
        setActiveTab('quote')
      } else if (itemData.label === 'Jockeys') {
        setFormData(prev => ({ ...prev, device_type: 'Jockey' }))
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

  // Handle Chatbot Message Submission
  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const userMsgText = inputMessage.trim()
    setInputMessage('')

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setChatMessages(prev => [...prev, userMsg])
    setIsWriting(true)

    try {
      const response = await simulateWhatsAppMessage({ 
        message: userMsgText, 
        phone: 'user_web', 
        system: 'bravo' 
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
      }, 750)
    } catch (err) {
      setIsWriting(false)
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: '❌ *Error de conexión:* No se pudo procesar el mensaje con el chatbot de Bravo.',
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

  return (
    <div className="min-h-screen bg-bravo-bg text-bravo-text flex flex-col font-sora overflow-hidden relative">
      
      {/* Background canvas container or Mobile fallback */}
      {!isMobile ? (
        <div 
          ref={mountRef} 
          className="absolute inset-0 w-full h-full z-0 bg-transparent cursor-grab active:cursor-grabbing" 
          id="threejs-container-ANIMATION_CAROUSEL"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1a110a] via-[#16120e] to-[#2c1810]/20 z-0 pointer-events-none" />
      )}

      {/* Radial overlay to improve text readability over 3D animation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(22,15,10,0.62)_0%,rgba(13,8,5,0.95)_100%)] z-1 pointer-events-none" />

      {/* Overlay UI Layers */}
      <div className="relative z-10 flex flex-col h-screen w-full pointer-events-none">
        
        {/* Navigation Bar */}
        <nav className="w-full px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between bg-bravo-sidebar/90 backdrop-blur-md border-b border-bravo-border z-20 pointer-events-auto shadow-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-[0_0_15px_rgba(217,119,6,0.2)] shrink-0">
              <img src="/logo-bravo.jpg" alt="Bravo Logo" className="w-full h-full rounded-full object-cover border border-amber-900/10" />
            </div>
            <div className="text-left">
              <h1 className="text-xs sm:text-sm font-black tracking-widest bg-gradient-to-r from-amber-600 via-orange-500 to-bravo-accent-warm bg-clip-text text-transparent leading-none">
                BRAVO
              </h1>
              <p className="text-[8px] sm:text-[9px] uppercase tracking-wider text-bravo-accent/80 font-bold mt-1">
                Personalizaciones
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => { setActiveTab('home'); setTrackResult(null); setFormSuccess(null); }}
              className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'home' ? 'bg-bravo-accent text-white font-extrabold shadow-sm' : 'text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5'
              }`}
            >
              Inicio
            </button>
            <button 
              onClick={() => { setActiveTab('catalog'); setTrackResult(null); setFormSuccess(null); }}
              className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'catalog' ? 'bg-bravo-accent text-white font-extrabold shadow-sm' : 'text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5'
              }`}
            >
              Catálogo
            </button>
            <button 
              onClick={() => { setActiveTab('quote'); setTrackResult(null); }}
              className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'quote' ? 'bg-bravo-accent text-white font-extrabold shadow-sm' : 'text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5'
              }`}
            >
              Cotizar
            </button>
            <button 
              onClick={() => { setActiveTab('track'); setFormSuccess(null); }}
              className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'track' ? 'bg-bravo-accent text-white font-extrabold shadow-sm' : 'text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5'
              }`}
            >
              Rastrear Pedido
            </button>

            <button 
              onClick={() => { setActiveTab('faqs'); setFormSuccess(null); setTrackResult(null); }}
              className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'faqs' ? 'bg-bravo-accent text-white font-extrabold shadow-sm' : 'text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5'
              }`}
            >
              FAQs
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('dev_override')
                window.location.href = '/'
              }}
              className="text-[10px] sm:text-xs font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 transition-all cursor-pointer uppercase font-mono shadow-xs shrink-0"
            >
              Portal
            </button>
          </div>
        </nav>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Side Menu Bar */}
          <aside className="w-64 bg-bravo-sidebar/70 backdrop-blur-lg border-r border-bravo-border flex flex-col h-full hidden lg:flex z-20 pointer-events-auto">
            <div className="p-6 flex flex-col gap-1.5 text-left">
              <p className="text-[9px] text-bravo-text-muted font-bold mb-4 tracking-widest uppercase font-mono">PRODUCTOS</p>
              
              <button
                onClick={() => { setActiveTab('quote'); setFormData(prev => ({ ...prev, device_type: 'Polera' })); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5 transition-all group cursor-pointer border-none bg-transparent font-bold uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-bravo-text-muted group-hover:text-bravo-accent text-lg">apparel</span>
                <span>Poleras</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('quote'); setFormData(prev => ({ ...prev, device_type: 'Tazón' })); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5 transition-all group cursor-pointer border-none bg-transparent font-bold uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-bravo-text-muted group-hover:text-bravo-accent text-lg">local_cafe</span>
                <span>Tazones</span>
              </button>

              <button
                onClick={() => { setActiveTab('quote'); setFormData(prev => ({ ...prev, device_type: 'Jockey' })); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs text-bravo-text-muted hover:text-bravo-accent hover:bg-bravo-accent/5 transition-all group cursor-pointer border-none bg-transparent font-bold uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-bravo-text-muted group-hover:text-bravo-accent text-lg">smart_toy</span>
                <span>Jockeys</span>
              </button>
            </div>
            
            <div className="mt-auto p-6 border-t border-bravo-border bg-bravo-bg/40 text-left space-y-3.5">
              {config && (
                <div className="space-y-2 text-[10px] text-bravo-text-muted leading-relaxed font-sans border-b border-bravo-border/20 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-bravo-accent shrink-0" />
                    <span className="truncate" title={config.address}>{config.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-bravo-accent shrink-0" />
                    <span className="truncate" title={config.email}>{config.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-bravo-accent shrink-0" />
                    <span>{config.phone}</span>
                  </div>
                </div>
              )}
              <div className="mt-2 flex justify-between items-center px-1">
                <div className="flex flex-col">
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono">Estudio</span>
                  <span className="text-[10px] text-bravo-accent font-bold font-mono">CREATIVE_CORE</span>
                </div>
                <div className="h-2.5 w-2.5 rounded-full bg-bravo-accent shadow-[0_0_8px_rgba(217,119,6,1)] animate-pulse" />
              </div>
            </div>
          </aside>

          {/* Sliding panel overlay content */}
          <AnimatePresence>
            {activeTab !== 'home' && (
              <motion.div
                initial={{ opacity: 0, x: 250 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 250 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] bg-bravo-sidebar/95 backdrop-blur-xl border-l border-bravo-border z-30 flex flex-col overflow-y-auto pointer-events-auto shadow-xl"
              >
                <div className="p-6 sm:p-8 flex-grow">
                  
                  {/* TAB 2: CATALOG */}
                  {activeTab === 'catalog' && (
                    <div className="space-y-6">
                      <div className="border-b border-bravo-border pb-4 text-left">
                        <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block">Catálogo</span>
                        <h2 className="text-2xl font-black italic tracking-tighter text-bravo-text uppercase">Artículos Base</h2>
                        <p className="text-bravo-text-muted text-xs mt-1">Selecciona un producto base para estampar con tu logotipo o diseño.</p>
                      </div>

                      {productsLoading ? (
                        <div className="text-center py-12 text-bravo-accent animate-pulse font-mono text-sm">Cargando catálogo...</div>
                      ) : productsError ? (
                        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-center text-xs">{productsError}</div>
                      ) : products.length === 0 ? (
                        <div className="border border-bravo-border bg-bravo-card p-8 rounded-xl text-center space-y-4 shadow-sm text-left">
                          <ShoppingBag size={40} className="mx-auto text-bravo-text-muted/55" />
                          <p className="text-bravo-text-muted text-xs leading-relaxed text-center">El catálogo de productos se está actualizando. Puedes solicitar una cotización directa.</p>
                          <div className="flex justify-center">
                            <button onClick={() => setActiveTab('quote')} className="px-5 py-2 bg-bravo-accent hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all">Cotizar Ahora</button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {products.map((p) => {
                            const isLowStock = p.stock > 0 && p.stock <= 5;
                            const isOutOfStock = p.stock <= 0;
                            
                            return (
                              <div key={p.id} className="bg-bravo-card border border-bravo-border rounded-2xl overflow-hidden flex flex-col justify-between p-4 space-y-4 hover:border-amber-600/40 hover:shadow-[0_0_15px_rgba(217,119,6,0.1)] transition-all duration-300 text-left relative group">
                                
                                {/* Stock badge */}
                                <div className="absolute top-6 left-6 z-10">
                                  {isOutOfStock ? (
                                    <span className="bg-rose-950/70 text-rose-400 text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-rose-900/30">Agotado</span>
                                  ) : isLowStock ? (
                                    <span className="bg-amber-950/70 text-amber-400 text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-900/30 animate-pulse">Últimas {p.stock} un.</span>
                                  ) : (
                                    <span className="bg-emerald-950/70 text-emerald-400 text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-900/30">Disponible</span>
                                  )}
                                </div>

                                <div className="aspect-square bg-bravo-input/20 border border-bravo-border rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
                                  {p.image_url ? (
                                    <img 
                                      src={p.image_url.startsWith('http') ? p.image_url : `${api.defaults.baseURL}${p.image_url}`} 
                                      alt={p.name} 
                                      className="object-contain max-h-full max-w-full rounded transition-transform duration-300 group-hover:scale-105" 
                                    />
                                  ) : (
                                    <ShoppingBag size={36} className="text-bravo-text-muted/30" />
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-bravo-accent/80">Producto Base</span>
                                  <h4 className="font-extrabold text-bravo-text text-sm leading-tight group-hover:text-bravo-accent transition-colors">{p.name}</h4>
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-amber-600 font-black">${parseFloat(p.sale_price).toLocaleString('es-CL')}</span>
                                    <span className="text-[10px] text-bravo-text-muted font-mono">1 unidad</span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1.5 pt-1">
                                  <button
                                    onClick={() => handleWhatsAppOrder(p)}
                                    className="w-full py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                                    type="button"
                                  >
                                    <MessageSquare size={11} />
                                    Pedir por WhatsApp
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      handlePreSelectProduct(p);
                                      setSimulatorType(p.name.split(' ')[0] || 'Polera');
                                      setSimulatorImage(null); // Reset
                                    }}
                                    className="w-full py-2 bg-bravo-accent hover:bg-amber-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                                    type="button"
                                  >
                                    <Sparkles size={11} />
                                    Personalizar / Cotizar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: QUOTE REQUEST */}
                  {activeTab === 'quote' && (
                    <div className="space-y-6">
                      <div className="border-b border-bravo-border pb-4 text-left">
                        <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block">Cotización</span>
                        <h2 className="text-2xl font-black italic tracking-tighter text-bravo-text uppercase">Solicitar Cotización</h2>
                        <p className="text-bravo-text-muted text-xs mt-1">Cuéntanos tu idea de diseño o el producto que necesitas personalizar.</p>
                      </div>

                      {formSuccess ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="border border-bravo-accent/30 bg-bravo-accent/5 p-6 rounded-xl text-center space-y-5"
                        >
                          <div className="mx-auto w-12 h-12 bg-bravo-accent/10 rounded-full flex items-center justify-center border border-bravo-accent/40">
                            <CheckCircle className="text-bravo-accent" size={24} />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-bravo-text text-lg">Cotización Enviada</h3>
                            <p className="text-xs text-bravo-text-muted mt-1">Tu solicitud ha sido registrada. Te contactaremos vía WhatsApp a la brevedad.</p>
                          </div>
                          <div className="p-4 bg-bravo-input border border-bravo-border rounded-lg max-w-xs mx-auto shadow-xs">
                            <span className="text-[9px] text-bravo-text-muted block font-mono">NÚMERO DE SOLICITUD</span>
                            <span className="text-2xl font-black font-mono text-bravo-accent tracking-widest">{formSuccess.order_number}</span>
                          </div>
                          <button
                            onClick={() => { setFormSuccess(null); setActiveTab('track'); setOrderNumber(formSuccess.order_number); }}
                            className="px-6 py-2 bg-bravo-accent text-white font-bold text-xs uppercase rounded transition-all cursor-pointer shadow-sm"
                          >
                            Rastrear Pedido
                          </button>
                        </motion.div>
                      ) : (
                        <form onSubmit={handleQuoteSubmit} className="space-y-5 text-left">
                          
                          {/* MOCKUP INTERACTIVE SIMULATOR — Diseñador de Mockups Premium */}
                          <div className="space-y-4 bg-gradient-to-b from-bravo-card to-bravo-card/80 border border-bravo-border/60 rounded-2xl p-5 shadow-lg shadow-amber-900/5">
                            {/* Header del Simulador */}
                            <div className="flex items-center justify-between border-b border-bravo-border pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[9px] font-mono text-bravo-accent tracking-[0.2em] font-bold uppercase">
                                  Simulador de Mockups
                                </span>
                              </div>
                              <span className="text-[8px] font-mono text-bravo-text-muted/50 uppercase">
                                Vista previa en tiempo real
                              </span>
                            </div>
                            
                            {/* Selector de Producto con íconos */}
                            <div className="flex gap-2">
                              {[
                                { type: 'Polera', icon: '👕', label: 'Polera' },
                                { type: 'Tazón', icon: '☕', label: 'Tazón' },
                                { type: 'Jockey', icon: '🧢', label: 'Jockey' }
                              ].map(({ type, icon, label }) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    setSimulatorType(type);
                                    setFormData({ ...formData, device_type: type });
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer border ${
                                    simulatorType === type
                                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-400/50 text-white shadow-md shadow-amber-900/20 scale-[1.02]'
                                      : 'bg-bravo-input border-bravo-border text-bravo-text-muted hover:text-bravo-text hover:border-amber-600/30 hover:bg-bravo-input/80'
                                  }`}
                                >
                                  <span className="text-sm">{icon}</span>
                                  {label}
                                </button>
                              ))}
                            </div>

                            {/* Canvas del Mockup — Vista de producto profesional */}
                            <div className="relative h-96 rounded-xl border border-bravo-border/40 overflow-hidden shadow-inner" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), 0 0 15px rgba(245, 158, 11, 0.04)' }}>
                              <Bravo3DSimulator
                                simulatorType={simulatorType}
                                imageUrl={simulatorImage}
                                scale={scale}
                                posX={posX}
                                posY={posY}
                                onCaptureReady={(captureFn) => {
                                  capture3DRef.current = captureFn
                                }}
                              />
                            </div>

                            {/* Controles del Simulador */}
                            <div className="space-y-3">
                              {/* Subir archivo — con estilo mejorado */}
                              <div className="flex items-center gap-2">
                                <label className="flex-grow flex items-center justify-center gap-2.5 border-2 border-dashed border-bravo-border/50 hover:border-amber-500/50 hover:bg-amber-500/5 p-3 rounded-xl cursor-pointer transition-all duration-300 text-[11px] text-bravo-text-muted hover:text-amber-300 font-bold group">
                                  <FileText size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                  {simulatorImage ? '✏️ Cambiar Imagen' : '📁 Subir Logotipo / Imagen (.PNG, .JPG)'}
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    className="hidden" 
                                  />
                                </label>
                                {simulatorImage && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSimulatorImage(null)
                                      setOriginalFile(null)
                                    }}
                                    className="p-2.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-xl hover:bg-rose-900/25 cursor-pointer active:scale-95 transition-all text-[10px] font-bold"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {simulatorImage && (
                                <div className="space-y-3 pt-3 border-t border-bravo-border/40">
                                  {/* Escala */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-bravo-text-muted flex items-center gap-1.5">
                                        <span className="text-amber-400/70">⊞</span> Escala
                                      </span>
                                      <span className="text-amber-300 font-bold tabular-nums">{scale}%</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="10" 
                                      max="150" 
                                      value={scale} 
                                      onChange={(e) => setScale(parseInt(e.target.value))} 
                                      className="w-full accent-amber-500 h-1.5" 
                                    />
                                  </div>
                                  
                                  {/* Posición Horizontal */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-bravo-text-muted flex items-center gap-1.5">
                                        <span className="text-amber-400/70">↔</span> Posición H
                                      </span>
                                      <span className="text-amber-300 font-bold tabular-nums">{posX}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-70" 
                                      max="70" 
                                      value={posX} 
                                      onChange={(e) => setPosX(parseInt(e.target.value))} 
                                      className="w-full accent-amber-500 h-1.5" 
                                    />
                                  </div>

                                  {/* Posición Vertical */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-bravo-text-muted flex items-center gap-1.5">
                                        <span className="text-amber-400/70">↕</span> Posición V
                                      </span>
                                      <span className="text-amber-300 font-bold tabular-nums">{posY}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-70" 
                                      max="70" 
                                      value={posY} 
                                      onChange={(e) => setPosY(parseInt(e.target.value))} 
                                      className="w-full accent-amber-500 h-1.5" 
                                    />
                                  </div>

                                  {/* Reset de posición */}
                                  <button
                                    type="button"
                                    onClick={() => { setScale(60); setPosX(0); setPosY(0); }}
                                    className="w-full text-[9px] text-bravo-text-muted hover:text-amber-300 font-mono uppercase tracking-wider py-1.5 border border-bravo-border/30 rounded-lg hover:border-amber-600/30 transition-all cursor-pointer"
                                  >
                                    ↺ Restablecer posición
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Client Information */}
                          <div className="space-y-3">
                            <span className="text-[9px] font-mono text-bravo-accent tracking-wider block font-bold border-b border-bravo-border pb-1">1. DATOS DEL CLIENTE</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={formData.client_name}
                                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                placeholder="Nombre Completo *"
                                className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                                required
                              />
                              <input
                                type="text"
                                value={formData.client_phone}
                                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                                placeholder="WhatsApp (Ej: +56987654321) *"
                                className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                                required
                              />
                              <input
                                type="email"
                                value={formData.client_email}
                                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                                placeholder="Email"
                                className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={formData.client_rut}
                                  onChange={(e) => setFormData({ ...formData, client_rut: e.target.value })}
                                  placeholder="RUT"
                                  className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                                />
                                <input
                                  type="text"
                                  value={formData.client_city}
                                  onChange={(e) => setFormData({ ...formData, client_city: e.target.value })}
                                  placeholder="Ciudad"
                                  className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Order specifications */}
                          <div className="space-y-3">
                            <span className="text-[9px] font-mono text-bravo-accent tracking-wider block font-bold border-b border-bravo-border pb-1">2. DETALLES DE PERSONALIZACIÓN</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <select
                                value={formData.device_type}
                                onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                                className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                              >
                                <option value="Polera">Polera</option>
                                <option value="Tazón">Tazón</option>
                                <option value="Jockey">Jockey / Gorra</option>
                                <option value="Polerón">Polerón</option>
                                <option value="Pechera">Pechera</option>
                                <option value="Otro">Otro</option>
                              </select>
                              <select
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                              >
                                <option value="Personalizado">Vinilo Textil</option>
                                <option value="Sublimación">Sublimación</option>
                                <option value="Bordado">Bordado</option>
                                <option value="Serigrafía">Serigrafía</option>
                              </select>
                              <input
                                type="text"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                placeholder="Color y Talla (Ej: Roja M) *"
                                className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                                required
                              />
                            </div>
                            <textarea
                              rows="3"
                              value={formData.reported_issue}
                              onChange={(e) => setFormData({ ...formData, reported_issue: e.target.value })}
                              placeholder="Instrucciones de estampado o idea del diseño *"
                              className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                              required
                            />
                            <input
                              type="text"
                              value={formData.accessories}
                              onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
                              placeholder="Cantidad aproximada de unidades (ej: 10 unidades)"
                              className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                            />
                          </div>

                          {formError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                              <AlertTriangle size={14} />
                              <span>{formError}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={formLoading}
                            className="w-full py-3 bg-bravo-accent hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {formLoading ? 'Enviando Solicitud...' : 'Enviar Solicitud'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* TAB 4: TRACK ORDER */}
                  {activeTab === 'track' && (
                    <div className="space-y-6 text-left">
                      <div className="border-b border-bravo-border pb-4">
                        <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block">Rastreo</span>
                        <h2 className="text-2xl font-black italic tracking-tighter text-bravo-text uppercase">Rastrear mi Pedido</h2>
                        <p className="text-bravo-text-muted text-xs mt-1">Revisa el avance de confección o empaquetado de tu compra.</p>
                      </div>

                      <form onSubmit={handleTrackSearch} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-bravo-accent tracking-wider block">NÚMERO DE PEDIDO</label>
                          <input
                            type="text"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="Ej: BRV-00042"
                            className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2.5 px-4 text-bravo-text focus:outline-none focus:border-bravo-accent font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-bravo-accent tracking-wider block">RUT O TELÉFONO DEL CLIENTE</label>
                          <input
                            type="text"
                            value={rutOrPhone}
                            onChange={(e) => setRutOrPhone(e.target.value)}
                            placeholder="RUT: 12345678-9 o Teléfono: 987654321"
                            className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2.5 px-4 text-bravo-text focus:outline-none focus:border-bravo-accent"
                            required
                          />
                        </div>

                        {trackError && (
                          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                            <AlertTriangle size={14} />
                            <span>{trackError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={trackLoading}
                          className="w-full py-3 bg-bravo-accent hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {trackLoading ? 'Consultando...' : 'Buscar Pedido'}
                        </button>
                      </form>

                      {trackResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 border border-bravo-border bg-bravo-card p-5 rounded-xl space-y-6 shadow-xs text-left"
                        >
                          <div className="flex justify-between items-start border-b border-bravo-border pb-4">
                            <div>
                              <h3 className="font-bold text-bravo-text font-mono text-lg">{trackResult.order_number}</h3>
                              <p className="text-xs text-bravo-text-muted">{trackResult.device_type} - {trackResult.model}</p>
                            </div>
                            <span className={`px-3 py-1 border rounded-full text-[10px] font-bold ${
                              STATUS_LABELS[trackResult.status]?.color || 'bg-gray-100 text-gray-800'
                            }`}>
                              {STATUS_LABELS[trackResult.status]?.text || trackResult.status}
                            </span>
                          </div>

                          {/* Stepper progress */}
                          <div className="space-y-4">
                            <span className="text-[9px] font-mono text-bravo-accent tracking-wider block font-bold font-mono">ESTADO DEL TRABAJO</span>
                            <div className="relative pl-5 border-l border-bravo-border space-y-5 ml-2 py-0.5">
                              {STATUS_STEPS.map((step) => {
                                const stepStatus = getStepStatus(step.key, trackResult.status, trackResult.history)
                                return (
                                  <div key={step.key} className="relative text-xs">
                                    <div className={`absolute left-[-26px] top-1 w-3 h-3 rounded-full border-2 transition-all flex items-center justify-center ${
                                      stepStatus.state === 'completed' 
                                        ? 'bg-bravo-accent border-bravo-accent' 
                                        : stepStatus.state === 'current'
                                        ? 'bg-bravo-bg border-bravo-accent animate-pulse'
                                        : 'bg-bravo-bg border-stone-300'
                                    }`}>
                                      {stepStatus.state === 'completed' && (
                                        <div className="w-1 h-1 bg-[#fffbf0] rounded-full" />
                                      )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className={`font-bold ${
                                        stepStatus.state === 'completed' ? 'text-bravo-accent' : stepStatus.state === 'current' ? 'text-amber-800' : 'text-bravo-text-muted/50'
                                      }`}>{step.label}</span>
                                      {stepStatus.date && (
                                        <span className="text-[9px] text-bravo-text-muted/60 font-mono">
                                          {new Date(stepStatus.date).toLocaleDateString('es-CL', {
                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="border-t border-bravo-border pt-4 text-xs space-y-3">
                            <div>
                              <span className="text-[9px] font-mono text-bravo-accent block font-bold">ESPECIFICACIONES DE DISEÑO</span>
                              <p className="text-bravo-text mt-1">{trackResult.reported_issue}</p>
                            </div>
                            {trackResult.estimated_delivery && (
                              <div className="flex items-center gap-2 bg-bravo-accent/5 border border-bravo-border p-2.5 rounded-lg mt-2">
                                <Calendar size={14} className="text-bravo-accent" />
                                <div>
                                  <span className="text-[8px] font-mono text-bravo-accent block uppercase font-bold">Fecha Estimada de Entrega</span>
                                  <span className="text-bravo-text text-xs">{new Date(trackResult.estimated_delivery).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* CHAT CON EL TALLER (ADMINISTRACIÓN) */}
                          <div className="border-t border-bravo-border pt-5 space-y-4">
                            <div className="flex items-center gap-2">
                              <MessageSquare size={14} className="text-bravo-accent animate-pulse" />
                              <span className="text-[10px] font-mono text-bravo-accent block font-bold uppercase tracking-wider">Chat de Soporte con el Taller</span>
                            </div>

                            {/* Historial de Mensajes */}
                            <div className="bg-slate-950/40 border border-bravo-border/50 rounded-xl p-3.5 space-y-3.5 max-h-56 overflow-y-auto custom-scrollbar flex flex-col">
                              {orderComments.length === 0 ? (
                                <div className="text-center py-6 text-bravo-text-muted text-[11px] leading-relaxed">
                                  No hay mensajes en este pedido.<br />
                                  Usa el campo inferior para enviar una consulta directa al taller.
                                </div>
                              ) : (
                                orderComments.map((msg) => {
                                  const isClient = msg.sender === 'client';
                                  return (
                                    <div
                                      key={msg.id}
                                      className={`flex flex-col max-w-[85%] ${
                                        isClient ? 'self-end items-end' : 'self-start items-start'
                                      }`}
                                    >
                                      <span className="text-[9px] text-bravo-text-muted/70 font-bold mb-1 font-mono">
                                        {msg.author_name} ({isClient ? 'Tú' : 'Soporte'})
                                      </span>
                                      <div
                                        className={`p-2.5 rounded-xl text-left leading-relaxed text-[11px] border ${
                                          isClient
                                            ? 'bg-bravo-accent border-bravo-accent text-white rounded-tr-none'
                                            : 'bg-[#2c1810]/60 border-bravo-border/60 text-bravo-text rounded-tl-none'
                                        }`}
                                      >
                                        {msg.message}
                                      </div>
                                      <span className="text-[8px] text-bravo-text-muted/50 mt-1 font-mono">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Input para nuevo mensaje */}
                            <form onSubmit={handleSendOrderComment} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder="Escribe una pregunta al taller..."
                                className="flex-grow bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                              />
                              <button
                                type="submit"
                                className="p-2 bg-bravo-accent hover:bg-amber-600 text-white rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer"
                              >
                                <Send size={13} />
                              </button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}



                  {/* TAB 6: FAQS */}
                  {activeTab === 'faqs' && (
                    <div className="space-y-6">
                      <div className="border-b border-bravo-border pb-4 text-left">
                        <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block font-bold">Ayuda</span>
                        <h2 className="text-2xl font-black italic tracking-tighter text-bravo-text uppercase">Preguntas Frecuentes</h2>
                        <p className="text-bravo-text-muted text-xs mt-1">Todo lo que necesitas saber sobre nuestro proceso y tiempos de trabajo.</p>
                      </div>

                      {!config || !config.faqs || config.faqs.length === 0 ? (
                        <div className="border border-bravo-border bg-bravo-card p-8 rounded-xl text-center space-y-2">
                          <p className="text-bravo-text-muted text-xs">No hay preguntas frecuentes registradas en este momento.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {config.faqs.map((faq, index) => {
                            const isOpen = openFaqIndex === index
                            return (
                              <div 
                                key={index}
                                className="bg-bravo-card border border-bravo-border rounded-2xl overflow-hidden transition-all text-left"
                              >
                                <button
                                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-bravo-text hover:text-bravo-accent transition-colors bg-transparent border-none cursor-pointer focus:outline-none"
                                >
                                  <span>{faq.q}</span>
                                  {isOpen ? (
                                    <ChevronUp size={16} className="text-bravo-accent shrink-0 ml-2" />
                                  ) : (
                                    <ChevronDown size={16} className="text-bravo-text-muted shrink-0 ml-2" />
                                  )}
                                </button>
                                
                                <AnimatePresence initial={false}>
                                  {isOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="border-t border-bravo-border/60 bg-stone-50/50"
                                    >
                                      <p className="px-5 py-4 text-xs sm:text-sm text-bravo-text-muted leading-relaxed whitespace-pre-line">
                                        {faq.a}
                                      </p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main 3D Info Content (Always visible when tab is 'home') */}
          <div className={`flex-grow relative flex flex-col items-center justify-center transition-all duration-500 z-10 ${
            activeTab === 'home' ? 'opacity-100 scale-100 pointer-events-none' : 'opacity-20 scale-95 pointer-events-none lg:mr-[600px]'
          }`}>
            <div className="max-w-3xl text-center px-6 pointer-events-auto">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-bravo-accent/30 bg-[#fffdf9]/70 backdrop-blur-md mb-6 shadow-xs">
                <Sparkles size={12} className="text-bravo-accent animate-spin" />
                <p className="text-[9px] font-extrabold tracking-[0.25em] text-amber-900 uppercase font-mono">Creative_Studio • Personalizaciones</p>
              </div>

              {/* Headline */}
              <h2 className="text-4xl sm:text-6xl font-black italic tracking-tighter mb-5 text-bravo-text leading-none uppercase select-text">
                ESTAMPADOS & <br/>
                <span className="text-transparent bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text">DISEÑOS ÚNICOS</span>
              </h2>
              
              {/* Description */}
              <p className="text-sm sm:text-base text-bravo-text-muted max-w-xl mx-auto leading-relaxed select-text font-medium">
                Diseño textil de primer nivel, indumentaria corporativa, gorras y tazones publicitarios. Explora nuestro catálogo y cotiza tus diseños en un par de clics con total transparencia.
              </p>
              
              {/* CTA Buttons in the center (visible on all screens to improve UX) */}
              <div className="mt-8 flex justify-center gap-4 flex-wrap">
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="px-6 py-3 bg-[#fffdf9]/80 border border-bravo-accent/30 text-[#2c1810] font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-[#fffdf9] hover:border-bravo-accent shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <ShoppingBag size={14} className="text-bravo-accent" />
                  Ver Catálogo
                </button>
                <button
                  onClick={() => setActiveTab('quote')}
                  className="px-6 py-3 bg-bravo-accent hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Send size={14} />
                  Cotizar Diseño
                </button>
              </div>
            </div>

            {/* Scroll/Drag Hint */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 pointer-events-none">
              <span className="text-[8px] font-black tracking-[0.35em] text-[#8b6c52] font-mono uppercase">ARRASTRA PARA ROTAR MENÚ 3D</span>
              <span className="material-symbols-outlined text-bravo-accent animate-bounce text-sm">expand_more</span>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: COMPRA RÁPIDA / PEDIDO EN LÍNEA */}
      <AnimatePresence>
        {showOrderModal && orderProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-bravo-card border border-bravo-border rounded-2xl p-6 w-full max-w-md shadow-2xl backdrop-blur-xl my-8 relative"
            >
              <div className="flex justify-between items-center mb-4 border-b border-bravo-border/60 pb-3">
                <div className="text-left">
                  <span className="text-[9px] text-bravo-accent tracking-widest font-mono font-bold uppercase block">Pedido Express</span>
                  <h3 className="text-lg font-black text-bravo-text uppercase tracking-wider">Pedir en Línea</h3>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-1.5 rounded-lg border border-bravo-border bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Product Brief */}
              <div className="flex gap-4 p-3 bg-stone-900/10 border border-bravo-border rounded-xl items-center mb-4 text-left">
                <div className="w-16 h-16 bg-bravo-input border border-bravo-border rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  {orderProduct.image_url ? (
                    <img 
                      src={orderProduct.image_url.startsWith('http') ? orderProduct.image_url : `${api.defaults.baseURL}${orderProduct.image_url}`} 
                      alt={orderProduct.name} 
                      className="object-contain max-h-full max-w-full" 
                    />
                  ) : (
                    <ShoppingBag size={20} className="text-stone-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-bravo-text leading-tight">{orderProduct.name}</h4>
                  <p className="text-xs text-bravo-accent font-black mt-1">${parseFloat(orderProduct.sale_price).toLocaleString('es-CL')}</p>
                </div>
              </div>

              <form onSubmit={handleOrderSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent uppercase block font-bold">Nombre Completo *</label>
                  <input
                    type="text"
                    value={orderForm.client_name}
                    onChange={e => setOrderForm({ ...orderForm, client_name: e.target.value })}
                    required
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent uppercase block font-bold">WhatsApp / Teléfono *</label>
                    <input
                      type="text"
                      value={orderForm.client_phone}
                      onChange={e => setOrderForm({ ...orderForm, client_phone: e.target.value })}
                      required
                      placeholder="Ej: +56987654321"
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent uppercase block font-bold">Cantidad *</label>
                    <input
                      type="number"
                      min="1"
                      value={orderForm.quantity}
                      onChange={e => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })}
                      required
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent uppercase block font-bold">Email (Opcional)</label>
                  <input
                    type="email"
                    value={orderForm.client_email}
                    onChange={e => setOrderForm({ ...orderForm, client_email: e.target.value })}
                    placeholder="juan.perez@email.com"
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent uppercase block font-bold">Notas o Indicaciones</label>
                  <textarea
                    rows="2"
                    value={orderForm.notes}
                    onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                    placeholder="Especifica colores, tallas o detalles adicionales..."
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  />
                </div>

                {orderError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{orderError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={orderLoading}
                  className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md"
                >
                  {orderLoading ? 'Procesando Pedido...' : 'Confirmar Pedido'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante de Chatbot WhatsApp */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-auto">
        
        {/* Botón General de WhatsApp */}
        <button
          onClick={() => {
            const cleanNum = config?.whatsapp ? config.whatsapp.replace(/[^0-9]/g, '') : '56987654321'
            window.open(`https://wa.me/${cleanNum}?text=Hola%20Bravo%20Estampados!%20Deseo%20hacer%20una%20consulta%20o%20cotizacion.`, '_blank')
          }}
          className="w-13 h-13 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer group relative"
          title="Escríbenos por WhatsApp"
          type="button"
        >
          <Phone size={22} className="animate-pulse" />
          <span className="absolute right-15 bg-[#2c1810]/95 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-bravo-border/50 whitespace-nowrap shadow-md">
            WhatsApp Directo
          </span>
        </button>

        {/* Botón del Chatbot */}
        <button
          onClick={() => setShowChatbot(!showChatbot)}
          className={`w-13 h-13 rounded-full text-white flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer relative group ${
            showChatbot ? 'bg-rose-650 hover:bg-rose-700' : 'bg-bravo-accent hover:bg-amber-600'
          }`}
          type="button"
        >
          {showChatbot ? <X size={22} /> : <MessageCircle size={22} />}
          
          {!showChatbot && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bravo-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
          <span className="absolute right-15 bg-[#2c1810]/95 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-bravo-border/50 whitespace-nowrap shadow-md">
            Asistente Virtual Bravo
          </span>
        </button>
      </div>

      {/* Ventana de Chatbot */}
      <AnimatePresence>
        {showChatbot && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-20 right-4 w-[330px] sm:w-[360px] h-[480px] bg-bravo-card border border-bravo-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 pointer-events-auto backdrop-blur-xl"
          >
            {/* Header del Chat */}
            <div className="bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-3 flex items-center justify-between text-white border-b border-bravo-border/20">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">
                  🤖
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono tracking-wide uppercase">Asistente Bravo</h4>
                  <span className="text-[9px] text-amber-200/90 font-mono tracking-widest uppercase">Sistema Automatizado</span>
                </div>
              </div>
              <button 
                onClick={() => setShowChatbot(false)} 
                className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer p-1 rounded hover:bg-white/10 transition-all"
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mensajes del Chat */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3 flex flex-col custom-scrollbar text-xs bg-stone-900/10">
              {chatMessages.map((msg) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div 
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${isBot ? 'self-start items-start' : 'self-end items-end'}`}
                  >
                    <div 
                      className={`p-3 rounded-2xl text-left leading-relaxed shadow-xs whitespace-pre-line border ${
                        isBot 
                          ? 'bg-[#2c1810]/40 border-bravo-border/60 text-bravo-text rounded-tl-xs animate-fade-in' 
                          : 'bg-bravo-accent border-bravo-accent text-white rounded-tr-xs animate-fade-in'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-bravo-text-muted/60 mt-1 px-1 font-mono">
                      {msg.time}
                    </span>
                  </div>
                );
              })}
              
              {isWriting && (
                <div className="self-start bg-[#2c1810]/40 border border-bravo-border/60 text-bravo-text p-2.5 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-bravo-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-bravo-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-bravo-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* Input de Mensaje */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-bravo-border/60 flex gap-2 bg-bravo-card items-center">
              <input 
                type="text" 
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Escribe un mensaje o número..." 
                className="flex-grow bg-bravo-input border border-bravo-border rounded-xl py-2 px-3.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
              />
              <button 
                type="submit"
                className="p-2 bg-bravo-accent hover:bg-amber-600 text-white rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Developer Subdomain Switcher */}
      {devToggle}
    </div>
  )
}
