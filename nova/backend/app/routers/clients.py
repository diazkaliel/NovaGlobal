from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.services.client_service import (
    create_client, get_client, get_clients,
    update_client, delete_client
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("/", response_model=ClientResponse, status_code=201)
async def create(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # endpoint protegido
):
    return await create_client(db, data)


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    search: str | None = Query(None, description="Buscar por nombre o teléfono"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_clients(db, search, skip, limit)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_one(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_client(db, client_id)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await update_client(db, client_id, data)


@router.delete("/{client_id}", status_code=204)
async def delete(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await delete_client(db, client_id)