import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import {
  Wrench, Users, Package, LogOut, ChevronRight, Smartphone,
  RefreshCw, BarChart3, Calendar, ClipboardList,
  Activity, AlertTriangle, CheckCircle2, Zap, Globe
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import AnimatedBackground from '../components/AnimatedBackground'
import { useGlitch } from '../hooks/useGlitch'
import DeliveryCalendar from '../components/DeliveryCalendar'
import { getRepairs } from '../api/repairs'
import { switchSystem } from '../utils/system'

/* ─── Animated counter mini-component ─── */
function AnimatedCounter({ target, duration = 1200 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) { setCount(0); return }
    let start = null
    let raf
    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      } else {
        setCount(target)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return <span>{count}</span>
}

/* ─── Module definitions ─── */
const modules = [
  {
    title: 'Reparaciones',
    description: 'Gestión de órdenes, diagnósticos y estado de equipos en taller.',
    icon: Wrench,
    path: '/repairs',
    accent: 'var(--color-cyan-400)',
    accentBg: 'rgba(0, 242, 254, .08)',
    accentBorder: 'rgba(0, 242, 254, .20)',
    accentHover: 'rgba(0, 242, 254, .14)',
    accentGlow: 'rgba(0, 242, 254, .12)',
  },
  {
    title: 'Clientes',
    description: 'Directorio, historial de servicios y comunicación automatizada.',
    icon: Users,
    path: '/clients',
    accent: 'var(--color-purple-400)',
    accentBg: 'rgba(168, 85, 247, .08)',
    accentBorder: 'rgba(168, 85, 247, .20)',
    accentHover: 'rgba(168, 85, 247, .14)',
    accentGlow: 'rgba(168, 85, 247, .12)',
  },
  {
    title: 'Inventario',
    description: 'Control de stock, piezas de repuesto y alertas de reabastecimiento.',
    icon: Package,
    path: '/inventory',
    accent: 'var(--color-emerald-450)',
    accentBg: 'rgba(6, 214, 160, .08)',
    accentBorder: 'rgba(6, 214, 160, .20)',
    accentHover: 'rgba(6, 214, 160, .14)',
    accentGlow: 'rgba(6, 214, 160, .12)',
  },
  {
    title: 'Valores de Pantallas',
    description: 'Consulta rápida de precios de pantallas al cliente, costos y ganancias de marcas conocidas.',
    icon: Smartphone,
    path: '/screen-prices',
    accent: 'var(--color-rose-455)',
    accentBg: 'rgba(255, 0, 110, .08)',
    accentBorder: 'rgba(255, 0, 110, .20)',
    accentHover: 'rgba(255, 0, 110, .14)',
    accentGlow: 'rgba(255, 0, 110, .12)',
  },
  {
    title: 'Estadísticas Vitales',
    description: 'Métricas clave, rendimiento del taller y gráficos financieros interactivos.',
    icon: BarChart3,
    path: '/stats',
    accent: 'var(--color-blue-400)',
    accentBg: 'rgba(58, 134, 255, .08)',
    accentBorder: 'rgba(58, 134, 255, .20)',
    accentHover: 'rgba(58, 134, 255, .14)',
    accentGlow: 'rgba(58, 134, 255, .12)',
  },
  {
    title: 'Calendario Completo',
    description: 'Agenda de entregas y planificación de reparaciones en pantalla completa.',
    icon: Calendar,
    path: '/calendar',
    accent: 'var(--color-cyan-500)',
    accentBg: 'rgba(0, 210, 222, .08)',
    accentBorder: 'rgba(0, 210, 222, .20)',
    accentHover: 'rgba(0, 210, 222, .14)',
    accentGlow: 'rgba(0, 210, 222, .12)',
  },
  {
    title: 'Cotizador Rápido',
    description: 'Asistente interactivo de diagnóstico de fallas y presupuesto al mostrador.',
    icon: ClipboardList,
    path: '/diagnostics',
    accent: 'var(--color-yellow-450)',
    accentBg: 'rgba(255, 209, 102, .08)',
    accentBorder: 'rgba(255, 209, 102, .20)',
    accentHover: 'rgba(255, 209, 102, .14)',
    accentGlow: 'rgba(255, 209, 102, .12)',
  },
  {
    title: 'Administrar Página Web',
    description: 'Gestione la configuración pública: número de WhatsApp, tarifas de referencia y preguntas frecuentes.',
    icon: Globe,
    path: '/admin-web',
    accent: 'var(--color-cyan-400)',
    accentBg: 'rgba(0, 242, 254, .08)',
    accentBorder: 'rgba(0, 242, 254, .20)',
    accentHover: 'rgba(0, 242, 254, .14)',
    accentGlow: 'rgba(0, 242, 254, .12)',
  },
]

/* ─── Stat card definitions ─── */
const statCards = [
  { key: 'active',   label: 'Activas',       icon: Activity,       color: 'var(--color-cyan-400)', bg: 'rgba(0, 242, 254, .06)',   border: 'rgba(0, 242, 254, .15)'  },
  { key: 'ready',    label: 'Listas',         icon: CheckCircle2,   color: 'var(--color-emerald-450)', bg: 'rgba(6, 214, 160, .06)',  border: 'rgba(6, 214, 160, .15)' },
  { key: 'critical', label: 'Críticas',       icon: AlertTriangle,  color: 'var(--color-rose-455)', bg: 'rgba(255, 0, 110, .06)',   border: 'rgba(255, 0, 110, .15)'  },
  { key: 'today',    label: 'Entregas hoy',   icon: Zap,            color: 'var(--color-orange-450)', bg: 'rgba(247, 127, 0, .06)',  border: 'rgba(247, 127, 0, .15)' },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const glitchTitle = useGlitch('NOVA', true)
  const carouselRef = useRef(null)

  useEffect(() => {
    if (!carouselRef.current) return

    const container = carouselRef.current
    let width = container.clientWidth || 350
    let height = container.clientHeight || 400

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Cyan and purple ambient lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0x00f2fe, 1.5)
    dirLight1.position.set(5, 5, 5)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.2)
    dirLight2.position.set(-5, 5, -5)
    scene.add(dirLight2)

    // Ambient floating particles
    const particleCount = 120
    const particlesGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12
      positions[i + 1] = (Math.random() - 0.5) * 10
      positions[i + 2] = (Math.random() - 0.5) * 12
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particlesMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.06,
      transparent: true,
      opacity: 0.5
    })
    const particleSystem = new THREE.Points(particlesGeo, particlesMat)
    scene.add(particleSystem)

    const group = new THREE.Group()
    group.position.y = -0.2
    scene.add(group)

    const radius = 4.5
    const itemsList = []

    const carouselItems = [
      { label: 'Reparaciones', emoji: '🔧', color: '#00f2fe', path: '/repairs' },
      { label: 'Clientes', emoji: '👥', color: '#a855f7', path: '/clients' },
      { label: 'Inventario', emoji: '📦', color: '#06d6a0', path: '/inventory' },
      { label: 'Valores Pantallas', emoji: '📱', color: '#ff006e', path: '/screen-prices' },
      { label: 'Estadísticas', emoji: '📊', color: '#3a82ff', path: '/stats' },
      { label: 'Calendario', emoji: '📅', color: '#00d2de', path: '/calendar' },
      { label: 'Cotizador', emoji: '📋', color: '#ffd166', path: '/diagnostics' },
      { label: 'Config Web', emoji: '🌐', color: '#00f2fe', path: '/admin-web' }
    ]

    const createCardTexture = (label, emoji, colorHex) => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 340
      const ctx = canvas.getContext('2d')

      // Dark cybernetic card background
      ctx.fillStyle = '#0a0a0d'
      ctx.fillRect(0, 0, 256, 340)

      // Colored border
      ctx.strokeStyle = colorHex
      ctx.lineWidth = 8
      ctx.strokeRect(0, 0, 256, 340)

      // Cyber lines grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 1
      for (let i = 20; i < 256; i += 20) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, 340)
        ctx.stroke()
      }

      // Draw Emoji
      ctx.font = '64px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, 128, 120)

      // Draw Label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold 20px "Inter", sans-serif'
      ctx.fillText(label, 128, 220)

      // Subheading
      ctx.fillStyle = 'rgba(241, 245, 249, 0.4)'
      ctx.font = '9px "JetBrains Mono", monospace'
      ctx.fillText('NOVA MANAGEMENT', 128, 260)

      const texture = new THREE.CanvasTexture(canvas)
      return texture
    }

    carouselItems.forEach((opt, i) => {
      const angle = (i / carouselItems.length) * Math.PI * 2
      const cardGroup = new THREE.Group()

      // Geometry slightly smaller to fit the container
      const geometry = new THREE.PlaneGeometry(1.8, 2.5)
      const texture = createCardTexture(opt.label, opt.emoji, opt.color)
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        shininess: 80,
        specular: 0x00f2fe,
        side: THREE.DoubleSide
      })

      const card = new THREE.Mesh(geometry, material)
      card.rotation.y = Math.PI // Flip card so it faces outwards to the camera
      cardGroup.add(card)

      const edges = new THREE.EdgesGeometry(geometry)
      const lineMaterial = new THREE.LineBasicMaterial({ color: opt.color, linewidth: 2 })
      const line = new THREE.LineSegments(edges, lineMaterial)
      cardGroup.add(line)

      cardGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      cardGroup.lookAt(0, -0.2, 0)

      group.add(cardGroup)
      itemsList.push({ mesh: cardGroup, angle: angle, data: opt })
    })

    camera.position.set(0, 1.3, 10.0)
    camera.lookAt(0, -0.2, 0)

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
      targetRotation += delta * 0.007
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
      targetRotation += delta * 0.007
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
            navigate(found.data.path)
            break
          }
          obj = obj.parent
        }
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
      group.rotation.y = currentRotation

      particleSystem.rotation.y += 0.0005
      particleSystem.rotation.x += 0.0001

      if (!isDragging) {
        targetRotation += 0.0025
      }

      itemsList.forEach((item, i) => {
        item.mesh.position.y = Math.sin(Date.now() * 0.0012 + i) * 0.12
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
  }, [navigate])

  /* ─── Quick stats state ─── */
  const [stats, setStats] = useState({ active: 0, ready: 0, critical: 0, today: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getRepairs()
        const repairs = Array.isArray(res.data) ? res.data : []
        const todayStr = new Date().toISOString().split('T')[0]

        const active = repairs.filter(
          (r) => !['entregado', 'cancelado'].includes(r.status)
        ).length
        const ready = repairs.filter((r) => r.status === 'listo').length
        const critical = repairs.filter((r) => r.status === 'critico').length
        const today = repairs.filter((r) => {
          if (!r.estimated_delivery) return false
          return r.estimated_delivery.split('T')[0] === todayStr
        }).length

        setStats({ active, ready, critical, today })
      } catch {
        /* silently fail — stats just stay at 0 */
      }
    }
    fetchStats()
  }, [])

  /* ─── Formatted date ─── */
  const formattedDate = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchSystem = () => {
    switchSystem('nova', navigate)
  }

  return (
    <>
      <style>{`
        /* ─── Page shell ─── */
        .dash-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* ─── Ambient blobs ─── */
        .blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
        }
        .blob-a { top: 0;    left: 33%;  width: 480px; height: 480px; background: rgba(6,182,212,.04); }
        .blob-b { bottom: 0; right: 33%; width: 480px; height: 480px; background: rgba(168,85,247,.04); }

        /* ─── Navbar ─── */
        .dash-nav {
          position: relative;
          z-index: 10;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(9,9,18,.55);
          backdrop-filter: blur(16px);
          padding: 14px 24px;
        }
        .nav-inner {
          max-width: 960px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-logo {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: .3em;
          background: linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-right { display: flex; align-items: center; gap: 14px; }
        .nav-user  { display: flex; align-items: center; gap: 7px; }
        .user-dot  {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #34d399;
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        .user-name { font-size: 13px; color: #94a3b8; font-weight: 500; }

        /* ─── Nav separator ─── */
        .nav-separator {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,.10);
          flex-shrink: 0;
        }

        /* ─── Pill buttons ─── */
        .btn-switch-system {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #7dd3fc;
          background: rgba(56,189,248,.08);
          border: 1px solid rgba(56,189,248,.25);
          border-radius: 20px;
          padding: 6px 14px;
          cursor: pointer;
          transition: background .2s, border-color .2s, color .2s;
        }
        .btn-switch-system:hover {
          background: rgba(56,189,248,.15);
          border-color: rgba(56,189,248,.4);
          color: #bae6fd;
        }
        .btn-logout {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #fca5a5;
          background: rgba(248,113,113,.06);
          border: 1px solid rgba(248,113,113,.2);
          border-radius: 20px;
          padding: 6px 14px;
          cursor: pointer;
          transition: background .2s, border-color .2s, color .2s;
        }
        .btn-logout:hover {
          background: rgba(248,113,113,.12);
          border-color: rgba(248,113,113,.35);
          color: #fecaca;
        }

        /* ─── Main content ─── */
        .dash-main {
          position: relative;
          z-index: 10;
          max-width: 960px;
          margin: 0 auto;
          padding: 56px 24px 64px;
        }

        /* ─── Header / Hero ─── */
        .dash-header { margin-bottom: 48px; }
        .dash-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #334155;
          margin-bottom: 10px;
        }
        .dash-greeting {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -.02em;
          line-height: 1.1;
          color: #e2e8f0;
        }
        .dash-greeting-name {
          background: linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dash-date {
          font-size: 13px;
          color: #475569;
          margin-top: 8px;
          font-weight: 400;
        }
        .dash-rule {
          height: 2px;
          width: 56px;
          background: linear-gradient(90deg, var(--color-cyan-400), var(--color-purple-400));
          margin-top: 20px;
          border: none;
          animation: rulePulse 3s ease-in-out infinite;
        }
        @keyframes rulePulse {
          0%, 100% { width: 56px; }
          50% { width: 80px; }
        }

        /* ─── Quick stats row ─── */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 36px;
        }
        .stat-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 18px;
          border-radius: 14px;
          border: 1px solid var(--stat-border);
          background: var(--stat-bg);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: radial-gradient(ellipse at 20% 50%, var(--stat-bg), transparent 70%);
          pointer-events: none;
        }
        .stat-icon-wrap {
          position: relative;
          width: 42px; height: 42px;
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          background: var(--stat-bg);
          border: 1px solid var(--stat-border);
          flex-shrink: 0;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 700;
          color: #e2e8f0;
          line-height: 1;
          letter-spacing: -.02em;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* ─── Module grid ─── */
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 40px;
        }
        .module-card {
          position: relative;
          text-align: left;
          padding: 22px 20px 20px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          cursor: pointer;
          transition: border-color .2s, background .2s, transform .18s, box-shadow .25s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .module-card:hover {
          transform: translateY(-4px);
          background: var(--card-hover-bg);
          border-color: var(--card-border);
          box-shadow: 0 0 20px var(--card-glow), 0 4px 16px rgba(0,0,0,.3);
        }
        .module-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--card-accent), transparent);
          opacity: 0;
          transition: opacity .25s;
        }
        .module-card:hover::before { opacity: 1; }
        .card-icon-wrap {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: var(--card-icon-bg);
          border: 1px solid var(--card-border);
          margin-bottom: 16px;
          transition: transform .25s ease;
        }
        .module-card:hover .card-icon-wrap { transform: scale(1.08) rotate(6deg); }
        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 6px;
        }
        .card-desc {
          font-size: 12px;
          color: #475569;
          line-height: 1.6;
          flex: 1;
        }
        .card-cta {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-top: 16px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--card-accent);
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity .2s, transform .2s;
        }
        .module-card:hover .card-cta { opacity: 1; transform: translateX(0); }

        /* ─── Calendar section ─── */
        .section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .10em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 14px;
        }
        .section-label-icon {
          color: #3b82f6;
          opacity: .7;
        }
        .calendar-wrap {
          position: relative;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 16px;
          overflow: hidden;
          backdrop-filter: blur(12px);
        }
        .calendar-wrap::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          padding: 1px;
          background: linear-gradient(
            160deg,
            rgba(59,130,246,.15),
            rgba(168,85,247,.08),
            transparent 60%
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* ─── Responsive ─── */
        @media (max-width: 680px) {
          .modules-grid { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .dash-greeting { font-size: 26px; }
        }
        @media (max-width: 900px) and (min-width: 681px) {
          .modules-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr; }
          .nav-right { gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        }
      `}</style>

      <div className="dash-page">
        <AnimatedBackground />
        <div className="blob blob-a" />
        <div className="blob blob-b" />

        {/* ─── Navbar ─── */}
        <nav className="dash-nav">
          <div className="nav-inner">
            <motion.span
              className="nav-logo"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {glitchTitle}
            </motion.span>

            <div className="nav-right">
              <motion.div
                className="nav-user"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="user-dot" />
                <span className="user-name">{user?.name}</span>
              </motion.div>

              <div className="nav-separator" />

              <motion.button
                className="btn-switch-system"
                onClick={handleSwitchSystem}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <RefreshCw size={13} />
                Cambiar Sistema
              </motion.button>

              <motion.button
                className="btn-logout"
                onClick={handleLogout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <LogOut size={13} />
                Salir
              </motion.button>
            </div>
          </div>
        </nav>

        {/* ─── Main content ─── */}
        <main className="dash-main">

          {/* ── Hero header ── */}
          <motion.div
            className="dash-header"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="dash-eyebrow">Panel de control · Nova Tecnologies</p>
            <h2 className="dash-greeting">
              Bienvenido,{' '}
              <span className="dash-greeting-name">{user?.name}</span>
            </h2>
            <p className="dash-date">{capitalizedDate}</p>
            <motion.hr
              className="dash-rule"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            />
          </motion.div>

          {/* ── Quick stats row ── */}
          <div className="stats-row">
            {statCards.map((sc, i) => (
              <motion.div
                key={sc.key}
                className="stat-card"
                style={{
                  '--stat-bg': sc.bg,
                  '--stat-border': sc.border,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.45 }}
              >
                <div className="stat-icon-wrap">
                  <sc.icon size={20} style={{ color: sc.color }} />
                </div>
                <div>
                  <div className="stat-value">
                    <AnimatedCounter target={stats[sc.key]} />
                  </div>
                  <div className="stat-label">{sc.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Módulos de Gestión (Flat Grid) ── */}
          <div className="mb-10 text-left pointer-events-auto">
            <p className="section-label">
              <ClipboardList size={14} className="section-label-icon" />
              Módulos de Gestión
            </p>
            <div className="modules-grid">
              {modules.map((mod, i) => (
                <motion.button
                  key={mod.title}
                  className="module-card"
                  style={{
                    '--card-accent':   mod.accent,
                    '--card-border':   mod.accentBorder,
                    '--card-icon-bg':  mod.accentBg,
                    '--card-hover-bg': mod.accentHover,
                    '--card-glow':     mod.accentGlow,
                  }}
                  onClick={() => navigate(mod.path)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.45 }}
                >
                  <div className="card-icon-wrap">
                    <mod.icon size={18} style={{ color: mod.accent }} />
                  </div>
                  <div className="card-title">{mod.title}</div>
                  <div className="card-desc">{mod.description}</div>
                  <div className="card-cta">
                    Acceder <ChevronRight size={12} />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ── Premium 3D Carousel (Full Width Workspace) ── */}
          <div className="w-full mb-10 flex flex-col items-center pointer-events-auto">
            <p className="section-label self-start">
              <Activity size={14} className="section-label-icon text-cyan-400" />
              Acceso Rápido 3D
            </p>
            <div className="w-full h-[460px] md:h-[500px] bg-white/[0.01] border border-white/5 rounded-3xl relative overflow-hidden backdrop-blur-xs flex items-center justify-center group pointer-events-auto shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div 
                ref={carouselRef} 
                className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
                id="dashboard-threejs-carousel"
              />
              
              {/* Floating instruction badge */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 group-hover:opacity-90 transition-opacity select-none pointer-events-none text-center">
                <span className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase font-bold">CONTROL TRIDIMENSIONAL</span>
                <span className="text-[8px] text-gray-500 font-mono">ARRASTRA PARA ROTAR · HAZ CLIC EN UNA TARJETA PARA ABRIR</span>
              </div>
            </div>
          </div>

          {/* ── Calendar section ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <p className="section-label">
              <Calendar size={14} className="section-label-icon" />
              Calendario de entregas
            </p>
            <div className="calendar-wrap">
              <DeliveryCalendar />
            </div>
          </motion.div>
        </main>
      </div>
    </>
  )
}