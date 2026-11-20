import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import AnimatedBackground from '../components/AnimatedBackground'

export default function LoginPage() {
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
      localStorage.setItem('dev_override', 'nova')
      localStorage.setItem('selected_system', 'nova')
      const userData = await login(form.email, form.password)
      if (userData?.role !== 'admin' && userData?.system === 'bravo') {
        navigate('/bravo')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('Error en login:', err)
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Error de conexión: El frontend no encuentra el backend.')
      } else {
        setError(err.response?.data?.detail || 'Credenciales incorrectas')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#05070c] flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-[#0b101b]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-[0.25em] text-white mb-2">
              NOVA
            </h1>
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent mt-3" />
            <p className="text-slate-400 text-xs mt-3 tracking-widest uppercase font-semibold">
              Sistema de Gestión Técnica
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div>
              <label className="text-slate-400 text-xs tracking-wider uppercase block mb-2 font-semibold">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-900/70 border border-slate-800 hover:border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-all duration-200"
                placeholder="admin@nova.com"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs tracking-wider uppercase block mb-2 font-semibold">
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-900/70 border border-slate-800 hover:border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-all duration-200"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="nova-cta relative w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase mt-2 cursor-pointer"
            >
              <span>
                {loading ? 'Autenticando...' : 'Ingresar al Sistema'}
              </span>
            </motion.button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="text-xs text-slate-400 hover:text-cyan-400 font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              ← Volver al Selector de Portal
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
