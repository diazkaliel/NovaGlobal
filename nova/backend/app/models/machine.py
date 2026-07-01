from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import enum

from app.db.database import Base
from app.models.base import TimestampMixin

class MachineStatus(str, enum.Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"

class Machine(TimestampMixin, Base):
    __tablename__ = "bravo_machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False) # 'sublimation', 'embroidery', 'vinyl', 'dtf'
    status: Mapped[MachineStatus] = mapped_column(Enum(MachineStatus), default=MachineStatus.ACTIVE, nullable=False)
    system: Mapped[str] = mapped_column(String(20), default="bravo", index=True, nullable=False)

    reservations: Mapped[list["MachineReservation"]] = relationship("MachineReservation", back_populates="machine", cascade="all, delete-orphan")

class MachineReservation(TimestampMixin, Base):
    __tablename__ = "bravo_machine_reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(Integer, ForeignKey("bravo_machines.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("repairs.id", ondelete="CASCADE"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    system: Mapped[str] = mapped_column(String(20), default="bravo", index=True, nullable=False)

    machine: Mapped["Machine"] = relationship("Machine", back_populates="reservations")
    order: Mapped["Repair"] = relationship("Repair")

# Índice de búsqueda por horario para agilizar el chequeo de traslapes
Index("ix_reservation_time", MachineReservation.start_time, MachineReservation.end_time)
