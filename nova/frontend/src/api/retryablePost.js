// Una operación conserva su clave hasta recibir una respuesta definitiva.
// sessionStorage permite recuperar el mismo envío tras recargar la pestaña.
export async function retryablePost(api, url, payload) {
  const token = localStorage.getItem('access_token') || ''
  let owner = token
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    owner = JSON.parse(atob(encodedPayload)).sub
  } catch {
    // Los tokens opacos también quedan separados por sesión.
  }
  const storageKey = 'bravo:pending:' + JSON.stringify([owner, url, payload])
  let key = sessionStorage.getItem(storageKey)
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 15) | 64
    bytes[8] = (bytes[8] & 63) | 128
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    key = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
    sessionStorage.setItem(storageKey, key)
  }
  try {
    const response = await api.post(url, payload, {
      headers: { 'Idempotency-Key': key },
    })
    sessionStorage.removeItem(storageKey)
    return response
  } catch (error) {
    const status = error.response?.status
    // Un corte, timeout o error del servidor puede ocurrir después del commit.
    if ([400, 409, 422].includes(status)) {
      sessionStorage.removeItem(storageKey)
    }
    throw error
  }
}
