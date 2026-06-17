from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal
from app.schemas.client import ClientResponse


class RepairHistoryResponse(BaseModel):
    id: int
    previous_status: str | None
    new_status: str
    note: str | None
    changed_by_id: int | None
    changed_at: str

    model_config = {"from_attributes": True}


class RepairBase(BaseModel):
    device_type: str
    brand: str
    model: str
    reported_issue: str
    accessories: str | None = None


class RepairCreate(RepairBase):
    client_id: int
    technician_id: int | None = None
    device_password: str | None = None
    estimated_delivery: date | None = None
    repair_cost: Decimal | None = None
    deposit: Decimal | None = None


class RepairUpdate(BaseModel):
    device_type: str | None = None
    brand: str | None = None
    model: str | None = None
    technician_id: int | None = None
    reported_issue: str | None = None
    accessories: str | None = None
    device_password: str | None = None
    estimated_delivery: date | None = None
    repair_cost: Decimal | None = None
    deposit: Decimal | None = None


class RepairStatusUpdate(BaseModel):
    new_status: str
    note: str | None = None


class RepairResponse(RepairBase):
    id: int
    order_number: str
    client_id: int
    client: ClientResponse | None = None
    technician_id: int | None
    status: str
    estimated_delivery: date | None
    repair_cost: Decimal | None
    deposit: Decimal | None
    created_at: datetime
    history: list[RepairHistoryResponse] = []

    model_config = {"from_attributes": True}


class RepairListResponse(RepairBase):
    id: int
    order_number: str
    status: str
    client_id: int
    client: ClientResponse | None = None
    estimated_delivery: date | None
    repair_cost: Decimal | None
    deposit: Decimal | None
    created_at: datetime

    model_config = {"from_attributes": True}