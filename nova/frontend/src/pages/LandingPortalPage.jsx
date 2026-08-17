import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wrench, Palette, ChevronRight, Lock, Sparkles, Cpu, Layers, 
  ArrowRight, ShieldCheck, Zap, Globe, Store, Terminal, Activity,
  Coins, FileText, CheckCircle2, SlidersHorizontal
} from 'lucide-react'
import { isLocalHost } from '../utils/system'

export default function LandingPortalPage() {
  const navigate = useNavigate()
  const [hoveredCard, setHoveredCard] = useState(null)

  const handleSystemRedirect = (target, role = 'admin') => {
    const host = window.location.hostname.toLowerCase()
    const protocol = window.location.protocol
    const isDev = isLocalHost(host)

    if (isDev) {
      localStorage.setItem('dev_override', target)
      if (role === 'admin') {
        navigate('/login')
      } else {
        window.location.href = '/'
      }
    } else {
      localStorage.removeItem('dev_override')
      const parts = host.split('.')
      const rootDomain = parts.slice(-2).join('.')
      if (role === 'admin') {
        window.location.href = `${protocol}//admin-${target}.${rootDomain}/login`
      } else {
        if (target === 'nova') {
          window.location.href = `${protocol}//${rootDomain}/`
        } else {
          window.location.href = `${protocol}//${target}.${rootDomain}/`
        }
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-[#04060d] text-white flex flex-col justify-between p-4 sm:p-8 overflow-hidden font-sans select-none">
      
      {/* Background Animated Glow Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Futuristic Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d1527_1px,transparent_1px),linear-gradient(to_bottom,#0d1527_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* TOP HEADER */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-6 border-b border-gray-900/80">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-amber-500/20 border border-white/15 flex items-center justify-center shadow-lg shadow-cyan-950/30">
            <Zap size={20} className="text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-widest bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400 bg-clip-text text-transparent uppercase font-mono">
                NOVAGLOBAL
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-300 uppercase">
                Enterprise Hub v3.0
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Plataforma Unificada de Gestión para Servicios & Taller</p>
          </div>
        </div>

        {/* Live operational badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-950/80 border border-gray-800/80 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-gray-300 text-[11px]">Sistemas Operativos 100%</span>
          </div>
        </div>
      </header>

      {/* MAIN COMMAND CENTER */}
      <main className="relative z-10 max-w-6xl mx-auto w-full py-8 flex-grow flex flex-col justify-center">
        
        {/* Title and subtitle */}
        <div className="text-center space-y-3 mb-10">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono uppercase tracking-widest text-gray-400"
          >
            <Activity size={12} className="text-cyan-400 animate-pulse" />
            Centro de Control & Accesos Directos
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black tracking-tight text-white"
          >
            ¿A qué división deseas <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-400 bg-clip-text text-transparent">acceder</span> hoy?
          </motion.h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
            Selecciona el entorno de trabajo correspondiente a tu rol o ingresa a las vitrinas públicas de atención a clientes.
          </p>
        </div>

        {/* DUAL CORE CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* ================= CARD 1: NOVA TECH SERVICES ================= */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            onMouseEnter={() => setHoveredCard('nova')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative group bg-gradient-to-b from-[#091122]/90 to-[#050914]/95 border border-cyan-500/20 hover:border-cyan-500/60 rounded-3xl p-7 flex flex-col justify-between shadow-2xl hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] transition-all duration-300 overflow-hidden"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 opacity-70 group-hover:opacity-100 transition-opacity" />

            {/* Background watermarked icon */}
            <div className="absolute -bottom-10 -right-10 text-cyan-500/5 group-hover:text-cyan-500/10 transition-colors pointer-events-none">
              <Cpu size={220} />
            </div>

            <div className="space-y-6 relative z-10">
              {/* Header division badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all duration-300 shadow-lg shadow-cyan-950/40">
                    <Wrench size={26} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block">División Hardware</span>
                    <h2 className="text-2xl font-black text-white tracking-wide group-hover:text-cyan-300 transition-colors font-mono">
                      NOVA TECH
                    </h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-[10px] font-mono text-cyan-300 font-bold uppercase">
                  Servicio Técnico
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Gestión integral de laboratorio técnico: recepción de dispositivos, ciclo de diagnóstico, inventario de repuestos, arqueo de caja chica y seguimiento en tiempo real.
              </p>

              {/* Feature Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Órdenes & Ficha Técnica',
                  'Control de Pantallas',
                  'Caja Chica Diaria',
                  'Diagnóstico IA'
                ].map((feat) => (
                  <span key={feat} className="px-2.5 py-1 rounded-lg bg-gray-900/80 border border-gray-800 text-[10px] font-mono text-gray-400 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-cyan-400" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-8 relative z-10 border-t border-cyan-500/15 mt-6">
              <button
                onClick={() => handleSystemRedirect('nova', 'admin')}
                className="w-full py-3.5 px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-between cursor-pointer group/btn active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <Lock size={15} />
                  Ingresar a Panel Técnico (Admin)
                </span>
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleSystemRedirect('nova', 'public')}
                className="w-full py-2.5 px-4 bg-gray-900/90 hover:bg-gray-850 text-gray-300 hover:text-cyan-300 border border-gray-800 hover:border-cyan-500/30 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Globe size={14} className="text-cyan-400" />
                Ver Portal de Clientes (Consulta Pública)
              </button>
            </div>
          </motion.div>

          {/* ================= CARD 2: BRAVO PERSONALIZACIONES ================= */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            onMouseEnter={() => setHoveredCard('bravo')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative group bg-gradient-to-b from-[#191008]/90 to-[#0f0905]/95 border border-amber-500/20 hover:border-amber-500/60 rounded-3xl p-7 flex flex-col justify-between shadow-2xl hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] transition-all duration-300 overflow-hidden"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500 opacity-70 group-hover:opacity-100 transition-opacity" />

            {/* Background watermarked icon */}
            <div className="absolute -bottom-10 -right-10 text-amber-500/5 group-hover:text-amber-500/10 transition-colors pointer-events-none">
              <Layers size={220} />
            </div>

            <div className="space-y-6 relative z-10">
              {/* Header division badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all duration-300 shadow-lg shadow-amber-950/40">
                    <Palette size={26} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block">Atelier & Estampado</span>
                    <h2 className="text-2xl font-black text-white tracking-wide group-hover:text-amber-300 transition-colors font-mono">
                      BRAVO STUDIO
                    </h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/40 text-[10px] font-mono text-amber-300 font-bold uppercase">
                  Textil & Sublimación
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Taller textil y producción personalizada: cotizaciones instantáneas, recetas automáticas de insumos (tintas, films), módulo de inspección QA y arqueo de caja chica.
              </p>

              {/* Feature Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Cotizador Dinámico',
                  'Recetas & Insumos',
                  'Control de Calidad QA',
                  'Caja Chica Taller'
                ].map((feat) => (
                  <span key={feat} className="px-2.5 py-1 rounded-lg bg-gray-900/80 border border-gray-800 text-[10px] font-mono text-gray-400 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-amber-400" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-8 relative z-10 border-t border-amber-500/15 mt-6">
              <button
                onClick={() => handleSystemRedirect('bravo', 'admin')}
                className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-between cursor-pointer group/btn active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <Lock size={15} />
                  Ingresar a Panel de Taller (Admin)
                </span>
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleSystemRedirect('bravo', 'public')}
                className="w-full py-2.5 px-4 bg-gray-900/90 hover:bg-gray-850 text-gray-300 hover:text-amber-300 border border-gray-800 hover:border-amber-500/30 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Store size={14} className="text-amber-400" />
                Ver Catálogo & Vitrina Pública
              </button>
            </div>
          </motion.div>

        </div>

      </main>

      {/* FOOTER BAR */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full pt-6 border-t border-gray-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500 font-mono">
        <div className="flex items-center gap-2">
          <span>NovaGlobal Corporation © {new Date().getFullYear()}</span>
          <span>•</span>
          <span className="text-gray-400">Todos los derechos reservados</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-gray-400">
            <ShieldCheck size={13} className="text-emerald-400" /> Autenticación JWT Segura
          </span>
        </div>
      </footer>

    </div>
  )
}
