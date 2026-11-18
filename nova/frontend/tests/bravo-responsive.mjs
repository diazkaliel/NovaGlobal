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
const rejectedOrders = []
const savedOrderResponses = new Map()
let loseNextOrderResponse = false
let recoveredOrderResponses = 0
let updatedPoleraPrice = null
let detailStatus = 'recibido'
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
      'access-control-allow-headers': 'content-type,authorization,idempotency-key',
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
    const unitPrice = catalogProduct.id === 20 && updatedPoleraPrice !== null
      ? updatedPoleraPrice : catalogProduct.sale_price
    return {
      id: 70 + position,
      catalog_product_id: catalogProduct.id,
      product_name: catalogProduct.name,
      quantity: line.quantity,
      unit_price: unitPrice,
      line_total: String(Number(unitPrice) * line.quantity),
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
    history: detailStatus === 'cancelado' ? [{
      id: 1, previous_status: 'recibido', new_status: 'cancelado',
      note: 'Orden cancelada', changed_at: '2026-11-17T00:00:00Z', changed_by_id: 11,
    }] : [],
    status: detailStatus,
    created_at: '2026-11-05T12:00:00',
    device_type: itemDefinitions[0].product_name,
    brand: itemDefinitions[0].variant,
    model: '3 unidades · 2 productos',
    reported_issue: latestOrder.reported_issue || 'Diseño de prueba',
    accessories: null,
    design_reference: null,
    estimated_delivery: null,
    repair_cost: latestOrder.expected_total,
    deposit: '5000.00',
    deposit_payment_method: null,
    final_payment_method: null,
  }
}

async function prepareScreen(browser, screenWidth, role = 'admin') {
  const inventoryProducts = structuredClone(fixtureProducts)
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
        id: 11, name: 'Operador Bravo QA', email: 'bravo-qa@example.com', role, system: 'bravo',
      }))
      return
    }
    if (pathname === '/bravo/catalog') {
      const searchTerm = (requestedUrl.searchParams.get('search') || '').toLowerCase()
      const matchedProducts = inventoryProducts.filter(product =>
        !product.archived_at && product.name.toLowerCase().includes(searchTerm)
      )
      await route.fulfill(jsonResponse(matchedProducts))
      return
    }
    if (pathname === '/bravo/quote') {
      const quotedItems = request.postDataJSON().items.map(line => {
        const selected = fixtureProducts.find(product => product.id === line.catalog_product_id)
        const unitPrice = selected.id === 20 && updatedPoleraPrice !== null
          ? updatedPoleraPrice : selected.sale_price
        return {
          catalog_product_id: selected.id,
          product_name: selected.name,
          variant: line.variant,
          quantity: line.quantity,
          unit_price: unitPrice,
          line_total: String(Number(unitPrice) * Number(line.quantity)),
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
      const submissionKey = request.headers()['idempotency-key']
      assert.ok(submissionKey, 'Crear una orden debe enviar su clave de reintento')
      if (savedOrderResponses.has(submissionKey)) {
        recoveredOrderResponses += 1
        await route.fulfill(jsonResponse(savedOrderResponses.get(submissionKey), 201))
        return
      }
      if (updatedPoleraPrice !== null && orderPayload.expected_total === '20500.00') {
        rejectedOrders.push(orderPayload)
        await route.fulfill(jsonResponse({
          detail: 'Los precios del catálogo cambiaron. Revisa el total antes de confirmar.',
        }, 409))
        return
      }
      detailStatus = 'recibido'
      submittedOrders.push(orderPayload)
      const savedResponse = { ...fakeOrderDetails() }
      savedOrderResponses.set(submissionKey, savedResponse)
      if (loseNextOrderResponse) {
        loseNextOrderResponse = false
        await route.abort('failed')
        return
      }
      await route.fulfill(jsonResponse(savedResponse, 201))
      return
    }
    if (pathname === '/bravo/orders/142' && request.method() === 'DELETE') {
      detailStatus = 'cancelado'
      await route.fulfill(jsonResponse({}, 204))
      return
    }
    if (pathname === '/bravo/orders/142') {
      await route.fulfill(jsonResponse(fakeOrderDetails()))
      return
    }
    if (pathname === '/bravo/inventory') {
      const archived = requestedUrl.searchParams.get('archived') === 'true'
      const category = requestedUrl.searchParams.get('category')
      const products = inventoryProducts.filter(product =>
        Boolean(product.archived_at) === archived && (!category || product.category === category)
      )
      await route.fulfill(jsonResponse(products))
      return
    }
    if (pathname.startsWith('/bravo/inventory/') && request.method() === 'DELETE') {
      const product = inventoryProducts.find(item => item.id === Number(pathname.split('/').at(-1)))
      assert.ok(product)
      product.archived_at = '2026-11-17T00:00:00Z'
      await route.fulfill(jsonResponse({}, 204))
      return
    }
    await route.fulfill(jsonResponse({ detail: 'Endpoint sin fixture: ' + pathname }, 404))
  })

  return browserContext
}

const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
await mkdir('test-results', { recursive: true })

try {
  for (const screenWidth of SCREEN_WIDTHS) {
    const context = await prepareScreen(browser, screenWidth)
    const page = await context.newPage()
    const runtimeErrors = []
    page.on('pageerror', error => runtimeErrors.push(error.message))

    await page.goto(FRONTEND_URL + '/bravo/orders/new', { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: /crear una orden/i }).waitFor()
    try {
      await page.getByText('Polera algodón QA').first().waitFor({ timeout: 8000 })
    } catch (visibilityError) {
      const evidence = await page.getByText('Polera algodón QA').first().evaluate(element => {
        const ancestry = []
        for (let current = element; current && ancestry.length < 12; current = current.parentElement) {
          const bounds = current.getBoundingClientRect()
          const styles = getComputedStyle(current)
          ancestry.push({
            tag: current.tagName,
            className: String(current.className).slice(0, 120),
            width: bounds.width,
            height: bounds.height,
            display: styles.display,
            visibility: styles.visibility,
            overflow: styles.overflow,
          })
        }
        return ancestry
      }).catch(() => [])
      console.error('Catálogo invisible en pantalla', screenWidth, evidence)
      await page.screenshot({ path: `test-results/bravo-catalogo-invisible-${screenWidth}.png`,
        fullPage: true, animations: 'disabled' })
      throw visibilityError
    }

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
      '/bravo/chats',
      '/bravo/machines',
      '/bravo/sales',
      '/bravo/cash-register',
      '/bravo/quotations',
      '/bravo/admin-web',
      '/bravo/price-menu',
      '/bravo/users-attendance',
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
      updatedPoleraPrice = null
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
      await page.getByRole('button', { name: /registrar cliente nuevo/i }).click()
      await page.getByPlaceholder('Nombre completo').fill(simulatedClient.name)
      await page.getByPlaceholder('+56 9 1234 5678').fill(simulatedClient.phone)
      await page.getByRole('button', { name: /^crear orden$/i }).click()
      await page.waitForURL('**/bravo/orders/142')
      assert.equal(submittedOrders.at(-1)?.expected_total, '8000.00')
      await page.goto(FRONTEND_URL + '/bravo/products', { waitUntil: 'networkidle' })
      await page.getByText('Polera algodón QA', { exact: true }).waitFor()
      page.once('dialog', dialog => dialog.accept())
      await page.getByRole('button', { name: 'Archivar Producto' }).first().click()
      await page.getByText('Polera algodón QA', { exact: true }).waitFor({ state: 'hidden' })
      await page.getByRole('checkbox', { name: 'Archivados' }).check()
      await page.getByText('Polera algodón QA', { exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Archivar Producto' }).count(), 0)
      await page.getByRole('checkbox', { name: 'Archivados' }).uncheck()
      await page.getByText('Polera algodón QA', { exact: true }).waitFor({ state: 'hidden' })

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
      updatedPoleraPrice = '9000.00'
      const createOrderButton = page.getByRole('button', { name: /^crear orden$/i })
      await createOrderButton.click()
      await page.getByRole('alert').filter({ hasText: 'Actualizamos los precios del catálogo' }).waitFor()
      assert.equal(submittedOrders.length, 0)
      assert.equal(rejectedOrders.length, 1)
      assert.equal(await page.locator('#bravo-qty-1').inputValue(), '2')
      loseNextOrderResponse = true
      await createOrderButton.click()
      await page.getByRole('alert').filter({ hasText: 'No se pudo registrar la orden' }).waitFor()
      assert.equal(submittedOrders.length, 1, 'La orden ya se guardó aunque su respuesta se perdió')
      await createOrderButton.click()
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
      assert.equal(latestSubmittedOrder?.expected_total, '22500.00')
      assert.equal(latestSubmittedOrder?.new_client.name, simulatedClient.name)
      // Verifica el comprobante con las dependencias de PDF actualizadas.
      await page.evaluate(() => { window.open = () => null })
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Imprimir Recibo' }).click()
      const download = await downloadPromise
      assert.match(download.suggestedFilename(), /Bravo-.*\.pdf$/)
      const chunks = []
      for await (const chunk of await download.createReadStream()) chunks.push(chunk)
      const pdf = Buffer.concat(chunks)
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
      assert.ok(pdf.length > 1000, 'El comprobante descargado contiene datos')

      await page.screenshot({
        path: 'test-results/bravo-detalle-390.png',
        fullPage: true,
        animations: 'disabled',
      })
      page.once('dialog', dialog => dialog.accept())
      await page.getByRole('button', { name: 'Cancelar orden', exact: true }).click()
      await page.waitForFunction(() => {
        const button = document.querySelector('button[title="Cancelar orden"]')
        return button?.disabled
      })
      assert.equal(detailStatus, 'cancelado')
      await page.getByText('Historial de estados', { exact: true }).click()
      await page.getByText('Orden cancelada', { exact: true }).waitFor()
      await page.getByText('Artículos de esta orden').waitFor()
      assert.ok(page.url().endsWith('/bravo/orders/142'), 'La cancelación conserva la ficha abierta')

    }
    await context.close()
    console.log(`OK: diseño Bravo a ${screenWidth}px`)
  }
  const technicianContext = await prepareScreen(browser, 1280, 'technician')
  const technicianPage = await technicianContext.newPage()
  await technicianPage.goto(FRONTEND_URL + '/bravo/orders/142', { waitUntil: 'networkidle' })
  assert.ok(await technicianPage.getByRole('button', { name: 'Cancelar orden', exact: true }).isDisabled())
  assert.ok(await technicianPage.getByRole('button', { name: 'Cancelado', exact: true }).isDisabled())
  await technicianPage.goto(FRONTEND_URL + '/bravo/products', { waitUntil: 'networkidle' })
  assert.ok(await technicianPage.getByRole('button', { name: 'Archivar Producto' }).first().isDisabled())
  await technicianContext.close()
  assert.equal(recoveredOrderResponses, 1, 'El reintento recuperó la orden guardada')
  assert.equal(submittedOrders.length, 2, 'Se guardó una orden por cada flujo de prueba')
  console.log('OK: creación directa y reintento por cambio de precio')
} finally {
  await browser.close()
}
