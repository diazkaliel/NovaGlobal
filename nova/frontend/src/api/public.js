import axios from 'axios'
import api from './client'

const getBaseURL = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
    return `http://${host}:8000`;
  }
  // Se comunica con api.novalogtecnologies.com o api.tudominio.com correspondiente
  const cleanHost = host.replace(/^(nova\.|bravo\.|admin\.)/, '');
  return `https://api.${cleanHost}`;
};

const publicApi = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

export const getPublicProducts = () => publicApi.get('/public/products')
export const trackRepair = (orderNumber, rutOrPhone) => 
  publicApi.get(`/public/repairs/track?order_number=${orderNumber}&rut_or_phone=${rutOrPhone}`)
export const requestRepair = (data) => publicApi.post('/public/repair-requests', data)
export const requestOrder = (data) => publicApi.post('/public/order-requests', data)

export const getWebConfig = (params) => publicApi.get('/public/web-config', { params })
export const updateWebConfig = (data, params) => api.post('/public/web-config', data, { params })

// Comments Endpoints
export const getPublicComments = () => publicApi.get('/public/comments')
export const createPublicComment = (data) => publicApi.post('/public/comments', data)

// Admin Comments Moderation
export const getAdminComments = () => api.get('/comments/admin')
export const toggleCommentApproval = (commentId, isApproved) => 
  api.patch(`/comments/${commentId}/approve?is_approved=${isApproved}`)
export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`)

// Chatbot Simulation
export const simulateWhatsAppMessage = (data) => publicApi.post('/public/whatsapp/simulate', data)

export default publicApi

