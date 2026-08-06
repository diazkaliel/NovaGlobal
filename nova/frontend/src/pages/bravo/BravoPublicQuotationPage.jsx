import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, FileText, Phone, Mail, AlertCircle, Loader2 } from 'lucide-react'
import api from '../../api/client'

const STATUS_CFG = {
  borrador:  { label: 'Borrador',  color: 'text-zinc-400',    bg: 'bg-zinc-800/60', icon: Clock },
  enviada:   { label: 'Enviada',   color: 'text-blue-400',    bg: 'bg-blue-900/30', icon: FileText },
  aceptada:  { label: 'Aceptada', color: 'text-emerald-400', bg: 'bg-emerald-900/30', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'text-rose-400',   bg: 'bg-rose-900/30',  icon: XCircle },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.enviada
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${cfg.color} ${cfg.bg}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

export default function BravoPublicQuotationPage() {
  const { quoteNumber } = useParams()
  const [quotation, setQuotation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/quotations/public/${quoteNumber}`)
        setQuotation(res.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar la cotización.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quoteNumber])

  const handleDecision = async (newStatus) => {
    setUpdating(true)
    setSuccessMsg('')
    try {
      const res = await api.patch(`/quotations/public/${quoteNumber}/status?new_status=${newStatus}`)
      setQuotation(res.data)
      setSuccessMsg(
        newStatus === 'aceptada'
          ? '✅ ¡Cotización aceptada! Nos pondremos en contacto contigo para coordinar el trabajo.'
          : '❌ Cotización rechazada. Si cambias de opinión, contáctanos.'
      )
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo actualizar el estado.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm font-mono">Cargando cotización...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="mx-auto mb-4 text-rose-500/60" />
        <h2 className="text-xl font-black text-white mb-2">Cotización no disponible</h2>
        <p className="text-zinc-500 text-sm">{error}</p>
        <p className="text-zinc-600 text-xs mt-3">Si crees que esto es un error, contacta a Personalizaciones Bravo.</p>
      </div>
    </div>
  )

  const q = quotation
  const clientName = q.client?.name || q.client_name || 'Cliente'
  const clientPhone = q.client?.phone || q.client_phone || ''
  const clientEmail = q.client?.email || q.client_email || ''
  const isDecided = q.status === 'aceptada' || q.status === 'rechazada'

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8 px-4">
      {/* Fondo decorativo */}
      <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">

        {/* Header Bravo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-900/30 border border-amber-700/40 mb-4">
            <img
              src="/logo-bravo.jpg"
              alt="Bravo Logo"
              className="w-12 h-12 rounded-xl object-cover"
              onError={e => { e.target.onerror = null; e.target.style.display = 'none' }}
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Personalizaciones Bravo</h1>
          <p className="text-zinc-500 text-sm mt-1">Cotización Oficial · Quillota</p>
        </motion.div>

        {/* Card Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md"
        >
          {/* Encabezado de la cotización */}
          <div className="bg-gradient-to-r from-amber-950/40 to-orange-950/20 border-b border-zinc-800 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest font-mono mb-1">Cotización</p>
                <h2 className="text-3xl font-black text-white font-mono">{q.quote_number}</h2>
                <p className="text-zinc-500 text-xs mt-1">
                  Emitida el {new Date(q.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {q.valid_until && ` · Válida hasta ${new Date(q.valid_until + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                </p>
              </div>
              <StatusBadge status={q.status} />
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="p-6 border-b border-zinc-800/60">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Para</p>
            <p className="text-lg font-black text-white">{clientName}</p>
            {clientPhone && (
              <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
                <Phone size={12} className="text-zinc-600" /> {clientPhone}
              </p>
            )}
            {clientEmail && (
              <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
                <Mail size={12} className="text-zinc-600" /> {clientEmail}
              </p>
            )}
          </div>

          {/* Ítems */}
          <div className="p-6 border-b border-zinc-800/60">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Detalle de la Cotización</p>
            <div className="space-y-3">
              {q.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 bg-zinc-800/30 border border-zinc-800/60 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.description}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {item.quantity} × ${Number(item.unit_price).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <span className="text-sm font-black text-white font-mono flex-shrink-0">
                    ${Number(item.subtotal).toLocaleString('es-CL')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="p-6 border-b border-zinc-800/60">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono">${Number(q.subtotal).toLocaleString('es-CL')}</span>
              </div>
              {Number(q.discount) > 0 && (
                <div className="flex justify-between text-sm text-amber-400">
                  <span>Descuento</span>
                  <span className="font-mono">-${Number(q.discount).toLocaleString('es-CL')}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                <span className="text-base font-black text-white uppercase">Total</span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  ${Number(q.total).toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          </div>

          {/* Notas y términos */}
          {(q.notes || q.terms) && (
            <div className="p-6 border-b border-zinc-800/60 space-y-4">
              {q.notes && (
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Notas</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{q.notes}</p>
                </div>
              )}
              {q.terms && (
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Términos y Condiciones</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{q.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Acciones del cliente */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {successMsg ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-center p-5 rounded-2xl border ${q.status === 'aceptada' ? 'bg-emerald-900/20 border-emerald-700/30 text-emerald-300' : 'bg-rose-900/20 border-rose-700/30 text-rose-300'}`}
                >
                  <p className="font-bold text-sm leading-relaxed">{successMsg}</p>
                </motion.div>
              ) : isDecided ? (
                <motion.div
                  key="decided"
                  className={`text-center p-5 rounded-2xl border ${q.status === 'aceptada' ? 'bg-emerald-900/20 border-emerald-700/30 text-emerald-300' : 'bg-rose-900/20 border-rose-700/30 text-rose-300'}`}
                >
                  <p className="font-bold text-sm">
                    {q.status === 'aceptada'
                      ? '✅ Has aceptado esta cotización. ¡Gracias! Nos pondremos en contacto contigo.'
                      : '❌ Esta cotización fue rechazada. Contáctanos si cambias de opinión.'}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="actions" className="space-y-3">
                  <p className="text-center text-xs text-zinc-500 mb-4">¿Estás de acuerdo con esta cotización?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleDecision('rechazada')}
                      disabled={updating}
                      className="py-3 rounded-2xl border border-rose-500/30 bg-rose-900/10 text-rose-400 hover:bg-rose-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {updating ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleDecision('aceptada')}
                      disabled={updating}
                      className="py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {updating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      ¡Acepto!
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-700 pb-4">
          Personalizaciones Bravo · Quillota, Chile<br />
          Esta cotización fue generada digitalmente.
        </p>
      </div>
    </div>
  )
}
