import asyncio
from sqlalchemy import select
from passlib.context import CryptContext
from app.db.database import SessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    async with SessionLocal() as db:
        # 1. Verificamos si el usuario ya existe para no duplicarlo
        result = await db.execute(select(User).where(User.email == "admin@nova.com"))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("El usuario 'admin@nova.com' ya existe en la base de datos.")
            return
            
        # 2. Creamos el nuevo usuario administrador
        new_user = User(
            name="Admin de Pruebas",
            email="admin@nova.com",
            hashed_password=pwd_context.hash("admin123"), # Encriptamos la contraseña
            role="admin",
            is_active=True
        )
        
        # 3. Guardamos en la base de datos
        db.add(new_user)
        await db.commit()
        print("¡Usuario de prueba creado exitosamente!")
        print("Email: admin@nova.com")
        print("Contraseña: admin123")

if __name__ == "__main__":
    asyncio.run(main())