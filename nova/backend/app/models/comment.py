from sqlalchemy import String, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.base import TimestampMixin


class Comment(TimestampMixin, Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
