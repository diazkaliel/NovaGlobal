import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, User, Phone, Sparkles, Check, Clock, Bot, ShieldCheck } from 'lucide-react'
import { sendPublicChatMessage, getPublicChatMessages } from '../../api/public'

const QUICK_SUGGESTIONS = [
  '¿Cuál es el tiempo de entrega habitual?',
  '¿Qué formato y resolución debe tener mi diseño?',
  '¿Hacen envíos a regiones o solo retiro en Quillota?',
  '¿Tienen DTF UV con relieve para termos tipo Stanley?'
]

export default function BravoLiveChatWidget({ initialPhone = '', initialName = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [clientInfo, setClientInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('bravo_chat_client')
      return saved ? JSON.parse(saved) : { name: initialName || '', phone: initialPhone || '' }
    } catch {
      return { name: initialName || '', phone: initialPhone || '' }
    }
  })

  const [hasIdentified, setHasIdentified] = useState(() => {
    try {
      const saved = localStorage.getItem('bravo_chat_client')
      if (!saved) return false
      const parsed = JSON.parse(saved)
      return Boolean(parsed.phone && parsed.name)
    } catch {
      return false
    }
  })

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingMessages, setFetchingMessages] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef(null)
  const pollIntervalRef = useRef(null)

  // Sincronizar teléfono/nombre si viene desde el formulario de cotización o mockup
  useEffect(() => {
    if (initialPhone && !clientInfo.phone) {
      const updated = { name: initialName || clientInfo.name || 'Cliente Web', phone: initialPhone }
      setClientInfo(updated)
      setHasIdentified(true)
      localStorage.setItem('bravo_chat_client', JSON.stringify(updated))
    }
  }, [initialPhone, initialName])

  // Desplazar al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Cargar historial de mensajes del cliente
  const fetchMessages = async () => {
    if (!clientInfo.phone) return
    try {
      const res = await getPublicChatMessages(clientInfo.phone, 'bravo')
      const newMsgs = res.data || []
      
      // Si la ventana está cerrada y hay mensajes nuevos del admin, incrementar no leídos
      if (!isOpen && newMsgs.length > messages.length) {
        const lastMsg = newMsgs[newMsgs.length - 1]
        if (lastMsg.sender === 'admin') {
          setUnreadCount(prev => prev + 1)
        }
      }

      setMessages(newMsgs)
    } catch (err) {
      console.warn('Error al sincronizar mensajes del chat:', err)
    }
  }

  // Polling activo cuando el chat está abierto o en segundo plano
  useEffect(() => {
    if (hasIdentified && clientInfo.phone) {
      fetchMessages()
      const intervalMs = isOpen ? 4000 : 15000
      pollIntervalRef.current = setInterval(fetchMessages, intervalMs)
      return () => clearInterval(pollIntervalRef.current)
    }
  }, [hasIdentified, clientInfo.phone, isOpen, messages.length])

  // Reset de contador de no leídos al abrir
  const handleToggleOpen = () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    if (nextState) {
      setUnreadCount(0)
      setTimeout(scrollToBottom, 200)
    }
  }

  // Enviar mensaje inicial de identificación
  const handleIdentifyAndSend = async (e) => {
    e.preventDefault()
    if (!clientInfo.name.trim() || !clientInfo.phone.trim()) return

    const sanitized = {
      name: clientInfo.name.trim(),
      phone: clientInfo.phone.trim()
    }
    setClientInfo(sanitized)
    setHasIdentified(true)
    localStorage.setItem('bravo_chat_client', JSON.stringify(sanitized))

    if (inputText.trim()) {
      await handleSendMessage(inputText.trim(), sanitized)
    }
  }

  // Enviar mensaje al taller
  const handleSendMessage = async (textToSend, customClient = null) => {
    const text = textToSend || inputText
    if (!text.trim()) return

    const currentClient = customClient || clientInfo
    if (!currentClient.phone) return

    setLoading(true)
    try {
      const payload = {
        client_name: currentClient.name || 'Cliente Web',
        client_phone: currentClient.phone,
        message: text.trim(),
        system: 'bravo'
      }

      const res = await sendPublicChatMessage(payload)
      setMessages(prev => [...prev, res.data])
      setInputText('')
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Error al enviar mensaje al taller:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ─── BOTÓN FLOTANTE DISPARADOR (ESTILO MONOPO OBSIDIAN / ORO TALLER) ─── */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <motion.button
          type="button"
          onClick={handleToggleOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative px-4 py-3 rounded-full bg-[#0c0e14] hover:bg-[#141822] text-white border border-amber-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex items-center gap-2.5 group cursor-pointer"
          aria-label="Abrir chat de taller"
        >
          {/* Indicador de taller en vivo con pulso */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>

          <MessageSquare size={16} className="text-amber-400 group-hover:rotate-6 transition-transform" />
          
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Chat con Taller
          </span>

          {/* Badge de mensajes no leídos del taller */}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black font-mono animate-bounce shadow">
              {unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* ─── MODAL / VENTANA DEL CHAT EN VIVO ──────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-22 right-4 sm:right-6 w-[94vw] sm:w-[410px] max-h-[82vh] h-[580px] bg-[#0c0e14] border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] z-50 flex flex-col overflow-hidden text-left font-sans"
          >
            {/* Header del Chat */}
            <div className="p-4 bg-gradient-to-r from-[#12151f] to-[#0a0c12] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 bg-black flex items-center justify-center shrink-0">
                  <img src="/logo-bravo.jpg" alt="Bravo Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Personalizaciones Bravo
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 text-[9px] font-mono border border-amber-500/30">
                      Taller Directo
                    </span>
                  </div>
                  <span className="text-[10px] text-white/50 font-mono flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Equipo en línea · Quillota
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar chat"
              >
                <X size={15} />
              </button>
            </div>

            {/* Contenido Principal */}
            {!hasIdentified ? (
              /* Pantalla de Identificación Rápida (Nombre + WhatsApp) */
              <div className="p-6 flex-1 flex flex-col justify-center space-y-4 bg-[#080a0f]">
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Conéctate con el Taller
                  </h4>
                  <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
                    Sin necesidad de número de orden. Déjanos tu nombre y WhatsApp para responderte en directo o continuar por chat:
                  </p>
                </div>

                <form onSubmit={handleIdentifyAndSend} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-white/60 font-bold block">
                      Tu Nombre
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Marcelo Díaz"
                        value={clientInfo.name}
                        onChange={e => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[#12151e] border border-white/10 focus:border-amber-400/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-white/60 font-bold block">
                      WhatsApp o Teléfono
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="tel"
                        required
                        placeholder="Ej: +56 9 6754 7300"
                        value={clientInfo.phone}
                        onChange={e => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-[#12151e] border border-white/10 focus:border-amber-400/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-white/60 font-bold block">
                      ¿En qué podemos ayudarte?
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Escribe tu consulta sobre estampados, DTF o cotizaciones..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      className="w-full bg-[#12151e] border border-white/10 focus:border-amber-400/80 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Iniciar Conversación</span>
                    <Send size={13} />
                  </button>
                </form>
              </div>
            ) : (
              /* Flujo Activo de Conversación en Tiempo Real */
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#090b10]">
                {/* Info Bar del Cliente */}
                <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between text-[10px] font-mono text-white/50">
                  <span>Chat con: <strong className="text-amber-300">{clientInfo.name}</strong> ({clientInfo.phone})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasIdentified(false)
                    }}
                    className="text-white/40 hover:text-white underline cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>

                {/* Lista de Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bravo-scrollbar">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Bot size={18} />
                      </div>
                      <p className="text-xs text-white/70 max-w-[240px]">
                        ¡Hola {clientInfo.name}! Estamos en el taller listos para responder tus dudas sobre DTF Textil, DTF UV o sublimación.
                      </p>
                      
                      {/* Sugerencias Rápidas */}
                      <div className="w-full space-y-1.5 pt-2 text-left">
                        <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono block text-center">
                          Preguntas habituales:
                        </span>
                        {QUICK_SUGGESTIONS.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(q)}
                            className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/30 text-white/80 hover:text-amber-300 text-[11px] transition-all cursor-pointer"
                          >
                            • {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isClient = m.sender === 'client'
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[9px] font-mono text-white/40 mb-1 px-1">
                            {isClient ? 'Tú' : (m.author_name || 'Taller Bravo')}
                          </span>
                          <div
                            className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isClient
                                ? 'bg-amber-400 text-black font-medium rounded-tr-none shadow-md'
                                : 'bg-[#161a24] text-white border border-white/10 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.message}</p>
                          </div>
                          <span className="text-[8px] font-mono text-white/30 mt-0.5 px-1">
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input y Botón de Envío */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="p-3 bg-[#0c0e14] border-t border-white/10 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Escribe tu mensaje al taller..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-[#12151e] border border-white/10 focus:border-amber-400/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 text-black flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md shadow-amber-400/20"
                    title="Enviar mensaje"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}

            {/* Footer de Seguridad */}
            <div className="px-4 py-2 bg-black border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-white/40">
              <span className="flex items-center gap-1">
                <ShieldCheck size={11} className="text-amber-400" />
                Sincronizado con Mesa de Producción Bravo
              </span>
              <span>Quillota · Chile</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
