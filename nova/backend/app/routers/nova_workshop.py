from datetime import datetime, timezone
from decimal import Decimal
from secrets import token_urlsafe
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import check_system_access, get_current_user
from app.db.database import get_db
from app.models.client import Client
from app.models.repair import NovaEstimate, Repair, RepairHistory
from app.schemas.repair import RepairCreate
from app.services.repair_service import create_repair

router = APIRouter(prefix="/nova/workshop", tags=["nova"])


def staff(user=Depends(get_current_user)):
    check_system_access(user, "nova")
    return user


async def order(db, order_id, lock=False):
    query = select(Repair).where(Repair.id == order_id, Repair.system == "nova")
    repair = await db.scalar(query.with_for_update() if lock else query)
    if not repair:
        raise HTTPException(404, "Orden no encontrada")
    return repair


class EstimateInput(BaseModel):
    description: str = Field(min_length=1, max_length=2000, pattern=r"\S")
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class Decision(BaseModel):
    decision: Literal["aprobado", "rechazado"]


class WarrantyInput(BaseModel):
    issue: str = Field(min_length=1, max_length=2000, pattern=r"\S")


def estimate_data(q):
    return dict(description=q.description, amount=q.amount, decision=q.decision,
                created_at=q.created_at, decided_at=q.decided_at)


@router.get("/pickups")
async def pickups(db: AsyncSession = Depends(get_db), user=Depends(staff)):
    ready_at = (select(func.max(RepairHistory.changed_at))
                .where(RepairHistory.repair_id == Repair.id, RepairHistory.new_status == "listo")
                .scalar_subquery())
    query = (select(Repair, Client, ready_at.label("ready_at")).join(Client)
             .where(Repair.system == "nova", Repair.status == "listo")
             .order_by(ready_at.asc().nulls_last(), Repair.id))
    return [dict(id=r.id, number=r.order_number, client=c.name, phone=c.phone,
                 device=f"{r.brand} {r.model}", ready_at=ready, notified_at=r.pickup_notified_at,
                 deposit=r.deposit or 0, balance=max(0, r.repair_cost - (r.deposit or 0)) if r.repair_cost is not None else None)
            for r, c, ready in await db.execute(query)]


@router.post("/orders/{order_id}/pickup-notice")
async def pickup_notice(order_id: int, db: AsyncSession = Depends(get_db), user=Depends(staff)):
    r = await order(db, order_id, lock=True)
    if r.status != "listo":
        raise HTTPException(409, "El equipo ya no está pendiente de retiro")
    r.pickup_notified_at = datetime.now(timezone.utc)
    await db.commit()
    return {"notified_at": r.pickup_notified_at}


@router.get("/orders/{order_id}")
async def details(order_id: int, db: AsyncSession = Depends(get_db), user=Depends(staff)):
    r = await order(db, order_id)
    root = r.warranty_origin_id or r.id
    matches = [Repair.id == root, Repair.warranty_origin_id == root]
    if r.device_identifier:
        matches.append(func.lower(Repair.device_identifier) == r.device_identifier.strip().lower())
    history = await db.scalars(select(Repair).where(Repair.system == "nova", or_(*matches))
                               .order_by(Repair.created_at.desc(), Repair.id.desc()))
    quotes = await db.scalars(select(NovaEstimate).where(NovaEstimate.repair_id == r.id)
                              .order_by(NovaEstimate.id.desc()))
    return {"history": [dict(id=h.id, number=h.order_number, issue=h.reported_issue,
                             status=h.status, date=h.created_at, origin=h.warranty_origin_id) for h in history],
            "estimates": [dict(**estimate_data(q), token=q.token) for q in quotes]}


@router.post("/orders/{order_id}/warranty", status_code=201)
async def warranty(order_id: int, data: WarrantyInput, db: AsyncSession = Depends(get_db), user=Depends(staff)):
    r = await order(db, order_id, lock=True)
    if r.status != "entregado":
        raise HTTPException(409, "Primero debe registrarse la entrega del equipo")
    root = r.warranty_origin_id or r.id
    if root != r.id:
        await order(db, root, lock=True)
    active = await db.scalar(select(Repair.id).where(Repair.warranty_origin_id == root,
                             Repair.status.not_in(["entregado", "cancelado"])).limit(1))
    if active:
        raise HTTPException(409, "Este equipo ya tiene un reingreso abierto")
    child = await create_repair(db, RepairCreate(client_id=r.client_id, device_type=r.device_type,
                                brand=r.brand, model=r.model, device_identifier=r.device_identifier,
                                reported_issue=data.issue.strip()), user.id, warranty_origin_id=root)
    return {"id": child.id}


@router.post("/orders/{order_id}/estimates", status_code=201)
async def issue_estimate(order_id: int, data: EstimateInput, db: AsyncSession = Depends(get_db), user=Depends(staff)):
    r = await order(db, order_id, lock=True)
    if r.status in ("listo", "entregado", "cancelado"):
        raise HTTPException(409, "La orden ya no admite presupuestos")
    if data.amount < (r.deposit or 0):
        raise HTTPException(422, "El presupuesto es inferior al abono registrado")
    await db.execute(update(NovaEstimate).where(NovaEstimate.repair_id == r.id,
                     NovaEstimate.decision == "pendiente").values(decision="reemplazado"))
    q = NovaEstimate(repair_id=r.id, token=token_urlsafe(32), **data.model_dump())
    db.add(q)
    await db.commit()
    return {"token": q.token}


async def public_quote(db, token):
    q = await db.scalar(select(NovaEstimate).join(Repair).where(
        NovaEstimate.token == token, Repair.system == "nova"))
    if not q:
        raise HTTPException(404, "Presupuesto no encontrado")
    return q


@router.get("/estimates/{token}")
async def read_quote(token: str, db: AsyncSession = Depends(get_db)):
    q = await public_quote(db, token)
    r = await order(db, q.repair_id)
    return dict(**estimate_data(q), number=r.order_number, device=f"{r.brand} {r.model}")


@router.post("/estimates/{token}")
async def decide(token: str, data: Decision, db: AsyncSession = Depends(get_db)):
    q = await public_quote(db, token)
    r = await order(db, q.repair_id, lock=True)
    await db.refresh(q)
    if q.decision == data.decision:
        return estimate_data(q)
    if q.decision != "pendiente" or r.status in ("listo", "entregado", "cancelado"):
        raise HTTPException(409, "Este presupuesto ya no admite cambios")
    if data.decision == "aprobado":
        if q.amount < (r.deposit or 0):
            raise HTTPException(409, "El taller debe actualizar el presupuesto por el abono registrado")
        r.repair_cost = q.amount
    q.decision = data.decision
    q.decided_at = datetime.now(timezone.utc)
    await db.commit()
    return estimate_data(q)
