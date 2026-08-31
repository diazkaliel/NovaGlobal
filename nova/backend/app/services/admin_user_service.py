from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.user import UserAdminCreate, UserUpdate, UserPasswordReset, UserResponse
from app.core.security import hash_password


async def list_all_users(
    db: AsyncSession,
    role: str | None = None,
    system: str | None = None,
    is_active: bool | None = None
) -> list[UserResponse]:
    """Lista todos los colaboradores registrados en el sistema con filtros opcionales."""
    stmt = select(User).order_by(desc(User.created_at))

    if role and role != "all":
        stmt = stmt.where(User.role == role)
    if system and system != "all":
        stmt = stmt.where(User.system == system)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    result = await db.execute(stmt)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


async def create_user_by_admin(db: AsyncSession, data: UserAdminCreate) -> UserResponse:
    """Crea un nuevo usuario con rol y tienda asignada por el administrador."""
    # Verificar si el email ya existe
    result = await db.execute(select(User).where(User.email == data.email.strip().lower()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )

    # Validar rol
    valid_roles = ["admin", "technician", "trabajador"]
    role = data.role.strip().lower()
    if role == "trabajador":
        role = "technician"  # Normalizar

    if role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol no válido. Opciones permitidas: 'admin', 'technician' ('trabajador')."
        )

    # Validar tienda / sistema
    valid_systems = ["nova", "bravo", "all"]
    user_system = getattr(data, "system", "nova")
    if not user_system:
        user_system = "all" if role == "admin" else "nova"
    user_system = user_system.strip().lower()
    if user_system not in valid_systems:
        user_system = "nova"

    # Si es admin, por defecto tiene acceso global 'all' a menos que se especifique otra cosa
    if role == "admin" and user_system == "nova":
        user_system = "all"

    user = User(
        name=data.name.strip(),
        email=data.email.strip().lower(),
        hashed_password=hash_password(data.password),
        role=role,
        system=user_system,
        is_active=True
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


async def update_user_by_admin(
    db: AsyncSession,
    user_id: int,
    data: UserUpdate
) -> UserResponse:
    """Actualiza datos, rol, tienda asignada o estado activo de un usuario."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    if data.name is not None:
        user.name = data.name.strip()
    if data.email is not None:
        email = data.email.strip().lower()
        # Verificar que no colisione con otro usuario
        check = await db.execute(select(User).where(User.email == email, User.id != user_id))
        if check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nuevo correo ya está en uso por otro usuario."
            )
        user.email = email
    if data.role is not None:
        role = data.role.strip().lower()
        if role == "trabajador":
            role = "technician"
        user.role = role
    if data.system is not None:
        sys_val = data.system.strip().lower()
        if sys_val in ("nova", "bravo", "all"):
            user.system = sys_val
    if data.is_active is not None:
        user.is_active = data.is_active

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


async def reset_user_password_by_admin(
    db: AsyncSession,
    user_id: int,
    data: UserPasswordReset
) -> dict:
    """Restablece la contraseña de un usuario."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres."
        )

    user.hashed_password = hash_password(data.new_password)
    await db.commit()

    return {"status": "success", "message": f"Contraseña actualizada exitosamente para {user.email}."}


async def delete_user_by_admin(db: AsyncSession, user_id: int, current_admin_id: int) -> dict:
    """Elimina o desactiva un usuario. No permite auto-eliminación del administrador."""
    if user_id == current_admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta de administrador."
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    await db.delete(user)
    await db.commit()
    return {"status": "success", "message": f"Usuario {user.email} eliminado del sistema."}
