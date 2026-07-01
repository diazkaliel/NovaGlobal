from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.cash_register import (
    CashRegisterSessionCreate, 
    CashRegisterSessionClose, 
    CashRegisterTransactionCreate,
    CashRegisterSessionResponse, 
    CashRegisterStatusResponse, 
    CashRegisterTransactionResponse
)
from app.services import cash_service

router = APIRouter(
    prefix="/cash-register",
    tags=["cash-register"]
)


@router.get("/status", response_model=CashRegisterStatusResponse)
async def api_get_status(
    system: str = Query(..., description="System filter: 'nova' or 'bravo'"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna si la caja chica del sistema está abierta y, si es así, su sesión activa.
    """
    session = await cash_service.get_active_session(db, system)
    return {
        "is_open": session is not None,
        "current_session": session
    }


@router.post("/open", response_model=CashRegisterSessionResponse)
async def api_open_session(
    session_data: CashRegisterSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Abre una nueva sesión diaria de caja chica para el sistema.
    """
    return await cash_service.open_session(db, session_data, current_user.id)


@router.post("/close/{session_id}", response_model=CashRegisterSessionResponse)
async def api_close_session(
    session_id: int,
    close_data: CashRegisterSessionClose,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cierra de forma definitiva la sesión diaria de caja chica.
    """
    return await cash_service.close_session(db, session_id, close_data, current_user.id)


@router.post("/transaction/{session_id}", response_model=CashRegisterTransactionResponse)
async def api_create_transaction(
    session_id: int,
    tx_data: CashRegisterTransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra un movimiento manual (ingreso o egreso) en la caja abierta.
    """
    return await cash_service.create_transaction(db, session_id, tx_data)
