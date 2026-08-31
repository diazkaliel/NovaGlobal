import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Play, Square, Timer, CheckCircle, AlertCircle, History, X, Calendar, FileText } from 'lucide-react'
import { getMyAttendanceStatus, getMyAttendanceHistory, clockIn, clockOut } from '../api/attendance'

export default function AttendanceWidget({ system = 'nova' }) {
  const [statusData, setStatusData] = useState({
    is_clocked_in: false,
    active_record: null,
    today_records: [],
    today_total_minutes: 0
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [actionType, setActionType] = useState('in') // 'in' | 'out'
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('00:00:00')
  const [errorMsg, setErrorMsg] = useState(null)
  
  // Modal de Historial
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTab, setHistoryTab] = useState('today') // 'today' | 'all'
  const [fullHistory, setFullHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Cargar estado inicial de asistencia
  const fetchStatus = async () => {
    try {
      setLoading(true)
      const data = await getMyAttendanceStatus()
      setStatusData(data)
      setErrorMsg(null)
    } catch (err) {
      console.error('Error fetching attendance status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  // Cargar historial completo al abrir pestaña 'all'
  const fetchFullHistory = async () => {
    try {
      setLoadingHistory(true)
      const records = await getMyAttendanceHistory({ limit: 60 })
      setFullHistory(records)
    } catch (err) {
      console.error('Error fetching attendance history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (historyOpen && historyTab === 'all') {
      fetchFullHistory()
    }
  }, [historyOpen, historyTab])

  // Cronómetro en vivo si está en turno
  useEffect(() => {
    if (!statusData.is_clocked_in || !statusData.active_record?.clock_in) {
      setElapsedTime('00:00:00')
      return
    }

    const startTime = new Date(statusData.active_record.clock_in).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const diffMs = Math.max(0, now - startTime)

      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateTimer()
    const timerInterval = setInterval(updateTimer, 1000)
    return () => clearInterval(timerInterval)
  }, [statusData.is_clocked_in, statusData.active_record])

  const openActionModal = (type) => {
    setActionType(type)
    setNotes('')
    setErrorMsg(null)
    setModalOpen(true)
  }

  const handleConfirmAction = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)

    try {
      if (actionType === 'in') {
        await clockIn({ notes, system })
      } else {
        await clockOut({ notes })
      }
      setModalOpen(false)
      await fetchStatus()
      if (historyOpen && historyTab === 'all') {
        await fetchFullHistory()
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al procesar el marcaje de horario.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatHour = (isoStr) => {
    if (!isoStr) return '--:--'
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (isoStr) => {
    if (!isoStr) return ''
    return new Date(isoStr).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900/50 border border-gray-800 animate-pulse text-xs text-gray-400">
        <Clock size={14} className="text-gray-500" />
        <span>Cargando turno...</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Botón / Badge de Estado */}
        {statusData.is_clocked_in ? (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="flex items-center gap-2 px-2.5 py-1 text-emerald-400 font-mono text-xs font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline text-emerald-300 font-sans text-[11px] font-semibold uppercase tracking-wider">
                En Turno
              </span>
              <span className="tracking-widest bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {elapsedTime}
              </span>
            </div>

            <button
              onClick={() => openActionModal('out')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer hover:scale-102 active:scale-98"
              title="Marcar Salida de Turno"
            >
              <Square size={13} className="fill-rose-400" />
              <span className="hidden md:inline">Marcar Salida</span>
            </button>

            <button
              onClick={() => setHistoryOpen(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800/60 transition-colors cursor-pointer"
              title="Ver mi registro de asistencia"
            >
              <History size={15} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-900/60 border border-gray-800">
            <div className="flex items-center gap-1.5 px-2 py-1 text-gray-400 text-xs font-medium">
              <Clock size={14} className="text-gray-500 shrink-0" />
              <span className="hidden sm:inline text-[11px] text-gray-400">Fuera de turno</span>
            </div>

            <button
              onClick={() => openActionModal('in')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 text-xs font-black shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:opacity-95 transition-all cursor-pointer hover:scale-102 active:scale-98"
              title="Registrar Entrada Laboral"
            >
              <Play size={13} className="fill-gray-950" />
              <span>Marcar Entrada</span>
            </button>

            <button
              onClick={() => setHistoryOpen(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800/60 transition-colors cursor-pointer"
              title="Ver mi registro de asistencia"
            >
              <History size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Marcaje (Entrada / Salida) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d0d12] border border-gray-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      actionType === 'in'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {actionType === 'in' ? <Play size={16} className="fill-current" /> : <Square size={16} className="fill-current" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {actionType === 'in' ? 'Registrar Entrada' : 'Registrar Salida'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {actionType === 'in' ? 'Inicio de jornada laboral' : 'Cierre de turno'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleConfirmAction} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Observaciones / Notas (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={actionType === 'in' ? 'Ej: Turno mañana, soporte en taller...' : 'Ej: Turno completado, labores finalizadas...'}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <span>Hora exacta actual:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-800 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                      actionType === 'in'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-emerald-500/20 hover:opacity-95'
                        : 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/20 hover:opacity-95'
                    }`}
                  >
                    {submitting ? 'Procesando...' : actionType === 'in' ? 'Confirmar Entrada' : 'Confirmar Salida'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Historial de Asistencia del Colaborador */}
      <AnimatePresence>
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#0d0d12] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                    <History size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mi Registro de Asistencia</h3>
                    <p className="text-xs text-gray-400">Consulta tus horas de entrada, salida y tiempo trabajado</p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-800 px-5 pt-3 gap-3 bg-gray-950/40">
                <button
                  onClick={() => setHistoryTab('today')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    historyTab === 'today'
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Marcas de Hoy ({statusData.today_records.length})
                </button>
                <button
                  onClick={() => setHistoryTab('all')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    historyTab === 'all'
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Historial Completo
                </button>
              </div>

              {/* Body */}
              <div className="p-5 max-h-96 overflow-y-auto space-y-3">
                {historyTab === 'today' ? (
                  <>
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-300">Total acumulado hoy:</span>
                      <span className="font-mono text-cyan-300 font-bold text-sm">
                        {Math.floor(statusData.today_total_minutes / 60)}h {statusData.today_total_minutes % 60}m
                      </span>
                    </div>

                    {statusData.today_records.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-8">No tienes marcas registradas en el día de hoy.</p>
                    ) : (
                      statusData.today_records.map((r) => (
                        <div key={r.id} className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2 text-white font-medium">
                              <span>Entrada: <strong className="text-emerald-400">{formatHour(r.clock_in)}</strong></span>
                              <span>—</span>
                              <span>Salida: <strong className={r.clock_out ? 'text-rose-400' : 'text-amber-400'}>{r.clock_out ? formatHour(r.clock_out) : 'En curso'}</strong></span>
                            </div>
                            {r.notes && <p className="text-[11px] text-gray-400 mt-1 italic">{r.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 font-mono text-[11px] text-cyan-300 font-bold">
                              {r.total_minutes !== null ? `${Math.floor(r.total_minutes / 60)}h ${r.total_minutes % 60}m` : 'Activo'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    {loadingHistory ? (
                      <div className="text-center py-8 text-xs text-gray-400 animate-pulse">Cargando historial...</div>
                    ) : fullHistory.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-8">No hay registros de asistencia previos.</p>
                    ) : (
                      fullHistory.map((r) => (
                        <div key={r.id} className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2 text-gray-300 font-bold mb-1">
                              <Calendar size={12} className="text-cyan-400" />
                              <span>{formatDate(r.date)}</span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{r.system}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white font-medium text-xs">
                              <span>Entrada: <strong className="text-emerald-400">{formatHour(r.clock_in)}</strong></span>
                              <span>—</span>
                              <span>Salida: <strong className={r.clock_out ? 'text-rose-400' : 'text-amber-400'}>{r.clock_out ? formatHour(r.clock_out) : 'Sin marcar'}</strong></span>
                            </div>
                            {r.notes && <p className="text-[11px] text-gray-400 mt-1 italic">{r.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 font-mono text-[11px] text-cyan-300 font-bold">
                              {r.total_minutes !== null ? `${Math.floor(r.total_minutes / 60)}h ${r.total_minutes % 60}m` : 'En curso'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
