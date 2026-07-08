import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, Wrench, Plus, X, Trash2, AlertTriangle, CheckCircle, HelpCircle, ArrowRight
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
    if (window.confirm('¿Estás seguro de que deseas cancelar este bloque de reserva?')) {
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
          <h1 className="text-2xl font-black text-bravo-accent tracking-wider flex items-center gap-2 uppercase">
            <Wrench className="text-bravo-accent" />
            Calendario de Maquinarias
          </h1>
          <p className="text-xs text-bravo-text-muted mt-1">Supervisa y reserva bloques de producción para evitar cuellos de botella en el taller.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddMachine(true)}
            className="px-4 py-2 bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 text-bravo-text font-bold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-sm hover:text-bravo-accent"
          >
            Agregar Máquina
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setError(''); setSuccess(''); setShowReserve(true); }}
            className="px-4 py-2 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-bravo-glow text-black"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          >
            Reservar Bloque
          </motion.button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* TIMELINE GRID CONTAINER */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-bravo-accent animate-pulse font-mono text-xs">Cargando cronograma del taller...</div>
      ) : machines.length === 0 ? (
        <div className="text-center py-16 bg-bravo-card/50 border border-bravo-border rounded-2xl">
          <Wrench size={36} className="mx-auto text-stone-600 mb-3" />
          <p className="text-sm font-bold text-bravo-text">Sin maquinarias registradas</p>
          <p className="text-xs text-bravo-text-muted mt-1">Registra planchas térmicas, bordadoras, plotters o impresoras de DTF.</p>
        </div>
      ) : (
        <div className="bg-bravo-card/80 backdrop-blur-sm border border-bravo-border rounded-2xl p-5 shadow-xl overflow-x-auto bravo-scrollbar">
          <div className="min-w-[800px] space-y-4">
            
            {/* Timeline Header (Hours) */}
            <div className="grid grid-cols-14 items-center border-b border-bravo-border/40 pb-2 text-center text-[10px] font-mono font-bold text-bravo-text-muted">
              <div className="col-span-2 text-left pl-2">Maquinaria</div>
              {HOURS.map(h => (
                <div key={h}>{String(h).padStart(2, '0')}:00</div>
              ))}
            </div>

            {/* Timeline Rows (Machines) */}
            <div className="space-y-3.5">
              {machines.map(machine => (
                <div key={machine.id} className="grid grid-cols-14 items-center py-1 border-b border-bravo-border/20 last:border-0">
                  
                  {/* Machine Name Column */}
                  <div className="col-span-2 text-left pr-2 flex items-start justify-between min-w-0">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-bravo-text leading-tight truncate" title={machine.name}>
                        {machine.name}
                      </h4>
                      <span className="text-[9px] uppercase font-mono text-bravo-accent font-bold mt-0.5 block">
                        {machine.type}
                      </span>
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {machine.needs_supplies && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 border border-red-500/25 text-red-500 animate-pulse">
                            Insumos 🚨
                          </span>
                        )}
                        {machine.status === 'maintenance' && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            Mantención 🛠️
                          </span>
                        )}
                        {machine.status === 'inactive' && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-stone-500/10 border border-stone-500/20 text-stone-500">
                            Inactiva 🛑
                          </span>
                        )}
                      </div>
                      {/* Last Maintenance Date info */}
                      {machine.last_maintenance_date && (
                        <p className="text-[8px] text-bravo-text-muted mt-1 leading-none">
                          Mant: {new Date(machine.last_maintenance_date).toLocaleDateString('es-CL')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenMaintenance(machine)}
                      className="p-1.5 rounded-lg bg-bravo-input border border-bravo-border/40 hover:border-bravo-accent/40 text-bravo-text-muted hover:text-bravo-accent cursor-pointer shrink-0 transition-all"
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
                            whileHover={{ scale: 1.01 }}
                            onMouseEnter={() => setHoveredRes(reservation)}
                            onMouseLeave={() => setHoveredRes(null)}
                            className="h-10 bg-bravo-accent/10 text-bravo-accent border border-bravo-accent/25 rounded-md flex items-center justify-center text-[9px] font-bold cursor-pointer overflow-hidden truncate px-1 transition-all shadow-sm shadow-bravo-glow/10"
                          >
                            {isStart ? `BRV-${reservation.order_id}` : ''}
                          </motion.div>
                        </div>
                      )
                    }

                    return (
                      <div key={hour} className="h-10 border border-dashed border-bravo-border/30 rounded-md bg-bravo-input/30 m-0.5 hover:bg-bravo-accent/5 transition-colors" />
                    )
                  })}

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* PANEL DE MANTENIMIENTO Y CONTROL DE INCIDENCIAS */}
      <div className="bg-bravo-card/80 backdrop-blur-sm border border-bravo-border rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-bravo-border/40 pb-2.5">
          <h3 className="text-sm font-black text-bravo-text uppercase tracking-widest flex items-center gap-2">
            <Wrench size={16} className="text-bravo-accent animate-pulse" />
            Panel de Control de Mantenimiento & Incidencias
          </h3>
          <span className="text-[10px] font-mono text-bravo-text-muted font-bold">
            {machines.filter(m => m.status === 'maintenance' || m.status === 'inactive' || m.needs_supplies).length} alertas operativas activas
          </span>
        </div>

        {machines.length === 0 ? (
          <p className="text-xs text-bravo-text-muted italic">Registra maquinarias para supervisar su estado operativo.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map(m => {
              const isMaintenance = m.status === 'maintenance'
              const isInactive = m.status === 'inactive'
              return (
                <div 
                  key={m.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    isInactive
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : isMaintenance
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : m.needs_supplies
                          ? 'bg-orange-950/20 border-orange-500/30'
                          : 'bg-bravo-input border-bravo-border/60 hover:border-bravo-accent/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-xs text-bravo-text flex items-center gap-1.5 capitalize">
                        {m.name}
                        {m.needs_supplies && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-950/60 border border-rose-500/40 text-rose-400 animate-pulse">Insumos 🚨</span>
                        )}
                      </h4>
                      <span className="text-[9px] font-mono uppercase text-bravo-accent font-semibold block mt-0.5">{m.type}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      m.status === 'active' 
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' 
                        : isMaintenance
                          ? 'bg-amber-950/50 border border-amber-500/35 text-amber-400 font-extrabold'
                          : 'bg-rose-950/60 border border-rose-500/45 text-rose-400 font-extrabold animate-pulse'
                    }`}>
                      {m.status === 'active' ? 'Operativa' : isMaintenance ? 'En Mantención' : 'Inactiva'}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2 text-[11px] border-t border-bravo-border/20 pt-2.5">
                    <div className="flex justify-between text-bravo-text-muted">
                      <span>Último Mantenimiento:</span>
                      <span className="font-mono text-bravo-text font-bold">
                        {m.last_maintenance_date ? new Date(m.last_maintenance_date + 'T12:00:00').toLocaleDateString('es-CL') : 'Sin registro'}
                      </span>
                    </div>

                    {m.maintenance_comments && (
                      <div className="bg-bravo-bg/50 border border-bravo-border/10 p-2 rounded-lg mt-1 text-left">
                        <span className="text-[9px] uppercase font-bold text-bravo-accent block mb-0.5">Reporte Técnico:</span>
                        <p className="text-bravo-text-muted italic leading-normal">"{m.maintenance_comments}"</p>
                      </div>
                    )}

                    {m.maintenance_incidents && (
                      <div className="bg-rose-950/10 border border-rose-500/10 p-2 rounded-lg mt-1 text-left">
                        <span className="text-[9px] uppercase font-bold text-rose-400 block mb-0.5">Incidencias / Fallas:</span>
                        <p className="text-rose-350 italic leading-normal">"{m.maintenance_incidents}"</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleOpenMaintenance(m)}
                      className="px-2.5 py-1 bg-bravo-bg border border-bravo-border/50 hover:border-bravo-accent/40 text-bravo-text-muted hover:text-bravo-accent rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Wrench size={10} />
                      Bitácora
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hover Tooltip Overlay for active reservation details */}
      <AnimatePresence>
        {hoveredRes && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-6 right-6 bg-bravo-card border border-bravo-border p-4 rounded-xl shadow-xl w-64 text-xs space-y-2 z-50 pointer-events-none"
          >
            <h4 className="font-mono font-bold text-bravo-accent border-b border-bravo-border pb-1">Orden Reservada: BRV-{hoveredRes.order_id}</h4>
            <div className="space-y-1 text-bravo-text">
              <p className="flex justify-between">
                <span className="text-bravo-text-muted">Inicio:</span>
                <span className="font-mono">{new Date(hoveredRes.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-bravo-text-muted">Término:</span>
                <span className="font-mono">{new Date(hoveredRes.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              <button
                type="button"
                className="w-full mt-2 py-1 bg-rose-950/40 text-rose-400 text-[10px] uppercase font-bold rounded-lg border border-rose-500/20 text-center"
              >
                Cancelar reserva (click fila)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD MACHINE */}
      <AnimatePresence>
        {showAddMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowAddMachine(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-sm shadow-2xl relative space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider">Registrar Maquinaria</h3>
                <button onClick={() => setShowAddMachine(false)} className="p-1 hover:bg-bravo-sidebar rounded"><X size={15} /></button>
              </div>

              <form onSubmit={handleCreateMachine} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Nombre Maquinaria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Bordadora Industrial Janome"
                    value={newMachine.name}
                    onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  />
                </div>

                <div className="space-y-1">
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
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="sublimation">Sublimación</option>
                    <option value="embroidery">Bordado</option>
                    <option value="vinyl">Vinilo Textil</option>
                    <option value="dtf">DTF (Direct to Film)</option>
                    <option value="otro">Otro / Personalizado...</option>
                  </select>
                </div>

                {isCustomType && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Especifica el Tipo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Impresora UV, Láser CO2"
                      value={customTypeVal}
                      onChange={e => setCustomTypeVal(e.target.value)}
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowReserve(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider">Reservar Bloque Horario</h3>
                <button onClick={() => setShowReserve(false)} className="p-1 hover:bg-bravo-sidebar rounded"><X size={15} /></button>
              </div>

              <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Maquinaria *</label>
                  <select
                    required
                    value={newRes.machine_id}
                    onChange={e => setNewRes({ ...newRes, machine_id: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-bravo-text focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="">-- Seleccionar máquina --</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Orden del Taller *</label>
                  <select
                    required
                    value={newRes.order_id}
                    onChange={e => setNewRes({ ...newRes, order_id: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-bravo-text focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="">-- Seleccionar pedido activo --</option>
                    {repairs.map(r => <option key={r.id} value={r.id}>{r.order_number} - {r.client?.name} ({r.device_type})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Fecha</label>
                    <input
                      type="date"
                      value={newRes.date}
                      onChange={e => setNewRes({ ...newRes, date: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 px-2.5 text-bravo-text focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Desde (Hora)</label>
                    <select
                      value={newRes.start_hour}
                      onChange={e => setNewRes({ ...newRes, start_hour: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-bravo-text focus:outline-none"
                    >
                      {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Hasta (Hora)</label>
                    <select
                      value={newRes.end_hour}
                      onChange={e => setNewRes({ ...newRes, end_hour: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-bravo-text focus:outline-none"
                    >
                      {HOURS.slice(1).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => { setShowMaintenance(false); setSelectedMachine(null); }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <h3 className="font-bold text-sm text-bravo-accent uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={16} />
                  Mantenimiento: {selectedMachine.name}
                </h3>
                <button onClick={() => { setShowMaintenance(false); setSelectedMachine(null); }} className="p-1 hover:bg-bravo-sidebar rounded"><X size={15} /></button>
              </div>

              <form onSubmit={handleUpdateMaintenance} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Estado Operativo</label>
                    <select
                      value={maintenanceForm.status}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-bravo-text focus:outline-none focus:border-bravo-accent/50"
                    >
                      <option value="active">Activa / Operativa</option>
                      <option value="maintenance">En Mantenimiento</option>
                      <option value="inactive">Inactiva / Fuera de Servicio</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Última Mantención</label>
                    <input
                      type="date"
                      value={maintenanceForm.last_maintenance_date}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, last_maintenance_date: e.target.value })}
                      className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1 px-2 text-bravo-text focus:outline-none focus:border-bravo-accent/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Comentarios de Mantención</label>
                  <textarea
                    placeholder="Detalles sobre filtros, calibración, lubricación, etc."
                    value={maintenanceForm.maintenance_comments}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenance_comments: e.target.value })}
                    rows={3}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-bravo-text placeholder-stone-500 focus:outline-none focus:border-bravo-accent/50 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Incidencias o Fallas</label>
                  <textarea
                    placeholder="Reporte de problemas ocurridos o piezas defectuosas."
                    value={maintenanceForm.maintenance_incidents}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, maintenance_incidents: e.target.value })}
                    rows={3}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-bravo-text placeholder-stone-500 focus:outline-none focus:border-bravo-accent/50 resize-none"
                  />
                </div>

                <div className="bg-bravo-input border border-bravo-border p-3 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintenanceForm.needs_supplies}
                      onChange={e => setMaintenanceForm({ ...maintenanceForm, needs_supplies: e.target.checked })}
                      className="w-4 h-4 rounded text-bravo-accent border-bravo-border bg-bravo-input focus:ring-0 accent-amber-500"
                    />
                    <div className="text-left">
                      <p className="font-extrabold text-bravo-text leading-none">Requiere Reposición de Insumos</p>
                      <p className="text-[8px] text-bravo-text-muted mt-1">Marcar si la máquina necesita tinta, papel, hilo u otros repuestos esenciales.</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowMaintenance(false); setSelectedMachine(null); }}
                    className="flex-1 py-2 bg-bravo-input border border-bravo-border hover:border-bravo-accent/30 text-bravo-text-muted hover:text-bravo-text font-bold uppercase rounded-xl transition-all text-center cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 font-extrabold uppercase rounded-xl transition-all text-center cursor-pointer shadow-md shadow-bravo-glow text-black"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
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
