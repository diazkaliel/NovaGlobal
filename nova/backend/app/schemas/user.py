from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    """Schema para autoregistro público. El rol y sistema son asignados por el servidor."""
    password: str


class UserAdminCreate(UserBase):
    """Schema para creación de usuarios por parte de un administrador."""
    password: str
    role: str = "technician"  # 'admin' o 'technician' ('trabajador')
    system: str = "nova"      # 'nova', 'bravo', o 'all' (admin)


class UserUpdate(BaseModel):
    """Schema para actualización de datos de usuario."""
    name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    system: str | None = None
    is_active: bool | None = None


class UserPasswordReset(BaseModel):
    """Schema para reseteo administrativo de contraseña."""
    new_password: str


class UserResponse(UserBase):
    """Schema de respuesta pública/autenticada sin datos sensibles."""
    id: int
    role: str
    system: str = "all"
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}