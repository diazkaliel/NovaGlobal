from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime

from app.db.database import get_db
from app.models.repair import Repair, RepairComment
from app.models.client import Client
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.chat import ChatInboxItem, ChatMessageResponse, ChatSendMessageRequest, ChatUnreadCountResponse

router = APIRouter(prefix="/chats", tags=["chats"])

@router.get("/unread_count", response_model=ChatUnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Devuelve la cantidad de mensajes no leídos que han sido enviados por clientes.
    """
    stmt = select(func.count(RepairComment.id)).where(
        RepairComment.is_read == False,
        RepairComment.sender == "client"
    )
    result = await db.execute(stmt)
    count = result.scalar() or 0
    return {"unread_count": count}


@router.get("/inbox", response_model=list[ChatInboxItem])
async def get_inbox(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la lista de clientes con los que hay chats activos.
    Devuelve el último mensaje y el recuento de no leídos agrupado por cliente.
    """
    # Primero obtenemos todos los clientes que tienen reparaciones con comentarios
    stmt = (
        select(Client, Repair.id)
        .join(Repair, Repair.client_id == Client.id)
        .join(RepairComment, RepairComment.repair_id == Repair.id)
        .distinct(Client.id)
    )
    result = await db.execute(stmt)
    clients_with_repairs = result.all()

    inbox_items = []
    
    for client, repair_id in clients_with_repairs:
        # Contar no leídos para este cliente
        unread_stmt = (
            select(func.count(RepairComment.id))
            .join(Repair, RepairComment.repair_id == Repair.id)
            .where(
                Repair.client_id == client.id,
                RepairComment.is_read == False,
                RepairComment.sender == "client"
            )
        )
        unread_res = await db.execute(unread_stmt)
        unread_count = unread_res.scalar() or 0
        
        # Obtener último mensaje para este cliente
        last_msg_stmt = (
            select(RepairComment)
            .join(Repair, RepairComment.repair_id == Repair.id)
            .where(Repair.client_id == client.id)
            .order_by(desc(RepairComment.created_at))
            .limit(1)
        )
        last_msg_res = await db.execute(last_msg_stmt)
        last_msg = last_msg_res.scalar_one_or_none()
        
        if last_msg:
            inbox_items.append(
                ChatInboxItem(
                    client_id=client.id,
                    client_name=client.name,
                    client_phone=client.phone,
                    latest_message=last_msg.message,
                    latest_message_date=last_msg.created_at,
                    unread_count=unread_count,
                    repair_id=last_msg.repair_id # La reparación asociada al último mensaje
                )
            )
            
    # Ordenar por fecha del último mensaje descendente
    inbox_items.sort(key=lambda x: x.latest_message_date, reverse=True)
    
    return inbox_items


@router.get("/{client_id}", response_model=list[ChatMessageResponse])
async def get_client_chat(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene todos los mensajes cruzados con un cliente específico y marca los mensajes entrantes como leídos.
    """
    # Buscar todos los comentarios de las reparaciones del cliente
    stmt = (
        select(RepairComment)
        .join(Repair, RepairComment.repair_id == Repair.id)
        .where(Repair.client_id == client_id)
        .order_by(RepairComment.id.asc())
    )
    result = await db.execute(stmt)
    comments = result.scalars().all()
    
    # Marcar como leídos los que son del cliente
    for comment in comments:
        if comment.sender == "client" and not comment.is_read:
            comment.is_read = True
            
    if comments:
        await db.commit()
        
    return comments


@router.post("/{client_id}", response_model=ChatMessageResponse)
async def send_message_to_client(
    client_id: int,
    data: ChatSendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Envía un mensaje a un cliente. Se asociará a su reparación más reciente.
    """
    # Encontrar la reparación más reciente del cliente
    repair_stmt = (
        select(Repair)
        .where(Repair.client_id == client_id)
        .order_by(desc(Repair.id))
        .limit(1)
    )
    res = await db.execute(repair_stmt)
    repair = res.scalar_one_or_none()
    
    if not repair:
        raise HTTPException(status_code=404, detail="El cliente no tiene reparaciones para asociar el mensaje.")
        
    new_comment = RepairComment(
        repair_id=repair.id,
        sender="admin",
        author_name=current_user.name,
        message=data.message,
        created_at=datetime.utcnow().isoformat(),
        is_read=True  # Los mensajes enviados por nosotros ya se consideran leídos
    )
    
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    
    return new_comment
