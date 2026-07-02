from sqlalchemy import String, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.base import TimestampMixin


class ScreenPrice(TimestampMixin, Base):
    __tablename__ = "screen_prices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Numeric para dinero — nunca uses Float para valores monetarios
    cost_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    sale_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    
    quality: Mapped[str] = mapped_column(String(50), nullable=False, server_default="Original", default="Original")
