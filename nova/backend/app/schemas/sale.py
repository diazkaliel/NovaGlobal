from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from app.schemas.client import ClientResponse
from app.schemas.inventory import InventoryItemResponse


class SaleItemBase(BaseModel):
    item_id: int | None = None
    service_name: str | None = None
    quantity: int = 1
    unit_price: Decimal


class SaleItemCreate(SaleItemBase):
    pass


class SaleItemResponse(SaleItemBase):
    id: int
    sale_id: int
    item: InventoryItemResponse | None = None

    model_config = {"from_attributes": True}


class SaleBase(BaseModel):
    system: str = "nova"
    payment_method: str  # efectivo, transferencia, debito, credito
    sale_type: str = "directa"  # directa, servicio
    reference_id: int | None = None


class SaleCreate(SaleBase):
    client_id: int | None = None
    items: list[SaleItemCreate]


class SaleResponse(SaleBase):
    id: int
    client_id: int | None
    client: ClientResponse | None = None
    total_amount: Decimal
    created_at: datetime
    items: list[SaleItemResponse] = []

    model_config = {"from_attributes": True}


# Esquemas para estadísticas de ventas
class PaymentMethodStat(BaseModel):
    method: str
    count: int
    total: Decimal


class DailyRevenue(BaseModel):
    date: str
    total: Decimal


class SaleStatsResponse(BaseModel):
    total_revenue: Decimal
    sales_count: int
    average_ticket: Decimal
    by_payment_method: list[PaymentMethodStat]
    daily_revenue: list[DailyRevenue]
