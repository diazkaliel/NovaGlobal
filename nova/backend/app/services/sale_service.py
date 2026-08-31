from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from decimal import Decimal
from datetime import datetime, timedelta

from app.models.sale import Sale, SaleItem
from app.models.inventory import InventoryItem, ProductRecipe
from app.models.cash_register import CashRegisterSession, CashRegisterTransaction
from app.schemas.sale import SaleCreate


async def get_sale_by_id(db: AsyncSession, sale_id: int) -> Sale:
    """
    Retorna una venta por su ID con todas sus relaciones pre-cargadas.
    """
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.client),
            selectinload(Sale.items).selectinload(SaleItem.item).selectinload(InventoryItem.recipe_items)
        )
        .where(Sale.id == sale_id)
    )
    res = await db.execute(stmt)
    sale = res.scalar_one_or_none()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta no encontrada"
        )
    return sale


async def create_sale(db: AsyncSession, sale_data: SaleCreate, user_id: int) -> Sale:
    """
    Registra una venta de forma transaccional.
    Descuenta stock del producto y de sus insumos asociados (receta) de forma atómica.
    Agrega un ingreso a la caja chica si hay una sesión abierta para el sistema.
    """
    # 1. Calcular total y preparar ítems
    total_amount = Decimal("0.00")
    sale_items = []
    
    for item_data in sale_data.items:
        unit_price = Decimal(str(item_data.unit_price))
        total_item = unit_price * item_data.quantity
        total_amount += total_item

        # Si vende mercancía física, validar y descontar stock del producto y sus insumos
        if item_data.item_id:
            stmt = (
                select(InventoryItem)
                .options(selectinload(InventoryItem.recipe_items))
                .where(InventoryItem.id == item_data.item_id)
            )
            res = await db.execute(stmt)
            inv_item = res.scalar_one_or_none()
            
            if not inv_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Ítem de inventario {item_data.item_id} no encontrado."
                )

            # A. Validar stock del producto terminado
            if inv_item.stock < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para {inv_item.name}. Disponible: {inv_item.stock}, Requerido: {item_data.quantity}"
                )
            inv_item.stock -= item_data.quantity
            db.add(inv_item)

            # B. Si tiene receta (insumos requeridos), validar y descontar cada insumo
            for recipe in inv_item.recipe_items:
                supply = await db.get(InventoryItem, recipe.supply_id)
                if not supply:
                    continue
                
                required_supply_qty = recipe.quantity_needed * item_data.quantity
                if supply.stock < required_supply_qty:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insumo insuficiente '{supply.name}' para fabricar {inv_item.name}. Disponible: {supply.stock}, Requerido: {required_supply_qty}"
                    )
                supply.stock -= required_supply_qty
                db.add(supply)

        sale_items.append(
            SaleItem(
                item_id=item_data.item_id,
                service_name=item_data.service_name,
                quantity=item_data.quantity,
                unit_price=unit_price
            )
        )

    # 2. Guardar venta
    sale = Sale(
        system=sale_data.system,
        client_id=sale_data.client_id,
        total_amount=total_amount,
        payment_method=sale_data.payment_method,
        sale_type=sale_data.sale_type,
        reference_id=sale_data.reference_id,
        items=sale_items
    )
    db.add(sale)
    await db.flush()

    # 3. Registrar movimiento en Caja Chica si aplica
    stmt_session = (
        select(CashRegisterSession)
        .options(selectinload(CashRegisterSession.transactions))
        .where(
            and_(
                CashRegisterSession.system == sale_data.system,
                CashRegisterSession.status == "open"
            )
        )
    )
    res_session = await db.execute(stmt_session)
    active_session = res_session.scalar_one_or_none()

    if active_session:
        tx = CashRegisterTransaction(
            session_id=active_session.id,
            transaction_type="ingreso",
            amount=total_amount,
            description=f"Venta directa #{sale.id} ({sale_data.sale_type})",
            payment_method=sale_data.payment_method
        )
        db.add(tx)
        
        # Si es efectivo, sumamos al balance esperado de la caja
        if sale_data.payment_method == "efectivo":
            active_session.expected_balance += total_amount
            db.add(active_session)

    await db.commit()
    return await get_sale_by_id(db, sale.id)


async def get_sales(db: AsyncSession, system: str, limit: int = 100, offset: int = 0) -> list[Sale]:
    """
    Retorna la lista de ventas registradas en un sistema.
    """
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.client),
            selectinload(Sale.items).selectinload(SaleItem.item).selectinload(InventoryItem.recipe_items)
        )
        .where(Sale.system == system)
        .order_by(Sale.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_sale_stats(db: AsyncSession, system: str) -> dict:
    """
    Calcula métricas financieras agregadas para el panel de control.
    """
    # 1. Ingresos totales y cantidad de ventas
    stmt_totals = select(
        func.sum(Sale.total_amount).label("total"),
        func.count(Sale.id).label("count")
    ).where(Sale.system == system)
    res_totals = await db.execute(stmt_totals)
    row = res_totals.first()
    
    total_revenue = Decimal(str(row.total or 0.00))
    sales_count = row.count or 0
    average_ticket = total_revenue / sales_count if sales_count > 0 else Decimal("0.00")

    # 2. Ventas por método de pago
    stmt_pm = select(
        Sale.payment_method,
        func.count(Sale.id).label("count"),
        func.sum(Sale.total_amount).label("total")
    ).where(Sale.system == system).group_by(Sale.payment_method)
    res_pm = await db.execute(stmt_pm)
    by_payment_method = [
        {"method": r.payment_method, "count": r.count, "total": Decimal(str(r.total))}
        for r in res_pm.all()
    ]

    # 3. Ingresos diarios de los últimos 15 días
    start_date = datetime.utcnow() - timedelta(days=15)
    stmt_daily = select(
        func.date(Sale.created_at).label("day"),
        func.sum(Sale.total_amount).label("total")
    ).where(
        and_(
            Sale.system == system,
            Sale.created_at >= start_date
        )
    ).group_by(func.date(Sale.created_at)).order_by(func.date(Sale.created_at))
    res_daily = await db.execute(stmt_daily)
    
    daily_revenue = [
        {"date": str(r.day), "total": Decimal(str(r.total))}
        for r in res_daily.all()
    ]

    return {
        "total_revenue": total_revenue,
        "sales_count": sales_count,
        "average_ticket": average_ticket,
        "by_payment_method": by_payment_method,
        "daily_revenue": daily_revenue
    }
