import api from './client'

export const getActivityLogs = async (params = {}) => {
  const response = await api.get('/admin/activity-logs', { params })
  return response.data
}
