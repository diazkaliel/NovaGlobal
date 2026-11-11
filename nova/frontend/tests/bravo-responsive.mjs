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
let boardStatus = 'recibido'
const boardFixtureOrder = {
  id: 151,
  order_number: 'BRV-00151',
  client_id: 88,
  client: { id: 88, name: 'Cliente Tablero QA', phone: '912345678' },
  device_type: 'Polera personalizada',
  model: 'Diseño frontal',
  status: boardStatus,
  system: 'bravo',
  estimated_delivery: null,
}

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
    if (pathname === '/bravo/quote') {
      const quotedItems = request.postDataJSON().items.map(line => {
        const selected = fixtureProducts.find(product => product.id === line.catalog_product_id)
        return {
          catalog_product_id: selected.id,
          product_name: selected.name,
          variant: line.variant,
          quantity: line.quantity,
          unit_price: selected.sale_price,
          line_total: String(Number(selected.sale_price) * Number(line.quantity)),
        }
      })
      await route.fulfill(jsonResponse({
        items: quotedItems,
        expected_total: quotedItems.reduce((sum, line) => sum + Number(line.line_total), 0).toFixed(2),
      }))
      return
    }
    if (pathname === '/clients/') {
      await route.fulfill(jsonResponse([]))
      return
    }
    if (pathname === '/bravo/orders' && request.method() === 'GET') {
      await route.fulfill(jsonResponse([{ ...boardFixtureOrder, status: boardStatus }]))
      return
    }
    if (pathname === '/bravo/orders/151/status' && request.method() === 'PATCH') {
      boardStatus = request.postDataJSON().new_status
      await route.fulfill(jsonResponse({ ...boardFixtureOrder, status: boardStatus }))
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

    // Todos los accesos históricos siguen disponibles después del rediseño.
    const expectedMenuPaths = [
      '/bravo',
      '/bravo#bravo-calendar',
      '/bravo/orders/new',
      '/bravo/orders',
      '/bravo/production',
      '/bravo/products',
      '/bravo/products/new',
      '/bravo/showroom',
      '/bravo/clients',
      '/bravo/stats',
    ]
    if (screenWidth < 768) {
      await page.getByRole('button', { name: 'Abrir menú de BRAVO' }).click()
      const drawer = page.getByRole('dialog', { name: 'Navegación de BRAVO' })
      await drawer.waitFor()
      const sidebar = drawer.getByRole('navigation', { name: 'Navegación de BRAVO' })
      for (const targetPath of expectedMenuPaths) {
        assert.equal(await sidebar.locator(`a[href="${targetPath}"]`).count(), 1,
          `No está disponible ${targetPath} en móvil a ${screenWidth}px`)
      }
      await drawer.getByRole('button', { name: 'Cerrar navegación' }).click()
      await drawer.waitFor({ state: 'hidden' })
    } else {
      const sidebar = page.getByRole('navigation', { name: 'Navegación de BRAVO' })
      for (const targetPath of expectedMenuPaths) {
        assert.equal(await sidebar.locator(`a[href="${targetPath}"]`).count(), 1,
          `No está disponible ${targetPath} en escritorio a ${screenWidth}px`)
      }
    }
    assert.deepEqual(runtimeErrors, [], `Fallos JS en navegación a ${screenWidth}px`)


    if (screenWidth === 375) {
      await page.getByRole('button', { name: 'Abrir menú de BRAVO' }).click()
      await page.getByRole('dialog', { name: 'Navegación de BRAVO' })
        .getByRole('link', { name: 'Calendario de entregas' }).click()
      await page.waitForURL('**/bravo#bravo-calendar')
      await page.locator('#bravo-calendar').waitFor()
      await page.goto(FRONTEND_URL + '/bravo/production', { waitUntil: 'networkidle' })
      await page.getByText('BRV-00151').waitFor()
      await page.getByRole('button', { name: /pasar a diseño/i }).click()
      await page.getByRole('button', { name: /muestra enviada/i }).waitFor()
      await page.screenshot({
        path: 'test-results/bravo-tablero-375.png',
        fullPage: true,
        animations: 'disabled',
      })
    }

    if (screenWidth === 1280) {
      await page.goto(FRONTEND_URL + '/bravo/showroom', { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: /hazlo tuyo/i }).waitFor()
      await page.getByRole('button', { name: /seleccionar polera algodón QA/i }).click()
      await page.getByRole('button', { name: /continuar en nueva orden/i }).click()
      await page.waitForURL('**/bravo/orders/new')
      await page.getByText('Polera algodón QA').last().waitFor()
      assert.equal(await page.locator('#bravo-qty-1').inputValue(), '1')
      await page.screenshot({
        path: 'test-results/bravo-vitrina-a-orden-1280.png',
        fullPage: true,
        animations: 'disabled',
      })
    }

    if (screenWidth === 390) {
      await page.getByRole('button', { name: /registrar cliente nuevo/i }).click()
      await page.getByPlaceholder('Nombre completo').fill(simulatedClient.name)
      await page.getByPlaceholder('+56 9 1234 5678').fill(simulatedClient.phone)
      await page.getByText('Polera algodón QA').first().click()
      await page.getByText('Tazón cerámica QA').first().click()
      await page.locator('#bravo-qty-1').fill('2')
      await page.locator('#bravo-variant-1').fill('Talla M')
      await page.locator('#bravo-variant-2').fill('Blanco')
      await page.getByRole('button', { name: /revisar precios y pedido/i }).click()
      await page.getByText('Pedido listo para ingresar').waitFor()
      await page.getByRole('button', { name: /confirmar orden y abrir ficha/i }).click()
      await page.waitForURL('**/bravo/orders/142')
      try {
        await page.getByText('Artículos de esta orden').waitFor({ timeout: 6000 })
      } catch (error) {
        console.error('Bravo order detail did not render:', (await page.locator('body').innerText()).slice(0, 4000))
        console.error('Submitted order fixture:', JSON.stringify(submittedOrders.at(-1)))
        await page.screenshot({
          path: 'test-results/bravo-detalle-error-390.png', fullPage: true,
          animations: 'disabled',
        })
        throw error
      }

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
