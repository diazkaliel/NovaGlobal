from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal


class UsedItemInput(BaseModel):
    item_id: int
    quantity: float = 1.0


class BravoOrderBase(BaseModel):
    client_id: int
    technician_id: int | None = None
    item_category: str = Field(..., description="Categoría textil: polera, poleron, tazon, jockey, etc.")
    brand: str = "Personalizado"
    model: str = "Estandar"
    garment_color: str | None = None
    garment_size: str | None = None
    quantity: int = 1
    reported_issue: str = Field(..., description="Descripción del trabajo y diseño solicitado")
    accessories: str | None = None

    print_technique: str | None = None
    print_location: str | None = None
    print_dimensions: str | None = None
    design_file_url: str | None = None
    mockup_file_url: str | None = None

    estimated_delivery: date | None = None
    order_cost: float = 0.0
    deposit: float = 0.0
    deposit_payment_method: str | None = None
    final_payment_method: str | None = None


class BravoOrderCreate(BravoOrderBase):
    used_items: list[UsedItemInput] = []


class BravoOrderUpdate(BaseModel):
    technician_id: int | None = None
    item_category: str | None = None
    brand: str | None = None
    model: str | None = None
    garment_color: str | None = None
    garment_size: str | None = None
    quantity: int | None = None
    reported_issue: str | None = None
    accessories: str | None = None
    print_technique: str | None = None
    print_location: str | None = None
    print_dimensions: str | None = None
    design_file_url: str | None = None
    mockup_file_url: str | None = None
    estimated_delivery: date | None = None
    order_cost: float | None = None
    deposit: float | None = None
    deposit_payment_method: str | None = None
    final_payment_method: str | None = None


class BravoOrderStatusUpdate(BaseModel):
    new_status: str
    note: str | None = None


class BravoOrderHistoryResponse(BaseModel):
    id: int
    previous_status: str | None
    new_status: str
    note: str | None
    changed_by_id: int | None
    changed_at: str

    model_config = {"from_attributes": True}


class BravoClientNested(BaseModel):
    id: int
    name: str
    phone: str
    email: str | None = None
    rut: str | None = None
    city: str | None = None

    model_config = {"from_attributes": True}


class BravoOrderListResponse(BaseModel):
    id: int
    order_number: str
    client_id: int
    client: BravoClientNested | None = None
    item_category: str
    brand: str
    model: str
    quantity: int
    garment_color: str | None
    garment_size: str | None
    print_technique: str | None
    print_location: str | None
    status: str
    estimated_delivery: date | None
    order_cost: float
    deposit: float
    created_at: datetime

    model_config = {"from_attributes": True}


class BravoOrderResponse(BravoOrderBase):
    id: int
    order_number: str
    status: str
    is_split_child: bool
    parent_order_id: int | None
    created_at: datetime
    updated_at: datetime
    client: BravoClientNested | None = None
    history: list[BravoOrderHistoryResponse] = []

    model_config = {"from_attributes": True}
