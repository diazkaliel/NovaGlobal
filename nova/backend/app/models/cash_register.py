from sqlalchemy import String, ForeignKey, Numeric, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.database import Base


class CashRegisterSession(Base):
    """
    Representa una sesión de caja diaria para registrar ingresos y egresos.
    """
    __tablename__ = "cash_register_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    system: Mapped[str] = mapped_column(String(20), nullable=False, default="nova")  # nova o bravo
    
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    opened_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    opened_by: Mapped["User"] = relationship(foreign_keys=[opened_by_id])

    closed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    closed_by: Mapped["User | None"] = relationship(foreign_keys=[closed_by_id])

    initial_balance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    expected_balance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    actual_balance: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open, closed

    transactions: Mapped[list["CashRegisterTransaction"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class CashRegisterTransaction(Base):
    """
    Representa un movimiento de dinero individual dentro de una sesión de caja activa.
    """
    __tablename__ = "cash_register_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("cash_register_sessions.id"), nullable=False)
    session: Mapped["CashRegisterSession"] = relationship(back_populates="transactions")

    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # ingreso (cash-in), egreso (cash-out)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)  # efectivo, transferencia, debito, credito
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
