from datetime import datetime, date, timezone
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.models.attendance import AttendanceRecord
from app.models.repair import Repair, RepairHistory
from app.models.sale import Sale
from app.models.cash_register import CashRegisterTransaction, CashRegisterSession
from app.models.user import User


class ActivityItemResponse(BaseModel):
    id: str
    category: Literal["attendance", "orders", "status_changes", "sales", "cash", "users"]
    action_type: str
    title: str
    description: str
    user_id: int | None = None
    user_name: str
    user_email: str | None = None
    user_role: str | None = None
    system: str  # 'nova' | 'bravo'
    timestamp: datetime
    metadata: dict = {}


def _normalize_dt(dt: datetime | str | None) -> datetime:
    """Normaliza cualquier datetime o ISO string a timezone-aware UTC para ordenamiento seguro."""
    if dt is None:
        return datetime.now(timezone.utc)
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except Exception:
            return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def get_activity_logs(
    db: AsyncSession,
    category: str | None = None,
    user_id: int | None = None,
    system: str | None = None,
    target_date: date | None = None,
    limit: int = 100
) -> list[ActivityItemResponse]:
    """
    Consolida de forma atómica y en tiempo real todos los eventos de actividad
    generados por los colaboradores y administradores en Nova y Bravo.
    """
    activities: list[ActivityItemResponse] = []

    # -------------------------------------------------------------------------
    # 1. EVENTOS DE ASISTENCIA Y TURNOS (CLOCK-IN / CLOCK-OUT)
    # -------------------------------------------------------------------------
    if not category or category in ("all", "attendance"):
        att_stmt = (
            select(AttendanceRecord)
            .options(selectinload(AttendanceRecord.user))
            .order_by(desc(AttendanceRecord.created_at))
            .limit(limit)
        )
        if user_id:
            att_stmt = att_stmt.where(AttendanceRecord.user_id == user_id)
        if system and system != "all":
            att_stmt = att_stmt.where(AttendanceRecord.system == system)
        if target_date:
            att_stmt = att_stmt.where(AttendanceRecord.date == target_date)

        att_res = await db.execute(att_stmt)
        for att in att_res.scalars().all():
            u_name = att.user.name if att.user else "Colaborador"
            u_email = att.user.email if att.user else None
            u_role = att.user.role if att.user else "technician"

            # Evento: Inicio de Turno (Entrada)
            if att.clock_in:
                note_text = f" • Nota: {att.notes}" if att.notes else ""
                activities.append(
                    ActivityItemResponse(
                        id=f"att_in_{att.id}",
                        category="attendance",
                        action_type="clock_in",
                        title=f"{u_name} marcó Entrada",
                        description=f"Inició jornada laboral en {att.system.upper()}{note_text}",
                        user_id=att.user_id,
                        user_name=u_name,
                        user_email=u_email,
                        user_role=u_role,
                        system=att.system,
                        timestamp=_normalize_dt(att.clock_in or att.created_at),
                        metadata={
                            "attendance_id": att.id,
                            "notes": att.notes,
                            "date": str(att.date)
                        }
                    )
                )

            # Evento: Cierre de Turno (Salida)
            if att.clock_out:
                duration_text = ""
                if att.total_minutes is not None:
                    h = att.total_minutes // 60
                    m = att.total_minutes % 60
                    duration_text = f" • Tiempo laborado: {h}h {m}m"

                activities.append(
                    ActivityItemResponse(
                        id=f"att_out_{att.id}",
                        category="attendance",
                        action_type="clock_out",
                        title=f"{u_name} marcó Salida",
                        description=f"Finalizó su turno laboral{duration_text}",
                        user_id=att.user_id,
                        user_name=u_name,
                        user_email=u_email,
                        user_role=u_role,
                        system=att.system,
                        timestamp=_normalize_dt(att.clock_out or att.created_at),
                        metadata={
                            "attendance_id": att.id,
                            "total_minutes": att.total_minutes,
                            "notes": att.notes,
                            "date": str(att.date)
                        }
                    )
                )

    # -------------------------------------------------------------------------
    # 2. EVENTOS DE CREACIÓN DE ÓRDENES Y TRABAJOS
    # -------------------------------------------------------------------------
    if not category or category in ("all", "orders"):
        rep_stmt = (
            select(Repair)
            .options(selectinload(Repair.technician), selectinload(Repair.client))
            .order_by(desc(Repair.created_at))
            .limit(limit)
        )
        if user_id:
            rep_stmt = rep_stmt.where(Repair.technician_id == user_id)
        if system and system != "all":
            rep_stmt = rep_stmt.where(Repair.system == system)

        rep_res = await db.execute(rep_stmt)
        for rep in rep_res.scalars().all():
            rep_dt = _normalize_dt(rep.created_at)
            if target_date and rep_dt.date() != target_date:
                continue

            tech_name = rep.technician.name if rep.technician else "Personal"
            client_name = rep.client.name if rep.client else "Cliente General"
            item_desc = f"{rep.device_type} {rep.brand} {rep.model}".strip()

            activities.append(
                ActivityItemResponse(
                    id=f"order_create_{rep.id}",
                    category="orders",
                    action_type="order_created",
                    title=f"Nueva Orden #{rep.order_number}",
                    description=f"{tech_name} registró la orden para {client_name} ({item_desc})",
                    user_id=rep.technician_id,
                    user_name=tech_name,
                    user_email=rep.technician.email if rep.technician else None,
                    user_role=rep.technician.role if rep.technician else "technician",
                    system=rep.system,
                    timestamp=rep_dt,
                    metadata={
                        "repair_id": rep.id,
                        "order_number": rep.order_number,
                        "client_name": client_name,
                        "status": rep.status,
                        "cost": float(rep.repair_cost) if rep.repair_cost else 0
                    }
                )
            )

    # -------------------------------------------------------------------------
    # 3. EVENTOS DE CAMBIOS DE ESTADO DE ÓRDENES (REPAIR HISTORY)
    # -------------------------------------------------------------------------
    if not category or category in ("all", "status_changes", "orders"):
        hist_stmt = (
            select(RepairHistory)
            .options(selectinload(RepairHistory.repair))
            .order_by(desc(RepairHistory.id))
            .limit(limit)
        )
        hist_res = await db.execute(hist_stmt)
        for h in hist_res.scalars().all():
            if not h.repair:
                continue

            if system and system != "all" and h.repair.system != system:
                continue

            dt = _normalize_dt(h.changed_at)
            if target_date and dt.date() != target_date:
                continue

            u_name = "Personal"
            if h.changed_by_id:
                user_obj = await db.get(User, h.changed_by_id)
                if user_obj:
                    u_name = user_obj.name

            prev_st = (h.previous_status or "inicio").upper()
            new_st = (h.new_status or "actualizado").upper()
            note_str = f" • Nota: {h.note}" if h.note else ""

            activities.append(
                ActivityItemResponse(
                    id=f"st_change_{h.id}",
                    category="status_changes",
                    action_type="status_change",
                    title=f"Cambio de Estado en #{h.repair.order_number}",
                    description=f"{u_name} actualizó estado: {prev_st} ➔ {new_st}{note_str}",
                    user_id=h.changed_by_id,
                    user_name=u_name,
                    system=h.repair.system,
                    timestamp=dt,
                    metadata={
                        "repair_id": h.repair_id,
                        "order_number": h.repair.order_number,
                        "previous_status": h.previous_status,
                        "new_status": h.new_status,
                        "note": h.note
                    }
                )
            )

    # -------------------------------------------------------------------------
    # 4. EVENTOS DE VENTAS REALIZADAS
    # -------------------------------------------------------------------------
    if not category or category in ("all", "sales"):
        sale_stmt = (
            select(Sale)
            .options(selectinload(Sale.client))
            .order_by(desc(Sale.created_at))
            .limit(limit)
        )
        if system and system != "all":
            sale_stmt = sale_stmt.where(Sale.system == system)

        sale_res = await db.execute(sale_stmt)
        for s in sale_res.scalars().all():
            sale_dt = _normalize_dt(s.created_at)
            if target_date and sale_dt.date() != target_date:
                continue

            u_name = "Cajero"
            cli_name = s.client.name if s.client else "Público General"
            tot = float(s.total_amount) if s.total_amount else 0.0

            activities.append(
                ActivityItemResponse(
                    id=f"sale_{s.id}",
                    category="sales",
                    action_type="sale_created",
                    title=f"Venta #{s.id} (${tot:.2f})",
                    description=f"{u_name} concretó venta a {cli_name} mediante {s.payment_method or 'Efectivo'}",
                    user_id=None,
                    user_name=u_name,
                    user_email=None,
                    user_role="technician",
                    system=s.system,
                    timestamp=sale_dt,
                    metadata={
                        "sale_id": s.id,
                        "total": tot,
                        "payment_method": s.payment_method,
                        "client_name": cli_name
                    }
                )
            )

    # -------------------------------------------------------------------------
    # 5. EVENTOS DE MOVIMIENTOS EN CAJA CHICA
    # -------------------------------------------------------------------------
    if not category or category in ("all", "cash"):
        cash_stmt = (
            select(CashRegisterTransaction)
            .options(selectinload(CashRegisterTransaction.session))
            .order_by(desc(CashRegisterTransaction.created_at))
            .limit(limit)
        )
        cash_res = await db.execute(cash_stmt)
        for ct in cash_res.scalars().all():
            ct_dt = _normalize_dt(ct.created_at)
            if target_date and ct_dt.date() != target_date:
                continue

            sess_sys = ct.session.system if ct.session else "nova"
            if system and system != "all" and sess_sys != system:
                continue

            amt = float(ct.amount) if ct.amount else 0.0
            tipo = "Ingreso" if ct.transaction_type in ("ingreso", "cash-in", "inflow") else "Egreso / Retiro"

            activities.append(
                ActivityItemResponse(
                    id=f"cash_tx_{ct.id}",
                    category="cash",
                    action_type="cash_transaction",
                    title=f"Movimiento de Caja: {tipo} (${amt:.2f})",
                    description=f"{ct.description or 'Sin motivo'} • Vía: {ct.payment_method or 'Efectivo'}",
                    user_id=None,
                    user_name="Caja",
                    system=sess_sys,
                    timestamp=ct_dt,
                    metadata={
                        "transaction_id": ct.id,
                        "transaction_type": ct.transaction_type,
                        "amount": amt,
                        "description": ct.description
                    }
                )
            )

    # Ordenar cronológicamente descendente (lo más reciente primero)
    activities.sort(key=lambda a: a.timestamp, reverse=True)

    return activities[:limit]
