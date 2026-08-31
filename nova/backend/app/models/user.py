from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.repair import Repair
    from app.models.attendance import AttendanceRecord


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="technician")
    system: Mapped[str] = mapped_column(String(20), nullable=False, default="all", server_default="all")  # 'nova', 'bravo', o 'all' (admin)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    repairs: Mapped[list["Repair"]] = relationship(back_populates="technician")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")