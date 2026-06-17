from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.repair import Repair, RepairHistory
from app.models.client import Client
from app.schemas.repair import RepairCreate, RepairUpdate, RepairStatusUpdate

VALID_STATUSES = {
    "recibido",
    "diagnostico",
    "esperando_repuesto",
    "presupuesto_enviado",
    "en_reparacion",
    "listo",
    "entregado",
    "cancelado"
}


async def generate_order_number(db: AsyncSession) -> str:
    """
    Genera el próximo número de orden correlativo.
    Cuenta las reparaciones existentes y suma 1.
    Formato: ORD-00001
    """
    result = await db.execute(select(func.count()).select_from(Repair))
    count = result.scalar()
    return f"ORD-{(count + 1):05d}"


async def create_repair(
    db: AsyncSession,
    data: RepairCreate,
    created_by_id: int
) -> Repair:
    from sqlalchemy.orm import selectinload

    client = await db.execute(
        select(Client).where(Client.id == data.client_id)
    )
    if not client.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )

    order_number = await generate_order_number(db)

    repair = Repair(
        order_number=order_number,
        client_id=data.client_id,
        technician_id=data.technician_id,
        device_type=data.device_type,
        brand=data.brand,
        model=data.model,
        reported_issue=data.reported_issue,
        accessories=data.accessories,
        status="recibido",
        estimated_delivery=data.estimated_delivery,
        repair_cost=data.repair_cost,
        deposit=data.deposit,
    )

    db.add(repair)
    await db.flush()

    history = RepairHistory(
        repair_id=repair.id,
        previous_status=None,
        new_status="recibido",
        note="Equipo ingresado al sistema",
        changed_by_id=created_by_id,
        changed_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(history)
    await db.commit()

    # Recargamos con la relación history incluida explícitamente
    result = await db.execute(
        select(Repair)
        .options(
            selectinload(Repair.history),
            selectinload(Repair.client)
        )
        .where(Repair.id == repair.id)
    )
    return result.scalar_one()


async def get_repair(db: AsyncSession, repair_id: int) -> Repair:
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Repair)
        .options(
            selectinload(Repair.history),
            selectinload(Repair.client)
        )
        .where(Repair.id == repair_id)
    )
    repair = result.scalar_one_or_none()
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reparación no encontrada"
        )
    return repair


async def get_repairs(
    db: AsyncSession,
    status_filter: str | None = None,
    client_id: int | None = None,
    skip: int = 0,
    limit: int = 20
) -> list[Repair]:
    from sqlalchemy.orm import selectinload
    query = select(Repair).options(selectinload(Repair.client))

    if status_filter:
        if status_filter not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estado inválido. Válidos: {VALID_STATUSES}"
            )
        query = query.where(Repair.status == status_filter)

    if client_id:
        query = query.where(Repair.client_id == client_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_repair_status(
    db: AsyncSession,
    repair_id: int,
    data: RepairStatusUpdate,
    changed_by_id: int
) -> Repair:
    if data.new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inválido. Válidos: {VALID_STATUSES}"
        )

    repair = await get_repair(db, repair_id)

    if repair.status == data.new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La reparación ya está en estado '{data.new_status}'"
        )

    # Registramos el cambio en el historial ANTES de actualizar
    history = RepairHistory(
        repair_id=repair.id,
        previous_status=repair.status,
        new_status=data.new_status,
        note=data.note,
        changed_by_id=changed_by_id,
        changed_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(history)

    repair.status = data.new_status
    await db.commit()
    return await get_repair(db, repair_id)


async def update_repair(
    db: AsyncSession,
    repair_id: int,
    data: RepairUpdate
) -> Repair:
    repair = await get_repair(db, repair_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repair, field, value)
    await db.commit()