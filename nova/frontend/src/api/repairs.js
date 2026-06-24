import api from './client'

export const getRepairs = (params) => api.get('/repairs/', { params })
export const getRepair = (id) => api.get(`/repairs/${id}`)
export const createRepair = (data) => api.post('/repairs/', data)
export const updateRepairStatus = (id, data) => api.patch(`/repairs/${id}/status`, data)
export const createClient = (data) => api.post('/clients/', data)
export const searchClients = (search) => api.get('/clients/', { params: { search } })
export const getUpcomingDeliveries = (days = 60) => api.get('/repairs/upcoming', { params: { days } })
export const updateRepair = (id, data) => api.patch(`/repairs/${id}`, data)
export const getRepairStats = (params) => api.get('/repairs/stats', { params })
