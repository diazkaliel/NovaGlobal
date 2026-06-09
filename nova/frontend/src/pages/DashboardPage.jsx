import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Wrench, Users, Package, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import { useGlitch } from '../hooks/useGlitch'
import DeliveryCalendar from '../components/DeliveryCalendar'

const modules = [
  {
    title: 'Reparaciones',
    description: 'Gestión de órdenes, diagnósticos y estado de equipos en taller.',
    icon: Wrench,
    path: '/repairs',
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    border: 'hover:border-cyan-500/50',
    iconColor: 'text-cyan-400',
    glow: 'hover:shadow-cyan-500/20',
  },
  {
    title: 'Clientes',
    description: 'Directorio, historial de servicios y comunicación automatizada.',
    icon: Users,
    path: '/clients',
    color: 'purple',
    gradient: 'from-purple-500/20 to-purple-500/5',
    border: 'hover:border-purple-500/50',
    iconColor: 'text-purple-400',
    glow: 'hover:shadow-purple-500/20',
  },
  {
    title: 'Inventario',
    description: 'Control de stock, piezas de repuesto y alertas de reabastecimiento.',
    icon: Package,
    path: '/inventory',
    color: 'emerald',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
    border: 'hover:border-emerald-500/50',
    iconColor: 'text-emerald-400',
    glow: 'hover:shadow-emerald-500/20',
  },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const glitchTitle = useGlitch('NOVA', true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      <AnimatedBackground />

      {/* Glow orbs */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-black tracking-[0.3em]"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {glitchTitle}
          </motion.h1>

          <div className="flex items-center gap-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-400 text-sm">{user?.name}</span>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors text-sm"
            >
              <LogOut size={15} />
              Salir
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <p className="text-gray-600 text-sm tracking-widest uppercase mb-2">
            Panel de control · Nova Tecnologies
          </p>
          <h2 className="text-4xl font-black">
            Bienvenido,{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {user?.name}
            </span>
          </h2>
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="h-px w-48 bg-gradient-to-r from-cyan-500 to-purple-500 mt-4"
          />
        </motion.div>

        {/* Cards de módulos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((mod, i) => (
            <motion.button
              key={mod.title}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(mod.path)}
              className={`
                relative text-left p-6 rounded-2xl border border-gray-800/50
                bg-gradient-to-br ${mod.gradient}
                backdrop-blur-sm ${mod.border} ${mod.glow}
                hover:shadow-xl transition-all duration-300 group overflow-hidden
              `}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
              <motion.div
                className="absolute top-0 left-0 h-px bg-gradient-to-r from-transparent via-current to-transparent w-full opacity-0 group-hover:opacity-100"
                style={{ color: mod.color === 'cyan' ? '#06b6d4' : mod.color === 'purple' ? '#a855f7' : '#10b981' }}
              />
              <mod.icon
                size={36}
                className={`${mod.iconColor} mb-5 transition-transform duration-300 group-hover:scale-110`}
              />
              <h3 className="text-lg font-bold mb-2">{mod.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{mod.description}</p>
              <motion.div
                className={`${mod.iconColor} mt-4 text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              >
                Acceder →
              </motion.div>
            </motion.button>
          ))}
        </div>

        {/* Calendario de entregas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10"
        >
          <p className="text-gray-600 text-xs tracking-widest uppercase mb-4">
            Calendario de Entregas
          </p>
          <DeliveryCalendar />
        </motion.div>

      </main>
    </div>
  )
}