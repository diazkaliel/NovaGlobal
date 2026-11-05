"""Detalles comerciales propios de Bravo. Nova conserva su modelo de reparaciones."""
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class BravoOrderLine(Base):
    __tablename__ = "bravo_order_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_bravo_order_line_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_bravo_order_line_price_nonnegative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repair_id: Mapped[int] = mapped_column(
        ForeignKey("repairs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # El producto puede retirarse del catálogo sin borrar la historia comercial.
    catalog_product_id: Mapped[int | None] = mapped_column(
        ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True
    )
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    variant: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity
