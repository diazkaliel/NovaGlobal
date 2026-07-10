from pydantic import BaseModel, EmailStr
from datetime import date
from decimal import Decimal

class PublicRepairHistoryResponse(BaseModel):
    new_status: str
    changed_at: str

    model_config = {"from_attributes": True}


class PublicRepairTrackResponse(BaseModel):
    order_number: str
    device_type: str
    brand: str
    model: str
    status: str
    reported_issue: str
    accessories: str | None = None
    estimated_delivery: date | None = None
    history: list[PublicRepairHistoryResponse] = []

    model_config = {"from_attributes": True}


class PublicRepairCreate(BaseModel):
    client_name: str
    client_phone: str
    client_email: EmailStr | None = None
    client_rut: str | None = None
    client_city: str | None = None
    device_type: str
    brand: str
    model: str
    reported_issue: str
    accessories: str | None = None


class PublicProductResponse(BaseModel):
    id: int
    name: str
    sale_price: Decimal
    image_url: str | None = None
    stock: int

    model_config = {"from_attributes": True}


class PublicOrderCreate(BaseModel):
    client_name: str
    client_phone: str
    client_email: EmailStr | None = None
    client_rut: str | None = None
    client_city: str | None = None
    # For Bravo, these represent design details (e.g., product type, colors, sizes, specs)
    device_type: str  # e.g., "Polera", "Tazón", "Gorra"
    brand: str        # e.g., "Personalizado", "Estampado"
    model: str        # e.g., "Algodón Premium XL", "Cerámica Negra"
    reported_issue: str  # Design details and description
    accessories: str | None = None  # Extra notes/instructions
    design_file_url: str | None = None
    mockup_file_url: str | None = None


class ReferencePriceItem(BaseModel):
    device: str
    service: str
    price: str
    time: str
    category: str


class FaqItem(BaseModel):
    q: str
    a: str


class WebConfigSchema(BaseModel):
    whatsapp: str
    phone: str
    email: str
    address: str
    reference_prices: list[ReferencePriceItem]
    faqs: list[FaqItem]
    system: str = "nova"


class PublicRepairCommentResponse(BaseModel):
    id: int
    sender: str
    author_name: str
    message: str
    created_at: str

    model_config = {"from_attributes": True}


class PublicRepairCommentCreate(BaseModel):
    order_number: str
    rut_or_phone: str
    message: str


class AdminRepairCommentCreate(BaseModel):
    message: str

class PublicProofApproveRequest(BaseModel):
    rut_or_phone: str

class PublicProofRejectRequest(BaseModel):
    rut_or_phone: str
    reason: str
