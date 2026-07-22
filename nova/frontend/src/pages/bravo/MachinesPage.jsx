import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, Wrench, Plus, X, Trash2, AlertTriangle, CheckCircle, HelpCircle, ArrowRight,
  LayoutGrid, BarChart2, Eye, Info, Play, ClipboardList
} from 'lucide-react'
import { getMachines, createMachine, updateMachine, reserveMachine, deleteReservation } from '../../api/bravoBlueprint'
import { getRepairs } from '../../api/repairs'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 08:00 a 20:00

export default function MachinesPage() {
  const [machines, setMachines] = useState([])
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // View Switcher: 'timeline' (grilla horaria) o 'operative' (lista agrupada amigable)
  const [viewMode, setViewMode] = useState('operative')

  // Modals / Forms
  const [showAddMachine, setShowAddMachine] = useState(false)
  const [showReserve, setShowReserve] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const [hoveredRes, setHoveredRes] = useState(null)
  
  const [newMachine, setNewMachine] = useState({ name: '', type: 'sublimation' })
  const [isCustomType, setIsCustomType] = useState(false)
  const [customTypeVal, setCustomTypeVal] = useState('')
  const [newRes, setNewRes] = useState({
    machine_id: '',
    order_id: '',
    date: new Date().toISOString().split('T')[0],
    start_hour: '8',
    end_hour: '9'
  })

  const [selectedMachine, setSelectedMachine] = useState(null)
  const [maintenanceForm, setMaintenanceForm] = useState({
    status: 'active',
    last_maintenance_date: '',
    maintenance_comments: '',
    maintenance_incidents: '',
    needs_supplies: false
  })

  const handleOpenMaintenance = (machine) => {
    setSelectedMachine(machine)
    setMaintenanceForm({
      status: machine.status || 'active',
      last_maintenance_date: machine.last_maintenance_date ? new Date(machine.last_maintenance_date).toISOString().split('T')[0] : '',
      maintenance_comments: machine.maintenance_comments || '',
      maintenance_incidents: machine.maintenance_incidents || '',
      needs_supplies: !!machine.needs_supplies
    })
    setShowMaintenance(true)
  }

  const handleUpdateMaintenance = async (e) => {
    e.preventDefault()
    if (!selectedMachine) return
    setError('')
    setSuccess('')
    try {
      const payload = {
        status: maintenanceForm.status,
        last_maintenance_date: maintenanceForm.last_maintenance_date ? new Date(maintenanceForm.last_maintenance_date).toISOString() : null,
        maintenance_comments: maintenanceForm.maintenance_comments || null,
        maintenance_incidents: maintenanceForm.maintenance_incidents || null,
        needs_supplies: maintenanceForm.needs_supplies
      }
      await updateMachine(selectedMachine.id, payload)
      setSuccess('¡Registro de mantenimiento actualizado con éxito!')
      setShowMaintenance(false)
      fetchInitialData()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar el mantenimiento de la maquinaria.')
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      const [macRes, repRes] = await Promise.all([
        getMachines(),
        getRepairs({ system: 'bravo' })
      ])
      setMachines(macRes.data)
      setRepairs(repRes.data.filter(r => !['entregado', 'cancelado'].includes(r.status)))
    } catch (err) {
      console.error(err)
      setError('Error al cargar maquinarias o pedidos.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMachine = async (e) => {
    e.preventDefault()
    if (!newMachine.name) return
    setError('')
    try {
      const typeToSend = isCustomType ? customTypeVal : newMachine.type
      if (!typeToSend) {
        setError('Por favor indica el tipo de maquinaria.')
        return
      }
      await createMachine({ name: newMachine.name, type: typeToSend, status: 'active' })
      setSuccess('¡Máquina registrada correctamente!')
      setNewMachine({ name: '', type: 'sublimation' })
      setCustomTypeVal('')
      setIsCustomType(false)
      setShowAddMachine(false)
      fetchInitialData()
    } catch (err) {
      setError('Error al crear la maquinaria.')
    }
  }

  const handleCreateReservation = async (e) => {
    e.preventDefault()
    if (!newRes.machine_id || !newRes.order_id) {
      setError('Por favor completa todos los campos.')
      return
    }
    setError('')
    setSuccess('')
    try {
      const start = new Date(`${newRes.date}T${newRes.start_hour.padStart(2, '0')}:00:00`)
      const end = new Date(`${newRes.date}T${newRes.end_hour.padStart(2, '0')}:00:00`)
      
      if (end <= start) {
        setError('La hora de término debe ser posterior a la de inicio.')
        return
      }

      await reserveMachine({
        machine_id: parseInt(newRes.machine_id),
        order_id: parseInt(newRes.order_id),
        start_time: start.toISOString(),
        end_time: end.toISOString()
      })

      setSuccess('¡Bloque reservado con éxito!')
      setShowReserve(false)
      fetchInitialData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Conflicto de horario o error en reserva.')
    }
  }

  const handleCancelReservation = async (resId) => {
    if (window.confirm('¿Estás seguro de que deseas cancelar este bloque de reserva de maquinaria?')) {
      try {
        await deleteReservation(resId)
        setSuccess('Reserva cancelada correctamente.')
        fetchInitialData()
      } catch (err) {
        setError('Error al cancelar la reserva.')
      }
    }
  }

  // Helper to render reserved block in timeline
  const getReservationForHour = (machine, hour) => {
    return machine.reservations.find(res => {
      const start = new Date(res.start_time).getHours()
      const end = new Date(res.end_time).getHours()
      return hour >= start && hour < end
    })
  }

  return (
    <div className="p-6 space-y-6 text-bravo-text max-w-7xl mx-auto text-left relative">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-bravo-border pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-bravo-accent tracking-wider flex items-center gap-2.5 uppercase italic">
            <Wrench className="text-bravo-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            Producción & Maquinarias
          </h1>
          <p className="text-xs text-bravo-text-muted mt-1">Supervisa plotters, estampadoras y planchas térmicas, y reserva bloques de tiempo para pedidos.</p>
        </div>

        {/* View Switcher and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Selector de modo de vista */}
          <div className="flex gap-1 bg-[#101018] border border-bravo-border/60 p-1 rounded-xl font-mono">
            <button
              onClick={() => setViewMode('operative')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'operative' ? 'bg-bravo-accent text-black font-extrabold shadow-sm' : 'text-bravo-text-muted hover:text-white'
              }`}
            >
              <LayoutGrid size={11} />
              Operativo
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'timeline' ? 'bg-bravo-accent text-black font-extrabold shadow-sm' : 'text-bravo-text-muted hover:text-white'
              }`}
            >
              <Calendar size={11} />
              Cronograma
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddMachine(true)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-bravo-text font-bold text-xs uppercase rounded-xl transition-all cursor-pointer hover:text-bravo-accent"
            >
              Agregar Máquina
            </button>
            <button
              type="button"
              onClick={() => { setError(''); setSuccess(''); setShowReserve(true); }}
              className="px-4 py-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 text-black bg-bravo-accent hover:bg-amber-600"
            >
              Reservar Bloque
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-455 rounded-xl text-xs flex items-start gap-2.5 shadow-lg">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Alerta Operativa</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-white/5 rounded-lg text-rose-400"><X size={14} /></button>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-450 rounded-xl text-xs flex items-start gap-2.5 shadow-lg">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Operación Completada</span>
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="p-1 hover:bg-white/5 rounded-lg text-emerald-450"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      {loading ? (
        <div className="h-64 flex flex-col gap-3 items-center justify-center text-bravo-accent animate-pulse font-mono text-xs">
          <span className="w-6 h-6 border-2 border-bravo-accent/40 border-t-bravo-accent rounded-full animate-spin" />
          Cargando cronograma del taller...
        </div>
      ) : machines.length === 0 ? (
        <div className="text-center py-20 bg-bravo-card/50 border border-bravo-border rounded-2xl shadow-xl">
          <Wrench size={40} className="mx-auto text-stone-700 mb-3" />
          <p className="text-sm font-bold text-white uppercase tracking-wider">Sin maquinarias registradas</p>
          <p className="text-xs text-bravo-text-muted mt-1.5 max-w-sm mx-auto">Registra planchas térmicas, plotters de corte o impresoras de DTF y DTF UV para controlar los tiempos.</p>
        </div>
      ) : viewMode === 'timeline' ? (
        
        /* MODO DE VISTA 1: CRONOGRAMA HORARIO (TIMELINE GRID) */
        <div className="bg-bravo-card/80 backdrop-blur-sm border border-bravo-border rounded-2xl p-5 shadow-xl overflow-x-auto bravo-scrollbar">
          <div className="min-w-[900px] space-y-4">
            
            {/* Timeline Header (Hours) */}
            <div className="grid grid-cols-15 items-center border-b border-bravo-border/40 pb-2.5 text-center text-[10px] font-mono font-bold text-bravo-text-muted">
              <div className="col-span-2 text-left pl-2">Maquinaria</div>
              {HOURS.map(h => (
                <div key={h}>{String(h).padStart(2, '0')}:00</div>
              ))}
            </div>

            {/* Timeline Rows (Machines) */}
            <div className="space-y-3">
              {machines.map(machine => (
                <div key={machine.id} className="grid grid-cols-15 items-center py-1.5 border-b border-bravo-border/10 last:border-0 hover:bg-white/[0.005]">
                  
                  {/* Machine Name Column */}
                  <div className="col-span-2 text-left pr-2 flex items-start justify-between min-w-0">
                    <div className="min-w-0 pr-1.5">
                      <h4 className="font-extrabold text-xs text-white leading-tight truncate" title={machine.name}>
                        {machine.name}
                      </h4>
                      <span className="text-[9px] uppercase font-mono text-bravo-accent font-bold mt-0.5 block">
                        {machine.type}
                      </span>
                      {/* Badges operativas */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {machine.needs_supplies && (
                          <span className="px-1 py-0.5 rounded text-[7px] font-black uppercase bg-red-950/60 border border-red-500/25 text-rose-400 animate-pulse">
                            Insumos 🚨
                          </span>
                        )}
                        {machine.status === 'maintenance' && (
                          <span className="px-1 py-0.5 rounded text-[7px] font-bold uppercase bg-amber-950/50 border border-amber-500/20 text-amber-400">
                            Mantención 🛠️
                          </span>
                        )}
                        {machine.status === 'inactive' && (
                          <span className="px-1 py-0.5 rounded text-[7px] font-bold uppercase bg-stone-900 border border-stone-800 text-stone-500">
                            Inactiva 🛑
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenMaintenance(machine)}
                      className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-bravo-text-muted hover:text-bravo-accent cursor-pointer shrink-0 transition-all"
                      title="Registrar Mantención / Incidencia"
                    >
                      <Wrench size={10} />
                    </button>
                  </div>

                  {/* Hourly Blocks */}
                  {HOURS.map(hour => {
                    const reservation = getReservationForHour(machine, hour)
                    
                    if (reservation) {
                      const isStart = new Date(reservation.start_time).getHours() === hour
                      
                      return (
                        <div key={hour} className="px-0.5 relative">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            onMouseEnter={() => setHoveredRes(reservation)}
                            onMouseLeave={() => setHoveredRes(null)}
                            onClick={() => handleCancelReservation(reservation.id)}
                            className="h-10 bg-bravo-accent/10 text-bravo-accent border border-bravo-accent/30 rounded-md flex items-center justify-center text-[9px] font-black cursor-pointer overflow-hidden truncate px-1 transition-all shadow-xs hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-500/30"
                            title="Click para cancelar reserva"
                          >
                            {isStart ? `BRV-${reservation.order_id}` : '•'}
                          </motion.div>
                        </div>
                      )
                    }

                    return (
                      <div key={hour} className="h-10 border border-dashed border-zinc-800 rounded-md bg-zinc-950/20 m-0.5 hover:bg-bravo-accent/5 transition-colors" />
                    )
                  })}

                </div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        
        /* MODO DE VISTA 2: LISTA OPERATIVA COMPACTA (SÚPER AMIGABLE) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map(machine => {
            const isMaintenance = machine.status === 'maintenance'
            const isInactive = machine.status === 'inactive'
            
            // Ordenar las reservas cronológicamente
            const activeRes = [...machine.reservations].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

            return (
              <div 
                key={machine.id} 
                className={`bg-bravo-card border rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[300px] transition-all hover:shadow-2xl ${
                  isInactive 
                    ? 'border-rose-500/20 bg-rose-950/[0.02]' 
                    : isMaintenance 
                      ? 'border-amber-500/20 bg-amber-950/[0.02]' 
                      : 'border-bravo-border/60 hover:border-bravo-accent/30'
                }`}
              >
                <div>
                  
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex justify-between items-start border-b border-bravo-border/20 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-white capitalize leading-tight flex items-center gap-1.5">
                        {machine.name}
                        {machine.needs_supplies && (
                          <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-rose-950/60 border border-rose-500/30 text-rose-400 animate-pulse">Insumos 🚨</span>
                        )}
                      </h3>
                      <span className="text-[9px] font-mono uppercase text-bravo-accent font-semibold block mt-0.5">{machine.type}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                        machine.status === 'active' 
                          ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-450' 
                          : isMaintenance 
                            ? 'bg-amber-950/40 border-amber-500/20 text-amber-400' 
                            : 'bg-rose-950/40 border-rose-500/20 text-rose-400 animate-pulse'
                      }`}>
                        {machine.status === 'active' ? 'Operativa' : isMaintenance ? 'En Mantención' : 'Inactiva'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenMaintenance(machine)}
                        className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-bravo-accent/40 text-stone-400 hover:text-bravo-accent cursor-pointer transition-all"
                        title="Registrar Mantención"
                      >
                        <Wrench size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Detalle Operativo de Reservas */}
                  <div className="mt-4 space-y-3">
                    <span className="text-[8px] font-mono text-bravo-accent uppercase font-bold tracking-widest block">Reservas Agendadas Hoy:</span>
                    
                    {activeRes.length === 0 ? (
                      <div className="text-center py-8 text-stone-500 text-xs italic bg-zinc-950/20 rounded-xl border border-dashed border-zinc-900">
                        Sin trabajos agendados para hoy
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-0.5 bravo-scrollbar">
                        {activeRes.map(res => {
                          const startStr = new Date(res.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                          const endStr = new Date(res.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <div 
                              key={res.id}
                              className="p-2.5 bg-[#101017] border border-bravo-border/30 rounded-xl flex justify-between items-center text-xs hover:border-rose-500/25 group transition-colors"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-bravo-accent text-[10px]">BRV-{res.order_id}</span>
                                  <span className="text-[9px] bg-zinc-900 px-1 py-0.5 rounded text-zinc-500 font-mono font-bold">{startStr} - {endStr}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelReservation(res.id)}
                                className="p-1 bg-rose-950/15 border border-rose-500/10 text-stone-500 hover:text-rose-400 rounded-lg hover:border-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Cancelar Reserva de Bloque"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Pie de Tarjeta - Historial de Mantenimiento Rápido */}
                <div className="mt-4 border-t border-bravo-border/20 pt-3 flex justify-between items-center text-[10px]">
                  <span className="text-bravo-text-muted">
                    Último Mant: <strong className="font-mono text-white font-bold">{machine.last_maintenance_date ? new Date(machine.last_maintenance_date + 'T12:00:00').toLocaleDateString('es-CL') : 'N/A'}</strong>
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleOpenMaintenance(machine)}
                    className="text-bravo-accent hover:text-amber-500 uppercase tracking-widest font-black flex items-center gap-1 font-mono cursor-pointer"
                  >
                    Detalles <ArrowRight size={10} />
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* PANEL RESUMEN DE INCIDENCIAS GENERAL (FOOTER INFO) */}
      <div className="bg-bravo-card/85 backdrop-blur-sm border border-bravo-border/60 p-5 rounded-2xl shadow-xl text-left flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-bravo-accent/10 border border-bravo-accent/30 flex items-center justify-center text-bravo-accent">
            <ClipboardList size={16} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">Bitácoras Operativas</h4>
            <p className="text-[10px] text-bravo-text-muted">Si alguna plancha térmica o plotter presenta fallas, edita su bitácora para alertar al resto de diseñadores.</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <div className="text-center">
            <span className="text-[9px] text-bravo-text-muted uppercase block font-bold">Maquinarias</span>
            <span className="text-sm font-black text-white">{machines.length}</span>
          </div>
          <div className="w-px h-8 bg-bravo-border/20" />
          <div className="text-center">
            <span className="text-[9px] text-rose-455 uppercase block font-bold">Inactivas</span>
            <span className="text-sm font-black text-rose-400">{machines.filter(m => m.status === 'inactive').length}</span>
          </div>
          <div className="w-px h-8 bg-bravo-border/20" />
          <div className="text-center">
            <span className="text-[9px] text-amber-400 uppercase block font-bold">En Mantención</span>
            <span className="text-sm font-black text-amber-400">{machines.filter(m => m.status === 'maintenance').length}</span>
          </div>
        </div>
      </div>

      {/* Hover Tooltip Overlay for active reservation details in timeline */}
      <AnimatePresence>
        {hoveredRes && viewMode === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-6 right-6 bg-bravo-card border border-bravo-border p-4 rounded-xl shadow-xl w-64 text-xs space-y-2 z-50 pointer-events-none text-left"
          >
            <h4 className="font-mono font-bold text-bravo-accent border-b border-bravo-border/20 pb-1">Orden: BRV-{hoveredRes.order_id}</h4>
            <div className="space-y-1 text-bravo-text leading-relaxed">
              <p className="flex justify-between">
                <span className="text-bravo-text-muted">Inicio:</span>
                <span className="font-mono">{new Date(hoveredRes.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-bravo-text-muted">Término:</span>
                <span className="font-mono">{new Date(hoveredRes.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              <div className="mt-2 py-1.5 bg-rose-950/20 border border-rose-500/20 text-rose-400 rounded-lg text-[9px] text-center font-bold font-mono">
                Click para cancelar esta reserva
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD MACHINE */}
      <AnimatePresence>
        {showAddMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setShowAddMachine(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-sm shadow-2xl relative space-y-4 text-left font-sans"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border/30 pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider font-mono">Registrar Maquinaria</h3>
                <button type="button" onClick={() => setShowAddMachine(false)} className="p-1 hover:bg-white/5 text-bravo-text-muted hover:text-white rounded"><X size={15} /></button>
              </div>

              <form onSubmit={handleCreateMachine} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Nombre Maquinaria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Impresora DTF UV"
                    value={newMachine.name}
                    onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Tipo / Proceso</label>
                  <select
                    value={isCustomType ? 'otro' : newMachine.type}
                    onChange={e => {
                      if (e.target.value === 'otro') {
                        setIsCustomType(true)
                      } else {
                        setIsCustomType(false)
                        setNewMachine({ ...newMachine, type: e.target.value })
                      }
                    }}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="sublimation">Sublimación</option>
                    <option value="dtf_uv">DTF UV</option>
                    <option value="vinyl">Vinilo Textil</option>
                    <option value="dtf">DTF (Direct to Film)</option>
                    <option value="otro">Otro / Personalizado...</option>
                  </select>
                </div>

                {isCustomType && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Especifica el Tipo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Impresora UV, Láser CO2"
                      value={customTypeVal}
                      onChange={e => setCustomTypeVal(e.target.value)}
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20"
                >
                  Guardar Maquinaria
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RESERVE BLOCK */}
      <AnimatePresence>
        {showReserve && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setShowReserve(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4 text-left font-sans"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border/30 pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider font-mono">Reservar Bloque Horario</h3>
                <button type="button" onClick={() => setShowReserve(false)} className="p-1 hover:bg-white/5 text-bravo-text-muted hover:text-white rounded"><X size={15} /></button>
              </div>

              <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Maquinaria *</label>
                  <select
                    required
                    value={newRes.machine_id}
                    onChange={e => setNewRes({ ...newRes, machine_id: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2.5 text-white focus:outline-none"
                  >
                    <option value="" disabled>-- Seleccionar máquina --</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Orden del Taller *</label>
                  <select
                    required
                    value={newRes.order_id}
                    onChange={e => setNewRes({ ...newRes, order_id: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2.5 text-white focus:outline-none"
                  >
                    <option value="" disabled>-- Seleccionar pedido activo --</option>
                    {repairs.map(r => <option key={r.id} value={r.id}>{r.order_number} - {r.client?.name} ({r.device_type})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Fecha</label>
                    <input
                      type="date"
                      value={newRes.date}
                      onChange={e => setNewRes({ ...newRes, date: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-2 text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Desde (Hora)</label>
                    <select
                      value={newRes.start_hour}
                      onChange={e => setNewRes({ ...newRes, start_hour: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2 text-white focus:outline-none"
                    >
                      {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Hasta (Hora)</label>
                    <select
                      value={newRes.end_hour}
                      onChange={e => setNewRes({ ...newRes, end_hour: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2 text-white focus:outline-none"
                    >
                      {HOURS.slice(1).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20"
                >
                  Registrar Reserva
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REGISTER MAINTENANCE */}
      <AnimatePresence>
        {showMaintenance && selectedMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => { setShowMaintenance(false); setSelectedMachine(null); }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4 text-left font-sans"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border/30 pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Wrench size={16} />
                  Mantenimiento: {selectedMachine.name}
                </h3>
                <button type="button" onClick={() => { setShowMaintenance(false); setSelectedMachine(null); }} className="p-1 hover:bg-white/5 text-bravo-text-muted hover:text-white rounded"><X size={15} /></button>
              </div>

              <form onSubmit={handleUpdateMaintenance} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Estado Operativo</label>
                    <select
                      value={maintenanceForm.status}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-2 px-2 text-white focus:outline-none focus:border-bravo-accent/50"
                    >
                      <option value="active">Activa / Operativa</option>
                      <option value="maintenance">En Mantenimiento</option>
                      <option value="inactive">Inactiva / Fuera de Servicio</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Última Mantención</label>
                    <input
                      type="date"
                      value={maintenanceForm.last_maintenance_date}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, last_maintenance_date: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-2 text-white focus:outline-none focus:border-bravo-accent/50 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Comentarios de Mantención</label>
                  <textarea
                    placeholder="Detalles sobre filtros, calibración, lubricación, etc."
                    value={maintenanceForm.maintenance_comments}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenance_comments: e.target.value })}
                    rows={3}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-white placeholder-stone-500 focus:outline-none focus:border-bravo-accent/50 resize-none font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Incidencias o Fallas</label>
                  <textarea
                    placeholder="Reporte de problemas ocurridos o piezas defectuosas."
                    value={maintenanceForm.maintenance_incidents}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenance_incidents: e.target.value })}
                    rows={3}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-white placeholder-stone-500 focus:outline-none focus:border-bravo-accent/50 resize-none font-sans"
                  />
                </div>

                <div className="bg-[#101017] border border-bravo-border/40 p-3 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintenanceForm.needs_supplies}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, needs_supplies: e.target.checked })}
                      className="w-4 h-4 rounded text-bravo-accent border-bravo-border bg-bravo-input focus:ring-0 accent-amber-500"
                    />
                    <div className="text-left">
                      <p className="font-extrabold text-white leading-none">Requiere Reposición de Insumos</p>
                      <p className="text-[8px] text-bravo-text-muted mt-1 font-sans">Marcar si la máquina necesita tinta, papel, hilo u otros repuestos esenciales.</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowMaintenance(false); setSelectedMachine(null); }}
                    className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-stone-700 text-stone-400 hover:text-white font-bold uppercase rounded-xl transition-all text-center cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 font-black uppercase rounded-xl transition-all text-center cursor-pointer shadow-lg shadow-bravo-glow/20 text-black bg-bravo-accent hover:bg-amber-600"
                  >
                    Guardar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
