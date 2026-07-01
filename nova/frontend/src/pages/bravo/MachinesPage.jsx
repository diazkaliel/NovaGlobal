import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, Wrench, Plus, X, Trash2, AlertTriangle, CheckCircle, HelpCircle, ArrowRight
} from 'lucide-react'
import { getMachines, createMachine, reserveMachine, deleteReservation } from '../../api/bravoBlueprint'
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
  const [hoveredRes, setHoveredRes] = useState(null)
  
  const [newMachine, setNewMachine] = useState({ name: '', type: 'sublimation' })
  const [newRes, setNewRes] = useState({
    machine_id: '',
    order_id: '',
    date: new Date().toISOString().split('T')[0],
    start_hour: '8',
    end_hour: '9'
  })

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
      await createMachine({ ...newMachine, status: 'active' })
      setSuccess('¡Máquina registrada correctamente!')
      setNewMachine({ name: '', type: 'sublimation' })
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
            className="px-4 py-2 bg-[#f4ebd9] border border-bravo-accent/20 hover:bg-[#ebdcb9] text-amber-900 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Agregar Máquina
          </button>
          <button
            onClick={() => { setError(''); setSuccess(''); setShowReserve(true); }}
            className="px-4 py-2 bg-bravo-accent hover:bg-amber-650 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
          >
            Reservar Bloque
          </button>
        </div>
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

      {/* TIMELINE GRID CONTAINER */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-bravo-accent animate-pulse font-mono text-xs">Cargando cronograma del taller...</div>
      ) : machines.length === 0 ? (
        <div className="text-center py-16 bg-white/40 border border-bravo-border rounded-2xl">
          <Wrench size={36} className="mx-auto text-stone-300 mb-3" />
          <p className="text-sm font-bold text-bravo-text">Sin maquinarias registradas</p>
          <p className="text-xs text-bravo-text-muted mt-1">Registra planchas térmicas, bordadoras, plotters o impresoras de DTF.</p>
        </div>
      ) : (
        <div className="bg-white/70 border border-bravo-border rounded-2xl p-5 shadow-xs overflow-x-auto">
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
                <div key={machine.id} className="grid grid-cols-14 items-center py-1 border-b border-stone-100 last:border-0">
                  
                  {/* Machine Name Column */}
                  <div className="col-span-2 text-left">
                    <h4 className="font-extrabold text-xs text-bravo-text leading-tight">{machine.name}</h4>
                    <span className="text-[9px] uppercase font-mono text-bravo-accent font-bold mt-0.5 block">{machine.type}</span>
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
                            className="h-10 bg-amber-600/10 text-amber-900 border border-amber-500/25 rounded-md flex items-center justify-center text-[9px] font-bold cursor-pointer overflow-hidden truncate px-1 transition-all"
                          >
                            {isStart ? `BRV-${reservation.order_id}` : ''}
                          </motion.div>
                        </div>
                      )
                    }

                    return (
                      <div key={hour} className="h-10 border border-dashed border-stone-200/60 rounded-md bg-stone-50/20 m-0.5" />
                    )
                  })}

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

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
                className="w-full mt-2 py-1 bg-rose-50 text-rose-700 text-[10px] uppercase font-bold rounded-lg border border-rose-100 text-center"
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
                    value={newMachine.type}
                    onChange={e => setNewMachine({ ...newMachine, type: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="sublimation">Sublimación</option>
                    <option value="embroidery">Bordado</option>
                    <option value="vinyl">Vinilo Textil</option>
                    <option value="dtf">DTF (Direct to Film)</option>
                  </select>
                </div>

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

    </div>
  )
}
