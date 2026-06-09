from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.settings import settings


# El engine es la conexión al motor de base de datos
# pool_pre_ping=True verifica que la conexión siga viva antes de usarla
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.ENVIRONMENT == "development",  # muestra SQL en consola solo en dev
)

# SessionLocal es la fábrica de sesiones — cada request obtiene su propia sesión
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # evita que los objetos expiren al hacer commit
)


# Base es la clase padre de todos los modelos SQLAlchemy
class Base(DeclarativeBase):
    pass


# Dependencia de FastAPI: provee una sesión por request y la cierra al terminar
async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise