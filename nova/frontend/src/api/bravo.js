import api from './client'

// Bravo tiene contratos propios: los ID de Nova no son válidos en estos endpoints.
export const getBravoOrders = (params = {}) => api.get('/bravo/orders', { params })
export const getBravoOrderCounts = () => api.get('/bravo/orders/counts')
export const getBravoCalendarOrders = (params) => api.get('/bravo/calendar', { params })
export const getBravoCatalog = (params = {}, signal) =>
  api.get('/bravo/catalog', { params, signal })
export const getBravoOrder = (orderId) => api.get(`/bravo/orders/${orderId}`)
export const createBravoOrder = (order) => api.post('/bravo/orders', order)
export const updateBravoOrder = (orderId, changes) => api.patch(`/bravo/orders/${orderId}`, changes)
export const updateBravoOrderStatus = (orderId, newStatus, note = null) =>
  api.patch(`/bravo/orders/${orderId}/status`, { new_status: newStatus, note })
export const deleteBravoOrder = (orderId) => api.delete(`/bravo/orders/${orderId}`)

export const getBravoInventoryItems = (params = {}) => api.get('/bravo/inventory', { params })
export const createBravoInventoryItem = (product) => api.post('/bravo/inventory', product)
export const updateBravoInventoryItem = (productId, changes) => api.patch(`/bravo/inventory/${productId}`, changes)
export const deleteBravoInventoryItem = (productId) => api.delete(`/bravo/inventory/${productId}`)
export const addBravoOrderMaterials = (orderId, materials) =>
  api.post(`/bravo/orders/${orderId}/materials`, materials)
