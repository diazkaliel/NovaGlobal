from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(36), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    response: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
