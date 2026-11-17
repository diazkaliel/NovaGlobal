from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.models.inventory import InventoryItem, RepairInventory
from app.models.repair import Repair
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate,
    RepairInventoryCreate
)


async def create_item(db: AsyncSession, data: InventoryItemCreate) -> InventoryItem:
    item = InventoryItem(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def get_item(db: AsyncSession, item_id: int, *, lock: bool = False) -> InventoryItem:
    query = select(InventoryItem).where(InventoryItem.id == item_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    return item


async def get_items(
    db: AsyncSession,
    category: str | None = None,
    low_stock_only: bool = False,
    system: str | None = None,
    skip: int = 0,
    limit: int = 50,
    archived: bool = False,
) -> list[InventoryItem]:
    query = select(InventoryItem).where(
        InventoryItem.archived_at.is_not(None) if archived else InventoryItem.archived_at.is_(None)
    )

    if category:
        query = query.where(InventoryItem.category == category)

    if low_stock_only:
        # Filtra items donde el stock actual es menor al mínimo
        query = query.where(InventoryItem.stock <= InventoryItem.min_stock)

    if system:
        query = query.where(InventoryItem.system == system)

    query = query.order_by(InventoryItem.id).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_item(
    db: AsyncSession,
    item_id: int,
    data: InventoryItemUpdate
) -> InventoryItem:
    item = await get_item(db, item_id, lock=True)
    if item.archived_at is not None:
        raise HTTPException(status_code=409, detail="El producto está archivado.")
    update_data = data.model_dump(exclude_unset=True)
    # Validamos el estado completo: PATCH puede cambiar solo costo o categoría.
    current_data = {field: getattr(item, field) for field in InventoryItemCreate.model_fields}
    try:
        InventoryItemCreate.model_validate({**current_data, **update_data})
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()[0]["msg"]) from exc
    for field, value in update_data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


async def use_items_in_repair(
    db: AsyncSession,
    repair_id: int,
    items: list[RepairInventoryCreate],
    *,
    commit: bool = True,
) -> list[RepairInventory]:
    """
    Registra el uso de insumos en una reparación y descuenta el stock.

    CRÍTICO: Todo ocurre dentro de una sola transacción.
    Si cualquier validación falla (stock insuficiente, item no existe),
    se hace rollback completo — no se descuenta nada.
    """
    # Verificamos que la reparación existe
    repair_result = await db.execute(
        select(Repair).where(Repair.id == repair_id)
    )
    if not repair_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reparación no encontrada"
        )

    records = []

    for item_data in items:
        # Bloqueamos el registro con FOR UPDATE para evitar
        # condiciones de carrera si dos requests llegan al mismo tiempo
        result = await db.execute(
            select(InventoryItem)
            .where(InventoryItem.id == item_data.item_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        item = result.scalar_one_or_none()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con id {item_data.item_id} no encontrado"
            )

        if item.archived_at is not None:
            raise HTTPException(status_code=409, detail=f"'{item.name}' está archivado.")

        if item.category != "insumo":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{item.name}' es mercancía, no un insumo. Solo se pueden usar insumos en reparaciones."
            )

        if item.stock < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insuficiente para '{item.name}'. Disponible: {item.stock}, solicitado: {item_data.quantity}"
            )

        # Descontamos el stock
        item.stock -= item_data.quantity

        # Registramos el movimiento
        record = RepairInventory(
            repair_id=repair_id,
            item_id=item_data.item_id,
            quantity=item_data.quantity,
        )
        db.add(record)
        records.append(record)

    # Un solo commit para todo — si algo falló arriba, nada se guardó
    if commit:
        await db.commit()
    else:
        await db.flush()
    return records


async def get_low_stock_alerts(db: AsyncSession, system: str | None = None) -> list[InventoryItem]:
    """Retorna items cuyo stock está en o bajo el mínimo"""
    query = select(InventoryItem).where(
        InventoryItem.stock <= InventoryItem.min_stock,
        InventoryItem.archived_at.is_(None),
    )
    if system:
        query = query.where(InventoryItem.system == system)
    result = await db.execute(query)
    return result.scalars().all()


async def delete_item(db: AsyncSession, item_id: int) -> None:
    """Retira productos Bravo conservando las referencias de órdenes y consumos."""
    item = await get_item(db, item_id, lock=True)
    if item.system == "bravo":
        item.archived_at = item.archived_at or datetime.now(timezone.utc)
    else:
        await db.delete(item)
    await db.commit()
