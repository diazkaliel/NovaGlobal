import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, X, Globe, Save, Trash2, Edit2, 
  Smartphone, Laptop, Gamepad, HelpCircle, Phone, Mail, MapPin, MessageSquare, Check,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Star, MessageCircle, Send
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { 
  getWebConfig, updateWebConfig,
  getAdminComments, toggleCommentApproval, deleteComment,
  simulateWhatsAppMessage
} from '../api/public'
import AnimatedBackground from '../components/AnimatedBackground'

const inputClass = "w-full bg-gray-950 border border-gray-800 hover:border-gray-700/80 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300 placeholder-gray-600 backdrop-blur-sm"
const btnClass = "px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.15)]"

export default function AdminWebPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('general') // general, prices, faqs, comments, chatbot
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Central config state
  const [config, setConfig] = useState({
    whatsapp: '',
    phone: '',
    email: '',
    address: '',
    reference_prices: [],
    faqs: []
  })

  // Edit/Add modal or inline state
  const [editingPriceIndex, setEditingPriceIndex] = useState(null) // null if adding
  const [priceForm, setPriceForm] = useState({
    device: '',
    service: '',
    price: '',
    time: '',
    category: 'Celular'
  })
  const [showPriceForm, setShowPriceForm] = useState(false)

  const [editingFaqIndex, setEditingFaqIndex] = useState(null) // null if adding
  const [faqForm, setFaqForm] = useState({
    q: '',
    a: ''
  })
  const [showFaqForm, setShowFaqForm] = useState(false)

  // Comments moderation state
  const [adminComments, setAdminComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  // Chatbot simulator state
  const [simPhone, setSimPhone] = useState('+56 9 9999 9999')
  const [simInput, setSimInput] = useState('')
  const [simMessages, setSimMessages] = useState([
    { sender: 'bot', text: '🤖 *¡Hola! Bienvenido al asistente virtual de NovaGlobal.*\n\nEscribe el número de la opción que deseas realizar:\n\n1️⃣ *Consultar estado de reparación* 🛠️\n2️⃣ *Preguntas frecuentes (FAQs)* ❓\n3️⃣ *Ubicación y contacto* 📍\n4️⃣ *Cotizar una reparación* 💰', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ])
  const [simWriting, setSimWriting] = useState(false)

  // Fetch current config
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getWebConfig()
        if (response.data) {
          setConfig({
            whatsapp: response.data.whatsapp || '',
            phone: response.data.phone || '',
            email: response.data.email || '',
            address: response.data.address || '',
            reference_prices: response.data.reference_prices || [],
            faqs: response.data.faqs || []
          })
        }
      } catch (err) {
        setError('Error al cargar la configuración de la página web.')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  // Fetch comments for moderation when activeTab is comments
  useEffect(() => {
    if (activeTab === 'comments') {
      const fetchAdminComments = async () => {
        setCommentsLoading(true)
        setError('')
        try {
          const response = await getAdminComments()
          setAdminComments(response.data || [])
        } catch (err) {
          setError('Error al obtener la lista de comentarios para moderación.')
        } finally {
          setCommentsLoading(false)
        }
      }
      fetchAdminComments()
    }
  }, [activeTab])

  // Save config
  const handleSaveAll = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateWebConfig(config)
      setSuccess('¡Configuración de la página web guardada con éxito!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar los cambios en el servidor.')
    } finally {
      setSaving(false)
    }
  }

  // Toggle Comment Approval
  const handleApproveComment = async (id, currentApproval) => {
    setError('')
    setSuccess('')
    try {
      const response = await toggleCommentApproval(id, !currentApproval)
      setAdminComments(prev => 
        prev.map(c => c.id === id ? { ...c, is_approved: response.data.is_approved } : c)
      )
      setSuccess(response.data.is_approved ? 'Comentario aprobado y publicado con éxito.' : 'Comentario ocultado con éxito.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al cambiar la aprobación del comentario.')
    }
  }

  // Delete Comment
  const handleDeleteComment = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar permanentemente este comentario?')) return
    setError('')
    setSuccess('')
    try {
      await deleteComment(id)
      setAdminComments(prev => prev.filter(c => c.id !== id))
      setSuccess('Comentario eliminado con éxito.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al eliminar el comentario.')
    }
  }

  // Send message in Chatbot simulator
  const handleSendSimMessage = async (e) => {
    e.preventDefault()
    if (!simInput.trim()) return

    const userText = simInput.trim()
    setSimInput('')

    const userMsg = {
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setSimMessages(prev => [...prev, userMsg])
    setSimWriting(true)

    try {
      const response = await simulateWhatsAppMessage({ message: userText, phone: simPhone })
      setTimeout(() => {
        const botMsg = {
          sender: 'bot',
          text: response.data.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setSimMessages(prev => [...prev, botMsg])
        setSimWriting(false)
      }, 600)
    } catch (err) {
      setSimWriting(false)
      const errorMsg = {
        sender: 'bot',
        text: '❌ Error: No se pudo conectar con el endpoint de simulación del bot.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setSimMessages(prev => [...prev, errorMsg])
    }
  }


  // Reference Price Operations
  const handleAddOrEditPrice = (e) => {
    e.preventDefault()
    if (!priceForm.device || !priceForm.service || !priceForm.price || !priceForm.time) {
      setError('Por favor completa todos los campos de la tarifa de precio.')
      return
    }

    const updatedPrices = [...config.reference_prices]
    if (editingPriceIndex !== null) {
      // Edit
      updatedPrices[editingPriceIndex] = { ...priceForm }
    } else {
      // Add
      updatedPrices.push({ ...priceForm })
    }

    setConfig(prev => ({ ...prev, reference_prices: updatedPrices }))
    setPriceForm({ device: '', service: '', price: '', time: '', category: 'Celular' })
    setEditingPriceIndex(null)
    setShowPriceForm(false)
    setSuccess('Tarifa de precio actualizada localmente (Recuerda guardar los cambios).')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleStartEditPrice = (index) => {
    setEditingPriceIndex(index)
    setPriceForm({ ...config.reference_prices[index] })
    setShowPriceForm(true)
  }

  const handleDeletePrice = (index) => {
    const updatedPrices = config.reference_prices.filter((_, i) => i !== index)
    setConfig(prev => ({ ...prev, reference_prices: updatedPrices }))
    setSuccess('Tarifa eliminada localmente (Recuerda guardar los cambios).')
    setTimeout(() => setSuccess(''), 3000)
  }

  // FAQ Operations
  const handleAddOrEditFaq = (e) => {
    e.preventDefault()
    if (!faqForm.q || !faqForm.a) {
      setError('Por favor completa la pregunta y la respuesta.')
      return
    }

    const updatedFaqs = [...config.faqs]
    if (editingFaqIndex !== null) {
      // Edit
      updatedFaqs[editingFaqIndex] = { ...faqForm }
    } else {
      // Add
      updatedFaqs.push({ ...faqForm })
    }

    setConfig(prev => ({ ...prev, faqs: updatedFaqs }))
    setFaqForm({ q: '', a: '' })
    setEditingFaqIndex(null)
    setShowFaqForm(false)
    setSuccess('Pregunta frecuente actualizada localmente (Recuerda guardar los cambios).')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleStartEditFaq = (index) => {
    setEditingFaqIndex(index)
    setFaqForm({ ...config.faqs[index] })
    setShowFaqForm(true)
  }

  const handleDeleteFaq = (index) => {
    const updatedFaqs = config.faqs.filter((_, i) => i !== index)
    setConfig(prev => ({ ...prev, faqs: updatedFaqs }))
    setSuccess('Pregunta frecuente eliminada localmente (Recuerda guardar los cambios).')
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="dash-page min-h-screen text-slate-100 p-4 sm:p-8 flex flex-col items-center relative overflow-hidden bg-[#050508]">
      <AnimatedBackground />

      <div className="w-full max-w-5xl z-10 space-y-6">
        
        {/* Header navigation bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800/60">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer hover:bg-gray-800/80 active:scale-95"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="text-left">
              <span className="text-[10px] text-cyan-400 tracking-widest font-mono uppercase font-bold">CONFIGURACIÓN WEB</span>
              <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
                <Globe className="text-cyan-400" size={22} />
                Administrar Página Web
              </h1>
              <p className="text-xs text-gray-500">Administra los parámetros públicos de Nova Tecnologies en tiempo real.</p>
            </div>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving || loading}
            className={`${btnClass} ${saving ? 'opacity-50' : ''}`}
          >
            <Save size={14} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-pulse"
            >
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selector controls */}
        <div className="flex border-b border-gray-800/50 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'general' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            Contacto General
          </button>
          
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'prices' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            Tarifas Estimadas
          </button>
          
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'faqs' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            Preguntas Frecuentes
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'comments' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            Comentarios Clientes
          </button>

          <button
            onClick={() => setActiveTab('chatbot')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'chatbot' ? 'text-cyan-400 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            Simulador Chatbot
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="min-h-[300px]">
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-cyan-400 text-sm animate-pulse flex items-center gap-2">
                <Globe className="animate-spin" size={18} />
                Cargando configuración actual...
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              
              {/* TAB: GENERAL */}
              {activeTab === 'general' && (
                <motion.div
                  key="general-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white/[0.01] border border-gray-800/40 p-6 rounded-2xl space-y-6 text-left"
                >
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Globe size={14} className="text-cyan-400" />
                      Información de Contacto & Redes
                    </h3>
                    <p className="text-xs text-gray-500">
                      Modifica los datos que se muestran públicamente en el sitio web de NovaGlobal.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Número de WhatsApp</label>
                      <input
                        type="text"
                        value={config.whatsapp}
                        onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
                        placeholder="Ej: +56 9 46528858"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Teléfono de Contacto</label>
                      <input
                        type="text"
                        value={config.phone}
                        onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                        placeholder="Ej: +56 9 46528858"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Correo Electrónico Público</label>
                      <input
                        type="email"
                        value={config.email}
                        onChange={(e) => setConfig({ ...config, email: e.target.value })}
                        placeholder="Ej: contacto@novaglobal.com"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">Dirección Física del Taller</label>
                      <input
                        type="text"
                        value={config.address}
                        onChange={(e) => setConfig({ ...config, address: e.target.value })}
                        placeholder="Ej: Av. Providencia 1234, Oficina 501, Santiago"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: REFERENCE PRICES */}
              {activeTab === 'prices' && (
                <motion.div
                  key="prices-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6 text-left"
                >
                  
                  {/* Actions Header */}
                  <div className="flex justify-between items-center bg-white/[0.01] border border-gray-800/40 p-4 rounded-xl">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase">Lista de Tarifas de Referencia</h3>
                      <p className="text-xs text-gray-500 mt-1">Estimados públicos que aparecen en el buscador.</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setEditingPriceIndex(null)
                        setPriceForm({ device: '', service: '', price: '', time: '', category: 'Celular' })
                        setShowPriceForm(true)
                      }}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-gray-950 text-cyan-400 font-bold text-xs uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      Nueva Tarifa
                    </button>
                  </div>

                  {/* Add/Edit Form Overlay Modal */}
                  {showPriceForm && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 border border-gray-800 max-w-md w-full p-6 rounded-2xl relative space-y-6 shadow-2xl text-left"
                      >
                        <button
                          onClick={() => setShowPriceForm(false)}
                          className="absolute top-4 right-4 p-1 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                        
                        <div>
                          <h4 className="font-extrabold text-white text-base uppercase">
                            {editingPriceIndex !== null ? 'Editar Tarifa' : 'Agregar Nueva Tarifa'}
                          </h4>
                          <p className="text-xs text-gray-500">Modifica los detalles de la estimación de precio técnico.</p>
                        </div>

                        <form onSubmit={handleAddOrEditPrice} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Equipo / Modelo *</label>
                            <input
                              type="text"
                              value={priceForm.device}
                              onChange={(e) => setPriceForm({ ...priceForm, device: e.target.value })}
                              placeholder="Ej: iPhone 13, Nintendo Switch"
                              className={inputClass}
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Servicio Técnico *</label>
                            <input
                              type="text"
                              value={priceForm.service}
                              onChange={(e) => setPriceForm({ ...priceForm, service: e.target.value })}
                              placeholder="Ej: Cambio de Pantalla OLED, Limpieza Térmica"
                              className={inputClass}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Precio Público *</label>
                              <input
                                type="text"
                                value={priceForm.price}
                                onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                                placeholder="Ej: $85.000, $60.000 - $80.000"
                                className={inputClass}
                                required
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tiempo Estimado *</label>
                              <input
                                type="text"
                                value={priceForm.time}
                                onChange={(e) => setPriceForm({ ...priceForm, time: e.target.value })}
                                placeholder="Ej: 2 horas, 1 día"
                                className={inputClass}
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Categoría de Filtro *</label>
                            <select
                              value={priceForm.category}
                              onChange={(e) => setPriceForm({ ...priceForm, category: e.target.value })}
                              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                            >
                              <option value="Celular">Celular</option>
                              <option value="Notebook">Notebook</option>
                              <option value="Consola">Consola</option>
                              <option value="Placa">Micro-soldadura</option>
                              <option value="Otro">Otro</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                          >
                            {editingPriceIndex !== null ? 'Guardar Cambios Localmente' : 'Agregar Tarifa Localmente'}
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}

                  {/* List Table */}
                  <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-800/50 bg-white/[0.01] text-gray-500 font-mono text-[10px] tracking-wider uppercase">
                            <th className="py-4 px-6">Equipo / Modelo</th>
                            <th className="py-4 px-6">Servicio</th>
                            <th className="py-4 px-6">Precio</th>
                            <th className="py-4 px-6">Tiempo</th>
                            <th className="py-4 px-6">Categoría</th>
                            <th className="py-4 px-6 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40 text-gray-300">
                          {config.reference_prices.length > 0 ? (
                            config.reference_prices.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4 px-6 font-semibold text-white">{item.device}</td>
                                <td className="py-4 px-6 text-gray-400">{item.service}</td>
                                <td className="py-4 px-6 font-mono text-emerald-400 font-bold">{item.price}</td>
                                <td className="py-4 px-6 text-gray-400 font-mono text-xs">{item.time}</td>
                                <td className="py-4 px-6">
                                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-cyan-400">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => handleStartEditPrice(idx)}
                                      className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-gray-950 text-cyan-400 rounded transition-all cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePrice(idx)}
                                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 rounded transition-all cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-gray-500 text-xs">
                                No hay tarifas de referencia registradas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </motion.div>
              )}

              {/* TAB: FAQS */}
              {activeTab === 'faqs' && (
                <motion.div
                  key="faqs-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6 text-left"
                >
                  
                  {/* Actions Header */}
                  <div className="flex justify-between items-center bg-white/[0.01] border border-gray-800/40 p-4 rounded-xl">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase">Preguntas Frecuentes (FAQs)</h3>
                      <p className="text-xs text-gray-500 mt-1">Preguntas y respuestas del acordeón en la landing page.</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setEditingFaqIndex(null)
                        setFaqForm({ q: '', a: '' })
                        setShowFaqForm(true)
                      }}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-gray-950 text-cyan-400 font-bold text-xs uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      Nueva Pregunta
                    </button>
                  </div>

                  {/* Add/Edit FAQ overlay modal */}
                  {showFaqForm && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 border border-gray-800 max-w-md w-full p-6 rounded-2xl relative space-y-6 shadow-2xl text-left"
                      >
                        <button
                          onClick={() => setShowFaqForm(false)}
                          className="absolute top-4 right-4 p-1 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                        
                        <div>
                          <h4 className="font-extrabold text-white text-base uppercase">
                            {editingFaqIndex !== null ? 'Editar Pregunta Frecuente' : 'Agregar Nueva Pregunta'}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono">Modifica la información en la landing page.</p>
                        </div>

                        <form onSubmit={handleAddOrEditFaq} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Pregunta (Q) *</label>
                            <input
                              type="text"
                              value={faqForm.q}
                              onChange={(e) => setFaqForm({ ...faqForm, q: e.target.value })}
                              placeholder="Ej: ¿Qué medios de pago aceptan?"
                              className={inputClass}
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Respuesta (A) *</label>
                            <textarea
                              value={faqForm.a}
                              onChange={(e) => setFaqForm({ ...faqForm, a: e.target.value })}
                              placeholder="Ej: Aceptamos efectivo, transferencias y tarjetas..."
                              rows={4}
                              className={inputClass}
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                          >
                            {editingFaqIndex !== null ? 'Guardar Cambios Localmente' : 'Agregar Pregunta Localmente'}
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}

                  {/* FAQ List Cards */}
                  <div className="space-y-3">
                    {config.faqs.length > 0 ? (
                      config.faqs.map((item, idx) => (
                        <div key={idx} className="glass-panel p-5 rounded-2xl flex justify-between items-start gap-4 hover:border-gray-700/80 transition-all">
                          <div className="space-y-2 flex-1">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              <HelpCircle size={13} className="text-cyan-400" />
                              {item.q}
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans">{item.a}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEditFaq(idx)}
                              className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-gray-950 text-cyan-400 rounded transition-all cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteFaq(idx)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 rounded transition-all cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 bg-white/[0.01] border border-gray-800/40 rounded-2xl text-center text-gray-500 text-xs">
                        No hay preguntas frecuentes registradas.
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

              {/* TAB: COMMENTS */}
              {activeTab === 'comments' && (
                <motion.div
                  key="comments-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6 text-left"
                >
                  <div className="flex justify-between items-center bg-white/[0.01] border border-gray-800/40 p-4 rounded-xl">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase">Moderación de Comentarios</h3>
                      <p className="text-xs text-gray-500 mt-1">Revisa y aprueba los testimonios de los clientes para el sitio público.</p>
                    </div>
                  </div>

                  {commentsLoading ? (
                    <div className="text-center py-10 text-xs text-cyan-400 animate-pulse">
                      Cargando comentarios...
                    </div>
                  ) : adminComments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {adminComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="glass-panel p-5 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4 hover:border-gray-700/80 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white">{comment.client_name}</span>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={i < comment.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed italic">
                              "{comment.comment}"
                            </p>
                          </div>

                          <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              comment.is_approved 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {comment.is_approved ? 'Publicado / Aprobado' : 'Pendiente Moderación'}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveComment(comment.id, comment.is_approved)}
                                className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                                  comment.is_approved
                                    ? 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-gray-950'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950'
                                }`}
                                title={comment.is_approved ? 'Desaprobar / Ocultar' : 'Aprobar / Publicar'}
                              >
                                {comment.is_approved ? <X size={12} /> : <Check size={12} />}
                                {comment.is_approved ? 'Ocultar' : 'Aprobar'}
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                title="Eliminar permanentemente"
                               >
                                <Trash2 size={12} />
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 bg-white/[0.01] border border-gray-800/40 rounded-2xl text-center text-gray-500 text-xs">
                      No hay comentarios de clientes en el sistema.
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB: CHATBOT */}
              {activeTab === 'chatbot' && (
                <motion.div
                  key="chatbot-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
                >
                  {/* Chat simulator panel */}
                  <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 flex flex-col h-[520px] overflow-hidden bg-black/20">
                    <div className="bg-[#1c1c1f] p-4 border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#68fcbf]/10 flex items-center justify-center border border-[#68fcbf]/30">
                          <MessageCircle className="text-[#68fcbf]" size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Simulador de WhatsApp (Chatbot)</h4>
                          <p className="text-[9px] text-gray-500 font-mono">Prueba la lógica conversacional del bot.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Conectado a FastAPI
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-3 custom-scrollbar flex flex-col">
                      {simMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col max-w-[80%] ${
                            msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                          }`}
                        >
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                              msg.sender === 'user'
                                ? 'bg-[#8aebff] text-gray-950 rounded-br-none'
                                : 'bg-white/5 border border-white/10 text-gray-300 rounded-bl-none'
                            }`}
                          >
                            {msg.text.split('\n').map((line, lIdx) => (
                              <span key={lIdx}>
                                {line.split('*').map((part, pIdx) => 
                                  pIdx % 2 === 1 ? <strong key={pIdx} className="font-extrabold text-white">{part}</strong> : part
                                )}
                                <br />
                              </span>
                            ))}
                          </div>
                          <span className="text-[8px] text-gray-500 mt-1 font-mono px-1">{msg.time}</span>
                        </div>
                      ))}
                      {simWriting && (
                        <div className="self-start flex items-center gap-1 bg-white/5 border border-white/10 p-2.5 rounded-2xl rounded-bl-none">
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSendSimMessage} className="p-3 border-t border-gray-800 bg-gray-900 flex gap-2">
                      <input
                        type="text"
                        value={simInput}
                        onChange={(e) => setSimInput(e.target.value)}
                        placeholder="Ingresa tu mensaje (ej: 'hola', '1', 'ORD-00042')"
                        className="flex-grow bg-black border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#8aebff] focus:ring-1 focus:ring-[#8aebff]/30"
                      />
                      <button
                        type="submit"
                        disabled={!simInput.trim() || simWriting}
                        className="p-2 bg-[#8aebff] hover:bg-[#8aebff]/90 disabled:opacity-50 text-[#001f25] rounded-xl transition-all cursor-pointer"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </div>

                  {/* Instructions panel */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 text-xs text-gray-400 space-y-4 h-fit">
                    <h4 className="text-white font-bold uppercase tracking-wider text-xs">Instrucciones de Prueba</h4>
                    <p>
                      Este simulador interactúa directamente con el webhook del chatbot de la base de datos.
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-gray-500 uppercase block">Número de Teléfono Virtual</label>
                      <input
                        type="text"
                        value={simPhone}
                        onChange={(e) => setSimPhone(e.target.value)}
                        className={inputClass}
                        placeholder="Ej: +56999999999"
                      />
                    </div>

                    <div className="border-t border-white/5 pt-4 space-y-2">
                      <h5 className="font-bold text-white text-[10px] uppercase">Comandos recomendados:</h5>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] font-sans">
                        <li>Escribe <span className="font-mono text-cyan-400">hola</span> o <span className="font-mono text-cyan-400">menu</span> para iniciar.</li>
                        <li>Escribe <span className="font-mono text-cyan-400">1</span> para ver cómo consultar reparación.</li>
                        <li>Escribe una orden y su teléfono registrado, ej: <span className="font-mono text-cyan-400">ORD-00042 12345678</span>.</li>
                        <li>Escribe <span className="font-mono text-cyan-400">2</span> para ver la lista de FAQs.</li>
                        <li>Escribe <span className="font-mono text-cyan-400">3</span> para ver ubicación y contacto.</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}


            </AnimatePresence>
          )}

        </div>

      </div>
    </div>
  )
}
