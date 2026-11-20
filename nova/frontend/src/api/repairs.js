import api from './client'

export const getRepairs = (params = {}) => api.get('/repairs/', { params: { limit: 200, ...params } })
export const getRepair = (id) => api.get(`/repairs/${id}`)
export const createRepair = (data) => api.post('/repairs/', data)
export const updateRepairStatus = (id, data) => api.patch(`/repairs/${id}/status`, data)
export const createClient = (data, params = {}) => api.post('/clients/', data, { params })
export const searchClients = (search, system) =>
  api.get('/clients/', { params: system ? { search, system } : { search } })
export const getUpcomingDeliveries = (days = 60) => api.get('/repairs/upcoming', { params: { days } })
export const updateRepair = (id, data) => api.patch(`/repairs/${id}`, data)
export const getRepairStats = (params) => api.get('/repairs/stats', { params })
export const deleteRepair = (id) => api.delete(`/repairs/${id}`)

// Admin Comments
export const getRepairComments = (id) => api.get(`/repairs/${id}/comments`)
export const createRepairComment = (id, data) => api.post(`/repairs/${id}/comments`, data)

