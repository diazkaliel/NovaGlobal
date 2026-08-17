import api from './client'

export const getInventoryItems = (params) => api.get('/inventory/', { params })
export const getInventoryItem = (id) => api.get(`/inventory/${id}`)
export const createInventoryItem = (data) => api.post('/inventory/', data)
export const updateInventoryItem = (id, data) => api.patch(`/inventory/${id}`, data)
export const getLowStockAlerts = () => api.get('/inventory/alerts')
export const useItemsInRepair = (repairId, items) => api.post(`/inventory/repairs/${repairId}/use-items`, items)
export const deleteInventoryItem = (id) => api.delete(`/inventory/${id}`)

export const bulkUploadInventory = (file, system = 'bravo') => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/inventory/bulk-upload?system=${system}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const downloadInventoryTemplate = async (system = 'bravo') => {
  const response = await api.get(`/inventory/template-csv?system=${system}`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `plantilla_inventario_${system}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}