import api from './client'

export const clockIn = async (data = {}) => {
  const response = await api.post('/attendance/clock-in', data)
  return response.data
}

export const clockOut = async (data = {}) => {
  const response = await api.post('/attendance/clock-out', data)
  return response.data
}

export const getMyAttendanceStatus = async () => {
  const response = await api.get('/attendance/my-status')
  return response.data
}

export const getMyAttendanceHistory = async (params = {}) => {
  const response = await api.get('/attendance/my-history', { params })
  return response.data
}

export const getAdminAttendanceRecords = async (params = {}) => {
  const response = await api.get('/attendance/admin/records', { params })
  return response.data
}

export const updateAdminAttendanceRecord = async (recordId, data) => {
  const response = await api.patch(`/attendance/admin/records/${recordId}`, data)
  return response.data
}

export const deleteAdminAttendanceRecord = async (recordId) => {
  const response = await api.delete(`/attendance/admin/records/${recordId}`)
  return response.data
}
