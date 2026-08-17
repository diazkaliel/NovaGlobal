import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import BravoBackground from '../../components/bravo/BravoBackground'
import { Sparkles, ArrowRight, ShieldCheck, Lock, Mail, AlertCircle, RefreshCw } from 'lucide-react'

export default function BravoLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/bravo')
    } catch (err) {
      console.error('Error en login de Bravo:', err)
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Error de conexión: No se pudo comunicar con el servidor.')
      } else {
        setError(err.response?.data?.detail || 'Credenciales de acceso incorrectas')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07070b] flex items-center justify-center relative overflow-hidden text-left font-sans select-none">
      {/* Animated Canvas Background */}
      <BravoBackground />

      {/* Ambient Warm Glows */}
      <div className="fixed top-1/4 -left-20 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 -right-20 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-[#0f0f18]/90 backdrop-blur-2xl border border-amber-500/25 rounded-3xl p-8 shadow-2xl shadow-amber-950/40 relative overflow-hidden">
          
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

          {/* Header & Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
              <Sparkles size={12} className="text-amber-400" />
              <span>Taller Textil & Estampados</span>
            </div>

            <motion.h1
              className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase italic drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              BRAVO<span className="text-amber-500">.</span>
            </motion.h1>

            <p className="text-stone-400 text-xs mt-2 tracking-wider font-mono">
              SISTEMA DE GESTIÓN Y PRODUCCIÓN
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-stone-400 text-[11px] font-bold uppercase tracking-wider block font-mono">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500 group-focus-within:text-amber-400 transition-colors">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#141420] border border-stone-800 focus:border-amber-500/80 rounded-xl pl-10 pr-4 py-3 text-white text-xs placeholder-stone-600 focus:outline-none transition-all font-mono"
                  placeholder="admin@bravo.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-stone-400 text-[11px] font-bold uppercase tracking-wider block font-mono">
                Contraseña de Acceso
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500 group-focus-within:text-amber-400 transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-[#141420] border border-stone-800 focus:border-amber-500/80 rounded-xl pl-10 pr-4 py-3 text-white text-xs placeholder-stone-600 focus:outline-none transition-all font-mono"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-400 text-xs flex items-center gap-2 font-mono"
              >
                <AlertCircle size={15} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Taller</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform stroke-[3]" />
                </>
              )}
            </button>
          </form>

          {/* Footer badge */}
          <div className="mt-8 pt-4 border-t border-stone-800/60 flex items-center justify-center gap-2 text-stone-500 text-[10px] font-mono uppercase tracking-widest">
            <ShieldCheck size={13} className="text-amber-500/70" />
            <span>Acceso Seguro Encriptado // Bravo Engine</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
