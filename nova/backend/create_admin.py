import asyncio
from getpass import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.database import SessionLocal
import app.models  # Registra las relaciones de los modelos antes de consultar.
from app.models.user import User
from app.schemas.user import UserCreate


async def main():
    email = input("Correo del administrador: ").strip()
    name = input("Nombre del administrador: ").strip()
    password = getpass("Contraseña: ")
    if not password or password != getpass("Repite la contraseña: "):
        print("Las contraseñas deben coincidir y tener contenido.")
        return
    data = UserCreate(name=name, email=email, password=password, role="admin")
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            print("Ya existe un usuario con ese correo.")
            return
        db.add(User(
            name=data.name,
            email=data.email,
            hashed_password=hash_password(data.password),
            role="admin",
            is_active=True,
        ))
        await db.commit()
        print("Administrador creado.")


if __name__ == "__main__":
    asyncio.run(main())
