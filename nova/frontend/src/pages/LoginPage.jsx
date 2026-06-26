import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import AnimatedBackground from '../components/AnimatedBackground'
import { useGlitch } from '../hooks/useGlitch'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const glitchTitle = useGlitch('NOVA', true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
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
    <div className="min-h-screen bg-[#050508] flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground />

      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-gray-950/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl shadow-purple-500/5">

          {/* Logo con glitch */}
          <div className="text-center mb-10">
            <motion.h1
              className="text-5xl font-black tracking-[0.3em] mb-2"
              style={{
                background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {glitchTitle}
            </motion.h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-3"
            />
            <p className="text-gray-500 text-xs mt-3 tracking-widest uppercase">
              Sistema de Gestión Técnica
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="group">
              <label className="text-gray-400 text-xs tracking-wider uppercase block mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-900/50 border border-gray-800 group-hover:border-gray-700 focus:border-cyan-500 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-all duration-300"
                  placeholder="admin@nova.com"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 to-purple-500/0 group-focus-within:from-cyan-500/5 group-focus-within:to-purple-500/5 pointer-events-none transition-all duration-300" />
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <label className="text-gray-400 text-xs tracking-wider uppercase block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-gray-900/50 border border-gray-800 group-hover:border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase overflow-hidden group mt-2"
              style={{
                background: 'linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400))',
              }}
            >
              <span className="relative z-10 text-white">
                {loading ? 'Autenticando...' : 'Ingresar al Sistema'}
              </span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}