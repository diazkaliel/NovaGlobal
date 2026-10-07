import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Palette, Package, Users, RefreshCw, LogOut,
  Menu, X, Shirt, BarChart3, Globe, DollarSign, Coins, Cog,
  Home, MessageCircle, FileText, Shield, BookOpen
} from 'lucide-react'
import { switchSystem } from '../../utils/system'
import { getUnreadCount } from '../../api/chats'
import { getBravoOrders } from '../../api/bravoOrders'
import AttendanceWidget from '../AttendanceWidget'


export default function BravoLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const unreadMessagesRef = useRef(0)

  // Estado para solicitudes web pendientes
  const [pendingWebCount, setPendingWebCount] = useState(0)
  const pendingWebCountRef = useRef(0)

  const currentPath = location.pathname

  // Mantener las referencias sincronizadas con el estado
  useEffect(() => {
    unreadMessagesRef.current = unreadMessages
  }, [unreadMessages])

  useEffect(() => {
    pendingWebCountRef.current = pendingWebCount
  }, [pendingWebCount])

  // Polling para notificaciones de chat y solicitudes web
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }

    const checkNotifications = async () => {
      try {
        const chatRes = await getUnreadCount({ system: 'bravo' })
        const chatCount = chatRes.data.unread_count
        const prevChatCount = unreadMessagesRef.current
        
        if (chatCount > prevChatCount && 'Notification' in window && Notification.permission === 'granted') {
          new Notification("Bravo - Nuevos mensajes 💬", {
            body: `Tienes ${chatCount} mensaje(s) sin leer de tus clientes en el chat.`,
            icon: "/logo-bravo.jpg"
          })
        }
        setUnreadMessages(chatCount)

        const ordersRes = await getBravoOrders({ status: 'pendiente' })
        const webCount = ordersRes.data.length
        const prevWebCount = pendingWebCountRef.current


        if (webCount > prevWebCount && 'Notification' in window && Notification.permission === 'granted') {
          new Notification("Bravo - Nueva Solicitud Web ⏳", {
            body: `Se ha registrado una nueva solicitud de cotización web en el sistema.`,
            icon: "/logo-bravo.jpg"
          })
        }
        setPendingWebCount(webCount)

      } catch (error) {
        console.error("Error checking notifications in BravoLayout", error)
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

  const handleLogout = () => {
    logout()
    localStorage.removeItem('dev_override')
    window.location.href = '/'
  }

  const handleSwitchSystem = () => {
    switchSystem('bravo', navigate)
  }

  const menuItems = [
    { name: 'Dashboard', path: '/bravo', icon: LayoutDashboard },
    { name: 'Nueva Orden', path: '/bravo/orders/new', icon: Palette },
    { name: 'Órdenes', path: '/bravo/orders', icon: Shirt, badge: pendingWebCount > 0 ? pendingWebCount : null },
    { name: 'Mensajes', path: '/bravo/chats', icon: MessageCircle, badge: unreadMessages > 0 ? unreadMessages : null },

    { name: 'Maquinarias', path: '/bravo/machines', icon: Cog },
    { name: 'Ventas', path: '/bravo/sales', icon: DollarSign },
    { name: 'Caja Chica', path: '/bravo/cash-register', icon: Coins },
    { name: 'Productos / Insumos', path: '/bravo/products', icon: Package },
    { name: 'Carta de Precios', path: '/bravo/price-menu', icon: BookOpen },
    { name: 'Clientes', path: '/bravo/clients', icon: Users },
    { name: 'Estadísticas', path: '/bravo/stats', icon: BarChart3 },
    { name: 'Cotizaciones', path: '/bravo/quotations', icon: FileText },
    { name: 'Configuración Web', path: '/bravo/admin-web', icon: Globe },
    ...(user?.role === 'admin' ? [{ name: 'Centro de Control & Auditoría', path: '/bravo/users-attendance', icon: Shield }] : [])
  ]

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between bg-bravo-sidebar p-4 select-none">
      <div>
        {/* Brand / Logo */}
        <div className="p-2 mb-6 flex items-center justify-between border-b border-bravo-border/60 pb-5">
          <button
            onClick={() => { navigate('/bravo'); setMobileOpen(false) }}
            className="flex items-center gap-3 cursor-pointer border-none bg-transparent hover:opacity-90 active:scale-98 transition-all"
          >
            <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-[0_0_14px_rgba(217,119,6,0.25)] shrink-0">
              <img src="/logo-bravo.jpg" alt="Bravo Logo" className="w-full h-full rounded-full object-cover border-2 border-amber-900/20" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-widest bg-gradient-to-r from-amber-600 via-orange-500 to-bravo-accent-warm bg-clip-text text-transparent leading-none">
                BRAVO
              </h1>
              <p className="text-[8px] uppercase tracking-wider text-bravo-accent/80 font-bold mt-1">
                Personalizaciones
              </p>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.path

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setMobileOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer border-none text-left ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-500 font-bold shadow-xs'
                    : 'text-bravo-text-muted hover:bg-bravo-card hover:text-bravo-text'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={`transition-colors ${
                      isActive ? 'text-amber-500' : 'text-bravo-text-muted group-hover:text-bravo-text'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="flex items-center justify-center w-5 h-5 text-[10px] font-black bg-rose-500 text-white rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Area: Switch System & Logout */}
      <div className="space-y-3 pt-4 border-t border-bravo-border/60">
        <button
          onClick={handleSwitchSystem}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.05)]"
          title="Cambiar a Nova Technologies"
        >
          <RefreshCw size={13} className="shrink-0 animate-spin-slow text-cyan-400" />
          <span>Cambiar a Nova</span>
        </button>

        <div className="p-3 bg-bravo-card border border-bravo-border rounded-xl space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-bravo-text truncate leading-none">{user?.name || 'Bravo Admin'}</p>
              <p className="text-[10px] text-bravo-text-muted truncate mt-0.5">{user?.email || 'admin@bravo.com'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('dev_override')
              window.location.href = '/'
            }}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-xs font-semibold text-bravo-text-muted hover:bg-bravo-border hover:text-bravo-text transition-colors cursor-pointer border-none bg-transparent"
          >
            <Home size={14} />
            Portal Principal
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border-none bg-transparent"
          >
            <LogOut size={14} />
            Salir del Sistema
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row h-screen print:h-auto print:overflow-visible print:bg-white bg-bravo-bg text-bravo-text font-sans overflow-hidden">
      {/* Mobile Header */}
      <header className="flex md:hidden print:hidden items-center justify-between p-3.5 bg-bravo-sidebar backdrop-blur-xl border-b border-bravo-border shrink-0 z-40">
        <button
          onClick={() => { navigate('/bravo'); setMobileOpen(false) }}
          className="flex items-center gap-2.5 cursor-pointer border-none bg-transparent"
        >
          <div className="relative w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-[0_0_10px_rgba(217,119,6,0.25)] shrink-0">
            <img src="/logo-bravo.jpg" alt="Bravo Logo" className="w-full h-full rounded-full object-cover border border-amber-900/20" />
          </div>
          <span className="text-xs font-black tracking-widest bg-gradient-to-r from-amber-600 to-yellow-400 bg-clip-text text-transparent">
            BRAVO
          </span>
        </button>
        <div className="flex items-center gap-2">
          <AttendanceWidget system="bravo" />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-bravo-text-muted hover:text-bravo-text rounded-lg border border-bravo-border bg-bravo-card cursor-pointer"
          >
            <Menu size={17} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex print:hidden w-64 border-r border-bravo-border flex-col shrink-0 z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer (Sidebar) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-64 max-w-xs h-full flex flex-col z-10"
            >
              <div className="absolute top-4 right-[-44px]">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 bg-bravo-card border border-bravo-border text-bravo-text-muted hover:text-bravo-text rounded-r-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              {renderSidebarContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen print:h-auto print:overflow-visible print:block overflow-hidden">
        {/* Desktop Header Top Bar */}
        <header className="hidden md:flex print:hidden items-center justify-between px-8 py-3.5 bg-bravo-sidebar/60 backdrop-blur-md border-b border-bravo-border shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-bravo-text-muted">
              Sistema: <strong className="text-amber-500">Bravo Personalizaciones</strong>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <AttendanceWidget system="bravo" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto print:overflow-visible print:p-0 print:h-auto relative p-6 md:p-10 z-10">
          <div className="max-w-6xl mx-auto w-full print:max-w-none print:w-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}
