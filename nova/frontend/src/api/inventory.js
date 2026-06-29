import api from './client'

export const getInventoryItems = (params) => api.get('/inventory/', { params })
export const getInventoryItem = (id) => api.get(`/inventory/${id}`)
export const createInventoryItem = (data) => api.post('/inventory/', data)
export const updateInventoryItem = (id, data) => api.patch(`/inventory/${id}`, data)
export const getLowStockAlerts = () => api.get('/inventory/alerts')
export const useItemsInRepair = (repairId, items) => api.post(`/inventory/repairs/${repairId}/use-items`, items)
export const deleteInventoryItem = (id) => api.delete(`/inventory/${id}`)