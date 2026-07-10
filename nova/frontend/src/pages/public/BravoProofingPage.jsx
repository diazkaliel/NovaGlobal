import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../api/client'

export default function BravoProofingPage() {
  const { orderNumber } = useParams()
  const navigate = useNavigate()

  const [rutOrPhone, setRutOrPhone] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [successMessage, setSuccessMessage] = useState(null)

  // 1. Paso de Autenticación Ligera
  const handleAuth = async (e) => {
    e.preventDefault()
    if (!rutOrPhone.trim()) return

    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/public/proof/${orderNumber}?rut_or_phone=${encodeURIComponent(rutOrPhone.trim())}`)
      setOrder(res.data)
      setIsAuthenticated(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo acceder. Verifica tus datos e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Aprobar Diseño
  const handleApprove = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await api.post(`/api/public/proof/${orderNumber}/approve`, { rut_or_phone: rutOrPhone })
      setSuccessMessage(res.data.message)
      setOrder(prev => ({ ...prev, status: 'diseno_aprobado' }))
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al aprobar el diseño.')
    } finally {
      setActionLoading(false)
    }
  }

  // 3. Rechazar / Solicitar Cambios
  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) return
    
    setActionLoading(true)
    setError(null)
    try {
      const res = await api.post(`/api/public/proof/${orderNumber}/reject`, { 
        rut_or_phone: rutOrPhone,
        reason: rejectReason 
      })
      setSuccessMessage(res.data.message)
      setOrder(prev => ({ ...prev, status: 'diagnostico' }))
      setShowRejectForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar la solicitud.')
    } finally {
      setActionLoading(false)
    }
  }

  // Vista de Éxito posterior a una acción
  if (successMessage) {
    return (
      <div className="min-h-screen bg-[#07070b] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Listo!</h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">{successMessage}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
          >
            Volver al Inicio
          </button>
        </motion.div>
      </div>
    )
  }

  // Vista de Login/Auth Ligera
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07070b] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Aprobación de Muestra</h1>
            <p className="text-zinc-400">Orden #{orderNumber}</p>
          </div>

          <form onSubmit={handleAuth} className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-6 md:p-8 rounded-3xl shadow-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Para continuar, ingresa tu RUT o Teléfono
                </label>
                <input 
                  type="text" 
                  value={rutOrPhone}
                  onChange={(e) => setRutOrPhone(e.target.value)}
                  placeholder="Ej: 12345678-9 o +569..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Ver mi Muestra'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Mapear URLs para asegurar que sean absolutas si vienen relativas del backend
  const getFullUrl = (url) => {
    if (!url) return null
    return url.startsWith('http') ? url : `${api.defaults.baseURL}${url}`
  }

  // Vista Principal de Aprobación
  return (
    <div className="min-h-screen bg-[#07070b] text-zinc-300 pb-20">
      {/* Header Minimalista */}
      <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-amber-900/20">
              B
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">Bravo Proofing</h1>
              <p className="text-xs text-zinc-500 font-mono">#{order.order_number}</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium text-zinc-300 border border-zinc-700">
            {order.device_type} · {order.brand}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Alerta de Estado si ya no está pendiente de aprobación */}
        {order.status !== 'diagnostico' && order.status !== 'presupuesto_enviado' && (
          <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="text-blue-400 font-bold mb-1">Esta orden ya fue procesada</h3>
              <p className="text-blue-300/80 text-sm">
                Actualmente se encuentra en estado: <strong className="uppercase">{order.status.replace('_', ' ')}</strong>. 
                Ya no requiere aprobación en esta etapa.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Revisa tu diseño final</h2>
          <p className="text-zinc-400">Por favor, verifica cuidadosamente que el diseño, los colores y la ubicación sean los correctos antes de enviarlo a producción.</p>
        </div>

        {/* Visualización Dual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          
          {/* Diseño Original */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-zinc-300">1. Diseño Original (Tu archivo)</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 aspect-square flex items-center justify-center overflow-hidden">
              {order.design_file_url ? (
                <img 
                  src={getFullUrl(order.design_file_url)} 
                  alt="Diseño Original" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-zinc-600 font-mono text-sm">No hay archivo original</span>
              )}
            </div>
          </div>

          {/* Mockup Aplicado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">2. Muestra Final (Cómo se verá)</h3>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30 font-bold uppercase tracking-wider">Preview</span>
            </div>
            <div className="bg-gradient-to-br from-zinc-900 to-black border-2 border-amber-500/20 rounded-3xl p-2 aspect-square flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.05)]">
              {order.mockup_file_url ? (
                <img 
                  src={getFullUrl(order.mockup_file_url)} 
                  alt="Mockup Final" 
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span className="text-zinc-600 font-mono text-sm">Mockup no disponible</span>
              )}
            </div>
          </div>
        </div>

        {/* Panel de Decisiones (Solo visible si está en estado correcto) */}
        {(order.status === 'diagnostico' || order.status === 'presupuesto_enviado') && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-6 text-center">¿Estás de acuerdo con el resultado?</h3>
            
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {!showRejectForm ? (
                <motion.div 
                  key="buttons"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex-1 md:flex-none"
                  >
                    No, quiero hacer cambios
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex-1 md:flex-none"
                  >
                    {actionLoading ? 'Procesando...' : 'Sí, Aprobar Diseño'}
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleReject}
                  className="max-w-2xl mx-auto overflow-hidden"
                >
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    ¿Qué cambios necesitas que hagamos?
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej: El logo debe ir más arriba, cambiar el color de fondo, etc."
                    rows="4"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 mb-4"
                    required
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-6 py-2.5 bg-transparent hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Enviando...' : 'Enviar solicitud de cambios'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        )}

      </main>
    </div>
  )
}
