import api from './client'

export const getUsersList = async (params = {}) => {
  const response = await api.get('/admin/users', { params })
  return response.data
}

export const createUser = async (userData) => {
  const response = await api.post('/admin/users', userData)
  return response.data
}

export const updateUser = async (userId, data) => {
  const response = await api.patch(`/admin/users/${userId}`, data)
  return response.data
}

export const resetUserPassword = async (userId, newPassword) => {
  const response = await api.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword })
  return response.data
}

export const deleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`)
  return response.data
}
