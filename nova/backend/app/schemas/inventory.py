from pydantic import BaseModel, field_validator
from datetime import datetime
from decimal import Decimal


class InventoryItemBase(BaseModel):
    name: str
    category: str  # insumo | mercancia
    stock: int = 0
    min_stock: int = 5
    cost_price: Decimal
    sale_price: Decimal

    # Validamos que la categoría sea una de las permitidas
    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {"insumo", "mercancia"}
        if v not in allowed:
            raise ValueError(f"Categoría debe ser una de: {allowed}")
        return v

    # Validamos que el precio de venta no sea menor al de costo
    @field_validator("sale_price")
    @classmethod
    def validate_sale_price(cls, v: Decimal, info) -> Decimal:
        cost = info.data.get("cost_price")
        if cost is not None and v < cost:
            raise ValueError("El precio de venta no puede ser menor al precio de costo")
        return v


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    stock: int | None = None
    min_stock: int | None = None
    cost_price: Decimal | None = None
    sale_price: Decimal | None = None


class InventoryItemResponse(InventoryItemBase):
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