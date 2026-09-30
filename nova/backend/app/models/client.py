from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin


class Client(TimestampMixin, Base):
    """
    Entidad de cliente con aislamiento estricto por sistema (Nova vs Bravo).
    Permite que un mismo número de contacto exista de forma independiente en ambas tiendas.
    """
    __tablename__ = "clients"
    __table_args__ = (
        UniqueConstraint("phone", "system", name="uq_client_phone_system"),
        UniqueConstraint("rut", "system", name="uq_client_rut_system"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    system: Mapped[str] = mapped_column(String(20), nullable=False, server_default="nova", default="nova", index=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    rut: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)

    repairs: Mapped[list["Repair"]] = relationship(back_populates="client")
    bravo_orders: Mapped[list["BravoOrder"]] = relationship(back_populates="client")