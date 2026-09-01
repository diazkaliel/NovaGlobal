from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timezone

from app.db.database import get_db
from app.models.repair import Repair, RepairComment
from app.models.client import Client
from app.models.user import User
from app.core.dependencies import get_current_user, check_system_access
from app.schemas.chat import ChatInboxItem, ChatMessageResponse, ChatSendMessageRequest, ChatUnreadCountResponse

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("/unread_count", response_model=ChatUnreadCountResponse)
async def get_unread_count(
    system: str | None = Query(None, description="Filtrar conteo por sistema (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Devuelve la cantidad de mensajes no leídos que han sido enviados por clientes,
    respetando el aislamiento de tienda para colaboradores.
    """
    if current_user.role != "admin" and current_user.system != "all":
        system = current_user.system
    else:
        check_system_access(current_user, system)

    query = (
        select(func.count(RepairComment.id))
        .join(Repair, RepairComment.repair_id == Repair.id)
        .where(
            RepairComment.is_read == False,
            RepairComment.sender == "client"
        )
    )
    if system:
        query = query.where(Repair.system == system)

    result = await db.execute(query)
    count = result.scalar() or 0
    return {"unread_count": count}


@router.get("/inbox", response_model=list[ChatInboxItem])
async def get_inbox(
    system: str | None = Query(None, description="Filtrar bandeja por sistema (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la lista de clientes con chats activos según el sistema seleccionado o asignado.
    """
    if current_user.role != "admin" and current_user.system != "all":
        system = current_user.system
    else:
        check_system_access(current_user, system)

    # Obtenemos todos los clientes con comentarios en sus órdenes
    stmt = (
        select(Client, Repair.id)
        .join(Repair, Repair.client_id == Client.id)
        .join(RepairComment, RepairComment.repair_id == Repair.id)
    )
    if system:
        stmt = stmt.where(Repair.system == system)
    stmt = stmt.distinct(Client.id)

    result = await db.execute(stmt)
    clients_with_repairs = result.all()

    inbox_items = []
    
    for client, _ in clients_with_repairs:
        unread_stmt = (
            select(func.count(RepairComment.id))
            .join(Repair, RepairComment.repair_id == Repair.id)
            .where(
                Repair.client_id == client.id,
                RepairComment.is_read == False,
                RepairComment.sender == "client"
            )
        )
        if system:
            unread_stmt = unread_stmt.where(Repair.system == system)

        unread_res = await db.execute(unread_stmt)
        unread_count = unread_res.scalar() or 0
        
        last_msg_stmt = (
            select(RepairComment)
            .join(Repair, RepairComment.repair_id == Repair.id)
            .where(Repair.client_id == client.id)
        )
        if system:
            last_msg_stmt = last_msg_stmt.where(Repair.system == system)
        last_msg_stmt = last_msg_stmt.order_by(desc(RepairComment.created_at)).limit(1)

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
                    repair_id=last_msg.repair_id
                )
            )
            
    inbox_items.sort(key=lambda x: x.latest_message_date, reverse=True)
    return inbox_items


@router.get("/{client_id}", response_model=list[ChatMessageResponse])
async def get_client_chat(
    client_id: int,
    system: str | None = Query(None, description="Filtrar chat por sistema (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene todos los mensajes cruzados con un cliente específico y marca los mensajes entrantes como leídos.
    """
    if current_user.role != "admin" and current_user.system != "all":
        system = current_user.system
    else:
        check_system_access(current_user, system)

    stmt = (
        select(RepairComment)
        .join(Repair, RepairComment.repair_id == Repair.id)
        .where(Repair.client_id == client_id)
    )
    if system:
        stmt = stmt.where(Repair.system == system)
    stmt = stmt.order_by(RepairComment.id.asc())

    result = await db.execute(stmt)
    comments = result.scalars().all()
    
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
    system: str | None = Query(None, description="Sistema de la orden asociada (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Envía un mensaje a un cliente asociado a su orden más reciente en el sistema activo.
    """
    if current_user.role != "admin" and current_user.system != "all":
        system = current_user.system
    else:
        check_system_access(current_user, system)

    repair_stmt = (
        select(Repair)
        .where(Repair.client_id == client_id)
    )
    if system:
        repair_stmt = repair_stmt.where(Repair.system == system)
    repair_stmt = repair_stmt.order_by(desc(Repair.id)).limit(1)

    res = await db.execute(repair_stmt)
    repair = res.scalar_one_or_none()
    
    if not repair:
        raise HTTPException(
            status_code=404, 
            detail=f"El cliente no tiene órdenes registradas en {'el sistema ' + system if system else 'el sistema'} para asociar el mensaje."
        )
        
    new_comment = RepairComment(
        repair_id=repair.id,
        sender="admin",
        author_name=current_user.name or current_user.email,
        message=data.message,
        created_at=datetime.now(timezone.utc).isoformat(),
        is_read=True
    )
    
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    
    return new_comment
