from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.repair import Repair
from app.schemas.repair import (
    RepairCreate, RepairUpdate, RepairResponse,
    RepairListResponse, RepairStatusUpdate
)
from app.services.repair_service import (
    create_repair, get_repair, get_repairs,
    update_repair, update_repair_status, get_repair_stats
)

router = APIRouter(prefix="/repairs", tags=["repairs"])


@router.post("/", response_model=RepairResponse, status_code=201)
async def create(
    data: RepairCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await create_repair(db, data, created_by_id=current_user.id)


@router.get("/", response_model=list[RepairListResponse])
async def list_repairs(
    status: str | None = Query(None, description="Filtrar por estado"),
    client_id: int | None = Query(None),
    system: str = Query("nova", description="Sistema al que pertenece (nova o bravo)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_repairs(db, status, client_id, system, skip, limit)


@router.get("/stats")
async def stats(
    system: str = Query("nova", description="Sistema al que pertenece (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_repair_stats(db, system)


@router.get("/upcoming", response_model=list[RepairListResponse])
async def upcoming_deliveries(
    days: int = Query(7, description="Próximos N días"),
    system: str = Query("nova", description="Sistema al que pertenece (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    until = today + timedelta(days=days)
    result = await db.execute(
        select(Repair).where(
            and_(
                Repair.estimated_delivery != None,
                Repair.estimated_delivery >= today,
                Repair.estimated_delivery <= until,
                Repair.status != "entregado",
                Repair.status != "cancelado",
                Repair.system == system
            )
        ).order_by(Repair.estimated_delivery)
    )
    return result.scalars().all()


@router.get("/order/{order_number}", response_model=RepairResponse)
async def get_by_order_number(
    order_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Busca una reparación por su número correlativo de orden.
    """
    from app.services.repair_service import get_repair_by_order_number
    return await get_repair_by_order_number(db, order_number)


@router.get("/{repair_id}", response_model=RepairResponse)
async def get_one(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_repair(db, repair_id)


@router.patch("/{repair_id}", response_model=RepairResponse)
async def update(
    repair_id: int,
    data: RepairUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await update_repair(db, repair_id, data)


@router.patch("/{repair_id}/status", response_model=RepairResponse)
async def change_status(
    repair_id: int,
    data: RepairStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await update_repair_status(db, repair_id, data, current_user.id)


@router.delete("/{repair_id}", status_code=204)
async def delete(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.repair_service import delete_repair
    await delete_repair(db, repair_id)


@router.post("/{repair_id}/split", response_model=RepairResponse, status_code=201)
async def split(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.repair_service import split_order
    # Por defecto dividimos el lote a la mitad (1)
    return await split_order(db, repair_id, 1, current_user.id)