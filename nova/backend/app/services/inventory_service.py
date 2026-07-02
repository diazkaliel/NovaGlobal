from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.inventory import InventoryItem, RepairInventory
from app.models.repair import Repair
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate,
    RepairInventoryCreate
)


async def create_item(db: AsyncSession, data: InventoryItemCreate) -> InventoryItem:
    item = InventoryItem(**data.model_dump())
    db.add(item)
    await db.flush()  # Para obtener el ID autogenerado
    
    # Si no se provee código de barras, autogenerar uno secuencial único
    if not item.barcode:
        item.barcode = f"INV-{item.id:05d}"
        db.add(item)
        
    await db.commit()
    await db.refresh(item)
    return item


async def get_item(db: AsyncSession, item_id: int) -> InventoryItem:
    result = await db.execute(
        select(InventoryItem).where(InventoryItem.id == item_id)
    )
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
    limit: int = 50
) -> list[InventoryItem]:
    query = select(InventoryItem)

    if category:
        query = query.where(InventoryItem.category == category)

    if low_stock_only:
        # Filtra items donde el stock actual es menor al mínimo
        query = query.where(InventoryItem.stock <= InventoryItem.min_stock)

    if system:
        query = query.where(InventoryItem.system == system)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_item(
    db: AsyncSession,
    item_id: int,
    data: InventoryItemUpdate
) -> InventoryItem:
    item = await get_item(db, item_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


async def use_items_in_repair(
    db: AsyncSession,
    repair_id: int,
    items: list[RepairInventoryCreate]
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

    async with db.begin_nested():
        for item_data in items:
            # Bloqueamos el registro con FOR UPDATE para evitar
            # condiciones de carrera si dos requests llegan al mismo tiempo
            result = await db.execute(
                select(InventoryItem)
                .where(InventoryItem.id == item_data.item_id)
                .with_for_update()
            )
            item = result.scalar_one_or_none()

            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto con id {item_data.item_id} no encontrado"
                )

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
        await db.flush()
    await db.commit()

    return records


async def get_low_stock_alerts(db: AsyncSession, system: str | None = None) -> list[InventoryItem]:
    """Retorna items cuyo stock está en o bajo el mínimo"""
    query = select(InventoryItem).where(
        InventoryItem.stock <= InventoryItem.min_stock
    )
    if system:
        query = query.where(InventoryItem.system == system)
    result = await db.execute(query)
    return result.scalars().all()


async def delete_item(db: AsyncSession, item_id: int) -> None:
    """Elimina un ítem de inventario"""
    item = await get_item(db, item_id)
    await db.delete(item)
    await db.commit()