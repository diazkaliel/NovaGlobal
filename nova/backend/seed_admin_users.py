import asyncio
import sys
sys.path.insert(0, '.')

from passlib.context import CryptContext
from sqlalchemy import select
from app.db.database import SessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_USERS = [
    ("Admin Nova", "admin@nova.com", "admin123", "admin"),
    ("Admin Bravo", "admin@personalizacionesbravo.com", "admin123", "admin"),
    ("Diaz Kaliel", "diazkaliel27@gmail.com", "Kal12190327.", "admin"),
]


async def seed_users():
    async with SessionLocal() as db:
        for name, email, password, role in ADMIN_USERS:
            res = await db.execute(select(User).where(User.email == email))
            existing = res.scalar_one_or_none()
            if existing:
                existing.hashed_password = pwd_context.hash(password)
                existing.role = role
                existing.is_active = True
                print(f"Updated user and password for {email} (role: {role})")
            else:
                user = User(
                    name=name,
                    email=email,
                    hashed_password=pwd_context.hash(password),
                    role=role,
                    is_active=True
                )
                db.add(user)
                print(f"Created user {email} (role: {role})")
        await db.commit()
        print("Admin users synchronized successfully.")


if __name__ == "__main__":
    asyncio.run(seed_users())
