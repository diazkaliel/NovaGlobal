from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


async def create_client(db: AsyncSession, data: ClientCreate) -> Client:
    # Verificamos que el teléfono no esté registrado
    result = await db.execute(
        select(Client).where(Client.phone == data.phone)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El teléfono ya está registrado"
        )

    client = Client(**data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def get_client(db: AsyncSession, client_id: int) -> Client:
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    return client


async def get_clients(
    db: AsyncSession,
    search: str | None = None,
    skip: int = 0,
    limit: int = 20
) -> list[Client]:
    query = select(Client)

    # Búsqueda por nombre o teléfono
    if search:
        query = query.where(
            or_(
                Client.name.ilike(f"%{search}%"),
                Client.phone.ilike(f"%{search}%"),
            )
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_client(
    db: AsyncSession,
    client_id: int,
    data: ClientUpdate
) -> Client:
    client = await get_client(db, client_id)

    # model_dump(exclude_unset=True) solo actualiza los campos enviados
    # Si el usuario no envía un campo, no lo sobreescribimos con None
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client


async def delete_client(db: AsyncSession, client_id: int) -> None:
    client = await get_client(db, client_id)
    await db.delete(client)
    await db.commit()