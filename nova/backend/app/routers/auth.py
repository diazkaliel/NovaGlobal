from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserAdminCreate, UserResponse
from app.services.auth_service import register_user, login_user, create_user_by_admin
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/register/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Autoregistro de nuevo usuario (rol fijado a técnico por seguridad)."""
    return await register_user(db, data)


@router.post("/admin/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/admin/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_user_as_admin(
    data: UserAdminCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """Creación de usuarios con roles específicos (exclusivo para administradores)."""
    return await create_user_by_admin(db, data)


@router.post("/login", response_model=TokenResponse)
@router.post("/login/", response_model=TokenResponse, include_in_schema=False)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Inicio de sesión con emisión de JWT."""
    return await login_user(db, data.email, data.password)


@router.get("/me", response_model=UserResponse)
@router.get("/me/", response_model=UserResponse, include_in_schema=False)
async def me(current_user: User = Depends(get_current_user)):
    """Retorna el perfil del usuario autenticado."""
    return current_user