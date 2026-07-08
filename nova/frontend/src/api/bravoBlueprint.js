import api from './client'

// 1. Asignación y Calendario de Maquinaria
export const getMachines = () => api.get('/api/bravo/machines')
export const createMachine = (data) => api.post('/api/bravo/machines', data)
export const updateMachine = (id, data) => api.patch(`/api/bravo/machines/${id}`, data)
export const reserveMachine = (data) => api.post('/api/bravo/machines/reserve', data)
export const deleteReservation = (id) => api.delete(`/api/bravo/machines/reserve/${id}`)

// 2. Biblioteca de Perfiles de Marca (Brand Kits)
export const getBrandKits = (clientId) => api.get(`/api/bravo/brand-kits/client/${clientId}`)
export const createBrandKit = (data) => api.post('/api/bravo/brand-kits', data)
export const deleteBrandKit = (id) => api.delete(`/api/bravo/brand-kits/${id}`)

// 3. Checklists de Control de Calidad (QA)
export const getQAInspection = (orderId) => api.get(`/api/bravo/qa/order/${orderId}`)
export const createQAInspection = (data) => api.post('/api/bravo/qa/inspect', data)

// 4. Gestión de Entregas Parciales (Split Orders)
export const splitOrder = (orderId, ratio = 0.5) => api.post(`/api/repairs/${orderId}/split?ratio=${ratio}`)
