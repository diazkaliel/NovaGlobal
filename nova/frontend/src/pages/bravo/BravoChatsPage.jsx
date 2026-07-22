import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Send, User, MessageCircle, Clock, ChevronLeft, ArrowLeft } from 'lucide-react'
import { getChatsInbox, getClientChat, sendChatMessage } from '../../api/chats'
import { useSearchParams } from 'react-router-dom'
import BravoBackground from '../../components/bravo/BravoBackground'

const AVATAR_COLORS = [
  'bg-blue-500/10 border-blue-500/30 text-blue-400',
  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  'bg-rose-500/10 border-rose-500/30 text-rose-400',
  'bg-purple-500/10 border-purple-500/30 text-purple-400',
  'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  'bg-amber-500/10 border-amber-500/30 text-amber-400',
]

// Genera un color determinista basado en el nombre del cliente
const getAvatarColorClass = (name) => {
  if (!name) return AVATAR_COLORS[0]
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

// Obtiene las iniciales de un nombre
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }
  return name.charAt(0).toUpperCase()
}

export default function BravoChatsPage() {
  const [inbox, setInbox] = useState([])
  const [activeClient, setActiveClient] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [searchParams, setSearchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('client')

  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadInbox()
    // Polling del inbox cada 15 segundos
    const interval = setInterval(loadInbox, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeClient) {
      loadMessages(activeClient.client_id)
    }
  }, [activeClient])

  useEffect(() => {
    // Si viene un client_id en la URL y ya cargó el inbox, intentamos seleccionarlo
    if (clientIdFromUrl && inbox.length > 0 && !activeClient) {
      const client = inbox.find(c => c.client_id.toString() === clientIdFromUrl)
      if (client) {
        setActiveClient(client)
      }
    }
  }, [clientIdFromUrl, inbox])

  const loadInbox = async () => {
    try {
      const res = await getChatsInbox()
      setInbox(res.data)
      setLoading(false)
    } catch (error) {
      console.error("Error loading inbox", error)
      setLoading(false)
    }
  }

  const loadMessages = async (clientId) => {
    try {
      const res = await getClientChat(clientId)
      setMessages(res.data)
      scrollToBottom()
      
      // Actualizar el inbox localmente para quitar el badge de no leídos
      setInbox(prev => prev.map(c => 
        c.client_id === clientId ? { ...c, unread_count: 0 } : c
      ))
      
      // Forzar actualización del badge global en el sidebar
      window.dispatchEvent(new Event('chat_read'))
    } catch (error) {
      console.error("Error loading messages", error)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !activeClient) return

    try {
      const res = await sendChatMessage(activeClient.client_id, messageInput)
      setMessages([...messages, res.data])
      setMessageInput('')
      scrollToBottom()
      
      // Actualizar el último mensaje en el inbox
      setInbox(prev => prev.map(c => 
        c.client_id === activeClient.client_id 
          ? { ...c, latest_message: res.data.message, latest_message_date: res.data.created_at }
          : c
      ))
    } catch (error) {
      console.error("Error sending message", error)
    }
  }

  const formatDate = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatInboxDate = (dateString) => {
    const d = new Date(dateString)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  }

  // Filtrar el inbox según la búsqueda
  const filteredInbox = inbox.filter(chat => 
    chat.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (chat.client_phone && chat.client_phone.includes(searchQuery))
  )

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col relative text-left">
      <BravoBackground />

      {/* Header General */}
      <div className="flex items-center gap-3 border-b border-bravo-border pb-4 mb-4">
        <div className="p-1.5 rounded-lg border border-bravo-border bg-bravo-accent/15 text-bravo-accent flex items-center justify-center">
          <MessageCircle size={16} />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-widest text-white uppercase leading-none">
            Bandeja de Chats
          </h1>
          <p className="text-bravo-text-muted text-[9px] uppercase tracking-wider mt-1 font-mono">Taller de Bravo</p>
        </div>
      </div>

      {/* Main chat box grid */}
      <div className="flex-1 w-full bg-[#101017]/80 border border-bravo-border/60 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl backdrop-blur-xl">
        
        {/* LADO IZQUIERDO: INBOX */}
        <div className={`w-full md:w-80 border-r border-bravo-border/40 flex flex-col bg-[#0c0c10] ${activeClient ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-bravo-border/20 bg-zinc-950/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" size={14} />
              <input 
                type="text" 
                placeholder="Buscar conversación..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-bravo-accent/50 transition-colors font-sans placeholder-stone-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-0.5 bravo-scrollbar">
            {loading ? (
              <div className="p-10 text-center text-zinc-500 text-xs font-mono animate-pulse">Cargando bandeja de entrada...</div>
            ) : filteredInbox.length === 0 ? (
              <div className="p-10 text-center text-zinc-650 text-xs flex flex-col items-center justify-center h-full space-y-2">
                <MessageCircle size={28} className="opacity-20 text-zinc-500" />
                <p className="font-semibold">No hay chats que coincidan</p>
              </div>
            ) : (
              filteredInbox.map(client => {
                const isActive = activeClient?.client_id === client.client_id
                const initials = getInitials(client.client_name)
                const avatarColor = getAvatarColorClass(client.client_name)

                return (
                  <button
                    key={client.client_id}
                    onClick={() => {
                      setActiveClient(client)
                      setSearchParams({ client: client.client_id })
                    }}
                    className={`w-full p-4 text-left border-b border-bravo-border/10 hover:bg-white/[0.015] transition-colors flex gap-3 items-center ${
                      isActive ? 'bg-white/[0.025] border-l-2 border-l-bravo-accent' : ''
                    }`}
                  >
                    {/* Avatar de Iniciales */}
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 font-bold text-xs font-mono shadow-xs ${avatarColor}`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-white font-bold text-xs truncate pr-2">{client.client_name}</h3>
                        <span className="text-[9px] text-stone-500 shrink-0 font-mono">{formatInboxDate(client.latest_message_date)}</span>
                      </div>
                      <p className={`text-[11px] truncate ${client.unread_count > 0 ? 'text-zinc-100 font-extrabold' : 'text-zinc-550'}`}>
                        {client.latest_message}
                      </p>
                    </div>

                    {client.unread_count > 0 && (
                      <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm shadow-rose-900/10">
                        {client.unread_count}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* LADO DERECHO: CHAT ACTIVO */}
        <div className={`flex-1 flex flex-col bg-[#101017]/40 ${!activeClient ? 'hidden md:flex' : 'flex'}`}>
          {!activeClient ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-3">
              <MessageCircle size={44} className="opacity-15 text-bravo-accent" />
              <p className="text-xs uppercase tracking-widest font-mono text-zinc-650 font-bold">Selecciona un chat activo</p>
            </div>
          ) : (
            <>
              {/* HEADER DEL CHAT */}
              <div className="h-16 border-b border-bravo-border/20 bg-zinc-950/25 flex items-center px-4 justify-between shrink-0 font-sans">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setActiveClient(null)
                      setSearchParams({})
                    }}
                    className="md:hidden p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer mr-1"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 font-bold text-xs font-mono ${getAvatarColorClass(activeClient.client_name)}`}>
                    {getInitials(activeClient.client_name)}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xs">{activeClient.client_name}</h3>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{activeClient.client_phone || 'Sin teléfono'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-950" />
                  <span className="text-[9px] uppercase tracking-wider text-emerald-450 font-black font-mono">WhatsApp Conectado</span>
                </div>
              </div>

              {/* AREA DE MENSAJES */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pr-1 bravo-scrollbar bg-black/10">
                {messages.map((msg, idx) => {
                  const isAdmin = msg.sender === 'admin'
                  return (
                    <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md ${
                        isAdmin 
                          ? 'bg-bravo-accent text-black font-bold rounded-tr-sm rounded-2xl' 
                          : 'bg-[#101017] border border-bravo-border/40 text-zinc-200 rounded-tl-sm rounded-2xl'
                      }`}>
                        <div className="text-xs leading-relaxed font-sans">{msg.message}</div>
                        <div className={`text-[9px] mt-1.5 flex items-center gap-1.5 font-mono ${isAdmin ? 'text-black/60 justify-end' : 'text-zinc-500'}`}>
                          <Clock size={9} />
                          {formatDate(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT PARA ENVIAR */}
              <div className="p-4 bg-zinc-950/20 border-t border-bravo-border/20 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2.5">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Escribe la respuesta del taller aquí..."
                    className="flex-1 bg-bravo-input border border-bravo-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-bravo-accent/50 placeholder-stone-500 font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="w-12 h-12 rounded-xl bg-bravo-accent text-black flex items-center justify-center hover:bg-amber-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send size={16} className="stroke-[3]" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
