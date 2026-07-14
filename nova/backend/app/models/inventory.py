from sqlalchemy import String, Integer, Numeric, ForeignKey

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class InventoryItem(TimestampMixin, Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    # insumo = usado en reparaciones, mercancia = para venta directa
    category: Mapped[str] = mapped_column(String(20), nullable=False)

    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

    # Numeric para dinero — nunca uses Float para valores monetarios
    # Float tiene errores de precisión: 0.1 + 0.2 = 0.30000000000000004
    cost_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    sale_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    system: Mapped[str] = mapped_column(String(20), nullable=False, server_default="nova", default="nova")

    usage_records: Mapped[list["RepairInventory"]] = relationship(back_populates="item", cascade="all, delete-orphan")


class RepairInventory(Base):
    """Tabla intermedia: registra qué insumos se usaron en cada reparación"""
    __tablename__ = "repair_inventory"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repair_id: Mapped[int] = mapped_column(ForeignKey("repairs.id"), nullable=False)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    repair: Mapped["Repair"] = relationship(back_populates="inventory_usage")
    item: Mapped["InventoryItem"] = relationship(back_populates="usage_records")

    @property
    def inventory_item(self):
        return self.item