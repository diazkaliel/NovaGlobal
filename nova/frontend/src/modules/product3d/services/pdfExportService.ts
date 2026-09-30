import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'
import {
  DecalConfig,
  PricingQuoteBreakdown,
  Product3DModel,
} from '../types/product3d.types'

export interface TechnicalSheetData {
  orderNumber?: string
  product: Product3DModel
  selectedColorHex: string
  colorName?: string
  technique: string
  quantity: number
  decals: DecalConfig[]
  pricing: PricingQuoteBreakdown
  snapshotDataUrl: string
  clientName?: string
}

/**
 * Genera un código de barras en formato DataURL utilizando un canvas en memoria.
 */
function generateBarcodeDataUrl(code: string): string {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: 2,
    height: 48,
    displayValue: true,
    fontSize: 12,
    margin: 4,
    background: '#ffffff',
    lineColor: '#000000',
  })
  return canvas.toDataURL('image/png')
}

/**
 * pdfExportService — Generador de Ficha Técnica de Producción 3D.
 *
 * Captura la escena 3D renderizada e inserta la ficha técnica estandarizada,
 * especificaciones de estampado milimétricas, cotización y código de barras de trazabilidad.
 */
export async function exportTechnicalSheetPdf(data: TechnicalSheetData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const docId = data.orderNumber || `ORD-${Date.now().toString().slice(-6)}`
  const barcodeDataUrl = generateBarcodeDataUrl(docId)

  // ─── 1. Encabezado Corporativo ─────────────────────────────────────────────
  doc.setFillColor(15, 15, 20) // Fondo oscuro para cabecera industrial
  doc.rect(0, 0, 210, 26, 'F')

  doc.setTextColor(245, 158, 11) // Color ámbar
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('BRAVO PERSONALIZACIONES · FICHA TÉCNICA 3D', 14, 12)

  doc.setTextColor(180, 180, 190)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Control de Calidad y Producción Industrial | Generado: ${new Date().toLocaleDateString('es-CL')}`, 14, 19)

  // Identificador de Orden en esquina superior derecha
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`ORDEN #${docId}`, 196, 15, { align: 'right' })

  // ─── 2. Render 3D del Producto en Alta Fidelidad ───────────────────────────
  if (data.snapshotDataUrl) {
    // Marco para el render
    doc.setDrawColor(220, 220, 230)
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(14, 32, 100, 100, 3, 3, 'FD')

    // Imagen del render 3D
    doc.addImage(data.snapshotDataUrl, 'PNG', 16, 34, 96, 96)
  }

  // ─── 3. Especificaciones del Producto y Técnica (Columna Derecha) ──────────
  let y = 38
  const xRight = 120

  doc.setTextColor(30, 30, 35)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(data.product.name, xRight, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 110)
  doc.text(`SKU: ${data.product.sku}`, xRight, y)

  y += 6
  doc.text(`Cliente: ${data.clientName || 'Venta Mostrador / Web'}`, xRight, y)

  y += 8
  doc.setDrawColor(230, 230, 235)
  doc.line(xRight, y, 196, y)

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 35)
  doc.text('Parámetros de Sustrato y Técnica', xRight, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70, 70, 80)
  doc.text(`• Color Base: ${data.colorName || data.selectedColorHex} (${data.selectedColorHex})`, xRight, y)

  y += 5.5
  doc.text(`• Técnica: ${data.technique.toUpperCase()}`, xRight, y)

  y += 5.5
  doc.text(`• Cantidad Solicitada: ${data.quantity} unidades`, xRight, y)

  y += 5.5
  doc.text(`• Área Total de Estampa: ${data.pricing.totalPrintAreaCm2} cm²`, xRight, y)

  y += 8
  doc.setDrawColor(230, 230, 235)
  doc.line(xRight, y, 196, y)

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 35)
  doc.text('Resumen Económico', xRight, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`• Costo Base Producto: $${data.pricing.baseProductPrice.toLocaleString('es-CL')}`, xRight, y)

  y += 5.5
  doc.text(`• Costo Estampado / un: $${data.pricing.customizationCost.toLocaleString('es-CL')}`, xRight, y)

  if (data.pricing.volumeDiscountPct > 0) {
    y += 5.5
    doc.setTextColor(16, 149, 100) // Verde
    doc.text(`• Descuento Volumen: -${data.pricing.volumeDiscountPct}%`, xRight, y)
    doc.setTextColor(70, 70, 80)
  }

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 15, 20)
  doc.text(`TOTAL NETO: $${data.pricing.finalTotal.toLocaleString('es-CL')}`, xRight, y)

  // ─── 4. Tabla Detallada de Estampas y Coordenadas 3D / UV ──────────────────
  y = 140
  doc.setFillColor(240, 242, 245)
  doc.rect(14, y, 182, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(40, 40, 50)
  doc.text('#', 18, y + 5.5)
  doc.text('Zona', 28, y + 5.5)
  doc.text('Tipo Arte', 65, y + 5.5)
  doc.text('Posición Normalizada (X, Y)', 95, y + 5.5)
  doc.text('Escala', 148, y + 5.5)
  doc.text('Rotación', 172, y + 5.5)

  y += 8
  data.decals.forEach((decal, index) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 60)

    const rowY = y + 6
    doc.text(String(index + 1), 18, rowY)
    doc.text(decal.zoneId.toUpperCase(), 28, rowY)
    doc.text(decal.artworkType.toUpperCase(), 65, rowY)
    doc.text(`X: ${(decal.transform.x * 100).toFixed(1)}% | Y: ${(decal.transform.y * 100).toFixed(1)}%`, 95, rowY)
    doc.text(`${Math.round(decal.transform.scale * 100)}%`, 148, rowY)
    doc.text(`${decal.transform.rotationDeg}°`, 172, rowY)

    y += 8
    doc.setDrawColor(240, 240, 245)
    doc.line(14, y, 196, y)
  })

  // ─── 5. Código de Barras y Firmas de Aprobación ───────────────────────────
  y = 232
  doc.setDrawColor(200, 200, 210)
  doc.line(14, y, 196, y)

  y += 6
  // Código de barras para el operario de máquina
  doc.addImage(barcodeDataUrl, 'PNG', 14, y, 65, 22)

  // Cuadros de firma de operador y control de calidad
  const signY = y + 16
  doc.setDrawColor(180, 180, 190)
  doc.line(100, signY, 140, signY)
  doc.line(155, signY, 195, signY)

  doc.setFontSize(7.5)
  doc.setTextColor(120, 120, 130)
  doc.text('Firma Operador / Máquina', 120, signY + 4, { align: 'center' })
  doc.text('Control Calidad (QA)', 175, signY + 4, { align: 'center' })

  // ─── Descarga automática del archivo ──────────────────────────────────────
  doc.save(`FichaTecnica_3D_${docId}.pdf`)
}
