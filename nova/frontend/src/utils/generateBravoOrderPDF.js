import { jsPDF } from 'jspdf'

// Comprobante de personalización: deliberadamente separado de los términos de reparaciones Nova.
export function generateBravoOrderPDF(order, customer) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const ink = [38, 34, 29]
  const copper = [151, 74, 37]
  const muted = [106, 98, 87]
  const paper = [249, 246, 239]
  const pageWidth = pdf.internal.pageSize.getWidth()
  const left = 19
  const right = pageWidth - 19
  const contentWidth = right - left
  let cursorY = 46

  function ensureSpace(height) {
    if (cursorY + height <= 275) return
    pdf.addPage()
    pdf.setFillColor(...paper)
    pdf.rect(0, 0, pageWidth, 297, 'F')
    cursorY = 24
  }

  function line() {
    pdf.setDrawColor(196, 181, 161)
    pdf.setLineWidth(.25)
    pdf.line(left, cursorY, right, cursorY)
    cursorY += 5
  }

  function heading(label) {
    ensureSpace(18)
    cursorY += 5
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...copper)
    pdf.setFontSize(9)
    pdf.text(label.toUpperCase(), left, cursorY)
    cursorY += 5
    line()
  }

  function field(label, value) {
    const content = String(value ?? '').trim() || '—'
    const lines = pdf.splitTextToSize(content, contentWidth - 52)
    const height = Math.max(8, lines.length * 5 + 2)
    ensureSpace(height)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...muted)
    pdf.setFontSize(9)
    pdf.text(label, left, cursorY)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...ink)
    pdf.text(lines, left + 52, cursorY)
    cursorY += height
  }

  function amount(value) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
    }).format(Number(value) || 0)
  }

  pdf.setFillColor(...paper)
  pdf.rect(0, 0, pageWidth, 297, 'F')
  pdf.setFillColor(...ink)
  pdf.rect(0, 0, pageWidth, 36, 'F')
  pdf.setFont('times', 'bold')
  pdf.setFontSize(24)
  pdf.setTextColor(255, 250, 242)
  pdf.text('BRAVO', left, 19)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(238, 206, 171)
  pdf.text('ESTUDIO DE PERSONALIZACIÓN', left, 26)
  pdf.setFontSize(11)
  pdf.setTextColor(255, 250, 242)
  pdf.text('ORDEN DE TRABAJO', right, 16, { align: 'right' })
  pdf.setFontSize(10)
  pdf.text(order.order_number || '—', right, 24, { align: 'right' })

  heading('Datos de la orden')
  field('Fecha de registro', order.created_at ? new Date(order.created_at).toLocaleDateString('es-CL') : null)
  field('Cliente', customer?.name)
  field('Teléfono', customer?.phone)
  field('Email', customer?.email)
  field('Entrega estimada', order.estimated_delivery
    ? new Date(`${order.estimated_delivery}T12:00:00`).toLocaleDateString('es-CL') : 'Por definir')

  heading('Personalización')
  field('Producto base', order.device_type)
  field('Material / color', order.brand)
  field('Diseño / variante', order.model)
  field('Instrucciones', order.reported_issue)
  field('Embalaje', order.accessories)
  if (order.design_reference) field('Referencia', order.design_reference)

  heading('Presupuesto')
  field('Valor total', order.repair_cost == null ? 'Por definir' : amount(order.repair_cost))
  field('Abono recibido', amount(order.deposit))
  field('Saldo pendiente', amount((Number(order.repair_cost) || 0) - (Number(order.deposit) || 0)))

  ensureSpace(24)
  cursorY += 3
  pdf.setTextColor(...muted)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Comprobante de recepción de una orden de personalización.', left, cursorY)
  cursorY += 5
  pdf.text('Confirma los detalles de diseño y entrega con el estudio antes de producción.', left, cursorY)
  pdf.setDrawColor(...copper)
  pdf.line(left, 285, right, 285)
  pdf.setTextColor(...ink)
  pdf.setFontSize(8)
  pdf.text('BRAVO  /  ESTUDIO', left, 291)
  pdf.text(order.order_number || '', right, 291, { align: 'right' })

  const objectUrl = URL.createObjectURL(pdf.output('blob'))
  const newTab = window.open(objectUrl, '_blank')
  if (newTab) newTab.opener = null
  if (!newTab) {
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `Bravo-${order.order_number || 'orden'}.pdf`
    anchor.click()
  }
  // La revocación diferida evita invalidar el blob mientras el visor lo está abriendo.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
}
