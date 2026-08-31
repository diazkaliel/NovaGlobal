from datetime import date, datetime
from sqlalchemy import String, Text, ForeignKey, Integer, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class AttendanceRecord(TimestampMixin, Base):
    """
    Registro de asistencia y control horario de colaboradores.
    Guarda las marcas de entrada y salida con zona horaria UTC y cálculo de duración.
    """
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Relación con el colaborador
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user: Mapped["User"] = relationship(back_populates="attendance_records")

    # Fecha de la jornada laboral
    date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)

    # Marcas de tiempo
    clock_in: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    clock_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Duración calculada en minutos al registrar la salida
    total_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Sistema desde donde marcó (nova / bravo)
    system: Mapped[str] = mapped_column(String(20), nullable=False, default="nova")

    # Observaciones o notas adicionales (ej. "Turno mañana", "Salida a terreno")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
