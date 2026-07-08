from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.machine import Machine, MachineReservation
from app.schemas.machine import (
    MachineCreateSchema, 
    MachineUpdateSchema,
    MachineResponseSchema, 
    ReservationCreateSchema, 
    ReservationResponseSchema
)

router = APIRouter(
    prefix="/api/bravo/machines",
    tags=["machines"]
)

@router.get("", response_model=List[MachineResponseSchema])
async def get_machines(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Machine)
        .where(Machine.system == "bravo")
        .options(selectinload(Machine.reservations))
    )
    return result.scalars().all()

@router.post("", response_model=MachineResponseSchema, status_code=201)
async def create_machine(payload: MachineCreateSchema, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_machine = Machine(**payload.model_dump(), system="bravo")
    db.add(new_machine)
    await db.commit()
    await db.refresh(new_machine)
    return new_machine

@router.post("/reserve", status_code=201)
async def create_reservation(payload: ReservationCreateSchema, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Lógica de Validación de Traslape OBLIGATORIA
    query = select(MachineReservation).where(
        MachineReservation.machine_id == payload.machine_id,
        MachineReservation.system == "bravo",
        MachineReservation.start_time < payload.end_time,
        MachineReservation.end_time > payload.start_time
    )
    existing = await db.execute(query)
    if existing.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="La máquina presenta un conflicto de horario en el bloque seleccionado."
        )
    
    new_res = MachineReservation(**payload.model_dump(), system="bravo")
    db.add(new_res)
    await db.commit()
    return {"status": "success", "reservation_id": new_res.id}

@router.delete("/reserve/{id}", status_code=200)
async def delete_reservation(id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(MachineReservation).where(MachineReservation.id == id, MachineReservation.system == "bravo")
    )
    res = result.scalar_one_or_none()
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    await db.delete(res)
    await db.commit()
    return {"status": "success", "detail": "Reserva cancelada correctamente"}

@router.patch("/{machine_id}", response_model=MachineResponseSchema)
async def update_machine(
    machine_id: int,
    payload: MachineUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Machine).where(Machine.id == machine_id, Machine.system == "bravo")
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(machine, key, value)
        
    await db.commit()
    await db.refresh(machine)
    return machine
