import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, ArrowDownRight, ArrowUpRight, DollarSign, Calendar, Clock, User, 
  Plus, AlertTriangle, CheckCircle, HelpCircle, X, ClipboardList, Printer,
  CreditCard, Smartphone, Wallet, ShieldCheck
} from 'lucide-react'
import { 
  getCashRegisterStatus, openCashRegisterSession, 
  closeCashRegisterSession, addCashRegisterTransaction 
} from '../api/cashRegister'

export function printNovaCashReport(sess) {
  if (!sess) return
  const printWindow = window.open('', '_blank', 'width=800,height=700')
  const txs = sess.transactions || []
  
  let cashIn = 0, cashOut = 0, debitIn = 0, transferIn = 0, creditIn = 0
  txs.forEach(t => {
    const amt = parseFloat(t.amount || 0)
    const m = (t.payment_method || 'efectivo').toLowerCase()
    if (t.transaction_type === 'ingreso') {
      if (m === 'efectivo') cashIn += amt
      else if (m === 'debito') debitIn += amt
      else if (m === 'transferencia') transferIn += amt
      else if (m === 'credito') creditIn += amt
      else cashIn += amt
    } else {
      if (m === 'efectivo') cashOut += amt
    }
  })

  const initialBal = parseFloat(sess.initial_balance || 0)
  const expectedCash = initialBal + cashIn - cashOut
  const totalDigital = debitIn + transferIn + creditIn
  const totalRecaudado = cashIn + totalDigital

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Arqueo de Caja Chica - Nova Tech Services</title>
        <meta charset="utf-8" />
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #0891b2; text-transform: uppercase; }
          .header p { margin: 3px 0 0; font-size: 12px; color: #6b7280; font-weight: 500; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-item strong { color: #475569; font-size: 11px; text-transform: uppercase; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
          .card.highlight { background: #ecfeff; border-color: #06b6d4; }
          .card strong { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .card span { font-size: 15px; font-weight: 800; }
          .text-green { color: #059669; }
          .text-red { color: #dc2626; }
          .text-cyan { color: #0891b2; }
          .section-title { font-size: 13px; text-transform: uppercase; font-weight: 800; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin: 20px 0 10px 0; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #475569; }
          .text-right { text-align: right; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
          .badge-efectivo { background: #dcfce7; color: #166534; }
          .badge-debito { background: #e0f2fe; color: #0369a1; }
          .badge-transferencia { background: #fef3c7; color: #92400e; }
          .badge-credito { background: #f3e8ff; color: #6b21a8; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; text-align: center; }
          .sig-line { border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 11px; font-weight: 600; color: #475569; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NOVA TECH SERVICES</h1>
          <p>Control de Arqueo y Cierre de Caja Chica</p>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>Sesión ID:</strong> #${sess.id} (${sess.status === 'open' ? 'EN CURSO' : 'CERRADA'})</div>
          <div class="meta-item"><strong>Apertura:</strong> ${new Date(sess.opened_at).toLocaleString('es-CL')}</div>
          <div class="meta-item"><strong>Responsable Apertura:</strong> ${sess.opened_by?.name || 'Técnico'}</div>
          <div class="meta-item"><strong>Fecha Emisión:</strong> ${new Date().toLocaleString('es-CL')}</div>
        </div>

        <div class="summary-grid">
          <div class="card">
            <strong>Fondo Inicial (Efectivo)</strong>
            <span>$${initialBal.toLocaleString('es-CL')}</span>
          </div>
          <div class="card">
            <strong>Ingresos Efectivo</strong>
            <span class="text-green">+$${cashIn.toLocaleString('es-CL')}</span>
          </div>
          <div class="card">
            <strong>Gastos / Egresos</strong>
            <span class="text-red">-$${cashOut.toLocaleString('es-CL')}</span>
          </div>
          <div class="card highlight">
            <strong>Efectivo Físico Gaveta</strong>
            <span class="text-cyan">$${expectedCash.toLocaleString('es-CL')}</span>
          </div>
        </div>

        <div class="summary-grid">
          <div class="card">
            <strong>Ventas Débito / POS</strong>
            <span class="text-cyan">$${debitIn.toLocaleString('es-CL')}</span>
          </div>
          <div class="card">
            <strong>Transferencias</strong>
            <span class="text-cyan">$${transferIn.toLocaleString('es-CL')}</span>
          </div>
          <div class="card">
            <strong>Crédito</strong>
            <span class="text-cyan">$${creditIn.toLocaleString('es-CL')}</span>
          </div>
          <div class="card highlight">
            <strong>Total Recaudación Día</strong>
            <span class="text-green">$${totalRecaudado.toLocaleString('es-CL')}</span>
          </div>
        </div>

        ${sess.status === 'closed' && sess.actual_balance !== null ? `
          <div class="meta-grid" style="background:#f0fdf4; border-color:#86efac;">
            <div class="meta-item"><strong>Efectivo Contado Real:</strong> $${parseFloat(sess.actual_balance).toLocaleString('es-CL')}</div>
            <div class="meta-item"><strong>Diferencia Arqueo:</strong> $${(parseFloat(sess.actual_balance) - expectedCash).toLocaleString('es-CL')} ${parseFloat(sess.actual_balance) === expectedCash ? '(Caja Cuadrada)' : '(Descuadre)'}</div>
          </div>
        ` : ''}

        <div class="section-title">Registro Detallado de Movimientos (${txs.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Hora</th>
              <th style="width: 12%;">Tipo</th>
              <th style="width: 15%;">Medio de Pago</th>
              <th style="width: 46%;">Descripción / Concepto</th>
              <th style="width: 15%;" class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${txs.map(t => {
              const isIngreso = t.transaction_type === 'ingreso'
              const method = (t.payment_method || 'efectivo').toLowerCase()
              return `
                <tr>
                  <td>${new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style="font-weight:700; text-transform:uppercase;" class="${isIngreso ? 'text-green' : 'text-red'}">
                    ${t.transaction_type}
                  </td>
                  <td><span class="badge badge-${method}">${method}</span></td>
                  <td>${t.description}</td>
                  <td class="text-right ${isIngreso ? 'text-green' : 'text-red'}" style="font-weight:700;">
                    ${isIngreso ? '+' : '-'}$${parseFloat(t.amount).toLocaleString('es-CL')}
                  </td>
                </tr>
              `
            }).join('') || '<tr><td colspan="5" style="text-align:center; color:#9ca3af;">Sin transacciones registradas</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div style="height: 45px;"></div>
            <div class="sig-line">Firma Cajero / Técnico Responsable</div>
          </div>
          <div>
            <div style="height: 45px;"></div>
            <div class="sig-line">Firma Administración / Supervisión</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

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

  const getDetailedBreakdown = () => {
    if (!session) return {
      cashIn: 0, cashOut: 0, debitIn: 0, transferIn: 0, creditIn: 0,
      expectedCash: 0, totalIncome: 0, totalExpenses: 0
    }
    
    let cashIn = 0, cashOut = 0, debitIn = 0, transferIn = 0, creditIn = 0
    
    (session.transactions || []).forEach(t => {
      const amt = parseFloat(t.amount || 0)
      const m = (t.payment_method || 'efectivo').toLowerCase()
      if (t.transaction_type === 'ingreso') {
        if (m === 'efectivo') cashIn += amt
        else if (m === 'debito') debitIn += amt
        else if (m === 'transferencia') transferIn += amt
        else if (m === 'credito') creditIn += amt
        else cashIn += amt
      } else {
        if (m === 'efectivo') cashOut += amt
      }
    })

    const initialBal = parseFloat(session.initial_balance || 0)
    const expectedCash = initialBal + cashIn - cashOut
    const totalIncome = cashIn + debitIn + transferIn + creditIn

    return {
      cashIn,
      cashOut,
      debitIn,
      transferIn,
      creditIn,
      expectedCash,
      totalIncome,
      totalExpenses: cashOut
    }
  }

  const breakdown = getDetailedBreakdown()

  const getPaymentBadge = (method) => {
    const m = (method || 'efectivo').toLowerCase()
    switch (m) {
      case 'debito':
        return <span className="bg-sky-950/60 text-sky-400 border border-sky-800/40 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase inline-flex items-center gap-1"><CreditCard size={10} /> Débito</span>
      case 'transferencia':
        return <span className="bg-amber-950/60 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase inline-flex items-center gap-1"><Smartphone size={10} /> Transferencia</span>
      case 'credito':
        return <span className="bg-purple-950/60 text-purple-400 border border-purple-800/40 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase inline-flex items-center gap-1"><CreditCard size={10} /> Crédito</span>
      default:
        return <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase inline-flex items-center gap-1"><Wallet size={10} /> Efectivo</span>
    }
  }

  if (loading && !session) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-cyan-400 font-mono text-xs animate-pulse">
        Cargando estado de caja chica...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 text-gray-100 max-w-7xl mx-auto text-left">
      
      {/* Title & Actions */}
      <div className="border-b border-gray-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-cyan-400 tracking-wider flex items-center gap-2 uppercase">
            <Coins className="text-cyan-400 animate-pulse" />
            Caja Chica Diaria
          </h1>
          <p className="text-xs text-gray-400 mt-1">Control de flujo de caja, arqueo de efectivo físico y desglose de medios de pago para Nova.</p>
        </div>

        {isOpen && session && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => printNovaCashReport(session)}
              className="px-4 py-2 bg-gray-900 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 text-cyan-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Generar e imprimir reporte en formato PDF"
            >
              <Printer size={15} />
              Imprimir / Exportar PDF
            </button>
          </div>
        )}
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
            <p className="text-xs text-gray-500">Para poder registrar cobros o movimientos, debes abrir una sesión diaria.</p>
          </div>

          <form onSubmit={handleOpenRegister} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Monto Inicial en Efectivo (Apertura de Gaveta) *</label>
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
            
            {/* Box summary cards - Fila 1: Dinero Físico en Caja */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-950 border border-gray-900 p-3.5 rounded-xl text-left">
                <span className="text-[9px] text-gray-500 tracking-wider font-mono uppercase font-bold block">Fondo Apertura</span>
                <span className="text-sm font-black text-gray-300 block mt-1">${parseFloat(session.initial_balance).toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-gray-900 p-3.5 rounded-xl text-left">
                <span className="text-[9px] text-emerald-450 tracking-wider font-mono uppercase font-bold block">Ingresos Efectivo</span>
                <span className="text-sm font-black text-emerald-400 block mt-1">+${breakdown.cashIn.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-gray-900 p-3.5 rounded-xl text-left">
                <span className="text-[9px] text-rose-500 tracking-wider font-mono uppercase font-bold block">Egresos / Gastos</span>
                <span className="text-sm font-black text-rose-400 block mt-1">-${breakdown.cashOut.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-cyan-500/30 p-3.5 rounded-xl text-left bg-cyan-950/10 shadow-sm">
                <span className="text-[9px] text-cyan-400 tracking-wider font-mono uppercase font-bold block flex items-center gap-1">
                  <Wallet size={10} /> Efectivo en Gaveta
                </span>
                <span className="text-base font-black text-cyan-300 block mt-1">${breakdown.expectedCash.toLocaleString('es-CL')}</span>
              </div>
            </div>

            {/* Box summary cards - Fila 2: Medios Digitales y Total Consolidado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-950 border border-sky-900/30 p-3.5 rounded-xl text-left bg-sky-950/10">
                <span className="text-[9px] text-sky-400 tracking-wider font-mono uppercase font-bold block flex items-center gap-1">
                  <CreditCard size={10} /> Ventas Débito / POS
                </span>
                <span className="text-sm font-black text-sky-300 block mt-1">${breakdown.debitIn.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-amber-900/30 p-3.5 rounded-xl text-left bg-amber-950/10">
                <span className="text-[9px] text-amber-400 tracking-wider font-mono uppercase font-bold block flex items-center gap-1">
                  <Smartphone size={10} /> Transferencias
                </span>
                <span className="text-sm font-black text-amber-300 block mt-1">${breakdown.transferIn.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-purple-900/30 p-3.5 rounded-xl text-left bg-purple-950/10">
                <span className="text-[9px] text-purple-400 tracking-wider font-mono uppercase font-bold block flex items-center gap-1">
                  <CreditCard size={10} /> Crédito
                </span>
                <span className="text-sm font-black text-purple-300 block mt-1">${breakdown.creditIn.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-gray-950 border border-emerald-900/40 p-3.5 rounded-xl text-left bg-emerald-950/10">
                <span className="text-[9px] text-emerald-450 tracking-wider font-mono uppercase font-bold block">
                  Total Recaudado Día
                </span>
                <span className="text-sm font-black text-emerald-400 block mt-1">${breakdown.totalIncome.toLocaleString('es-CL')}</span>
              </div>
            </div>

            {/* List of movements */}
            <div className="bg-gray-950 border border-gray-900 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wide">
                  <ClipboardList size={16} className="text-cyan-400" />
                  Flujo de Movimientos del Día ({session.transactions?.length || 0})
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-900 max-h-[350px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 font-mono text-[9px] uppercase border-b border-gray-800">
                      <th className="py-2.5 px-3">Hora</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3">Medio de Pago</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/40">
                    {(session.transactions || []).map((t) => (
                      <tr key={t.id} className="hover:bg-gray-900/20 transition-colors">
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
                        <td className="py-2.5 px-3 text-gray-300 max-w-[240px] truncate" title={t.description}>{t.description}</td>
                        <td className="py-2.5 px-3">{getPaymentBadge(t.payment_method)}</td>
                        <td className={`py-2.5 px-3 text-right font-bold font-mono ${
                          t.transaction_type === 'ingreso' ? 'text-emerald-450' : 'text-rose-455'
                        }`}>
                          {t.transaction_type === 'ingreso' ? '+' : '-'}${parseFloat(t.amount).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    ))}
                    {(!session.transactions || session.transactions.length === 0) && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-600">No hay movimientos registrados hoy</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close session button */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-900">
                <p className="text-[10px] text-gray-500 font-mono">
                  * Solo las operaciones en <strong className="text-gray-400">Efectivo</strong> alteran la gaveta física.
                </p>
                <button
                  onClick={() => { setError(''); setSuccess(''); setShowCloseModal(true); }}
                  className="px-5 py-2.5 bg-red-950/30 border border-red-800/40 hover:bg-red-900 hover:text-white text-red-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
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
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="egreso">💸 Egreso (Retiro / Gasto / Compra)</option>
                  <option value="ingreso">💰 Ingreso (Aporte / Venta)</option>
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
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="efectivo">💵 Efectivo (Afecta Gaveta)</option>
                  <option value="debito">💳 Tarjeta de Débito (POS)</option>
                  <option value="transferencia">📲 Transferencia Bancaria</option>
                  <option value="credito">💳 Tarjeta de Crédito</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Descripción del Movimiento *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Especifica el motivo (ej: Compra de alcohol isopropílico, almuerzo, cambio...)"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" onClick={() => setShowCloseModal(false)}>
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
                  <p className="text-[9px] text-gray-500 uppercase font-mono">Verificación de efectivo físico en gaveta</p>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 text-gray-500 hover:text-gray-300 rounded hover:bg-gray-900 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Efectivo Esperado en Gaveta:</span>
                  <span className="font-bold text-cyan-400 text-sm">${breakdown.expectedCash.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>Ventas Digitales (Débito + Transferencias):</span>
                  <span className="font-mono text-gray-300">${(breakdown.debitIn + breakdown.transferIn + breakdown.creditIn).toLocaleString('es-CL')}</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal pt-1 border-t border-gray-800">
                  Cuenta el efectivo real que tienes físicamente en la gaveta e ingrésalo abajo. El sistema calculará si hay diferencias.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-cyan-400 block uppercase font-bold">Monto Contado Real en Efectivo *</label>
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
                    parseFloat(actualBalance) === breakdown.expectedCash
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                      : 'bg-amber-950/20 border-amber-800/40 text-amber-500'
                  }`}>
                    Diferencia: ${(parseFloat(actualBalance) - breakdown.expectedCash).toLocaleString('es-CL')} 
                    {parseFloat(actualBalance) === breakdown.expectedCash ? ' (Caja Cuadrada ✅)' : ' (Descuadre en Gaveta ⚠️)'}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => printNovaCashReport(session)}
                    type="button"
                    className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={14} /> Imprimir
                  </button>
                  <button
                    onClick={handleCloseRegister}
                    disabled={!actualBalance}
                    type="button"
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Confirmar Cierre
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
