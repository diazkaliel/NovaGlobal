import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react'
import api from '../../api/client'

const MONOPO_EASE = [0.19, 1, 0.22, 1]

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
      <div className="min-h-screen bg-obsidian text-paper font-roobert flex items-center justify-center p-6 antialiased">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: MONOPO_EASE }}
          className="bg-[#09090b] border border-white/20 p-8 md:p-12 max-w-md w-full text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-full overflow-hidden border border-white/25 mx-auto">
            <img src="/logo-bravo.jpg" alt="Bravo" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-ash-mist block">Decisión Registrada</span>
            <h2 className="text-2xl font-light text-white uppercase tracking-tight">Confirmación de Taller</h2>
            <p className="text-ash-mist text-xs leading-relaxed pretty-text">{successMessage}</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full rounded-[75px] bg-slate-pill hover:bg-white hover:text-black border border-white/20 text-white py-3 text-xs uppercase tracking-widest transition-colors cursor-pointer"
          >
            Volver a la Web Principal
          </button>
        </motion.div>
      </div>
    )
  }

  // Vista de Login/Auth Ligera
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-obsidian text-paper font-roobert flex flex-col items-center justify-center p-6 antialiased">
        <div className="w-full max-w-md space-y-8 relative z-10">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-amber-500/40 mx-auto bg-black shadow-[0_0_20px_rgba(255,172,46,0.2)]">
              <img src="/logo-bravo.jpg" alt="Personalizaciones Bravo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-ash-mist block">Personalizaciones Bravo</span>
              <h1 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-tight">
                Muestra Digital de Taller
              </h1>
              <p className="text-felt-gray text-xs mt-1">Orden de Trabajo #{orderNumber}</p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="bg-[#09090b] border border-white/20 p-6 md:p-8 space-y-6 text-left">
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-ash-mist">
                Ingresa tu RUT o Teléfono registrado
              </label>
              <input 
                type="text" 
                value={rutOrPhone}
                onChange={(e) => setRutOrPhone(e.target.value)}
                placeholder="Ej: 12345678-9 o +569..."
                className="w-full bg-obsidian border border-white/20 px-4 py-3 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>

            {error && (
              <div className="p-3 border border-rose-500/40 text-rose-400 text-xs font-mono">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-[75px] bg-slate-pill hover:bg-white hover:text-black border border-white/30 text-white py-3 text-xs uppercase tracking-widest font-normal transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verificando con Taller...' : 'Acceder a mi Muestra'}
            </button>
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
    <div className="min-h-screen bg-obsidian text-paper font-roobert antialiased selection:bg-paper selection:text-obsidian pb-20">
      
      {/* Header Monopo Saigon con Logotipo */}
      <header className="bg-obsidian/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 h-[66px] px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-amber-500/35 shrink-0 bg-black shadow-[0_0_10px_rgba(255,172,46,0.15)]">
            <img src="/logo-bravo.jpg" alt="Personalizaciones Bravo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-white font-medium leading-tight">
              Personalizaciones Bravo · Muestra Digital
            </h1>
            <p className="text-[10px] text-ash-mist font-mono leading-tight">Orden #{order.order_number}</p>
          </div>
        </div>
        
        <div className="px-4 py-1 rounded-[75px] border border-white/20 text-[10px] uppercase tracking-wider text-ash-mist">
          {order.device_type} · {order.brand}
        </div>
      </header>

      <main className="max-w-[1078px] mx-auto px-6 py-12 text-left space-y-12">
        
        {/* Alerta de Estado si ya no está pendiente de aprobación */}
        {order.status !== 'diagnostico' && order.status !== 'presupuesto_enviado' && (
          <div className="p-4 border border-white/20 bg-[#09090b] flex items-start gap-4">
            <span className="text-xl">ℹ️</span>
            <div>
              <h3 className="text-white text-xs uppercase tracking-widest font-normal mb-1">Orden en Curso</h3>
              <p className="text-ash-mist text-xs">
                Actualmente se encuentra en estado: <strong className="text-white uppercase">{order.status.replace('_', ' ')}</strong>. 
                No requiere modificaciones adicionales.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2 border-b border-white/10 pb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist block">Control de Calidad Previo</span>
          <h2 className="text-3xl font-light text-white uppercase tracking-tight balance-text">
            Revisión de Muestra Digital.
          </h2>
          <p className="text-xs text-ash-mist max-w-2xl pretty-text">
            Por favor, verifica minuciosamente que el arte vectorial, los colores y las proporciones coincidan con tu requerimiento antes de autorizar la impresión física.
          </p>
        </div>

        {/* Visualización Dual a Corte Neto (0px Radius) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Diseño Original */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-widest text-ash-mist block">
              01 / Archivo Vectorial Original
            </span>
            <div className="bg-[#09090b] border border-white/15 p-6 aspect-square flex items-center justify-center overflow-hidden">
              {order.design_file_url ? (
                <img 
                  src={getFullUrl(order.design_file_url)} 
                  alt="Diseño Original" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-felt-gray font-mono text-xs uppercase tracking-widest">Sin archivo cargado</span>
              )}
            </div>
          </div>

          {/* Mockup Aplicado */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-widest text-ash-mist block">
              02 / Simulación Volumétrica Final
            </span>
            <div className="bg-[#09090b] border border-white/15 p-6 aspect-square flex items-center justify-center overflow-hidden">
              {order.mockup_file_url ? (
                <img 
                  src={getFullUrl(order.mockup_file_url)} 
                  alt="Mockup Final" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-felt-gray font-mono text-xs uppercase tracking-widest">Muestra en preparación</span>
              )}
            </div>
          </div>
        </div>

        {/* Panel de Decisiones (Solo visible si está en estado correcto) */}
        {(order.status === 'diagnostico' || order.status === 'presupuesto_enviado') && (
          <div className="bg-[#09090b] border border-white/20 p-8 space-y-6">
            <h3 className="text-base uppercase tracking-widest text-white font-normal text-center">
              ¿Autorizas el paso a la línea de estampado?
            </h3>
            
            {error && (
              <div className="p-4 border border-rose-500/40 text-rose-400 text-xs font-mono text-center">
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
                    className="rounded-[75px] border border-white/30 hover:border-white text-white px-8 py-3.5 text-xs uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Solicitar Correcciones
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="rounded-[75px] bg-white hover:bg-ash-mist text-black px-10 py-3.5 text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? 'Procesando...' : 'Aprobar Muestra y Producir'}
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleReject}
                  className="max-w-2xl mx-auto space-y-4 overflow-hidden"
                >
                  <label className="block text-[10px] uppercase tracking-widest text-ash-mist">
                    Detalla los ajustes técnicos requeridos
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej: Aumentar el tamaño del logo 2cm, mover hacia el centro del pecho..."
                    rows="4"
                    className="w-full bg-obsidian border border-white/20 p-4 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white"
                    required
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-6 py-2.5 text-xs uppercase tracking-widest text-ash-mist hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-[75px] bg-slate-pill hover:bg-white hover:text-black border border-white/20 text-white px-6 py-2.5 text-xs uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Enviando...' : 'Enviar Observaciones'}
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
