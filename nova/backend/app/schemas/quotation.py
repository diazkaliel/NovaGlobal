from pydantic import BaseModel, field_validator
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Any
from app.schemas.client import ClientResponse


class QuotationItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: Decimal
    inventory_item_id: Optional[int] = None

    @field_validator("inventory_item_id", mode="before")
    @classmethod
    def empty_str_to_none_item(cls, v: Any):
        if v == "" or v is None:
            return None
        return v


class QuotationItemResponse(BaseModel):
    id: int
    description: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    inventory_item_id: Optional[int] = None

    model_config = {"from_attributes": True}


class QuotationCreate(BaseModel):
    system: str = "bravo"
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    discount: Decimal = Decimal("0.00")
    items: list[QuotationItemCreate]

    @field_validator("client_id", "valid_until", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any):
        if v == "" or v is None:
            return None
        return v

    @field_validator("discount", mode="before")
    @classmethod
    def empty_str_to_zero(cls, v: Any):
        if v == "" or v is None:
            return Decimal("0.00")
        return v


class QuotationUpdate(BaseModel):
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    discount: Optional[Decimal] = None
    status: Optional[str] = None
    items: Optional[list[QuotationItemCreate]] = None

    @field_validator("client_id", "valid_until", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any):
        if v == "" or v is None:
            return None
        return v

    @field_validator("discount", mode="before")
    @classmethod
    def empty_str_to_zero(cls, v: Any):
        if v == "" or v is None:
            return None
        return v


class QuotationResponse(BaseModel):
    id: int
    system: str
    quote_number: str
    client_id: Optional[int] = None
    client: Optional[ClientResponse] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: str
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    items: list[QuotationItemResponse] = []
    created_at: datetime
    created_by_id: Optional[int] = None

    model_config = {"from_attributes": True}
