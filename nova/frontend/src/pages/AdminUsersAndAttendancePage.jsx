import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Clock, UserPlus, Key, Shield, UserCheck, UserX,
  Filter, Calendar, RefreshCw, Edit3, Trash2, CheckCircle2,
  AlertCircle, Search, Sparkles, Building2, Timer, Check,
  Activity, Wrench, DollarSign, Coins, ArrowRight, Play, Square,
  ShoppingBag, Tag, ChevronRight, Eye, User
} from 'lucide-react'
import { getUsersList, createUser, updateUser, resetUserPassword, deleteUser } from '../api/adminUsers'
import { getAdminAttendanceRecords, updateAdminAttendanceRecord, deleteAdminAttendanceRecord } from '../api/attendance'
import { getActivityLogs } from '../api/activityLogs'
import { useAuth } from '../context/AuthContext'

export default function AdminUsersAndAttendancePage({ system = 'nova' }) {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('activity') // 'activity' | 'attendance' | 'users'

  // ==========================================
  // ESTADOS DE BITÁCORA DE ACTIVIDAD (AUDITORÍA)
  // ==========================================
  const [activityLogs, setActivityLogs] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [activityCategory, setActivityCategory] = useState('all')
  const [activityUserId, setActivityUserId] = useState('all')
  const [activitySystem, setActivitySystem] = useState('all')
  const [activityDate, setActivityDate] = useState('')
  const [activitySearch, setActivitySearch] = useState('')

  // ==========================================
  // ESTADOS DE GESTIÓN DE USUARIOS
  // ==========================================
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userFilterRole, setUserFilterRole] = useState('all')
  const [userSearchTerm, setUserSearchTerm] = useState('')

  // Modales de Usuario
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'technician', system: 'nova' })
  const [creatingUser, setCreatingUser] = useState(false)

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  // ==========================================
  // ESTADOS DE ASISTENCIA Y TURNOS
  // ==========================================
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0])
  const [filterUserId, setFilterUserId] = useState('all')
  const [filterSystem, setFilterSystem] = useState('all')

  // Modal Edición de Asistencia
  const [editRecordModalOpen, setEditRecordModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [editFormData, setEditFormData] = useState({ clock_in: '', clock_out: '', notes: '' })
  const [savingRecord, setSavingRecord] = useState(false)

  const [feedbackMsg, setFeedbackMsg] = useState(null) // { type: 'success' | 'error', text: '' }

  const showNotification = (text, type = 'success') => {
    setFeedbackMsg({ text, type })
    setTimeout(() => setFeedbackMsg(null), 4000)
  }

  // ==========================================
  // CARGA DE DATOS
  // ==========================================

  const loadActivityLogs = async () => {
    try {
      setLoadingActivity(true)
      const data = await getActivityLogs({
        category: activityCategory !== 'all' ? activityCategory : undefined,
        user_id: activityUserId !== 'all' ? Number(activityUserId) : undefined,
        system: activitySystem !== 'all' ? activitySystem : undefined,
        target_date: activityDate || undefined,
        limit: 150
      })
      setActivityLogs(data)
    } catch (err) {
      showNotification('Error al cargar la bitácora de actividades.', 'error')
    } finally {
      setLoadingActivity(false)
    }
  }

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const data = await getUsersList({
        role: userFilterRole !== 'all' ? userFilterRole : undefined
      })
      setUsers(data)
    } catch (err) {
      showNotification('Error al cargar la lista de usuarios.', 'error')
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadAttendance = async () => {
    try {
      setLoadingAttendance(true)
      const data = await getAdminAttendanceRecords({
        target_date: filterDate || undefined,
        user_id: filterUserId !== 'all' ? Number(filterUserId) : undefined,
        system: filterSystem !== 'all' ? filterSystem : undefined
      })
      setAttendanceRecords(data)
    } catch (err) {
      showNotification('Error al cargar los registros de asistencia.', 'error')
    } finally {
      setLoadingAttendance(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [userFilterRole])

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance()
    }
  }, [activeTab, filterDate, filterUserId, filterSystem])

  useEffect(() => {
    if (activeTab === 'activity') {
      loadActivityLogs()
    }
  }, [activeTab, activityCategory, activityUserId, activitySystem, activityDate])

  // ==========================================
  // ACCIONES DE USUARIOS
  // ==========================================

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      showNotification('Todos los campos son obligatorios.', 'error')
      return
    }

    try {
      setCreatingUser(true)
      await createUser(newUserData)
      showNotification(`Usuario ${newUserData.name} creado exitosamente.`)
      setCreateUserModalOpen(false)
      setNewUserData({ name: '', email: '', password: '', role: 'technician', system: 'nova' })
      await loadUsers()
      await loadActivityLogs()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al crear usuario.', 'error')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleToggleUserSystem = async (targetUser) => {
    if (targetUser.role === 'admin') return
    const currentSys = targetUser.system || 'nova'
    const nextSys = currentSys === 'bravo' ? 'nova' : 'bravo'
    const nameMap = { nova: 'Nova Technologies (Telefonía)', bravo: 'Personalizaciones Bravo (Estampados)' }
    if (!window.confirm(`¿Reasignar al colaborador ${targetUser.name} a la tienda "${nameMap[nextSys]}"?`)) return

    try {
      await updateUser(targetUser.id, { system: nextSys })
      showNotification(`Colaborador ${targetUser.name} reasignado a ${nameMap[nextSys]}.`)
      await loadUsers()
      await loadActivityLogs()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al reasignar tienda.', 'error')
    }
  }

  const handleToggleUserRole = async (targetUser) => {
    const nextRole = targetUser.role === 'admin' ? 'technician' : 'admin'
    const actionDesc = nextRole === 'admin' ? 'Administrador' : 'Trabajador/Técnico'
    if (!window.confirm(`¿Deseas cambiar el rol de ${targetUser.name} a "${actionDesc}"?`)) return

    try {
      await updateUser(targetUser.id, { role: nextRole })
      showNotification(`Rol de ${targetUser.name} actualizado a ${actionDesc}.`)
      await loadUsers()
      await loadActivityLogs()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al actualizar rol.', 'error')
    }
  }

  const handleToggleUserStatus = async (targetUser) => {
    const nextStatus = !targetUser.is_active
    const actionDesc = nextStatus ? 'activar' : 'suspender'
    if (!window.confirm(`¿Estás seguro de ${actionDesc} el acceso a ${targetUser.name}?`)) return

    try {
      await updateUser(targetUser.id, { is_active: nextStatus })
      showNotification(`Usuario ${targetUser.name} ${nextStatus ? 'activado' : 'suspendido'}.`)
      await loadUsers()
      await loadActivityLogs()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al cambiar estado.', 'error')
    }
  }

  const handleOpenResetPassword = (targetUser) => {
    setSelectedUserForPassword(targetUser)
    setNewPassword('')
    setPasswordModalOpen(true)
  }

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      showNotification('La contraseña debe tener al menos 6 caracteres.', 'error')
      return
    }

    try {
      setResettingPassword(true)
      await resetUserPassword(selectedUserForPassword.id, newPassword)
      showNotification(`Contraseña restablecida exitosamente para ${selectedUserForPassword.name}.`)
      setPasswordModalOpen(false)
      setSelectedUserForPassword(null)
      setNewPassword('')
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al restablecer contraseña.', 'error')
    } finally {
      setResettingPassword(false)
    }
  }

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`¿Estás SEGURO de eliminar definitivamente al usuario ${targetUser.name}? Esta acción no se puede deshacer.`)) return

    try {
      await deleteUser(targetUser.id)
      showNotification(`Usuario ${targetUser.name} eliminado.`)
      await loadUsers()
      await loadActivityLogs()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al eliminar usuario.', 'error')
    }
  }

  // ==========================================
  // ACCIONES DE ASISTENCIA
  // ==========================================

  const handleOpenEditRecord = (rec) => {
    setSelectedRecord(rec)
    
    // Formatear datetime local para inputs datetime-local (YYYY-MM-DDTHH:mm)
    const toInputFormat = (isoStr) => {
      if (!isoStr) return ''
      const d = new Date(isoStr)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    setEditFormData({
      clock_in: toInputFormat(rec.clock_in),
      clock_out: toInputFormat(rec.clock_out),
      notes: rec.notes || ''
    })
    setEditRecordModalOpen(true)
  }

  const handleSaveAttendanceEdit = async (e) => {
    e.preventDefault()
    if (!selectedRecord) return

    try {
      setSavingRecord(true)
      const payload = {
        clock_in: editFormData.clock_in ? new Date(editFormData.clock_in).toISOString() : undefined,
        clock_out: editFormData.clock_out ? new Date(editFormData.clock_out).toISOString() : null,
        notes: editFormData.notes
      }

      await updateAdminAttendanceRecord(selectedRecord.id, payload)
      showNotification('Registro de asistencia actualizado y recalculado exitosamente.')
      setEditRecordModalOpen(false)
      setSelectedRecord(null)
      await loadAttendance()
      await loadActivityLogs()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al guardar cambios de asistencia.', 'error')
    } finally {
      setSavingRecord(false)
    }
  }

  const handleDeleteAttendanceRecord = async (rec) => {
    if (!window.confirm(`¿Deseas eliminar este registro de asistencia de ${rec.user_name || 'Colaborador'}?`)) return

    try {
      await deleteAdminAttendanceRecord(rec.id)
      showNotification('Registro de asistencia eliminado.')
      await loadAttendance()
      await loadActivityLogs()
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Error al eliminar registro.', 'error')
    }
  }

  // Filtrar usuarios en memoria
  const filteredUsers = users.filter((u) => {
    const term = userSearchTerm.toLowerCase()
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
  })

  // Filtrar actividades en memoria
  const filteredActivities = activityLogs.filter((act) => {
    if (!activitySearch) return true
    const term = activitySearch.toLowerCase()
    return (
      act.title.toLowerCase().includes(term) ||
      act.description.toLowerCase().includes(term) ||
      act.user_name.toLowerCase().includes(term) ||
      (act.metadata?.order_number && act.metadata.order_number.toLowerCase().includes(term))
    )
  })

  const formatHour = (isoStr) => {
    if (!isoStr) return '--:--'
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (isoStr) => {
    if (!isoStr) return ''
    return new Date(isoStr).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatRelativeTime = (isoStr) => {
    if (!isoStr) return ''
    const now = new Date().getTime()
    const past = new Date(isoStr).getTime()
    const diffMin = Math.floor((now - past) / (1000 * 60))

    if (diffMin < 1) return 'Hace un momento'
    if (diffMin < 60) return `Hace ${diffMin} min`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `Hace ${diffHours} h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays} días`
  }

  const getActivityVisuals = (category, action_type) => {
    switch (category) {
      case 'attendance':
        if (action_type === 'clock_in') {
          return {
            icon: Play,
            bgColor: 'bg-emerald-500/15',
            borderColor: 'border-emerald-500/30',
            textColor: 'text-emerald-400',
            badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
            label: 'Entrada de Turno'
          }
        }
        return {
          icon: Square,
          bgColor: 'bg-rose-500/15',
          borderColor: 'border-rose-500/30',
          textColor: 'text-rose-400',
          badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
          label: 'Salida de Turno'
        }
      case 'orders':
        return {
          icon: Wrench,
          bgColor: 'bg-purple-500/15',
          borderColor: 'border-purple-500/30',
          textColor: 'text-purple-400',
          badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-500/30',
          label: 'Nueva Orden'
        }
      case 'status_changes':
        return {
          icon: RefreshCw,
          bgColor: 'bg-amber-500/15',
          borderColor: 'border-amber-500/30',
          textColor: 'text-amber-400',
          badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
          label: 'Cambio de Estado'
        }
      case 'sales':
        return {
          icon: DollarSign,
          bgColor: 'bg-teal-500/15',
          borderColor: 'border-teal-500/30',
          textColor: 'text-teal-400',
          badgeBg: 'bg-teal-950/60 text-teal-300 border-teal-500/30',
          label: 'Venta Concretada'
        }
      case 'cash':
        return {
          icon: Coins,
          bgColor: 'bg-sky-500/15',
          borderColor: 'border-sky-500/30',
          textColor: 'text-sky-400',
          badgeBg: 'bg-sky-950/60 text-sky-300 border-sky-500/30',
          label: 'Movimiento de Caja'
        }
      default:
        return {
          icon: Activity,
          bgColor: 'bg-gray-500/15',
          borderColor: 'border-gray-500/30',
          textColor: 'text-gray-400',
          badgeBg: 'bg-gray-800 text-gray-300 border-gray-700',
          label: 'Actividad'
        }
    }
  }

  return (
    <div className="space-y-6 text-left pb-12 font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold backdrop-blur-xl border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20'
                : 'bg-rose-950/90 text-rose-300 border-rose-500/40 shadow-rose-500/20'
            }`}
          >
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 via-cyan-500/20 to-amber-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Shield size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Centro de Control & Auditoría
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Panel de Administrador
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Bitácora en tiempo real de actividades, órdenes, cambios de estado, turnos y colaboradores.
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center p-1 bg-gray-900/80 border border-gray-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity size={15} />
            <span>Bitácora de Actividad</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={15} />
            <span>Control de Asistencia ({attendanceRecords.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={15} />
            <span>Gestión de Usuarios ({users.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: BITÁCORA DE ACTIVIDAD EN VIVO (AUDITORÍA COMPLETA)              */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          {/* Barra de Filtros de Actividad */}
          <div className="p-4 bg-gray-900/40 border border-gray-800/80 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 sm:w-64">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Buscar por orden, cliente, acción..."
                    className="w-full pl-9 pr-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Filtro por Colaborador */}
                <select
                  value={activityUserId}
                  onChange={(e) => setActivityUserId(e.target.value)}
                  className="px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todos los Colaboradores</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'admin' ? 'Admin' : 'Técnico'})
                    </option>
                  ))}
                </select>

                {/* Filtro por Sistema */}
                <select
                  value={activitySystem}
                  onChange={(e) => setActivitySystem(e.target.value)}
                  className="px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Nova & Bravo</option>
                  <option value="nova">Solo Nova Technologies</option>
                  <option value="bravo">Solo Bravo Personalizaciones</option>
                </select>

                {/* Filtro por Fecha */}
                <div className="flex items-center gap-1.5 bg-gray-950 px-3 py-1.5 border border-gray-800 rounded-xl">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                  />
                  {activityDate && (
                    <button
                      onClick={() => setActivityDate('')}
                      className="text-[10px] text-gray-500 hover:text-white ml-1 font-bold"
                      title="Quitar filtro de fecha"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={loadActivityLogs}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw size={13} className={loadingActivity ? 'animate-spin' : ''} />
                <span>Actualizar Bitácora</span>
              </button>
            </div>

            {/* Categorías Rápidas */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/60">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">Filtrar por:</span>
              {[
                { id: 'all', label: 'Todas las Acciones' },
                { id: 'attendance', label: '🟢 Turnos y Horarios' },
                { id: 'orders', label: '📝 Órdenes Creadas' },
                { id: 'status_changes', label: '🔄 Cambios de Estado' },
                { id: 'sales', label: '💰 Ventas Concretadas' },
                { id: 'cash', label: '💵 Movimientos de Caja' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActivityCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activityCategory === cat.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline / Lista de Actividad */}
          <div className="space-y-3">
            {loadingActivity ? (
              <div className="text-center py-16 bg-[#0a0a0f] border border-gray-800 rounded-2xl">
                <RefreshCw size={24} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-xs text-gray-400">Sincronizando eventos y registros en tiempo real...</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-16 bg-[#0a0a0f] border border-dashed border-gray-800 rounded-2xl">
                <Activity size={32} className="text-gray-600 mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-bold text-white mb-1">No hay actividades registradas</h3>
                <p className="text-xs text-gray-500">No se encontraron eventos para los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredActivities.map((act) => {
                  const visuals = getActivityVisuals(act.category, act.action_type)
                  const Icon = visuals.icon

                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-[#0a0a0f] hover:bg-gray-900/40 border border-gray-800/80 hover:border-gray-700 rounded-2xl transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Icono de Evento */}
                        <div className={`w-9 h-9 rounded-xl ${visuals.bgColor} ${visuals.borderColor} border flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon size={16} className={visuals.textColor} />
                        </div>

                        {/* Descripción y Contenido */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                              {act.title}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${visuals.badgeBg}`}>
                              {visuals.label}
                            </span>
                            <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                              act.system === 'bravo' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {act.system.toUpperCase()}
                            </span>
                          </div>

                          <p className="text-xs text-gray-300 font-medium">
                            {act.description}
                          </p>

                          {/* Metadata adicional de la orden / acción si existe */}
                          {act.metadata?.order_number && (
                            <div className="flex items-center gap-2 pt-0.5 text-[11px] text-gray-400">
                              <span className="font-mono text-cyan-400 font-bold">#{act.metadata.order_number}</span>
                              {act.metadata.client_name && <span>• Cliente: <strong>{act.metadata.client_name}</strong></span>}
                              {act.metadata.cost > 0 && <span>• Total: <strong className="text-emerald-400">${act.metadata.cost.toFixed(2)}</strong></span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info de Colaborador y Hora */}
                      <div className="flex items-center md:flex-col md:items-end justify-between border-t md:border-t-0 border-gray-900 pt-2 md:pt-0 shrink-0 text-right">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-300">
                            {act.user_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-xs font-semibold text-gray-300">
                            {act.user_name}
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Clock size={11} />
                          <span>{formatHour(act.timestamp)}</span>
                          <span>•</span>
                          <span className="text-gray-400">{formatRelativeTime(act.timestamp)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: CONTROL DE ASISTENCIA Y TURNOS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Tarjetas KPI de Asistencia */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">En Turno Activo</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Play size={13} className="fill-current" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">
                {attendanceRecords.filter((r) => r.clock_out === null).length}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">Colaboradores laborando ahora</p>
            </div>

            <div className="p-4 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">Registros de Fecha</span>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Clock size={13} />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{attendanceRecords.length}</p>
              <p className="text-[11px] text-cyan-400 mt-1">Marcas registradas en fecha</p>
            </div>

            <div className="p-4 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">Horas Acumuladas</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Timer size={13} />
                </div>
              </div>
              <p className="text-2xl font-black text-white">
                {Math.floor(attendanceRecords.reduce((acc, r) => acc + (r.total_minutes || 0), 0) / 60)}h{' '}
                {attendanceRecords.reduce((acc, r) => acc + (r.total_minutes || 0), 0) % 60}m
              </p>
              <p className="text-[11px] text-purple-400 mt-1">Tiempo total trabajado</p>
            </div>
          </div>

          {/* Filtros de Asistencia */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-gray-950 px-3 py-2 border border-gray-800 rounded-xl">
                <Calendar size={14} className="text-gray-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="text-[10px] text-gray-500 hover:text-white ml-1 font-bold"
                    title="Ver todas las fechas"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos los Colaboradores</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              <select
                value={filterSystem}
                onChange={(e) => setFilterSystem(e.target.value)}
                className="px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos los Sistemas</option>
                <option value="nova">Nova Technologies</option>
                <option value="bravo">Bravo Personalizaciones</option>
              </select>

              <button
                onClick={loadAttendance}
                className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Refrescar asistencia"
              >
                <RefreshCw size={14} className={loadingAttendance ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Tabla de Asistencia */}
          <div className="overflow-hidden bg-[#0a0a0f] border border-gray-800/80 rounded-2xl shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Colaborador</th>
                  <th className="py-3.5 px-4">Entrada</th>
                  <th className="py-3.5 px-4">Salida</th>
                  <th className="py-3.5 px-4">Tiempo Total</th>
                  <th className="py-3.5 px-4">Sistema</th>
                  <th className="py-3.5 px-4">Observaciones</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/60">
                {loadingAttendance ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      Cargando registros de asistencia...
                    </td>
                  </tr>
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      No se encontraron registros de asistencia para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-300 font-bold">{rec.date}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-white leading-none">{rec.user_name || 'Sin nombre'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{rec.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                          {formatHour(rec.clock_in)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {rec.clock_out ? (
                          <span className="font-mono text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20">
                            {formatHour(rec.clock_out)}
                          </span>
                        ) : (
                          <span className="font-mono text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                            En Turno
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                        {rec.total_minutes !== null
                          ? `${Math.floor(rec.total_minutes / 60)}h ${rec.total_minutes % 60}m`
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            rec.system === 'bravo'
                              ? 'bg-amber-950/50 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {rec.system}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 italic max-w-xs truncate">{rec.notes || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditRecord(rec)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-gray-400 transition-colors cursor-pointer"
                            title="Editar horario o cerrar turno"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteAttendanceRecord(rec)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 transition-colors cursor-pointer"
                            title="Eliminar marca"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: GESTIÓN DE USUARIOS Y ROLES                                     */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Barra de Herramientas */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  className="w-full pl-9 pr-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={userFilterRole}
                onChange={(e) => setUserFilterRole(e.target.value)}
                className="px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">Todos los Roles</option>
                <option value="admin">Administradores</option>
                <option value="technician">Trabajadores / Técnicos</option>
              </select>

              <button
                onClick={loadUsers}
                className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Refrescar lista"
              >
                <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
              </button>
            </div>

            <button
              onClick={() => setCreateUserModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:opacity-95 transition-all cursor-pointer"
            >
              <UserPlus size={15} />
              <span>Nuevo Usuario</span>
            </button>
          </div>

          {/* Tabla de Usuarios */}
          <div className="overflow-hidden bg-[#0a0a0f] border border-gray-800/80 rounded-2xl shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Colaborador</th>
                  <th className="py-3.5 px-4">Correo Electrónico</th>
                  <th className="py-3.5 px-4">Rol Asignado</th>
                  <th className="py-3.5 px-4">Tienda Asignada</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Registrado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/60">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Cargando lista de usuarios...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      No se encontraron usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id
                    return (
                      <tr key={u.id} className="hover:bg-gray-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-xs text-white">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white leading-none">
                                {u.name} {isSelf && <span className="text-[10px] text-cyan-400 font-mono">(Tú)</span>}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: #{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-300">{u.email}</td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => !isSelf && handleToggleUserRole(u)}
                            disabled={isSelf}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                              u.role === 'admin'
                                ? 'bg-purple-950/60 text-purple-300 border-purple-500/40 hover:bg-purple-900/60'
                                : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60'
                            } ${!isSelf ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                            title={!isSelf ? 'Clic para cambiar rol' : 'No puedes cambiar tu propio rol'}
                          >
                            <Shield size={12} className={u.role === 'admin' ? 'text-purple-400' : 'text-cyan-400'} />
                            <span>{u.role === 'admin' ? 'Administrador' : 'Trabajador / Técnico'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30 font-mono">
                              🌐 Ambos Sistemas
                            </span>
                          ) : (
                            <button
                              onClick={() => !isSelf && handleToggleUserSystem(u)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                (u.system || 'nova') === 'bravo'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                                  : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60'
                              }`}
                              title="Clic para reasignar tienda"
                            >
                              <span>{(u.system || 'nova') === 'bravo' ? '🎨 Bravo (Estampados)' : '📱 Nova (Telefonía)'}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => !isSelf && handleToggleUserStatus(u)}
                            disabled={isSelf}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.is_active
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                            } ${!isSelf ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                            <span>{u.is_active ? 'Activo' : 'Suspendido'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenResetPassword(u)}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-amber-500/20 hover:text-amber-400 text-gray-400 transition-colors cursor-pointer"
                              title="Restablecer Contraseña"
                            >
                              <Key size={13} />
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 transition-colors cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES                                                                   */}
      {/* ========================================================================= */}

      {/* Modal: Crear Usuario */}
      <AnimatePresence>
        {createUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateUserModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d0d12] border border-gray-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Nuevo Colaborador</h3>
                    <p className="text-xs text-gray-400">Crear cuenta con acceso asignado por tienda</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreateUserModalOpen(false)}
                  className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico (Login)</label>
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="colaborador@novaglobal.com"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Rol</label>
                    <select
                      value={newUserData.role}
                      onChange={(e) => {
                        const newRole = e.target.value
                        setNewUserData({
                          ...newUserData,
                          role: newRole,
                          system: newRole === 'admin' ? 'all' : (newUserData.system === 'all' ? 'nova' : newUserData.system)
                        })
                      }}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="technician">Trabajador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Tienda Asignada</label>
                    <select
                      value={newUserData.system}
                      onChange={(e) => setNewUserData({ ...newUserData, system: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {newUserData.role === 'admin' ? (
                        <option value="all">Ambos Sistemas (Global)</option>
                      ) : (
                        <>
                          <option value="nova">Nova Technologies</option>
                          <option value="bravo">Bravo Personalizaciones</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-gray-800/80">
                  <button
                    type="button"
                    onClick={() => setCreateUserModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-800 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/20 hover:opacity-95 transition-all cursor-pointer"
                  >
                    {creatingUser ? 'Creando...' : 'Crear Colaborador'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Restablecer Contraseña */}
      <AnimatePresence>
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPasswordModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d0d12] border border-gray-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Key size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Restablecer Contraseña</h3>
                    <p className="text-xs text-gray-400">Usuario: {selectedUserForPassword?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPasswordModalOpen(false)}
                  className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-800 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all cursor-pointer"
                  >
                    {resettingPassword ? 'Guardando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Registro de Asistencia */}
      <AnimatePresence>
        {editRecordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditRecordModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d0d12] border border-gray-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                    <Edit3 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Editar Horario de Turno</h3>
                    <p className="text-xs text-gray-400">Colaborador: {selectedRecord?.user_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditRecordModalOpen(false)}
                  className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAttendanceEdit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Hora de Entrada</label>
                  <input
                    type="datetime-local"
                    value={editFormData.clock_in}
                    onChange={(e) => setEditFormData({ ...editFormData, clock_in: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Hora de Salida (Cierre de Turno)</label>
                  <input
                    type="datetime-local"
                    value={editFormData.clock_out}
                    onChange={(e) => setEditFormData({ ...editFormData, clock_out: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Deja vacío si el turno sigue abierto.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Observaciones / Notas</label>
                  <textarea
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    placeholder="Motivo del ajuste..."
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setEditRecordModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-800 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingRecord}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all cursor-pointer"
                  >
                    {savingRecord ? 'Guardando...' : 'Guardar Cambios'}
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
