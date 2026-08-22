import { jsPDF } from 'jspdf'

// Configuración de Estados en Bravo
const STATUS_LABELS_BRAVO = {
  recibido: 'Recibido',
  diagnostico: 'En Diseño',
  presupuesto_enviado: 'Muestra Enviada',
  diseno_aprobado: 'Diseño Aprobado',
  esperando_repuesto: 'Espera Insumos',
  en_reparacion: 'En Producción',
  listo: 'Listo p/ Entrega',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  critico: 'Crítico 🚨',
  en_garantia: 'En Garantía',
}

// Retorna el checklist según tipo de producto y técnica (coincide con el frontend de Bravo)
const getChecklistTemplate = (deviceType, technique) => {
  const isMugOrBottle = ['tazon', 'botella', 'taza', 'mug', 'termo'].includes(String(deviceType || '').toLowerCase())
  
  if (isMugOrBottle) {
    return [
      { label: 'Sin Burbujas / Pliegues', desc: 'Sublimación uniforme sin burbujas de aire ni pliegues.' },
      { label: 'Centrado del Diseño', desc: 'Diseño perfectamente alineado según las especificaciones.' },
      { label: 'Brillo y Esmalte', desc: 'Superficie brillante, colores vibrantes y sin opacidades.' },
      { label: 'Empaque de Protección', desc: 'Empacado en caja individual con burbujas protectoras.' }
    ]
  } else {
    return [
      { label: 'Limpieza de Hilos', desc: 'Hilos sobrantes y costuras auxiliares removidos por completo.' },
      { label: 'Inspección de Superficie', desc: 'Prenda limpia, libre de manchas de tinta o grasa de plancha.' },
      { label: 'Curado / Fijación', desc: 'Fijación térmica completa (sin desprendimientos al tacto).' },
      { label: 'Empaque y Rotulado', desc: 'Doblado y empaquetado en bolsa protectora con etiqueta legible.' }
    ]
  }
}

// Helper para abrir/descargar el PDF de manera segura
function handlePDFOutput(doc, filename) {
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  const newTab = window.open(pdfUrl, '_blank')
  
  if (!newTab) {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = filename
    link.click()
  }
}

// ─────────────────────────────────────────────────────────────
// 1. GENERAR GUÍA DEL CLIENTE (COPIA CLIENTE) - BRAVO
// ─────────────────────────────────────────────────────────────
export function generateBravoClientPDF(repair, client) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 20

  // Colores Corporativos Bravo
  const ORANGE = [249, 115, 22] // Naranja cálido #f97316
  const DARK = [30, 30, 36]     // Antracita #1e1e24
  const GRAY = [110, 110, 120]  // Gris medio
  const LIGHT = [245, 245, 247] // Gris claro
  const WHITE = [255, 255, 255]

  // Helpers
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

  const section = (title, yPos) => {
    doc.setFillColor(...ORANGE)
    doc.rect(margin, yPos, contentW, 7, 'F')
    doc.setFontSize(9)
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), margin + 3, yPos + 5)
    return yPos + 12
  }

  const row = (label, value, yPos, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...LIGHT)
      doc.rect(margin, yPos - 4, contentW, 7, 'F')
    }
    text(label, margin + 2, yPos, { color: GRAY, size: 9 })
    text(value || '—', margin + 55, yPos, { bold: true, size: 9 })
    return yPos + 7
  }

  // ENCABEZADO
  doc.setFillColor(...DARK)
  doc.rect(0, 0, pageW, 35, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 33, pageW, 2, 'F')

  text('GRUPO BRAVO', margin, 14, { size: 18, bold: true, color: WHITE })
  text('Estampados & Personalización Textil', margin, 20, { size: 9, color: ORANGE })
  text('ORDEN DE RECEPCIÓN', pageW - margin, 12, { size: 11, bold: true, color: ORANGE, align: 'right' })
  text(`N° ${repair.order_number}`, pageW - margin, 19, { size: 14, bold: true, color: WHITE, align: 'right' })
  text(`Fecha: ${new Date(repair.created_at).toLocaleDateString('es-CL')}`, pageW - margin, 25, { size: 8, color: GRAY, align: 'right' })

  y = 45

  // ESTADO ACTUAL
  doc.setFillColor(249, 115, 22, 0.08)
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'S')
  text(`Estado: ${STATUS_LABELS_BRAVO[repair.status] || repair.status}`, margin + 4, y + 6.5, { size: 9, bold: true, color: ORANGE })

  if (repair.estimated_delivery) {
    const delivery = new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    text(`Entrega estimada: ${delivery}`, pageW - margin - 4, y + 6.5, { size: 9, color: GRAY, align: 'right' })
  }

  y += 16

  // DATOS DEL CLIENTE
  y = section('Datos del Cliente', y)
  y = row('Nombre', client?.name, y, false)
  y = row('DNI/RUT', client?.dni || client?.rut, y, true)
  y = row('Teléfono', client?.phone, y, false)
  y = row('Email', client?.email, y, true)
  y += 4

  // DETALLES DEL TRABAJO
  y = section('Detalles del Trabajo de Personalización', y)
  y = row('Producto Base', repair.device_type, y, false)
  y = row('Técnica de Estampado', repair.print_technique || 'Por Definir', y, true)
  y = row('Ubicación de Estampado', repair.print_location || 'Por Definir', y, false)
  y = row('Dimensiones de Diseño', repair.print_dimensions || 'Por Definir', y, true)
  
  if (repair.design_file_url) {
    const shortUrl = repair.design_file_url.length > 50 ? repair.design_file_url.substring(0, 47) + '...' : repair.design_file_url
    y = row('Archivo de Diseño', shortUrl, y, false)
  } else {
    y = row('Archivo de Diseño', 'No provisto (pendiente)', y, false)
  }
  
  y += 4

  // DETALLES DEL PEDIDO (REPORTED ISSUE)
  text('Descripción detallada del pedido / Instrucciones especiales:', margin + 2, y, { color: GRAY, size: 9 })
  y += 5
  doc.setFillColor(...LIGHT)
  doc.rect(margin, y - 2, contentW, 18, 'F')
  const descLines = doc.splitTextToSize(repair.reported_issue || 'Ninguna instrucción especial registrada.', contentW - 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(descLines.slice(0, 3), margin + 4, y + 4)
  y += 22

  // COSTOS
  y = section('Información de Pago', y)
  const totalCost = Number(repair.repair_cost) || 0
  const deposit = Number(repair.deposit) || 0
  const balance = totalCost - deposit

  y = row('Total del Pedido', totalCost > 0 ? `$${totalCost.toLocaleString('es-CL')}` : 'Por definir', y, false)
  y = row('Abono Realizado', deposit > 0 ? `$${deposit.toLocaleString('es-CL')}` : '—', y, true)

  // Saldo Pendiente
  doc.setFillColor(balance > 0 ? 254 : 240, balance > 0 ? 243 : 253, balance > 0 ? 199 : 250)
  doc.rect(margin, y - 4, contentW, 8, 'F')
  text('SALDO PENDIENTE', margin + 2, y + 1.2, { size: 9, bold: true, color: balance > 0 ? [194, 65, 12] : [21, 128, 61] })
  text(
    balance > 0 ? `$${balance.toLocaleString('es-CL')}` : 'PAGADO',
    margin + 55, y + 1.2,
    { size: 9, bold: true, color: balance > 0 ? [194, 65, 12] : [21, 128, 61] }
  )
  y += 12

  // TÉRMINOS Y CONDICIONES (Personalizados para Grupo Bravo)
  y = section('Condiciones de Servicio y Retiro', y)

  const terms = [
    '1. Los productos personalizados son de fabricación única. No se aceptan cambios ni devoluciones una vez aprobado el diseño por el cliente.',
    '2. Grupo Bravo no se responsabiliza por daños térmicos o deterioros en prendas proporcionadas por el cliente que no sean aptas para altas temperaturas en el proceso de curado.',
    '3. Se requiere un abono mínimo del 50% del total presupuestado para dar inicio a la etapa de diseño y producción.',
    '4. El plazo de entrega es estimativo. Pasados 45 días desde la notificación de retiro, el taller no se responsabiliza por el almacenamiento de los productos.',
    '5. Es indispensable presentar esta orden de recepción física o en formato digital para retirar sus productos.'
  ]

  doc.setFontSize(7.2)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  terms.forEach(term => {
    const lines = doc.splitTextToSize(term, contentW - 4)
    doc.text(lines, margin + 2, y)
    y += lines.length * 3.5 + 1.5
  })

  y += 4

  // FIRMAS
  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  const col1 = margin
  const col2 = margin + contentW / 2 + 5

  doc.line(col1, y + 12, col1 + 75, y + 12)
  doc.line(col2, y + 12, col2 + 75, y + 12)

  text('Firma del Cliente', col1, y + 16, { size: 8, color: GRAY })
  text('Firma Grupo Bravo', col2, y + 16, { size: 8, color: GRAY })
  text(client?.name || 'Cliente Recibe', col1, y + 21, { size: 7, color: GRAY })
  text('Encargado de Producción', col2, y + 21, { size: 7, color: GRAY })

  // PIE DE PÁGINA
  doc.setFillColor(...DARK)
  doc.rect(0, 282, pageW, 15, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 282, pageW, 0.8, 'F')

  text('GRUPO BRAVO · Quillota, Chile', pageW / 2, 288, { size: 7, bold: true, color: ORANGE, align: 'center' })
  text(`Pedido N° ${repair.order_number} · Copia Cliente · Generado el ${new Date().toLocaleDateString('es-CL')}`, pageW / 2, 293, { size: 6.5, color: GRAY, align: 'center' })

  handlePDFOutput(doc, `Bravo-Cliente-${repair.order_number}.pdf`)
}

// ─────────────────────────────────────────────────────────────
// 2. GENERAR GUÍA DE PRODUCCIÓN INTERNA (COPIA TALLER) - BRAVO
// ─────────────────────────────────────────────────────────────
export function generateBravoProductionPDF(repair, client) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 20

  // Colores Corporativos Bravo
  const ORANGE = [249, 115, 22] // Naranja cálido
  const DARK = [30, 30, 36]     // Antracita
  const GRAY = [110, 110, 120]  // Gris medio
  const LIGHT = [245, 245, 247] // Gris claro
  const WHITE = [255, 255, 255]

  // Helpers
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

  const section = (title, yPos) => {
    doc.setFillColor(...DARK)
    doc.rect(margin, yPos, contentW, 7, 'F')
    doc.setFontSize(9)
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), margin + 3, yPos + 5)
    return yPos + 12
  }

  const row = (label, value, yPos, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...LIGHT)
      doc.rect(margin, yPos - 4, contentW, 7, 'F')
    }
    text(label, margin + 2, yPos, { color: GRAY, size: 9 })
    text(value || '—', margin + 55, yPos, { bold: true, size: 9 })
    return yPos + 7
  }

  // ENCABEZADO
  doc.setFillColor(...ORANGE)
  doc.rect(0, 0, pageW, 35, 'F')
  doc.setFillColor(...DARK)
  doc.rect(0, 33, pageW, 2, 'F')

  text('GRUPO BRAVO', margin, 14, { size: 18, bold: true, color: WHITE })
  text('HOJA DE PRODUCCIÓN & TALLER', margin, 20, { size: 9, color: DARK })
  text('ORDEN TÉCNICA INTERNA', pageW - margin, 12, { size: 11, bold: true, color: DARK, align: 'right' })
  text(`N° ${repair.order_number}`, pageW - margin, 19, { size: 14, bold: true, color: WHITE, align: 'right' })
  text(`Fecha Ingreso: ${new Date(repair.created_at).toLocaleDateString('es-CL')}`, pageW - margin, 25, { size: 8, color: WHITE, align: 'right' })

  y = 45

  // ESTADO & PRIORIDAD
  doc.setFillColor(245, 245, 247)
  doc.setDrawColor(...DARK)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'FD')
  text(`Estado Interno: ${STATUS_LABELS_BRAVO[repair.status] || repair.status}`, margin + 4, y + 6.5, { size: 9, bold: true, color: DARK })

  if (repair.estimated_delivery) {
    const delivery = new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    text(`Fecha límite de entrega: ${delivery}`, pageW - margin - 4, y + 6.5, { size: 9, bold: true, color: [220, 38, 38], align: 'right' })
  }

  y += 16

  // ESPECIFICACIONES TÉCNICAS DE PRODUCCIÓN
  y = section('Especificaciones de Producción', y)
  y = row('Producto Base', repair.device_type, y, false)
  y = row('Técnica de Estampado', repair.print_technique || 'Por Definir', y, true)
  y = row('Ubicación del Estampado', repair.print_location || 'Por Definir', y, false)
  y = row('Dimensiones del Diseño', repair.print_dimensions || 'Por Definir', y, true)
  
  if (repair.design_file_url) {
    y = row('Enlace al Diseño', repair.design_file_url, y, false)
  } else {
    y = row('Enlace al Diseño', 'PENDIENTE CARGA DE ARCHIVO', y, false)
  }

  if (repair.accessories) {
    y = row('Insumos/Prendas Aportadas', repair.accessories, y, true)
  } else {
    y = row('Insumos/Prendas Aportadas', 'Prendas del Inventario Interno', y, true)
  }

  y += 4

  // INSTRUCCIONES DE DISEÑO Y DETALLES DEL TRABAJO
  text('Instrucciones Técnicas de Taller:', margin + 2, y, { color: GRAY, size: 9 })
  y += 5
  doc.setFillColor(...LIGHT)
  doc.rect(margin, y - 2, contentW, 22, 'F')
  const descLines = doc.splitTextToSize(repair.reported_issue || 'Sin instrucciones adicionales registradas.', contentW - 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(descLines.slice(0, 4), margin + 4, y + 4)
  y += 26

  // CHECKLIST DE CONTROL DE CALIDAD (QA) PARA PRODUCCIÓN
  y = section('Protocolo de Control de Calidad Obligatorio (QA)', y)
  const checklist = getChecklistTemplate(repair.device_type, repair.print_technique)

  text('Verificar y marcar cada punto antes de proceder a la entrega:', margin + 2, y, { size: 8, color: GRAY })
  y += 6

  checklist.forEach((item, index) => {
    // Dibujar cuadrito de checkbox
    doc.setDrawColor(...DARK)
    doc.setLineWidth(0.4)
    doc.rect(margin + 2, y - 3, 4, 4)

    // Texto de la regla de calidad
    text(item.label, margin + 9, y, { bold: true, size: 8.5 })
    text(`— ${item.desc}`, margin + 50, y, { size: 7.5, color: GRAY })
    
    y += 6.5
  })
  
  y += 3

  // HISTORIAL DE COMENTARIOS / OBSERVACIONES DE TALLER
  y = section('Historial y Notas del Equipo de Taller', y)
  const comments = repair.comments || []
  if (comments.length > 0) {
    comments.slice(-4).forEach(comment => {
      const userLabel = comment.user?.name || 'Técnico'
      const dateLabel = new Date(comment.created_at).toLocaleDateString('es-CL')
      text(`[${dateLabel}] ${userLabel}:`, margin + 2, y, { bold: true, size: 8, color: ORANGE })
      
      const commentLines = doc.splitTextToSize(comment.content || '', contentW - 40)
      doc.text(commentLines, margin + 40, y)
      y += (commentLines.length * 3.5) + 2
    })
  } else {
    text('No se han registrado observaciones técnicas adicionales.', margin + 2, y, { size: 8.5, color: GRAY })
    y += 8
  }

  y += 6

  // FIRMA DE APROBACIÓN TALLER
  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  doc.line(margin + 5, y + 12, margin + 80, y + 12)
  doc.line(margin + 95, y + 12, margin + 170, y + 12)

  text('Firma Operario de Producción', margin + 5, y + 16, { size: 8, color: GRAY })
  text('Aprobación Control de Calidad', margin + 95, y + 16, { size: 8, color: GRAY })

  // PIE DE PÁGINA
  doc.setFillColor(...DARK)
  doc.rect(0, 282, pageW, 15, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 282, pageW, 0.8, 'F')

  text('TALLER GRUPO BRAVO', pageW / 2, 288, { size: 7, bold: true, color: ORANGE, align: 'center' })
  text(`Pedido N° ${repair.order_number} · Copia Interna Taller · Generado el ${new Date().toLocaleDateString('es-CL')}`, pageW / 2, 293, { size: 6.5, color: GRAY, align: 'center' })

  handlePDFOutput(doc, `Bravo-Taller-${repair.order_number}.pdf`)
}

// ─────────────────────────────────────────────────────────────
// 3. GENERAR COTIZACIÓN OFICIAL EN PDF - BRAVO
// ─────────────────────────────────────────────────────────────
export function generateBravoQuotationPDF(q, { download = true } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 16

  const ORANGE = [249, 115, 22]
  const DARK = [24, 24, 27]
  const GRAY = [100, 100, 110]
  const LIGHT = [248, 248, 250]
  const WHITE = [255, 255, 255]
  const AMBER = [217, 119, 6]

  const text = (str, x, yPos, opts = {}) => {
    doc.setFontSize(opts.size || 9.5)
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

  // Header Banner
  doc.setFillColor(...DARK)
  doc.rect(0, 0, pageW, 36, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 34, pageW, 2, 'F')

  text('PERSONALIZACIONES BRAVO', margin, 13, { size: 16, bold: true, color: WHITE })
  text('Estampados, Serigrafía, Sublimación & Textil · Quillota', margin, 19, { size: 8.5, color: ORANGE })
  text('contacto@personalizacionesbravo.com · +56 9 6754 7300', margin, 25, { size: 8, color: [200, 200, 200] })

  text('COTIZACIÓN OFICIAL', pageW - margin, 12, { size: 11, bold: true, color: ORANGE, align: 'right' })
  text(`N° ${q.quote_number || 'COT-0000'}`, pageW - margin, 19, { size: 14, bold: true, color: WHITE, align: 'right' })
  const quoteDate = q.created_at ? new Date(q.created_at).toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL')
  text(`Fecha de Emisión: ${quoteDate}`, pageW - margin, 26, { size: 8, color: [200, 200, 200], align: 'right' })

  y = 44

  // Estado y Vigencia
  doc.setFillColor(255, 251, 235)
  doc.setDrawColor(253, 230, 138)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, contentW, 9, 2, 2, 'FD')
  
  const statusLabel = (q.status || 'borrador').toUpperCase()
  text(`Estado: ${statusLabel}`, margin + 4, y + 6, { size: 8.5, bold: true, color: AMBER })

  const validStr = q.valid_until
    ? new Date(q.valid_until + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Válida por 15 días corridos'
  text(`⏰ Validez de la propuesta: ${validStr}`, pageW - margin - 4, y + 6, { size: 8.5, bold: true, color: AMBER, align: 'right' })

  y += 14

  // Datos del Cliente y Emisor
  doc.setFillColor(...LIGHT)
  doc.setDrawColor(228, 228, 231)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, (contentW / 2) - 2, 26, 2, 2, 'FD')
  doc.roundedRect(margin + (contentW / 2) + 2, y, (contentW / 2) - 2, 26, 2, 2, 'FD')

  // Caja Emisor
  text('EMITIDO POR', margin + 4, y + 5, { size: 7.5, bold: true, color: ORANGE })
  text('Personalizaciones Bravo', margin + 4, y + 10, { size: 9, bold: true, color: DARK })
  text('Ramón Freire 45, Local 101, Quillota', margin + 4, y + 15, { size: 8, color: GRAY })
  text('Taller de Estampados & Merchandising', margin + 4, y + 20, { size: 8, color: GRAY })

  // Caja Cliente
  const clientName = q.client?.name || q.client_name || 'Cliente Particular'
  const clientPhone = q.client?.phone || q.client_phone || '—'
  const clientEmail = q.client?.email || q.client_email || '—'
  const clientRut = q.client?.rut || q.client?.dni || '—'

  text('COTIZACIÓN PREPARADA PARA', margin + (contentW / 2) + 6, y + 5, { size: 7.5, bold: true, color: ORANGE })
  text(clientName, margin + (contentW / 2) + 6, y + 10, { size: 9, bold: true, color: DARK })
  text(`RUT/DNI: ${clientRut}  ·  Fono: ${clientPhone}`, margin + (contentW / 2) + 6, y + 15, { size: 8, color: GRAY })
  text(`Email: ${clientEmail}`, margin + (contentW / 2) + 6, y + 20, { size: 8, color: GRAY })

  y += 32

  // Tabla de Ítems
  doc.setFillColor(...DARK)
  doc.rect(margin, y, contentW, 7, 'F')
  text('DESCRIPCIÓN DEL PRODUCTO / SERVICIO', margin + 4, y + 4.8, { size: 8, bold: true, color: WHITE })
  text('CANT', margin + contentW - 65, y + 4.8, { size: 8, bold: true, color: WHITE, align: 'center' })
  text('P. UNITARIO', margin + contentW - 35, y + 4.8, { size: 8, bold: true, color: WHITE, align: 'right' })
  text('SUBTOTAL', margin + contentW - 4, y + 4.8, { size: 8, bold: true, color: WHITE, align: 'right' })

  y += 7

  const items = q.items || []
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT)
      doc.rect(margin, y, contentW, 8, 'F')
    }
    doc.setDrawColor(235, 235, 238)
    doc.line(margin, y + 8, margin + contentW, y + 8)

    const desc = item.description || 'Ítem de cotización'
    text(desc.length > 55 ? desc.slice(0, 52) + '...' : desc, margin + 4, y + 5.5, { size: 8.5, color: DARK })
    text(String(item.quantity || 1), margin + contentW - 65, y + 5.5, { size: 8.5, bold: true, color: DARK, align: 'center' })
    text(`$${Number(item.unit_price || 0).toLocaleString('es-CL')}`, margin + contentW - 35, y + 5.5, { size: 8.5, color: GRAY, align: 'right' })
    text(`$${Number(item.subtotal || 0).toLocaleString('es-CL')}`, margin + contentW - 4, y + 5.5, { size: 8.5, bold: true, color: DARK, align: 'right' })

    y += 8
  })

  y += 5

  // Cuadro de Totales
  const subtotal = Number(q.subtotal || 0)
  const discount = Number(q.discount || 0)
  const total = Number(q.total || 0)

  const totBoxW = 75
  const totBoxX = margin + contentW - totBoxW

  doc.setFillColor(...LIGHT)
  doc.setDrawColor(228, 228, 231)
  doc.roundedRect(totBoxX, y, totBoxW, discount > 0 ? 25 : 18, 2, 2, 'FD')

  let ty = y + 5
  text('Subtotal:', totBoxX + 4, ty, { size: 8.5, color: GRAY })
  text(`$${subtotal.toLocaleString('es-CL')}`, totBoxX + totBoxW - 4, ty, { size: 8.5, bold: true, align: 'right' })
  ty += 6

  if (discount > 0) {
    text('Descuento Especial:', totBoxX + 4, ty, { size: 8.5, color: [220, 38, 38] })
    text(`-$${discount.toLocaleString('es-CL')}`, totBoxX + totBoxW - 4, ty, { size: 8.5, bold: true, color: [220, 38, 38], align: 'right' })
    ty += 6
  }

  doc.setDrawColor(200, 200, 205)
  doc.line(totBoxX + 4, ty - 1, totBoxX + totBoxW - 4, ty - 1)

  text('TOTAL FINAL (CLP):', totBoxX + 4, ty + 4, { size: 9.5, bold: true, color: ORANGE })
  text(`$${total.toLocaleString('es-CL')}`, totBoxX + totBoxW - 4, ty + 4, { size: 11, bold: true, color: DARK, align: 'right' })

  y += (discount > 0 ? 30 : 23)

  // Notas y Condiciones
  if (q.notes || q.terms) {
    if (q.notes) {
      doc.setFillColor(...LIGHT)
      doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F')
      text('NOTAS Y ESPECIFICACIONES:', margin + 4, y + 4.5, { size: 7.5, bold: true, color: ORANGE })
      const noteLines = doc.splitTextToSize(q.notes, contentW - 8)
      doc.setFontSize(8)
      doc.setTextColor(...DARK)
      doc.text(noteLines.slice(0, 2), margin + 4, y + 9)
      y += 17
    }

    if (q.terms) {
      doc.setFillColor(...LIGHT)
      doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F')
      text('TÉRMINOS Y CONDICIONES DE TRABAJO:', margin + 4, y + 4.5, { size: 7.5, bold: true, color: ORANGE })
      const termLines = doc.splitTextToSize(q.terms, contentW - 8)
      doc.setFontSize(8)
      doc.setTextColor(...DARK)
      doc.text(termLines.slice(0, 2), margin + 4, y + 9)
      y += 17
    }
  }

  // Medios de Pago aceptados
  doc.setDrawColor(228, 228, 231)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + contentW, y)
  y += 5

  text('Medios de Pago: Transferencia Bancaria · Tarjetas de Débito / Redcompra · Tarjetas de Crédito · Efectivo en Taller', margin, y, { size: 7.5, color: GRAY })
  text('Para confirmar el inicio de producción se requiere el abono del 50% inicial.', margin, y + 4.5, { size: 7.5, bold: true, color: DARK })

  // Footer
  doc.setFillColor(...DARK)
  doc.rect(0, 282, pageW, 15, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 282, pageW, 0.8, 'F')

  text('PERSONALIZACIONES BRAVO · Quillota, Chile', pageW / 2, 288, { size: 7, bold: true, color: ORANGE, align: 'center' })
  text(`Cotización N° ${q.quote_number} · Documento Oficial Emitido Digitalmente · ${new Date().toLocaleDateString('es-CL')}`, pageW / 2, 293, { size: 6.5, color: GRAY, align: 'center' })

  const filename = `Cotizacion-Bravo-${q.quote_number || 'DOC'}.pdf`
  if (download) {
    doc.save(filename)
  }
  handlePDFOutput(doc, filename)
  return doc
}

// ─────────────────────────────────────────────────────────────
// 4. GENERAR REPORTE DE CAJA CHICA / ARQUEO EN PDF - BRAVO
// ─────────────────────────────────────────────────────────────
export function generateBravoCashRegisterPDF(session, { download = true } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 16
  const contentW = pageW - margin * 2
  let y = 16

  const ORANGE = [249, 115, 22]
  const DARK = [24, 24, 27]
  const GRAY = [100, 100, 110]
  const LIGHT = [248, 248, 250]
  const WHITE = [255, 255, 255]
  const GREEN = [16, 185, 129]
  const RED = [239, 68, 68]

  const text = (str, x, yPos, opts = {}) => {
    doc.setFontSize(opts.size || 9)
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

  // Header Banner
  doc.setFillColor(...DARK)
  doc.rect(0, 0, pageW, 36, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 34, pageW, 2, 'F')

  text('PERSONALIZACIONES BRAVO', margin, 13, { size: 16, bold: true, color: WHITE })
  text('Control de Caja Chica & Tesorería de Taller · Quillota', margin, 19, { size: 8.5, color: ORANGE })
  text(`Sesión #${session.id} · Estado: ${(session.status || 'open').toUpperCase()}`, margin, 25, { size: 8, color: [200, 200, 200] })

  text('ARQUEO DE CAJA', pageW - margin, 12, { size: 11, bold: true, color: ORANGE, align: 'right' })
  const openedDate = session.opened_at ? new Date(session.opened_at).toLocaleString('es-CL') : '—'
  text(`Apertura: ${openedDate}`, pageW - margin, 19, { size: 8, color: WHITE, align: 'right' })
  const closedDate = session.closed_at ? new Date(session.closed_at).toLocaleString('es-CL') : 'Sesión en curso'
  text(`Cierre: ${closedDate}`, pageW - margin, 25, { size: 8, color: [200, 200, 200], align: 'right' })

  y = 44

  // Calcular totales desglosados
  const txs = session.transactions || []
  let cashIn = 0, cashOut = 0, debitIn = 0, transferIn = 0, creditIn = 0
  txs.forEach(t => {
    const amt = parseFloat(t.amount || 0)
    const m = (t.payment_method || 'efectivo').toLowerCase()
    if (t.transaction_type === 'ingreso') {
      if (m === 'efectivo' || m === 'cash') cashIn += amt
      else if (m === 'debito' || m === 'tarjeta_debito' || m === 'tarjeta') debitIn += amt
      else if (m === 'transferencia' || m === 'transfer') transferIn += amt
      else if (m === 'credito' || m === 'tarjeta_credito') creditIn += amt
      else cashIn += amt
    } else {
      if (m === 'efectivo' || m === 'cash') cashOut += amt
    }
  })

  const initialBal = parseFloat(session.initial_balance || 0)
  const expectedCash = initialBal + cashIn - cashOut
  const totalDigital = debitIn + transferIn + creditIn
  const totalRecaudado = cashIn + totalDigital

  // 4 Tarjetas de Resumen KPI
  const cardW = (contentW - 9) / 4
  const cards = [
    { title: 'FONDO INICIAL', val: `$${initialBal.toLocaleString('es-CL')}`, color: DARK },
    { title: 'INGRESOS EFECTIVO', val: `+$${cashIn.toLocaleString('es-CL')}`, color: GREEN },
    { title: 'GASTOS TALLER', val: `-$${cashOut.toLocaleString('es-CL')}`, color: RED },
    { title: 'EFECTIVO GAVETA', val: `$${expectedCash.toLocaleString('es-CL')}`, color: ORANGE, highlight: true },
  ]

  cards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 3)
    doc.setFillColor(c.highlight ? 255 : 248, c.highlight ? 251 : 248, c.highlight ? 235 : 250)
    doc.setDrawColor(c.highlight ? 245 : 228, c.highlight ? 158 : 228, c.highlight ? 11 : 231)
    doc.setLineWidth(0.4)
    doc.roundedRect(cx, y, cardW, 16, 2, 2, 'FD')

    text(c.title, cx + (cardW / 2), y + 5.5, { size: 6.5, bold: true, color: GRAY, align: 'center' })
    text(c.val, cx + (cardW / 2), y + 12.5, { size: 9.5, bold: true, color: c.color, align: 'center' })
  })

  y += 20

  // Tarjetas Medios Digitales
  const digitalCards = [
    { title: 'VENTAS DÉBITO (POS)', val: `$${debitIn.toLocaleString('es-CL')}`, color: [3, 105, 161] },
    { title: 'TRANSFERENCIAS', val: `$${transferIn.toLocaleString('es-CL')}`, color: [146, 64, 14] },
    { title: 'VENTAS CRÉDITO', val: `$${creditIn.toLocaleString('es-CL')}`, color: [107, 33, 168] },
    { title: 'TOTAL RECAUDACIÓN', val: `$${totalRecaudado.toLocaleString('es-CL')}`, color: GREEN, highlight: true },
  ]

  digitalCards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 3)
    doc.setFillColor(c.highlight ? 236 : 248, c.highlight ? 253 : 248, c.highlight ? 245 : 250)
    doc.setDrawColor(c.highlight ? 52 : 228, c.highlight ? 211 : 228, c.highlight ? 153 : 231)
    doc.setLineWidth(0.4)
    doc.roundedRect(cx, y, cardW, 16, 2, 2, 'FD')

    text(c.title, cx + (cardW / 2), y + 5.5, { size: 6.5, bold: true, color: GRAY, align: 'center' })
    text(c.val, cx + (cardW / 2), y + 12.5, { size: 9.5, bold: true, color: c.color, align: 'center' })
  })

  y += 20

  // Estado del Arqueo si está cerrada
  if (session.status === 'closed' && session.actual_balance !== null) {
    const actual = parseFloat(session.actual_balance || 0)
    const diff = actual - expectedCash
    const isCuadrada = diff === 0
    doc.setFillColor(isCuadrada ? 236 : 254, isCuadrada ? 253 : 242, isCuadrada ? 245 : 242)
    doc.setDrawColor(isCuadrada ? 34 : 239, isCuadrada ? 197 : 68, isCuadrada ? 94 : 68)
    doc.setLineWidth(0.4)
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'FD')

    text(`Efectivo Físico Contado: $${actual.toLocaleString('es-CL')}`, margin + 4, y + 6.5, { size: 8.5, bold: true, color: DARK })
    const diffText = isCuadrada ? 'Caja Cuadrada Perfectamente (Diferencia: $0)' : `Diferencia de Arqueo: ${diff > 0 ? '+' : ''}$${diff.toLocaleString('es-CL')} (${diff > 0 ? 'Sobrante' : 'Faltante'})`
    text(diffText, pageW - margin - 4, y + 6.5, { size: 8.5, bold: true, color: isCuadrada ? GREEN : RED, align: 'right' })
    y += 14
  }

  // Tabla de Movimientos
  doc.setFillColor(...DARK)
  doc.rect(margin, y, contentW, 6.5, 'F')
  text('HORA', margin + 3, y + 4.5, { size: 7.5, bold: true, color: WHITE })
  text('TIPO', margin + 20, y + 4.5, { size: 7.5, bold: true, color: WHITE })
  text('MEDIO DE PAGO', margin + 45, y + 4.5, { size: 7.5, bold: true, color: WHITE })
  text('DETALLE / NOTAS', margin + 85, y + 4.5, { size: 7.5, bold: true, color: WHITE })
  text('MONTO', margin + contentW - 4, y + 4.5, { size: 7.5, bold: true, color: WHITE, align: 'right' })

  y += 6.5

  const maxRows = 20
  const displayedTxs = txs.slice(0, maxRows)

  displayedTxs.forEach((t, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT)
      doc.rect(margin, y, contentW, 6.5, 'F')
    }
    doc.setDrawColor(235, 235, 238)
    doc.line(margin, y + 6.5, margin + contentW, y + 6.5)

    const isIngreso = t.transaction_type === 'ingreso'
    const timeStr = t.created_at ? new Date(t.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'
    
    // Normalizar medio de pago para etiqueta
    const m = (t.payment_method || 'efectivo').toLowerCase()
    let mLabel = 'Efectivo'
    if (m.includes('debito') || m === 'tarjeta') mLabel = 'Débito (POS)'
    else if (m.includes('transfer')) mLabel = 'Transferencia'
    else if (m.includes('credit')) mLabel = 'Crédito'

    text(timeStr, margin + 3, y + 4.5, { size: 7.5, color: GRAY })
    text(t.transaction_type.toUpperCase(), margin + 20, y + 4.5, { size: 7.5, bold: true, color: isIngreso ? GREEN : RED })
    text(mLabel, margin + 45, y + 4.5, { size: 7.5, bold: true, color: DARK })
    
    const desc = t.description || 'Movimiento'
    text(desc.length > 40 ? desc.slice(0, 38) + '...' : desc, margin + 85, y + 4.5, { size: 7.5, color: DARK })
    
    text(`${isIngreso ? '+' : '-'}$${parseFloat(t.amount || 0).toLocaleString('es-CL')}`, margin + contentW - 4, y + 4.5, { size: 8, bold: true, color: isIngreso ? GREEN : RED, align: 'right' })

    y += 6.5
  })

  if (txs.length === 0) {
    text('No se registraron movimientos en esta sesión de caja.', margin + contentW / 2, y + 6, { size: 8, color: GRAY, align: 'center' })
    y += 10
  }

  y += 10

  // Firmas
  doc.setDrawColor(200, 200, 205)
  doc.setLineWidth(0.3)
  doc.line(margin + 10, y + 10, margin + 70, y + 10)
  doc.line(margin + contentW - 70, y + 10, margin + contentW - 10, y + 10)

  text('Firma Encargado de Caja / Taller', margin + 40, y + 14, { size: 7.5, color: GRAY, align: 'center' })
  text('Firma Administración / Supervisión', margin + contentW - 40, y + 14, { size: 7.5, color: GRAY, align: 'center' })

  // Footer
  doc.setFillColor(...DARK)
  doc.rect(0, 282, pageW, 15, 'F')
  doc.setFillColor(...ORANGE)
  doc.rect(0, 282, pageW, 0.8, 'F')

  text('PERSONALIZACIONES BRAVO · Quillota, Chile', pageW / 2, 288, { size: 7, bold: true, color: ORANGE, align: 'center' })
  text(`Cierre de Caja Chica · Sesión #${session.id} · Generado el ${new Date().toLocaleString('es-CL')}`, pageW / 2, 293, { size: 6.5, color: GRAY, align: 'center' })

  const filename = `Arqueo-Caja-Bravo-Sesion-${session.id}.pdf`
  if (download) {
    doc.save(filename)
  }
  handlePDFOutput(doc, filename)
  return doc
}
