from pydantic import BaseModel, EmailStr
from datetime import datetime


# Base: campos comunes a create y response
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "technician"


# Para crear un usuario — incluye contraseña en texto plano (solo en input)
class UserCreate(UserBase):
    password: str


# Para actualizar — todos los campos opcionales
class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None


# Lo que la API devuelve — NUNCA incluye hashed_password
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    # Esto le dice a Pydantic que puede leer desde objetos SQLAlchemy
    # no solo desde diccionarios
    model_config = {"from_attributes": True}