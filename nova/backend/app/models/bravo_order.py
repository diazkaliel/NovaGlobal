from sqlalchemy import String, Text, ForeignKey, Integer, Date, Numeric, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date

from app.db.database import Base
from app.models.base import TimestampMixin


class BravoOrder(TimestampMixin, Base):
    """
    Representa una orden de trabajo de personalización gráfica y textil en Bravo.
    Aislada deliberadamente de la tabla 'repairs' de servicio técnico electrónico.
    """
    __tablename__ = "bravo_orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Identificador correlativo de taller: ej. "BRV-00042"
    order_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)

    # Cliente del taller textil
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    client: Mapped["Client"] = relationship(back_populates="bravo_orders")

    # Operador o diseñador a cargo de la orden
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    technician: Mapped["User | None"] = relationship()

    # Especificaciones de la prenda o artículo base
    item_category: Mapped[str] = mapped_column(String(50), nullable=False)   # polera, poleron, tazon, jockey, etc.
    brand: Mapped[str] = mapped_column(String(50), nullable=False, default="Personalizado")
    model: Mapped[str] = mapped_column(String(100), nullable=False, default="Estandar")
    garment_color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    garment_size: Mapped[str | None] = mapped_column(String(10), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reported_issue: Mapped[str] = mapped_column(Text, nullable=False)        # Descripción del trabajo/estampado solicitado
    accessories: Mapped[str | None] = mapped_column(Text, nullable=True)      # Observaciones o insumos provistos por el cliente

    # Ficha Técnica de Impresión / Personalización
    print_technique: Mapped[str | None] = mapped_column(String(50), nullable=True)     # dtf, grabado_laser, sublimacion, vinilo
    print_location: Mapped[str | None] = mapped_column(String(100), nullable=True)     # Pecho, Espalda, Manga, Contorno
    print_dimensions: Mapped[str | None] = mapped_column(String(50), nullable=True)    # ej. "A4", "30x40cm"
    design_file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    mockup_file_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Ciclo de Vida del Taller Textil
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="recibido",
        index=True
        # recibido, diseno_aprobado, en_produccion, control_calidad, listo, entregado, cancelado
    )
    estimated_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Aspectos Comerciales
    order_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    deposit: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    deposit_payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    final_payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Control de Entregas Parciales (División de Órdenes)
    parent_order_id: Mapped[int | None] = mapped_column(ForeignKey("bravo_orders.id", ondelete="SET NULL"), nullable=True)
    is_split_child: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relaciones de Taller
    history: Mapped[list["BravoOrderHistory"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="BravoOrderHistory.id"
    )
    comments: Mapped[list["BravoOrderComment"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    inventory_usage: Mapped[list["BravoOrderInventory"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class BravoOrderHistory(Base):
    """
    Trazabilidad inmutable de estados para las órdenes de personalización textil.
    """
    __tablename__ = "bravo_order_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("bravo_orders.id", ondelete="CASCADE"), nullable=False)
    order: Mapped["BravoOrder"] = relationship(back_populates="history")

    previous_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    changed_at: Mapped[str] = mapped_column(String(50), nullable=False)


class BravoOrderComment(Base):
    """
    Mensajes internos y retroalimentación directa de clientes para la orden de Bravo.
    """
    __tablename__ = "bravo_order_comments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("bravo_orders.id", ondelete="CASCADE"), nullable=False)
    order: Mapped["BravoOrder"] = relationship(back_populates="comments")

    sender: Mapped[str] = mapped_column(String(20), nullable=False)  # "client" o "admin"
    author_name: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class BravoOrderInventory(Base):
    """
    Registro de consumo de insumos/mercancía textil específicos para una orden de Bravo.
    """
    __tablename__ = "bravo_order_inventory"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("bravo_orders.id", ondelete="CASCADE"), nullable=False)
    order: Mapped["BravoOrder"] = relationship(back_populates="inventory_usage")

    item_id: Mapped[int] = mapped_column(ForeignKey("inventory.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=1.0)
