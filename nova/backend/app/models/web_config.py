from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.base import TimestampMixin


class WebConfig(TimestampMixin, Base):
    __tablename__ = "web_config"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    whatsapp: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    reference_prices: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    faqs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    system: Mapped[str] = mapped_column(String(20), nullable=False, server_default="nova", default="nova")

