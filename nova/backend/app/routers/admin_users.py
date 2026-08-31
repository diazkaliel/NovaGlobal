from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.user import UserAdminCreate, UserUpdate, UserPasswordReset, UserResponse
from app.services import admin_user_service

router = APIRouter(prefix="/admin/users", tags=["admin_users"])


@router.get("", response_model=list[UserResponse])
@router.get("/", response_model=list[UserResponse])
async def get_users_list(
    role: str | None = Query(None, description="Filtrar por rol (admin / technician / all)"),
    system: str | None = Query(None, description="Filtrar por sistema (nova / bravo / all)"),
    is_active: bool | None = Query(None, description="Filtrar por estado activo"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """Lista todos los colaboradores registrados en el sistema (Exclusivo Administrador)."""
    return await admin_user_service.list_all_users(db, role=role, system=system, is_active=is_active)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserAdminCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """Crea un nuevo usuario con rol y tienda asignada por el administrador (Exclusivo Administrador)."""
    return await admin_user_service.create_user_by_admin(db, data)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """Actualiza datos, rol, tienda asignada o estado activo de un colaborador (Exclusivo Administrador)."""
    return await admin_user_service.update_user_by_admin(db, user_id, data)


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    data: UserPasswordReset,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    """Restablece la contraseña de acceso de un colaborador (Exclusivo Administrador)."""
    return await admin_user_service.reset_user_password_by_admin(db, user_id, data)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Elimina permanentemente una cuenta de usuario (Exclusivo Administrador)."""
    return await admin_user_service.delete_user_by_admin(db, user_id, current_admin.id)
