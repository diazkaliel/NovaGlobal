from pydantic import BaseModel, field_validator
from datetime import datetime
from decimal import Decimal


class ScreenPriceBase(BaseModel):
    brand: str
    model: str
    cost_price: Decimal
    sale_price: Decimal

    # Validamos que el precio de venta no sea menor al de costo
    @field_validator("sale_price")
    @classmethod
    def validate_sale_price(cls, v: Decimal, info) -> Decimal:
        cost = info.data.get("cost_price")
        if cost is not None and v < cost:
            raise ValueError("El precio de venta al cliente no puede ser menor al precio de costo")
        return v


class ScreenPriceCreate(ScreenPriceBase):
    pass


class ScreenPriceUpdate(ScreenPriceBase):
    pass


class ScreenPriceResponse(ScreenPriceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
