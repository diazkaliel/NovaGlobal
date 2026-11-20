from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


class ClientBase(BaseModel):
    name: str
    phone: str
    email: EmailStr | None = None
    rut: str | None = None
    city: str | None = None
    system: str = "nova"

    @field_validator("name", "phone", mode="before")
    @classmethod
    def strip_required_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", "rut", "city", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if isinstance(v, str):
            cleaned = v.strip()
            return cleaned if cleaned else None
        return v


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    rut: str | None = None
    city: str | None = None
    system: str | None = None

    @field_validator("email", "rut", "city", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if isinstance(v, str):
            cleaned = v.strip()
            return cleaned if cleaned else None
        return v



class ClientResponse(ClientBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}