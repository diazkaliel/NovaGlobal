import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, ArrowDownRight, ArrowUpRight, DollarSign, Calendar, Clock, User, 
  Plus, AlertTriangle, CheckCircle, HelpCircle, X, ClipboardList 
} from 'lucide-react'
import { 
  getCashRegisterStatus, openCashRegisterSession, 
  closeCashRegisterSession, addCashRegisterTransaction 
} from '../../api/cashRegister'

export default function BravoCashRegisterPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [lastClosedSession, setLastClosedSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [initialBalance, setInitialBalance] = useState('')
  const [actualBalance, setActualBalance] = useState('')
  const [showCloseModal, setShowCloseModal] = useState(false)
  
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
      const res = await getCashRegisterStatus({ system: 'bravo' })
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
        system: 'bravo',
        initial_balance: parseFloat(initialBalance) || 0.0
      })
      setIsOpen(true)
      setSession(res.data)
      setSuccess('¡Caja chica del taller abierta exitosamente!')
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
      const res = await closeCashRegisterSession(session.id, {
        actual_balance: parseFloat(actualBalance) || 0.0
      })
      // Guardar el estado de la sesión recién cerrada para permitir su descarga e impresión
      setLastClosedSession(res.data)
      setIsOpen(false)
      setSession(null)
      setShowCloseModal(false)
      setSuccess('¡Caja chica del taller cerrada exitosamente y arqueo guardado!')
      setActualBalance('')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al cerrar la caja chica.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = (sess) => {
    if (!sess) return
    const rows = [
      ['Fecha/Hora', 'Tipo de Movimiento', 'Descripcion', 'Medio de Pago', 'Monto'],
      ...sess.transactions.map(t => [
        new Date(t.created_at).toLocaleString('es-CL'),
        t.transaction_type.toUpperCase(),
        t.description,
        t.payment_method.toUpperCase(),
        t.amount
      ])
    ]
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `cierre_caja_bravo_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintReport = (sess) => {
    if (!sess) return
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    const totalIngresos = sess.transactions.filter(t => t.transaction_type === 'ingreso').reduce((a, b) => a + parseFloat(b.amount), 0)
    const totalEgresos = sess.transactions.filter(t => t.transaction_type === 'egreso').reduce((a, b) => a + parseFloat(b.amount), 0)
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cierre de Caja Chica - Taller Bravo</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; margin: 30px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0; font-size: 12px; color: #666; }
            .summary-grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
            .summary-item { font-size: 13px; }
            .summary-item strong { display: block; font-size: 11px; text-transform: uppercase; color: #555; }
            .summary-item span { font-size: 16px; font-weight: bold; }
            .section-title { font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 25px; margin-bottom: 10px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .text-green { color: #2e7d32; font-weight: bold; }
            .text-red { color: #c62828; font-weight: bold; }
            .footer-notes { margin-top: 40px; border-top: 1px solid #333; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #555; }
            .signature { border-top: 1px dashed #999; width: 200px; text-align: center; padding-top: 5px; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bravo Personalizaciones</h1>
            <p>Reporte de Arqueo y Cierre Diario de Caja Chica</p>
            <p>Fecha Cierre: \${new Date(sess.closed_at || new Date()).toLocaleString('es-CL')}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-item">
              <strong>Fondo Inicial Apertura</strong>
              <span>$\${parseFloat(sess.initial_balance).toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Ingresos Recaudados</strong>
              <span class="text-green">+\$\${totalIngresos.toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Gastos / Egresos del Día</strong>
              <span class="text-red">-\$\${totalEgresos.toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Saldo Esperado Neto</strong>
              <span>\$\${parseFloat(sess.expected_balance).toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Monto Físico Contado</strong>
              <span>\$\${parseFloat(sess.actual_balance || 0).toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Diferencia de Arqueo</strong>
              <span class="\${parseFloat(sess.actual_balance || 0) - parseFloat(sess.expected_balance) < 0 ? 'text-red' : 'text-green'}">
                \$\${(parseFloat(sess.actual_balance || 0) - parseFloat(sess.expected_balance)).toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          <div class="section-title">Ingresos Recaudados (Ventas y Abonos)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Hora</th>
                <th style="width: 50%;">Descripción</th>
                <th style="width: 15%;">Medio</th>
                <th style="width: 20%;" class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              \${sess.transactions.filter(t => t.transaction_type === 'ingreso').map(t => \`
                <tr>
                  <td>\${new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>\${t.description}</td>
                  <td style="text-transform: uppercase;">\${t.payment_method}</td>
                  <td class="text-right text-green">+\$\${parseFloat(t.amount).toLocaleString('es-CL')}</td>
                </tr>
              \`).join('') || '<tr><td colspan="4" style="text-align:center;">No se registraron ingresos en esta sesión.</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">Gastos y Egresos de la Jornada</div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Hora</th>
                <th style="width: 50%;">Descripción</th>
                <th style="width: 15%;">Medio</th>
                <th style="width: 20%;" class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              \${sess.transactions.filter(t => t.transaction_type === 'egreso').map(t => \`
                <tr>
                  <td>\${new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>\${t.description}</td>
                  <td style="text-transform: uppercase;">\${t.payment_method}</td>
                  <td class="text-right text-red">-\$\${parseFloat(t.amount).toLocaleString('es-CL')}</td>
                </tr>
              \`).join('') || '<tr><td colspan="4" style="text-align:center;">No se registraron egresos en esta sesión.</td></tr>'}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; margin-top:60px;">
            <div class="signature">Firma Cajero Responsable</div>
            <div class="signature">Firma Supervisor / Auditor</div>
          </div>

          <div class="footer-notes">
            <span>Sistema Bravo Blueprint</span>
            <span>ID Sesión: #\${sess.id}</span>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 500)
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
      <div className="min-h-[400px] flex items-center justify-center text-bravo-accent font-mono text-xs animate-pulse">
        Cargando estado de caja del taller...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 text-bravo-text max-w-7xl mx-auto text-left">
      
      {/* Title */}
      <div className="border-b border-bravo-border pb-4">
        <h1 className="text-2xl font-black text-bravo-accent tracking-wider flex items-center gap-2 uppercase">
          <Coins className="text-bravo-accent" />
          Caja Chica del Taller
        </h1>
        <p className="text-xs text-bravo-text-muted mt-1">Control diario del fondo de caja, abonos de clientes y compras menores de Bravo.</p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* STATE 1: REGISTER CLOSED & ARCHIVED SUMMARY */}
      {!isOpen && lastClosedSession ? (
        <div className="max-w-xl mx-auto bg-bravo-card border border-bravo-border p-6 rounded-2xl space-y-5 text-center mt-10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
          <CheckCircle size={48} className="mx-auto text-emerald-450 shadow-sm animate-bounce" />
          
          <div className="space-y-1">
            <h2 className="text-lg font-black text-bravo-text uppercase tracking-wide">Caja Cerrada y Arqueada</h2>
            <p className="text-xs text-bravo-text-muted">La sesión diaria ha finalizado. Puedes descargar el registro digital o imprimir el arqueo en papel para tus archivos físicos.</p>
          </div>

          <div className="bg-bravo-input border border-bravo-border/60 p-4 rounded-xl space-y-3 text-xs text-left">
            <div className="flex justify-between border-b border-bravo-border/20 pb-1.5 font-semibold">
              <span className="text-bravo-text-muted">Fecha y Hora Cierre:</span>
              <span className="font-mono text-bravo-text">{new Date(lastClosedSession.closed_at).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bravo-text-muted">Saldo Inicial Apertura:</span>
              <span className="font-mono font-bold text-bravo-text">${parseFloat(lastClosedSession.initial_balance).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bravo-text-muted">Saldo Esperado en Caja:</span>
              <span className="font-mono font-bold text-bravo-text">${parseFloat(lastClosedSession.expected_balance).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bravo-text-muted">Efectivo Contado Real:</span>
              <span className="font-mono font-bold text-bravo-text">${parseFloat(lastClosedSession.actual_balance || 0).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between border-t border-bravo-border/20 pt-2 font-bold">
              <span className="text-bravo-text-muted">Diferencia / Cuadre:</span>
              <span className={parseFloat(lastClosedSession.actual_balance || 0) - parseFloat(lastClosedSession.expected_balance) < 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-450 font-extrabold'}>
                ${(parseFloat(lastClosedSession.actual_balance || 0) - parseFloat(lastClosedSession.expected_balance)).toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={() => handleExportCSV(lastClosedSession)}
              className="py-2.5 bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 text-bravo-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:text-bravo-accent"
            >
              Exportar a CSV
            </button>
            <button
              onClick={() => handlePrintReport(lastClosedSession)}
              className="py-2.5 bg-bravo-accent hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
            >
              Imprimir en Papel
            </button>
          </div>

          <div className="border-t border-bravo-border/20 pt-4 mt-2">
            <button
              onClick={() => setLastClosedSession(null)}
              className="text-xs font-mono text-bravo-accent hover:text-amber-500 font-bold uppercase underline cursor-pointer"
            >
              &larr; Volver al Panel de Apertura
            </button>
          </div>
        </div>
      ) : !isOpen ? (
        <div className="max-w-md mx-auto bg-bravo-card border border-bravo-border p-6 rounded-2xl space-y-5 text-center mt-10 shadow-lg">
          <Coins size={48} className="mx-auto text-bravo-text-muted/55 animate-pulse" />
          <div className="space-y-1">
            <h2 className="text-lg font-black text-bravo-text uppercase tracking-wide">Caja del Taller Cerrada</h2>
            <p className="text-xs text-bravo-text-muted">Abre la caja chica con el fondo en efectivo correspondiente para iniciar el día comercial.</p>
          </div>

          <form onSubmit={handleOpenRegister} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Fondo de Apertura (Efectivo) *</label>
              <input
                type="number"
                required
                placeholder="Ej: 30000"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
            >
              Abrir Caja del Taller
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
              <div className="bg-bravo-card border border-bravo-border p-4 rounded-xl text-left">
                <span className="text-[9px] text-bravo-text-muted tracking-wider font-mono uppercase font-bold block">Fondo de Apertura</span>
                <span className="text-sm font-black text-bravo-text block mt-1">${parseFloat(session.initial_balance).toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-bravo-card border border-bravo-border p-4 rounded-xl text-left">
                <span className="text-[9px] text-emerald-500/80 tracking-wider font-mono uppercase font-bold block">Ingresos del Día</span>
                <span className="text-sm font-black text-emerald-450 block mt-1">+${ingresos.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-bravo-card border border-bravo-border p-4 rounded-xl text-left">
                <span className="text-[9px] text-rose-500/80 tracking-wider font-mono uppercase font-bold block">Gastos / Compras</span>
                <span className="text-sm font-black text-rose-400 block mt-1">-${egresos.toLocaleString('es-CL')}</span>
              </div>
              <div className="bg-bravo-card border border-bravo-accent/40 p-4 rounded-xl text-left bg-bravo-accent/5">
                <span className="text-[9px] text-bravo-accent tracking-wider font-mono uppercase font-bold block">Saldo Esperado en Caja</span>
                <span className="text-sm font-black text-bravo-accent block mt-1">${parseFloat(session.expected_balance).toLocaleString('es-CL')}</span>
              </div>
            </div>

            {/* List of movements */}
            <div className="bg-bravo-card border border-bravo-border p-5 rounded-2xl space-y-5">
              <h3 className="text-sm font-bold text-bravo-text flex items-center gap-2 uppercase tracking-wide border-b border-bravo-border pb-2">
                <ClipboardList size={16} className="text-bravo-accent" />
                Control de Caja del Taller
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* INGRESOS TABLE */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-emerald-450 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowDownRight size={14} className="text-emerald-450" />
                    Ingresos Recaudados (Ventas / Abonos)
                  </h4>
                  
                  <div className="overflow-x-auto rounded-xl border border-bravo-border/55 max-h-[300px] bravo-scrollbar">
                    <table className="w-full text-xs text-left border-collapse bg-bravo-input/20">
                      <thead>
                        <tr className="bg-bravo-sidebar/70 text-bravo-text font-mono text-[9px] uppercase border-b border-bravo-border">
                          <th className="py-2 px-3">Hora</th>
                          <th className="py-2 px-3">Descripción</th>
                          <th className="py-2 px-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bravo-border/10">
                        {session.transactions.filter(t => t.transaction_type === 'ingreso').map((t) => (
                          <tr key={t.id} className="hover:bg-bravo-sidebar/10 transition-colors">
                            <td className="py-2 px-3 text-bravo-text-muted font-mono">
                              {new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3 text-bravo-text truncate max-w-[150px]" title={t.description}>{t.description}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-450 font-mono">
                              +${parseFloat(t.amount).toLocaleString('es-CL')}
                            </td>
                          </tr>
                        ))}
                        {session.transactions.filter(t => t.transaction_type === 'ingreso').length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center py-8 text-bravo-text-muted">Sin ingresos registrados hoy</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EGRESOS / GASTOS TABLE */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-rose-450 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowUpRight size={14} className="text-rose-450" />
                    Gastos del Día (Egresos / Compras)
                  </h4>
                  
                  <div className="overflow-x-auto rounded-xl border border-bravo-border/55 max-h-[300px] bravo-scrollbar">
                    <table className="w-full text-xs text-left border-collapse bg-bravo-input/20">
                      <thead>
                        <tr className="bg-bravo-sidebar/70 text-bravo-text font-mono text-[9px] uppercase border-b border-bravo-border">
                          <th className="py-2 px-3">Hora</th>
                          <th className="py-2 px-3">Descripción</th>
                          <th className="py-2 px-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bravo-border/10">
                        {session.transactions.filter(t => t.transaction_type === 'egreso').map((t) => (
                          <tr key={t.id} className="hover:bg-bravo-sidebar/10 transition-colors">
                            <td className="py-2 px-3 text-bravo-text-muted font-mono">
                              {new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3 text-bravo-text truncate max-w-[150px]" title={t.description}>{t.description}</td>
                            <td className="py-2 px-3 text-right font-bold text-rose-400 font-mono">
                              -${parseFloat(t.amount).toLocaleString('es-CL')}
                            </td>
                          </tr>
                        ))}
                        {session.transactions.filter(t => t.transaction_type === 'egreso').length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center py-8 text-bravo-text-muted">Sin egresos registrados hoy</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Close and Export panel */}
              <div className="flex justify-between items-center pt-3 border-t border-bravo-border/30">
                <button
                  onClick={() => handleExportCSV(session)}
                  className="px-4 py-2 bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 text-bravo-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:text-bravo-accent"
                >
                  Exportar CSV Parcial
                </button>
                
                <button
                  onClick={() => { setError(''); setSuccess(''); setShowCloseModal(true); }}
                  className="px-5 py-2 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md text-white hover:opacity-90 bg-rose-600 border border-rose-500/20"
                >
                  Realizar Arqueo y Cierre
                </button>
              </div>

            </div>

          </div>

          {/* Add transaction form */}
          <div className="lg:col-span-4 bg-bravo-card border border-bravo-border p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-bravo-text flex items-center gap-2 uppercase tracking-wide border-b border-bravo-border pb-2">
              <Plus size={16} className="text-bravo-accent" />
              Ingreso / Egreso Manual
            </h3>

            <form onSubmit={handleAddTransaction} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Tipo de Movimiento</label>
                <select
                  value={txForm.transaction_type}
                  onChange={e => setTxForm({ ...txForm, transaction_type: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                >
                  <option value="egreso">💸 Egreso (Retiro / Gasto)</option>
                  <option value="ingreso">💰 Ingreso (Aporte / Caja)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Monto del Movimiento *</label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 2500"
                  value={txForm.amount}
                  onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Medio de Pago</label>
                <select
                  value={txForm.payment_method}
                  onChange={e => setTxForm({ ...txForm, payment_method: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">📲 Transferencia</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Descripción del Movimiento *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Especifica el motivo (ej: Compra de cinta térmica, agujas, cinta adhesiva...)"
                  value={txForm.description}
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#f4ebd9]/60 border border-bravo-accent/20 hover:bg-bravo-accent hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowCloseModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4 text-left"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <div>
                  <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider font-mono">Arqueo y Cierre de Caja</h3>
                  <p className="text-[9px] text-bravo-text-muted uppercase font-mono">Verificación de efectivo al final de la jornada</p>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 text-bravo-text-muted hover:text-bravo-text rounded hover:bg-bravo-sidebar cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-bravo-bg border border-bravo-border/40 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-bravo-text-muted">Saldo Esperado en Caja:</span>
                  <span className="font-bold text-bravo-text">${parseFloat(session.expected_balance).toLocaleString('es-CL')}</span>
                </div>
                <p className="text-[10px] text-bravo-text-muted leading-normal">
                  Cuenta el efectivo real que tienes físicamente en la caja del taller e ingrésalo abajo. El sistema calculará automáticamente si hay cuadre.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Monto Contado Real *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 77000"
                    value={actualBalance}
                    onChange={e => setActualBalance(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  />
                </div>

                {actualBalance && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold ${
                    parseFloat(actualBalance) == parseFloat(session.expected_balance)
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                      : 'bg-amber-50 border-amber-100 text-amber-800'
                  }`}>
                    Diferencia: ${(parseFloat(actualBalance) - parseFloat(session.expected_balance)).toLocaleString('es-CL')} 
                    {parseFloat(actualBalance) == parseFloat(session.expected_balance) ? ' (Caja Cuadrada)' : ' (Descuadre en Caja)'}
                  </div>
                )}

                <button
                  onClick={handleCloseRegister}
                  disabled={!actualBalance}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
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
