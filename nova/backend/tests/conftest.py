import asyncio
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.database import Base, get_db
from app.main import app
from app.core.settings import settings



@pytest.fixture(scope="function")
def engine():
    return create_async_engine(settings.DATABASE_URL, echo=False)

@pytest.fixture(scope="function")
async def db_session(engine):
    Session = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with Session() as session:
        yield session
        await session.rollback()

@pytest.fixture(scope="function")
def override_get_db(db_session):
    async def _get_db():
        yield db_session
    return _get_db

@pytest.fixture(scope="function")
async def client(override_get_db):
    from httpx import AsyncClient
    from httpx._transports.asgi import ASGITransport
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
