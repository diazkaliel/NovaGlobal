import api from './client'

export const getUnreadCount = () => {
  return api.get('/chats/unread_count')
}

export const getChatsInbox = () => {
  return api.get('/chats/inbox')
}

export const getClientChat = (clientId) => {
  return api.get(`/chats/${clientId}`)
}

export const sendChatMessage = (clientId, message) => {
  return api.post(`/chats/${clientId}`, { message })
}
