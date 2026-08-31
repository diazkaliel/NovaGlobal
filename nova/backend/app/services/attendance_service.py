from datetime import datetime, date, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.attendance import AttendanceRecord
from app.models.user import User
from app.schemas.attendance import (
    ClockInRequest,
    ClockOutRequest,
    AttendanceRecordResponse,
    AttendanceStatusResponse,
    AttendanceAdminUpdate
)


def _format_record_response(rec: AttendanceRecord) -> AttendanceRecordResponse:
    return AttendanceRecordResponse(
        id=rec.id,
        user_id=rec.user_id,
        user_name=rec.user.name if rec.user else None,
        user_email=rec.user.email if rec.user else None,
        date=rec.date,
        clock_in=rec.clock_in,
        clock_out=rec.clock_out,
        total_minutes=rec.total_minutes,
        system=rec.system,
        notes=rec.notes,
        created_at=rec.created_at
    )


async def clock_in(db: AsyncSession, user: User, data: ClockInRequest) -> AttendanceRecordResponse:
    """Registra la entrada laboral del usuario actual."""
    now = datetime.now(timezone.utc)
    today = date.today()

    # Verificar si el usuario ya tiene un turno abierto (sin salida marcada)
    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.user))
        .where(
            AttendanceRecord.user_id == user.id,
            AttendanceRecord.clock_out.is_(None)
        )
        .order_by(desc(AttendanceRecord.clock_in))
    )
    result = await db.execute(stmt)
    active_record = result.scalar_one_or_none()

    if active_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes un turno activo sin marcar salida. Marca la salida antes de registrar una nueva entrada."
        )

    record = AttendanceRecord(
        user_id=user.id,
        date=today,
        clock_in=now,
        clock_out=None,
        total_minutes=None,
        system=data.system or "nova",
        notes=data.notes
    )

    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Cargar relación con usuario para la respuesta
    record.user = user
    return _format_record_response(record)


async def clock_out(db: AsyncSession, user: User, data: ClockOutRequest) -> AttendanceRecordResponse:
    """Registra la salida laboral del usuario actual y calcula la duración del turno."""
    now = datetime.now(timezone.utc)

    # Buscar el turno abierto más reciente del usuario
    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.user))
        .where(
            AttendanceRecord.user_id == user.id,
            AttendanceRecord.clock_out.is_(None)
        )
        .order_by(desc(AttendanceRecord.clock_in))
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes ningún turno activo abierto para marcar salida."
        )

    record.clock_out = now
    
    # Calcular duración en minutos
    diff_seconds = max(0, (record.clock_out - record.clock_in).total_seconds())
    record.total_minutes = int(diff_seconds // 60)

    if data.notes:
        if record.notes:
            record.notes = f"{record.notes} | Salida: {data.notes}"
        else:
            record.notes = f"Salida: {data.notes}"

    await db.commit()
    await db.refresh(record)

    return _format_record_response(record)


async def get_user_status(db: AsyncSession, user: User) -> AttendanceStatusResponse:
    """Retorna el estado en vivo del turno actual del usuario y sus registros de hoy."""
    today = date.today()

    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.user))
        .where(
            AttendanceRecord.user_id == user.id,
            AttendanceRecord.date == today
        )
        .order_by(desc(AttendanceRecord.clock_in))
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    active_rec = next((r for r in records if r.clock_out is None), None)
    
    # Si hay un turno abierto de un día anterior
    if not active_rec:
        active_stmt = (
            select(AttendanceRecord)
            .options(selectinload(AttendanceRecord.user))
            .where(
                AttendanceRecord.user_id == user.id,
                AttendanceRecord.clock_out.is_(None)
            )
            .order_by(desc(AttendanceRecord.clock_in))
        )
        active_res = await db.execute(active_stmt)
        active_rec = active_res.scalar_one_or_none()

    today_responses = [_format_record_response(r) for r in records]
    total_minutes = sum((r.total_minutes or 0) for r in records)

    return AttendanceStatusResponse(
        is_clocked_in=active_rec is not None,
        active_record=_format_record_response(active_rec) if active_rec else None,
        today_records=today_responses,
        today_total_minutes=total_minutes
    )


async def get_user_attendance_history(
    db: AsyncSession,
    user: User,
    limit: int = 60
) -> list[AttendanceRecordResponse]:
    """Retorna el historial completo de asistencia del usuario autenticado (últimos N registros)."""
    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.user))
        .where(AttendanceRecord.user_id == user.id)
        .order_by(desc(AttendanceRecord.clock_in))
        .limit(limit)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [_format_record_response(r) for r in records]


async def get_admin_attendance_records(
    db: AsyncSession,
    target_date: date | None = None,
    user_id: int | None = None,
    system: str | None = None
) -> list[AttendanceRecordResponse]:
    """Consulta global de asistencia para administradores con filtros."""
    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.user))
        .order_by(desc(AttendanceRecord.clock_in))
    )

    if target_date:
        stmt = stmt.where(AttendanceRecord.date == target_date)
    if user_id:
        stmt = stmt.where(AttendanceRecord.user_id == user_id)
    if system and system != "all":
        stmt = stmt.where(AttendanceRecord.system == system)

    result = await db.execute(stmt)
    records = result.scalars().all()

    return [_format_record_response(r) for r in records]


async def update_attendance_by_admin(
    db: AsyncSession,
    record_id: int,
    data: AttendanceAdminUpdate
) -> AttendanceRecordResponse:
    """Permite al administrador corregir horarios o cerrar turnos olvidados."""
    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.user))
        .where(AttendanceRecord.id == record_id)
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de asistencia no encontrado."
        )

    if data.clock_in is not None:
        record.clock_in = data.clock_in
    if data.clock_out is not None:
        record.clock_out = data.clock_out
    if data.notes is not None:
        record.notes = data.notes

    # Recalcular duración
    if record.clock_in and record.clock_out:
        diff_seconds = max(0, (record.clock_out - record.clock_in).total_seconds())
        record.total_minutes = int(diff_seconds // 60)
    else:
        record.total_minutes = None

    await db.commit()
    await db.refresh(record)

    return _format_record_response(record)


async def delete_attendance_by_admin(db: AsyncSession, record_id: int) -> dict:
    """Elimina un registro de asistencia (solo administradores)."""
    stmt = select(AttendanceRecord).where(AttendanceRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado."
        )

    await db.delete(record)
    await db.commit()
    return {"status": "success", "message": "Registro de asistencia eliminado correctamente."}
