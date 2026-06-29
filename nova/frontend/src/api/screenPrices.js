import api from './client'

export const getScreenPrices = () => api.get('/screen-prices/')
export const createScreenPrice = (data) => api.post('/screen-prices/', data)
export const updateScreenPrice = (id, data) => api.put(`/screen-prices/${id}`, data)
export const deleteScreenPrice = (id) => api.delete(`/screen-prices/${id}`)
