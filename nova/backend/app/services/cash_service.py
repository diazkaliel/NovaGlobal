from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from datetime import datetime
from decimal import Decimal

from app.models.cash_register import CashRegisterSession, CashRegisterTransaction
from app.schemas.cash_register import CashRegisterSessionCreate, CashRegisterSessionClose, CashRegisterTransactionCreate


async def get_session_by_id(db: AsyncSession, session_id: int) -> CashRegisterSession:
    """
    Retorna una sesión de caja chica por su ID con todas sus relaciones pre-cargadas.
    """
    stmt = (
        select(CashRegisterSession)
        .options(
            selectinload(CashRegisterSession.opened_by),
            selectinload(CashRegisterSession.closed_by),
            selectinload(CashRegisterSession.transactions)
        )
        .where(CashRegisterSession.id == session_id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de caja chica no encontrada."
        )
    return session


async def get_active_session(db: AsyncSession, system: str) -> CashRegisterSession | None:
    """
    Retorna la sesión de caja chica abierta para el sistema, si existe.
    """
    stmt = (
        select(CashRegisterSession)
        .options(
            selectinload(CashRegisterSession.opened_by),
            selectinload(CashRegisterSession.closed_by),
            selectinload(CashRegisterSession.transactions)
        )
        .where(
            and_(
                CashRegisterSession.system == system,
                CashRegisterSession.status == "open"
            )
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def open_session(db: AsyncSession, session_data: CashRegisterSessionCreate, user_id: int) -> CashRegisterSession:
    """
    Abre una nueva sesión de caja chica diaria.
    """
    # Validar que no haya una sesión ya abierta
    active = await get_active_session(db, session_data.system)
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una sesión de caja chica abierta para este sistema."
        )

    initial_bal = float(Decimal(str(session_data.initial_balance)))
    session = CashRegisterSession(
        system=session_data.system,
        opened_by_id=user_id,
        initial_balance=initial_bal,
        expected_balance=initial_bal,
        status="open"
    )
    db.add(session)
    await db.commit()
    return await get_session_by_id(db, session.id)


async def close_session(db: AsyncSession, session_id: int, close_data: CashRegisterSessionClose, user_id: int) -> CashRegisterSession:
    """
    Cierra la sesión de caja activa de forma definitiva.
    """
    session = await get_session_by_id(db, session_id)

    if session.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta sesión de caja ya se encuentra cerrada."
        )

    session.closed_at = datetime.utcnow()
    session.closed_by_id = user_id
    session.actual_balance = float(Decimal(str(close_data.actual_balance)))
    session.status = "closed"

    db.add(session)
    await db.commit()
    return await get_session_by_id(db, session_id)


async def create_transaction(
    db: AsyncSession, 
    session_id: int, 
    tx_data: CashRegisterTransactionCreate
) -> CashRegisterTransaction:
    """
    Registra un movimiento manual (ingreso/egreso) en una sesión de caja abierta.
    """
    # Obtener la sesión para validar su estado
    stmt = select(CashRegisterSession).where(CashRegisterSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de caja chica no encontrada."
        )

    if session.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden registrar movimientos en una sesión de caja cerrada."
        )

    amount_val = float(Decimal(str(tx_data.amount)))
    tx = CashRegisterTransaction(
        session_id=session.id,
        transaction_type=tx_data.transaction_type,
        amount=amount_val,
        description=tx_data.description,
        payment_method=tx_data.payment_method
    )
    db.add(tx)

    # Actualizar balance esperado de la caja chica
    if tx_data.transaction_type == "ingreso":
        session.expected_balance = float(session.expected_balance) + amount_val
    elif tx_data.transaction_type == "egreso":
        session.expected_balance = float(session.expected_balance) - amount_val
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de transacción inválido. Debe ser 'ingreso' o 'egreso'."
        )

    db.add(session)
    await db.commit()
    await db.refresh(tx)
    return tx

