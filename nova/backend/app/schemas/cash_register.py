from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from app.schemas.user import UserResponse


class CashRegisterTransactionBase(BaseModel):
    transaction_type: str  # ingreso, egreso
    amount: Decimal
    description: str
    payment_method: str  # efectivo, transferencia, debito, credito


class CashRegisterTransactionCreate(CashRegisterTransactionBase):
    pass


class CashRegisterTransactionResponse(CashRegisterTransactionBase):
    id: int
    session_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CashRegisterSessionBase(BaseModel):
    system: str = "nova"
    initial_balance: Decimal = Decimal("0.00")


class CashRegisterSessionCreate(CashRegisterSessionBase):
    pass


class CashRegisterSessionClose(BaseModel):
    actual_balance: Decimal


class CashRegisterSessionResponse(CashRegisterSessionBase):
    id: int
    opened_at: datetime
    closed_at: datetime | None = None
    opened_by_id: int
    opened_by: UserResponse
    closed_by_id: int | None = None
    closed_by: UserResponse | None = None
    expected_balance: Decimal
    actual_balance: Decimal | None = None
    status: str
    transactions: list[CashRegisterTransactionResponse] = []

    model_config = {"from_attributes": True}


class CashRegisterStatusResponse(BaseModel):
    is_open: bool
    current_session: CashRegisterSessionResponse | None = None
