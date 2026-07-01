from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from decimal import Decimal
from datetime import datetime, timedelta

from app.models.sale import Sale, SaleItem
from app.models.inventory import InventoryItem
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
            selectinload(Sale.items).selectinload(SaleItem.item)
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
    Descuenta stock si contiene artículos del inventario.
    Agrega un ingreso a la caja chica si hay una sesión abierta para el sistema.
    """
    # 1. Calcular total y preparar ítems
    total_amount = Decimal("0.00")
    sale_items = []
    
    for item_data in sale_data.items:
        unit_price = Decimal(str(item_data.unit_price))
        total_item = unit_price * item_data.quantity
        total_amount += total_item

        # Si vende mercancía física, validar y descontar stock
        if item_data.item_id:
            stmt = select(InventoryItem).where(InventoryItem.id == item_data.item_id)
            res = await db.execute(stmt)
            inv_item = res.scalar_one_or_none()
            
            if not inv_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Artículo de inventario con ID {item_data.item_id} no encontrado"
                )
            
            if inv_item.stock < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para '{inv_item.name}'. Disponible: {inv_item.stock}, Solicitado: {item_data.quantity}"
                )
            
            # Descontar stock
            inv_item.stock -= item_data.quantity
            db.add(inv_item)

        sale_items.append(
            SaleItem(
                item_id=item_data.item_id,
                service_name=item_data.service_name,
                quantity=item_data.quantity,
                unit_price=float(unit_price)
            )
        )

    # 2. Registrar la venta
    sale = Sale(
        system=sale_data.system,
        client_id=sale_data.client_id,
        total_amount=float(total_amount),
        payment_method=sale_data.payment_method,
        sale_type=sale_data.sale_type,
        reference_id=sale_data.reference_id,
        items=sale_items
    )
    db.add(sale)
    await db.flush()  # Para obtener el ID de la venta

    # 3. Registrar en Caja Chica (si hay sesión abierta)
    stmt_session = select(CashRegisterSession).where(
        and_(
            CashRegisterSession.system == sale_data.system,
            CashRegisterSession.status == "open"
        )
    )
    res_session = await db.execute(stmt_session)
    active_session = res_session.scalar_one_or_none()

    if active_session:
        # Registrar transacción de ingreso
        client_name_desc = f" (Cliente ID: {sale_data.client_id})" if sale_data.client_id else ""
        desc_str = f"Venta registrada - Folio #{sale.id}{client_name_desc}. Tipo: {sale_data.sale_type}."
        
        tx = CashRegisterTransaction(
            session_id=active_session.id,
            transaction_type="ingreso",
            amount=float(total_amount),
            description=desc_str,
            payment_method=sale_data.payment_method
        )
        db.add(tx)
        
        # Incrementar el saldo esperado de la caja chica
        active_session.expected_balance = float(active_session.expected_balance) + float(total_amount)
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
            selectinload(Sale.items).selectinload(SaleItem.item)
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
