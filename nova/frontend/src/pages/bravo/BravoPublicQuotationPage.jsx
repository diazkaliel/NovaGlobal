import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, FileText, Phone, Mail, AlertCircle, Loader2, Download } from 'lucide-react'
import api from '../../api/client'
import { generateBravoQuotationPDF } from '../../utils/generateBravoPDF'

const MONOPO_EASE = [0.19, 1, 0.22, 1]

const STATUS_CFG = {
  borrador:  { label: 'Borrador',  textClass: 'text-felt-gray', borderClass: 'border-white/20' },
  enviada:   { label: 'Enviada',   textClass: 'text-white',      borderClass: 'border-white/30' },
  aceptada:  { label: 'Aceptada',  textClass: 'text-white',      borderClass: 'border-white/40' },
  rechazada: { label: 'Rechazada', textClass: 'text-ash-mist',   borderClass: 'border-white/20' },
}

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.enviada
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[75px] text-[10px] uppercase tracking-[0.16em] font-normal border ${cfg.borderClass} ${cfg.textClass}`}>
      {status === 'aceptada' && <CheckCircle size={11} />}
      {status === 'rechazada' && <XCircle size={11} />}
      {status === 'borrador' && <Clock size={11} />}
      {status === 'enviada' && <FileText size={11} />}
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
          ? 'Cotización aceptada. Nos pondremos en contacto contigo para coordinar el trabajo.'
          : 'Cotización rechazada. Si cambias de opinión, contáctanos.'
      )
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo actualizar el estado.')
    } finally {
      setUpdating(false)
    }
  }

  // ─── Loading State ───
  if (loading) return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-ash-mist text-[11px] uppercase tracking-[0.2em] font-normal">Cargando cotización...</p>
      </div>
    </div>
  )

  // ─── Error State ───
  if (error && !quotation) return (
    <div className="min-h-screen bg-obsidian font-roobert flex items-center justify-center p-6 antialiased">
      <div className="text-center max-w-sm space-y-4">
        <AlertCircle size={40} className="mx-auto text-felt-gray" />
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.25em] text-ash-mist block">Error de Consulta</span>
          <h2 className="text-xl font-light text-white uppercase tracking-tight">Cotización no Disponible</h2>
        </div>
        <p className="text-ash-mist text-xs leading-relaxed">{error}</p>
        <p className="text-felt-gray text-[11px]">Si crees que esto es un error, contacta a Personalizaciones Bravo.</p>
      </div>
    </div>
  )

  const q = quotation
  const clientName = q.client?.name || q.client_name || 'Cliente'
  const clientPhone = q.client?.phone || q.client_phone || ''
  const clientEmail = q.client?.email || q.client_email || ''
  const isDecided = q.status === 'aceptada' || q.status === 'rechazada'

  return (
    <div className="min-h-screen bg-obsidian text-paper font-roobert antialiased selection:bg-paper selection:text-obsidian">

      {/* ─── HEADER MONOPO SAIGON (66px, Hairline Border, Logotipo Oficial) ─── */}
      <header className="sticky top-0 z-50 h-[66px] bg-obsidian/90 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0 bg-black">
            <img src="/logo-bravo.jpg" alt="Personalizaciones Bravo" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[12px] tracking-[0.18em] font-normal uppercase text-white block leading-tight">
              Personalizaciones Bravo
            </span>
            <span className="text-[9px] tracking-[0.18em] text-felt-gray uppercase font-normal leading-tight block">
              Cotización Oficial · Quillota
            </span>
          </div>
        </div>

        <StatusPill status={q.status} />
      </header>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="max-w-[1078px] mx-auto px-6 py-12 space-y-12">

        {/* Encabezado Editorial */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: MONOPO_EASE }}
          className="space-y-3 border-b border-white/10 pb-8 text-left"
        >
          <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist block">
            Cotización de Taller
          </span>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <h1 className="text-3xl sm:text-4xl font-light text-white uppercase tracking-tight font-mono">
              {q.quote_number}
            </h1>
            <p className="text-felt-gray text-[11px] font-normal">
              Emitida el {new Date(q.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
              {q.valid_until && ` · Válida hasta ${new Date(q.valid_until + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            </p>
          </div>
        </motion.div>

        {/* Mensaje de éxito tras decisión */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: MONOPO_EASE }}
              className={`p-6 border text-center text-xs leading-relaxed ${
                q.status === 'aceptada'
                  ? 'border-white/20 bg-inkstone text-white'
                  : 'border-white/10 bg-[#09090b] text-ash-mist'
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-ash-mist mb-1">Decisión Registrada</p>
              <p className="font-normal">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error inline */}
        {error && (
          <div className="p-4 border border-rose-500/40 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">

          {/* ─── Columna Izquierda: Datos del Cliente ─── */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ash-mist block">Para</span>
              <h2 className="text-lg font-normal text-white tracking-tight">{clientName}</h2>

              {clientPhone && (
                <p className="text-xs text-ash-mist flex items-center gap-2">
                  <Phone size={11} className="text-felt-gray" />
                  {clientPhone}
                </p>
              )}
              {clientEmail && (
                <p className="text-xs text-ash-mist flex items-center gap-2">
                  <Mail size={11} className="text-felt-gray" />
                  {clientEmail}
                </p>
              )}
            </div>

            {/* Notas y términos */}
            {q.notes && (
              <div className="space-y-2 border-t border-white/10 pt-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-ash-mist block">Notas</span>
                <p className="text-xs text-ash-mist leading-relaxed">{q.notes}</p>
              </div>
            )}

            {q.terms && (
              <div className="space-y-2 border-t border-white/10 pt-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-ash-mist block">Términos y Condiciones</span>
                <p className="text-xs text-felt-gray leading-relaxed">{q.terms}</p>
              </div>
            )}
          </div>

          {/* ─── Columna Derecha: Ítems y Totales ─── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Detalle de la Cotización */}
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ash-mist block">Detalle de la Cotización</span>

              <div className="space-y-2">
                {q.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.5, ease: MONOPO_EASE }}
                    className="flex items-center justify-between gap-4 p-4 bg-[#09090b] border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-normal text-white truncate">{item.description}</p>
                      <p className="text-[11px] text-felt-gray">
                        {item.quantity} × ${Number(item.unit_price).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <span className="text-sm font-normal text-white font-mono flex-shrink-0">
                      ${Number(item.subtotal).toLocaleString('es-CL')}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="border-t border-white/10 pt-6">
              <div className="max-w-xs ml-auto space-y-3">
                <div className="flex justify-between text-xs text-ash-mist">
                  <span>Subtotal</span>
                  <span className="font-mono">${Number(q.subtotal).toLocaleString('es-CL')}</span>
                </div>
                {Number(q.discount) > 0 && (
                  <div className="flex justify-between text-xs text-white">
                    <span>Descuento</span>
                    <span className="font-mono">-${Number(q.discount).toLocaleString('es-CL')}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-3 border-t border-white/15">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-ash-mist font-normal">Total</span>
                  <span className="text-2xl font-light text-white tracking-tight font-mono">
                    ${Number(q.total).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Acciones del Cliente ─── */}
            <div className="border-t border-white/10 pt-8 space-y-4">

              {/* Botón Descargar PDF */}
              <button
                onClick={() => generateBravoQuotationPDF(q, { download: true })}
                className="w-full rounded-[75px] border border-white/20 hover:border-white text-white py-3 text-[11px] tracking-[0.15em] uppercase font-normal transition-all duration-[800ms] ease-monopo cursor-pointer bg-transparent focus-visible:outline-none flex items-center justify-center gap-2"
              >
                <Download size={13} />
                Descargar Cotización Oficial en PDF
              </button>

              <AnimatePresence mode="wait">
                {successMsg ? null : isDecided ? (
                  <motion.div
                    key="decided"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-center p-6 border ${
                      q.status === 'aceptada'
                        ? 'border-white/20 bg-inkstone text-white'
                        : 'border-white/10 bg-[#09090b] text-ash-mist'
                    }`}
                  >
                    <p className="text-xs font-normal leading-relaxed">
                      {q.status === 'aceptada'
                        ? 'Has aceptado esta cotización. Nos pondremos en contacto contigo.'
                        : 'Esta cotización fue rechazada. Contáctanos si cambias de opinión.'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: MONOPO_EASE }}
                    className="space-y-4 pt-2"
                  >
                    <p className="text-center text-[11px] text-felt-gray uppercase tracking-[0.15em]">
                      ¿Estás de acuerdo con esta cotización?
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleDecision('rechazada')}
                        disabled={updating}
                        className="rounded-[75px] border border-white/20 hover:border-white text-ash-mist hover:text-white py-3 text-[11px] tracking-[0.15em] uppercase font-normal transition-all duration-[800ms] cursor-pointer bg-transparent focus-visible:outline-none flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {updating ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleDecision('aceptada')}
                        disabled={updating}
                        className="rounded-[75px] bg-slate-pill hover:bg-white hover:text-black border border-white/20 text-white py-3 text-[11px] tracking-[0.15em] uppercase font-normal transition-all duration-[800ms] ease-monopo cursor-pointer focus-visible:outline-none flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {updating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                        Aceptar Cotización
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* ─── FOOTER EDITORIAL ─── */}
      <footer className="py-12 bg-obsidian border-t border-white/10 text-[11px] text-felt-gray font-normal">
        <div className="max-w-[1078px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15 shrink-0 bg-black">
              <img src="/logo-bravo.jpg" alt="Personalizaciones Bravo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-white uppercase tracking-[0.2em] block font-normal text-xs leading-tight">
                Personalizaciones Bravo
              </span>
              <span className="text-[10px] text-felt-gray uppercase tracking-widest block leading-tight mt-0.5">
                Taller de Autor · Quillota, Región de Valparaíso
              </span>
            </div>
          </div>
          <p className="text-felt-gray text-[10px]">
            © {new Date().getFullYear()} Personalizaciones Bravo. Cotización generada digitalmente.
          </p>
        </div>
      </footer>
    </div>
  )
}
