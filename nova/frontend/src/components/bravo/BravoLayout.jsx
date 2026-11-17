import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3, CalendarDays, ClipboardList, Factory, LayoutDashboard,
  Globe, DollarSign, Coins, Cog, Home, MessageCircle, FileText, Shield, BookOpen,
  LogOut, Menu, Package, Palette, Plus, RefreshCw, Store, Users, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './bravo.css'
import { switchSystem } from '../../utils/system'
import { getUnreadCount } from '../../api/chats'
import { getBravoOrderCounts } from '../../api/bravo'
import AttendanceWidget from '../AttendanceWidget'

// Cada enlace corresponde a una ruta existente. El calendario es una sección
// del Dashboard: se enlaza con ancla y no se duplica la lógica de agenda.
const BRAVO_NAV_GROUPS = [
  {
    label: 'GENERAL',
    entries: [
      { name: 'Dashboard', path: '/bravo', icon: LayoutDashboard },
      { name: 'Calendario de entregas', path: '/bravo#bravo-calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'ÓRDENES Y PRODUCCIÓN',
    entries: [
      { name: 'Nueva orden', path: '/bravo/orders/new', icon: Plus },
      { name: 'Órdenes', path: '/bravo/orders', icon: ClipboardList },
      { name: 'Tablero de producción', path: '/bravo/production', icon: Factory },
      { name: 'Mensajes', path: '/bravo/chats', icon: MessageCircle },
      { name: 'Maquinarias', path: '/bravo/machines', icon: Cog },
    ],
  },
  {
    label: 'CATÁLOGO',
    entries: [
      { name: 'Productos / Insumos', path: '/bravo/products', icon: Package },
      { name: 'Registrar producto', path: '/bravo/products/new', icon: Palette },
      { name: 'Vitrina (interna)', path: '/bravo/showroom', icon: Store },
      { name: 'Carta de Precios', path: '/bravo/price-menu', icon: BookOpen },
    ],
  },
  {
    label: 'GESTIÓN',
    entries: [
      { name: 'Clientes', path: '/bravo/clients', icon: Users },
      { name: 'Estadísticas', path: '/bravo/stats', icon: BarChart3 },
      { name: 'Ventas', path: '/bravo/sales', icon: DollarSign },
      { name: 'Caja Chica', path: '/bravo/cash-register', icon: Coins },
      { name: 'Cotizaciones', path: '/bravo/quotations', icon: FileText },
      { name: 'Configuración Web', path: '/bravo/admin-web', icon: Globe },
      { name: 'Centro de Control & Auditoría', path: '/bravo/users-attendance', icon: Shield, adminOnly: true },
    ],
  },
]

function bravoMenuIsActive(destination, location) {
  const currentPath = location.pathname
  if (destination === '/bravo#bravo-calendar') {
    return currentPath === '/bravo' && location.hash === '#bravo-calendar'
  }
  if (destination === '/bravo') {
    return currentPath === '/bravo' && location.hash !== '#bravo-calendar'
  }
  if (destination === '/bravo/orders') {
    // Las fichas pertenecen al listado; el alta tiene su propia entrada.
    return currentPath === destination || /^\/bravo\/orders\/\d+\/?$/.test(currentPath)
  }
  if (destination === '/bravo/clients') {
    return currentPath === destination || currentPath.startsWith('/bravo/clients/')
  }
  return currentPath === destination
}

function BravoSidebar({ user, location, onNavigate, onSwitchSystem, onLogout, unreadMessages, pendingWebCount }) {
  return (
    <div className="bravo-sidebar flex h-full min-h-0 flex-col bg-bravo-sidebar">
      <Link to="/bravo" className="bravo-side-brand" onClick={onNavigate}
        aria-label="BRAVO Personalizaciones — Panel principal">
        <span className="bravo-side-logo">
          <img src="/logo-bravo.jpg" alt="" />
        </span>
        <span className="bravo-side-brandcopy">
          <strong className="bravo-brandmark">BRAVO</strong>
          <small>PERSONALIZACIONES</small>
        </span>
        <span className="bravo-side-brandglyph" aria-hidden="true">/</span>
      </Link>

      <nav className="bravo-side-nav" aria-label="Navegación de BRAVO">
        {BRAVO_NAV_GROUPS.map((section) => (
          <section className="bravo-side-section" key={section.label}
            aria-label={section.label}>
            <p className="bravo-side-section-label">{section.label}</p>
            {section.entries.filter(entry => !entry.adminOnly || user?.role === 'admin').map((entry) => {
              const active = bravoMenuIsActive(entry.path, location)
              const EntryIcon = entry.icon
              return (
                <Link key={entry.path} to={entry.path}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`bravo-nav-item ${active ? 'is-active' : ''}`}>
                  <EntryIcon size={17} strokeWidth={1.75} aria-hidden="true"/>
                  <span>{entry.name}</span>
                  {((entry.path === '/bravo/chats' && unreadMessages > 0) || (entry.path === '/bravo/orders' && pendingWebCount > 0)) && <span className="ml-auto rounded-full bg-rose-600 px-2 text-xs text-white">{entry.path === '/bravo/chats' ? unreadMessages : pendingWebCount}</span>}
                  {active && <span className="bravo-nav-active-mark" aria-hidden="true"/>}
                </Link>
              )
            })}
          </section>
        ))}
      </nav>

      <footer className="bravo-side-footer">
        <div className="bravo-side-account">
          <span className="bravo-side-avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          <div className="bravo-side-account-info">
            <strong>{user?.name || 'Operador BRAVO'}</strong>
            <small>{user?.email || 'Sesión activa'}</small>
          </div>
        </div>
        <AttendanceWidget system="bravo" />
        <div className="bravo-side-session">
          <button type="button" onClick={() => { localStorage.removeItem('dev_override'); window.location.href = '/' }}><Home size={15}/> Portal Principal</button>
          <button type="button" onClick={onSwitchSystem}>
            <RefreshCw size={15} aria-hidden="true"/> Cambiar Sistema
          </button>
          <button type="button" onClick={onLogout}>
            <LogOut size={15} aria-hidden="true"/> Salir del Sistema
          </button>
        </div>
      </footer>
    </div>
  )
}

export default function BravoLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const unreadMessagesRef = useRef(0)

  // Estado para solicitudes pendientes
  const [pendingWebCount, setPendingWebCount] = useState(0)
  const pendingWebCountRef = useRef(0)

  const currentPath = location.pathname

  useEffect(() => {
    unreadMessagesRef.current = unreadMessages
  }, [unreadMessages])

  useEffect(() => {
    pendingWebCountRef.current = pendingWebCount
  }, [pendingWebCount])

  // Polling para notificaciones de chat y órdenes recibidas
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().catch(() => {})
    }

    const checkNotifications = async () => {
      try {
        const [chatRes, countsRes] = await Promise.all([
          getUnreadCount({ system: 'bravo' }).catch(() => null),
          getBravoOrderCounts().catch(() => null),
        ])

        if (chatRes?.data) {
          const chatCount = chatRes.data.unread_count || 0
          const prevChatCount = unreadMessagesRef.current
          if (chatCount > prevChatCount && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Bravo - Nuevos mensajes 💬', {
              body: `Tienes ${chatCount} mensaje(s) sin leer de tus clientes en el chat.`,
              icon: '/logo-bravo.jpg'
            })
          }
          setUnreadMessages(chatCount)
        }

        if (countsRes?.data?.by_status) {
          const webCount = countsRes.data.by_status.pendiente || 0
          const prevWebCount = pendingWebCountRef.current
          if (webCount > prevWebCount && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Bravo - Nueva Solicitud Web ⏳', {
              body: 'Se ha registrado una nueva solicitud de cotización web en el sistema.',
              icon: '/logo-bravo.jpg'
            })
          }
          setPendingWebCount(webCount)
        }
      } catch {
        // Silenciamos fallos transitorios de polling para no contaminar la consola ni pruebas E2E
      }
    }

    checkNotifications()
    const interval = setInterval(checkNotifications, 15000)

    const handleChatRead = () => checkNotifications()
    window.addEventListener('chat_read', handleChatRead)
    window.addEventListener('order_created', handleChatRead)

    return () => {
      clearInterval(interval)
      window.removeEventListener('chat_read', handleChatRead)
      window.removeEventListener('order_created', handleChatRead)
    }
  }, [])


  const menuTriggerRef = useRef(null)
  const drawerCloseRef = useRef(null)

  useEffect(() => {
    if (!mobileOpen) return undefined
    drawerCloseRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        menuTriggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab') return
      const focusables = Array.from(
        document.getElementById('bravo-mobile-drawer')?.querySelectorAll(
          'a[href], button:not([disabled])'
        ) || []
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [mobileOpen])

  useEffect(() => {
    if (location.pathname !== '/bravo' || location.hash !== '#bravo-calendar') return
    // La agenda existe en el dashboard, no como pantalla independiente.
    // Se permite que React termine de montar la página antes de desplazarla.
    const frame = requestAnimationFrame(() => {
      document.getElementById('bravo-calendar')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])

  const handleSwitchSystem = () => {
    setMobileOpen(false)
    switchSystem('bravo', navigate)
  }

  const handleLogout = () => {
    setMobileOpen(false)
    logout()
    localStorage.removeItem('dev_override')
    window.location.href = '/'
  }

  const sideProps = {
    user,
    unreadMessages,
    pendingWebCount,
    location,
    onNavigate: () => setMobileOpen(false),
    onSwitchSystem: handleSwitchSystem,
    onLogout: handleLogout,
  }

  return (
    <div className="bravo-app flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-bravo-bg text-bravo-text md:flex-row">
      <header className="bravo-mobile-header md:hidden">
        <Link to="/bravo" className="bravo-mobile-home" onClick={() => setMobileOpen(false)}>
          <img src="/logo-bravo.jpg" alt="" />
          <span>BRAVO <small>PERSONALIZACIONES</small></span>
        </Link>
        <div className="bravo-mobile-actions">
          <Link to="/bravo/orders/new" aria-label="Nueva orden" onClick={() => setMobileOpen(false)}>
            <Plus size={21} aria-hidden="true"/>
          </Link>
          <button ref={menuTriggerRef} type="button"
            aria-label="Abrir menú de BRAVO" aria-expanded={mobileOpen}
            aria-controls="bravo-mobile-drawer"
            onClick={() => setMobileOpen(true)}>
            <Menu size={21} aria-hidden="true"/>
          </button>
        </div>
      </header>

      <aside className="hidden h-full min-h-0 w-64 shrink-0 md:block lg:w-[280px]"
        aria-label="Menú lateral de BRAVO">
        <BravoSidebar {...sideProps}/>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="bravo-mobile-overlay md:hidden">
            <motion.button type="button" className="bravo-mobile-scrim"
              aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: .26 }} />
            <motion.div id="bravo-mobile-drawer" role="dialog"
              aria-modal="true" aria-label="Navegación de BRAVO"
              className="bravo-mobile-drawer"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ duration: .55, ease: [0.19, 1, 0.22, 1] }}>
              <button ref={drawerCloseRef} type="button"
                className="bravo-mobile-close" aria-label="Cerrar navegación"
                onClick={() => { setMobileOpen(false); menuTriggerRef.current?.focus() }}>
                <X size={19} aria-hidden="true"/>
              </button>
              <BravoSidebar {...sideProps}/>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main id="bravo-main-content" className="relative z-10 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-9">
        <div className="mx-auto w-full max-w-7xl">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  )
}
