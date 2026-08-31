from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.services import activity_log_service
from app.services.activity_log_service import ActivityItemResponse

router = APIRouter(prefix="/admin/activity-logs", tags=["admin-activity-logs"])


@router.get("", response_model=list[ActivityItemResponse])
@router.get("/", response_model=list[ActivityItemResponse])
async def list_activity_logs(
    category: str | None = Query(None, description="Filtrar por categoría (attendance, orders, status_changes, sales, cash, all)"),
    user_id: int | None = Query(None, description="Filtrar por ID de colaborador"),
    system: str | None = Query(None, description="Filtrar por sistema (nova, bravo o all)"),
    target_date: date | None = Query(None, description="Filtrar por fecha específica (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Número de eventos a recuperar"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """
    Retorna la bitácora unificada de actividad de colaboradores en tiempo real.
    Acceso exclusivo para administradores.
    """
    return await activity_log_service.get_activity_logs(
        db,
        category=category,
        user_id=user_id,
        system=system,
        target_date=target_date,
        limit=limit
    )
