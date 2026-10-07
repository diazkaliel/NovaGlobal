import re
from datetime import datetime, timezone, date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload

from app.models.bravo_order import (
    BravoOrder, BravoOrderHistory, BravoOrderComment, BravoOrderInventory
)
from app.models.client import Client
from app.models.inventory import InventoryItem, ProductRecipe
from app.models.cash_register import CashRegisterSession, CashRegisterTransaction
from app.schemas.bravo_order import (
    BravoOrderCreate, BravoOrderUpdate, BravoOrderStatusUpdate
)

VALID_BRAVO_STATUSES = {
    "recibido",
    "diseno_aprobado",
    "en_produccion",
    "control_calidad",
    "listo",
    "entregado",
    "cancelado"
}


async def generate_bravo_order_number(db: AsyncSession) -> str:
    """
    Genera el próximo correlativo de taller con prefijo 'BRV-XXXXX'.
    Garantiza continuidad secuencial incluso si hay órdenes eliminadas.
    """
    result = await db.execute(
        select(BravoOrder.order_number)
        .order_by(BravoOrder.id.desc())
        .limit(50)
    )
    order_numbers = result.scalars().all()
    pattern = re.compile(r"^BRV-(\d+)(-[A-Z]+)?$")
    next_num = 1

    for order_str in order_numbers:
        match = pattern.match(order_str)
        if match:
            next_num = int(match.group(1)) + 1
            break

    return f"BRV-{next_num:05d}"


async def create_bravo_order(
    db: AsyncSession,
    data: BravoOrderCreate,
    created_by_id: int
) -> BravoOrder:
    """
    Registra una orden de producción textil en Bravo:
    1. Valida que el cliente pertenezca a Bravo.
    2. Genera el correlativo único 'BRV-XXXXX'.
    3. Descuenta de forma atómica los insumos y recetas de mercancía (BOM).
    4. Registra el abono inicial en la sesión de caja activa de Bravo si aplica.
    5. Inicia el historial de trazabilidad en estado 'recibido'.
    """
    # 1. Validar cliente existente
    client_res = await db.execute(
        select(Client).where(Client.id == data.client_id)
    )
    client = client_res.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )

    order_number = await generate_bravo_order_number(db)

    order = BravoOrder(
        order_number=order_number,
        client_id=data.client_id,
        technician_id=data.technician_id or created_by_id,
        item_category=data.item_category,
        brand=data.brand or "Personalizado",
        model=data.model or "Estandar",
        garment_color=data.garment_color,
        garment_size=data.garment_size,
        quantity=max(1, data.quantity),
        reported_issue=data.reported_issue,
        accessories=data.accessories,
        print_technique=data.print_technique,
        print_location=data.print_location,
        print_dimensions=data.print_dimensions,
        design_file_url=data.design_file_url,
        mockup_file_url=data.mockup_file_url,
        status="recibido",
        estimated_delivery=data.estimated_delivery,
        order_cost=float(data.order_cost),
        deposit=float(data.deposit),
        deposit_payment_method=data.deposit_payment_method,
        final_payment_method=data.final_payment_method,
    )
    db.add(order)
    await db.flush()

    # 2. Descuento atómico de insumos textiles y recetas compuestas
    if data.used_items:
        for item_in in data.used_items:
            res_item = await db.execute(
                select(InventoryItem)
                .where(InventoryItem.id == item_in.item_id)
                .with_for_update()
            )
            inv_item = res_item.scalar_one_or_none()
            if not inv_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Insumo o prenda #{item_in.item_id} no encontrado"
                )
            if inv_item.stock < item_in.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para '{inv_item.name}'. Disponible: {inv_item.stock}, solicitado: {item_in.quantity}"
                )

            inv_item.stock -= int(item_in.quantity)
            db.add(inv_item)

            # Si es mercancía base con receta (ej. polera lisa + vinilo), descontar insumos hijos
            if inv_item.category == "mercancia":
                res_recipes = await db.execute(
                    select(ProductRecipe).where(ProductRecipe.product_id == inv_item.id)
                )
                recipes = res_recipes.scalars().all()
                for rec in recipes:
                    res_raw = await db.execute(
                        select(InventoryItem)
                        .where(InventoryItem.id == rec.insumo_id)
                        .with_for_update()
                    )
                    raw_item = res_raw.scalar_one_or_none()
                    if raw_item:
                        raw_item.stock -= int(item_in.quantity * float(rec.quantity))
                        db.add(raw_item)

            usage = BravoOrderInventory(
                order_id=order.id,
                item_id=item_in.item_id,
                quantity=item_in.quantity
            )
            db.add(usage)

    # 3. Registrar abono en Caja Chica de Bravo
    if data.deposit and float(data.deposit) > 0 and data.deposit_payment_method:
        res_cash = await db.execute(
            select(CashRegisterSession).where(
                and_(
                    CashRegisterSession.system == "bravo",
                    CashRegisterSession.status == "open"
                )
            )
        )
        session_active = res_cash.scalar_one_or_none()
        if session_active:
            dep_amount = float(data.deposit)
            tx = CashRegisterTransaction(
                session_id=session_active.id,
                transaction_type="ingreso",
                amount=dep_amount,
                description=f"Abono Pedido #{order.order_number} ({order.item_category})",
                payment_method=data.deposit_payment_method.lower()
            )
            db.add(tx)
            if data.deposit_payment_method.lower() == "efectivo":
                session_active.expected_balance = float(session_active.expected_balance) + dep_amount
                db.add(session_active)

    # 4. Historial inicial
    hist = BravoOrderHistory(
        order_id=order.id,
        previous_status=None,
        new_status="recibido",
        note="Pedido textil ingresado a taller",
        changed_by_id=created_by_id,
        changed_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(hist)
    await db.commit()

    return await get_bravo_order(db, order.id)


async def get_bravo_order(db: AsyncSession, order_id: int) -> BravoOrder:
    res = await db.execute(
        select(BravoOrder)
        .options(
            selectinload(BravoOrder.client),
            selectinload(BravoOrder.history),
            selectinload(BravoOrder.comments),
            selectinload(BravoOrder.inventory_usage)
        )
        .where(BravoOrder.id == order_id)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido de Bravo #{order_id} no encontrado"
        )
    return order


async def get_bravo_order_by_number(db: AsyncSession, order_number: str) -> BravoOrder:
    res = await db.execute(
        select(BravoOrder)
        .options(
            selectinload(BravoOrder.client),
            selectinload(BravoOrder.history),
            selectinload(BravoOrder.comments)
        )
        .where(BravoOrder.order_number == order_number)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido {order_number} no encontrado"
        )
    return order


async def get_bravo_orders(
    db: AsyncSession,
    status_filter: str | None = None,
    client_id: int | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50
) -> list[BravoOrder]:
    query = (
        select(BravoOrder)
        .options(selectinload(BravoOrder.client))
        .order_by(BravoOrder.id.desc())
    )

    if status_filter:
        query = query.where(BravoOrder.status == status_filter)
    if client_id:
        query = query.where(BravoOrder.client_id == client_id)
    if search:
        query = query.join(BravoOrder.client).where(
            or_(
                BravoOrder.order_number.ilike(f"%{search}%"),
                BravoOrder.item_category.ilike(f"%{search}%"),
                BravoOrder.model.ilike(f"%{search}%"),
                Client.name.ilike(f"%{search}%"),
                Client.phone.ilike(f"%{search}%")
            )
        )

    query = query.offset(skip).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


async def update_bravo_order_status(
    db: AsyncSession,
    order_id: int,
    data: BravoOrderStatusUpdate,
    changed_by_id: int | None = None
) -> BravoOrder:
    order = await get_bravo_order(db, order_id)
    prev_status = order.status

    if data.new_status != prev_status:
        order.status = data.new_status
        hist = BravoOrderHistory(
            order_id=order.id,
            previous_status=prev_status,
            new_status=data.new_status,
            note=data.note or f"Cambio de estado: {prev_status} -> {data.new_status}",
            changed_by_id=changed_by_id,
            changed_at=datetime.now(timezone.utc).isoformat()
        )
        db.add(hist)
        await db.commit()

    return await get_bravo_order(db, order_id)


async def update_bravo_order(
    db: AsyncSession,
    order_id: int,
    data: BravoOrderUpdate
) -> BravoOrder:
    order = await get_bravo_order(db, order_id)
    payload = data.model_dump(exclude_unset=True)

    for field, val in payload.items():
        setattr(order, field, val)

    await db.commit()
    return await get_bravo_order(db, order_id)


async def get_bravo_order_stats(db: AsyncSession) -> dict:
    """
    Retorna métricas completas de producción, financieras y operativas del taller textil de Bravo.
    Calculadas directamente desde BravoOrder y BravoOrderHistory para mantener estricta
    separación de dominio respecto al módulo de servicio técnico electrónico (Nova).
    """
    from collections import defaultdict
    from datetime import datetime, timezone

    # 1. Conteo por estados y órdenes totales
    res_orders = await db.execute(select(BravoOrder))
    orders = res_orders.scalars().all()
    total_orders = len(orders)

    status_counts = defaultdict(int)
    for o in orders:
        status_counts[o.status] += 1

    active_statuses = ["recibido", "diseno_aprobado", "en_produccion", "control_calidad", "listo"]
    total_active = sum(status_counts[s] for s in active_statuses)
    delivered_count = status_counts["entregado"]
    cancelled_count = status_counts["cancelado"]

    completed_orders = [o for o in orders if o.status in ["listo", "entregado"]]
    total_revenue = sum(float(o.order_cost or 0) for o in completed_orders)
    avg_ticket = (total_revenue / len(completed_orders)) if completed_orders else 0.0

    non_cancelled = [o for o in orders if o.status != "cancelado"]
    success_rate = (len(completed_orders) / len(non_cancelled) * 100) if non_cancelled else 100.0

    # 2. SLA promedio a través de BravoOrderHistory (recibido -> listo)
    sla_result = await db.execute(
        select(BravoOrderHistory)
        .order_by(BravoOrderHistory.changed_at.asc())
    )
    histories = sla_result.scalars().all()

    first_ready_time = {}
    for h in histories:
        if h.new_status in ["listo", "entregado"] and h.order_id not in first_ready_time:
            try:
                first_ready_time[h.order_id] = datetime.fromisoformat(h.changed_at)
            except Exception:
                pass

    sla_durations = []
    for o in orders:
        if o.id in first_ready_time and o.created_at:
            o_created = o.created_at
            t_ready = first_ready_time[o.id]
            # Normalizar timezone si uno tiene y el otro no
            if o_created.tzinfo and not t_ready.tzinfo:
                t_ready = t_ready.replace(tzinfo=timezone.utc)
            elif not o_created.tzinfo and t_ready.tzinfo:
                o_created = o_created.replace(tzinfo=timezone.utc)
            duration = (t_ready - o_created).total_seconds() / 3600.0
            if duration > 0:
                sla_durations.append(duration)

    avg_sla_hours = round(sum(sla_durations) / len(sla_durations), 1) if sla_durations else 24.0

    # 3. Distribución por Técnica (DTF Textil, Sublimación, Vinilo, DTF UV)
    tech_counts = defaultdict(int)
    for o in orders:
        tech = (o.print_technique or "dtf").strip().lower()
        if "sublim" in tech:
            key = "Sublimación"
        elif "uv" in tech:
            key = "DTF UV"
        elif "vinil" in tech:
            key = "Vinilo"
        elif "dtf" in tech:
            key = "DTF Textil"
        else:
            key = "Otros"
        tech_counts[key] += 1

    tech_colors = {
        "DTF Textil": "#ec4899",
        "Sublimación": "#fbbf24",
        "DTF UV": "#06b6d4",
        "Vinilo": "#a855f7",
        "Otros": "#6b7280"
    }

    print_technique_share = []
    for name in ["DTF Textil", "Sublimación", "DTF UV", "Vinilo", "Otros"]:
        c = tech_counts.get(name, 0)
        pct = (c / total_orders * 100) if total_orders > 0 else 0.0
        if pct > 0 or name != "Otros":
            print_technique_share.append({
                "name": name,
                "percentage": round(pct, 1),
                "color": tech_colors[name]
            })

    # 4. Historial de facturación últimos 6 meses
    month_names = {
        1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
    }
    now = datetime.now()
    months_list = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        months_list.append((y, m))

    income_by_month = {(y, m): 0.0 for y, m in months_list}
    orders_by_month = {(y, m): 0 for y, m in months_list}

    for o in orders:
        if o.created_at:
            key = (o.created_at.year, o.created_at.month)
            if key in income_by_month:
                if o.status in ["listo", "entregado"]:
                    income_by_month[key] += float(o.order_cost or 0)
                orders_by_month[key] += 1

    income_history = [
        {
            "month": month_names[m],
            "income": round(income_by_month[(y, m)], 2),
            "orders": orders_by_month[(y, m)]
        }
        for y, m in months_list
    ]

    return {
        "total_orders": total_orders,
        "total_repairs": total_orders,  # Alias para compatibilidad con componentes compartidos
        "total_active": total_active,
        "by_status": dict(status_counts),
        "delivered": delivered_count,
        "cancelled": cancelled_count,
        "total_revenue": round(total_revenue, 2),
        "total_earnings": round(total_revenue, 2),  # Alias para compatibilidad de vistas
        "average_ticket": round(avg_ticket, 2),
        "success_rate": round(success_rate, 1),
        "avg_sla_hours": avg_sla_hours,
        "print_technique_share": print_technique_share,
        "income_history": income_history
    }

