import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, X, Globe, Save, Trash2, Edit2, 
  HelpCircle, Phone, Mail, MapPin, Check,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Star, MessageSquare
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getWebConfig, updateWebConfig } from '../../api/public'
import api from '../../api/client'
import { parseError } from '../../utils/errors'

const inputClass = "w-full bg-bravo-input border border-bravo-border hover:border-bravo-accent/40 focus:border-bravo-accent/70 rounded-xl px-4 py-2.5 text-sm text-bravo-text focus:outline-none transition-all duration-300 placeholder-stone-550"
const btnClass = "px-4 py-2.5 bg-bravo-accent hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shadow-md shadow-amber-900/10"

function Field({ label, children }) {
  return (
    <div className="text-left">
      <label className="text-bravo-text-muted text-[10px] tracking-wider uppercase block mb-1.5 font-bold">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function BravoAdminWebPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('general') // general, prices, faqs
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

  // Edit/Add price form
  const [editingPriceIndex, setEditingPriceIndex] = useState(null)
  const [priceForm, setPriceForm] = useState({
    device: '',
    service: '',
    price: '',
    time: '',
    category: 'Poleras'
  })
  const [showPriceForm, setShowPriceForm] = useState(false)

  // Edit/Add FAQ form
  const [editingFaqIndex, setEditingFaqIndex] = useState(null)
  const [faqForm, setFaqForm] = useState({
    q: '',
    a: ''
  })
  const [showFaqForm, setShowFaqForm] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getWebConfig({ system: 'bravo' })
      setConfig({
        whatsapp: res.data.whatsapp || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
        address: res.data.address || '',
        reference_prices: res.data.reference_prices || [],
        faqs: res.data.faqs || []
      })
    } catch (err) {
      setError(parseError(err, 'Error al cargar la configuración de la página web.'))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGeneral = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        ...config,
        system: 'bravo'
      }
      await updateWebConfig(payload, { system: 'bravo' })
      setSuccess('Configuración de contacto actualizada correctamente.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(parseError(err, 'Error al guardar los cambios.'))
    } finally {
      setSaving(false)
    }
  }

  // PRICES ACTIONS
  const handleAddOrEditPrice = (e) => {
    e.preventDefault()
    if (!priceForm.device || !priceForm.service || !priceForm.price || !priceForm.time) {
      setError('Por favor completa todos los campos de tarifa.')
      return
    }

    const updatedPrices = [...config.reference_prices]
    if (editingPriceIndex !== null) {
      updatedPrices[editingPriceIndex] = priceForm
    } else {
      updatedPrices.push(priceForm)
    }

    const newConfig = { ...config, reference_prices: updatedPrices }
    setConfig(newConfig)
    
    saveConfig(newConfig, editingPriceIndex !== null ? 'Tarifa editada exitosamente' : 'Tarifa agregada exitosamente')
    
    setPriceForm({ device: '', service: '', price: '', time: '', category: 'Poleras' })
    setShowPriceForm(false)
    setEditingPriceIndex(null)
  }

  const handleDeletePrice = (index) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta tarifa?')) return
    const updatedPrices = config.reference_prices.filter((_, idx) => idx !== index)
    const newConfig = { ...config, reference_prices: updatedPrices }
    setConfig(newConfig)
    saveConfig(newConfig, 'Tarifa eliminada exitosamente')
  }

  // FAQS ACTIONS
  const handleAddOrEditFaq = (e) => {
    e.preventDefault()
    if (!faqForm.q || !faqForm.a) {
      setError('Por favor completa todos los campos de la pregunta.')
      return
    }

    const updatedFaqs = [...config.faqs]
    if (editingFaqIndex !== null) {
      updatedFaqs[editingFaqIndex] = faqForm
    } else {
      updatedFaqs.push(faqForm)
    }

    const newConfig = { ...config, faqs: updatedFaqs }
    setConfig(newConfig)
    
    saveConfig(newConfig, editingFaqIndex !== null ? 'Pregunta editada exitosamente' : 'Pregunta agregada exitosamente')
    
    setFaqForm({ q: '', a: '' })
    setShowFaqForm(false)
    setEditingFaqIndex(null)
  }

  const handleDeleteFaq = (index) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta pregunta?')) return
    const updatedFaqs = config.faqs.filter((_, idx) => idx !== index)
    const newConfig = { ...config, faqs: updatedFaqs }
    setConfig(newConfig)
    saveConfig(newConfig, 'Pregunta eliminada exitosamente')
  }

  const saveConfig = async (newConfig, successMessage) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        ...newConfig,
        system: 'bravo'
      }
      await updateWebConfig(payload, { system: 'bravo' })
      setSuccess(successMessage)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(parseError(err, 'Error al actualizar base de datos.'))
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'Contacto General', icon: Phone },
    { id: 'faqs', label: 'FAQs Públicas', icon: HelpCircle },
  ]

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-bravo-border pb-5 text-left">
        <div>
          <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block">Configuración</span>
          <h1 className="text-2xl font-black italic tracking-tighter text-bravo-text uppercase">Administración Web Bravo</h1>
          <p className="text-bravo-text-muted text-xs mt-1">
            Modifica la información de contacto, tarifas estimadas y FAQs de la landing page pública de Bravo.
          </p>
        </div>
        <button
          onClick={() => navigate('/bravo')}
          className="px-4 py-2 bg-bravo-card border border-bravo-border hover:border-stone-400 text-bravo-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <ArrowLeft size={13} />
          Volver
        </button>
      </div>

      <div className="flex border-b border-bravo-border/60 gap-1.5 p-1 bg-bravo-card/50 rounded-2xl border w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-bravo-accent text-white shadow-sm font-extrabold'
                : 'text-bravo-text-muted hover:text-bravo-text hover:bg-white/5'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center gap-2.5 text-left font-semibold"
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
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs flex items-center gap-2.5 text-left font-semibold"
          >
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-20 text-center text-xs text-bravo-accent font-bold animate-pulse">
          Cargando configuración...
        </div>
      ) : (
        <div className="bg-bravo-card/30 border border-bravo-border rounded-3xl p-6 md:p-8 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            
            {activeTab === 'general' && (
              <motion.div
                key="general-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6 text-left"
              >
                <form onSubmit={handleSaveGeneral} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-bravo-text uppercase">Perfil de Contacto Público</h3>
                    <p className="text-xs text-bravo-text-muted mt-1">Esta información se lee dinámicamente en el pie de página y botones de compra.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Número de WhatsApp (con código de país, ej: +56987654321)">
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-stone-500"><Phone size={14} /></span>
                        <input
                          type="text"
                          value={config.whatsapp}
                          onChange={e => setConfig({ ...config, whatsapp: e.target.value })}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="+56987654321"
                        />
                      </div>
                    </Field>

                    <Field label="Teléfono de Oficina / Soporte">
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-stone-500"><Phone size={14} /></span>
                        <input
                          type="text"
                          value={config.phone}
                          onChange={e => setConfig({ ...config, phone: e.target.value })}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="+5622345678"
                        />
                      </div>
                    </Field>

                    <Field label="Correo Electrónico de Contacto">
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-stone-500"><Mail size={14} /></span>
                        <input
                          type="email"
                          value={config.email}
                          onChange={e => setConfig({ ...config, email: e.target.value })}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="hola@bravopersonalizados.com"
                        />
                      </div>
                    </Field>

                    <Field label="Dirección Física del Taller">
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-stone-500"><MapPin size={14} /></span>
                        <input
                          type="text"
                          value={config.address}
                          onChange={e => setConfig({ ...config, address: e.target.value })}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="Av. Italia 567, Providencia, Santiago"
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="pt-4 border-t border-bravo-border flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className={btnClass}
                    >
                      <Save size={14} />
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}



            {activeTab === 'faqs' && (
              <motion.div
                key="faqs-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6 text-left"
              >
                <div className="flex justify-between items-center bg-stone-900/10 border border-bravo-border p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-bold text-bravo-text uppercase">Preguntas Frecuentes (FAQs)</h3>
                    <p className="text-xs text-bravo-text-muted mt-1">Configura las preguntas frecuentes que ven los clientes en el sitio web.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFaqForm({ q: '', a: '' })
                      setEditingFaqIndex(null)
                      setShowFaqForm(true)
                    }}
                    className={btnClass}
                  >
                    <Plus size={14} />
                    Agregar FAQ
                  </button>
                </div>

                <AnimatePresence>
                  {showFaqForm && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleAddOrEditFaq}
                      className="bg-stone-900/20 border border-bravo-border p-5 rounded-2xl space-y-4 overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-black uppercase text-bravo-accent">
                          {editingFaqIndex !== null ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowFaqForm(false)}
                          className="text-stone-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <Field label="Pregunta">
                          <input
                            type="text"
                            value={faqForm.q}
                            onChange={e => setFaqForm({ ...faqForm, q: e.target.value })}
                            placeholder="¿Hacen envíos a regiones?"
                            required
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Respuesta">
                          <textarea
                            rows="3"
                            value={faqForm.a}
                            onChange={e => setFaqForm({ ...faqForm, a: e.target.value })}
                            placeholder="Sí, enviamos a todo Chile mediante Starken y Chilexpress con cobro en destino..."
                            required
                            className={inputClass}
                          />
                        </Field>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowFaqForm(false)}
                          className="px-4 py-2 bg-stone-900 border border-bravo-border text-bravo-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className={btnClass}
                        >
                          {editingFaqIndex !== null ? 'Guardar Cambios' : 'Agregar'}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {config.faqs.length > 0 ? (
                  <div className="space-y-4">
                    {config.faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-900/5 border border-bravo-border p-5 rounded-2xl flex flex-col justify-between space-y-3"
                      >
                        <div className="flex justify-between items-start gap-4 text-left">
                          <div>
                            <h4 className="text-sm font-bold text-bravo-text">❓ {faq.q}</h4>
                            <p className="text-xs text-bravo-text-muted mt-2 leading-relaxed whitespace-pre-wrap">{faq.a}</p>
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setFaqForm(faq)
                                setEditingFaqIndex(idx)
                                setShowFaqForm(true)
                              }}
                              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteFaq(idx)}
                              className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 bg-stone-900/5 border border-bravo-border rounded-3xl text-center text-bravo-text-muted text-xs font-semibold">
                    No hay preguntas frecuentes registradas.
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
