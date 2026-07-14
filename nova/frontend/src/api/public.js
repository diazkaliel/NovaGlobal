import axios from 'axios'
import api from './client'
import { isLocalHost } from '../utils/system'

const getBaseURL = () => {
  const host = window.location.hostname;
  const port = window.location.port;
  if (isLocalHost(host) || port) {
    return `http://${host}:8000`;
  }
  const parts = host.split('.');
  const rootDomain = parts.slice(-2).join('.');
  return `https://api.${rootDomain}`;
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

// Order/Repair Chat Comments
export const getTrackComments = (orderNumber, rutOrPhone) =>
  publicApi.get(`/public/repairs/track/comments?order_number=${orderNumber}&rut_or_phone=${rutOrPhone}`)
export const createTrackComment = (data) =>
  publicApi.post('/public/repairs/track/comments', data)

// Upload design files publicly
export const uploadPublicDesign = (formData) =>
  publicApi.post('/public/upload-design', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// Quote Approval
export const acceptQuote = (orderNumber, rutOrPhone) =>
  publicApi.post(`/public/proof/${orderNumber}/accept-quote`, { rut_or_phone: rutOrPhone })
export const rejectQuote = (orderNumber, rutOrPhone, reason) =>
  publicApi.post(`/public/proof/${orderNumber}/reject-quote`, { rut_or_phone: rutOrPhone, reason })

export default publicApi
