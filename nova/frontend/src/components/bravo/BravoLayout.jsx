import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Palette, Package, Users, RefreshCw, LogOut, Menu, X, Wrench, BarChart3, Globe, DollarSign, Coins, Cog, Home, MessageCircle } from 'lucide-react'
import { switchSystem } from '../../utils/system'
import { getUnreadCount } from '../../api/chats'
import { getRepairs } from '../../api/repairs'

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
    // Pedir permiso para notificaciones nativas de escritorio
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }

    const checkNotifications = async () => {
      try {
        // 1. Polling de Mensajes de Chat
        const chatRes = await getUnreadCount()
        const chatCount = chatRes.data.unread_count
        const prevChatCount = unreadMessagesRef.current
        
        if (chatCount > prevChatCount && 'Notification' in window && Notification.permission === 'granted') {
          new Notification("Bravo - Nuevos mensajes 💬", {
            body: `Tienes ${chatCount} mensaje(s) sin leer de tus clientes en el chat.`,
            icon: "/logo-bravo.jpg"
          })
        }
        setUnreadMessages(chatCount)

        // 2. Polling de Solicitudes Web (Órdenes en estado 'pendiente')
        const repairsRes = await getRepairs({ system: 'bravo', status: 'pendiente' })
        const webCount = repairsRes.data.length
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

    checkNotifications() // Ejecución inmediata al montar
    const interval = setInterval(checkNotifications, 15000) // Check cada 15 segundos
    
    const handleChatRead = () => checkNotifications()
    window.addEventListener('chat_read', handleChatRead)
    window.addEventListener('order_created', handleChatRead) // Para actualizar al crear órdenes

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
    { name: 'Órdenes', path: '/bravo/orders', icon: Wrench, badge: pendingWebCount > 0 ? pendingWebCount : null },
    { name: 'Mensajes', path: '/bravo/chats', icon: MessageCircle, badge: unreadMessages > 0 ? unreadMessages : null },
    { name: 'Maquinarias', path: '/bravo/machines', icon: Cog },
    { name: 'Ventas', path: '/bravo/sales', icon: DollarSign },
    { name: 'Caja Chica', path: '/bravo/cash-register', icon: Coins },
    { name: 'Productos / Insumos', path: '/bravo/products', icon: Package },
    { name: 'Clientes', path: '/bravo/clients', icon: Users },
    { name: 'Estadísticas', path: '/bravo/stats', icon: BarChart3 },
    { name: 'Configuración Web', path: '/bravo/admin-web', icon: Globe },
  ]

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between bg-bravo-sidebar backdrop-blur-xl border-r border-bravo-border overflow-y-auto custom-scrollbar">
      <div>
        {/* Logo */}
        <div className="p-6 border-b border-bravo-border/80 flex items-center gap-3.5">
          <button
            onClick={() => { navigate('/bravo'); setMobileOpen(false) }}
            className="flex items-center gap-3.5 cursor-pointer border-none bg-transparent hover:opacity-90 active:scale-98 transition-all"
            title="Volver al Dashboard"
          >
            <div className="relative w-12 h-12 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-[0_0_20px_rgba(217,119,6,0.35)] shrink-0 group hover:scale-105 transition-transform duration-300">
              <img src="/logo-bravo.jpg" alt="Bravo Logo" className="w-full h-full rounded-full object-cover border-2 border-amber-900/20" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest bg-gradient-to-r from-amber-600 via-orange-500 to-bravo-accent-warm bg-clip-text text-transparent leading-none">
                BRAVO
              </h1>
              <p className="text-[9px] uppercase tracking-wider text-bravo-accent/80 font-bold mt-1">
                Personalizaciones
              </p>
            </div>
          </button>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const active = currentPath === item.path
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path)
                  setMobileOpen(false)
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-bravo-accent/15 to-bravo-accent-warm/8 text-bravo-accent-warm border border-bravo-accent/25 shadow-[0_0_15px_rgba(217,119,6,0.08)]'
                    : 'text-bravo-text-muted hover:bg-bravo-accent/5 hover:text-bravo-text border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={active ? 'text-bravo-accent' : 'text-bravo-text-muted'} />
                  {item.name}
                </div>
                {item.badge && (
                  <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shrink-0 shadow-sm shadow-rose-950/20">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Sidebar (User & Actions) */}
      <div className="p-4 border-t border-bravo-border space-y-2">
        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2 bg-bravo-accent/5 rounded-xl border border-bravo-border">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-bravo-accent/25 to-bravo-accent-warm/20 border border-bravo-accent/30 flex items-center justify-center font-black text-bravo-accent text-sm shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-bravo-text truncate">{user?.name}</p>
            <p className="text-[9px] text-bravo-text-muted truncate">{user?.email}</p>
          </div>
        </div>

        <hr className="border-bravo-border" />

        {/* Actions */}
        <div className="space-y-1">
          <button
            onClick={handleSwitchSystem}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-bravo-text-muted hover:bg-bravo-accent/8 hover:text-bravo-accent transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Cambiar a Nova Technologies
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('dev_override')
              window.location.href = '/'
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-bravo-text-muted hover:bg-bravo-accent/8 hover:text-bravo-accent transition-colors cursor-pointer"
          >
            <Home size={14} />
            Portal Principal
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-bravo-text-muted hover:bg-red-500/10 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            Salir del Sistema
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bravo-bg text-bravo-text font-sans overflow-hidden">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between p-4 bg-bravo-sidebar backdrop-blur-xl border-b border-bravo-border shrink-0 z-40">
        <button
          onClick={() => { navigate('/bravo'); setMobileOpen(false) }}
          className="flex items-center gap-3 cursor-pointer border-none bg-transparent"
        >
          <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-[0_0_14px_rgba(217,119,6,0.25)] shrink-0">
            <img src="/logo-bravo.jpg" alt="Bravo Logo" className="w-full h-full rounded-full object-cover border-2 border-amber-900/20" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest bg-gradient-to-r from-amber-600 via-orange-500 to-bravo-accent-warm bg-clip-text text-transparent leading-none">
              BRAVO
            </h1>
            <p className="text-[7px] uppercase tracking-wider text-bravo-accent/80 font-bold mt-0.5">
              Personalizaciones
            </p>
          </div>
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-bravo-text-muted hover:text-bravo-text rounded-lg border border-bravo-border bg-bravo-card cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-bravo-border flex-col shrink-0 z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer (Sidebar) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Sidebar Box */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-64 max-w-xs h-full flex flex-col z-10"
            >
              {/* Close Button Inside Drawer */}
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
      <main className="flex-1 overflow-y-auto relative p-6 md:p-10 z-10">
        <div className="max-w-6xl mx-auto w-full">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  )
}
