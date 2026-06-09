from sqlalchemy import String, Text, ForeignKey, Integer, Date 
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date


from app.db.database import Base
from app.models.base import TimestampMixin


class Repair(TimestampMixin, Base):
    __tablename__ = "repairs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Número de orden legible: ej. "ORD-00042"
    order_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    # Relación con cliente
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    client: Mapped["Client"] = relationship(back_populates="repairs")

    # Relación con técnico asignado
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    technician: Mapped["User | None"] = relationship(back_populates="repairs")

    # Información del dispositivo
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)   # phone, laptop, etc.
    brand: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    reported_issue: Mapped[str] = mapped_column(Text, nullable=False)
    accessories: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Contraseña del dispositivo encriptada con Fernet
    # NUNCA se guarda en texto plano
    device_password_encrypted: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Estado actual de la reparación
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="recibido"
        # valores válidos: recibido, diagnostico, en_reparacion, listo, entregado
    )
    estimated_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)


    # Relaciones
    history: Mapped[list["RepairHistory"]] = relationship(back_populates="repair")
    inventory_usage: Mapped[list["RepairInventory"]] = relationship(back_populates="repair")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="repair")


class RepairHistory(Base):
    """
    Historial inmutable de cambios de estado.
    Inmutable significa que nunca se edita ni borra un registro —
    solo se agregan nuevos. Es el registro oficial de lo que pasó.
    """
    __tablename__ = "repair_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repair_id: Mapped[int] = mapped_column(ForeignKey("repairs.id"), nullable=False)
    repair: Mapped["Repair"] = relationship(back_populates="history")

    previous_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    changed_at: Mapped[str] = mapped_column(String(50), nullable=False)