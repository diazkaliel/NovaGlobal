import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Wrench, Palette, LogOut } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'

export default function SystemSelectorPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  const handleSelect = (system) => {
    localStorage.setItem('selected_system', system)
    if (system === 'nova') {
      navigate('/')
    } else {
      navigate('/bravo')
    }
  }

  const handleLogout = () => {
    auth.logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden flex flex-col justify-between">
      <AnimatedBackground />

      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-6 max-w-6xl mx-auto w-full flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
            GRUPO BRAVO
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">Bienvenido, {auth.user?.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          <LogOut size={13} />
          Cerrar Sesión
        </button>
      </header>

      {/* Main Selection Area */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-6 py-12 flex-grow flex flex-col justify-center">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-200"
          >
            Selecciona el sistema de trabajo
          </motion.h2>
          <p className="text-gray-500 text-sm mt-2">Escoge la plataforma a la que deseas acceder</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card NOVA */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            whileHover={{ y: -8 }}
            className="group relative bg-gray-950/60 backdrop-blur-xl border border-cyan-500/10 hover:border-cyan-500/40 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-cyan-500/5 flex flex-col justify-between h-[320px]"
            onClick={() => handleSelect('nova')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <div>
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                <Wrench className="text-cyan-400" size={26} />
              </div>
              <h3 className="text-2xl font-black tracking-wider text-cyan-400 group-hover:text-cyan-300 transition-colors">
                NOVA
              </h3>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                Gestión de reparaciones, servicio técnico para dispositivos, control de stock de repuestos y directorio de clientes.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold tracking-widest text-cyan-400 uppercase mt-4">
              Ingresar al Sistema &rarr;
            </div>
          </motion.div>

          {/* Card BRAVO */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileHover={{ y: -8 }}
            className="group relative bg-gray-950/60 backdrop-blur-xl border border-amber-500/10 hover:border-amber-500/40 rounded-2xl p-8 cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-amber-500/5 flex flex-col justify-between h-[320px]"
            onClick={() => handleSelect('bravo')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-50 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <div>
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                <Palette className="text-amber-400" size={26} />
              </div>
              <h3 className="text-2xl font-black tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors">
                BRAVO
              </h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold absolute top-8 right-8">
                Personalizaciones
              </span>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                Gestión de órdenes personalizadas, estampado, sublimación, catálogo de productos base y registro de trabajos de diseño.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold tracking-widest text-amber-400 uppercase mt-4">
              Ingresar al Sistema &rarr;
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-gray-900 text-xs text-gray-600">
        &copy; {new Date().getFullYear()} Grupo Bravo. Todos los derechos reservados.
      </footer>
    </div>
  )
}
