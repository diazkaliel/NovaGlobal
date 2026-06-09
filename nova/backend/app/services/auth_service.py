from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.user import UserCreate
from app.schemas.auth import TokenResponse
from app.core.security import hash_password, verify_password, create_token


async def register_user(db: AsyncSession, data: UserCreate) -> User:
    """Crea un nuevo usuario verificando que el email no exista"""

    # Verificamos que el email no esté registrado
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login_user(db: AsyncSession, email: str, password: str) -> TokenResponse:
    """Verifica credenciales y retorna tokens JWT"""

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Usamos el mismo mensaje para email y contraseña incorrectos
    # — no queremos revelar si el email existe o no
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )

    access_token = create_token({"sub": str(user.id)}, "access")
    refresh_token = create_token({"sub": str(user.id)}, "refresh")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )