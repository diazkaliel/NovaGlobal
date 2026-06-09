from datetime import datetime, timedelta, timezone
from typing import Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.settings import settings

# Contexto de hashing — bcrypt es el algoritmo estándar para contraseñas
# "deprecated='auto'" actualiza automáticamente hashes viejos
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Convierte una contraseña en texto plano a un hash seguro"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con su hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_token(
    data: dict,
    token_type: Literal["access", "refresh"]
) -> str:
    """
    Genera un JWT firmado con SECRET_KEY.
    El token contiene el user_id y expira según el tipo.
    """
    to_encode = data.copy()

    if token_type == "access":
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode.update({
        "exp": expire,
        "type": token_type
    })

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decodifica y verifica un JWT.
    Lanza JWTError si el token es inválido o expiró.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])