import api from './client'

export const getCashRegisterStatus = (params) => {
  return api.get('/cash-register/status', { params })
}

export const openCashRegisterSession = (data) => {
  return api.post('/cash-register/open', data)
}

export const closeCashRegisterSession = (sessionId, data) => {
  return api.post(`/cash-register/close/${sessionId}`, data)
}

export const addCashRegisterTransaction = (sessionId, data) => {
  return api.post(`/cash-register/transaction/${sessionId}`, data)
}
