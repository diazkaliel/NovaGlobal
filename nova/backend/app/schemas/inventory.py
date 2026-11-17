from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from decimal import Decimal


class InventoryItemBase(BaseModel):
    name: str
    category: str  # insumo | mercancia
    stock: int = Field(default=0, ge=0)
    min_stock: int = Field(default=5, ge=0)
    cost_price: Decimal = Field(ge=0)
    sale_price: Decimal = Field(ge=0)
    image_url: str | None = None
    system: str = "nova"

    # Validamos que la categoría sea una de las permitidas
    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {"insumo", "mercancia"}
        if v not in allowed:
            raise ValueError(f"Categoría debe ser una de: {allowed}")
        return v

    # Los insumos tienen costo de consumo y pueden tener precio de venta cero.
    @field_validator("sale_price")
    @classmethod
    def validate_sale_price(cls, v: Decimal, info) -> Decimal:
        cost = info.data.get("cost_price")
        if info.data.get("category") == "mercancia" and cost is not None and v < cost:
            raise ValueError("El precio de venta no puede ser menor al precio de costo")
        return v


class InventoryItemCreate(InventoryItemBase):
    @model_validator(mode="before")
    @classmethod
    def default_supply_sale_price(cls, values):
        if isinstance(values, dict) and values.get("category") == "insumo":
            return {"sale_price": Decimal("0"), **values}
        return values


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    stock: int | None = None
    min_stock: int | None = None
    cost_price: Decimal | None = None
    sale_price: Decimal | None = None
    image_url: str | None = None
    system: str | None = None


class InventoryItemResponse(InventoryItemBase):
    archived_at: datetime | None = None
    id: int
    created_at: datetime
    # Campo calculado: indica si el stock está bajo el mínimo
    is_low_stock: bool = False

    model_config = {"from_attributes": True}


# Schema para registrar uso de insumos en una reparación
class RepairInventoryCreate(BaseModel):
    item_id: int
    quantity: int

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v


class RepairInventoryResponse(BaseModel):
    id: int
    item_id: int
    quantity: int

    model_config = {"from_attributes": True}
