import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Clock, Check, Trash2, Plus, Search, Smartphone, Package, Printer } from 'lucide-react'
import { getScreenPrices } from '../api/screenPrices'
import { getInventoryItems } from '../api/inventory'

const DEVICE_DIAGNOSTICS = {
  phone: {
    label: 'Celular',
    issues: [
      { id: 'screen', name: 'Cambio de Pantalla', cost: 45000, time: 1.0 },
      { id: 'battery', name: 'Cambio de Batería', cost: 20000, time: 0.5 },
      { id: 'port', name: 'Puerto de Carga USB-C/Lightning', cost: 15000, time: 0.5 },
      { id: 'glass', name: 'Vidrio Trasero', cost: 30000, time: 1.5 },
      { id: 'camera', name: 'Cámara Trasera/Frontal', cost: 25000, time: 1.0 },
      { id: 'board', name: 'Micro-soldadura en Placa', cost: 60000, time: 3.0 },
    ]
  },
  laptop: {
    label: 'Notebook',
    issues: [
      { id: 'screen', name: 'Pantalla LCD/OLED', cost: 95000, time: 1.5 },
      { id: 'battery', name: 'Batería Interna', cost: 45000, time: 1.0 },
      { id: 'keyboard', name: 'Teclado Completo', cost: 35000, time: 1.0 },
      { id: 'thermal', name: 'Limpieza y Pasta Térmica', cost: 25000, time: 1.0 },
      { id: 'disk', name: 'Cambio de Disco SSD + OS', cost: 40000, time: 1.0 },
      { id: 'board', name: 'Reparación de Circuito de Carga', cost: 80000, time: 3.0 },
    ]
  },
  console: {
    label: 'Consola',
    issues: [
      { id: 'hdmi', name: 'Puerto HDMI / Reemplazo', cost: 35000, time: 1.5 },
      { id: 'laser', name: 'Lector de Discos / Láser', cost: 45000, time: 1.5 },
      { id: 'thermal', name: 'Limpieza profunda + Metal Líquido', cost: 30000, time: 1.5 },
      { id: 'power', name: 'Fuente de Poder', cost: 40000, time: 1.0 },
      { id: 'board', name: 'Reballing / Soldadura chip', cost: 75000, time: 4.0 },
    ]
  },
  tablet: {
    label: 'Tablet',
    issues: [
      { id: 'screen', name: 'Pantalla Táctil/Vidrio', cost: 55000, time: 1.5 },
      { id: 'battery', name: 'Reemplazo Batería', cost: 30000, time: 1.0 },
      { id: 'port', name: 'Pin de Carga', cost: 18000, time: 1.0 },
      { id: 'system', name: 'Flasheo / Software Brickeo', cost: 15000, time: 1.0 },
    ]
  }
}

function printQuickQuotePDF({ clientName, deviceLabel, brandModel, issues, difficultyLabel, totalCost, totalHours }) {
  const win = window.open('', '_blank', 'width=720,height=680')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cotización Técnica - Nova Technologies</title>
        <meta charset="utf-8" />
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: 'Inter', system-ui, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0891b2; padding-bottom: 14px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 900; color: #0891b2; letter-spacing: 0.05em; }
          .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .right { text-align: right; }
          .total-box { background: #ecfeff; border: 1.5px solid #06b6d4; border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 900; color: #0e7490; }
          .footer { margin-top: 28px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>NOVA TECHNOLOGIES</h1>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Presupuesto de Diagnóstico y Servicio Técnico</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#475569;">
            <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CL')}<br/>
            <strong>Validez:</strong> 7 días hábiles
          </div>
        </div>
        <div class="meta">
          <div><strong>Cliente:</strong> ${clientName || 'Cliente en Mostrador'}</div>
          <div><strong>Categoría:</strong> ${deviceLabel}</div>
          <div><strong>Equipo / Modelo:</strong> ${brandModel || 'Por especificar'}</div>
          <div><strong>Complejidad / SLA Est.:</strong> ${difficultyLabel} (${totalHours} hrs aprox.)</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Servicio / Repuesto Cotizado</th>
              <th class="right">Tiempo Est.</th>
              <th class="right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${issues.map(i => `
              <tr>
                <td>${i.name}</td>
                <td class="right">${i.time} hrs</td>
                <td class="right">$${Number(i.cost).toLocaleString('es-CL')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <span>TOTAL PRESUPUESTO RECOMENDADO</span>
          <span>$${Number(totalCost).toLocaleString('es-CL')}</span>
        </div>
        <div class="footer">
          El diagnóstico es sin costo al realizar la reparación en nuestro laboratorio.<br/>
          Todas nuestras reparaciones cuentan con garantía técnica respaldada por orden digital.
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `)
  win.document.close()
}

export default function DiagnosticAssistantPage() {
  const navigate = useNavigate()
  const orderId = useLocation().state?.estimateOrderId
  const [deviceType, setDeviceType] = useState('phone')
  const [selectedIssues, setSelectedIssues] = useState([])
  const [complexity, setComplexity] = useState('easy')
  const [copied, setCopied] = useState(false)
  const [quoteClientName, setQuoteClientName] = useState('')
  const [quoteBrand, setQuoteBrand] = useState('')
  const [quoteModel, setQuoteModel] = useState('')

  // Catálogo real de pantallas e inventario de Nova
  const [screenCatalog, setScreenCatalog] = useState([])
  const [inventoryCatalog, setInventoryCatalog] = useState([])
  const [catalogSearch, setCatalogSearch] = useState('')

  useEffect(() => {
    Promise.allSettled([
      getScreenPrices(),
      getInventoryItems({ system: 'nova', limit: 200 })
    ]).then(([scrRes, invRes]) => {
      if (scrRes.status === 'fulfilled') setScreenCatalog(scrRes.value.data || [])
      if (invRes.status === 'fulfilled') setInventoryCatalog(invRes.value.data || [])
    })
  }, [])

  // LocalStorage state for diagnostics dictionary
  const [diagnostics, setDiagnostics] = useState(() => {
    const saved = localStorage.getItem('nova_custom_diagnostics')
    return saved ? JSON.parse(saved) : DEVICE_DIAGNOSTICS
  })

  // Add custom service states
  const [showAddForm, setShowAddForm] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceCost, setNewServiceCost] = useState('')
  const [newServiceTime, setNewServiceTime] = useState('')

  const currentDevice = diagnostics[deviceType]
  
  const handleDeviceChange = (type) => {
    setDeviceType(type)
    setSelectedIssues([])
    setShowAddForm(false)
  }

  const toggleIssue = (issue) => {
    if (selectedIssues.some(i => i.id === issue.id)) {
      setSelectedIssues(selectedIssues.filter(i => i.id !== issue.id))
    } else {
      setSelectedIssues([...selectedIssues, issue])
    }
  }

  const handleAddCatalogScreen = (scr) => {
    const itemObj = {
      id: `scr_${scr.id}`,
      name: `Pantalla ${scr.brand} ${scr.model} (${scr.quality || 'Original'})`,
      cost: Number(scr.sale_price || 0),
      time: 1.5
    }
    if (!quoteBrand) setQuoteBrand(scr.brand || '')
    if (!quoteModel) setQuoteModel(scr.model || '')
    if (!selectedIssues.some(i => i.id === itemObj.id)) {
      setSelectedIssues(prev => [...prev, itemObj])
    }
  }

  const handleAddCatalogInventory = (inv) => {
    const price = Number(inv.sale_price || 0) > 0 ? Number(inv.sale_price) : Number(inv.cost_price || 0)
    const itemObj = {
      id: `inv_${inv.id}`,
      name: `Repuesto: ${inv.name}`,
      cost: price,
      time: 1.0
    }
    if (!selectedIssues.some(i => i.id === itemObj.id)) {
      setSelectedIssues(prev => [...prev, itemObj])
    }
  }

  const filteredCatalogResults = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    if (!q) return { screens: screenCatalog.slice(0, 4), parts: inventoryCatalog.filter(i => i.stock > 0).slice(0, 4) }
    const screens = screenCatalog.filter(s =>
      `${s.brand} ${s.model} ${s.quality || ''}`.toLowerCase().includes(q)
    ).slice(0, 6)
    const parts = inventoryCatalog.filter(i =>
      i.name.toLowerCase().includes(q) || (i.barcode || '').toLowerCase().includes(q)
    ).slice(0, 6)
    return { screens, parts }
  }, [catalogSearch, screenCatalog, inventoryCatalog])

  const handleAddService = (e) => {
    e.preventDefault()
    if (!newServiceName.trim() || !newServiceCost || !newServiceTime) {
      alert("Por favor completa todos los campos.")
      return
    }

    const newIssue = {
      id: `custom_${Date.now()}`,
      name: newServiceName.trim(),
      cost: parseFloat(newServiceCost),
      time: parseFloat(newServiceTime)
    }

    const updatedDiagnostics = {
      ...diagnostics,
      [deviceType]: {
        ...diagnostics[deviceType],
        issues: [...diagnostics[deviceType].issues, newIssue]
      }
    }

    setDiagnostics(updatedDiagnostics)
    localStorage.setItem('nova_custom_diagnostics', JSON.stringify(updatedDiagnostics))

    setNewServiceName('')
    setNewServiceCost('')
    setNewServiceTime('')
    setShowAddForm(false)
  }

  const handleDeleteService = (issueId) => {
    const updatedIssues = diagnostics[deviceType].issues.filter(i => i.id !== issueId)
    const updatedDiagnostics = {
      ...diagnostics,
      [deviceType]: {
        ...diagnostics[deviceType],
        issues: updatedIssues
      }
    }
    setDiagnostics(updatedDiagnostics)
    localStorage.setItem('nova_custom_diagnostics', JSON.stringify(updatedDiagnostics))
    setSelectedIssues(selectedIssues.filter(i => i.id !== issueId))
  }

  const complexityMultipliers = {
    easy: { val: 1.0, label: 'Baja (Estándar)' },
    medium: { val: 1.2, label: 'Media (+20% Mano de obra)' },
    hard: { val: 1.5, label: 'Alta (+50% Complejidad técnica)' }
  }

  const laborMultiplier = complexityMultipliers[complexity].val
  
  const subtotal = selectedIssues.reduce((sum, i) => sum + i.cost, 0)
  const totalCost = Math.round(subtotal * laborMultiplier)
  const totalHours = selectedIssues.reduce((sum, i) => sum + i.time, 0)

  const summaryText = `[${currentDevice.label}${quoteBrand || quoteModel ? ` ${quoteBrand} ${quoteModel}` : ''}] - ` + 
    (selectedIssues.length > 0 ? selectedIssues.map(i => i.name).join(', ') : 'Ninguna falla seleccionada') +
    ` | Dificultad: ${complexityMultipliers[complexity].label} | Presupuesto recomendado: $${totalCost.toLocaleString('es-CL')} | Tiempo estimado: ${totalHours} hrs.`

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 relative flex flex-col max-w-5xl mx-auto">
      {/* Header Nova */}
      <nav className="relative z-10 border-b border-slate-800/80 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-9 h-9 rounded-xl border border-slate-800 bg-[#0c111d] text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center cursor-pointer transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
                Cotizador Rápido & Presupuestos de Taller
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Conectado al Catálogo de Pantallas ({screenCatalog.length}) e Inventario Real ({inventoryCatalog.length})
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 py-2 w-full flex-1 space-y-6">
        
        <div className="nova-card p-6 space-y-6">
          {/* Datos rápidos del equipo/cliente para la cotización */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-gray-800/80 text-left">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                Cliente (Opcional p/ PDF)
              </label>
              <input
                value={quoteClientName}
                onChange={e => setQuoteClientName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                Marca del Equipo
              </label>
              <input
                value={quoteBrand}
                onChange={e => setQuoteBrand(e.target.value)}
                placeholder="Ej: Apple, Samsung, Lenovo..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                Modelo Exacto
              </label>
              <input
                value={quoteModel}
                onChange={e => setQuoteModel(e.target.value)}
                placeholder="Ej: iPhone 13 Pro, Galaxy A54..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Buscador en Vivo de Pantallas e Inventario Real */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/20 space-y-3 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone size={15} className="text-cyan-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Vincular Pantalla o Repuesto Real del Catálogo
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Haz clic en un repuesto para sumarlo al presupuesto
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Buscar pantalla por modelo (ej. iPhone 13, A54, Redmi) o repuesto en stock (ej. Batería, SSD, Pin)..."
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Columna Pantallas */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                  Catálogo de Pantallas
                </span>
                {filteredCatalogResults.screens.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Sin coincidencias en pantallas</p>
                ) : (
                  filteredCatalogResults.screens.map(scr => (
                    <button
                      key={`scr_${scr.id}`}
                      type="button"
                      onClick={() => handleAddCatalogScreen(scr)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/40 text-xs transition-all cursor-pointer text-left"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-200 block truncate">{scr.brand} {scr.model}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">{scr.quality || 'Original'}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-400 shrink-0">
                        +${Number(scr.sale_price || 0).toLocaleString('es-CL')}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Columna Inventario */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block">
                  Inventario & Repuestos en Stock
                </span>
                {filteredCatalogResults.parts.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Sin coincidencias en inventario</p>
                ) : (
                  filteredCatalogResults.parts.map(inv => {
                    const price = Number(inv.sale_price || 0) > 0 ? Number(inv.sale_price) : Number(inv.cost_price || 0)
                    return (
                      <button
                        key={`inv_${inv.id}`}
                        type="button"
                        onClick={() => handleAddCatalogInventory(inv)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/40 text-xs transition-all cursor-pointer text-left"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-200 block truncate">{inv.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Stock: {inv.stock} · {inv.category}</span>
                        </div>
                        <span className="font-mono font-black text-emerald-400 shrink-0">
                          +${price.toLocaleString('es-CL')}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Device selection tabs */}
          <div className="flex border-b border-gray-900 gap-1 overflow-x-auto">
            {Object.entries(diagnostics).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleDeviceChange(key)}
                className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  deviceType === key 
                    ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-500/5'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {value.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Checkboxes for issues */}
            <div className="text-left">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Servicios Estándar de Laboratorio</h4>
              <div className="space-y-2">
                {currentDevice.issues.map((issue) => {
                  const checked = selectedIssues.some(i => i.id === issue.id)
                  const isCustom = issue.id.toString().startsWith('custom_')
                  return (
                    <div
                      key={issue.id}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        checked 
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                          : 'bg-gray-900/30 border-gray-800/40 text-gray-400 hover:border-gray-800'
                      }`}
                    >
                      <button
                        onClick={() => toggleIssue(issue)}
                        className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center border text-[9px] shrink-0 ${
                          checked ? 'bg-cyan-400 border-cyan-400 text-black font-black' : 'border-gray-700'
                        }`}>
                          {checked && '✓'}
                        </span>
                        <span className="text-xs truncate">{issue.name}</span>
                      </button>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-gray-300 font-mono">${issue.cost.toLocaleString('es-CL')}</span>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteService(issue.id)}
                            className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors cursor-pointer ml-1"
                            title="Eliminar servicio personalizado"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Form to add custom service */}
              <div className="mt-4">
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-800 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <span>➕ Agregar Falla / Servicio Personalizado</span>
                  </button>
                ) : (
                  <form onSubmit={handleAddService} className="bg-gray-900/30 border border-gray-800 p-4 rounded-xl space-y-3">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nuevo Servicio ({currentDevice.label})</h5>
                    
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-gray-500 text-[10px] mb-1">Nombre del Servicio:</label>
                        <input
                          type="text"
                          required
                          value={newServiceName}
                          onChange={e => setNewServiceName(e.target.value)}
                          placeholder="Ej. Cambio de Parlante / Sensor"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-500 text-[10px] mb-1">Costo Estimado ($):</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={newServiceCost}
                            onChange={e => setNewServiceCost(e.target.value)}
                            placeholder="Ej. 25000"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyan-500/50 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[10px] mb-1">Tiempo (Horas):</label>
                          <input
                            type="number"
                            required
                            min="0.1"
                            step="0.1"
                            value={newServiceTime}
                            onChange={e => setNewServiceTime(e.target.value)}
                            placeholder="Ej. 1.5"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-700 focus:outline-none focus:border-cyan-500/50 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 text-xs pt-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 py-2 rounded-lg border border-gray-800 text-gray-500 hover:text-gray-300 transition-colors font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-lg bg-cyan-400 text-black font-bold hover:bg-cyan-300 transition-colors cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right side: Complexity & Budget summary */}
            <div className="space-y-6 text-left">
              {/* Complexity Selector */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Nivel de Dificultad Técnica</h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.entries(complexityMultipliers).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setComplexity(key)}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold capitalize transition-all cursor-pointer ${
                        complexity === key
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                          : 'bg-gray-900/30 border-gray-800/40 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {key === 'easy' ? 'Baja' : key === 'medium' ? 'Media' : 'Alta'}
                      <span className="block text-[9px] text-gray-400 mt-0.5">{val.val}x</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Items Breakdown */}
              {selectedIssues.length > 0 && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                    Ítems Incluidos ({selectedIssues.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedIssues.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800/80">
                        <span className="text-slate-200 truncate pr-2">{item.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-emerald-400">${item.cost.toLocaleString('es-CL')}</span>
                          <button
                            type="button"
                            onClick={() => toggleIssue(item)}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget summary */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pb-2.5 border-b border-gray-800">Cálculo de Cotización</h4>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Subtotal Servicios & Repuestos</span>
                  <span className="font-semibold text-gray-200 font-mono">${subtotal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Multiplicador por Complejidad</span>
                  <span className="font-semibold text-cyan-400 font-mono">{laborMultiplier}x</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-800/50">
                  <span className="text-gray-400">Tiempo de Servicio Est.</span>
                  <span className="font-semibold text-gray-200 flex items-center gap-1"><Clock size={12} /> {totalHours} hrs</span>
                </div>
                
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-sm font-bold text-white">Total Recomendado</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">${totalCost.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Generated description / Copy Area */}
          <div className="pt-6 border-t border-gray-900 space-y-3 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acciones con esta Cotización</h4>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={selectedIssues.length === 0}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedIssues.length === 0
                      ? 'text-gray-700 bg-gray-950/40 border border-gray-900 cursor-not-allowed'
                      : copied
                      ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-500/30'
                      : 'text-slate-300 bg-slate-900 border border-slate-700 hover:text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={12} /> Copiado
                    </>
                  ) : (
                    <>
                      <ClipboardList size={12} /> Copiar Texto
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={selectedIssues.length === 0}
                  onClick={() =>
                    printQuickQuotePDF({
                      clientName: quoteClientName,
                      deviceLabel: currentDevice.label,
                      brandModel: `${quoteBrand} ${quoteModel}`.trim(),
                      issues: selectedIssues,
                      difficultyLabel: complexityMultipliers[complexity].label,
                      totalCost,
                      totalHours
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 cursor-pointer disabled:opacity-40"
                >
                  <Printer size={13} /> Imprimir Cotización PDF
                </button>

                <button
                  type="button"
                  disabled={selectedIssues.length === 0}
                  onClick={() =>
                    orderId ? navigate('/repairs/' + orderId, { state: { estimateDraft: { description: summaryText, amount: totalCost } } }) : navigate('/repairs/new', {
                      state: {
                        diagnosticDraft: {
                          device_type: deviceType,
                          brand: quoteBrand,
                          model: quoteModel,
                          reported_issue: selectedIssues.map(i => i.name).join(', '),
                          repair_cost: totalCost,
                        },
                      },
                    })
                  }
                  className="nova-cta flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-40"
                >
                  <Plus size={13} /> {orderId ? 'Usar presupuesto en la orden' : 'Crear Orden con este Diagnóstico'}
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-950/80 border border-gray-900/60 p-4 rounded-xl min-h-12 flex items-center text-xs text-gray-400 font-mono break-all select-all leading-relaxed">
              {selectedIssues.length > 0 ? summaryText : 'Selecciona servicios o repuestos del catálogo para generar el presupuesto.'}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
