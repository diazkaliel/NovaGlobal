from typing import Literal, Optional
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


class DecalTransform(BaseModel):
    """
    Coordenadas normalizadas para el posicionamiento y transformacion de estampas en la zona de impresion.
    Se manejan valores normalizados [0.0 - 1.0] para independizar la interfaz 2D/3D de la resolucion fisica.
    """
    x: float = Field(default=0.5, ge=0.0, le=1.0, description="Posicion X normalizada dentro de la zona (0=izq, 1=der)")
    y: float = Field(default=0.5, ge=0.0, le=1.0, description="Posicion Y normalizada dentro de la zona (0=arriba, 1=abajo)")
    scale: float = Field(default=0.5, ge=0.05, le=1.5, description="Factor de escala relativo a la zona de impresion")
    rotation_deg: float = Field(default=0.0, ge=-180.0, le=360.0, description="Rotacion en grados sexagesimales")


class DecalConfig(BaseModel):
    """Configuracion individual de una estampa aplicada a una zona de la prenda."""
    id: str = Field(description="Identificador unico del decal en el cliente")
    zone_id: str = Field(default="front", description="Identificador de la zona de impresion objetivo (ej: front, back)")
    artwork_url: Optional[str] = Field(default=None, description="URL publica o relativa del SVG/PNG")
    artwork_type: Literal["svg", "raster", "text"] = Field(default="raster")
    transform: DecalTransform = Field(default_factory=DecalTransform)
    
    # Parametros opcionales para texto dinamico
    text_content: Optional[str] = None
    text_font: Optional[str] = "Outfit"
    text_color: Optional[str] = "#ffffff"

    # Dimensiones fisicas resultantes estimadas para produccion y cotizacion
    width_cm: Optional[float] = Field(default=None, ge=0.0)
    height_cm: Optional[float] = Field(default=None, ge=0.0)


class PrintZone(BaseModel):
    """Definicion fisica de la zona permitida para estampar en el modelo 3D."""
    id: str = Field(description="Identificador unico de la zona (ej: 'front', 'back', 'sleeve')")
    name: str = Field(description="Nombre legible para el usuario (ej: 'Pecho / Frente')")
    max_width_cm: float = Field(gt=0, description="Ancho maximo fisico imprimible en centimetros")
    max_height_cm: float = Field(gt=0, description="Alto maximo fisico imprimible en centimetros")
    uv_bounds: Optional[dict[str, float]] = Field(
        default=None,
        description="Limites en el espacio UV [u_min, v_min, u_max, v_max] de la malla 3D"
    )
    allowed_techniques: list[str] = Field(
        default_factory=lambda: ["dtf", "sublimacion", "vinilo"],
        description="Tecnicas de impresion compatibles con este sustrato/zona"
    )


class CameraPreset(BaseModel):
    """Preset de posicion y objetivo de la camara para navegacion rapida en el estudio."""
    position: tuple[float, float, float]
    target: tuple[float, float, float]


class ProductColorOption(BaseModel):
    name: str
    hex: str

    @field_validator("hex")
    @classmethod
    def normalize_hex(cls, v: str) -> str:
        v = v.strip().lower()
        if not v.startswith("#"):
            v = f"#{v}"
        return v


class Product3DModelBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    sku: str = Field(min_length=2, max_length=50)
    glb_url: Optional[str] = None
    procedural_type: Optional[Literal["t_shirt", "mug", "cap", "bottle", "hoodie", "totebag"]] = None
    base_color_hex: str = "#ffffff"
    available_colors: list[ProductColorOption] = Field(default_factory=list)
    print_zones: list[PrintZone] = Field(default_factory=list)
    camera_presets: dict[str, CameraPreset] = Field(default_factory=dict)
    inventory_id: Optional[int] = None


class Product3DModelCreate(Product3DModelBase):
    pass


class Product3DModelResponse(Product3DModelBase):
    id: int

    model_config = {"from_attributes": True}


class PricingQuoteRequest(BaseModel):
    """Solicitud de cotizacion reactiva en tiempo real."""
    product_3d_id: int
    technique: str = Field(default="dtf")
    quantity: int = Field(default=1, ge=1)
    decals: list[DecalConfig] = Field(default_factory=list)


class PricingQuoteBreakdown(BaseModel):
    base_product_price: Decimal
    customization_cost: Decimal
    total_print_area_cm2: float
    volume_discount_pct: Decimal
    unit_price: Decimal
    final_total: Decimal


class CustomizationSessionCreate(BaseModel):
    """Payload para guardar la sesion completa de diseno antes de generar orden o ficha tecnica."""
    product_3d_id: int
    selected_color_hex: str = "#ffffff"
    decals: list[DecalConfig] = Field(default_factory=list)
    technique: str = "dtf"
    quantity: int = Field(default=1, ge=1)
    preview_image_url: Optional[str] = None


class CustomizationSessionResponse(BaseModel):
    id: int
    session_token: str
    product_3d_id: int
    selected_color_hex: str
    decals: list[DecalConfig]
    technique: str
    quantity: int
    pricing: PricingQuoteBreakdown
    preview_image_url: Optional[str] = None

    model_config = {"from_attributes": True}
