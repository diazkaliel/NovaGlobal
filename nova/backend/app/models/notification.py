from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repair_id: Mapped[int] = mapped_column(ForeignKey("repairs.id"), nullable=False)
    repair: Mapped["Repair"] = relationship(back_populates="notifications")

    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # whatsapp, sms, email
    status: Mapped[str] = mapped_column(String(20), nullable=False)   # enviado, fallido
    message: Mapped[str] = mapped_column(Text, nullable=False)