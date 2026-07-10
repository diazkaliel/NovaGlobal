import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Send, User, MessageCircle, Clock, ChevronLeft } from 'lucide-react'
import { getChatsInbox, getClientChat, sendChatMessage } from '../../api/chats'
import { useSearchParams } from 'react-router-dom'

export default function BravoChatsPage() {
  const [inbox, setInbox] = useState([])
  const [activeClient, setActiveClient] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [searchParams, setSearchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('client')

  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadInbox()
    // Polling del inbox cada 30 segundos
    const interval = setInterval(loadInbox, 30000)
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
    return d.toLocaleDateString()
  }

  return (
    <div className="h-screen w-full flex bg-bravo-bg overflow-hidden p-4 md:p-6 pb-20 md:pb-6 pt-20 md:pt-6">
      <div className="w-full h-full bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl backdrop-blur-xl">
        
        {/* LADO IZQUIERDO: INBOX */}
        <div className={`w-full md:w-96 border-r border-zinc-800 flex flex-col bg-zinc-950/50 ${activeClient ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/80">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 mb-4">
              <MessageCircle className="text-bravo-accent" /> Mensajes
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-bravo-accent/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">Cargando chats...</div>
            ) : inbox.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm flex flex-col items-center">
                <MessageCircle size={32} className="mb-2 opacity-20" />
                No hay chats activos.
              </div>
            ) : (
              inbox.map(client => (
                <button
                  key={client.client_id}
                  onClick={() => {
                    setActiveClient(client)
                    setSearchParams({ client: client.client_id })
                  }}
                  className={`w-full p-4 text-left border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors flex gap-3 ${activeClient?.client_id === client.client_id ? 'bg-zinc-800/50 border-l-2 border-l-bravo-accent' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <User size={20} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="text-zinc-200 font-semibold truncate pr-2">{client.client_name}</h3>
                      <span className="text-xs text-zinc-500 shrink-0">{formatInboxDate(client.latest_message_date)}</span>
                    </div>
                    <p className={`text-sm truncate ${client.unread_count > 0 ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                      {client.latest_message}
                    </p>
                  </div>
                  {client.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-bravo-accent flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-1">
                      {client.unread_count}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* LADO DERECHO: CHAT ACTIVO */}
        <div className={`flex-1 flex-col bg-zinc-900/30 ${!activeClient ? 'hidden md:flex' : 'flex'}`}>
          {!activeClient ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p>Selecciona un chat para comenzar a enviar mensajes</p>
            </div>
          ) : (
            <>
              {/* HEADER DEL CHAT */}
              <div className="h-16 border-b border-zinc-800 bg-zinc-950/80 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setActiveClient(null)
                      setSearchParams({})
                    }}
                    className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User size={18} className="text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-zinc-100 font-bold">{activeClient.client_name}</h3>
                    <p className="text-xs text-zinc-500">{activeClient.client_phone || 'Sin teléfono'}</p>
                  </div>
                </div>
              </div>

              {/* AREA DE MENSAJES */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => {
                  const isAdmin = msg.sender === 'admin'
                  return (
                    <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 ${
                        isAdmin 
                          ? 'bg-bravo-accent text-white rounded-tr-sm' 
                          : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                      }`}>
                        <div className="text-sm">{msg.message}</div>
                        <div className={`text-[10px] mt-1 flex items-center gap-1 ${isAdmin ? 'text-bravo-accent-warm/40 justify-end' : 'text-zinc-500'}`}>
                          <Clock size={10} />
                          {formatDate(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT PARA ENVIAR */}
              <div className="p-4 bg-zinc-950/80 border-t border-zinc-800">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-bravo-accent/50"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="w-12 h-12 rounded-xl bg-bravo-accent text-white flex items-center justify-center hover:bg-bravo-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
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
