import json
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.repair import Repair, RepairHistory
from app.models.client import Client
from app.models.inventory import InventoryItem
from app.models.user import User
from app.models.web_config import WebConfig
from app.models.comment import Comment
from app.core.dependencies import get_current_user
from app.schemas.public import (
    PublicRepairTrackResponse,
    PublicRepairCreate,
    PublicOrderCreate,
    PublicProductResponse,
    WebConfigSchema
)
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.repair_service import generate_order_number
from app.services.whatsapp_bot import get_active_config, process_bot_message

router = APIRouter(prefix="/public", tags=["public"])



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


@router.get("/repairs/track", response_model=PublicRepairTrackResponse)
async def track_repair(
    order_number: str = Query(..., description="Número de orden (ej. ORD-00001)"),
    rut_or_phone: str = Query(..., description="RUT o teléfono del cliente asociado"),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite a los clientes consultar el estado de su orden (Nova o Bravo)
    sin autenticación, proporcionando su número de orden y RUT o Teléfono.
    """
    stmt = (
        select(Repair)
        .options(
            selectinload(Repair.client),
            selectinload(Repair.history)
        )
        .where(Repair.order_number == order_number)
    )
    result = await db.execute(stmt)
    repair = result.scalar_one_or_none()

    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orden no encontrada"
        )

    client = repair.client
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Información del cliente no asociada a la orden"
        )

    # Normalización para evitar fallos de formato en la consulta
    input_clean = clean_alphanumeric(rut_or_phone)
    client_rut_clean = clean_alphanumeric(client.rut)
    
    # También permitimos validar por los últimos dígitos del teléfono
    client_phone_digits = clean_digits(client.phone)
    
    # Comprobar si coincide con el RUT o el teléfono
    matches_rut = input_clean and (input_clean == client_rut_clean)
    
    matches_phone = False
    if input_clean.isdigit():
        # Permitimos coincidencia exacta o los últimos 9 dígitos (formato celular chileno)
        matches_phone = (input_clean == client_phone_digits) or (
            len(input_clean) >= 9 and client_phone_digits.endswith(input_clean)
        )

    if not (matches_rut or matches_phone):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. El RUT o teléfono no coincide con el registrado."
        )

    # Filtrar el historial para omitir notas internas o información confidencial
    # Ordenamos el historial de más antiguo a más nuevo
    sorted_history = sorted(repair.history, key=lambda h: h.changed_at)
    
    public_history = [
        {
            "new_status": h.new_status,
            "changed_at": h.changed_at
        }
        for h in sorted_history
    ]

    return PublicRepairTrackResponse(
        order_number=repair.order_number,
        device_type=repair.device_type,
        brand=repair.brand,
        model=repair.model,
        status=repair.status,
        reported_issue=repair.reported_issue,
        accessories=repair.accessories,
        estimated_delivery=repair.estimated_delivery,
        history=public_history
    )


@router.post("/repair-requests", status_code=status.HTTP_201_CREATED)
async def request_repair(
    data: PublicRepairCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Permite a los clientes pre-registrar una solicitud de reparación en Nova.
    Registra automáticamente al cliente si no existe en la base de datos.
    """
    # Buscamos cliente por teléfono (único)
    client_stmt = select(Client).where(Client.phone == data.client_phone)
    client_result = await db.execute(client_stmt)
    client = client_result.scalar_one_or_none()

    if not client:
        # Creamos nuevo cliente
        client = Client(
            name=data.client_name,
            phone=data.client_phone,
            email=data.client_email,
            rut=data.client_rut,
            city=data.client_city
        )
        db.add(client)
        await db.flush()  # Para obtener el client.id
    else:
        # Si el cliente existe, actualizamos campos vacíos
        if not client.rut and data.client_rut:
            client.rut = data.client_rut
        if not client.email and data.client_email:
            client.email = data.client_email
        if not client.city and data.client_city:
            client.city = data.client_city

    order_number = await generate_order_number(db, system="nova")

    repair = Repair(
        order_number=order_number,
        client_id=client.id,
        device_type=data.device_type,
        brand=data.brand,
        model=data.model,
        reported_issue=data.reported_issue,
        accessories=data.accessories,
        status="recibido",
        system="nova"
    )
    db.add(repair)
    await db.flush()

    history = RepairHistory(
        repair_id=repair.id,
        previous_status=None,
        new_status="recibido",
        note="Pre-registro web realizado por el cliente",
        changed_by_id=None,
        changed_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(history)
    await db.commit()

    return {
        "status": "success",
        "message": "Solicitud recibida correctamente",
        "order_number": order_number
    }


@router.get("/products", response_model=list[PublicProductResponse])
async def list_products(
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el catálogo público de productos/mercancías de Bravo.
    """
    stmt = (
        select(InventoryItem)
        .where(
            InventoryItem.system == "bravo",
            InventoryItem.category == "mercancia"
        )
        .order_by(InventoryItem.name.asc())
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return items


@router.post("/order-requests", status_code=status.HTTP_201_CREATED)
async def request_order(
    data: PublicOrderCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Permite a los clientes solicitar un trabajo de diseño o pedido en Bravo.
    Registra automáticamente al cliente si no existe.
    """
    # Buscamos cliente por teléfono (único)
    client_stmt = select(Client).where(Client.phone == data.client_phone)
    client_result = await db.execute(client_stmt)
    client = client_result.scalar_one_or_none()

    if not client:
        # Creamos nuevo cliente
        client = Client(
            name=data.client_name,
            phone=data.client_phone,
            email=data.client_email,
            rut=data.client_rut,
            city=data.client_city
        )
        db.add(client)
        await db.flush()
    else:
        # Si el cliente existe, actualizamos campos vacíos
        if not client.rut and data.client_rut:
            client.rut = data.client_rut
        if not client.email and data.client_email:
            client.email = data.client_email
        if not client.city and data.client_city:
            client.city = data.client_city

    order_number = await generate_order_number(db, system="bravo")

    order = Repair(
        order_number=order_number,
        client_id=client.id,
        device_type=data.device_type,
        brand=data.brand,
        model=data.model,
        reported_issue=data.reported_issue,
        accessories=data.accessories,
        status="recibido",
        system="bravo"
    )
    db.add(order)
    await db.flush()

    history = RepairHistory(
        repair_id=order.id,
        previous_status=None,
        new_status="recibido",
        note="Pedido / cotización solicitada desde el sitio web",
        changed_by_id=None,
        changed_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(history)
    await db.commit()

    return {
        "status": "success",
        "message": "Solicitud de pedido recibida correctamente",
        "order_number": order_number
    }


@router.get("/web-config", response_model=WebConfigSchema)
async def get_web_config(system: str = Query("nova"), db: AsyncSession = Depends(get_db)):
    """Retorna la configuración editable de la página web pública desde la base de datos."""
    config = await get_active_config(db, system)
    return config


@router.post("/web-config", status_code=status.HTTP_200_OK)
async def update_web_config(
    data: WebConfigSchema,
    system: str = Query("nova"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza la configuración de la web pública en la base de datos (requiere autenticación admin/técnico)."""
    # Buscamos si ya existe el registro de configuración para este sistema
    stmt = select(WebConfig).where(WebConfig.system == system).order_by(WebConfig.id.asc()).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        config = WebConfig(system=system)
        db.add(config)
    
    # Actualizar campos
    config.whatsapp = data.whatsapp
    config.phone = data.phone
    config.email = data.email
    config.address = data.address
    config.reference_prices = [p.model_dump() for p in data.reference_prices]
    config.faqs = [f.model_dump() for f in data.faqs]
    
    await db.commit()
    await db.refresh(config)
    return {"status": "success", "message": f"Configuración de la web ({system}) actualizada en base de datos correctamente"}



@router.get("/comments", response_model=list[CommentResponse])
async def list_approved_comments(db: AsyncSession = Depends(get_db)):
    """Retorna la lista de comentarios de clientes aprobados para mostrar en la web pública."""
    stmt = (
        select(Comment)
        .where(Comment.is_approved == True)
        .order_by(Comment.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_public_comment(
    data: CommentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Permite a los clientes enviar un comentario desde el sitio web público (entra desaprobado)."""
    comment = Comment(
        client_name=data.client_name,
        rating=data.rating,
        comment=data.comment,
        is_approved=False
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(
    Body: str = Form(...),
    From: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook receptor de mensajes de WhatsApp (formato de Twilio).
    Retorna la respuesta XML (TwiML) necesaria para responder de forma interactiva.
    """
    response_msg = await process_bot_message(Body, From, db)
    
    # Twilio requiere respuestas XML
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'    <Message>{response_msg}</Message>\n'
        '</Response>'
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/whatsapp/simulate")
async def whatsapp_simulate(
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint de simulación que permite probar el chatbot conversacional
    enviando un JSON simple {"message": "...", "phone": "..."} desde el panel admin.
    """
    message = data.get("message", "")
    phone = data.get("phone", "+56 9 9999 9999")
    response_msg = await process_bot_message(message, phone, db)
    return {"response": response_msg}

