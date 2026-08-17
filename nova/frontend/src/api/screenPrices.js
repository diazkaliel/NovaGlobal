import api from './client'

export const getScreenPrices = () => api.get('/screen-prices/')
export const createScreenPrice = (data) => api.post('/screen-prices/', data)
export const updateScreenPrice = (id, data) => api.put(`/screen-prices/${id}`, data)
export const deleteScreenPrice = (id) => api.delete(`/screen-prices/${id}`)

export const bulkUploadScreenPrices = (file, defaultMargin = 100) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('default_margin', defaultMargin)
  return api.post('/screen-prices/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const downloadScreenPricesTemplate = () => {
  return api.get('/screen-prices/template-csv', {
    responseType: 'blob'
  })
}

