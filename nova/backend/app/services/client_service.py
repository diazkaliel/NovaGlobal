from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


async def create_client(db: AsyncSession, data: ClientCreate) -> Client:
    # Aislamiento por tienda: la unicidad de teléfono y RUT se valida dentro del mismo sistema
    target_system = data.system or "nova"

    result = await db.execute(
        select(Client).where(Client.phone == data.phone, Client.system == target_system)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El teléfono ya está registrado en el sistema {target_system}"
        )

    if data.email:
        result = await db.execute(
            select(Client).where(Client.email == data.email, Client.system == target_system)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El email ya está registrado en el sistema {target_system}"
            )

    if data.rut:
        result = await db.execute(
            select(Client).where(Client.rut == data.rut, Client.system == target_system)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El RUT ya está registrado en el sistema {target_system}"
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
    system: str | None = None,
    skip: int = 0,
    limit: int = 20
) -> list[Client]:
    query = select(Client)

    # Filtrado directo y eficiente por sistema indexado
    if system and system != "all":
        query = query.where(Client.system == system)

    if search:
        query = query.where(
            or_(
                Client.name.ilike(f"%{search}%"),
                Client.phone.ilike(f"%{search}%"),
                Client.rut.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(Client.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_client(
    db: AsyncSession,
    client_id: int,
    data: ClientUpdate
) -> Client:
    client = await get_client(db, client_id)
    update_data = data.model_dump(exclude_unset=True)

    # Si se intenta modificar el teléfono, validar duplicados en el mismo sistema del cliente
    new_phone = update_data.get("phone")
    if new_phone and new_phone != client.phone:
        dup = await db.execute(
            select(Client).where(Client.phone == new_phone, Client.system == client.system, Client.id != client.id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El teléfono ya está en uso por otro cliente en {client.system}"
            )

    for field, value in update_data.items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client


async def delete_client(db: AsyncSession, client_id: int) -> None:
    client = await get_client(db, client_id)
    await db.delete(client)
    await db.commit()