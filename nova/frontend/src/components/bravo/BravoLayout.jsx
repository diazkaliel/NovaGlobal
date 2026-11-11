import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3, CalendarDays, ClipboardList, Factory, LayoutDashboard,
  LogOut, Menu, Package, Palette, Plus, RefreshCw, Store, Users, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './bravo.css'

// Cada enlace corresponde a una ruta existente. El calendario es una sección
// del Dashboard: se enlaza con ancla y no se duplica la lógica de agenda.
export const BRAVO_NAV_GROUPS = [
  {
    label: 'GENERAL',
    entries: [
      { name: 'Panel principal', path: '/bravo', icon: LayoutDashboard },
      { name: 'Calendario de entregas', path: '/bravo#bravo-calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'ÓRDENES Y PRODUCCIÓN',
    entries: [
      { name: 'Nueva orden', path: '/bravo/orders/new', icon: Plus },
      { name: 'Todas las órdenes', path: '/bravo/orders', icon: ClipboardList },
      { name: 'Tablero de producción', path: '/bravo/production', icon: Factory },
    ],
  },
  {
    label: 'CATÁLOGO',
    entries: [
      { name: 'Productos e insumos', path: '/bravo/products', icon: Package },
      { name: 'Registrar producto', path: '/bravo/products/new', icon: Palette },
      { name: 'Vitrina de catálogo', path: '/bravo/showroom', icon: Store },
    ],
  },
  {
    label: 'GESTIÓN',
    entries: [
      { name: 'Clientes', path: '/bravo/clients', icon: Users },
      { name: 'Estadísticas', path: '/bravo/stats', icon: BarChart3 },
    ],
  },
]

export function bravoMenuIsActive(destination, location) {
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

function BravoSidebar({ user, location, onNavigate, onSwitchSystem, onLogout }) {
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
            {section.entries.map((entry) => {
              const active = bravoMenuIsActive(entry.path, location)
              const EntryIcon = entry.icon
              return (
                <Link key={entry.path} to={entry.path}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`bravo-nav-item ${active ? 'is-active' : ''}`}>
                  <EntryIcon size={17} strokeWidth={1.75} aria-hidden="true"/>
                  <span>{entry.name}</span>
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
        <div className="bravo-side-session">
          <button type="button" onClick={onSwitchSystem}>
            <RefreshCw size={15} aria-hidden="true"/> Cambiar sistema
          </button>
          <button type="button" onClick={onLogout}>
            <LogOut size={15} aria-hidden="true"/> Cerrar sesión
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
  const menuTriggerRef = useRef(null)
  const drawerCloseRef = useRef(null)

  useEffect(() => {
    if (!mobileOpen) return undefined
    drawerCloseRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        menuTriggerRef.current?.focus()
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
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])

  const handleSwitchSystem = () => {
    setMobileOpen(false)
    localStorage.removeItem('selected_system')
    navigate('/select-system')
  }

  const handleLogout = () => {
    setMobileOpen(false)
    logout()
    navigate('/login')
  }

  const sideProps = {
    user,
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

      <aside className="hidden h-full min-h-0 w-[280px] shrink-0 md:block"
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
