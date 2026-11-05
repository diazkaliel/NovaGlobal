import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const FRONTEND_URL = 'http://127.0.0.1:4173'
const API_PORT = '8000'
const SCREEN_WIDTHS = [320, 375, 390, 768, 1280]
const fixtureProducts = [
  {
    id: 20,
    name: 'Polera algodón QA',
    category: 'mercancia',
    stock: 15,
    min_stock: 3,
    cost_price: '4000.00',
    sale_price: '8000.00',
    image_url: null,
    system: 'bravo',
  },
  {
    id: 21,
    name: 'Tazón cerámica QA',
    category: 'mercancia',
    stock: 20,
    min_stock: 2,
    cost_price: '2500.00',
    sale_price: '4500.00',
    image_url: null,
    system: 'bravo',
  },
]
const simulatedClient = {
  id: 30,
  name: 'Cliente Bravo móvil QA',
  phone: '912345678',
  email: null,
  rut: null,
  city: null,
}
const submittedOrders = []

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: 'application/json; charset=utf-8',
    headers: {
      'access-control-allow-origin': FRONTEND_URL,
      'access-control-allow-headers': 'content-type,authorization',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

function fakeOrderDetails() {
  const latestOrder = submittedOrders.at(-1)
  if (!latestOrder) return { detail: 'Orden no encontrada' }

  const itemDefinitions = latestOrder.items.map((line, position) => {
    const catalogProduct = fixtureProducts.find(product => product.id === line.catalog_product_id)
    return {
      id: 70 + position,
      catalog_product_id: catalogProduct.id,
      product_name: catalogProduct.name,
      quantity: line.quantity,
      unit_price: catalogProduct.sale_price,
      line_total: String(Number(catalogProduct.sale_price) * line.quantity),
      variant: line.variant,
    }
  })

  return {
    id: 142,
    order_number: 'BRV-00142',
    system: 'bravo',
    client_id: simulatedClient.id,
    client: simulatedClient,
    items: itemDefinitions,
    materials: [],
    history: [],
    status: 'recibido',
    created_at: '2026-11-05T12:00:00',
    device_type: itemDefinitions[0].product_name,
    brand: itemDefinitions[0].variant,
    model: '3 unidades · 2 productos',
    reported_issue: latestOrder.reported_issue || 'Diseño de prueba',
    accessories: null,
    design_reference: null,
    estimated_delivery: null,
    repair_cost: '20500.00',
    deposit: '5000.00',
    deposit_payment_method: null,
    final_payment_method: null,
  }
}

async function prepareScreen(browser, screenWidth) {
  const browserContext = await browser.newContext({
    viewport: { width: screenWidth, height: 850 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  await browserContext.addInitScript(() => {
    localStorage.setItem('access_token', 'bravo-ui-ci-fixture')
    localStorage.setItem('selected_system', 'bravo')
  })

  await browserContext.route('**/*', async route => {
    const request = route.request()
    const requestedUrl = new URL(request.url())
    if (requestedUrl.port !== API_PORT) {
      await route.continue()
      return
    }

    const pathname = requestedUrl.pathname
    if (request.method() === 'OPTIONS') {
      await route.fulfill(jsonResponse({}, 204))
      return
    }

    if (pathname === '/auth/me') {
      await route.fulfill(jsonResponse({
        id: 11, name: 'Operador Bravo QA', email: 'bravo-qa@example.invalid', role: 'technician',
      }))
      return
    }
    if (pathname === '/bravo/catalog') {
      const searchTerm = (requestedUrl.searchParams.get('search') || '').toLowerCase()
      const matchedProducts = fixtureProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm)
      )
      await route.fulfill(jsonResponse(matchedProducts))
      return
    }
    if (pathname === '/clients/') {
      await route.fulfill(jsonResponse([]))
      return
    }
    if (pathname === '/bravo/orders' && request.method() === 'POST') {
      const orderPayload = request.postDataJSON()
      submittedOrders.push(orderPayload)
      await route.fulfill(jsonResponse({ ...fakeOrderDetails() }, 201))
      return
    }
    if (pathname === '/bravo/orders/142') {
      await route.fulfill(jsonResponse(fakeOrderDetails()))
      return
    }
    if (pathname === '/bravo/inventory') {
      await route.fulfill(jsonResponse([]))
      return
    }
    await route.fulfill(jsonResponse({ detail: 'Endpoint sin fixture: ' + pathname }, 404))
  })

  return browserContext
}

const browser = await chromium.launch({ headless: true })
await mkdir('test-results', { recursive: true })

try {
  for (const screenWidth of SCREEN_WIDTHS) {
    const context = await prepareScreen(browser, screenWidth)
    const page = await context.newPage()
    const runtimeErrors = []
    page.on('pageerror', error => runtimeErrors.push(error.message))

    await page.goto(FRONTEND_URL + '/bravo/orders/new', { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: /crear una orden/i }).waitFor()
    await page.getByText('Polera algodón QA').first().waitFor()

    const layout = await page.evaluate(() => {
      const orderForm = document.querySelector('.bravo-form form')
      const boundaries = orderForm?.getBoundingClientRect()
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        formLeft: boundaries?.left,
        formRight: boundaries?.right,
      }
    })
    assert.ok(layout.documentWidth <= layout.viewportWidth + 1,
      `Desbordamiento horizontal global en ${screenWidth}px: ${JSON.stringify(layout)}`)
    assert.ok(layout.formLeft >= -1 && layout.formRight <= screenWidth + 1,
      `Formulario fuera de la pantalla en ${screenWidth}px: ${JSON.stringify(layout)}`)
    assert.deepEqual(runtimeErrors, [], `Errores JS a ${screenWidth}px`)

    await page.screenshot({
      path: `test-results/bravo-nueva-orden-${screenWidth}.png`,
      fullPage: true,
      animations: 'disabled',
    })

    if (screenWidth === 390) {
      await page.getByRole('button', { name: /registrar cliente nuevo/i }).click()
      await page.getByPlaceholder('Nombre completo').fill(simulatedClient.name)
      await page.getByPlaceholder('+56 9 1234 5678').fill(simulatedClient.phone)
      await page.getByText('Polera algodón QA').first().click()
      await page.getByText('Tazón cerámica QA').first().click()
      await page.locator('#bravo-qty-1').fill('2')
      await page.locator('#bravo-variant-1').fill('Talla M')
      await page.locator('#bravo-variant-2').fill('Blanco')
      await page.getByRole('button', { name: /crear orden y abrir ficha/i }).click()
      await page.waitForURL('**/bravo/orders/142')
      await page.getByText('Artículos de esta orden').waitFor()

      const latestSubmittedOrder = submittedOrders.at(-1)
      assert.equal(latestSubmittedOrder?.items.length, 2)
      assert.equal(latestSubmittedOrder?.items[0].quantity, 2)
      assert.equal(latestSubmittedOrder?.items[1].quantity, 1)
      assert.equal(latestSubmittedOrder?.expected_total, '20500.00')
      assert.equal(latestSubmittedOrder?.new_client.name, simulatedClient.name)
      await page.screenshot({
        path: 'test-results/bravo-detalle-390.png',
        fullPage: true,
        animations: 'disabled',
      })
    }
    await context.close()
    console.log(`OK: diseño Bravo a ${screenWidth}px`)
  }
  assert.equal(submittedOrders.length, 1, 'Una orden de prueba fue enviada')
  console.log('OK: creación móvil multiproducto con resumen y ficha')
} finally {
  await browser.close()
}
