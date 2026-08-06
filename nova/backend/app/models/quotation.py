from sqlalchemy import String, Integer, Numeric, ForeignKey, Text, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date

from app.db.database import Base
from app.models.base import TimestampMixin


class Quotation(TimestampMixin, Base):
    """Cotizaciones oficiales de Personalizaciones Bravo"""
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    system: Mapped[str] = mapped_column(String(20), nullable=False, default="bravo")
    quote_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    client: Mapped["Client | None"] = relationship()

    client_name: Mapped[str | None] = mapped_column(String(150), nullable=True)  # para cotizaciones sin cliente registrado
    client_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    client_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)

    # borrador | enviada | aceptada | rechazada
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")

    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    discount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    items: Mapped[list["QuotationItem"]] = relationship(back_populates="quotation", cascade="all, delete-orphan")


class QuotationItem(Base):
    """Línea de ítem dentro de una cotización"""
    __tablename__ = "quotation_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    quotation_id: Mapped[int] = mapped_column(ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    quotation: Mapped["Quotation"] = relationship(back_populates="items")

    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Referencia opcional a un ítem de inventario
    inventory_item_id: Mapped[int | None] = mapped_column(ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    inventory_item: Mapped["InventoryItem | None"] = relationship()
