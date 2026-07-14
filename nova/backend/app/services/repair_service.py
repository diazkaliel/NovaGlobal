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
    "diseno_aprobado",
    "en_reparacion",
    "listo",
    "entregado",
    "cancelado",
    "critico",
    "en_garantia"
}


async def generate_order_number(db: AsyncSession, system: str = "nova") -> str:
    """
    Genera el próximo número de orden correlativo de forma segura.
    Busca la orden con el número más alto y le suma 1, evitando colisiones por registros eliminados.
    Filtra en Python usando una expresión regular para descartar formatos especiales (ej. ORD-TEST-* o ORD-DEL-*).
    """
    import re
    prefix = "ORD" if system == "nova" else "BRV"
    
    # Traemos las últimas 100 órdenes del sistema para buscar la más alta con formato estándar
    result = await db.execute(
        select(Repair.order_number)
        .where(Repair.system == system)
        .order_by(Repair.order_number.desc())
        .limit(100)
    )
    order_numbers = result.scalars().all()
    
    # El patrón busca "ORD-XXXXX" o "BRV-XXXXX", admitiendo opcionalmente sufijos de orden dividida como "-A" o "-B"
    pattern = re.compile(rf"^{prefix}-(\d+)(-[A-Z]+)?$")
    next_num = 1
    
    for order in order_numbers:
        match = pattern.match(order)
        if match:
            next_num = int(match.group(1)) + 1
            break
        
    return f"{prefix}-{next_num:05d}"


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
        design_file_url=data.design_file_url,
        print_technique=data.print_technique,
        print_location=data.print_location,
        print_dimensions=data.print_dimensions,
    )

    db.add(repair)
    await db.flush()

    # Descontar insumos si vienen en la creación (Bravo / Nova)
    if data.used_items:
        from app.models.inventory import InventoryItem, RepairInventory
        
        for item_data in data.used_items:
            result = await db.execute(
                select(InventoryItem)
                .where(InventoryItem.id == item_data.item_id)
                .with_for_update()
            )
            item = result.scalar_one_or_none()
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Insumo con id {item_data.item_id} no encontrado"
                )
            if item.category != "insumo":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El producto '{item.name}' no es un insumo."
                )
            if item.stock < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para '{item.name}'. Disponible: {item.stock}, solicitado: {item_data.quantity}"
                )
            
            # Descontar stock
            item.stock -= item_data.quantity
            db.add(item)
            
            # Registrar uso
            record = RepairInventory(
                repair_id=repair.id,
                item_id=item_data.item_id,
                quantity=item_data.quantity
            )
            db.add(record)

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

    # Recargamos con la relación history e inventory_usage incluida explícitamente
    from app.models.inventory import RepairInventory
    result = await db.execute(
        select(Repair)
        .options(
            selectinload(Repair.history),
            selectinload(Repair.client),
            selectinload(Repair.inventory_usage).selectinload(RepairInventory.item)
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
    from app.models.inventory import RepairInventory
    result = await db.execute(
        select(Repair)
        .options(
            selectinload(Repair.history),
            selectinload(Repair.client),
            selectinload(Repair.inventory_usage).selectinload(RepairInventory.item)
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


async def get_repair_by_order_number(db: AsyncSession, order_number: str) -> Repair:
    from sqlalchemy.orm import selectinload
    from app.models.inventory import RepairInventory
    result = await db.execute(
        select(Repair)
        .options(
            selectinload(Repair.history),
            selectinload(Repair.client),
            selectinload(Repair.inventory_usage).selectinload(RepairInventory.item)
        )
        .where(Repair.order_number == order_number)
    )
    repair = result.scalar_one_or_none()
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reparación con orden #{order_number} no encontrada"
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

    # Compuerta Lógica QA Obligatoria para Bravo
    if repair.system == "bravo" and data.new_status == "listo":
        from app.models.qa_inspection import QAInspection
        qa_query = select(QAInspection).where(
            QAInspection.order_id == repair_id,
            QAInspection.system == "bravo",
            QAInspection.passed == True
        )
        qa_res = await db.execute(qa_query)
        inspection = qa_res.scalars().first()
        if not inspection:
            raise HTTPException(
                status_code=422,
                detail="Acción bloqueada. El pedido requiere una aprobación del checklist de Control de Calidad antes de pasar a Listo para Entrega."
            )

    # Integración con caja chica cuando pasa a entregado
    if data.new_status == "entregado":
        if not data.payment_method:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El método de pago es requerido para entregar la reparación."
            )
        
        # Validar si hay una caja abierta para registrar el dinero
        from app.models.cash_register import CashRegisterSession, CashRegisterTransaction
        from sqlalchemy import and_
        stmt_session = select(CashRegisterSession).where(
            and_(
                CashRegisterSession.system == repair.system,
                CashRegisterSession.status == "open"
            )
        )
        res_session = await db.execute(stmt_session)
        active_session = res_session.scalar_one_or_none()

        if active_session:
            payment_val = float(data.payment_amount or 0.0)
            desc_str = f"Cobro Reparación #{repair.order_number} - {repair.brand} {repair.model} (Cliente ID: {repair.client_id})"
            tx = CashRegisterTransaction(
                session_id=active_session.id,
                transaction_type="ingreso",
                amount=payment_val,
                description=desc_str,
                payment_method=data.payment_method
            )
            db.add(tx)
            
            # Incrementar el saldo de la caja
            active_session.expected_balance = float(active_session.expected_balance) + payment_val
            db.add(active_session)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay una sesión de caja chica abierta para registrar este cobro. Abre una caja antes de entregar."
            )

        repair.final_payment_method = data.payment_method

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

    # Additional Bravo specific metrics
    print_technique_share = []
    qa_stats = {
        "pass_rate": 100.0,
        "total_waste_units": 0,
        "total_waste_cost": 0.0
    }
    machine_stats = {
        "active": 0,
        "maintenance": 0,
        "total_reservations": 0,
        "list": []
    }

    if system == "bravo":
        # 1. Print technique share
        tech_counts = defaultdict(int)
        for r in repairs:
            tech = r.print_technique or "Por Definir"
            tech_cap = tech.capitalize()
            tech_counts[tech_cap] += 1
        
        tech_colors = {
            "Sublimacion": "#fbbf24",
            "Sublimación": "#fbbf24",
            "Bordado": "#f97316",
            "Vinilo": "#a855f7",
            "Dtf": "#ec4899",
            "Por Definir": "#6b7280"
        }
        for name, count in tech_counts.items():
            pct = (count / total * 100) if total > 0 else 0
            color = tech_colors.get(name, "#3b82f6")
            print_technique_share.append({
                "name": name,
                "percentage": round(pct, 1),
                "color": color
            })
        
        # 2. QA & Waste stats
        from app.models.qa_inspection import QAInspection
        qa_res = await db.execute(select(QAInspection).where(QAInspection.system == "bravo"))
        inspections = qa_res.scalars().all()
        
        if inspections:
            passed_count = sum(1 for i in inspections if i.passed)
            pass_rate = (passed_count / len(inspections)) * 100
            
            total_waste_units = 0
            total_waste_cost = 0.0
            
            from app.models.inventory import InventoryItem
            waste_items_ids = set()
            for inspect in inspections:
                if inspect.waste_records:
                    for wr in inspect.waste_records:
                        if isinstance(wr, dict) and "item_id" in wr:
                            waste_items_ids.add(int(wr["item_id"]))
            
            item_costs = {}
            if waste_items_ids:
                items_res = await db.execute(
                    select(InventoryItem.id, InventoryItem.cost_price)
                    .where(InventoryItem.id.in_(waste_items_ids))
                )
                for item_id, cost_price in items_res.all():
                    item_costs[item_id] = float(cost_price or 0.0)
            
            for inspect in inspections:
                if inspect.waste_records:
                    for wr in inspect.waste_records:
                        if isinstance(wr, dict):
                            qty = int(wr.get("quantity", 0))
                            item_id = int(wr.get("item_id", 0))
                            total_waste_units += qty
                            total_waste_cost += qty * item_costs.get(item_id, 0.0)
            
            qa_stats = {
                "pass_rate": round(pass_rate, 1),
                "total_waste_units": total_waste_units,
                "total_waste_cost": round(total_waste_cost, 2)
            }
            
        # 3. Machine stats
        from app.models.machine import Machine, MachineReservation
        mach_res = await db.execute(select(Machine).where(Machine.system == "bravo"))
        machines_list = mach_res.scalars().all()
        
        active_m = sum(1 for m in machines_list if m.status == "active")
        maint_m = sum(1 for m in machines_list if m.status == "maintenance")
        
        resv_res = await db.execute(select(MachineReservation).where(MachineReservation.system == "bravo"))
        total_reservations = len(resv_res.scalars().all())
        
        machine_stats = {
            "active": active_m,
            "maintenance": maint_m,
            "total_reservations": total_reservations,
            "list": [
                {
                    "name": m.name,
                    "type": m.type,
                    "status": m.status.value if hasattr(m.status, 'value') else str(m.status),
                    "needs_supplies": m.needs_supplies,
                    "last_maintenance": m.last_maintenance_date.strftime("%Y-%m-%d") if m.last_maintenance_date else None
                } for m in machines_list
            ]
        }

    response_dict = {
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

    if system == "bravo":
        response_dict.update({
            "print_technique_share": print_technique_share,
            "qa_stats": qa_stats,
            "machine_stats": machine_stats
        })

    return response_dict


async def delete_repair(db: AsyncSession, repair_id: int) -> None:
    """Elimina una reparación de la base de datos"""
    repair = await get_repair(db, repair_id)
    await db.delete(repair)
    await db.commit()


async def split_order(
    db: AsyncSession,
    order_id: int,
    split_ratio: float,
    created_by_id: int
) -> Repair:
    """
    Divide una orden de Bravo existente en una orden clonada parcial (hija)
    con la proporción indicada (0.01 a 0.99).
    Ajusta el costo y abono proporcionalmente y mantiene la atomicidad.
    """
    parent = await get_repair(db, order_id)
    if parent.system != "bravo":
        raise HTTPException(
            status_code=400,
            detail="La división de órdenes solo está disponible para el sistema Bravo."
        )

    # El costo de la hija será proporcional según el split_ratio recibido
    cost_proportional = 0.0
    deposit_proportional = 0.0

    if parent.repair_cost:
        cost_proportional = float(parent.repair_cost) * split_ratio
        parent.repair_cost = float(parent.repair_cost) - cost_proportional

    if parent.deposit:
        deposit_proportional = float(parent.deposit) * split_ratio
        parent.deposit = float(parent.deposit) - deposit_proportional

    order_number_child = f"{parent.order_number}-B"
    if not parent.order_number.endswith("-A") and not parent.order_number.endswith("-B"):
        parent.order_number = f"{parent.order_number}-A"

    child = Repair(
        order_number=order_number_child,
        client_id=parent.client_id,
        technician_id=parent.technician_id,
        device_type=parent.device_type,
        brand=parent.brand,
        model=f"{parent.model} (Parcial)",
        reported_issue=parent.reported_issue,
        accessories=parent.accessories,
        device_password_encrypted=parent.device_password_encrypted,
        status="recibido",
        estimated_delivery=parent.estimated_delivery,
        repair_cost=cost_proportional,
        deposit=deposit_proportional,
        deposit_payment_method=parent.deposit_payment_method,
        final_payment_method=parent.final_payment_method,
        system="bravo",
        design_file_url=parent.design_file_url,
        print_technique=parent.print_technique,
        print_location=parent.print_location,
        print_dimensions=parent.print_dimensions,
        parent_order_id=parent.id,
        is_split_child=True
    )

    db.add(child)
    await db.flush()

    history_parent = RepairHistory(
        repair_id=parent.id,
        previous_status=parent.status,
        new_status=parent.status,
        note=f"Orden original dividida. Creada orden parcial {order_number_child}.",
        changed_by_id=created_by_id,
        changed_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(history_parent)

    history_child = RepairHistory(
        repair_id=child.id,
        previous_status=None,
        new_status="recibido",
        note=f"Creado lote parcial derivado de {parent.order_number}.",
        changed_by_id=created_by_id,
        changed_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(history_child)

    await db.commit()
    return child