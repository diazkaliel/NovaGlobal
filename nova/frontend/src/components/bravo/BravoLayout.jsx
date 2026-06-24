import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Palette, Package, Users, RefreshCw, LogOut, Menu, X } from 'lucide-react'

export default function BravoLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentPath = location.pathname

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchSystem = () => {
    localStorage.removeItem('selected_system')
    navigate('/select-system')
  }

  const menuItems = [
    { name: 'Dashboard', path: '/bravo', icon: LayoutDashboard },
    { name: 'Nueva Orden', path: '/bravo/orders/new', icon: Palette },
    { name: 'Productos Base', path: '/bravo/products', icon: Package },
    { name: 'Clientes', path: '/clients', icon: Users },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between bg-[#0e0d0c]">
      <div>
        {/* Logo */}
        <div className="p-6 border-b border-stone-900 flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-widest bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
            BRAVO
          </h1>
          <p className="text-[9px] uppercase tracking-wider text-amber-500/70 font-bold">
            Estudio Creativo
          </p>
        </div>

        {/* Menú */}
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                    : 'text-stone-400 hover:bg-stone-900/40 hover:text-stone-200 border border-transparent'
                }`}
              >
                <item.icon size={18} className={active ? 'text-amber-400' : 'text-stone-450'} />
                {item.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Sidebar (User & Actions) */}
      <div className="p-4 border-t border-stone-900 space-y-2">
        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2 bg-stone-900/20 rounded-xl border border-stone-900/40">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-200 truncate">{user?.name}</p>
            <p className="text-[9px] text-stone-500 truncate">{user?.email}</p>
          </div>
        </div>

        <hr className="border-stone-900" />

        {/* Actions */}
        <div className="space-y-1">
          <button
            onClick={handleSwitchSystem}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-stone-400 hover:bg-stone-900/50 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Cambiar Sistema
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-stone-500 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            Salir del Sistema
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#070605] text-stone-100 font-sans overflow-hidden">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between p-4 bg-[#0e0d0c] border-b border-stone-900 shrink-0 z-40">
        <div>
          <h1 className="text-lg font-black tracking-widest bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            BRAVO
          </h1>
          <p className="text-[8px] uppercase tracking-wider text-amber-500/70 font-bold">
            Estudio Creativo
          </p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-stone-400 hover:text-white rounded-lg border border-stone-800 bg-stone-900/50 cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-stone-900 flex-col shrink-0 z-30">
        <SidebarContent />
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
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
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
                  className="p-2 bg-[#0e0d0c] border border-stone-800 text-stone-400 hover:text-white rounded-r-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative p-6 md:p-10 z-10">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
