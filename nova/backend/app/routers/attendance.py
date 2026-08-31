from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user, get_current_admin, check_system_access
from app.models.user import User
from app.schemas.attendance import (
    ClockInRequest,
    ClockOutRequest,
    AttendanceRecordResponse,
    AttendanceStatusResponse,
    AttendanceAdminUpdate
)
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/clock-in", response_model=AttendanceRecordResponse, status_code=status.HTTP_201_CREATED)
async def clock_in_endpoint(
    data: ClockInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca la entrada laboral del usuario autenticado en su tienda asignada."""
    check_system_access(current_user, data.system)
    return await attendance_service.clock_in(db, current_user, data)


@router.post("/clock-out", response_model=AttendanceRecordResponse)
async def clock_out_endpoint(
    data: ClockOutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca la salida laboral del usuario autenticado y calcula el tiempo trabajado."""
    return await attendance_service.clock_out(db, current_user, data)


@router.get("/my-status", response_model=AttendanceStatusResponse)
async def my_attendance_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene el estado en vivo del turno actual del usuario autenticado."""
    return await attendance_service.get_user_status(db, current_user)


@router.get("/my-history", response_model=list[AttendanceRecordResponse])
async def my_attendance_history(
    limit: int = Query(60, ge=1, le=200, description="Número máximo de registros a recuperar"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permite al colaborador consultar su propio historial de asistencia y horas trabajadas."""
    return await attendance_service.get_user_attendance_history(db, current_user, limit=limit)


# ==========================================
# Endpoints Administrativos (Solo Admin)
# ==========================================

@router.get("/admin/records", response_model=list[AttendanceRecordResponse])
async def admin_list_records(
    target_date: date | None = Query(None, description="Filtrar por fecha específica (YYYY-MM-DD)"),
    user_id: int | None = Query(None, description="Filtrar por ID de colaborador"),
    system: str | None = Query(None, description="Filtrar por sistema (nova o bravo)"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """Consulta global de registros de asistencia con filtros para el Administrador."""
    return await attendance_service.get_admin_attendance_records(
        db, target_date=target_date, user_id=user_id, system=system
    )


@router.patch("/admin/records/{record_id}", response_model=AttendanceRecordResponse)
async def admin_update_record(
    record_id: int,
    data: AttendanceAdminUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """Permite al Administrador corregir manualmente una hora de entrada, salida o notas olvidadas."""
    return await attendance_service.update_record_by_admin(db, record_id, data)
