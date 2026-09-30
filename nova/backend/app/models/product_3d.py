from sqlalchemy import String, Integer, Numeric, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from typing import Optional, Any

from app.db.database import Base
from app.models.base import TimestampMixin


class Product3DModel(TimestampMixin, Base):
    """
    Modelo ORM que almacena las configuraciones 3D de cada producto personalizable.
    Vincula mallas GLB o procedurales con sus zonas de impresión y presets de cámara.
    """
    __tablename__ = "products_3d"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # URL opcional al archivo .glb optimizado
    glb_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Tipo procedural de fallback si no hay GLB cargado (t_shirt, mug, bottle, etc.)
    procedural_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="t_shirt")

    # Color base por defecto y paleta permitida
    base_color_hex: Mapped[str] = mapped_column(String(10), default="#ffffff", nullable=False)
    available_colors: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list, nullable=False)

    # Zonas de impresión físicas [ { id, name, maxWidthCm, maxHeightCm, allowedTechniques } ]
    print_zones: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    # Presets de cámara de estudio
    camera_presets: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("8990.00"), nullable=False)

    # Relación opcional con el inventario físico
    inventory_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)

    sessions: Mapped[list["CustomizationSession"]] = relationship(
        back_populates="product_3d",
        cascade="all, delete-orphan"
    )


class CustomizationSession(TimestampMixin, Base):
    """
    Persistencia del estado de personalización 3D configurado por el usuario o cliente.
    Almacena el decal transformado y permite reanudar el diseño o generar la orden de compra.
    """
    __tablename__ = "customization_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_token: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)

    product_3d_id: Mapped[int] = mapped_column(ForeignKey("products_3d.id", ondelete="CASCADE"), nullable=False)
    selected_color_hex: Mapped[str] = mapped_column(String(10), default="#ffffff", nullable=False)
    technique: Mapped[str] = mapped_column(String(30), default="dtf", nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Configuración de los decals [ { id, zoneId, artworkUrl, transform: {x,y,scale,rotationDeg} } ]
    decals_config: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    # Desglose de precios registrado al momento de guardar la sesión
    pricing_breakdown: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Snapshot en miniatura del render 3D capturado en alta fidelidad
    preview_image_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    product_3d: Mapped["Product3DModel"] = relationship(back_populates="sessions")


class PricingRule(TimestampMixin, Base):
    """Reglas de cotización por técnica y costos por centímetro cuadrado."""
    __tablename__ = "pricing_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    technique: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    rate_per_cm2: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    setup_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
