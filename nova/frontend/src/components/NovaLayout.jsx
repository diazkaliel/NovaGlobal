import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Wrench, Users, Package, Smartphone, Calendar,
  ClipboardList, BarChart3, RefreshCw, LogOut, Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react'

export default function NovaLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('nova_sidebar_collapsed') === 'true'
  })

  const selectedSystem = localStorage.getItem('selected_system') || 'nova'
  const isBravo = selectedSystem === 'bravo'

  if (isBravo) {
    return <Outlet />
  }

  const currentPath = location.pathname

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchSystem = () => {
    localStorage.removeItem('selected_system')
    navigate('/select-system')
  }

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newVal = !prev
      localStorage.setItem('nova_sidebar_collapsed', String(newVal))
      return newVal
    })
  }

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Reparaciones', path: '/repairs', icon: Wrench },
    { name: 'Clientes', path: '/clients', icon: Users },
    { name: 'Inventario', path: '/inventory', icon: Package },
    { name: 'Precios Pantallas', path: '/screen-prices', icon: Smartphone },
    { name: 'Calendario', path: '/calendar', icon: Calendar },
    { name: 'Cotizador Rápido', path: '/diagnostics', icon: ClipboardList },
    { name: 'Estadísticas', path: '/stats', icon: BarChart3 },
  ]

  const SidebarContent = ({ isDrawer = false }) => {
    const showFull = !isCollapsed || isDrawer

    return (
      <div className="flex flex-col h-full justify-between bg-[#07070a]/90 backdrop-blur-xl border-r border-gray-900/60 text-left select-none">
        <div>
          {/* Logo / Header Area */}
          <div className={`p-6 border-b border-gray-900/60 flex items-center justify-between gap-3 ${!showFull ? 'justify-center' : ''}`}>
            <button
              onClick={() => {
                navigate('/')
                setMobileOpen(false)
              }}
              className="flex items-center gap-3 cursor-pointer text-left border-none bg-transparent hover:opacity-90 active:scale-98 transition-all"
              title="Volver a Inicio"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] shrink-0">
                <Wrench size={18} className="text-cyan-400 animate-pulse" />
              </div>
              {showFull && (
                <div className="min-w-0">
                  <span className="text-sm font-black tracking-widest bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 bg-clip-text text-transparent">
                    NOVA
                  </span>
                  <p className="text-[9px] uppercase tracking-wider text-cyan-500/70 font-bold">
                    Tecnologies
                  </p>
                </div>
              )}
            </button>

            {/* Collapse Toggle (Desktop only, and not in Mobile drawer) */}
            {showFull && !isDrawer && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg border border-gray-880 bg-gray-950/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 cursor-pointer hidden md:flex transition-all"
                title="Colapsar menú"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>

          {/* Menú de navegación */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const active = item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path)

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path)
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border-l-2 cursor-pointer relative group ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/5 text-cyan-400 border-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.12)]'
                      : 'text-gray-400 border-transparent hover:bg-gray-900/30 hover:text-white'
                  } ${!showFull ? 'justify-center px-0' : ''}`}
                  title={!showFull ? item.name : undefined}
                >
                  <item.icon
                    size={showFull ? 16 : 18}
                    className={`shrink-0 ${active ? 'text-cyan-400' : 'text-gray-455 group-hover:text-gray-350'}`}
                  />
                  {showFull && <span className="truncate">{item.name}</span>}
                  
                  {/* Tooltip flotante si está colapsado */}
                  {!showFull && (
                    <div className="absolute left-[70px] bg-[#0c0d12] border border-gray-850 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-cyan-400 tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
                      {item.name}
                    </div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer Sidebar (User & Actions) */}
        <div className="p-4 border-t border-gray-900/60 space-y-2.5">
          {/* User Info Card */}
          <div className={`flex items-center gap-3 px-2.5 py-2 bg-gray-950/30 rounded-xl border border-gray-900/40 ${!showFull ? 'justify-center px-0 bg-transparent border-transparent' : ''}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-xs shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {showFull && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-200 truncate">{user?.name}</p>
                <p className="text-[9px] text-gray-500 truncate mt-0.5">{user?.email}</p>
              </div>
            )}
          </div>

          <hr className="border-gray-900/50" />

          {/* Acciones del Sistema */}
          <div className="space-y-1">
            <button
              onClick={handleSwitchSystem}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:bg-gray-900/40 hover:text-cyan-400 transition-colors cursor-pointer relative group ${!showFull ? 'justify-center px-0' : ''}`}
              title={!showFull ? 'Cambiar Sistema' : undefined}
            >
              <RefreshCw size={14} className="shrink-0" />
              {showFull && <span>Cambiar Sistema</span>}
              {!showFull && (
                <div className="absolute left-[70px] bg-[#0c0d12] border border-gray-850 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-cyan-400 tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
                  Cambiar Sistema
                </div>
              )}
            </button>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-rose-500/10 hover:text-rose-455 transition-colors cursor-pointer relative group ${!showFull ? 'justify-center px-0' : ''}`}
              title={!showFull ? 'Salir del Sistema' : undefined}
            >
              <LogOut size={14} className="shrink-0" />
              {showFull && <span>Cerrar Sesión</span>}
              {!showFull && (
                <div className="absolute left-[70px] bg-[#0c0d12] border border-gray-850 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-rose-455 tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
                  Cerrar Sesión
                </div>
              )}
            </button>

            {/* Expand Toggle (Desktop only, visible when collapsed) */}
            {!showFull && (
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center p-2 mt-2 rounded-lg border border-gray-905 bg-gray-950/40 text-gray-450 hover:text-cyan-400 cursor-pointer hidden md:flex transition-all"
                title="Expandir menú"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#050508] text-slate-100 font-sans overflow-hidden">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between p-4 bg-[#07070a]/90 backdrop-blur-xl border-b border-gray-900/60 shrink-0 z-40 text-left">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer border-none bg-transparent hover:opacity-90 active:scale-98 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.15)] shrink-0">
            <Wrench size={15} className="text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 bg-clip-text text-transparent">
              NOVA
            </h1>
            <p className="text-[7px] uppercase tracking-wider text-cyan-500/70 font-bold leading-none">
              Tecnologies
            </p>
          </div>
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-gray-400 hover:text-white rounded-lg border border-gray-800 bg-gray-900/40 cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 z-30 transition-all duration-300 ease-in-out animate-fade-in"
        style={{ width: isCollapsed ? '80px' : '256px' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Sidebar Overlay) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Sidebar drawer box */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-64 max-w-xs h-full flex flex-col z-10"
            >
              {/* Close Button on drawer side */}
              <div className="absolute top-4 right-[-44px]">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 bg-[#07070a]/90 border border-gray-900 text-gray-400 hover:text-white rounded-r-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent isDrawer={true} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area with Custom Y Scrollbar */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 z-10">
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
