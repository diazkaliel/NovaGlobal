from sqlalchemy import String, Text, ForeignKey, Integer, Date, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date


from app.db.database import Base
from app.models.base import TimestampMixin


class Repair(TimestampMixin, Base):
    __tablename__ = "repairs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Número de orden legible: ej. "ORD-00042"
    order_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    # Relación con cliente
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    client: Mapped["Client"] = relationship(back_populates="repairs")

    # Relación con técnico asignado
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    technician: Mapped["User | None"] = relationship(back_populates="repairs")

    # Información del dispositivo
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)   # phone, laptop, etc.
    brand: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    reported_issue: Mapped[str] = mapped_column(Text, nullable=False)
    accessories: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Contraseña del dispositivo encriptada con Fernet
    # NUNCA se guarda en texto plano
    device_password_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Estado actual de la reparación
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="recibido"
        # valores válidos: recibido, diagnostico, en_reparacion, listo, entregado
    )
    estimated_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)
    repair_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    deposit: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    deposit_payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    final_payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    warranty_days: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    system: Mapped[str] = mapped_column(String(20), nullable=False, server_default="nova", default="nova")

    # Ficha Técnica de Estampado (Bravo)
    design_file_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mockup_file_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    print_technique: Mapped[str | None] = mapped_column(String(50), nullable=True)
    print_location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    print_dimensions: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Autoreferencia para Gestión de Entregas Parciales (Órdenes Divididas)
    parent_order_id: Mapped[int | None] = mapped_column(ForeignKey("repairs.id", ondelete="SET NULL"), nullable=True)
    is_split_child: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relaciones
    history: Mapped[list["RepairHistory"]] = relationship(back_populates="repair", cascade="all, delete-orphan")
    inventory_usage: Mapped[list["RepairInventory"]] = relationship(back_populates="repair", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="repair", cascade="all, delete-orphan")
    comments: Mapped[list["RepairComment"]] = relationship(back_populates="repair", cascade="all, delete-orphan")

    @property
    def usage_records(self):
        return self.inventory_usage

    @property
    def device_password(self) -> str | None:
        """Retorna la contraseña del dispositivo desencriptada."""
        from app.core.security import decrypt_password
        return decrypt_password(self.device_password_encrypted)

    @device_password.setter
    def device_password(self, value: str | None):
        """Encripta la contraseña del dispositivo y la almacena."""
        from app.core.security import encrypt_password
        self.device_password_encrypted = encrypt_password(value)


class RepairHistory(Base):
    """
    Historial inmutable de cambios de estado.
    Inmutable significa que nunca se edita ni borra un registro —
    solo se agregan nuevos. Es el registro oficial de lo que pasó.
    """
    __tablename__ = "repair_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repair_id: Mapped[int] = mapped_column(ForeignKey("repairs.id"), nullable=False)
    repair: Mapped["Repair"] = relationship(back_populates="history")

    previous_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    changed_at: Mapped[str] = mapped_column(String(50), nullable=False)


class RepairComment(Base):
    """
    Comentarios y mensajes de chat sobre la reparación / pedido de estampado.
    Permite la comunicación directa cliente-taller.
    """
    __tablename__ = "repair_comments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repair_id: Mapped[int] = mapped_column(ForeignKey("repairs.id", ondelete="CASCADE"), nullable=False)
    repair: Mapped["Repair"] = relationship(back_populates="comments")

    sender: Mapped[str] = mapped_column(String(20), nullable=False)  # "client" o "admin"
    author_name: Mapped[str] = mapped_column(String(100), nullable=False) # ej. "Juan Pérez" o "Técnico Juan"
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String(50), nullable=False) # ISO timestamp
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)