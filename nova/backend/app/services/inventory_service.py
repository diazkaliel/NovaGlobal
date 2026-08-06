from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.inventory import InventoryItem, RepairInventory, ProductRecipe
from app.models.repair import Repair
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate,
    RepairInventoryCreate
)


async def create_item(db: AsyncSession, data: InventoryItemCreate) -> InventoryItem:
    dump = data.model_dump()
    recipe_data = dump.pop("recipe", None)
    item = InventoryItem(**dump)
    db.add(item)
    await db.flush()  # Para obtener el ID autogenerado
    
    # Si no se provee código de barras, autogenerar uno secuencial único
    if not item.barcode:
        item.barcode = f"INV-{item.id:05d}"
        db.add(item)

    if recipe_data:
        for r_item in recipe_data:
            rec = ProductRecipe(
                product_id=item.id,
                insumo_id=r_item["insumo_id"],
                quantity=r_item.get("quantity", 1.0)
            )
            db.add(rec)
        
    await db.commit()
    return await get_item(db, item.id)


async def get_item(db: AsyncSession, item_id: int) -> InventoryItem:
    try:
        result = await db.execute(
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.recipe_items).selectinload(ProductRecipe.insumo)
            )
            .where(InventoryItem.id == item_id)
        )
        item = result.scalar_one_or_none()
    except Exception:
        result = await db.execute(
            select(InventoryItem).where(InventoryItem.id == item_id)
        )
        item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    try:
        if hasattr(item, 'recipe_items') and item.recipe_items:
            for rec in item.recipe_items:
                if getattr(rec, 'insumo', None):
                    rec.insumo_name = rec.insumo.name
    except Exception:
        pass
    return item


async def get_items(
    db: AsyncSession,
    category: str | None = None,
    low_stock_only: bool = False,
    system: str | None = None,
    skip: int = 0,
    limit: int = 10000
) -> list[InventoryItem]:
    try:
        query = (
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.recipe_items).selectinload(ProductRecipe.insumo)
            )
        )

        if category:
            query = query.where(InventoryItem.category == category)

        if low_stock_only:
            query = query.where(InventoryItem.stock <= InventoryItem.min_stock)

        if system:
            query = query.where(InventoryItem.system == system)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()
    except Exception:
        query = select(InventoryItem)
        if category:
            query = query.where(InventoryItem.category == category)
        if low_stock_only:
            query = query.where(InventoryItem.stock <= InventoryItem.min_stock)
        if system:
            query = query.where(InventoryItem.system == system)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()

    for item in items:
        try:
            if hasattr(item, 'recipe_items') and item.recipe_items:
                for rec in item.recipe_items:
                    if getattr(rec, 'insumo', None):
                        rec.insumo_name = rec.insumo.name
        except Exception:
            pass
    return items


async def update_item(
    db: AsyncSession,
    item_id: int,
    data: InventoryItemUpdate
) -> InventoryItem:
    item = await get_item(db, item_id)
    update_data = data.model_dump(exclude_unset=True)
    recipe_data = update_data.pop("recipe", None)

    for field, value in update_data.items():
        setattr(item, field, value)

    if recipe_data is not None:
        await db.execute(
            delete(ProductRecipe).where(ProductRecipe.product_id == item_id)
        )
        for r_item in recipe_data:
            rec = ProductRecipe(
                product_id=item_id,
                insumo_id=r_item["insumo_id"],
                quantity=r_item.get("quantity", 1.0)
            )
            db.add(rec)

    await db.commit()
    return await get_item(db, item_id)


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

            if item.stock < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para '{item.name}'. Disponible: {item.stock}, solicitado: {item_data.quantity}"
                )

            # Descontamos el stock
            item.stock -= item_data.quantity
            db.add(item)

            # Descontamos receta de insumos si es mercancía
            if item.category == "mercancia":
                from app.models.inventory import ProductRecipe
                rec_result = await db.execute(
                    select(ProductRecipe).where(ProductRecipe.product_id == item.id)
                )
                recipes = rec_result.scalars().all()
                for rec in recipes:
                    insumo_res = await db.execute(
                        select(InventoryItem).where(InventoryItem.id == rec.insumo_id).with_for_update()
                    )
                    ins_item = insumo_res.scalar_one_or_none()
                    if ins_item:
                        ins_item.stock -= item_data.quantity * rec.quantity
                        db.add(ins_item)

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

    # Recargamos con la relación item para que Pydantic pueda serializar sin MissingGreenlet error
    record_ids = [r.id for r in records]
    if record_ids:
        from sqlalchemy.orm import selectinload
        res = await db.execute(
            select(RepairInventory)
            .options(selectinload(RepairInventory.item))
            .where(RepairInventory.id.in_(record_ids))
        )
        return res.scalars().all()

    return []


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