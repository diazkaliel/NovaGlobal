import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, ArrowDownRight, ArrowUpRight, DollarSign, Calendar, Clock, User, 
  Plus, AlertTriangle, CheckCircle, HelpCircle, X, ClipboardList, Filter, 
  Sparkles, Receipt, Info, Download, Printer, ArrowRight
} from 'lucide-react'
import { 
  getCashRegisterStatus, openCashRegisterSession, 
  closeCashRegisterSession, addCashRegisterTransaction 
} from '../../api/cashRegister'

// Categorías adaptadas al negocio de Bravo
const CATEGORIES_EGRESO = [
  { id: 'insumos_estampado', label: '🎨 Insumos de Estampado (Tintas, Films, Vinilo)' },
  { id: 'prendas_base', label: '👕 Adquisición de Prendas Base (Poleras, Polerones)' },
  { id: 'blanks_sublimacion', label: '☕ Blanks de Sublimación (Tazas, Botellas, Mugs)' },
  { id: 'gastos_menores', label: '🔧 Gastos Menores del Taller (Cintas, agujas, embalaje)' },
  { id: 'remesa', label: '🏦 Retiro de Caja / Remesas a Banco' },
  { id: 'otro', label: '📦 Otro Egreso Especial' }
]

const CATEGORIES_INGRESO = [
  { id: 'abono_pedido', label: '💵 Abono inicial de cliente (Pedido/Diseño)' },
  { id: 'pago_saldo', label: '💰 Pago de saldo de pedido (Entrega)' },
  { id: 'venta_directa', label: '🛒 Venta directa de mercancía/catálogo' },
  { id: 'aporte_caja', label: '📥 Aporte extraordinario a fondo de caja' },
  { id: 'otro', label: '📦 Otro Ingreso Especial' }
]

// Función utilitaria para parsear descripciones estructuradas "[Categoría] Notas"
function parseDescription(description = '') {
  if (description.startsWith('[')) {
    const closeBracketIndex = description.indexOf(']')
    if (closeBracketIndex !== -1) {
      const category = description.slice(1, closeBracketIndex)
      const notes = description.slice(closeBracketIndex + 1).trim()
      return { category, notes }
    }
  }
  return { category: 'Movimiento General', notes: description }
}

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
    category: 'insumos_estampado',
    notes: '',
    amount: '',
    payment_method: 'efectivo'
  })

  // Sincronizar categoría por defecto al cambiar tipo de transacción
  const handleTypeChange = (type) => {
    setTxForm(prev => ({
      ...prev,
      transaction_type: type,
      category: type === 'egreso' ? 'insumos_estampado' : 'abono_pedido'
    }))
  }

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
    if (!txForm.amount || !txForm.notes) {
      setError('Por favor ingresa el monto y la descripción del movimiento.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      // Componer descripción estructurada
      const categories = txForm.transaction_type === 'egreso' ? CATEGORIES_EGRESO : CATEGORIES_INGRESO
      const selectedCat = categories.find(c => c.id === txForm.category)
      const catLabel = selectedCat ? selectedCat.label.substring(3) : 'Movimiento'
      const formattedDescription = `[${catLabel}] ${txForm.notes}`

      await addCashRegisterTransaction(session.id, {
        transaction_type: txForm.transaction_type,
        amount: parseFloat(txForm.amount),
        description: formattedDescription,
        payment_method: txForm.payment_method
      })
      setSuccess('Movimiento registrado correctamente.')
      setTxForm({
        transaction_type: 'egreso',
        category: 'insumos_estampado',
        notes: '',
        amount: '',
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
      ['Fecha/Hora', 'Tipo de Movimiento', 'Categoria', 'Detalle/Notas', 'Medio de Pago', 'Monto'],
      ...sess.transactions.map(t => {
        const { category, notes } = parseDescription(t.description)
        return [
          new Date(t.created_at).toLocaleString('es-CL'),
          t.transaction_type.toUpperCase(),
          category,
          notes,
          t.payment_method.toUpperCase(),
          t.amount
        ]
      })
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
            <p>Fecha Cierre: ${new Date(sess.closed_at || new Date()).toLocaleString('es-CL')}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-item">
              <strong>Fondo Inicial Apertura</strong>
              <span>$${parseFloat(sess.initial_balance).toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Ingresos Recaudados</strong>
              <span class="text-green">+$${totalIngresos.toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Gastos / Egresos del Día</strong>
              <span class="text-red">-$${totalEgresos.toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Saldo Esperado Neto</strong>
              <span>$${parseFloat(sess.expected_balance).toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Monto Físico Contado</strong>
              <span>$${parseFloat(sess.actual_balance || 0).toLocaleString('es-CL')}</span>
            </div>
            <div class="summary-item">
              <strong>Diferencia de Arqueo</strong>
              <span class="${parseFloat(sess.actual_balance || 0) - parseFloat(sess.expected_balance) < 0 ? 'text-red' : 'text-green'}">
                $${(parseFloat(sess.actual_balance || 0) - parseFloat(sess.expected_balance)).toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          <div class="section-title">Detalle de Transacciones de la Caja Chica</div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Hora</th>
                <th style="width: 15%;">Tipo</th>
                <th style="width: 50%;">Detalle / Categoría</th>
                <th style="width: 20%;" class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${sess.transactions.map(t => {
                const { category, notes } = parseDescription(t.description)
                const isIngreso = t.transaction_type === 'ingreso'
                return `
                  <tr>
                    <td>${new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style="text-transform: uppercase; font-weight: bold;" class="${isIngreso ? 'text-green' : 'text-red'}">
                      ${t.transaction_type}
                    </td>
                    <td><strong>[${category}]</strong> ${notes} (${t.payment_method.toUpperCase()})</td>
                    <td class="text-right ${isIngreso ? 'text-green' : 'text-red'}">
                      ${isIngreso ? '+' : '-'}$${parseFloat(t.amount).toLocaleString('es-CL')}
                    </td>
                  </tr>
                `
              }).join('') || '<tr><td colspan="4" style="text-align:center;">No se registraron movimientos en esta sesión.</td></tr>'}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; margin-top:60px;">
            <div class="signature">Firma Cajero Responsable</div>
            <div class="signature">Firma Supervisor / Auditor</div>
          </div>

          <div class="footer-notes">
            <span>Sistema Bravo Blueprint</span>
            <span>ID Sesión: #${sess.id}</span>
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

  // Calcular porcentaje de balance para barra visual
  const totalMovido = ingresos + egresos
  const ingresosRatio = totalMovido > 0 ? (ingresos / totalMovido) * 100 : 50

  // Filtrado de las transacciones por tipo
  const listIngresos = session?.transactions ? [...session.transactions].reverse().filter(t => t.transaction_type === 'ingreso') : []
  const listEgresos = session?.transactions ? [...session.transactions].reverse().filter(t => t.transaction_type === 'egreso') : []

  if (loading && !session) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-3 text-bravo-accent font-mono text-xs">
        <span className="w-6 h-6 border-2 border-bravo-accent/40 border-t-bravo-accent rounded-full animate-spin" />
        Consultando estado de la tesorería del taller...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 text-bravo-text max-w-7xl mx-auto text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-bravo-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-bravo-accent tracking-wider flex items-center gap-2.5 uppercase italic">
            <Coins size={28} className="text-bravo-accent drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            Flujo de Caja Chica
          </h1>
          <p className="text-xs text-bravo-text-muted mt-1">Gestión del fondo en efectivo diario, egresos de materiales y abonos por servicios de Bravo.</p>
        </div>
        
        {isOpen && session && (
          <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black uppercase text-emerald-400 font-mono">Caja Abierta • #{session.id}</span>
          </div>
        )}
      </div>

      {/* Alertas con estética oscura y bordes neón */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-start gap-2.5 shadow-lg shadow-rose-950/20">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Error de operación</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-white/5 rounded-lg text-rose-400"><X size={14} /></button>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-450 rounded-xl text-xs flex items-start gap-2.5 shadow-lg shadow-emerald-950/20">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Acción exitosa</span>
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="p-1 hover:bg-white/5 rounded-lg text-emerald-450"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ESTADO 1: CAJA RECIÉN CERRADA */}
      {!isOpen && lastClosedSession ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto bg-bravo-card border border-bravo-border/60 p-7 rounded-3xl space-y-6 text-center mt-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 bg-emerald-950/30 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/10">
            <CheckCircle size={32} className="text-emerald-400 animate-bounce" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white uppercase tracking-wider italic">Sesión de Caja Cerrada</h2>
            <p className="text-xs text-bravo-text-muted max-w-md mx-auto">
              El arqueo diario ha finalizado de forma correcta. Puedes exportar el reporte digital o imprimirlo físicamente.
            </p>
          </div>

          <div className="bg-[#101017] border border-bravo-border/20 p-4.5 rounded-2xl space-y-3.5 text-xs text-left font-mono">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-bravo-text-muted">Fecha Cierre:</span>
              <span className="text-white font-bold">{new Date(lastClosedSession.closed_at).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bravo-text-muted">Fondo Inicial Apertura:</span>
              <span className="text-white font-bold">${parseFloat(lastClosedSession.initial_balance).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bravo-text-muted">Saldo Neto Esperado:</span>
              <span className="text-white font-bold">${parseFloat(lastClosedSession.expected_balance).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bravo-text-muted">Monto Físico Contado:</span>
              <span className="text-white font-bold">${parseFloat(lastClosedSession.actual_balance || 0).toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2.5 font-bold text-sm">
              <span className="text-bravo-text-muted">Diferencia de Caja:</span>
              <span className={parseFloat(lastClosedSession.actual_balance || 0) - parseFloat(lastClosedSession.expected_balance) < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                ${(parseFloat(lastClosedSession.actual_balance || 0) - parseFloat(lastClosedSession.expected_balance)).toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleExportCSV(lastClosedSession)}
              className="py-3 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-bravo-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer hover:text-bravo-accent active:scale-95 flex items-center justify-center gap-2"
            >
              <Download size={14} /> Exportar CSV
            </button>
            <button
              onClick={() => handlePrintReport(lastClosedSession)}
              className="py-3 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-lg shadow-bravo-glow/20 flex items-center justify-center gap-2"
            >
              <Printer size={14} /> Imprimir Reporte
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setLastClosedSession(null)}
              className="text-[10px] font-mono text-bravo-accent hover:text-amber-500 font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              Volver a Apertura de Caja <ArrowRight size={12} />
            </button>
          </div>
        </motion.div>
      ) : !isOpen ? (
        /* ESTADO 2: APERTURA DE CAJA */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto bg-bravo-card border border-bravo-border/60 p-7 rounded-3xl space-y-6 text-center mt-10 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-bravo-accent" />
          <Coins size={44} className="mx-auto text-bravo-accent drop-shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse" />
          
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white uppercase tracking-wider italic">Apertura de Caja Chica</h2>
            <p className="text-xs text-bravo-text-muted">Ingresa el fondo inicial en efectivo disponible en el taller para iniciar la jornada comercial.</p>
          </div>

          <form onSubmit={handleOpenRegister} className="space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-widest">Fondo Inicial Apertura (Efectivo) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-bold">$</span>
                <input
                  type="number"
                  required
                  placeholder="Ej: 30000"
                  value={initialBalance}
                  onChange={e => setInitialBalance(e.target.value)}
                  className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl py-3 pl-8 pr-4 text-xs text-bravo-text focus:outline-none transition-all placeholder-stone-500 font-mono"
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full py-3 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Coins size={14} /> Abrir Caja del Taller
            </button>
          </form>
        </motion.div>
      ) : (
        /* ESTADO 3: CAJA HABILITADA */
        <div className="space-y-6">
          
          {/* 1. Barra superior de acciones y balances de caja */}
          <div className="bg-bravo-card border border-bravo-border/40 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-5 text-left">
              <div>
                <span className="text-[9px] text-bravo-text-muted tracking-widest font-mono uppercase font-bold block">Fondo Apertura</span>
                <span className="text-sm font-black text-white font-mono">${parseFloat(session.initial_balance).toLocaleString('es-CL')}</span>
              </div>
              <div className="w-px h-8 bg-bravo-border/30 hidden sm:block" />
              <div>
                <span className="text-[9px] text-bravo-accent tracking-widest font-mono uppercase font-bold block">Saldo Esperado</span>
                <span className="text-sm font-black text-bravo-accent font-mono">${parseFloat(session.expected_balance).toLocaleString('es-CL')}</span>
              </div>
            </div>

            {/* Proporción de Balance visual simplificado */}
            {totalMovido > 0 && (
              <div className="flex-1 max-w-xs w-full space-y-1 text-left hidden lg:block">
                <div className="flex justify-between text-[8px] font-mono uppercase font-bold tracking-wider text-bravo-text-muted">
                  <span className="text-emerald-400">Ingresos ({Math.round(ingresosRatio)}%)</span>
                  <span className="text-rose-400">Gastos ({Math.round(100 - ingresosRatio)}%)</span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden flex border border-white/5">
                  <div className="h-full bg-emerald-500" style={{ width: `${ingresosRatio}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${100 - ingresosRatio}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleExportCSV(session)}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-bravo-text font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer hover:text-bravo-accent flex items-center justify-center gap-1.5"
              >
                <Download size={12} /> Exportar CSV
              </button>
              <button
                type="button"
                onClick={() => { setError(''); setSuccess(''); setShowCloseModal(true); }}
                className="flex-1 md:flex-initial px-4 py-2.5 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md text-white hover:opacity-90 bg-rose-650 hover:bg-rose-700 active:scale-95 flex items-center justify-center gap-1.5 border border-rose-500/20"
              >
                <Coins size={12} /> Cerrar Caja
              </button>
            </div>
          </div>

          {/* 2. Listas de Ingresos y Gastos juntas lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* INGRESOS DEL TALLER */}
            <div className="bg-bravo-card border border-bravo-border/50 p-5 rounded-2xl space-y-4 shadow-xl text-left flex flex-col h-[520px]">
              <div className="flex justify-between items-center border-b border-bravo-border/20 pb-3">
                <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2 uppercase tracking-wider italic">
                  <ArrowDownRight size={16} className="text-emerald-400" />
                  Ingresos del Taller
                </h3>
                <span className="text-sm font-black text-emerald-450 font-mono">+${ingresos.toLocaleString('es-CL')}</span>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 bravo-scrollbar flex-1 snap-y">
                <AnimatePresence initial={false}>
                  {listIngresos.map((t, idx) => {
                    const { category, notes } = parseDescription(t.description)
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
                        className="p-3 bg-emerald-950/5 border border-emerald-500/10 hover:border-emerald-500/25 rounded-xl flex justify-between items-center gap-2 snap-start animate-fade-in"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[11px] text-white uppercase">{category}</span>
                            <span className="text-[8px] bg-zinc-900 border border-white/5 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono">{t.payment_method}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2" title={notes}>{notes || 'Sin detalles'}</p>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className="font-black font-mono text-[11px] text-emerald-400 block">
                            +${parseFloat(t.amount).toLocaleString('es-CL')}
                          </span>
                          <span className="text-[8px] text-zinc-500 font-mono block mt-0.5">
                            {new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                  {listIngresos.length === 0 && (
                    <div className="text-center py-24 border border-dashed border-zinc-850 rounded-xl my-auto">
                      <Receipt className="mx-auto text-zinc-600 mb-2" size={24} />
                      <p className="text-xs text-zinc-500">Sin ingresos hoy</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* GASTOS DEL TALLER */}
            <div className="bg-bravo-card border border-bravo-border/50 p-5 rounded-2xl space-y-4 shadow-xl text-left flex flex-col h-[520px]">
              <div className="flex justify-between items-center border-b border-bravo-border/20 pb-3">
                <h3 className="text-sm font-black text-rose-450 flex items-center gap-2 uppercase tracking-wider italic">
                  <ArrowUpRight size={16} className="text-rose-450" />
                  Gastos del Taller
                </h3>
                <span className="text-sm font-black text-rose-400 font-mono">-${egresos.toLocaleString('es-CL')}</span>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 bravo-scrollbar flex-1 snap-y">
                <AnimatePresence initial={false}>
                  {listEgresos.map((t, idx) => {
                    const { category, notes } = parseDescription(t.description)
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
                        className="p-3 bg-rose-950/5 border border-rose-500/10 hover:border-rose-500/25 rounded-xl flex justify-between items-center gap-2 snap-start animate-fade-in"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[11px] text-white uppercase">{category}</span>
                            <span className="text-[8px] bg-zinc-900 border border-white/5 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono">{t.payment_method}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2" title={notes}>{notes || 'Sin detalles'}</p>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className="font-black font-mono text-[11px] text-rose-400 block">
                            -${parseFloat(t.amount).toLocaleString('es-CL')}
                          </span>
                          <span className="text-[8px] text-zinc-500 font-mono block mt-0.5">
                            {new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                  {listEgresos.length === 0 && (
                    <div className="text-center py-24 border border-dashed border-zinc-850 rounded-xl my-auto">
                      <Receipt className="mx-auto text-zinc-650 mb-2" size={24} />
                      <p className="text-xs text-zinc-500">Sin egresos hoy</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* 3. Formulario de Ingreso/Egreso Manual Horizontal Ancho Completo */}
          <div className="bg-bravo-card border border-bravo-border/50 p-6 rounded-2xl space-y-4 shadow-xl text-left">
            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide border-b border-bravo-border/20 pb-2">
              <Plus size={16} className="text-bravo-accent" />
              Registrar Movimiento Manual en Caja Chica
            </h3>

            <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Tipo de Movimiento</label>
                <select
                  value={txForm.transaction_type}
                  onChange={e => handleTypeChange(e.target.value)}
                  className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors"
                >
                  <option value="egreso">💸 Egreso (Gasto)</option>
                  <option value="ingreso">💰 Ingreso (Aporte)</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Categoría</label>
                <select
                  value={txForm.category}
                  onChange={e => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors"
                >
                  {txForm.transaction_type === 'egreso' 
                    ? CATEGORIES_EGRESO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)
                    : CATEGORIES_INGRESO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)
                  }
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 2500"
                    value={txForm.amount}
                    onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 pl-7 pr-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Medio</label>
                <select
                  value={txForm.payment_method}
                  onChange={e => setTxForm({ ...txForm, payment_method: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">📲 Transferencia</option>
                </select>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Notas / Detalle del Movimiento *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    txForm.transaction_type === 'egreso' 
                      ? 'Ej: Compra cinta térmica o boleta #421' 
                      : 'Ej: Abono cliente orden ORD-00042 o aporte'
                  }
                  value={txForm.notes}
                  onChange={e => setTxForm({ ...txForm, notes: e.target.value })}
                  className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors"
                />
              </div>

              <div className="md:col-span-12 mt-2 text-right">
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-2.5 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center gap-1.5 inline-flex"
                >
                  <Plus size={14} /> Registrar Movimiento Manual
                </button>
              </div>
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
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4 text-left"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border/30 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider font-mono">Arqueo y Cierre de Caja</h3>
                  <p className="text-[9px] text-bravo-text-muted uppercase font-mono">Verificación de efectivo al final de la jornada</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 text-bravo-text-muted hover:text-bravo-text rounded hover:bg-bravo-sidebar cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-[#101017] border border-bravo-border/20 p-4 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-bravo-text-muted">Saldo Esperado en Caja:</span>
                  <span className="font-bold text-white">${parseFloat(session.expected_balance).toLocaleString('es-CL')}</span>
                </div>
                <p className="text-[10px] text-bravo-text-muted leading-normal font-sans pt-1">
                  Cuenta el efectivo real que tienes físicamente en la caja del taller e ingrésalo abajo. El sistema calculará automáticamente si hay cuadre.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Monto Contado Real *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 77000"
                    value={actualBalance}
                    onChange={e => setActualBalance(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2.5 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors font-mono"
                  />
                </div>

                {actualBalance && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold ${
                    parseFloat(actualBalance) == parseFloat(session.expected_balance)
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 font-bold'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-400 font-bold'
                  }`}>
                    Diferencia: ${(parseFloat(actualBalance) - parseFloat(session.expected_balance)).toLocaleString('es-CL')} 
                    {parseFloat(actualBalance) == parseFloat(session.expected_balance) ? ' (Caja Cuadrada)' : ' (Descuadre en Caja)'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCloseRegister}
                  disabled={!actualBalance}
                  className="w-full py-2.5 bg-rose-650 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
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
