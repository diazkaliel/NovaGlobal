import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Wrench, Users, Package, Smartphone, Calendar,
  ClipboardList, BarChart3, RefreshCw, LogOut, Menu, X, ChevronLeft, ChevronRight, Globe, DollarSign, Coins, Shield
} from 'lucide-react'
import { switchSystem } from '../utils/system'
import AttendanceWidget from './AttendanceWidget'

export default function NovaLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
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
    localStorage.removeItem('dev_override')
    window.location.href = '/'
  }

  const handleSwitchSystem = () => {
    switchSystem('nova', navigate)
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
    { name: 'Ventas', path: '/sales', icon: DollarSign },
    { name: 'Caja Chica', path: '/cash-register', icon: Coins },
    { name: 'Clientes', path: '/clients', icon: Users },
    { name: 'Inventario', path: '/inventory', icon: Package },
    { name: 'Precios Pantallas', path: '/screen-prices', icon: Smartphone },
    { name: 'Calendario', path: '/calendar', icon: Calendar },
    { name: 'Cotizador Rápido', path: '/diagnostics', icon: ClipboardList },
    { name: 'Estadísticas', path: '/stats', icon: BarChart3 },
    { name: 'Configuración Web', path: '/admin-web', icon: Globe },
    ...(user?.role === 'admin' ? [{ name: 'Centro de Control & Auditoría', path: '/users-attendance', icon: Shield }] : [])
  ]

  const SidebarContent = ({ isDrawer = false }) => {
    const showFull = !isCollapsed || isDrawer

    return (
      <div className="flex flex-col h-full justify-between bg-[#07070a]/90 backdrop-blur-xl border-r border-gray-900/60 text-left select-none">
        <div>
          {/* Logo / Header Area */}
          <div className={`p-6 border-b border-gray-900/60 flex items-center justify-between gap-3 ${!showFull ? 'flex-col items-center justify-center p-4' : ''}`}>
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

            {/* Collapse Toggle (Desktop only) */}
            {!isDrawer && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg border border-gray-900 bg-gray-950/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 cursor-pointer hidden md:flex transition-all active:scale-95 mt-1"
                title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer border-none text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-purple-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'text-gray-400 hover:bg-gray-900/60 hover:text-gray-200'
                  } ${!showFull ? 'justify-center px-2 py-3' : ''}`}
                  title={!showFull ? item.name : undefined}
                >
                  <Icon
                    size={17}
                    className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  />
                  {showFull && <span className="truncate">{item.name}</span>}

                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                    />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer Area: Switch System & User Profile */}
        <div className="p-3 border-t border-gray-900/60 space-y-2">
          {/* Switch System Button */}
          <button
            onClick={handleSwitchSystem}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 text-purple-300 text-xs font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.05)] ${
              !showFull ? 'justify-center p-2' : ''
            }`}
            title="Cambiar a Bravo Personalizaciones"
          >
            <RefreshCw size={13} className="shrink-0 animate-spin-slow text-purple-400" />
            {showFull && <span>Cambiar a Bravo</span>}
          </button>

          {/* User Profile Card with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl bg-gray-950/50 hover:bg-gray-900/70 border border-gray-900/80 transition-all text-left cursor-pointer ${
                !showFull ? 'justify-center p-1.5' : ''
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-[0_0_8px_rgba(6,182,212,0.3)] shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {showFull && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-200 truncate leading-none">
                    {user?.name || 'Usuario'}
                  </p>
                  <p className="text-[9px] text-cyan-400/80 font-mono truncate uppercase tracking-wider mt-0.5">
                    {user?.role === 'admin' ? 'Administrador' : 'Técnico'}
                  </p>
                </div>
              )}
            </button>

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-56 p-1.5 bg-[#0d0d12] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-gray-900/60 mb-1">
                      <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                    </div>

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          navigate('/users-attendance')
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-purple-300 hover:bg-purple-500/10 transition-colors text-left cursor-pointer border-none bg-transparent"
                      >
                        <Shield size={13} className="text-purple-400 shrink-0" />
                        <span>Centro de Control & Auditoría</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        localStorage.removeItem('dev_override')
                        window.location.href = '/'
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors text-left cursor-pointer border-none bg-transparent"
                    >
                      <Globe size={13} className="text-gray-450 shrink-0" />
                      <span>Portal Principal</span>
                    </button>

                    <div className="h-[1px] bg-gray-900/60 my-1" />

                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleLogout()
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-455 hover:bg-rose-500/10 transition-colors text-left cursor-pointer border-none bg-transparent"
                    >
                      <LogOut size={13} className="text-rose-550 shrink-0" />
                      <span>Salir del Sistema</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#050508] text-slate-100 font-sans overflow-hidden">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between p-3.5 bg-[#07070a]/90 backdrop-blur-xl border-b border-gray-900/60 shrink-0 z-40 text-left">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer border-none bg-transparent hover:opacity-90 active:scale-98 transition-all"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.15)] shrink-0">
            <Wrench size={13} className="text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-widest bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent leading-tight">
              NOVA
            </h1>
            <p className="text-[7px] uppercase tracking-wider text-cyan-500/70 font-bold leading-none">
              Tecnologies
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <AttendanceWidget system="nova" />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg border border-gray-800 bg-gray-900/40 cursor-pointer"
          >
            <Menu size={17} />
          </button>
        </div>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Desktop Header Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-[#07070a]/60 backdrop-blur-md border-b border-gray-900/60 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400">
              Sistema: <strong className="text-cyan-400">Nova Technologies</strong>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <AttendanceWidget system="nova" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative p-4 md:p-8 z-10">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
