import api from './client'

export const getSales = (params) => {
  return api.get('/sales/', { params })
}

export const createSale = (data) => {
  return api.post('/sales/', data)
}

export const getSaleStats = (params) => {
  return api.get('/sales/stats', { params })
}
