import api from './client'

export const getUnreadCount = (params) => {
  return api.get('/chats/unread_count', { params })
}

export const getChatsInbox = (params) => {
  return api.get('/chats/inbox', { params })
}

export const getClientChat = (clientId, params) => {
  return api.get(`/chats/${clientId}`, { params })
}

export const sendChatMessage = (clientId, message, params) => {
  return api.post(`/chats/${clientId}`, { message }, { params })
}
