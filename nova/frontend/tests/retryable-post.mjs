import assert from 'node:assert/strict'
import { retryablePost } from '../src/api/retryablePost.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}
globalThis.sessionStorage = memoryStorage()
globalThis.localStorage = memoryStorage()
const token = user => 'header.' + btoa(JSON.stringify({ sub: user })) + '.signature'
localStorage.setItem('access_token', token('1'))

const receivedKeys = []
let failure
const api = {
  post: async (url, payload, config) => {
    receivedKeys.push(config.headers['Idempotency-Key'])
    if (failure) throw failure
    return { data: { id: 12 } }
  },
}
const payload = { items: [{ catalog_product_id: 1, quantity: 2 }] }
for (const error of [
  new Error('Respuesta perdida'),
  { response: { status: 500 } },
  { response: { status: 401 } },
]) {
  failure = error
  await assert.rejects(retryablePost(api, '/bravo/orders', payload))
}
assert.equal(new Set(receivedKeys).size, 1, 'Se conserva la clave ante fallos y sesión expirada')
failure = undefined
await retryablePost(api, '/bravo/orders', payload)
assert.equal(receivedKeys.at(-1), receivedKeys[0])
await retryablePost(api, '/bravo/orders', payload)
assert.notEqual(receivedKeys.at(-1), receivedKeys[0], 'Un nuevo pedido confirmado tiene otra clave')

failure = { response: { status: 409 } }
await assert.rejects(retryablePost(api, '/bravo/orders', payload))
const rejectedKey = receivedKeys.at(-1)
failure = undefined
await retryablePost(api, '/bravo/orders', payload)
assert.notEqual(receivedKeys.at(-1), rejectedKey)

failure = new Error('Respuesta perdida')
await assert.rejects(retryablePost(api, '/bravo/orders/12/materials', [{ item_id: 2, quantity: 1 }]))
const firstUserKey = receivedKeys.at(-1)
localStorage.setItem('access_token', token('2'))
await assert.rejects(retryablePost(api, '/bravo/orders/12/materials', [{ item_id: 2, quantity: 1 }]))
assert.notEqual(receivedKeys.at(-1), firstUserKey)
localStorage.setItem('access_token', token('1'))
failure = undefined
await retryablePost(api, '/bravo/orders/12/materials', [{ item_id: 2, quantity: 1 }])
assert.equal(receivedKeys.at(-1), firstUserKey)
await retryablePost(api, '/bravo/orders/12/materials', [{ item_id: 2, quantity: 1 }])
assert.notEqual(receivedKeys.at(-1), firstUserKey, 'Otro consumo intencional usa una nueva clave')
console.log('OK: reintentos, rechazo, sesión expirada, aislamiento y nuevos consumos')
