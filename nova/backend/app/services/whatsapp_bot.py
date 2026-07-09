import re
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.repair import Repair
from app.models.web_config import WebConfig

def clean_alphanumeric(value: str | None) -> str:
    """Remueve caracteres no alfanuméricos y convierte a mayúsculas."""
    if not value:
        return ""
    return "".join(c for c in value if c.isalnum()).upper()


def clean_digits(value: str | None) -> str:
    """Remueve caracteres no numéricos."""
    if not value:
        return ""
    return "".join(c for c in value if c.isdigit())

async def get_active_config(db: AsyncSession, system: str = "nova") -> WebConfig:
    """Obtiene la configuración activa de la base de datos o inicializa con valores por defecto."""
    stmt = select(WebConfig).where(WebConfig.system == system).order_by(WebConfig.id.asc()).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        if system == "bravo":
            default_data = {
                "whatsapp": "+56 9 87654321",
                "phone": "+56 9 87654321",
                "email": "contacto@bravopersonalizados.com",
                "address": "Av. Italia 567, Providencia, Santiago",
                "reference_prices": [
                    {"device": "Polera Estampada", "service": "Estampado Vinilo", "price": "12990", "time": "24-48 hrs", "category": "Poleras"},
                    {"device": "Tazón Blanco", "service": "Sublimación Full Color", "price": "4990", "time": "24 hrs", "category": "Tazones"},
                    {"device": "Jockey Trucker", "service": "Estampado Termotransferencia", "price": "6990", "time": "24-48 hrs", "category": "Jockeys"}
                ],
                "faqs": [
                    {"q": "¿Tienen cantidad mínima para pedidos?", "a": "No, estampamos desde 1 unidad en adelante. Hacemos precios por mayor a partir de 10 unidades."},
                    {"q": "¿Cuáles son los tiempos de entrega?", "a": "Los pedidos individuales tardan entre 24 y 48 horas hábiles. Pedidos masivos dependen del stock y diseño."},
                    {"q": "¿Qué formatos de diseño aceptan?", "a": "Preferimos archivos vectoriales (.AI, .EPS, .PDF) o imágenes en alta resolución (.PNG con fondo transparente)."}
                ]
            }
        else:
            # Nova defaults
            import os
            import json
            CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "web_config.json")
            default_data = {
                "whatsapp": "+56 9 46528858",
                "phone": "+56 9 46528858",
                "email": "contacto@novaglobal.com",
                "address": "Av. Providencia 1234, Oficina 501, Santiago",
                "reference_prices": [],
                "faqs": []
            }
            if os.path.exists(CONFIG_PATH):
                try:
                    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                        file_data = json.load(f)
                        default_data.update(file_data)
                except Exception:
                    pass
        
        config = WebConfig(
            whatsapp=default_data.get("whatsapp", ""),
            phone=default_data.get("phone", default_data.get("whatsapp", "")),
            email=default_data.get("email", ""),
            address=default_data.get("address", ""),
            reference_prices=default_data.get("reference_prices", []),
            faqs=default_data.get("faqs", []),
            system=system
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config



async def process_bot_message(message: str, phone: str, db: AsyncSession, system: str = "nova") -> str:
    """
    Procesa un mensaje entrante y retorna la respuesta del chatbot.
    """
    clean_msg = message.strip().lower()
    
    # Obtener configuración dinámica
    config = await get_active_config(db, system=system)
    
    if system == "bravo":
        # ==========================================
        # LÓGICA CONVERSACIONAL DE BRAVO (ESTAMPADOS)
        # ==========================================
        welcome_keywords = {"hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "inicio", "menu", "menú", "bot", "start", "ayuda"}
        if clean_msg in welcome_keywords or not clean_msg:
            return (
                "🤖 *¡Hola! Bienvenido al asistente virtual de Bravo Estampados.*\n\n"
                "Estoy aquí para ayudarte a cotizar, revisar tus pedidos o resolver tus dudas. "
                "Por favor, selecciona una de las siguientes opciones escribiendo el número correspondiente (ej: *1*):\n\n"
                "1️⃣ *Consultar estado de pedido de estampado* 📦\n"
                "2️⃣ *Preguntas frecuentes (FAQs)* ❓\n"
                "3️⃣ *Ubicación y contacto* 📍\n"
                "4️⃣ *Cómo cotizar un diseño personalizado* 🎨\n\n"
                "Puedes volver a este menú en cualquier momento escribiendo *menu*."
            )

        # 1. Consultar estado (Instrucción)
        if clean_msg == "1":
            return (
                "🔍 *Consulta de Estado de Pedido (Bravo)*\n\n"
                "Para verificar el avance de tu prenda o artículo, envíame el *número de orden* (por ejemplo: `ORD-00042`) seguido de un espacio y tu *RUT o teléfono registrado*.\n\n"
                "👉 *Ejemplo:* `ORD-00042 12345678`"
            )
            
        # 2. Listar FAQs
        if clean_msg == "2":
            faqs = config.faqs
            if not faqs:
                return "Lo sentimos, no hay preguntas frecuentes configuradas para Bravo en este momento. Escribe *menu* para regresar."
            
            reply = "❓ *Preguntas Frecuentes (FAQs) - Bravo*\n\n"
            reply += "Escribe el número de la pregunta para ver la respuesta:\n"
            for i, faq in enumerate(faqs, 1):
                reply += f"*{i}* - {faq['q']}\n"
            
            reply += "\nEscribe *menu* para regresar."
            return reply

        # 3. Responder FAQ específica
        if clean_msg.isdigit():
            val = int(clean_msg)
            faqs = config.faqs
            if faqs and 1 <= val <= len(faqs):
                faq = faqs[val - 1]
                return (
                    f"❓ *{faq['q']}*\n\n"
                    f"💬 {faq['a']}\n\n"
                    f"Escribe otro número para ver más FAQs o *menu* para regresar."
                )

        # 4. Ubicación y contacto
        if clean_msg == "3" or "contacto" in clean_msg or "ubicacion" in clean_msg or "dirección" in clean_msg:
            return (
                "📍 *Ubicación y Contacto de Bravo Estampados*\n\n"
                f"🏢 *Dirección:* {config.address}\n"
                f"📞 *Teléfono:* {config.phone}\n"
                f"✉️ *Email:* {config.email}\n"
                f"💬 *WhatsApp:* {config.whatsapp}\n\n"
                "Escribe *menu* para regresar."
            )

        # 5. Cotizar estampado
        if clean_msg == "4" or "cotizar" in clean_msg or "cotizacion" in clean_msg or "diseño" in clean_msg:
            return (
                "🎨 *Cotiza tu Estampado Personalizado en Bravo*\n\n"
                "Llevar tus ideas a una polera, tazón o jockey es muy fácil:\n\n"
                "1. 🌐 *Simulador Web:* Visita el sitio web de Bravo y entra a Cotizar. Podrás cargar tu logotipo, escalarlo y previsualizarlo interactivamente en 2D.\n"
                "2. 💬 *Asesor de Diseño:* Escribe aquí tu idea general o solicítanos contactarte para cotizaciones corporativas (por mayor desde 10 unidades).\n\n"
                "Escribe *menu* para regresar."
            )

        # 6. Buscar orden (Analizar patrón "ORD-XXXXX parámetro")
        order_match = re.search(r'(ord-\d+)', clean_msg)
        if order_match:
            order_number = order_match.group(1).upper()
            parts = clean_msg.replace(order_match.group(1), "").strip().split()
            if not parts:
                return (
                    "⚠️ *Falta información.*\n\n"
                    f"Detecté la orden *{order_number}*, pero necesito que ingreses también el RUT o teléfono de contacto para verificar tu identidad.\n\n"
                    f"👉 *Ejemplo:* `{order_number} 12345678`"
                )
            
            auth_input = parts[0]
            
            # Consultar la orden en BD (filtrando por Bravo)
            stmt = (
                select(Repair)
                .options(
                    selectinload(Repair.client),
                    selectinload(Repair.history)
                )
                .where(Repair.order_number == order_number, Repair.system == "bravo")
            )
            result = await db.execute(stmt)
            repair = result.scalar_one_or_none()
            
            if not repair:
                return f"❌ El pedido *{order_number}* no fue encontrado en el sistema de Bravo. Por favor verifica el número."
                
            client = repair.client
            if not client:
                return "❌ Hubo un error de asociación del cliente con el pedido en el sistema."

            # Validaciones de seguridad
            input_clean = clean_alphanumeric(auth_input)
            client_rut_clean = clean_alphanumeric(client.rut)
            client_phone_digits = clean_digits(client.phone)
            
            matches_rut = input_clean and (input_clean == client_rut_clean)
            matches_phone = False
            if input_clean.isdigit():
                matches_phone = (input_clean == client_phone_digits) or (
                    len(input_clean) >= 9 and client_phone_digits.endswith(input_clean)
                )
                
            if not (matches_rut or matches_phone):
                return "⚠️ *Acceso Denegado.* El RUT o teléfono provisto no coincide con el registrado para este pedido."

            # Generar reporte del estado
            estado_map_bravo = {
                "recibido": "📥 Recibido (Solicitud ingresada)",
                "diagnostico": "🎨 Diseño en Progreso (Revisión y bosquejo)",
                "esperando_repuesto": "🧵 Esperando Insumo / Prenda Base",
                "presupuesto_enviado": "💰 Cotización Enviada",
                "en_reparacion": "🛠️ En Producción / Estampado en curso",
                "listo": "✅ Listo para Entrega",
                "entregado": "📦 Entregado",
                "cancelado": "❌ Cancelado"
            }
            
            est_delivery_str = repair.estimated_delivery.strftime("%d/%m/%Y") if repair.estimated_delivery else "Por definir"
            costo_str = f"${int(repair.repair_cost):,}" if repair.repair_cost else "Pendiente de cotización"
            
            status_text = estado_map_bravo.get(repair.status, repair.status.upper())
            
            historia_res = ""
            if repair.history:
                sorted_history = sorted(repair.history, key=lambda h: h.changed_at)
                for h in sorted_history[-3:]:
                    try:
                        dt = datetime.fromisoformat(h.changed_at.replace("Z", "+00:00"))
                        dt_str = dt.strftime("%d/%m %H:%M")
                    except Exception:
                        dt_str = h.changed_at[:10]
                    historia_res += f"• _{dt_str}_: {estado_map_bravo.get(h.new_status, h.new_status)}\n"
            
            return (
                f"📋 *Ficha de Estado de Pedido: {repair.order_number}*\n\n"
                f"👕 *Tipo:* {repair.device_type} ({repair.model})\n"
                f"⚙️ *Estado Actual:* *{status_text}*\n"
                f"🎨 *Detalles del Diseño:* {repair.reported_issue}\n"
                f"📅 *Entrega Estimada:* {est_delivery_str}\n"
                f"💰 *Costo Total:* {costo_str}\n\n"
                f"📜 *Historial de Avance:*\n{historia_res}\n"
                "Escribe *menu* para regresar."
            )

        return (
            "🤔 No estoy seguro de lo que quisiste decir.\n\n"
            "Escribe *menu* para ver las opciones disponibles o introduce una orden de Bravo y verificación válida (ej: `ORD-00042 12345678`)."
        )

    else:
        # ==========================================
        # LÓGICA CONVERSACIONAL DE NOVA (SERV. TÉCNICO)
        # ==========================================
        welcome_keywords = {"hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "inicio", "menu", "menú", "bot", "start", "ayuda"}
        if clean_msg in welcome_keywords or not clean_msg:
            return (
                "🤖 *¡Hola! Bienvenido al asistente virtual de NovaGlobal.*\n\n"
                "Estoy aquí para ayudarte en lo que necesites de forma rápida. "
                "Por favor, selecciona una de las siguientes opciones escribiendo el número correspondiente (ej: *1*):\n\n"
                "1️⃣ *Consultar estado de reparación* 🛠️\n"
                "2️⃣ *Preguntas frecuentes (FAQs)* ❓\n"
                "3️⃣ *Ubicación y contacto* 📍\n"
                "4️⃣ *Cotizar una reparación* 💰\n\n"
                "Puedes volver a este menú en cualquier momento escribiendo *menu*."
            )

        # 2. Consultar reparación (Instrucción)
        if clean_msg == "1":
            return (
                "🔍 *Consulta de Estado de Reparación*\n\n"
                "Para verificar el estado de tu equipo, envíame el *número de orden* (por ejemplo: `ORD-00042`) seguido de un espacio y tu *RUT o teléfono registrado*.\n\n"
                "👉 *Ejemplo:* `ORD-00042 12345678`"
            )
            
        # 3. Listar FAQs
        if clean_msg == "2":
            faqs = config.faqs
            if not faqs:
                return "Lo sentimos, no hay preguntas frecuentes configuradas en este momento. Escribe *menu* para ver otras opciones."
            
            reply = "❓ *Preguntas Frecuentes (FAQs)*\n\n"
            reply += "Escribe el número de la pregunta para ver la respuesta:\n"
            for i, faq in enumerate(faqs, 1):
                reply += f"*{i}* - {faq['q']}\n"
            
            reply += "\nEscribe *menu* para regresar."
            return reply

        # 4. Responder FAQ específica
        if clean_msg.isdigit():
            val = int(clean_msg)
            faqs = config.faqs
            if faqs and 1 <= val <= len(faqs):
                faq = faqs[val - 1]
                return (
                    f"❓ *{faq['q']}*\n\n"
                    f"💬 {faq['a']}\n\n"
                    f"Escribe otro número para ver más FAQs o *menu* para regresar."
                )

        # 5. Ubicación y contacto
        if clean_msg == "3" or "contacto" in clean_msg or "ubicacion" in clean_msg or "dirección" in clean_msg:
            return (
                "📍 *Ubicación y Contacto de NovaGlobal*\n\n"
                f"🏢 *Dirección:* {config.address}\n"
                f"📞 *Teléfono:* {config.phone}\n"
                f"✉️ *Email:* {config.email}\n"
                f"💬 *WhatsApp:* {config.whatsapp}\n\n"
                "Escribe *menu* para regresar."
            )

        # 6. Cotizar reparación
        if clean_msg == "4" or "cotizar" in clean_msg or "cotizacion" in clean_msg:
            return (
                "💰 *Cotiza tu Reparación en NovaGlobal*\n\n"
                "Puedes solicitar una cotización formal de dos maneras:\n\n"
                "1. 🌐 *Vía Web (Recomendado):* Visita nuestra sección de cotizaciones públicas en el sitio web para ingresar tu dispositivo y detalles de la falla.\n"
                "2. 🙋‍♂️ *Asesor Humano:* Si prefieres hablar directamente con un técnico para que evalúe tu caso, indícalo aquí y nos pondremos en contacto.\n\n"
                "Escribe *menu* para regresar."
            )

        # 7. Buscar orden (Analizar patrón "ORD-XXXXX parámetro")
        order_match = re.search(r'(ord-\d+)', clean_msg)
        if order_match:
            order_number = order_match.group(1).upper()
            # El resto del mensaje debería ser el RUT o teléfono
            parts = clean_msg.replace(order_match.group(1), "").strip().split()
            if not parts:
                return (
                    "⚠️ *Falta información.*\n\n"
                    f"Detecté la orden *{order_number}*, pero necesito que ingreses también el RUT o teléfono de contacto para verificar tu identidad.\n\n"
                    f"👉 *Ejemplo:* `{order_number} 12345678`"
                )
            
            auth_input = parts[0]
            
            # Consultar la orden en BD
            stmt = (
                select(Repair)
                .options(
                    selectinload(Repair.client),
                    selectinload(Repair.history)
                )
                .where(Repair.order_number == order_number, Repair.system == "nova")
            )
            result = await db.execute(stmt)
            repair = result.scalar_one_or_none()
            
            if not repair:
                return f"❌ La orden *{order_number}* no fue encontrada en nuestro sistema de Nova. Por favor verifica el número e intenta nuevamente."
                
            client = repair.client
            if not client:
                return "❌ Hubo un error de asociación del cliente con la orden en el sistema. Contacta a soporte."

            # Validaciones de seguridad
            input_clean = clean_alphanumeric(auth_input)
            client_rut_clean = clean_alphanumeric(client.rut)
            client_phone_digits = clean_digits(client.phone)
            
            matches_rut = input_clean and (input_clean == client_rut_clean)
            matches_phone = False
            if input_clean.isdigit():
                matches_phone = (input_clean == client_phone_digits) or (
                    len(input_clean) >= 9 and client_phone_digits.endswith(input_clean)
                )
                
            if not (matches_rut or matches_phone):
                return "⚠️ *Acceso Denegado.* El RUT o teléfono provisto no coincide con el registrado para esta orden. Por seguridad, verifica tus datos de cliente."

            # Generar reporte del estado
            estado_map = {
                "recibido": "📥 Recibido (Pre-registro)",
                "diagnostico": "🔍 En Diagnóstico (Laboratorio)",
                "en_reparacion": "🛠️ En Reparación",
                "listo": "✅ Listo para Retiro",
                "entregado": "📦 Entregado",
                "cancelado": "❌ Cancelado"
            }
            
            est_delivery_str = repair.estimated_delivery.strftime("%d/%m/%Y") if repair.estimated_delivery else "Por definir"
            costo_str = f"${int(repair.repair_cost):,}" if repair.repair_cost else "Pendiente de diagnóstico"
            
            status_text = estado_map.get(repair.status, repair.status.upper())
            
            historia_res = ""
            if repair.history:
                sorted_history = sorted(repair.history, key=lambda h: h.changed_at)
                # Mostrar últimos 3 movimientos
                for h in sorted_history[-3:]:
                    try:
                        dt = datetime.fromisoformat(h.changed_at.replace("Z", "+00:00"))
                        dt_str = dt.strftime("%d/%m %H:%M")
                    except Exception:
                        dt_str = h.changed_at[:10]
                    historia_res += f"• _{dt_str}_: {estado_map.get(h.new_status, h.new_status)}\n"
            
            return (
                f"📋 *Ficha de Estado de Orden: {repair.order_number}*\n\n"
                f"📱 *Equipo:* {repair.brand} {repair.model} ({repair.device_type})\n"
                f"⚙️ *Estado Actual:* *{status_text}*\n"
                f"🚨 *Falla Reportada:* {repair.reported_issue}\n"
                f"📅 *Entrega Estimada:* {est_delivery_str}\n"
                f"💰 *Costo de Reparación:* {costo_str}\n\n"
                f"📜 *Historial de Estados:*\n{historia_res}\n"
                "Escribe *menu* para regresar."
            )

        # Respuesta por defecto si no coincide con nada
        return (
            "🤔 No estoy seguro de lo que quisiste decir.\n\n"
            "Escribe *menu* para ver las opciones disponibles o introduce una orden de Nova y verificación válida (ej: `ORD-00042 12345678`)."
        )
