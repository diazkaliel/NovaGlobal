/**
 * Limpia el número de teléfono y genera un link de WhatsApp
 * con un mensaje predefinido contextualizado según el sistema (Nova o Bravo).
 */
export function getWhatsAppLink(phone, type, data = {}) {
  if (!phone) return '#'
  
  // Limpiamos el número: quitamos espacios, símbolos, guiones y letras
  const cleaned = String(phone).replace(/\D/g, '')
  if (!cleaned) return '#'

  // Si no tiene código de país, asumimos Chile (+56)
  let number = cleaned
  if (number.length === 9 && number.startsWith('9')) {
    number = `56${number}`
  } else if (!number.startsWith('56') && number.length === 8) {
    number = `569${number}`
  }

  const name = data.name || 'estimado/a'
  const brand = data.brand || ''
  const model = data.model || ''
  const deviceType = data.device_type || ''
  const order = data.order || ''
  const cost = data.cost ? Number(data.cost).toLocaleString('es-CL') : ''
  const balance = data.balance ? Number(data.balance).toLocaleString('es-CL') : ''

  const messages = {
    // ─────────────── PLANTILLAS NOVA (Servicio Técnico) ───────────────
    listo: `Hola ${name} 👋\n\nTe informamos que tu equipo *${brand} ${model}* (Orden *#${order}*) está *LISTO PARA RETIRAR* en nuestro local de servicio técnico 🛠️.\n\n${cost ? `💰 Total: *$${cost}*\n` : ''}${data.balance && data.balance > 0 ? `💵 Saldo pendiente: *$${balance}*\n` : '✅ Pagado en su totalidad.\n'}\nHorario de atención: Lunes a Sábado 10:30 a 19:30 hrs.\n\n_Nova Tecnologies · Servicio Técnico Especializado_`,

    diagnostico: `Hola ${name} 👋\n\nTu equipo *${brand} ${model}* (Orden *#${order}*) ha ingresado a nuestra mesa de trabajo y se encuentra actualmente en proceso de *DIAGNÓSTICO TÉCNICO* 🔍.\n\nTe contactaremos a la brevedad con el informe detallado y presupuesto.\n\n_Nova Tecnologies_`,

    presupuesto: `Hola ${name} 👋\n\nTenemos listo el presupuesto de reparación para tu equipo *${brand} ${model}* (Orden *#${order}*):\n\n💰 *Valor de la reparación:* *$${cost || '0'}* CLP\n${data.notes ? `📝 *Detalle:* ${data.notes}\n` : ''}\nPor favor confírmanos por este medio si autorizas proceder con el trabajo.\n\n_Nova Tecnologies_`,

    demora: `Hola ${name} 👋\n\nTe informamos que la reparación de tu equipo *${brand} ${model}* (Orden *#${order}*) requiere un poco más de tiempo${data.days ? ` (estimado: ${data.days} días adicionales)` : ''} debido a pruebas rigurosas de control de calidad ⏳.\n\nTe avisaremos tan pronto esté 100% operativo. Agradecemos tu comprensión.\n\n_Nova Tecnologies_`,

    consulta: `Hola ${name} 👋, te contactamos de *Nova Tecnologies* respecto a tu orden de servicio *#${order}* (${brand} ${model}).`,

    // ─────────────── PLANTILLAS BRAVO (Personalizaciones / Textil) ───────────────
    listo_bravo: `Hola ${name} 👋\n\nTe informamos que tu pedido personalizado *#${order}* (*${deviceType ? deviceType + ' ' : ''}${model}*) está *LISTO PARA RETIRAR* en nuestro taller de Quillota 🎨✨.\n\n${data.balance && data.balance > 0 ? `💰 Saldo pendiente a la entrega: *$${balance}*\n` : '✅ Pagado en su totalidad.\n'}\n¡Te esperamos en nuestro taller!\n\n_Personalizaciones Bravo · Quillota_`,

    diseno_bravo: `Hola ${name} 👋\n\nTe contactamos de *Personalizaciones Bravo* por tu pedido *#${order}* (*${deviceType ? deviceType + ' ' : ''}${model}*).\n\n🎨 Tenemos la muestra del diseño lista para tu revisión y aprobación. Por favor indícanos tus comentarios para iniciar la impresión.\n\n_Personalizaciones Bravo_`,

    produccion_bravo: `Hola ${name} 👋\n\nTu pedido *#${order}* (*${deviceType ? deviceType + ' ' : ''}${model}*) ya ha entrado formalmente a *PRODUCCIÓN E IMPRESIÓN* en nuestro taller de Quillota 🧵🔥.\n\nTe avisaremos apenas pase la inspección de control de calidad final.\n\n_Personalizaciones Bravo · Taller de Estampados_`,

    cotizacion_bravo: `Hola ${name} 👋\n\nTe enviamos la cotización de *Personalizaciones Bravo* 👕 para tu requerimiento *#${order}* (*${deviceType || 'Prenda'}* ${model}):\n\n💰 *Presupuesto Total:* *$${cost || '0'}* CLP\n\nPor favor confírmanos si apruebas la propuesta para reservar insumos y agendar tu producción.\n\n_Personalizaciones Bravo · Quillota_`,

    consulta_bravo: `Hola ${name} 👋, te contactamos desde el taller de *Personalizaciones Bravo* respecto a tu pedido *#${order}*.`,
  }

  const rawMsg = messages[type] || data.message || (typeof type === 'string' ? type : '')
  const message = encodeURIComponent(rawMsg)
  return `https://wa.me/${number}?text=${message}`
}