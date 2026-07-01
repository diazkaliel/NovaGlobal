from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

from app.db.database import Base
from app.models.base import TimestampMixin

class QAInspection(TimestampMixin, Base):
    __tablename__ = "bravo_qa_inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("repairs.id", ondelete="CASCADE"), unique=True, nullable=False)
    operator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    inspected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Ejemplo estructural: {"hilos_cortados": true, "sin_manchas": true, "curado_temperatura": true}
    checklist_results: Mapped[dict] = mapped_column(JSONB, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    comments: Mapped[str | None] = mapped_column(String(255), nullable=True)
    system: Mapped[str] = mapped_column(String(20), default="bravo", index=True, nullable=False)

    order: Mapped["Repair"] = relationship("Repair")
    operator: Mapped["User"] = relationship("User")
