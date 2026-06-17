import { jsPDF } from 'jspdf'

export function generateRepairPDF(repair, client) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 20

  // ─── Colores ───────────────────────────────────────────────
  const CYAN = [6, 182, 212]
  const DARK = [10, 10, 20]
  const GRAY = [100, 100, 120]
  const LIGHT = [240, 240, 245]
  const WHITE = [255, 255, 255]

  // ─── Helper: línea horizontal ──────────────────────────────
  const hLine = (yPos, color = LIGHT) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageW - margin, yPos)
  }

  // ─── Helper: texto ─────────────────────────────────────────
  const text = (str, x, yPos, opts = {}) => {
    doc.setFontSize(opts.size || 10)
    doc.setTextColor(...(opts.color || DARK))
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    if (opts.align === 'right') {
      doc.text(String(str || '—'), x, yPos, { align: 'right' })
    } else if (opts.align === 'center') {
      doc.text(String(str || '—'), x, yPos, { align: 'center' })
    } else {
      doc.text(String(str || '—'), x, yPos)
    }
  }

  // ─── Helper: sección ───────────────────────────────────────
  const section = (title, yPos) => {
    doc.setFillColor(...CYAN)
    doc.rect(margin, yPos, contentW, 7, 'F')
    doc.setFontSize(9)
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), margin + 3, yPos + 5)
    return yPos + 12
  }

  // ─── Helper: fila de datos ─────────────────────────────────
  const row = (label, value, yPos, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...LIGHT)
      doc.rect(margin, yPos - 4, contentW, 7, 'F')
    }
    text(label, margin + 2, yPos, { color: GRAY, size: 9 })
    text(value || '—', margin + 55, yPos, { bold: true, size: 9 })
    return yPos + 7
  }

  // ════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ════════════════════════════════════════════════════════════
  doc.setFillColor(...DARK)
  doc.rect(0, 0, pageW, 35, 'F')

  // Acento cyan
  doc.setFillColor(...CYAN)
  doc.rect(0, 33, pageW, 2, 'F')

  text('NOVA TECNOLOGIES', margin, 14, { size: 18, bold: true, color: WHITE })
  text('Sistema de Gestión Técnica', margin, 20, { size: 9, color: CYAN })
  text('ORDEN DE RECEPCIÓN', pageW - margin, 12, { size: 11, bold: true, color: CYAN, align: 'right' })
  text(`N° ${repair.order_number}`, pageW - margin, 19, { size: 14, bold: true, color: WHITE, align: 'right' })
  text(`Fecha: ${new Date(repair.created_at).toLocaleDateString('es-CL')}`, pageW - margin, 25, { size: 8, color: GRAY, align: 'right' })

  y = 45

  // ════════════════════════════════════════════════════════════
  // ESTADO ACTUAL
  // ════════════════════════════════════════════════════════════
  const statusLabels = {
    recibido: 'Recibido',
    diagnostico: 'En Diagnóstico',
    esperando_repuesto: 'Esperando Repuesto',
    presupuesto_enviado: 'Presupuesto Enviado',
    en_reparacion: 'En Reparación',
    listo: 'Listo para Retirar',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  }

  doc.setFillColor(6, 182, 212, 0.1)
  doc.setDrawColor(...CYAN)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'S')
  text(`Estado: ${statusLabels[repair.status] || repair.status}`, margin + 4, y + 6.5, { size: 9, bold: true, color: CYAN })

  if (repair.estimated_delivery) {
    const delivery = new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    text(`Entrega estimada: ${delivery}`, pageW - margin - 4, y + 6.5, { size: 9, color: GRAY, align: 'right' })
  }

  y += 16

  // ════════════════════════════════════════════════════════════
  // DATOS DEL CLIENTE
  // ════════════════════════════════════════════════════════════
  y = section('Datos del Cliente', y)
  y = row('Nombre', client?.name, y, false)
  y = row('RUT', client?.rut, y, true)
  y = row('Teléfono', client?.phone, y, false)
  y = row('Email', client?.email, y, true)
  y = row('Ciudad', client?.city, y, false)
  y += 4

  // ════════════════════════════════════════════════════════════
  // DATOS DEL EQUIPO
  // ════════════════════════════════════════════════════════════
  y = section('Datos del Equipo', y)
  y = row('Tipo de dispositivo', repair.device_type, y, false)
  y = row('Marca', repair.brand, y, true)
  y = row('Modelo', repair.model, y, false)
  y = row('Accesorios entregados', repair.accessories, y, true)
  y += 4

  // Problema reportado (puede ser largo)
  text('Problema reportado:', margin + 2, y, { color: GRAY, size: 9 })
  y += 5
  doc.setFillColor(...LIGHT)
  doc.rect(margin, y - 2, contentW, 18, 'F')
  const issueLines = doc.splitTextToSize(repair.reported_issue || '—', contentW - 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(issueLines.slice(0, 3), margin + 4, y + 4)
  y += 22

  // ════════════════════════════════════════════════════════════
  // COSTOS
  // ════════════════════════════════════════════════════════════
  y = section('Costos', y)

  const repairCost = Number(repair.repair_cost) || 0
  const deposit = Number(repair.deposit) || 0
  const balance = repairCost - deposit

  y = row('Valor de la reparación',
    repairCost > 0 ? `$${repairCost.toLocaleString('es-CL')}` : 'Por definir', y, false)
  y = row('Abono recibido',
    deposit > 0 ? `$${deposit.toLocaleString('es-CL')}` : '—', y, true)

  // Saldo con color
  doc.setFillColor(balance > 0 ? 254 : 16, balance > 0 ? 226 : 185, balance > 0 ? 226 : 129)
  doc.rect(margin, y - 4, contentW, 8, 'F')
  text('SALDO PENDIENTE', margin + 2, y + 1, { size: 9, bold: true, color: balance > 0 ? [180, 30, 30] : [20, 120, 60] })
  text(
    balance > 0 ? `$${balance.toLocaleString('es-CL')}` : 'PAGADO',
    margin + 55, y + 1,
    { size: 9, bold: true, color: balance > 0 ? [180, 30, 30] : [20, 120, 60] }
  )
  y += 12

  // ════════════════════════════════════════════════════════════
  // TÉRMINOS Y CONDICIONES
  // ════════════════════════════════════════════════════════════
  y = section('Términos y Condiciones', y)

  const terms = [
    '1. El equipo será retenido por un máximo de 30 días desde la fecha de aviso de término. Pasado este plazo, Nova Tecnologies no se responsabiliza por el dispositivo.',
    '2. Nova Tecnologies no se hace responsable por pérdida de datos. Se recomienda realizar respaldo antes del ingreso.',
    '3. El diagnóstico tiene un costo mínimo en caso de no proceder la reparación.',
    '4. El presupuesto aprobado verbalmente o por escrito compromete al cliente al pago del servicio.',
    '5. Se debe presentar este documento al momento de retirar el equipo.',
  ]

  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  terms.forEach(term => {
    const lines = doc.splitTextToSize(term, contentW - 4)
    doc.text(lines, margin + 2, y)
    y += lines.length * 4 + 2
  })

  y += 4

  // ════════════════════════════════════════════════════════════
  // FIRMAS
  // ════════════════════════════════════════════════════════════
  hLine(y)
  y += 8

  // Firma cliente
  const col1 = margin
  const col2 = margin + contentW / 2 + 5

  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.3)
  doc.line(col1, y + 15, col1 + 75, y + 15)
  doc.line(col2, y + 15, col2 + 75, y + 15)

  text('Firma del Cliente', col1, y + 20, { size: 8, color: GRAY })
  text('Firma Nova Tecnologies', col2, y + 20, { size: 8, color: GRAY })

  text(client?.name || '_______________', col1, y + 26, { size: 7, color: GRAY })
  text('Técnico Responsable', col2, y + 26, { size: 7, color: GRAY })

  // ════════════════════════════════════════════════════════════
  // PIE DE PÁGINA
  // ════════════════════════════════════════════════════════════
  doc.setFillColor(...DARK)
  doc.rect(0, 282, pageW, 15, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(0, 282, pageW, 0.8, 'F')

  text('NOVA TECNOLOGIES', pageW / 2, 288, { size: 7, bold: true, color: CYAN, align: 'center' })
  text(`Orden ${repair.order_number} · ${new Date().toLocaleDateString('es-CL')}`, pageW / 2, 293, { size: 6, color: GRAY, align: 'center' })

  // ─── Descarga ──────────────────────────────────────────────
  
  // Para evitar el error de "descarga no segura" en HTTP (dispositivos móviles/otros PCs),
  // generamos el PDF como un archivo temporal (Blob) y lo abrimos en una nueva pestaña.
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  
  // Intentar abrir el PDF en el visor nativo del navegador
  const newTab = window.open(pdfUrl, '_blank')
  
  // Si el navegador bloqueó la ventana emergente (pop-up), usamos el método tradicional como plan B
  if (!newTab) {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `Nova-${repair.order_number}.pdf`
    link.click()
  }
}