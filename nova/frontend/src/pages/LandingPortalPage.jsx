import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Users, Wrench, Palette, ChevronRight, Lock } from 'lucide-react'
import { isLocalHost } from '../utils/system'

export default function LandingPortalPage() {
  const navigate = useNavigate()
  const [selectedPublicOption, setSelectedPublicOption] = useState(false)

  const handleSystemRedirect = (target) => {
    const host = window.location.hostname.toLowerCase()
    const protocol = window.location.protocol
    const isDev = isLocalHost(host)

    if (isDev) {
      if (target === 'login') {
        navigate('/login')
      } else {
        localStorage.setItem('dev_override', target)
        window.location.href = '/'
      }
    } else {
      localStorage.removeItem('dev_override')
      const baseHost = host.replace(/^(nova\.|bravo\.|admin\.)/, '')
      if (target === 'login') {
        window.location.href = `${protocol}//admin.${baseHost}/login`
      } else {
        window.location.href = `${protocol}//${target}.${baseHost}/`
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      
      {/* Background Neon Glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="relative z-10 max-w-4xl w-full text-center space-y-12">
        
        {/* Header Branding */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-mono font-bold text-gray-400 tracking-wider uppercase"
          >
            <ShieldAlert size={14} className="text-cyan-400 animate-pulse" />
            Ecosistema Corporativo NovaGlobal
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tighter text-white"
          >
            Selecciona tu <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 bg-clip-text text-transparent">Destino</span>
          </motion.h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            Bienvenido al portal global de servicios. Elige si deseas ingresar al panel de administración del negocio o visitar las tiendas de atención al público.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          
          {/* Card 1: ADMINISTRACIÓN */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
            onClick={() => handleSystemRedirect('login')}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:border-cyan-500/40 p-8 rounded-3xl shadow-xl hover:shadow-cyan-500/5 text-left cursor-pointer transition-all duration-300 group flex flex-col justify-between h-72"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-cyan-950/50 border border-cyan-800/40 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300">
                <Lock size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors">
                  Acceso Administrativo
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Portal para administradores, personal del taller y técnicos. Requiere credenciales de acceso seguras.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold uppercase tracking-wider mt-4">
              Ingresar al Login
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 2: PARTE PÚBLICA */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 100, delay: 0.3 }}
            onClick={() => setSelectedPublicOption(true)}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:border-amber-500/40 p-8 rounded-3xl shadow-xl hover:shadow-amber-500/5 text-left cursor-pointer transition-all duration-300 group flex flex-col justify-between h-72"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-950/50 border border-amber-800/40 rounded-2xl flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
                <Users size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                  Sitios Públicos
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Consulta de precios, reseñas, y registro de pedidos o fallas técnicas directo desde la web pública.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider mt-4">
              Explorar Tiendas
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

        </div>

      </div>

      {/* SECTOR SELECTOR MODAL (PUBLIC SITES) */}
      <AnimatePresence>
        {selectedPublicOption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setSelectedPublicOption(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative space-y-6 text-left"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-1.5">
                <h3 className="font-black text-xl text-white">Selecciona Tienda Pública</h3>
                <p className="text-xs text-gray-400">Elige la división corporativa que deseas explorar en la web pública:</p>
              </div>

              <div className="space-y-3">
                {/* Opción 1: Nova (Servicio Técnico) */}
                <div
                  onClick={() => handleSystemRedirect('nova')}
                  className="flex items-center gap-4 p-4 bg-slate-950 hover:bg-cyan-950/20 border border-slate-800 hover:border-cyan-500/40 rounded-2xl cursor-pointer group transition-all"
                >
                  <div className="w-10 h-10 bg-cyan-950 text-cyan-400 border border-cyan-800/20 rounded-xl flex items-center justify-center">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white group-hover:text-cyan-400 transition-colors">Nova - Servicio Técnico</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Asistente técnico virtual, FAQs y cotizaciones.</p>
                  </div>
                </div>

                {/* Opción 2: Bravo (Personalizaciones) */}
                <div
                  onClick={() => handleSystemRedirect('bravo')}
                  className="flex items-center gap-4 p-4 bg-slate-950 hover:bg-amber-950/20 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer group transition-all"
                >
                  <div className="w-10 h-10 bg-amber-950 text-amber-400 border border-amber-800/20 rounded-xl flex items-center justify-center">
                    <Palette size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white group-hover:text-amber-400 transition-colors">Bravo - Personalizados</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Catálogo de estampados y pedidos express.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPublicOption(false)}
                className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-gray-400 hover:text-white text-xs font-bold uppercase rounded-xl border border-slate-800 transition-all cursor-pointer"
              >
                Volver
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
