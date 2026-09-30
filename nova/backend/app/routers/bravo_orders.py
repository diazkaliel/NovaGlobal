from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user, check_system_access
from app.models.user import User
from app.schemas.bravo_order import (
    BravoOrderCreate, BravoOrderUpdate, BravoOrderStatusUpdate,
    BravoOrderResponse, BravoOrderListResponse
)
from app.services.bravo_order_service import (
    create_bravo_order, get_bravo_order, get_bravo_order_by_number,
    get_bravo_orders, update_bravo_order_status, update_bravo_order,
    get_bravo_order_stats
)

router = APIRouter(prefix="/bravo/orders", tags=["bravo-orders"])


@router.post("", response_model=BravoOrderResponse, status_code=201)
@router.post("/", response_model=BravoOrderResponse, status_code=201, include_in_schema=False)
async def create(
    data: BravoOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_system_access(current_user, "bravo")
    return await create_bravo_order(db, data, created_by_id=current_user.id)


@router.get("", response_model=list[BravoOrderListResponse])
@router.get("/", response_model=list[BravoOrderListResponse], include_in_schema=False)
async def list_orders(
    status: str | None = Query(None, description="Filtrar por estado del taller textil"),
    client_id: int | None = Query(None, description="Filtrar por cliente"),
    search: str | None = Query(None, description="Buscar por folio, cliente o prenda"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_system_access(current_user, "bravo")
    return await get_bravo_orders(db, status_filter=status, client_id=client_id, search=search, skip=skip, limit=limit)


@router.get("/stats")
async def stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_system_access(current_user, "bravo")
    return await get_bravo_order_stats(db)


@router.get("/{order_id}", response_model=BravoOrderResponse)
async def get_one(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_system_access(current_user, "bravo")
    return await get_bravo_order(db, order_id)


@router.get("/order/{order_number}", response_model=BravoOrderResponse)
async def get_by_number(
    order_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_system_access(current_user, "bravo")
    return await get_bravo_order_by_number(db, order_number)


@router.patch("/{order_id}/status", response_model=BravoOrderResponse)
async def update_status(
    order_id: int,
    data: BravoOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_system_access(current_user, "bravo")
    return await update_bravo_order_status(db, order_id, data, changed_by_id=current_user.id)


@router.patch("/{order_id}", response_model=BravoOrderResponse)
async def update(
    order_id: int,
    data: BravoOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_system_access(current_user, "bravo")
    return await update_bravo_order(db, order_id, data)
