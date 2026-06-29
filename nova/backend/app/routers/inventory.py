from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    RepairInventoryCreate, RepairInventoryResponse
)
from app.services.inventory_service import (
    create_item, get_item, get_items, update_item,
    use_items_in_repair, get_low_stock_alerts
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/", response_model=InventoryItemResponse, status_code=201)
async def create(
    data: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await create_item(db, data)


@router.get("/", response_model=list[InventoryItemResponse])
async def list_items(
    category: str | None = Query(None, description="insumo o mercancia"),
    low_stock: bool = Query(False, description="Solo items con stock bajo"),
    system: str = Query("nova", description="Sistema al que pertenece (nova o bravo)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = await get_items(db, category, low_stock, system, skip, limit)
    # Calculamos is_low_stock para cada item antes de retornar
    for item in items:
        item.is_low_stock = item.stock <= item.min_stock
    return items


@router.get("/alerts", response_model=list[InventoryItemResponse])
async def low_stock_alerts(
    system: str = Query("nova", description="Sistema al que pertenece (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Endpoint para el panel de control — muestra alertas de stock bajo"""
    return await get_low_stock_alerts(db, system)


@router.get("/{item_id}", response_model=InventoryItemResponse)
async def get_one(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_item(db, item_id)


@router.patch("/{item_id}", response_model=InventoryItemResponse)
async def update(
    item_id: int,
    data: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await update_item(db, item_id, data)


@router.post(
    "/repairs/{repair_id}/use-items",
    response_model=list[RepairInventoryResponse],
    status_code=201
)
async def use_items(
    repair_id: int,
    items: list[RepairInventoryCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra insumos usados en una reparación.
    Descuenta el stock automáticamente de forma atómica.
    """
    return await use_items_in_repair(db, repair_id, items)


@router.delete("/{item_id}", status_code=204)
async def delete(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.inventory_service import delete_item
    await delete_item(db, item_id)