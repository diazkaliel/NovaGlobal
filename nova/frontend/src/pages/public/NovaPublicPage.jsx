import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Search, Wrench, CheckCircle, Clock, AlertTriangle, 
  Smartphone, Laptop, Gamepad, Send, Info, MessageSquare,
  Calendar, ShieldCheck, Mail, Phone, User, MessageCircle,
  MapPin, Star, HelpCircle, ChevronDown, ChevronUp, Check, X
} from 'lucide-react'
import * as THREE from 'three'
import { 
  trackRepair, getWebConfig, 
  getPublicComments, createPublicComment, 
  simulateWhatsAppMessage, requestRepair,
  getTrackComments, createTrackComment
} from '../../api/public'


const STATUS_STEPS = [
  { key: 'recibido', label: 'Recibido', desc: 'Ingreso al servicio técnico' },
  { key: 'diagnostico', label: 'En Diagnóstico', desc: 'Revisión por personal técnico' },
  { key: 'en_reparacion', label: 'En Reparación', desc: 'Trabajo técnico en curso' },
  { key: 'listo', label: 'Listo para Retiro', desc: 'Reparación finalizada' },
  { key: 'entregado', label: 'Entregado', desc: 'Dispositivo retirado' }
]

const STATUS_LABELS = {
  recibido: { text: 'Recibido', color: 'bg-[#8aebff]/10 text-[#8aebff] border-[#8aebff]/30' },
  diagnostico: { text: 'En Diagnóstico', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  esperando_repuesto: { text: 'Esperando Repuesto', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  presupuesto_enviado: { text: 'Presupuesto Enviado', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  en_reparacion: { text: 'En Reparación', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  listo: { text: 'Listo para Retiro', color: 'bg-[#68fcbf]/10 text-[#68fcbf] border-[#68fcbf]/30' },
  entregado: { text: 'Entregado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
  cancelado: { text: 'Cancelado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  critico: { text: 'Crítico / Sin Solución', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  en_garantia: { text: 'En Garantía', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30 font-bold' }
}

const CAROUSEL_ITEMS = [
  { label: 'Inicio', emoji: '🏠', desc: 'Portada', color: 0x73d4e8 },
  { label: 'Celulares', emoji: '📱', desc: 'Precios Celular', color: 0x68fcbf },
  { label: 'Notebooks', emoji: '💻', desc: 'Precios Notebook', color: 0x73d4e8 },
  { label: 'Consolas', emoji: '🎮', desc: 'Precios Consola', color: 0x68fcbf },
  { label: 'Rastrear', emoji: '🔍', desc: 'Consultar Estado', color: 0x73d4e8 },
  { label: 'Contacto', emoji: '📞', desc: 'Ubicación y Fono', color: 0x68fcbf }
]

const DEFAULT_REFERENCE_PRICES = [
  { device: 'iPhone 13', service: 'Cambio de Pantalla OLED (OEM)', price: '$85.000', time: '2 horas', category: 'Celular' },
  { device: 'iPhone 14', service: 'Cambio de Pantalla OLED (Premium)', price: '$110.000', time: '2 horas', category: 'Celular' },
  { device: 'iPhone 11 / XR', service: 'Reemplazo de Batería (Original/Cert)', price: '$35.000', time: '1 hora', category: 'Celular' },
  { device: 'Samsung S22 Ultra', service: 'Cambio de Pantalla Curva Original', price: '$195.000', time: '3 horas', category: 'Celular' },
  { device: 'MacBook Air / Pro', service: 'Mantención Térmica & Limpieza Interna', price: '$45.000', time: '4 horas', category: 'Notebook' },
  { device: 'Notebook (Gamer/Oficina)', service: 'Reemplazo de Teclado', price: '$30.000 + repuesto', time: '24 horas', category: 'Notebook' },
  { device: 'Cualquier Laptop', service: 'Instalación SSD 500GB + Sistema Operativo', price: '$55.000', time: '3 horas', category: 'Notebook' },
  { device: 'PlayStation 5', service: 'Mantención Limpieza Profunda + Metal Líquido', price: '$49.000', time: '3 horas', category: 'Consola' },
  { device: 'Nintendo Switch', service: 'Reemplazo de Joystick Analógico (Drift)', price: '$15.000', time: '30 min', category: 'Consola' },
  { device: 'Nintendo Switch', service: 'Reparación de Puerto de Carga USB-C', price: '$35.000', time: '24 horas', category: 'Consola' },
  { device: 'PlayStation 4 / Xbox One', service: 'Mantención Térmica + Cambio Pasta MX-4', price: '$29.000', time: '2 horas', category: 'Consola' },
  { device: 'Placa Madre (iPhone/Mac/Console)', service: 'Micro-soldadura IC de Carga o Cortocircuito', price: '$60.000 - $120.000', time: '3-5 días', category: 'Placa' }
]

const DEFAULT_FAQS = [
  {
    q: '¿Qué garantía tienen las reparaciones?',
    a: 'Ofrecemos una garantía de 3 a 6 meses en todas nuestras reparaciones (excluyendo daños accidentales posteriores). Entregamos un ticket de garantía digital asociado a tu orden.'
  },
  {
    q: '¿Cobran por el diagnóstico de los equipos?',
    a: 'El diagnóstico es 100% gratuito si aceptas la cotización y realizas la reparación. Si decides retirar tu equipo tras el diagnóstico sin repararlo, se cobra un valor mínimo de revisión de $10.000 por el tiempo invertido en laboratorio.'
  },
  {
    q: '¿Mis datos personales y archivos están seguros?',
    a: 'Absolutamente. No requerimos la contraseña de tu equipo para la mayoría de las reparaciones básicas (como pantallas o baterías). Para reparaciones de sistema o de placa, respetamos tu privacidad de forma estricta bajo protocolos confidenciales.'
  },
  {
    q: '¿Utilizan repuestos originales o alternativos?',
    a: 'Ofrecemos ambas opciones según disponibilidad y modelo. Siempre te informaremos con transparencia el tipo de repuesto a utilizar (Original, Calidad OEM o Alternativo Certificado) para que decidas lo que mejor se ajuste a tu presupuesto.'
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos efectivo, transferencias bancarias, tarjetas de débito y crédito en cuotas a través de Webpay/Transbank de forma segura.'
  }
]

const ESTIMATOR_DATA = {
  celular: {
    label: 'Celular / Tablet',
    icon: 'Smartphone',
    issues: [
      { name: 'Pantalla Rota / Sin Imagen', desc: 'Reemplazo de pantalla calidad original u OEM.', priceRange: '$45.000 - $120.000', time: '1-2 horas' },
      { name: 'Batería Agotada (se apaga / dura poco)', desc: 'Cambio de batería con celdas de alta capacidad.', priceRange: '$25.000 - $45.000', time: '1 hora' },
      { name: 'Puerto de Carga Dañado / No Carga', desc: 'Reparación o cambio de conector USB-C / Lightning.', priceRange: '$15.000 - $35.000', time: '1-2 horas' },
      { name: 'No Enciende / Mojado / Falla de Placa', desc: 'Diagnóstico avanzado de micro-soldadura e integrados.', priceRange: '$45.000 - $95.000', time: '2-4 días' },
      { name: 'Cámara Dañada o Cristal Roto', desc: 'Reemplazo de lentes de cámara o módulo fotográfico.', priceRange: '$20.000 - $45.000', time: '2 horas' }
    ]
  },
  notebook: {
    label: 'Notebook / Computador',
    icon: 'Laptop',
    issues: [
      { name: 'Mantención Térmica & Limpieza Interna', desc: 'Limpieza profunda de ventiladores y cambio de pasta MX-4.', priceRange: '$25.000 - $45.000', time: '3 horas' },
      { name: 'Instalación SSD + Sistema Operativo', desc: 'Aceleración completa instalando SSD de 500GB o 1TB.', priceRange: '$45.000 - $75.000', time: '3-4 horas' },
      { name: 'Pantalla Rota / Rayada / Sin Video', desc: 'Cambio de pantalla LED o LCD compatible de alta resolución.', priceRange: '$70.000 - $150.000', time: '24 horas' },
      { name: 'Teclado Dañado / Faltan Teclas', desc: 'Reemplazo de teclado completo original o alternativo.', priceRange: '$25.000 - $55.000', time: '24 horas' },
      { name: 'Bisagras Rotas / Carcasa Dañada', desc: 'Reconstrucción o cambio de bisagras y cubiertas.', priceRange: '$30.000 - $60.000', time: '24-48 horas' }
    ]
  },
  consola: {
    label: 'Consola de Videojuegos',
    icon: 'Gamepad',
    issues: [
      { name: 'Mantención Limpieza + Metal Líquido / MX-4', desc: 'Especialmente para PS5, Xbox Series o PS4. Reduce ruido.', priceRange: '$29.000 - $49.000', time: '2-3 horas' },
      { name: 'Joystick Drift (Falla palanca de mando)', desc: 'Reemplazo del potenciómetro análogo original del control.', priceRange: '$15.000 - $25.000', time: '1 hora' },
      { name: 'Puerto HDMI Quebrado / Sin Imagen', desc: 'Desoldado y reemplazo del conector HDMI en placa madre.', priceRange: '$35.000 - $55.000', time: '24 horas' },
      { name: 'Lector de Discos / Falla de Software', desc: 'Solución a errores de actualización o cambio de lector.', priceRange: '$35.000 - $60.000', time: '24-48 horas' },
      { name: 'Falla de Fuente de Poder / Cortocircuito', desc: 'Reparación de placa o cambio de fuente de alimentación.', priceRange: '$40.000 - $80.000', time: '2-4 días' }
    ]
  }
}

export default function NovaPublicPage({ devToggle }) {
  const [activeTab, setActiveTab] = useState('home') // home, track
  
  // Track State
  const [orderNumber, setOrderNumber] = useState('')
  const [rutOrPhone, setRutOrPhone] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [trackLoading, setTrackLoading] = useState(false)

  // Order/Repair Chat Comments State
  const [orderComments, setOrderComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  // Web Config State (Dynamic)
  const [whatsappNumber, setWhatsappNumber] = useState('+56 9 46528858')
  const [phoneNumber, setPhoneNumber] = useState('+56 9 46528858')
  const [emailAddress, setEmailAddress] = useState('soporte@novaglobal.cl')
  const [physicalAddress, setPhysicalAddress] = useState('Calle Prat 321, Oficina 3, Quillota')
  const [referencePrices, setReferencePrices] = useState(DEFAULT_REFERENCE_PRICES)
  const [faqs, setFaqs] = useState(DEFAULT_FAQS)

  // Comments State
  const [comments, setComments] = useState([])
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)
  const [newComment, setNewComment] = useState({ client_name: '', rating: 5, comment: '' })
  const [commentSuccess, setCommentSuccess] = useState('')
  const [commentError, setCommentError] = useState('')

  // Chatbot State
  const [showChatbot, setShowChatbot] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '🤖 *¡Hola! Bienvenido al asistente virtual de NovaGlobal.*\n\nEstoy aquí para ayudarte. Por favor, selecciona una de las siguientes opciones escribiendo el número correspondiente:\n\n1️⃣ *Consultar estado de reparación* 🛠️\n2️⃣ *Preguntas frecuentes (FAQs)* ❓\n3️⃣ *Ubicación y contacto* 📍\n4️⃣ *Cotizar una reparación* 💰',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isWriting, setIsWriting] = useState(false)

  // Store Status State
  const [storeStatus, setStoreStatus] = useState({ open: false, msg: '' })

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  // Reference prices filter state
  const [priceSearch, setPriceSearch] = useState('')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos')

  // Mobile and Carousel Detection
  const [isMobile, setIsMobile] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Estimator State
  const [estimatorStep, setEstimatorStep] = useState(1) // 1: Device, 2: Falla, 3: Form, 4: Exito
  const [selectedDeviceType, setSelectedDeviceType] = useState('') // celular, notebook, consola
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [estimatorForm, setEstimatorForm] = useState({ client_name: '', client_phone: '', notes: '' })
  const [estimatorLoading, setEstimatorLoading] = useState(false)
  const [estimatorSuccess, setEstimatorSuccess] = useState(null)
  const [estimatorError, setEstimatorError] = useState('')

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

  // Keep active tab ref updated for Three.js loop
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Fetch web configuration and comments on mount
  useEffect(() => {
    const fetchConfigAndComments = async () => {
      try {
        const configResp = await getWebConfig()
        if (configResp.data) {
          setWhatsappNumber(configResp.data.whatsapp || '+56 9 46528858')
          setPhoneNumber(configResp.data.phone || '+56 9 46528858')
          setEmailAddress(configResp.data.email || 'soporte@novaglobal.cl')
          setPhysicalAddress(configResp.data.address || 'Calle Prat 321, Oficina 3, Quillota')
          if (configResp.data.reference_prices && configResp.data.reference_prices.length > 0) {
            setReferencePrices(configResp.data.reference_prices)
          }
          if (configResp.data.faqs && configResp.data.faqs.length > 0) {
            setFaqs(configResp.data.faqs)
          }
        }
      } catch (err) {
        console.error('Error cargando configuración web dinámica:', err)
      }

      try {
        const commentsResp = await getPublicComments()
        if (commentsResp.data) {
          setComments(commentsResp.data)
        }
      } catch (err) {
        console.error('Error cargando comentarios públicos:', err)
      }
    }
    
    fetchConfigAndComments()
  }, [])


  // Mouse move ambient glow handler
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    e.currentTarget.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(115, 212, 232, 0.03) 0%, transparent 40%), #0a0a0c`
  }

  // Calculate opening hours dynamically
  useEffect(() => {
    const updateStoreStatus = () => {
      const now = new Date()
      const day = now.getDay() // 0: Sunday, 1: Monday, ..., 6: Saturday
      const hour = now.getHours()
      const minutes = now.getMinutes()
      const timeVal = hour + minutes / 60

      if (day === 0) {
        setStoreStatus({ open: false, msg: 'CERRADO - Abrimos el Lunes a las 09:00' })
      } else if (day === 6) { // Saturday
        if (timeVal >= 10 && timeVal < 14) {
          setStoreStatus({ open: true, msg: 'ABIERTO AHORA - Cerramos a las 14:00' })
        } else {
          setStoreStatus({ open: false, msg: 'CERRADO - Abrimos el Lunes a las 09:00' })
        }
      } else { // Monday to Friday
        if (timeVal >= 9 && timeVal < 19) {
          setStoreStatus({ open: true, msg: 'ABIERTO AHORA - Cerramos a las 19:00' })
        } else {
          const openMsg = timeVal < 9 ? 'CERRADO - Abrimos hoy a las 09:00' : 'CERRADO - Abrimos mañana a las 09:00'
          setStoreStatus({ open: false, msg: openMsg })
        }
      }
    }

    updateStoreStatus()
    const timer = setInterval(updateStoreStatus, 60000)
    return () => clearInterval(timer)
  }, [])

  // Helper to scroll to section
  const scrollToSection = (id) => {
    setActiveTab('home') // Reset tab to home to ensure sections are visible
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  // Initializing Three.js Carousel
  useEffect(() => {
    if (isMobile) return
    if (!mountRef.current) return

    const container = mountRef.current
    let width = container.clientWidth || 400
    let height = container.clientHeight || 450

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000)
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0x73d4e8, 1.8)
    dirLight.position.set(0, 10, 10)
    scene.add(dirLight)

    const radius = 4.8
    const itemsList = []

    const createCardTexture = (label, emoji, colorHex) => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 384
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = '#111113'
      ctx.fillRect(0, 0, 256, 384)

      ctx.strokeStyle = colorHex
      ctx.lineWidth = 10
      ctx.strokeRect(0, 0, 256, 384)

      ctx.strokeStyle = 'rgba(115, 212, 232, 0.05)'
      ctx.lineWidth = 1
      for (let i = 20; i < 256; i += 20) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, 384)
        ctx.stroke()
      }

      ctx.font = '76px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, 128, 140)

      ctx.fillStyle = '#e5e1e4'
      ctx.font = 'bold 24px "Sora", sans-serif'
      ctx.fillText(label, 128, 250)

      ctx.fillStyle = 'rgba(229, 225, 228, 0.4)'
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.fillText('NOVA CHILE', 128, 290)

      const texture = new THREE.CanvasTexture(canvas)
      return texture
    }

    CAROUSEL_ITEMS.forEach((opt, i) => {
      const angle = (i / CAROUSEL_ITEMS.length) * Math.PI * 2
      const cardGroup = new THREE.Group()

      const geometry = new THREE.PlaneGeometry(2.3, 3.2)
      const colorHex = opt.color === 0x68fcbf ? '#68fcbf' : '#73d4e8'
      const texture = createCardTexture(opt.label, opt.emoji, colorHex)
      
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        shininess: 80,
        specular: opt.color,
        side: THREE.DoubleSide
      })

      const card = new THREE.Mesh(geometry, material)
      cardGroup.add(card)

      const edges = new THREE.EdgesGeometry(geometry)
      const lineMaterial = new THREE.LineBasicMaterial({ color: opt.color, linewidth: 2 })
      const line = new THREE.LineSegments(edges, lineMaterial)
      cardGroup.add(line)

      cardGroup.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
      group.add(cardGroup)
      itemsList.push({ mesh: cardGroup, angle: angle, data: opt })
    })

    camera.position.z = 11

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
      targetRotation += delta * 0.005
      previousMouseX = e.clientX
    }

    const handleMouseUpGL = (e) => {
      isDragging = false
      const clickDist = Math.abs(e.clientX - startMouseX)
      if (clickDist < 5) {
        triggerRaycast(e.clientX, e.clientY)
      }
    }

    const handleTouchStart = (e) => {
      isDragging = true
      startMouseX = e.touches[0].clientX
      previousMouseX = e.touches[0].clientX
    }

    const handleTouchMove = (e) => {
      if (!isDragging) return
      const delta = e.touches[0].clientX - previousMouseX
      targetRotation += delta * 0.005
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
          const found = itemsList.find(item => item.mesh === obj)
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
        scrollToSection('inicio-seccion')
      } else if (itemData.label === 'Rastrear') {
        setActiveTab('track')
      } else if (itemData.label === 'Contacto') {
        scrollToSection('contacto-seccion')
      } else if (itemData.label === 'Celulares') {
        setActiveCategoryFilter('Celular')
        scrollToSection('precios-seccion')
      } else if (itemData.label === 'Notebooks') {
        setActiveCategoryFilter('Notebook')
        scrollToSection('precios-seccion')
      } else if (itemData.label === 'Consolas') {
        setActiveCategoryFilter('Consola')
        scrollToSection('precios-seccion')
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

      currentRotation += (targetRotation - currentRotation) * 0.1
      group.rotation.z = currentRotation

      camera.position.x += (0 - camera.position.x) * 0.08
      camera.position.y += (0 - camera.position.y) * 0.08
      camera.position.z += (11 - camera.position.z) * 0.08

      if (!isDragging) {
        targetRotation += 0.002
      }

      itemsList.forEach((item) => {
        item.mesh.rotation.z = -group.rotation.z
        item.mesh.position.y = Math.sin(Date.now() * 0.001 + item.angle) * 0.08 + Math.sin(item.angle) * radius
        item.mesh.position.x = Math.cos(item.angle) * radius
      })

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!container) return
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

  // Handle Track Search
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
      setTrackError(err.response?.data?.detail || 'No se encontró la orden con los datos ingresados.')
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


  // Handle Estimator Submit
  const handleEstimatorSubmit = async (e) => {
    e.preventDefault()
    if (!estimatorForm.client_name || !estimatorForm.client_phone) {
      setEstimatorError('Por favor ingresa tu nombre y teléfono.')
      return
    }
    setEstimatorLoading(true)
    setEstimatorError('')
    setEstimatorSuccess(null)
    
    try {
      const payload = {
        client_name: estimatorForm.client_name,
        client_phone: estimatorForm.client_phone,
        client_email: null,
        client_rut: null,
        client_city: null,
        device_type: selectedDeviceType === 'celular' ? 'Celular' : selectedDeviceType === 'notebook' ? 'Notebook' : 'Consola',
        brand: 'Cotizador Express',
        model: selectedIssue.name,
        reported_issue: `Cotizado por Estimador Web. Falla: ${selectedIssue.name}. Rango Estimado: ${selectedIssue.priceRange}. Tiempo Estimado: ${selectedIssue.time}. Notas: ${estimatorForm.notes || 'Ninguna.'}`,
        accessories: 'Ninguno'
      }
      
      const response = await requestRepair(payload)
      setEstimatorSuccess(response.data)
      setEstimatorStep(4) // Ir a pantalla de éxito
    } catch (err) {
      setEstimatorError(err.response?.data?.detail || 'Error al agendar el diagnóstico. Por favor intenta de nuevo.')
    } finally {
      setEstimatorLoading(false)
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

  // Toggle FAQ Accordion
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  // Filter Prices
  const filteredPrices = referencePrices.filter(item => {
    const matchesCategory = activeCategoryFilter === 'Todos' || item.category === activeCategoryFilter
    const matchesSearch = item.device.toLowerCase().includes(priceSearch.toLowerCase()) || 
                          item.service.toLowerCase().includes(priceSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Open WhatsApp chat when clicking Quote
  const handleSelectPriceForQuote = (item) => {
    const message = `Hola Nova Tecnologies! Quiero cotizar la reparación de: ${item.service} para ${item.device}.`
    const encodedMsg = encodeURIComponent(message)
    const cleanNum = whatsappNumber.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanNum}?text=${encodedMsg}`, '_blank')
  }

  // Handle Comment Submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.client_name.trim() || !newComment.comment.trim()) {
      setCommentError('Por favor completa todos los campos obligatorios.')
      return
    }
    setCommentLoading(true)
    setCommentError('')
    setCommentSuccess('')
    try {
      await createPublicComment(newComment)
      setCommentSuccess('¡Comentario enviado con éxito! Se publicará después de la moderación administrativa.')
      setNewComment({ client_name: '', rating: 5, comment: '' })
      setTimeout(() => {
        setShowCommentModal(false)
        setCommentSuccess('')
      }, 4000)
    } catch (err) {
      setCommentError(err.response?.data?.detail || 'Error al enviar el comentario. Intenta de nuevo.')
    } finally {
      setCommentLoading(false)
    }
  }

  // Handle WhatsApp Chatbot messages
  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const userMsgText = inputMessage.trim()
    setInputMessage('')
    
    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setChatMessages(prev => [...prev, userMsg])
    setIsWriting(true)

    try {
      const response = await simulateWhatsAppMessage({ message: userMsgText, phone: 'user_web' })
      setTimeout(() => {
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.data.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, botMsg])
        setIsWriting(false)
      }, 700)
    } catch (err) {
      setIsWriting(false)
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: '❌ *Error de conexión:* No se pudo procesar el mensaje con el chatbot.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages(prev => [...prev, errorMsg])
    }
  }


  return (
    <div 
      className="min-h-screen text-[#e5e1e4] flex flex-col lg:flex-row h-auto lg:h-screen overflow-y-auto lg:overflow-hidden relative select-none font-sora"
      onMouseMove={handleMouseMove}
      style={{ backgroundColor: '#0a0a0c', transition: 'background 0.1s ease' }}
    >
      
      {/* Cyberpunk CSS Styles injection */}
      <style>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glass-card-hover:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-4px);
          border-top: 1px solid #73d4e8;
          box-shadow: 0 10px 30px -10px rgba(115, 212, 232, 0.2);
        }
        .light-leak-border {
          border-top: 1px solid transparent;
          border-image: linear-gradient(to right, #73d4e8, transparent) 1;
        }
        .text-glow {
          text-shadow: 0 0 15px rgba(115, 212, 232, 0.4);
        }
        .mono-text {
          font-family: 'JetBrains Mono', monospace;
        }
        .glow-cyan {
          text-shadow: 0 0 10px rgba(115, 212, 232, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(115, 212, 232, 0.3);
        }
      `}</style>

      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col h-full py-8 border-r border-white/10 bg-[#0e0e10] w-64 shrink-0 z-50 pointer-events-auto">
        <div className="px-6 mb-12">
          <div className="text-2xl font-extrabold text-white tracking-widest glow-cyan italic leading-none">NOVA<br/><span className="text-[10px] tracking-wider not-italic font-bold text-gray-500 font-sans">TECNOLOGIES</span></div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => { scrollToSection('inicio-seccion'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer border-none bg-transparent ${
              activeTab === 'home' ? 'text-[#73d4e8] border-l-2 border-[#73d4e8] bg-[#2a2a2c]/20 font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">dashboard</span>
            <span>INICIO</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('track'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer border-none bg-transparent ${
              activeTab === 'track' ? 'text-[#73d4e8] border-l-2 border-[#73d4e8] bg-[#2a2a2c]/20 font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">search</span>
            <span>RASTREAR</span>
          </button>

          <button 
            onClick={() => { scrollToSection('contacto-seccion'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer border-none bg-transparent text-gray-400 hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">phone</span>
            <span>CONTACTAR</span>
          </button>
        </nav>

        <div className="px-4 mt-auto space-y-4">
          <button 
            onClick={() => setActiveTab('track')}
            className="w-full py-3 px-4 glass-panel border-white/10 rounded-lg text-[#73d4e8] text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
            ESCANEAR_CÓDIGO
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col relative overflow-hidden pointer-events-none">
        
        {/* Top Navigation */}
        <header className="flex flex-row justify-between items-center w-full px-4 sm:px-8 py-3 md:h-16 bg-[#131315]/90 backdrop-blur-xl border-b border-white/10 z-50 pointer-events-auto gap-2">
          <div className="flex items-center gap-3 sm:gap-8">
            <div className="text-sm sm:text-xl font-bold tracking-tighter text-white uppercase shrink-0">NOVA</div>
            <div className="flex items-center gap-3 sm:gap-6">
              <button onClick={() => { scrollToSection('inicio-seccion'); setActiveTab('home'); }} className={`text-[10px] sm:text-xs font-bold transition-all border-none bg-transparent cursor-pointer ${activeTab === 'home' ? 'text-[#73d4e8] border-b border-[#73d4e8] pb-0.5' : 'text-gray-400 hover:text-white'}`}>Inicio</button>
              <button onClick={() => setActiveTab('track')} className={`text-[10px] sm:text-xs font-bold transition-all border-none bg-transparent cursor-pointer ${activeTab === 'track' ? 'text-[#73d4e8] border-b border-[#73d4e8] pb-0.5' : 'text-gray-400 hover:text-white'}`}>Rastrear</button>
              <button onClick={() => { scrollToSection('contacto-seccion'); setActiveTab('home'); }} className="text-[10px] sm:text-xs font-bold transition-all border-none bg-transparent cursor-pointer text-gray-400 hover:text-white">Contacto</button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="relative hidden md:block">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input 
                type="text" 
                value={orderNumber}
                onChange={(e) => {
                  setOrderNumber(e.target.value)
                  if(activeTab !== 'track') setActiveTab('track')
                }}
                placeholder="Rastrear Orden..." 
                className="bg-white/5 border border-white/10 rounded-full py-1 pl-10 pr-4 text-xs focus:outline-none focus:border-[#73d4e8]/50 w-48 text-white animate-pulse"
              />
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('dev_override')
                window.location.href = '/'
              }}
              className="text-[10px] sm:text-xs font-bold text-gray-400 hover:text-white border border-white/10 px-2.5 sm:px-4 py-1.5 rounded-full hover:border-white/30 transition-all flex items-center gap-1.5 cursor-pointer z-50 pointer-events-auto"
            >
              Portal
            </button>
            <Link 
              to="/login"
              className="text-[10px] sm:text-xs font-bold text-gray-400 hover:text-[#73d4e8] border border-white/10 px-2.5 sm:px-4 py-1.5 rounded-full hover:border-[#73d4e8]/40 transition-all flex items-center gap-1 z-50 pointer-events-auto"
            >
              <User size={12} />
              <span className="hidden xs:inline">Técnicos</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Scrollable Content Area */}
        <section className="flex-grow overflow-y-auto pointer-events-auto z-10 relative scroll-smooth flex flex-col custom-scrollbar">
          
          {/* SECTION 1: HERO (Split Screen) */}
          <div id="inicio-seccion" className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-8 py-12 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
              
              {/* Left Info Panel */}
              <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8aebff]/10 border border-[#8aebff]/20">
                  <span className="w-2 h-2 rounded-full bg-[#68fcbf] animate-pulse"></span>
                  <span className="text-[10px] font-mono tracking-widest text-[#8aebff] uppercase">SISTEMA_ONLINE</span>
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter text-glow text-white leading-none uppercase">
                  SERVICIO TÉCNICO <br/>
                  <span className="text-[#8aebff] font-sans font-bold not-italic">ESPECIALIZADO</span>
                </h1>
                
                <p className="text-xs sm:text-sm text-gray-400 max-w-lg leading-relaxed">
                  Laboratorio de microelectrónica avanzado para dispositivos móviles, notebooks y consolas en Quillota. Consulta el progreso de tu orden en tiempo real con transparencia absoluta o cotiza directo con nuestros técnicos.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    onClick={() => {
                      const cleanNum = whatsappNumber.replace(/[^0-9]/g, '')
                      window.open(`https://wa.me/${cleanNum}?text=Hola%20Nova%20Tecnologies!%20Deseo%20cotizar%20una%20reparacion.`, '_blank')
                    }}
                    className="px-6 py-3 bg-[#8aebff] hover:bg-[#8aebff]/95 text-[#001f25] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(138,235,255,0.25)] flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    <Smartphone size={14} />
                    Cotizar por WhatsApp
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('track')}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Search size={14} />
                    Rastrear mi Orden
                  </button>
                </div>
              </div>

              {/* Right Interactive 3D Canvas */}
              <div className="lg:col-span-5 relative w-full h-[400px] sm:h-[450px] md:h-[500px] flex items-center justify-center bg-white/[0.01] rounded-3xl border border-white/5 backdrop-blur-sm overflow-hidden group">
                {!isMobile ? (
                  <div 
                    ref={mountRef} 
                    className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
                    id="threejs-container-ANIMATION_18"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={carouselIndex}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="w-full max-w-[280px] bg-[#131316] border border-[#73d4e8]/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative"
                      >
                        <div className="absolute top-3 right-3 text-[9px] font-mono text-[#73d4e8] bg-[#73d4e8]/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          Nova Chile
                        </div>
                        <div className="text-6xl pt-2">{CAROUSEL_ITEMS[carouselIndex].emoji}</div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-white uppercase tracking-tight">{CAROUSEL_ITEMS[carouselIndex].label}</h4>
                          <p className="text-xs text-gray-400 font-medium leading-relaxed">{CAROUSEL_ITEMS[carouselIndex].desc}</p>
                        </div>
                        <div className="pt-2 text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                          • LAB MÓVIL •
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCarouselIndex(prev => (prev === 0 ? CAROUSEL_ITEMS.length - 1 : prev - 1))}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-all text-sm font-bold"
                        type="button"
                      >
                        ←
                      </button>
                      <button 
                        onClick={() => setCarouselIndex(prev => (prev === CAROUSEL_ITEMS.length - 1 ? 0 : prev + 1))}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-all text-sm font-bold"
                        type="button"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Floating instruction badge */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity select-none pointer-events-none text-center">
                  <span className="text-[9px] font-mono tracking-widest text-[#8aebff] uppercase">
                    {!isMobile ? "ARRASTRA PARA ROTAR SISTEMAS" : "TARJETAS INTERACTIVAS DISPONIBLES"}
                  </span>
                  <span className="text-[8px] text-gray-500 font-mono">HAZ CLIC EN UNA TARJETA PARA OPERAR</span>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION: ESTIMADOR DE COTIZACIÓN INTERACTIVO */}
          <div id="cotizador-seccion" className="py-20 px-4 sm:px-8 border-t border-white/5 bg-[#070709]">
            <div className="max-w-4xl mx-auto w-full space-y-10">
              
              <div className="text-center space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">PRESUPUESTO INMEDIATO</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">ESTIMADOR DE COTIZACIÓN</h2>
                <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">Calcula al instante el valor aproximado de tu reparación y agenda un diagnóstico gratuito de laboratorio.</p>
              </div>

              {/* Progress Steps Indicator */}
              <div className="flex justify-between items-center max-w-md mx-auto relative px-2">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                <div 
                  className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-[#8aebff] to-[#68fcbf] -translate-y-1/2 z-0 transition-all duration-300"
                  style={{ width: `${((estimatorStep - 1) / 3) * 100}%` }}
                />
                
                {[1, 2, 3, 4].map((stepNum) => (
                  <div 
                    key={stepNum}
                    className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                      estimatorStep >= stepNum 
                        ? 'bg-slate-900 border-[#8aebff] text-[#8aebff] shadow-[0_0_10px_rgba(138,235,255,0.2)]' 
                        : 'bg-[#111113] border-white/5 text-gray-500'
                    }`}
                  >
                    {stepNum === 4 && estimatorStep === 4 ? '✓' : stepNum}
                  </div>
                ))}
              </div>

              {/* Wizard Content Card */}
              <div className="bg-slate-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                
                <AnimatePresence mode="wait">
                  {/* STEP 1: DEVICE SELECTION */}
                  {estimatorStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 text-center"
                    >
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider">1. ¿Qué tipo de dispositivo deseas reparar?</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        {Object.entries(ESTIMATOR_DATA).map(([key, data]) => {
                          const isSelected = selectedDeviceType === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setSelectedDeviceType(key);
                                setEstimatorStep(2);
                              }}
                              className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center space-y-4 group cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#8aebff]/10 border-[#8aebff] text-[#8aebff] shadow-[0_0_15px_rgba(138,235,255,0.15)]' 
                                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:text-white hover:bg-white/[0.03]'
                              }`}
                            >
                              <div className={`p-4 rounded-xl transition-all duration-300 ${
                                isSelected ? 'bg-[#8aebff]/20 text-[#8aebff]' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'
                              }`}>
                                {key === 'celular' ? <Smartphone size={28} /> : key === 'notebook' ? <Laptop size={28} /> : <Gamepad size={28} />}
                              </div>
                              <span className="font-bold text-sm tracking-wide uppercase">{data.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: ISSUE SELECTION */}
                  {estimatorStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                          2. Selecciona la falla o síntoma
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEstimatorStep(1);
                            setSelectedIssue(null);
                          }}
                          className="text-xs text-[#8aebff] hover:underline font-mono bg-transparent border-none cursor-pointer"
                        >
                          &larr; Volver
                        </button>
                      </div>

                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {ESTIMATOR_DATA[selectedDeviceType]?.issues.map((issue, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedIssue(issue);
                              setEstimatorStep(3);
                            }}
                            className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-[#8aebff]/30 text-left transition-all duration-200 flex justify-between items-center group cursor-pointer"
                          >
                            <div className="space-y-1 max-w-[75%]">
                              <h4 className="font-bold text-white text-sm group-hover:text-[#8aebff] transition-colors">{issue.name}</h4>
                              <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{issue.desc}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-[#68fcbf] font-bold text-xs sm:text-sm font-mono">{issue.priceRange}</div>
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center justify-end gap-1">
                                <Clock size={10} />
                                {issue.time}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: CONTACT FORM & ESTIMATE SUMMARY */}
                  {estimatorStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                          3. Confirmar Datos de Agenda
                        </h3>
                        <button
                          type="button"
                          onClick={() => setEstimatorStep(2)}
                          className="text-xs text-[#8aebff] hover:underline font-mono bg-transparent border-none cursor-pointer"
                        >
                          &larr; Volver
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Summary side */}
                        <div className="md:col-span-5 bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                          <span className="text-[9px] font-mono tracking-widest text-gray-500 uppercase font-bold">Resumen de Cotización</span>
                          <div className="space-y-3">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-gray-500 uppercase font-mono">Dispositivo</span>
                              <p className="text-xs font-bold text-white uppercase">{ESTIMATOR_DATA[selectedDeviceType]?.label}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-gray-500 uppercase font-mono">Falla / Servicio</span>
                              <p className="text-xs font-bold text-white">{selectedIssue?.name}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-gray-500 uppercase font-mono">Precio Estimado</span>
                              <p className="text-sm font-black text-[#68fcbf] font-mono">{selectedIssue?.priceRange}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-gray-500 uppercase font-mono">Tiempo Estimado</span>
                              <p className="text-xs font-bold text-white flex items-center gap-1">
                                <Clock size={11} className="text-[#8aebff]" />
                                {selectedIssue?.time}
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-[#68fcbf]/10 border border-[#68fcbf]/20 rounded-xl p-3 text-[10px] text-[#68fcbf] leading-relaxed font-medium">
                            💡 **Diagnóstico Gratuito:** El diagnóstico inicial es gratis si realizas el servicio. Si prefieres retirar sin reparar, solo pagas $10.000 por la revisión.
                          </div>
                        </div>

                        {/* Form side */}
                        <form onSubmit={handleEstimatorSubmit} className="md:col-span-7 space-y-4 text-left">
                          {estimatorError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                              <AlertTriangle size={14} />
                              {estimatorError}
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 uppercase font-mono font-bold">Nombre Completo *</label>
                            <input 
                              type="text" 
                              required
                              value={estimatorForm.client_name}
                              onChange={(e) => setEstimatorForm({...estimatorForm, client_name: e.target.value})}
                              placeholder="Ej: Juan Pérez"
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#8aebff]/50"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 uppercase font-mono font-bold">WhatsApp / Teléfono *</label>
                            <input 
                              type="text" 
                              required
                              value={estimatorForm.client_phone}
                              placeholder="Ej: +56 9 1234 5678"
                              onChange={(e) => setEstimatorForm({...estimatorForm, client_phone: e.target.value})}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#8aebff]/50"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 uppercase font-mono font-bold">Notas Adicionales (Opcional)</label>
                            <textarea 
                              value={estimatorForm.notes}
                              onChange={(e) => setEstimatorForm({...estimatorForm, notes: e.target.value})}
                              placeholder="Indica detalles como el modelo específico, el color o si fue mojado."
                              rows={3}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#8aebff]/50 resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={estimatorLoading}
                            className="w-full py-3 bg-[#8aebff] hover:bg-[#8aebff]/90 text-[#001f25] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] shadow-[0_0_15px_rgba(138,235,255,0.2)] disabled:opacity-50"
                          >
                            {estimatorLoading ? (
                              <span className="w-4 h-4 border-2 border-[#001f25] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Calendar size={14} />
                                Agendar Diagnóstico Gratuito
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: SUCCESS */}
                  {estimatorStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center space-y-6 py-6"
                    >
                      <div className="mx-auto w-16 h-16 bg-[#68fcbf]/10 border border-[#68fcbf]/20 rounded-full flex items-center justify-center text-[#68fcbf] shadow-[0_0_20px_rgba(104,252,191,0.2)]">
                        <CheckCircle size={32} />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-extrabold text-white uppercase tracking-wider">¡Diagnóstico Solicitado con Éxito!</h3>
                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                          Hemos registrado tu solicitud. Tu número de orden temporal o de consulta se encuentra en proceso. Puedes contactar de inmediato a un asesor para agilizar tu hora.
                        </p>
                      </div>

                      {estimatorSuccess && (
                        <div className="bg-white/[0.02] border border-white/5 max-w-sm mx-auto p-4 rounded-xl font-mono text-xs text-gray-300">
                          ID DE SOLICITUD: <span className="text-[#8aebff] font-bold">{estimatorSuccess.order_number || `REQ-${estimatorSuccess.id}`}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const cleanNum = whatsappNumber.replace(/[^0-9]/g, '')
                            const msg = `¡Hola Nova Technologies! Acabo de agendar un Diagnóstico Gratuito desde su cotizador web.\n\nCódigo de Solicitud: ${estimatorSuccess?.order_number || `REQ-${estimatorSuccess?.id}`}\nNombre: ${estimatorForm.client_name}\nDispositivo: ${ESTIMATOR_DATA[selectedDeviceType]?.label}\nFalla: ${selectedIssue?.name}`;
                            window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank')
                          }}
                          className="px-6 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] shadow-[0_0_15px_rgba(37,211,102,0.2)]"
                        >
                          <MessageCircle size={14} />
                          Enviar por WhatsApp
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setEstimatorStep(1);
                            setSelectedDeviceType('');
                            setSelectedIssue(null);
                            setEstimatorForm({ client_name: '', client_phone: '', notes: '' });
                            setEstimatorSuccess(null);
                          }}
                          className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Nueva Cotización
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </div>

          {/* SECTION 2: SERVICIOS ESPECIALIZADOS */}
          <div className="py-24 px-4 sm:px-8 border-t border-white/5 bg-[#0a0a0c]/60">
            <div className="max-w-7xl mx-auto w-full space-y-12">
              
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">LABORATORIO TÉCNICO</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">SERVICIOS DE ALTO NIVEL</h2>
                <p className="text-xs sm:text-sm text-gray-400">Trabajamos bajo estándares de fábrica con maquinaria de última generación y técnicos titulados.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* CARD 1 */}
                <div className="glass-panel p-6 rounded-2xl glass-card-hover transition-all duration-300 flex flex-col justify-between h-[280px]">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-[#73d4e8]/10 flex items-center justify-center border border-[#73d4e8]/20">
                      <Smartphone className="text-[#73d4e8]" size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white uppercase tracking-tight">Celulares & Tablets</h3>
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                        Reemplazo de pantallas OLED/AMOLED, baterías de alto rendimiento, conectores de carga tipo C y cámaras.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[9px] font-mono text-[#73d4e8] tracking-widest font-bold">NIVEL_PROFESIONAL</span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold">24-48 HRS</span>
                  </div>
                </div>

                {/* CARD 2 */}
                <div className="glass-panel p-6 rounded-2xl glass-card-hover transition-all duration-300 flex flex-col justify-between h-[280px] hover:border-purple-400/50">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                      <Laptop className="text-purple-400" size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white uppercase tracking-tight">Notebooks & PC</h3>
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                        Limpieza de ventiladores, repastado Honeywell PTM, ampliación de discos sólidos/RAM, cambio de pantallas y teclados.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[9px] font-mono text-purple-400 tracking-widest font-bold">DIAG_EXPRESS</span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold">48-72 HRS</span>
                  </div>
                </div>

                {/* CARD 3 */}
                <div className="glass-panel p-6 rounded-2xl glass-card-hover transition-all duration-300 flex flex-col justify-between h-[280px] hover:border-[#68fcbf]/50">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-[#68fcbf]/10 flex items-center justify-center border border-[#68fcbf]/20">
                      <Gamepad className="text-[#68fcbf]" size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white uppercase tracking-tight">Consolas de Juego</h3>
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                        Reparación de puertos HDMI, reballing APU, reparación de mandos (joystick drift) y mantención premium de metal líquido.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[9px] font-mono text-[#68fcbf] tracking-widest font-bold">CONSOLAS_Y_MANDOS</span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold">24-72 HRS</span>
                  </div>
                </div>

                {/* CARD 4 */}
                <div className="glass-panel p-6 rounded-2xl glass-card-hover transition-all duration-300 flex flex-col justify-between h-[280px] hover:border-amber-400/50">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Wrench className="text-amber-400" size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white uppercase tracking-tight">Micro-Soldadura</h3>
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                        Búsqueda de cortocircuitos térmicos en placas madre, reemplazo de integrados SMD/BGA y reconstrucción de pistas.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[9px] font-mono text-amber-400 tracking-widest font-bold">ELECTRÓNICA_AVANZADA</span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold">3-5 DÍAS</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* SECTION 3: CÓMO FUNCIONA (PROCESO DE SERVICIO) */}
          <div className="py-24 px-4 sm:px-8 border-t border-white/5 bg-[#0a0a0c]/40">
            <div className="max-w-7xl mx-auto w-full space-y-16">
              
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">PASO A PASO</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">NUESTRO FLUJO DE TRABAJO</h2>
                <p className="text-xs sm:text-sm text-gray-400">Monitoreo 100% transparente desde que dejas tu dispositivo hasta que lo retiras.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative">
                
                {/* Connection lines for desktop (hidden on mobile) */}
                <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-right from-[#8aebff]/30 to-[#68fcbf]/30 z-0" />

                {/* STEP 1 */}
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[#0e0e10] border-2 border-[#8aebff] flex items-center justify-center text-white font-extrabold text-lg shadow-[0_0_15px_rgba(138,235,255,0.15)]">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">Contacto & Consulta</h4>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed max-w-[200px] mx-auto">
                      Consúltanos por WhatsApp o visita directamente nuestra oficina para traer tu equipo.
                    </p>
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[#0e0e10] border-2 border-[#8aebff]/50 flex items-center justify-center text-white font-extrabold text-lg">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">Recepción & Diagnóstico</h4>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed max-w-[200px] mx-auto">
                      Entregas tu equipo en nuestro mesón. En 24 horas realizamos la inspección técnica detallada de laboratorio.
                    </p>
                  </div>
                </div>

                {/* STEP 3 */}
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[#0e0e10] border-2 border-[#8aebff]/50 flex items-center justify-center text-white font-extrabold text-lg">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">Presupuesto Online</h4>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed max-w-[200px] mx-auto">
                      Te enviamos el informe técnico y presupuesto por WhatsApp. Trabajamos solo tras tu aprobación expresa.
                    </p>
                  </div>
                </div>

                {/* STEP 4 */}
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[#0e0e10] border-2 border-[#8aebff]/50 flex items-center justify-center text-white font-extrabold text-lg">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">Reparación & Calidad</h4>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed max-w-[200px] mx-auto">
                      Cambiamos el componente dañado y realizamos pruebas electrónicas rigurosas de 15 puntos de control.
                    </p>
                  </div>
                </div>

                {/* STEP 5 */}
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[#0e0e10] border-2 border-[#68fcbf] flex items-center justify-center text-white font-extrabold text-lg shadow-[0_0_15px_rgba(104,252,191,0.15)]">
                    5
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#68fcbf] uppercase">Retiro con Garantía</h4>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed max-w-[200px] mx-auto">
                      El sistema te notifica cuando el equipo está listo. Retiras en sucursal con garantía por escrito de 3 a 6 meses.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* SECTION 4: BUSCADOR DE PRECIOS DE REFERENCIA */}
          <div id="precios-seccion" className="py-24 px-4 sm:px-8 border-t border-white/5 bg-[#0a0a0c]/60">
            <div className="max-w-4xl mx-auto w-full space-y-10">
              
              <div className="text-center space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">PRECIOS TRANSPARENTES</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">BUSCADOR DE TARIFAS ESTIMADAS</h2>
                <p className="text-xs sm:text-sm text-gray-400">Consulte el valor aproximado de las reparaciones más comunes antes de ingresar su equipo.</p>
              </div>

              {/* Price Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {['Todos', 'Celular', 'Notebook', 'Consola', 'Placa'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeCategoryFilter === cat 
                          ? 'bg-[#8aebff] text-[#001f25]' 
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat === 'Todos' ? 'Todos' : cat === 'Placa' ? 'Micro-soldadura' : cat + 's'}
                    </button>
                  ))}
                </div>
                
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={priceSearch}
                    onChange={(e) => setPriceSearch(e.target.value)}
                    placeholder="Buscar dispositivo (ej: iPhone, PS5)..."
                    className="w-full bg-[#131315] border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[#8aebff]/50"
                  />
                </div>
              </div>

              {/* Price List Table */}
              <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.01] text-gray-400 font-mono text-[10px] tracking-wider uppercase">
                        <th className="py-4 px-6">Equipo / Modelo</th>
                        <th className="py-4 px-6">Servicio Técnico</th>
                        <th className="py-4 px-6">Valor Estimado</th>
                        <th className="py-4 px-6 text-center">Tiempo</th>
                        <th className="py-4 px-6 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {filteredPrices.length > 0 ? (
                        filteredPrices.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-all">
                            <td className="py-4 px-6 font-semibold text-white">{item.device}</td>
                            <td className="py-4 px-6 text-gray-400">{item.service}</td>
                            <td className="py-4 px-6 font-mono text-[#68fcbf] font-bold">{item.price}</td>
                            <td className="py-4 px-6 text-center text-gray-400 font-mono text-xs">{item.time}</td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleSelectPriceForQuote(item)}
                                className="px-3 py-1 bg-[#8aebff]/10 hover:bg-[#8aebff] hover:text-[#001f25] text-[#8aebff] font-bold text-[10px] uppercase rounded transition-all cursor-pointer"
                              >
                                Cotizar
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-gray-500 text-xs">
                            No se encontraron servicios que coincidan con tu búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 5: OPINIONES DE CLIENTES */}
          <div className="py-24 px-4 sm:px-8 border-t border-white/5 bg-[#0a0a0c]/40">
            <div className="max-w-7xl mx-auto w-full space-y-12">
              
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">TESTIMONIOS</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">LO QUE DICEN NUESTROS CLIENTES</h2>
                <p className="text-xs sm:text-sm text-gray-400">La satisfacción de quienes confían su tecnología en nuestras manos es el mejor aval.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* REVIEW 1 */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center font-bold text-xs text-[#8aebff] border border-white/10 uppercase">
                        CV
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Cristián Valenzuela</h4>
                        <span className="text-[9px] text-gray-500 font-mono">Hace 2 semanas</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed italic">
                    "Excelente servicio. Llevé mi PS5 por problemas de sobrecalentamiento y la dejaron impecable en menos de 3 horas. El cambio de metal líquido y la limpieza valieron totalmente la pena."
                  </p>
                </div>

                {/* REVIEW 2 */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center font-bold text-xs text-[#8aebff] border border-white/10 uppercase">
                        CT
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Camila Toledo</h4>
                        <span className="text-[9px] text-gray-500 font-mono">Hace 1 mes</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed italic">
                    "Excelente la transparencia del sistema. Pude ver todo el proceso de reparación de la pantalla de mi iPhone 13 a través de su web. Muy profesionales y rápidos en el taller."
                  </p>
                </div>

                {/* REVIEW 3 */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center font-bold text-xs text-[#8aebff] border border-white/10 uppercase">
                        IR
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Ignacio Reyes</h4>
                        <span className="text-[9px] text-gray-500 font-mono">Hace 3 días</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed italic">
                    "El único servicio técnico en Quillota que pudo reparar la placa de mi MacBook Pro mojado. Diagnóstico rápido y atención de primer nivel por parte de los técnicos."
                  </p>
                </div>

              </div>

            </div>
          </div>

          {/* SECTION 6: FAQ ACCORDION */}
          <div className="py-24 px-4 sm:px-8 border-t border-white/5 bg-[#0a0a0c]/60">
            <div className="max-w-3xl mx-auto w-full space-y-12">
              
              <div className="text-center space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">PREGUNTAS FRECUENTES</span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">FAQS GENERALES</h2>
                <p className="text-xs sm:text-sm text-gray-400">Respuestas rápidas a las consultas más habituales sobre nuestro servicio técnico.</p>
              </div>

              <div className="space-y-4 text-left">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index
                  return (
                    <div key={index} className="border border-white/5 bg-white/[0.01] rounded-xl overflow-hidden transition-all duration-300">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-white/[0.02] cursor-pointer"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-white">{faq.q}</span>
                        {isOpen ? <ChevronUp size={16} className="text-[#8aebff]" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-4 pt-2 text-[11px] sm:text-xs text-gray-400 leading-relaxed border-t border-white/5">
                              {faq.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>

          {/* SECTION 6.5: OPINIONES DE CLIENTES (COMENTARIOS) */}
          <div className="py-24 px-4 sm:px-8 border-t border-white/5 bg-[#0a0a0c]/80 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-6xl mx-auto w-full space-y-12 relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-left space-y-3">
                  <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">TESTIMONIOS</span>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">LO QUE DICEN NUESTROS CLIENTES</h2>
                  <p className="text-xs sm:text-sm text-gray-400">Opiniones reales de clientes que confiaron en nuestro servicio de laboratorio.</p>
                </div>
                <button
                  onClick={() => setShowCommentModal(true)}
                  className="px-5 py-3 bg-[#8aebff] hover:bg-[#8aebff]/90 text-[#001f25] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(138,235,255,0.2)] hover:scale-[1.02] flex items-center gap-2"
                >
                  <Star size={14} className="fill-current animate-pulse text-yellow-400" />
                  Dejar mi Opinión
                </button>
              </div>

              {comments.length === 0 ? (
                <div className="p-8 border border-white/5 bg-[#121214]/40 backdrop-blur-sm rounded-2xl text-center text-gray-500 text-xs">
                  Aún no hay comentarios publicados. ¡Sé el primero en dejar tu opinión!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 hover:border-[#8aebff]/20 transition-all group duration-300 bg-white/[0.01]"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white group-hover:text-[#8aebff] transition-colors">{comment.client_name}</span>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={i < comment.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed italic">
                        "{comment.comment}"
                      </p>
                      <div className="text-[9px] text-gray-600 font-mono text-right">
                        {new Date(comment.created_at).toLocaleDateString('es-CL')}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 7: CONTACTO, UBICACIÓN Y HORARIOS */}
          <div id="contacto-seccion" className="py-24 px-4 sm:px-8 border-t border-white/5 bg-[#0e0e10]/80">
            <div className="max-w-7xl mx-auto w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                
                {/* Contact details */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono tracking-widest text-[#8aebff] font-bold block uppercase">ATENCIÓN AL CLIENTE</span>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase">UBICACIÓN & CONTACTO</h2>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                      Visítanos en nuestra sucursal equipada con laboratorio de electrónica visible. No requiere cita previa para evaluación.
                    </p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Location */}
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <MapPin size={18} className="text-[#8aebff]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase">Nuestra Dirección</h4>
                        <p className="text-xs text-gray-400 mt-1">{physicalAddress}</p>
                      </div>
                    </div>

                    {/* Phone/WhatsApp */}
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <Phone size={18} className="text-[#8aebff]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase">Teléfono & WhatsApp</h4>
                        <p className="text-xs text-gray-400 mt-1">{phoneNumber}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <Mail size={18} className="text-[#8aebff]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase">Correo Electrónico</h4>
                        <p className="text-xs text-gray-400 mt-1">{emailAddress}</p>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Opening Hours & Status card */}
                <div className="glass-panel p-8 rounded-3xl space-y-6 border border-white/5 relative overflow-hidden">
                  
                  {/* Decorative background lights */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#8aebff]/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Horario de Laboratorio</span>
                    
                    {/* Live Dynamic Store Status Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                      storeStatus.open 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${storeStatus.open ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                      <span>{storeStatus.open ? 'ABIERTO AHORA' : 'CERRADO'}</span>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-b border-white/5 py-4">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Lunes a Viernes</span>
                      <span className="font-mono text-white">09:00 - 19:00 hrs</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Sábados</span>
                      <span className="font-mono text-white">10:00 - 14:00 hrs</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Domingos y Festivos</span>
                      <span className="font-mono text-rose-400">Cerrado</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 font-mono text-center">
                    {storeStatus.msg}
                  </p>

                  <a 
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-3 bg-[#68fcbf] hover:bg-[#68fcbf]/90 text-[#002f1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(104,252,191,0.2)] hover:scale-[1.01]"
                  >
                    <Smartphone size={14} />
                    Contactar por WhatsApp
                  </a>

                </div>

              </div>
            </div>
          </div>

        </section>

        <footer className="h-12 border-t border-white/5 bg-[#131315]/50 backdrop-blur-sm px-8 flex items-center justify-between z-50 pointer-events-auto shrink-0">
          <div className="text-[10px] text-gray-500 font-mono">
            © {new Date().getFullYear()} NOVA TECNOLOGIES. TODOS LOS DERECHOS RESERVADOS.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-[#68fcbf] uppercase">CONEXIÓN SEGURA SSL</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-3 bg-[#68fcbf] rounded-full animate-pulse"></div>
            </div>
          </div>
        </footer>

      </main>

      {/* Sliding Glass Overlay Panels for Track */}
      <AnimatePresence>
        {activeTab === 'track' && (
          <motion.div
            initial={{ opacity: 0, x: 250 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 250 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] glass-panel border-l border-white/10 z-[100] flex flex-col overflow-y-auto pointer-events-auto shadow-2xl custom-scrollbar"
          >
            <div className="p-6 sm:p-8 flex-grow">
              
              {/* HEADER WITH CLOSE BUTTON */}
              <div className="flex justify-end mb-2">
                <button 
                  onClick={() => { setActiveTab('home'); setTrackResult(null); }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Cerrar Panel
                </button>
              </div>

              {/* TAB: TRACK REPAIR */}
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <span className="text-[10px] text-[#8aebff] tracking-widest font-mono font-bold uppercase block">Rastreo</span>
                  <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase glow-cyan">Rastrear mi Orden</h2>
                  <p className="text-gray-400 text-xs mt-1">Consulta el progreso actual de tu dispositivo en taller.</p>
                </div>

                <form onSubmit={handleTrackSearch} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-[#8aebff] tracking-wider block">NÚMERO DE ORDEN</label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="Ej: ORD-00042"
                      className="w-full bg-[#16161a]/85 border border-[#8aebff]/25 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#8aebff] font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-[#8aebff] tracking-wider block">RUT O TELÉFONO DEL CLIENTE</label>
                    <input
                      type="text"
                      value={rutOrPhone}
                      onChange={(e) => setRutOrPhone(e.target.value)}
                      placeholder="RUT: 12345678-9 o Teléfono: 987654321"
                      className="w-full bg-[#16161a]/85 border border-[#8aebff]/25 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#8aebff]"
                      required
                    />
                  </div>

                  {trackError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>{trackError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={trackLoading}
                    className="w-full py-3 bg-[#8aebff] hover:bg-[#8aebff]/90 text-[#001f25] font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(138,235,255,0.2)]"
                  >
                    {trackLoading ? 'Consultando...' : 'Buscar Orden'}
                  </button>
                </form>

                {trackResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 border border-white/10 bg-black/40 p-5 rounded-xl space-y-6"
                  >
                    <div className="flex justify-between items-start border-b border-white/10 pb-4">
                      <div>
                        <h3 className="font-bold text-white font-mono text-lg">{trackResult.order_number}</h3>
                        <p className="text-xs text-gray-400">{trackResult.brand} {trackResult.model}</p>
                      </div>
                      <span className={`px-3 py-1 border rounded-full text-[10px] font-bold ${
                        STATUS_LABELS[trackResult.status]?.color || 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {STATUS_LABELS[trackResult.status]?.text || trackResult.status}
                      </span>
                    </div>

                    {/* Stepper Timeline */}
                    <div className="space-y-4">
                      <span className="text-[9px] font-mono text-[#8aebff] tracking-wider block font-bold">HISTORIAL DE ESTADO</span>
                      <div className="relative pl-5 border-l border-white/10 space-y-5 ml-2 py-0.5">
                        {STATUS_STEPS.map((step) => {
                          const stepStatus = getStepStatus(step.key, trackResult.status, trackResult.history)
                          return (
                            <div key={step.key} className="relative text-xs">
                              <div className={`absolute left-[-26px] top-1 w-3 h-3 rounded-full border-2 transition-all flex items-center justify-center ${
                                stepStatus.state === 'completed' 
                                  ? 'bg-[#8aebff] border-[#8aebff]' 
                                  : stepStatus.state === 'current'
                                  ? 'bg-black border-[#8aebff] animate-pulse'
                                  : 'bg-black border-gray-800'
                              }`}>
                                {stepStatus.state === 'completed' && (
                                  <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`font-bold ${
                                  stepStatus.state === 'completed' ? 'text-[#8aebff]' : stepStatus.state === 'current' ? 'text-[#73d4e8]' : 'text-white/30'
                                }`}>{step.label}</span>
                                {stepStatus.date && (
                                  <span className="text-[9px] text-white/40 font-mono">
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

                    <div className="border-t border-white/10 pt-4 text-xs space-y-3">
                      <div>
                        <span className="text-[9px] font-mono text-[#8aebff] block font-bold">FALLA REPORTADA</span>
                        <p className="text-gray-300 mt-1">{trackResult.reported_issue}</p>
                      </div>
                      {trackResult.estimated_delivery && (
                        <div className="flex items-center gap-2 bg-[#8aebff]/5 border border-[#8aebff]/10 p-2.5 rounded-lg mt-2">
                          <Calendar size={14} className="text-[#8aebff]" />
                          <div>
                            <span className="text-[8px] font-mono text-[#8aebff] block uppercase">Entrega Estimada</span>
                            <span className="text-white text-xs">{new Date(trackResult.estimated_delivery).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CHAT CON EL TALLER (ADMINISTRACIÓN) */}
                    <div className="border-t border-white/10 pt-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-[#8aebff] animate-pulse" />
                        <span className="text-[10px] font-mono text-[#8aebff] block font-bold uppercase tracking-wider">Chat de Soporte con el Taller</span>
                      </div>

                      {/* Historial de Mensajes */}
                      <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-3.5 max-h-56 overflow-y-auto custom-scrollbar flex flex-col">
                        {orderComments.length === 0 ? (
                          <div className="text-center py-6 text-gray-500 text-[11px] leading-relaxed">
                            No hay mensajes en esta orden de servicio.<br />
                            Escribe abajo para enviar una consulta directa al técnico asignado.
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
                                <span className="text-[9px] text-gray-400 font-bold mb-1 font-mono">
                                  {msg.author_name} ({isClient ? 'Tú' : 'Técnico'})
                                </span>
                                <div
                                  className={`p-2.5 rounded-xl text-left leading-relaxed text-[11px] border ${
                                    isClient
                                      ? 'bg-[#003c47] border-[#8aebff]/30 text-white rounded-tr-none'
                                      : 'bg-[#1a2b30]/50 border-white/10 text-gray-300 rounded-tl-none'
                                  }`}
                                >
                                  {msg.message}
                                </div>
                                <span className="text-[8px] text-gray-500 mt-1 font-mono">
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
                          placeholder="Escribe una pregunta al técnico..."
                          className="flex-grow bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#8aebff]"
                        />
                        <button
                          type="submit"
                          className="p-2 bg-[#8aebff] hover:bg-[#8aebff]/95 text-[#001f25] rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <Send size={13} />
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Dejar Comentario */}
      <AnimatePresence>
        {showCommentModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] border border-white/10 p-6 rounded-3xl max-w-md w-full relative overflow-hidden"
            >
              <button 
                onClick={() => { setShowCommentModal(false); setCommentError(''); setCommentSuccess(''); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="space-y-4 text-left">
                <div>
                  <span className="text-[9px] font-mono text-[#8aebff] uppercase tracking-wider block">OPINIÓN DE CLIENTE</span>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Cuéntanos tu Experiencia</h3>
                  <p className="text-gray-400 text-[11px] mt-1 leading-relaxed">Tu reseña ayudará a otros clientes y a mejorar nuestro taller de forma continua.</p>
                </div>

                <form onSubmit={handleCommentSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Tu Nombre</label>
                    <input
                      type="text"
                      value={newComment.client_name}
                      onChange={(e) => setNewComment(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Ej: Carolina Rojas"
                      className="w-full bg-black border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#8aebff] focus:ring-1 focus:ring-[#8aebff]/30"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Calificación</label>
                    <div className="flex gap-2 items-center">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setNewComment(prev => ({ ...prev, rating: val }))}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            size={20}
                            className={val <= newComment.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Tu Comentario</label>
                    <textarea
                      value={newComment.comment}
                      onChange={(e) => setNewComment(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Cuéntanos qué te pareció el servicio, velocidad, repuestos o atención..."
                      className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#8aebff] focus:ring-1 focus:ring-[#8aebff]/30 h-24 resize-none"
                      required
                    />
                  </div>

                  {commentError && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[10px]">
                      {commentError}
                    </div>
                  )}

                  {commentSuccess && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px]">
                      {commentSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={commentLoading}
                    className="w-full py-2.5 bg-[#8aebff] hover:bg-[#8aebff]/90 text-[#001f25] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_10px_rgba(138,235,255,0.15)] disabled:opacity-50"
                  >
                    {commentLoading ? 'Enviando...' : 'Enviar Reseña'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Botón flotante de Chatbot WhatsApp */}
      <div className="fixed bottom-6 right-6 z-[120] pointer-events-auto">
        <button
          onClick={() => setShowChatbot(!showChatbot)}
          className="w-14 h-14 rounded-full bg-[#68fcbf] hover:bg-[#68fcbf]/90 text-[#002f1a] flex items-center justify-center shadow-[0_0_20px_rgba(104,252,191,0.3)] hover:scale-105 transition-all duration-300 cursor-pointer relative"
        >
          {showChatbot ? <X size={24} /> : <MessageCircle size={24} />}
          {!showChatbot && (
            <span className="absolute -top-1 -right-1 bg-cyan-400 text-gray-950 font-bold text-[8px] px-1.5 py-0.5 rounded-full animate-bounce">
              Bot
            </span>
          )}
        </button>
      </div>

      {/* Ventana de Chatbot */}
      <AnimatePresence>
        {showChatbot && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[320px] sm:w-[360px] h-[480px] bg-[#121214]/95 border border-white/10 rounded-2xl shadow-2xl z-[120] flex flex-col overflow-hidden backdrop-blur-md pointer-events-auto"
          >
            {/* Cabecera */}
            <div className="bg-[#1c1c1f] p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#68fcbf]/15 flex items-center justify-center border border-[#68fcbf]/30">
                  <span className="text-xs">🤖</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Asistente Nova</h4>
                  <span className="text-[9px] text-[#68fcbf] flex items-center gap-1 font-mono">
                    <span className="w-1 h-1 rounded-full bg-[#68fcbf] animate-ping" />
                    En línea (Bot)
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowChatbot(false)} 
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mensajes del chat */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3 custom-scrollbar bg-black/10 flex flex-col text-left">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-[11px] leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-[#8aebff] text-gray-950 rounded-br-none'
                        : 'bg-white/5 border border-white/10 text-gray-300 rounded-bl-none'
                    }`}
                  >
                    {msg.text.split('\n').map((line, lIdx) => (
                      <span key={lIdx}>
                        {line.split('*').map((part, pIdx) => 
                          pIdx % 2 === 1 ? <strong key={pIdx} className="font-extrabold text-white">{part}</strong> : part
                        )}
                        <br />
                      </span>
                    ))}
                  </div>
                  <span className="text-[8px] text-gray-500 mt-1 font-mono px-1">{msg.time}</span>
                </div>
              ))}

              {isWriting && (
                <div className="self-start flex items-center gap-1 bg-white/5 border border-white/10 p-2.5 rounded-2xl rounded-bl-none">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* Enlace directo a WhatsApp Humano */}
            <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] text-gray-400">¿Prefieres un asesor humano?</span>
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] text-[#68fcbf] font-bold hover:underline flex items-center gap-0.5"
              >
                Hablar con Soporte
                <MessageSquare size={10} />
              </a>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-white/5 bg-[#161619] flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe una opción o mensaje..."
                className="flex-grow bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#68fcbf] focus:ring-1 focus:ring-[#68fcbf]/30"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-2 bg-[#68fcbf] hover:bg-[#68fcbf]/90 disabled:opacity-50 text-[#002f1a] rounded-xl transition-all cursor-pointer"
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

