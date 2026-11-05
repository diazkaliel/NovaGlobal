from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.inventory import InventoryItem
from app.models.repair import Repair
from sqlalchemy import select
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    RepairInventoryCreate, RepairInventoryResponse
)
from app.services.inventory_service import (
    create_item, get_item, get_items, update_item,
    use_items_in_repair, get_low_stock_alerts
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


async def reject_bravo_item(db: AsyncSession, item_id: int) -> None:
    system = await db.scalar(select(InventoryItem.system).where(InventoryItem.id == item_id))
    if system == "bravo":
        raise HTTPException(status_code=404, detail="Producto no encontrado")





@router.post("/", response_model=InventoryItemResponse, status_code=201)
async def create(
    data: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.system != 'nova':
        raise HTTPException(status_code=400, detail='Usa la API de Bravo para su inventario')
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
    if system != 'nova':
        raise HTTPException(status_code=400, detail='Usa la API de Bravo para su inventario')
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
    await reject_bravo_item(db, item_id)
    return await get_item(db, item_id)


@router.patch("/{item_id}", response_model=InventoryItemResponse)
async def update(
    item_id: int,
    data: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await reject_bravo_item(db, item_id)
    if data.system == 'bravo':
        raise HTTPException(status_code=422, detail='Sistema inválido para Nova')
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
    repair_system = await db.scalar(select(Repair.system).where(Repair.id == repair_id))
    if repair_system == 'bravo':
        raise HTTPException(status_code=404, detail='Orden no encontrada')
    for material in items:
        await reject_bravo_item(db, material.item_id)
    return await use_items_in_repair(db, repair_id, items)


@router.delete("/{item_id}", status_code=204)
async def delete(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.inventory_service import delete_item
    await reject_bravo_item(db, item_id)
    await delete_item(db, item_id)