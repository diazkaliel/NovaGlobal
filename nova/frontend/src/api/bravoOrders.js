import api from './client'

export const getBravoOrders = (params) => api.get('/bravo/orders/', { params })
export const getBravoOrder = (id) => api.get(`/bravo/orders/${id}`)
export const getBravoOrderByNumber = (orderNumber) => api.get(`/bravo/orders/order/${orderNumber}`)
export const createBravoOrder = (data) => api.post('/bravo/orders/', data)
export const updateBravoOrderStatus = (id, data) => api.patch(`/bravo/orders/${id}/status`, data)
export const updateBravoOrder = (id, data) => api.patch(`/bravo/orders/${id}`, data)
export const getBravoOrderStats = () => api.get('/bravo/orders/stats')
