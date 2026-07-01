import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, ArrowDownRight, ArrowUpRight, DollarSign, Calendar, Clock, User, 
  Plus, AlertTriangle, CheckCircle, HelpCircle, X, ClipboardList 
} from 'lucide-react'
import { 
  getCashRegisterStatus, openCashRegisterSession, 
  closeCashRegisterSession, addCashRegisterTransaction 
} from '../api/cashRegister'

export default function CashRegisterPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Forms
  const [initialBalance, setInitialBalance] = useState('')
  const [actualBalance, setActualBalance] = useState('')
  const [showCloseModal, setShowCloseModal] = useState(false)
  
  // Transaction Form
  const [txForm, setTxForm] = useState({
    transaction_type: 'egreso',
    amount: '',
    description: '',
    payment_method: 'efectivo'
  })

  useEffect(() => {
    fetchSessionStatus()
  }, [])

  const fetchSessionStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getCashRegisterStatus({ system: 'nova' })
      setIsOpen(res.data.is_open)
      setSession(res.data.current_session)
    } catch (err) {
      console.error(err)
      setError('Error al consultar el estado de la caja chica.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenRegister = async (e) => {
    e.preventDefault()
    if (!initialBalance) {
      setError('Por favor ingresa un saldo inicial.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await openCashRegisterSession({
        system: 'nova',
        initial_balance: parseFloat(initialBalance) || 0.0
      })
      setIsOpen(true)
      setSession(res.data)
      setSuccess('¡Caja chica abierta exitosamente!')
      setInitialBalance('')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al abrir la caja chica.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    if (!txForm.amount || !txForm.description) {
      setError('Por favor ingresa el monto y la descripción del movimiento.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await addCashRegisterTransaction(session.id, {
        transaction_type: txForm.transaction_type,
        amount: parseFloat(txForm.amount),
        description: txForm.description,
        payment_method: txForm.payment_method
      })
      setSuccess('Movimiento registrado correctamente.')
      setTxForm({
        transaction_type: 'egreso',
        amount: '',
        description: '',
        payment_method: 'efectivo'
      })
      // Recargar datos de la sesión
      await fetchSessionStatus()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al registrar el movimiento.')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseRegister = async () => {
    if (!actualBalance) {
      setError('Por favor ingresa el saldo final contado en caja.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await closeCashRegisterSession(session.id, {
        actual_balance: parseFloat(actualBalance) || 0.0
      })
      setIsOpen(false)
      setSession(null)
      setShowCloseModal(false)
      setSuccess('¡Caja chica cerrada exitosamente y cuadre guardado!')
      setActualBalance('')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al cerrar la caja chica.')
    } finally {
      setLoading(false)
    }
  }

  const getTotals = () => {
    if (!session) return { ingresos: 0, egresos: 0 }
    let ingresos = 0
    let egresos = 0
    session.transactions.forEach(t => {
      if (t.transaction_type === 'ingreso') {
        ingresos += parseFloat(t.amount)
      } else {
        egresos += parseFloat(t.amount)
      }
    })
    return { ingresos, egresos }
  }

  const { ingresos, egresos } = getTotals()

  if (loading && !session) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-cyan-400 font-mono text-xs animate-pulse">
        Cargando estado de caja chica...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 text-gray-100 max-w-7xl mx-auto text-left">
      
      {/* Title */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-black text-cyan-400 tracking-wider flex items-center gap-2 uppercase">
          <Coins className="text-cyan-400 animate-pulse" />
          Caja Chica Diaria
        </h1>
        <p className="text-xs text-gray-400 mt-1">Control de flujo de caja diaria, arqueo e ingresos/egresos menores para Nova.</p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* STATE 1: REGISTER CLOSED */}
      {!isOpen ? (
        <div className="max-w-md mx-auto bg-gray-950 border border-gray-900 p-6 rounded-2xl space-y-5 text-center mt-10 shadow-xl">
          <Coins size={48} className="mx-auto text-gray-600 animate-bounce" />
          <div className="space-y-1">
            <h2 className="text-lg font-black text-gray-200 uppercase tracking-wide">Caja Chica Cerrada</h2>
            <p className="text-xs text-gray-500">Para poder registrar ventas o egresos, debes iniciar una nueva sesión diaria.</p>
          </div>

          <form onSubmit={handleOpenRegister} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Monto Inicial en Efectivo (Apertura) *</label>
              <input
                type="number"
                required
                placeholder="Ej: 50000"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
            >
              Abrir Caja Chica
            </button>
          </form>
        </div>
      ) : (
        /* STATE 2: REGISTER OPENED */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Box metrics and list */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Box summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-950 border border-gray-900 p-4 rounded-xl text-left">
                <span className="text-[9px] text-gray-500 tracking-wider font-mono uppercase font-bold block">Fondo de Apertura</span>
                <span className="text-sm font-black text-gray-300 block mt-1">${parseFloat(session.initial_balance).toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-gray-900 p-4 rounded-xl text-left">
                <span className="text-[9px] text-emerald-450 tracking-wider font-mono uppercase font-bold block">Ingresos del Día</span>
                <span className="text-sm font-black text-emerald-400 block mt-1">+${ingresos.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-gray-900 p-4 rounded-xl text-left">
                <span className="text-[9px] text-rose-500 tracking-wider font-mono uppercase font-bold block">Egresos / Gastos</span>
                <span className="text-sm font-black text-rose-400 block mt-1">-${egresos.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-gray-950 p-4 rounded-xl text-left bg-cyan-500/5 border-cyan-500/20">
                <span className="text-[9px] text-cyan-400 tracking-wider font-mono uppercase font-bold block">Saldo Estimado en Caja</span>
                <span className="text-sm font-black text-cyan-400 block mt-1">${parseFloat(session.expected_balance).toLocaleString('es-CL')}</span>
              </div>
            </div>

            {/* List of movements */}
            <div className="bg-gray-950 border border-gray-900 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wide border-b border-gray-900 pb-2">
                <ClipboardList size={16} className="text-cyan-400" />
                Flujo de Movimientos del Día
              </h3>

              <div className="overflow-x-auto rounded-xl border border-gray-900 max-h-[300px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 font-mono text-[9px] uppercase border-b border-gray-800">
                      <th className="py-2 px-3">Hora</th>
                      <th className="py-2 px-3">Movimiento</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-3">Medio</th>
                      <th className="py-2 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/40">
                    {session.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-900/10 transition-colors">
                        <td className="py-2.5 px-3 text-gray-500 font-mono">
                          {new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 font-bold text-[9px] font-mono uppercase px-2 py-0.5 rounded-full ${
                            t.transaction_type === 'ingreso' ? 'bg-emerald-950/40 text-emerald-450 border border-emerald-800/30' : 'bg-rose-950/40 text-rose-500 border border-rose-800/30'
                          }`}>
                            {t.transaction_type === 'ingreso' ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-300 max-w-[200px] truncate" title={t.description}>{t.description}</td>
                        <td className="py-2.5 px-3 uppercase font-mono text-[9px]">{t.payment_method}</td>
                        <td className={`py-2.5 px-3 text-right font-bold font-mono ${
                          t.transaction_type === 'ingreso' ? 'text-emerald-450' : 'text-rose-455'
                        }`}>
                          {t.transaction_type === 'ingreso' ? '+' : '-'}${parseFloat(t.amount).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    ))}
                    {session.transactions.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-600">No hay movimientos registrados hoy</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close session button */}
              <div className="flex justify-end pt-3">
                <button
                  onClick={() => { setError(''); setSuccess(''); setShowCloseModal(true); }}
                  className="px-5 py-2 bg-red-950/30 border border-red-800/40 hover:bg-red-850 hover:text-white text-red-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Realizar Cierre de Caja
                </button>
              </div>

            </div>

          </div>

          {/* Add transaction form */}
          <div className="lg:col-span-4 bg-gray-950 border border-gray-900 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wide border-b border-gray-900 pb-2">
              <Plus size={16} className="text-cyan-400" />
              Ingreso o Egreso Manual
            </h3>

            <form onSubmit={handleAddTransaction} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Tipo de Movimiento</label>
                <select
                  value={txForm.transaction_type}
                  onChange={e => setTxForm({ ...txForm, transaction_type: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-1.5 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="egreso">💸 Egreso (Retiro / Gasto)</option>
                  <option value="ingreso">💰 Ingreso (Aporte / Caja)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Monto del Movimiento *</label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 3500"
                  value={txForm.amount}
                  onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Medio de Pago</label>
                <select
                  value={txForm.payment_method}
                  onChange={e => setTxForm({ ...txForm, payment_method: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-1.5 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">📲 Transferencia</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Descripción del Movimiento *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Especifica el motivo (ej: Compra de café, hilos, cambio en caja...)"
                  value={txForm.description}
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gray-800 border border-cyan-500/20 hover:bg-cyan-500 hover:text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Registrar Movimiento
              </button>
            </form>

          </div>

        </div>
      )}

      {/* CLOSE REGISTER MODAL */}
      <AnimatePresence>
        {showCloseModal && session && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setShowCloseModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-950 border border-gray-900 p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4 text-left"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-gray-900 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-cyan-400 uppercase tracking-wider font-mono">Arqueo y Cierre de Caja</h3>
                  <p className="text-[9px] text-gray-500 uppercase font-mono">Verificación de efectivo al final de la jornada</p>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 text-gray-500 hover:text-gray-300 rounded hover:bg-gray-900 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-gray-900/30 border border-gray-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance Esperado en Caja:</span>
                  <span className="font-bold text-gray-200">${parseFloat(session.expected_balance).toLocaleString('es-CL')}</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Cuenta el efectivo real que tienes físicamente en la caja e ingrésalo abajo. El sistema calculará automáticamente si hay sobrantes o faltantes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Monto Contado Real *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 77000"
                    value={actualBalance}
                    onChange={e => setActualBalance(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {actualBalance && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold ${
                    parseFloat(actualBalance) == parseFloat(session.expected_balance)
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                      : 'bg-amber-950/20 border-amber-800/40 text-amber-500'
                  }`}>
                    Diferencia: ${(parseFloat(actualBalance) - parseFloat(session.expected_balance)).toLocaleString('es-CL')} 
                    {parseFloat(actualBalance) == parseFloat(session.expected_balance) ? ' (Caja Cuadrada)' : ' (Descuadre en Caja)'}
                  </div>
                )}

                <button
                  onClick={handleCloseRegister}
                  disabled={!actualBalance}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Confirmar y Cerrar Caja
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
