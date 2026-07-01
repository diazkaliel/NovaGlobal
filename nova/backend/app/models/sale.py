from sqlalchemy import String, ForeignKey, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class Sale(TimestampMixin, Base):
    """
    Representa una transacción de venta en el sistema (Nova o Bravo).
    """
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    system: Mapped[str] = mapped_column(String(20), nullable=False, default="nova")  # nova o bravo
    
    # Cliente opcional
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    client: Mapped["Client | None"] = relationship()

    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)  # efectivo, transferencia, debito, credito
    sale_type: Mapped[str] = mapped_column(String(50), nullable=False, default="directa")  # directa (mercancía) o servicio (reparación/personalización)
    
    # ID de referencia opcional (ID de reparación o de orden de diseño)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    """
    Detalle de los artículos o servicios incluidos en una venta.
    """
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), nullable=False)
    sale: Mapped["Sale"] = relationship(back_populates="items")

    # Ítem del inventario opcional (por ejemplo, si se vende una mercancía física)
    item_id: Mapped[int | None] = mapped_column(ForeignKey("inventory.id"), nullable=True)
    item: Mapped["InventoryItem | None"] = relationship()

    # Si es un servicio o algo manual (ej: "Estampado de polera", "Bordado de gorra")
    service_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
