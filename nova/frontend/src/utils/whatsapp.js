/**
 * Limpia el número de teléfono y genera un link de WhatsApp
 * con un mensaje predefinido según el tipo de notificación
 */
export function getWhatsAppLink(phone, type, data = {}) {
  // Limpiamos el número: quitamos +, espacios, guiones, paréntesis
  const cleaned = phone ? String(phone).replace(/[\s\+\-\(\)]/g, '') : ''
  if (!cleaned) return '#'

  // Si no tiene código de país, asumimos Chile (+56)
  const number = cleaned.startsWith('56') ? cleaned : `56${cleaned}`

  const messages = {
    listo: `Hola ${data.name || 'estimado/a'}\n\nTe informamos que tu equipo *${data.brand || ''} ${data.model || ''}* (Orden ${data.order || ''}) está *listo para retirar* en nuestro local.\n\n${data.cost ? `Monto a cancelar: *$${Number(data.cost).toLocaleString('es-CL')}*\n` : ''}${data.balance && data.balance > 0 ? `Saldo pendiente: *$${Number(data.balance).toLocaleString('es-CL')}*\n` : ''}\nHorario de atención: Lunes a Sábado 10:30 a 19:30\n\n_Nova Tecnologies_`,

    diagnostico: `Hola ${data.name || 'estimado/a'}\n\nTu equipo *${data.brand || ''} ${data.model || ''}* (Orden ${data.order || ''}) está siendo *diagnosticado*. Te contactaremos pronto con el presupuesto.\n\n_Nova Tecnologies_`,

    presupuesto: `Hola ${data.name || 'estimado/a'}\n\nTenemos el presupuesto listo para tu equipo *${data.brand || ''} ${data.model || ''}* (Orden ${data.order || ''}).\n\nValor de la reparación: *$${Number(data.cost || 0).toLocaleString('es-CL')}*\n\nPor favor confírmanos si deseas proceder con la reparación.\n\n_Nova Tecnologies_`,

    demora: `Hola ${data.name || 'estimado/a'}\n\nTe informamos que tu equipo *${data.brand || ''} ${data.model || ''}* (Orden ${data.order || ''}) requiere un poco más de tiempo${data.days ? ` (estimado: ${data.days} días más)` : ''}. Te avisaremos cuando esté listo.\n\nDisculpa las molestias.\n\n_Nova Tecnologies_`,

    listo_bravo: `Hola ${data.name || 'estimado/a'} 👋\n\nTe informamos que tu pedido personalizado *#${data.order || ''}* (${data.brand || ''} ${data.model || ''}) está *LISTO PARA RETIRAR* en nuestro taller de Quillota 🎨.\n\n${data.balance && data.balance > 0 ? `💰 Saldo pendiente a la entrega: *$${Number(data.balance).toLocaleString('es-CL')}*\n` : '✅ Pagado en su totalidad.\n'}\n¡Te esperamos!\n\n_Personalizaciones Bravo · Quillota_`,

    diseno_bravo: `Hola ${data.name || 'estimado/a'} 👋\n\nTe contactamos de *Personalizaciones Bravo* por tu pedido *#${data.order || ''}* (${data.brand || ''} ${data.model || ''}). Tenemos la muestra del diseño lista para tu revisión y aprobación.\n\n¡Quedamos atentos a tus comentarios! 🎨`,

    produccion_bravo: `Hola ${data.name || 'estimado/a'} 👋\n\nTu pedido *#${data.order || ''}* (${data.brand || ''} ${data.model || ''}) ya ha entrado a *producción e impresión* en nuestro taller de Quillota 🧵.\n\nTe avisaremos apenas pase el control de calidad final.\n\n_Personalizaciones Bravo_`,

    consulta_bravo: `Hola ${data.name || 'estimado/a'} 👋, te contactamos desde el taller de *Personalizaciones Bravo* respecto a tu orden *#${data.order || ''}*.`,

    cotizacion_bravo: `Hola ${data.name || 'estimado/a'}\n\nTe escribimos de *Bravo Taller de Estampados* 👕. Hemos recibido tu propuesta de cotización (Orden *#${data.order || ''}*) para la personalización de *${data.device_type || 'prenda'}* (Diseño: *${data.model || ''}*).\n\nEl valor total es de *$${Number(data.cost || 0).toLocaleString('es-CL')}* CLP.\n\nPor favor, respóndenos a este mensaje indicando si estás de acuerdo con el precio para dar por agendada tu personalización y comenzar con la preparación.\n\n¡Muchas gracias!`,
  }

  const rawMsg = messages[type] || data.message || (typeof type === 'string' ? type : '')
  const message = encodeURIComponent(rawMsg)
  return `https://wa.me/${number}?text=${message}`
}