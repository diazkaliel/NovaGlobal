from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from app.schemas.client import ClientResponse


class QuotationItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: Decimal
    inventory_item_id: Optional[int] = None


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
