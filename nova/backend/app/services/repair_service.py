from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.repair import Repair, RepairHistory
from app.models.client import Client
from app.schemas.repair import RepairCreate, RepairUpdate, RepairStatusUpdate

VALID_STATUSES = {
    "recibido",
    "diagnostico",
    "esperando_repuesto",
    "presupuesto_enviado",
    "en_reparacion",
    "listo",
    "entregado",
    "cancelado",
    "critico"
}


async def generate_order_number(db: AsyncSession, system: str = "nova") -> str:
    """
    Genera el próximo número de orden correlativo.
    Cuenta las reparaciones existentes y suma 1.
    Formato: ORD-00001 o BRV-00001
    """
    prefix = "ORD" if system == "nova" else "BRV"
    result = await db.execute(
        select(func.count()).select_from(Repair).where(Repair.system == system)
    )
    count = result.scalar()
    return f"{prefix}-{(count + 1):05d}"


async def create_repair(
    db: AsyncSession,
    data: RepairCreate,
    created_by_id: int
) -> Repair:
    from sqlalchemy.orm import selectinload

    client = await db.execute(
        select(Client).where(Client.id == data.client_id)
    )
    if not client.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )

    order_number = await generate_order_number(db, system=data.system)

    repair = Repair(
        order_number=order_number,
        client_id=data.client_id,
        technician_id=data.technician_id,
        device_type=data.device_type,
        brand=data.brand,
        model=data.model,
        reported_issue=data.reported_issue,
        accessories=data.accessories,
        device_password=data.device_password,
        status="recibido",
        estimated_delivery=data.estimated_delivery,
        repair_cost=data.repair_cost,
        deposit=data.deposit,
        system=data.system,
    )

    db.add(repair)
    await db.flush()

    history = RepairHistory(
        repair_id=repair.id,
        previous_status=None,
        new_status="recibido",
        note="Equipo ingresado al sistema",
        changed_by_id=created_by_id,
        changed_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(history)
    await db.commit()

    # Recargamos con la relación history incluida explícitamente
    result = await db.execute(
        select(Repair)
        .options(
            selectinload(Repair.history),
            selectinload(Repair.client)
        )
        .where(Repair.id == repair.id)
    )
    db_repair = result.scalar_one()

    # Calcular visitas previas del cliente
    count_result = await db.execute(
        select(func.count()).select_from(Repair).where(Repair.client_id == db_repair.client_id)
    )
    db_repair.client_repairs_count = count_result.scalar() or 0

    return db_repair


async def get_repair(db: AsyncSession, repair_id: int) -> Repair:
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Repair)
        .options(
            selectinload(Repair.history),
            selectinload(Repair.client)
        )
        .where(Repair.id == repair_id)
    )
    repair = result.scalar_one_or_none()
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reparación no encontrada"
        )

    # Calcular visitas previas del cliente
    count_result = await db.execute(
        select(func.count()).select_from(Repair).where(Repair.client_id == repair.client_id)
    )
    repair.client_repairs_count = count_result.scalar() or 0

    return repair


async def get_repairs(
    db: AsyncSession,
    status_filter: str | None = None,
    client_id: int | None = None,
    system: str | None = None,
    skip: int = 0,
    limit: int = 20
) -> list[Repair]:
    from sqlalchemy.orm import selectinload
    query = select(Repair).options(selectinload(Repair.client))

    if status_filter:
        if status_filter not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estado inválido. Válidos: {VALID_STATUSES}"
            )
        query = query.where(Repair.status == status_filter)

    if client_id:
        query = query.where(Repair.client_id == client_id)

    if system:
        query = query.where(Repair.system == system)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    repairs = result.scalars().all()

    # Calcular visitas previas del cliente para cada reparación de la lista
    for r in repairs:
        count_result = await db.execute(
            select(func.count()).select_from(Repair).where(Repair.client_id == r.client_id)
        )
        r.client_repairs_count = count_result.scalar() or 0

    return repairs


async def update_repair_status(
    db: AsyncSession,
    repair_id: int,
    data: RepairStatusUpdate,
    changed_by_id: int
) -> Repair:
    if data.new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inválido. Válidos: {VALID_STATUSES}"
        )

    repair = await get_repair(db, repair_id)

    if repair.status == data.new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La reparación ya está en estado '{data.new_status}'"
        )

    # Registramos el cambio en el historial ANTES de actualizar
    history = RepairHistory(
        repair_id=repair.id,
        previous_status=repair.status,
        new_status=data.new_status,
        note=data.note,
        changed_by_id=changed_by_id,
        changed_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(history)

    repair.status = data.new_status
    await db.commit()
    return await get_repair(db, repair_id)


async def update_repair(
    db: AsyncSession,
    repair_id: int,
    data: RepairUpdate
) -> Repair:
    repair = await get_repair(db, repair_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repair, field, value)
    await db.commit()
    return repair


async def get_repair_stats(db: AsyncSession, system: str = "nova") -> dict:
    from collections import defaultdict
    from datetime import datetime, timezone
    from sqlalchemy.orm import selectinload
    from app.models.repair import RepairHistory
    from app.models.inventory import RepairInventory

    result = await db.execute(
        select(Repair)
        .where(Repair.system == system)
        .options(
            selectinload(Repair.inventory_usage).selectinload(RepairInventory.item)
        )
    )
    repairs = result.scalars().all()

    total = len(repairs)

    # Calculate earnings (completed or ready repairs)
    completed_statuses = {"listo", "entregado"}
    completed_repairs = [r for r in repairs if r.status in completed_statuses]

    total_earnings = sum(float(r.repair_cost or 0) for r in completed_repairs)

    # Success rate: (listo + entregado) / (total - cancelado) if total - cancelado > 0 else 0
    non_cancelled = [r for r in repairs if r.status != "cancelado"]
    success_count = len(completed_repairs)
    success_rate = (success_count / len(non_cancelled) * 100) if len(non_cancelled) > 0 else 100.0

    # Average ticket
    average_ticket = (total_earnings / len(completed_repairs)) if len(completed_repairs) > 0 else 0.0

    # Calculate costs of used items/supplies
    total_costs = 0.0
    for r in completed_repairs:
        for usage in r.inventory_usage:
            if usage.item:
                total_costs += float(usage.item.cost_price or 0) * usage.quantity

    estimated_net_profit = total_earnings - total_costs
    net_margin = (estimated_net_profit / total_earnings * 100) if total_earnings > 0 else 0.0

    # Pending collect: repair_cost - deposit for 'listo' repairs
    pending_collect = sum(float((r.repair_cost or 0) - (r.deposit or 0)) for r in repairs if r.status == "listo")

    # SLA actual hours calculation from repair history
    history_result = await db.execute(
        select(RepairHistory)
        .join(Repair)
        .where(Repair.system == system)
        .order_by(RepairHistory.changed_at.asc())
    )
    history_records = history_result.scalars().all()

    repair_sla_times = {}
    for h in history_records:
        if h.new_status in completed_statuses:
            if h.repair_id not in repair_sla_times:
                repair_sla_times[h.repair_id] = datetime.fromisoformat(h.changed_at).astimezone(timezone.utc)

    sla_durations = []
    for r in repairs:
        if r.id in repair_sla_times and r.created_at:
            r_created = r.created_at.astimezone(timezone.utc) if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
            duration = repair_sla_times[r.id] - r_created
            sla_durations.append(duration.total_seconds() / 3600.0)

    avg_sla_hours = round(sum(sla_durations) / len(sla_durations), 1) if len(sla_durations) > 0 else 24.0

    # Device share distribution
    device_counts = defaultdict(int)
    for r in repairs:
        dtype = r.device_type or "Otros"
        dtype_lower = dtype.lower()
        if dtype_lower in ["phone", "celular", "celulares", "movil", "móvil", "polera", "t-shirt", "remera"]:
            name = "Celulares" if system == "nova" else "Poleras"
        elif dtype_lower in ["laptop", "notebook", "notebooks", "computador", "pc", "computadora", "tazon", "tazón", "taza", "mug"]:
            name = "Notebooks" if system == "nova" else "Tazones"
        elif dtype_lower in ["console", "consola", "consolas", "ps4", "ps5", "xbox", "nintendo", "jockey", "gorra", "cap"]:
            name = "Consolas" if system == "nova" else "Jockeys"
        else:
            name = "Otros"
        device_counts[name] += 1

    device_share = []
    default_names = ["Celulares", "Notebooks", "Consolas", "Otros"] if system == "nova" else ["Poleras", "Tazones", "Jockeys", "Otros"]
    colors = {
        default_names[0]: "#06b6d4",
        default_names[1]: "#a855f7",
        default_names[2]: "#f43f5e",
        "Otros": "#34d399"
    }
    for name in default_names:
        count = device_counts[name]
        pct = (count / total * 100) if total > 0 else 0
        device_share.append({
            "name": name,
            "percentage": round(pct, 1),
            "color": colors[name]
        })

    # If there are no devices at all, set default shares
    if total == 0:
        device_share = [
            { "name": default_names[0], "percentage": 0.0, "color": "#06b6d4" },
            { "name": default_names[1], "percentage": 0.0, "color": "#a855f7" },
            { "name": default_names[2], "percentage": 0.0, "color": "#f43f5e" },
            { "name": "Otros", "percentage": 0.0, "color": "#34d399" }
        ]

    # Income history by month (last 6 months)
    month_names = {
        1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
    }

    # Get last 6 months chronologically
    now = datetime.now()
    months_list = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        months_list.append((y, m))

    income_by_month = { (y, m): 0.0 for y, m in months_list }
    repairs_by_month = { (y, m): 0 for y, m in months_list }

    for r in repairs:
        r_date = r.created_at
        if r_date:
            key = (r_date.year, r_date.month)
            if key in income_by_month:
                if r.status in completed_statuses:
                    income_by_month[key] += float(r.repair_cost or 0)
                repairs_by_month[key] += 1

    income_history = []
    for y, m in months_list:
        income_history.append({
            "month": month_names[m],
            "income": round(income_by_month[(y, m)], 2),
            "repairs": repairs_by_month[(y, m)]
        })

    return {
        "total_repairs": total,
        "success_rate": round(success_rate, 1),
        "total_earnings": round(total_earnings, 2),
        "avg_sla_hours": avg_sla_hours,
        "device_share": device_share,
        "income_history": income_history,
        "average_ticket": round(average_ticket, 2),
        "total_costs": round(total_costs, 2),
        "estimated_net_profit": round(estimated_net_profit, 2),
        "net_margin": round(net_margin, 1),
        "pending_collect": round(pending_collect, 2)
    }


async def delete_repair(db: AsyncSession, repair_id: int) -> None:
    """Elimina una reparación de la base de datos"""
    repair = await get_repair(db, repair_id)
    await db.delete(repair)
    await db.commit()