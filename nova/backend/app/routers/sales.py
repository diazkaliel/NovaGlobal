from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleResponse, SaleStatsResponse
from app.services import sale_service

router = APIRouter(
    prefix="/sales",
    tags=["sales"]
)


@router.post("/", response_model=SaleResponse)
async def api_create_sale(
    sale_data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra una nueva venta directa o de servicio y descuenta inventario si aplica.
    """
    return await sale_service.create_sale(db, sale_data, current_user.id)


@router.get("/", response_model=List[SaleResponse])
async def api_get_sales(
    system: str = Query(..., description="System filter: 'nova' or 'bravo'"),
    limit: int = Query(100, ge=1),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista las ventas de un sistema determinado.
    """
    return await sale_service.get_sales(db, system, limit, offset)


@router.get("/stats", response_model=SaleStatsResponse)
async def api_get_sale_stats(
    system: str = Query(..., description="System filter: 'nova' or 'bravo'"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna estadísticas agregadas de ventas (ingresos, transacciones, etc.).
    """
    return await sale_service.get_sale_stats(db, system)
