import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, ArrowDownRight, ArrowUpRight, DollarSign, Calendar, Clock, User, 
  Plus, AlertTriangle, CheckCircle, HelpCircle, X, ClipboardList, Filter, 
  Sparkles, Receipt, Info, Download, Printer, ArrowRight, Search, Calculator,
  TrendingUp, TrendingDown, ShieldCheck, FileText, Check, RefreshCw, Lock, Wallet, ChevronRight
} from 'lucide-react'
import { 
  getCashRegisterStatus, openCashRegisterSession, 
  closeCashRegisterSession, addCashRegisterTransaction 
} from '../../api/cashRegister'
import BravoBackground from '../../components/bravo/BravoBackground'

// Categorías adaptadas al negocio de Bravo
const CATEGORIES_EGRESO = [
  { id: 'insumos_estampado', label: 'Insumos de Estampado (Tintas, Films, Vinilo)', icon: '🎨' },
  { id: 'prendas_base', label: 'Adquisición de Prendas Base (Poleras, Polerones)', icon: '👕' },
  { id: 'blanks_sublimacion', label: 'Blanks de Sublimación (Tazas, Mugs, Botellas)', icon: '☕' },
  { id: 'gastos_menores', label: 'Gastos Menores del Taller (Cintas, embalaje)', icon: '🔧' },
  { id: 'remesa', label: 'Retiro de Caja / Remesa a Banco', icon: '🏦' },
  { id: 'otro', label: 'Otro Egreso Especial', icon: '📦' }
]

const CATEGORIES_INGRESO = [
  { id: 'abono_pedido', label: 'Abono Inicial de Cliente (Pedido)', icon: '💵' },
  { id: 'pago_saldo', label: 'Pago de Saldo (Entrega de Pedido)', icon: '💰' },
  { id: 'venta_directa', label: 'Venta Directa de Mercancía / Catálogo', icon: '🛒' },
  { id: 'aporte_caja', label: 'Aporte Extraordinario a Fondo', icon: '📥' },
  { id: 'otro', label: 'Otro Ingreso Especial', icon: '📦' }
]

// Montos rápidos para agilizar el registro
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000]

// Billetes y monedas de Chile para la calculadora de arqueo
const CHILE_CURRENCY = [
  { value: 20000, label: '$20.000', type: 'billete' },
  { value: 10000, label: '$10.000', type: 'billete' },
  { value: 5000, label: '$5.000', type: 'billete' },
  { value: 2000, label: '$2.000', type: 'billete' },
  { value: 1000, label: '$1.000', type: 'billete' },
  { value: 500, label: '$500', type: 'moneda' },
  { value: 100, label: '$100', type: 'moneda' },
  { value: 50, label: '$50', type: 'moneda' },
  { value: 10, label: '$10', type: 'moneda' },
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

  // Modales
  const [showTxModal, setShowTxModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [useCalculator, setUseCalculator] = useState(false)
  const [denominations, setDenominations] = useState({})

  // Búsqueda y Filtros de historial
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'ingreso' | 'egreso' | 'efectivo' | 'transferencia'

  // Formularios
  const [initialBalance, setInitialBalance] = useState('')
  const [actualBalance, setActualBalance] = useState('')

  const [txForm, setTxForm] = useState({
    transaction_type: 'egreso',
    category: 'insumos_estampado',
    notes: '',
    amount: '',
    payment_method: 'efectivo'
  })

  // Sincronizar categoría por defecto al cambiar tipo
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
      const categories = txForm.transaction_type === 'egreso' ? CATEGORIES_EGRESO : CATEGORIES_INGRESO
      const selectedCat = categories.find(c => c.id === txForm.category)
      const catLabel = selectedCat ? `${selectedCat.icon} ${selectedCat.label}` : 'Movimiento'
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
      setShowTxModal(false)
      await fetchSessionStatus()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al registrar el movimiento.')
    } finally {
      setLoading(false)
    }
  }

  // Actualizar calculadora de billetes
  const handleDenominationChange = (val, count) => {
    const updated = { ...denominations, [val]: Math.max(0, parseInt(count) || 0) }
    setDenominations(updated)
    const calcTotal = CHILE_CURRENCY.reduce((sum, item) => {
      return sum + (item.value * (updated[item.value] || 0))
    }, 0)
    setActualBalance(calcTotal.toString())
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
      setDenominations({})
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
      ...(sess.transactions || []).map(t => {
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
    const totalIngresos = (sess.transactions || []).filter(t => t.transaction_type === 'ingreso').reduce((a, b) => a + parseFloat(b.amount), 0)
    const totalEgresos = (sess.transactions || []).filter(t => t.transaction_type === 'egreso').reduce((a, b) => a + parseFloat(b.amount), 0)
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cierre de Caja Chica - Personalizaciones Bravo</title>
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
            .footer-notes { margin-top: 40px; border-top: 1px solid #333; padding-top: 15px; display: flex; justify-between; font-size: 11px; color: #555; }
            .signature { border-top: 1px dashed #999; width: 200px; text-align: center; padding-top: 5px; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Personalizaciones Bravo</h1>
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
              ${(sess.transactions || []).map(t => {
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
            <span>Bravo Blueprint System</span>
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

  // Cálculos de Totales y Desglose por Medio de Pago
  const getTotals = () => {
    if (!session || !session.transactions) return { ingresos: 0, egresos: 0, efectivoIngreso: 0, transfeIngreso: 0, efectivoEgreso: 0 }
    let ingresos = 0
    let egresos = 0
    let efectivoIngreso = 0
    let transfeIngreso = 0
    let efectivoEgreso = 0

    session.transactions.forEach(t => {
      const amt = parseFloat(t.amount)
      if (t.transaction_type === 'ingreso') {
        ingresos += amt
        if (t.payment_method === 'efectivo') efectivoIngreso += amt
        else transfeIngreso += amt
      } else {
        egresos += amt
        if (t.payment_method === 'efectivo') efectivoEgreso += amt
      }
    })
    return { ingresos, egresos, efectivoIngreso, transfeIngreso, efectivoEgreso }
  }

  const { ingresos, egresos, efectivoIngreso, transfeIngreso, efectivoEgreso } = getTotals()

  // Transacciones filtradas y buscadas
  const filteredTransactions = (session?.transactions || []).filter(t => {
    const { category, notes } = parseDescription(t.description)
    const matchSearch = notes.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.amount.toString().includes(searchQuery)
    
    if (filterType === 'ingreso') return matchSearch && t.transaction_type === 'ingreso'
    if (filterType === 'egreso') return matchSearch && t.transaction_type === 'egreso'
    if (filterType === 'efectivo') return matchSearch && t.payment_method === 'efectivo'
    if (filterType === 'transferencia') return matchSearch && t.payment_method === 'transferencia'
    return matchSearch
  })

  const listTransactions = [...filteredTransactions].reverse()

  if (loading && !session) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-bravo-accent font-mono text-xs">
        <span className="w-8 h-8 border-2 border-bravo-accent/40 border-t-bravo-accent rounded-full animate-spin" />
        Consultando tesorería y caja chica de Bravo...
      </div>
    )
  }

  return (
    <div className="space-y-6 text-bravo-text max-w-7xl mx-auto text-left relative pb-12">
      <BravoBackground />

      {/* Glow ambient background */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-bravo-border pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-bravo-accent/10 border border-bravo-accent/30 text-bravo-accent shadow-lg shadow-bravo-glow/10">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wider flex items-center gap-2.5 font-mono">
                Caja Chica & Tesorería
              </h1>
              <p className="text-xs text-bravo-text-muted mt-0.5">Control de efectivo en taller, insumos, abonos y ventas directas de Bravo.</p>
            </div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          {isOpen && session ? (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-4 py-2 rounded-2xl shadow-lg shadow-emerald-950/30">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-xs font-black uppercase text-emerald-300 font-mono">Caja Abierta • #{session.id}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 px-4 py-2 rounded-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-xs font-black uppercase text-rose-400 font-mono">Caja Cerrada</span>
            </div>
          )}

          {isOpen && session && (
            <button
              onClick={() => { setError(''); setSuccess(''); setShowTxModal(true); }}
              className="px-4 py-2.5 bg-bravo-accent hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 flex items-center gap-2"
            >
              <Plus size={16} /> Nuevo Movimiento
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-2xl text-xs flex items-start gap-3 shadow-xl relative z-10">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-extrabold block mb-0.5 uppercase tracking-wide">Error de Operación</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-white/10 rounded-lg text-rose-300"><X size={16} /></button>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs flex items-start gap-3 shadow-xl relative z-10">
            <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1">
              <span className="font-extrabold block mb-0.5 uppercase tracking-wide">Operación Exitosa</span>
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="p-1 hover:bg-white/10 rounded-lg text-emerald-300"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ESTADO 1: CAJA RECIÉN CERRADA */}
      {!isOpen && lastClosedSession ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto bg-bravo-card border border-bravo-border p-8 rounded-3xl space-y-6 text-center mt-6 shadow-2xl relative overflow-hidden z-10"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
          
          <div className="w-16 h-16 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/20">
            <ShieldCheck size={36} className="text-emerald-400" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-white font-mono">Sesión de Caja Cerrada</h2>
            <p className="text-xs text-bravo-text-muted max-w-md mx-auto">
              El arqueo diario ha finalizado de forma correcta. Puedes exportar el reporte digital o imprimirlo físicamente.
            </p>
          </div>

          <div className="bg-[#101017] border border-bravo-border/40 p-5 rounded-2xl space-y-3 text-xs text-left font-mono">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-bravo-text-muted">Fecha Cierre:</span>
              <span className="text-white font-bold">{new Date(lastClosedSession.closed_at || new Date()).toLocaleString('es-CL')}</span>
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
            <div className="flex justify-between border-t border-white/10 pt-2.5 font-bold text-sm">
              <span className="text-bravo-text-muted">Diferencia de Arqueo:</span>
              <span className={parseFloat(lastClosedSession.actual_balance || 0) - parseFloat(lastClosedSession.expected_balance) < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                ${(parseFloat(lastClosedSession.actual_balance || 0) - parseFloat(lastClosedSession.expected_balance)).toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExportCSV(lastClosedSession)}
              className="py-3 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-bravo-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer hover:text-bravo-accent flex items-center justify-center gap-2"
            >
              <Download size={15} /> Exportar CSV
            </button>
            <button
              onClick={() => handlePrintReport(lastClosedSession)}
              className="py-3 bg-bravo-accent hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 flex items-center justify-center gap-2"
            >
              <Printer size={15} /> Imprimir Reporte
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setLastClosedSession(null)}
              className="text-xs font-mono text-bravo-accent hover:text-amber-400 font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              Abrir Nueva Sesión de Caja <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      ) : !isOpen ? (
        /* ESTADO 2: APERTURA DE CAJA */
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto bg-bravo-card border border-bravo-border/80 p-8 rounded-3xl space-y-6 text-center mt-10 shadow-2xl relative z-10"
        >
          <div className="w-16 h-16 bg-bravo-accent/15 border border-bravo-accent/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-bravo-glow/10">
            <Coins size={36} className="text-bravo-accent animate-pulse" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-white font-mono">Apertura de Caja Chica</h2>
            <p className="text-xs text-bravo-text-muted">Ingresa el fondo inicial en efectivo disponible en el taller para iniciar la jornada comercial.</p>
          </div>

          <form onSubmit={handleOpenRegister} className="space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-widest">Fondo Inicial Apertura (Efectivo) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-bold">$</span>
                <input
                  type="number"
                  required
                  placeholder="Ej: 30000"
                  value={initialBalance}
                  onChange={e => setInitialBalance(e.target.value)}
                  className="w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-2xl py-3 pl-9 pr-4 text-sm text-bravo-text focus:outline-none transition-all placeholder-stone-500 font-mono shadow-inner"
                  autoFocus
                />
              </div>

              {/* Botones de fondo rápido */}
              <div className="flex gap-2 pt-1">
                {[10000, 20000, 30000, 50000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInitialBalance(amt.toString())}
                    className="flex-1 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-400 hover:text-bravo-accent hover:border-bravo-accent/40 transition-colors"
                  >
                    ${amt.toLocaleString('es-CL')}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full py-3.5 bg-bravo-accent hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Coins size={16} /> Abrir Caja del Taller
            </button>
          </form>
        </motion.div>
      ) : (
        /* ESTADO 3: CAJA ABIERTA - DASHBOARD COMPLETO */
        <div className="space-y-6 relative z-10">

          {/* KPI CARDS BAR */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Fondo Inicial */}
            <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-4 space-y-2 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Fondo Apertura</span>
                <div className="p-2 rounded-xl bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                  <Coins size={16} />
                </div>
              </div>
              <p className="text-xl font-black text-white font-mono">
                ${parseFloat(session.initial_balance).toLocaleString('es-CL')}
              </p>
              <span className="text-[9px] text-zinc-500 font-mono block">Efectivo al abrir jornada</span>
            </div>

            {/* Card 2: Ingresos Recaudados */}
            <div className="bg-bravo-card border border-emerald-500/20 rounded-2xl p-4 space-y-2 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Ingresos Totales</span>
                <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <ArrowDownRight size={16} />
                </div>
              </div>
              <p className="text-xl font-black text-emerald-400 font-mono">
                +${ingresos.toLocaleString('es-CL')}
              </p>
              <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono">
                <span className="text-emerald-400">💵 ${efectivoIngreso.toLocaleString('es-CL')}</span>
                <span>•</span>
                <span className="text-blue-400">📲 ${transfeIngreso.toLocaleString('es-CL')}</span>
              </div>
            </div>

            {/* Card 3: Egresos del Día */}
            <div className="bg-bravo-card border border-rose-500/20 rounded-2xl p-4 space-y-2 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">Egresos / Gastos</span>
                <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <p className="text-xl font-black text-rose-400 font-mono">
                -${egresos.toLocaleString('es-CL')}
              </p>
              <span className="text-[9px] text-zinc-500 font-mono block">Compras insumos & gastos</span>
            </div>

            {/* Card 4: Saldo Teórico Esperado */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-bravo-accent/40 rounded-2xl p-4 space-y-2 shadow-xl shadow-bravo-glow/5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-bravo-accent uppercase tracking-widest">Saldo Esperado</span>
                <div className="p-2 rounded-xl bg-bravo-accent/15 text-bravo-accent border border-bravo-accent/30">
                  <DollarSign size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-bravo-accent font-mono drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                ${parseFloat(session.expected_balance).toLocaleString('es-CL')}
              </p>
              <span className="text-[9px] text-zinc-400 font-mono block">Fondo inicial + Ingresos - Egresos</span>
            </div>
          </div>

          {/* BARRA DE ACCIONES SECUNDARIAS */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-bravo-card border border-bravo-border/50 p-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-zinc-400">Acciones de Caja:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCSV(session)}
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer hover:text-bravo-accent flex items-center gap-1.5"
              >
                <Download size={14} /> Exportar CSV
              </button>

              <button
                type="button"
                onClick={() => handlePrintReport(session)}
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer hover:text-bravo-accent flex items-center gap-1.5"
              >
                <Printer size={14} /> Vista de Cierre
              </button>

              <button
                type="button"
                onClick={() => { setError(''); setSuccess(''); setShowCloseModal(true); }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-950/40 flex items-center gap-1.5 border border-rose-500/30 active:scale-95"
              >
                <Lock size={14} /> Realizar Arqueo y Cerrar Caja
              </button>
            </div>
          </div>

          {/* HISTORIAL Y FILTROS */}
          <div className="bg-bravo-card border border-bravo-border/60 rounded-3xl p-6 space-y-5 shadow-2xl">
            
            {/* Cabecera del Historial */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-bravo-border/40 pb-4">
              <div>
                <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                  <Receipt size={18} className="text-bravo-accent" />
                  Movimientos de la Sesión Actual ({listTransactions.length})
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Historial en tiempo real de cobros, abonos y gastos registrados.</p>
              </div>

              {/* Filtros de Tipo */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'ingreso', label: '🟢 Ingresos' },
                  { key: 'egreso', label: '🔴 Egresos' },
                  { key: 'efectivo', label: '💵 Efectivo' },
                  { key: 'transferencia', label: '📲 Transferencia' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      filterType === f.key
                        ? 'bg-bravo-accent text-black border-bravo-accent shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscador en vivo */}
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por detalle, categoría o monto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-bravo-input border border-bravo-border rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/50"
              />
            </div>

            {/* Lista de Movimientos Timeline */}
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 bravo-scrollbar">
              <AnimatePresence initial={false}>
                {listTransactions.map((t, idx) => {
                  const { category, notes } = parseDescription(t.description)
                  const isIngreso = t.transaction_type === 'ingreso'
                  return (
                    <motion.div
                      key={t.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        isIngreso
                          ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/40'
                          : 'bg-rose-950/10 border-rose-500/20 hover:border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                          isIngreso ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
                        }`}>
                          {isIngreso ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-white uppercase font-mono">{category}</span>
                            <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                              t.payment_method === 'efectivo' ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' : 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                            }`}>
                              {t.payment_method === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 truncate" title={notes}>{notes || 'Sin especificación'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/40">
                        <span className={`text-base font-black font-mono ${isIngreso ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isIngreso ? '+' : '-'}${parseFloat(t.amount).toLocaleString('es-CL')}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                        </span>
                      </div>
                    </motion.div>
                  )
                })}

                {listTransactions.length === 0 && (
                  <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
                    <Receipt size={36} className="mx-auto text-zinc-600 mb-2 opacity-50" />
                    <p className="text-xs font-mono text-zinc-500">No se encontraron movimientos registrados en la sesión actual.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: REGISTRAR NUEVO MOVIMIENTO */}
      <AnimatePresence>
        {showTxModal && session && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e15] border border-bravo-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-5 p-6 text-left relative"
            >
              <div className="flex justify-between items-center border-b border-bravo-border/60 pb-4">
                <div>
                  <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                    <Plus size={18} className="text-bravo-accent" />
                    Registrar Movimiento Manual
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Ingresa los datos del ingreso o egreso de caja.</p>
                </div>
                <button onClick={() => setShowTxModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                
                {/* Selector Tipo de Movimiento Segmentado */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('egreso')}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      txForm.transaction_type === 'egreso'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight size={16} /> Egreso (Gasto)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('ingreso')}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      txForm.transaction_type === 'ingreso'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight size={16} /> Ingreso (Aporte)
                  </button>
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Categoría *</label>
                  <select
                    value={txForm.category}
                    onChange={e => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-bravo-accent transition-colors"
                  >
                    {txForm.transaction_type === 'egreso' 
                      ? CATEGORIES_EGRESO.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)
                      : CATEGORIES_INGRESO.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)
                    }
                  </select>
                </div>

                {/* Monto e Inputs Rápidos */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Monto ($) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">$</span>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={txForm.amount}
                      onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-2xl py-3 pl-9 pr-4 text-base text-white font-mono font-bold focus:outline-none focus:border-bravo-accent transition-colors"
                    />
                  </div>

                  {/* Chips de monto rápido */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_AMOUNTS.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const current = parseFloat(txForm.amount || 0)
                          setTxForm({ ...txForm, amount: (current + amt).toString() })
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-400 hover:text-bravo-accent hover:border-bravo-accent/40 transition-colors"
                      >
                        +${amt.toLocaleString('es-CL')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Medio de Pago */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Medio de Pago *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'efectivo', label: '💵 Efectivo' },
                      { id: 'transferencia', label: '📲 Transferencia' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTxForm({ ...txForm, payment_method: m.id })}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          txForm.payment_method === m.id
                            ? 'bg-zinc-800 border-bravo-accent text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detalle / Notas */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Notas / Detalle del Movimiento *</label>
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
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-bravo-accent transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-bravo-accent hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Confirmar y Guardar Movimiento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ARQUEO Y CIERRE DE CAJA (CON CALCULADORA DE BILLETES) */}
      <AnimatePresence>
        {showCloseModal && session && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e15] border border-bravo-border p-6 rounded-3xl w-full max-w-lg shadow-2xl relative space-y-5 text-left max-h-[90vh] overflow-y-auto bravo-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-bravo-border/40 pb-4">
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Lock size={18} className="text-rose-400" />
                    Arqueo y Cierre de Caja
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Conteo físico de efectivo y verificación final.</p>
                </div>
                <button onClick={() => setShowCloseModal(false)} className="p-2 hover:bg-white/5 rounded-xl text-zinc-400">
                  <X size={18} />
                </button>
              </div>

              {/* Card de Resumen de Saldo Teórico */}
              <div className="bg-[#101017] border border-bravo-border/40 p-4 rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Saldo Esperado en Caja:</span>
                  <span className="font-black text-bravo-accent text-sm">${parseFloat(session.expected_balance).toLocaleString('es-CL')}</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal font-sans pt-1">
                  Ingresa el monto físico contado en la caja o usa la calculadora de billetes abajo.
                </p>
              </div>

              {/* Botón Switch Modo Calculadora */}
              <button
                type="button"
                onClick={() => setUseCalculator(!useCalculator)}
                className="w-full py-2 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 rounded-xl text-xs font-bold text-zinc-300 hover:text-bravo-accent transition-colors flex items-center justify-center gap-2"
              >
                <Calculator size={15} />
                {useCalculator ? 'Cambiar a Ingreso Directo de Monto' : 'Usar Calculadora de Billetes y Monedas'}
              </button>

              {/* MODO CALCULADORA DE BILLETES DE CHILE */}
              {useCalculator ? (
                <div className="space-y-3 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-mono text-bravo-accent uppercase font-bold tracking-widest">Conteo por Denominación ($ CLP)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CHILE_CURRENCY.map(c => (
                      <div key={c.value} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                        <span className="text-xs font-mono font-bold text-white">{c.label}</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={denominations[c.value] || ''}
                          onChange={e => handleDenominationChange(c.value, e.target.value)}
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-bravo-accent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* INGRESO DIRECTO DE MONTO */
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Monto Físico Contado *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">$</span>
                    <input
                      type="number"
                      required
                      placeholder="Ej: 50000"
                      value={actualBalance}
                      onChange={e => setActualBalance(e.target.value)}
                      className="w-full bg-bravo-input border border-bravo-border rounded-2xl py-3 pl-9 pr-4 text-sm text-white font-mono font-bold focus:outline-none focus:border-bravo-accent transition-colors"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* CÁLCULO DE DIFERENCIA EN TIEMPO REAL */}
              {actualBalance !== '' && (
                <div className={`p-4 rounded-2xl border text-xs font-mono space-y-1 ${
                  parseFloat(actualBalance) === parseFloat(session.expected_balance)
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>Diferencia de Arqueo:</span>
                    <span className="text-sm">
                      ${(parseFloat(actualBalance) - parseFloat(session.expected_balance)).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <p className="text-[10px] font-sans opacity-90">
                    {parseFloat(actualBalance) === parseFloat(session.expected_balance)
                      ? '✨ ¡Excelente! La caja se encuentra cuadrada perfectamente.'
                      : parseFloat(actualBalance) > parseFloat(session.expected_balance)
                      ? '⚠️ Hay un SOBRANTE en caja. Verifica si omitiste registrar algún egreso.'
                      : '⚠️ Hay un FALTANTE en caja. Verifica si omitiste registrar algún ingreso o gasto.'}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCloseRegister}
                  disabled={!actualBalance}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-rose-950/40 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Lock size={16} /> Confirmar y Finalizar Cierre
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
