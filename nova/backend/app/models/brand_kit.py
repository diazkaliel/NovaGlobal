from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.db.database import Base
from app.models.base import TimestampMixin

class BrandKit(TimestampMixin, Base):
    __tablename__ = "bravo_brand_kits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Formato esperado: [{"name": "Corporativo", "hex": "#1E3A8A", "pantone": "286 C"}]
    colors: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    
    # Formato esperado: [{"usage": "Títulos", "font_family": "Montserrat", "source": "Google Fonts"}]
    typographies: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    
    # Restricciones técnicas o notas de uso de logo / marca
    guidelines: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    system: Mapped[str] = mapped_column(String(20), default="bravo", index=True, nullable=False)

    client: Mapped["Client"] = relationship("Client")
