import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Clock, Check, X, ShieldAlert, Trash2 } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'

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
      { id: 'board', name: 'Rebaling / Soldadura chip', cost: 75000, time: 4.0 },
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

export default function DiagnosticAssistantPage() {
  const navigate = useNavigate()
  const [deviceType, setDeviceType] = useState('phone')
  const [selectedIssues, setSelectedIssues] = useState([])
  const [complexity, setComplexity] = useState('easy')
  const [copied, setCopied] = useState(false)

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

    // Reset fields
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
    
    // Remove from selection if deleted
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

  const summaryText = `[${currentDevice.label}] - ` + 
    (selectedIssues.length > 0 ? selectedIssues.map(i => i.name).join(', ') : 'Ninguna falla seleccionada') +
    ` | Dificultad: ${complexityMultipliers[complexity].label} | Presupuesto recomendado: $${totalCost.toLocaleString('es-CL')} | Tiempo estimado: ${totalHours} hrs.`

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-gray-950/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <ClipboardList size={16} />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-bold tracking-widest text-gray-300 uppercase leading-none">
                  Cotizador Rápido
                </h1>
                <p className="text-gray-650 text-[9px] uppercase tracking-wider mt-0.5">Asistente de Diagnóstico</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 w-full flex-1 space-y-6">
        
        <div className="bg-gray-950/60 border border-gray-800/60 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
          {/* Device selection tabs */}
          <div className="flex border-b border-gray-900 mb-6 gap-1 overflow-x-auto">
            {Object.entries(diagnostics).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleDeviceChange(key)}
                className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  deviceType === key 
                    ? 'border-yellow-500 text-yellow-400 font-bold bg-yellow-500/5'
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
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Selecciona las Fallas</h4>
              <div className="space-y-2">
                {currentDevice.issues.map((issue) => {
                  const checked = selectedIssues.some(i => i.id === issue.id)
                  const isCustom = issue.id.toString().startsWith('custom_')
                  return (
                    <div
                      key={issue.id}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        checked 
                          ? 'bg-yellow-500/5 border-yellow-500/35 text-white'
                          : 'bg-gray-900/30 border-gray-800/40 text-gray-400 hover:border-gray-800'
                      }`}
                    >
                      <button
                        onClick={() => toggleIssue(issue)}
                        className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center border text-[9px] shrink-0 ${
                          checked ? 'bg-yellow-500 border-yellow-500 text-black' : 'border-gray-700'
                        }`}>
                          {checked && '✓'}
                        </span>
                        <span className="text-xs truncate">{issue.name}</span>
                      </button>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-gray-350 font-mono">${issue.cost.toLocaleString('es-CL')}</span>
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
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-800 text-gray-500 hover:text-yellow-400 hover:border-yellow-500/50 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <span>➕ Agregar Falla/Servicio</span>
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
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-500/50"
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
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-500/50 font-mono"
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
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-700 focus:outline-none focus:border-yellow-500/50 font-mono"
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
                        className="flex-1 py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-450 transition-colors cursor-pointer"
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
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Nivel de Dificultad</h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.entries(complexityMultipliers).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setComplexity(key)}
                      className={`p-3 rounded-xl border text-center text-xs font-semibold capitalize transition-all cursor-pointer ${
                        complexity === key
                          ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                          : 'bg-gray-900/30 border-gray-800/40 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {key === 'easy' ? 'Baja' : key === 'medium' ? 'Media' : 'Alta'}
                      <span className="block text-[8px] text-gray-550 mt-0.5">{val.val}x</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget summary */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pb-2.5 border-b border-gray-800">Cálculo de Cotización</h4>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-550">Mano de Obra & Repuestos</span>
                  <span className="font-semibold text-gray-300 font-mono">${subtotal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-550">Multiplicador por Dificultad</span>
                  <span className="font-semibold text-yellow-500 font-mono">{laborMultiplier}x</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-800/50">
                  <span className="text-gray-550">Tiempo de Servicio Est.</span>
                  <span className="font-semibold text-gray-300 flex items-center gap-1"><Clock size={12} /> {totalHours} hrs</span>
                </div>
                
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-sm font-bold text-white">Total Recomendado</span>
                  <span className="text-xl font-black text-yellow-400 font-mono">${totalCost.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Generated description / Copy Area */}
          <div className="mt-8 pt-6 border-t border-gray-900 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resumen del Diagnóstico</h4>
              <button
                onClick={handleCopy}
                disabled={selectedIssues.length === 0}
                className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedIssues.length === 0
                    ? 'text-gray-700 bg-gray-950/40 border border-gray-900 cursor-not-allowed'
                    : copied
                    ? 'text-green-400 bg-green-950/20 border border-green-500/30'
                    : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/15'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={12} /> Copiado
                  </>
                ) : (
                  <>
                    <ClipboardList size={12} /> Copiar al portapapeles
                  </>
                )}
              </button>
            </div>
            <div className="w-full bg-gray-950/80 border border-gray-900/60 p-4 rounded-xl min-h-12 flex items-center text-xs text-gray-400 font-mono break-all select-all leading-relaxed">
              {selectedIssues.length > 0 ? summaryText : 'Selecciona una o más fallas para generar el resumen.'}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
