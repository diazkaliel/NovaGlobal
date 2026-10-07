import re
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.repair import Repair, RepairComment
from app.models.client import Client
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

DEFAULT_NOVA_CONTENT = {
    "hero": {
        "badge": "SISTEMA_ONLINE",
        "title_prefix": "SERVICIO TÉCNICO",
        "title_highlight": "ESPECIALIZADO",
        "description": "Laboratorio de microelectrónica avanzado para dispositivos móviles, notebooks y consolas en Quillota. Consulta el progreso de tu orden en tiempo real con transparencia absoluta o cotiza directo con nuestros técnicos.",
        "cta_whatsapp_text": "Cotizar por WhatsApp",
        "cta_track_text": "Rastrear mi Orden",
        "banner_active": False,
        "banner_text": "¡Diagnóstico sin costo al realizar tu reparación con nosotros!"
    },
    "features": [
        {
            "icon": "ShieldCheck",
            "title": "Garantía Escrita",
            "description": "3 a 6 meses de respaldo real en repuestos y mano de obra con ticket digital."
        },
        {
            "icon": "Wrench",
            "title": "Microelectrónica",
            "description": "Reparación a nivel de componentes en placa madre, integrados y líneas en corto."
        },
        {
            "icon": "Clock",
            "title": "Tiempos Express",
            "description": "Cambio de pantallas y baterías en menos de 2 horas según stock de repuestos."
        },
        {
            "icon": "CheckCircle2",
            "title": "Transparencia Total",
            "description": "Seguimiento online del estado exacto de tu equipo las 24 horas del día."
        }
    ],
    "stats": [
        {"value": "+5.000", "label": "Equipos Reparados"},
        {"value": "98%", "label": "Tasa de Éxito"},
        {"value": "6 Meses", "label": "Garantía Máxima"},
        {"value": "100%", "label": "Repuestos Certificados"}
    ],
    "contact": {
        "schedule": "Lunes a Viernes 10:00 a 19:00 hrs | Sábados 10:30 a 14:30 hrs",
        "instagram": "https://instagram.com/novaglobal",
        "facebook": "https://facebook.com/novaglobal",
        "tiktok": "https://tiktok.com/@novaglobal",
        "google_maps_url": "https://maps.google.com"
    },
    "policies": {
        "warranty_text": "Todas nuestras reparaciones cuentan con garantía legal y comercial respaldada por ticket digital. No cubre golpes, caídas posteriores o ingreso de líquidos post-entrega.",
        "diagnostic_text": "El diagnóstico es 100% gratuito si aceptas la cotización y realizas la reparación en nuestro laboratorio."
    }
}

DEFAULT_BRAVO_CONTENT = {
    "hero": {
        "badge": "TALLER DE PERSONALIZACIÓN Y ESTAMPADOS",
        "title_prefix": "DISEÑO & ESTAMPADO",
        "title_highlight": "TEXTIL PROFESIONAL",
        "description": "Confección y personalización de poleras, polerones, tazones, gorros y merchandising para empresas, eventos y uso personal en Quillota y todo Chile. Desde 1 unidad hasta grandes tirajes.",
        "cta_quote_text": "Cotizar Pedido",
        "cta_catalog_text": "Ver Catálogo Base",
        "banner_active": False,
        "banner_text": "¡Precios especiales por mayor a partir de 10 unidades!"
    },
    "features": [
        {
            "icon": "Sparkles",
            "title": "Sin Mínimo de Compra",
            "description": "Estampa tu diseño desde 1 sola unidad o encarga cientos para tu empresa o delegación."
        },
        {
            "icon": "Printer",
            "title": "Tecnología DTF Ultra HD",
            "description": "Impresiones full color con máxima durabilidad, elasticidad y resistencia a los lavados."
        },
        {
            "icon": "Truck",
            "title": "Envíos a Todo Chile",
            "description": "Retiro en taller en Quillota o despachos express a cualquier región del país."
        },
        {
            "icon": "HeartHandshake",
            "title": "Asesoría Gráfica",
            "description": "Revisamos y optimizamos tu diseño antes de imprimir para asegurar acabados nítidos."
        }
    ],
    "stats": [
        {"value": "+12.000", "label": "Prendas Personalizadas"},
        {"value": "24-48h", "label": "Tiempo Promedio Express"},
        {"value": "100%", "label": "Clientes Satisfechos"},
        {"value": "DTF / Vinilo", "label": "Tecnologías de Vanguardia"}
    ],
    "techniques": [
        {"name": "DTF Textil Ultra HD", "desc": "Microcápsulas de tinta pigmentada con poliamida elastomérica transferidas a 160°C. Resistencia a más de 50 lavados."},
        {"name": "Sublimación Óptica 360°", "desc": "Vitrificado térmico a 200°C con gasificación de tinta en polímero cerámico y metálico. Apto para lavavajillas."},
        {"name": "DTF UV con Barniz 3D", "desc": "Impresión UV curada en frío con relieve táctil y barniz brillante de alta adherencia sobre termos, botellas, cerámica y vidrio."}
    ],
    "contact": {
        "schedule": "Lunes a Viernes 09:30 a 18:30 hrs | Sábados 10:00 a 14:00 hrs",
        "instagram": "https://instagram.com/personalizacionesbravo",
        "facebook": "https://facebook.com/personalizacionesbravo",
        "tiktok": "https://tiktok.com/@personalizacionesbravo",
        "google_maps_url": "https://maps.google.com"
    },
    "policies": {
        "order_terms": "Los trabajos se inician con un abono previo del 50%. El saldo se cancela contra entrega o antes del despacho.",
        "proof_terms": "Siempre enviamos un fotomontaje o muestra digital para tu aprobación antes de mandar a producción."
    }
}

async def get_active_config(db: AsyncSession, system: str = "nova") -> WebConfig:
    """Obtiene la configuración activa de la base de datos o inicializa con valores por defecto."""
    stmt = select(WebConfig).where(WebConfig.system == system).order_by(WebConfig.id.asc()).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    default_content = DEFAULT_BRAVO_CONTENT if system == "bravo" else DEFAULT_NOVA_CONTENT

    if not config:
        if system == "bravo":
            default_data = {
                "whatsapp": "+56 9 6754 7300",
                "phone": "+56 9 6754 7300",
                "email": "personalizacionesbravo@gmail.com",
                "address": "Ramón Freire 45, Galería Freire Local 101, Quillota",
                "reference_prices": [
                    {"device": "Polera Estampada", "service": "Estampado Vinilo", "price": "12990", "time": "24-48 hrs", "category": "Poleras"},
                    {"device": "Tazón Blanco", "service": "Sublimación Full Color", "price": "4990", "time": "24 hrs", "category": "Tazones"},
                    {"device": "Jockey Trucker", "service": "Estampado Termotransferencia", "price": "6990", "time": "24-48 hrs", "category": "Jockeys"}
                ],
                "faqs": [
                    {"q": "¿Tienen cantidad mínima para pedidos?", "a": "No, estampamos desde 1 unidad en adelante. Hacemos precios por mayor a partir de 10 unidades."},
                    {"q": "¿Cuáles son los tiempos de entrega?", "a": "Los pedidos individuales tardan entre 24 y 48 horas hábiles. Pedidos masivos dependen del stock y diseño."},
                    {"q": "¿Qué formatos de diseño aceptan?", "a": "Preferimos archivos vectoriales (.AI, .EPS, .PDF) o imágenes en alta resolución (.PNG con fondo transparente)."}
                ],
                "content": default_content
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
                "faqs": [],
                "content": default_content
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
            content=default_data.get("content", default_content),
            system=system
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    else:
        # Si existe pero la columna content está vacía, poblarla con el contenido por defecto
        if not config.content:
            config.content = default_content
            await db.commit()
            await db.refresh(config)
        elif system == "bravo" and isinstance(config.content, dict):
            # Sanitizar técnicas en base de datos para purgar 'bordado' y 'láser' permanentemente
            techniques = config.content.get("techniques", [])
            has_forbidden = any(
                any(term in (t.get("name", "") + t.get("desc", "")).lower() for term in ["bordad", "laser", "láser", "grabad"])
                for t in techniques
            )
            if has_forbidden or not techniques:
                updated_content = dict(config.content)
                updated_content["techniques"] = DEFAULT_BRAVO_CONTENT["techniques"]
                config.content = updated_content
                await db.commit()
                await db.refresh(config)

    return config


async def save_client_chat_message(
    message: str, 
    phone: str, 
    system: str, 
    db: AsyncSession, 
    author_name: str = "Cliente Web"
):
    """
    Guarda el mensaje del cliente en la base de datos para que aparezca
    en la Bandeja de Mensajes de la Zona de Administradores (/bravo/chats).
    """
    try:
        clean_p = clean_digits(phone) or "56967547300"
        
        # 1. Buscar o crear cliente
        stmt_client = select(Client).where(Client.phone == clean_p, Client.system == system)
        res_client = await db.execute(stmt_client)
        client = res_client.scalar_one_or_none()
        
        if not client:
            client = Client(
                name=author_name if author_name != "Cliente Web" else f"Cliente Chat ({clean_p[-4:] if len(clean_p)>=4 else 'Web'})",
                phone=clean_p,
                email="consulta@chat.local",
                rut="CHAT-CLIENT",
                system=system
            )
            db.add(client)
            await db.flush()
            
        # 2. Buscar o crear orden/reparación asociada
        stmt_repair = (
            select(Repair)
            .where(Repair.client_id == client.id, Repair.system == system)
            .order_by(desc(Repair.id))
            .limit(1)
        )
        res_repair = await db.execute(stmt_repair)
        repair = res_repair.scalar_one_or_none()
        
        if not repair:
            import random
            rand_code = random.randint(1000, 9999)
            repair = Repair(
                client_id=client.id,
                order_number=f"CHAT-{rand_code}",
                device_type="Consulta General Chat",
                brand="Web",
                model="Chat Interno",
                reported_issue="Consulta o mensaje recibido por el Chat Interno",
                status="recibido",
                system=system
            )
            db.add(repair)
            await db.flush()

        # 3. Crear comentario no leído del cliente
        new_comment = RepairComment(
            repair_id=repair.id,
            sender="client",
            author_name=author_name if author_name else client.name,
            message=message,
            created_at=datetime.utcnow().isoformat(),
            is_read=False
        )
        db.add(new_comment)
        await db.commit()
        await db.refresh(new_comment)
        return new_comment
    except Exception as e:
        print(f"Error al guardar mensaje en la bandeja de admin: {e}")
        return None



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
        welcome_keywords = {"hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "inicio", "menu", "menú", "bot", "start", "ayuda"}
        if clean_msg in welcome_keywords or not clean_msg:
            return (
                "🤖 *¡Hola! Bienvenido al asistente virtual de Bravo Estampados.*\n\n"
                "Estoy aquí para ayudarte a cotizar, revisar tus pedidos o conectarte con nuestro equipo. "
                "Por favor, selecciona una de las siguientes opciones escribiendo el número (ej: *1*):\n\n"
                "1️⃣ *Consultar estado de mi pedido* 📦\n"
                "2️⃣ *Ver catálogo de productos a la venta* 👕\n"
                "3️⃣ *Cotizar diseño personalizado* 🎨\n"
                "4️⃣ *Ubicación, horario y contacto* 📍\n"
                "5️⃣ *Hablar con un ejecutivo / Chat Interno* 💬\n"
                "6️⃣ *Preguntas frecuentes (FAQs)* ❓\n\n"
                "Puedes escribir *menu* en cualquier momento para regresar."
            )

        # 1. Consultar estado (Instrucción)
        if clean_msg == "1":
            return (
                "🔍 *Consulta de Estado de Pedido (Bravo)*\n\n"
                "Para verificar el avance de tu prenda o artículo, envíame el *número de orden* (por ejemplo: `ORD-00042`) seguido de un espacio y tu *RUT o teléfono registrado*.\n\n"
                "👉 *Ejemplo:* `ORD-00042 12345678`"
            )
            
        # 2. Catálogo de productos
        if clean_msg == "2" or "catalogo" in clean_msg or "catálogo" in clean_msg or "productos" in clean_msg:
            return (
                "👕 *Catálogo de Artículos Base & Venta Directa*\n\n"
                "Disponemos de stock en tienda listo para personalizar o comprar al instante:\n\n"
                "• *Polerones Hoodie Oversize:* Algodón Heavyweight 100%\n"
                "• *Tazones Cerámicos & Mugs:* 11oz Sublimación Full Color HD\n"
                "• *Vaso Stanley 40oz & Choperos:* Acero 304 térmico y vidrio esmerilado\n"
                "• *Jockeys Snapback & Trucker:* Variedad de colores\n"
                "• *Lienzos DTF Textil (32cm) & DTF UV (28cm):* Venta por metro continuo\n\n"
                "🌐 Visita el catálogo interactivo en la web para previsualizar tu diseño o cotizar directo.\n\n"
                "Escribe *menu* para regresar."
            )

        # 3. Cotizar estampado
        if clean_msg == "3" or "cotizar" in clean_msg or "cotizacion" in clean_msg or "diseño" in clean_msg:
            return (
                "🎨 *Cotiza tu Estampado Personalizado en Bravo*\n\n"
                "Llevar tus ideas a una polera, tazón o jockey es muy fácil:\n\n"
                "1. 🌐 *Simulador Web 2D:* Carga tu logotipo o diseño en la sección Cotizar de nuestra web para ajustar posición y escala.\n"
                "2. 💬 *Asesor de Diseño:* Déjanos tus datos o escribe tu requerimiento corporativo (por mayor desde 10 unidades).\n\n"
                "Escribe *menu* para regresar."
            )

        # 4. Ubicación y contacto
        if clean_msg == "4" or "contacto" in clean_msg or "ubicacion" in clean_msg or "dirección" in clean_msg:
            return (
                "📍 *Ubicación y Canales Directos de Bravo*\n\n"
                f"🏢 *Dirección:* {config.address}\n"
                f"📞 *WhatsApp Oficial:* {config.whatsapp}\n"
                f"📸 *Instagram:* @personalizacionesbravo\n"
                f"✉️ *Email:* {config.email}\n"
                "🕒 *Horario:* Lunes a Viernes de 09:00 a 19:00 hrs.\n\n"
                "Escribe *menu* para regresar."
            )

        # 5. Hablar con un ejecutivo / Chat Interno
        if clean_msg == "5" or "chat" in clean_msg or "ejecutivo" in clean_msg or "hablar" in clean_msg or "soporte" in clean_msg or "humano" in clean_msg:
            return (
                "💬 *Chat Interno con Ejecutivo Bravo*\n\n"
                "¡Estás en comunicación directa con nuestro equipo! Escribe tu consulta, nombre y teléfono a continuación.\n\n"
                "Un ejecutivo del taller revisará tu mensaje en tiempo real a través del panel interno para responderte de inmediato.\n\n"
                "Escribe *menu* para regresar."
            )

        # 6. Listar FAQs
        if clean_msg == "6" or "faq" in clean_msg or "preguntas" in clean_msg:
            faqs = config.faqs
            if not faqs:
                return "Lo sentimos, no hay preguntas frecuentes configuradas para Bravo en este momento. Escribe *menu* para regresar."
            
            reply = "❓ *Preguntas Frecuentes (FAQs) - Bravo*\n\n"
            reply += "Escribe el número de la pregunta para ver la respuesta:\n"
            for i, faq in enumerate(faqs, 1):
                reply += f"*{i}* - {faq['q']}\n"
            
            reply += "\nEscribe *menu* para regresar."
            return reply

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

        # Registrar mensaje libre en bandeja de administradores
        await save_client_chat_message(message, phone, system, db)
        return (
            "💬 *Mensaje registrado:* Tu consulta ha sido enviada a la Bandeja de Mensajes de los administradores de Bravo.\n\n"
            "Un ejecutivo del taller responderá tu mensaje a la brevedad. Escribe *menu* para ver el menú principal."
        )

    else:
        # ==========================================
        # LÓGICA CONVERSACIONAL DE NOVA (SERV. TÉCNICO)
        # ==========================================
        welcome_keywords = {"hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "inicio", "menu", "menú", "bot", "start", "ayuda"}
        if clean_msg in welcome_keywords or not clean_msg:
            return (
                "🤖 *¡Hola! Bienvenido al asistente virtual de NovaGlobal.*\n\n"
                "Estoy aquí para ayudarte a consultar tu orden o conectarte con nuestros técnicos. "
                "Por favor, selecciona una opción escribiendo el número (ej: *1*):\n\n"
                "1️⃣ *Consultar estado de reparación* 🛠️\n"
                "2️⃣ *Cotizar una reparación* 💰\n"
                "3️⃣ *Ubicación, horario y contacto* 📍\n"
                "4️⃣ *Hablar con un técnico / Chat Interno* 💬\n"
                "5️⃣ *Preguntas frecuentes (FAQs)* ❓\n\n"
                "Puedes escribir *menu* en cualquier momento para regresar."
            )

        # 1. Consultar reparación (Instrucción)
        if clean_msg == "1":
            return (
                "🔍 *Consulta de Estado de Reparación*\n\n"
                "Para verificar el estado de tu equipo, envíame el *número de orden* (por ejemplo: `ORD-00042`) seguido de un espacio y tu *RUT o teléfono registrado*.\n\n"
                "👉 *Ejemplo:* `ORD-00042 12345678`"
            )

        # 2. Cotizar reparación
        if clean_msg == "2" or "cotizar" in clean_msg or "cotizacion" in clean_msg:
            return (
                "💰 *Cotiza tu Reparación en NovaGlobal*\n\n"
                "Puedes solicitar una cotización formal de dos maneras:\n\n"
                "1. 🌐 *Vía Web (Recomendado):* Ingresa a la sección Cotizaciones en la web para seleccionar tu dispositivo y falla.\n"
                "2. 🙋‍♂️ *Asesor Humano:* Solicita atención por Chat Interno para evaluación por un técnico especializado.\n\n"
                "Escribe *menu* para regresar."
            )

        # 3. Ubicación y contacto
        if clean_msg == "3" or "contacto" in clean_msg or "ubicacion" in clean_msg or "dirección" in clean_msg:
            return (
                "📍 *Ubicación y Contacto de NovaGlobal*\n\n"
                f"🏢 *Dirección:* {config.address}\n"
                f"📞 *Teléfono:* {config.phone}\n"
                f"✉️ *Email:* {config.email}\n"
                f"💬 *WhatsApp:* {config.whatsapp}\n\n"
                "Escribe *menu* para regresar."
            )

        # 4. Hablar con técnico / Chat Interno
        if clean_msg == "4" or "chat" in clean_msg or "tecnico" in clean_msg or "técnico" in clean_msg or "ejecutivo" in clean_msg or "hablar" in clean_msg or "humano" in clean_msg:
            return (
                "💬 *Chat Interno con Técnico Nova*\n\n"
                "¡Estás conectado con nuestro laboratorio técnico! Escribe a continuación el modelo de tu equipo, falla reportada y tu nombre o teléfono.\n\n"
                "Un técnico revisará tu consulta en tiempo real desde el sistema interno.\n\n"
                "Escribe *menu* para regresar."
            )

        # 5. Listar FAQs
        if clean_msg == "5" or "faq" in clean_msg or "preguntas" in clean_msg:
            faqs = config.faqs
            if not faqs:
                return "Lo sentimos, no hay preguntas frecuentes configuradas en este momento. Escribe *menu* para ver otras opciones."
            
            reply = "❓ *Preguntas Frecuentes (FAQs)*\n\n"
            reply += "Escribe el número de la pregunta para ver la respuesta:\n"
            for i, faq in enumerate(faqs, 1):
                reply += f"*{i}* - {faq['q']}\n"
            
            reply += "\nEscribe *menu* para regresar."
            return reply

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

        # Registrar mensaje libre en bandeja de administradores
        await save_client_chat_message(message, phone, system, db)
        return (
            "💬 *Mensaje registrado:* Tu consulta ha sido enviada al laboratorio técnico de NovaGlobal.\n\n"
            "Un técnico revisará tu mensaje a la brevedad. Escribe *menu* para ver las opciones disponibles."
        )
