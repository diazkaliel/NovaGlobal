from pydantic import BaseModel, EmailStr
from datetime import datetime


class ClientBase(BaseModel):
    name: str
    phone: str
    email: EmailStr | None = None
    address: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None


class ClientResponse(ClientBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}