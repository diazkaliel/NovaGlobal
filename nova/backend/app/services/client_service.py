from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status

from app.models.repair import Repair
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


async def resolve_or_create_client_in_tx(
    db: AsyncSession,
    data: ClientCreate,
    target_system: str,
) -> Client:
    """
    Busca un cliente existente dentro de la misma tienda (por teléfono, RUT o email)
    para reutilizar su ficha al ingresar una orden sin provocar errores de duplicado.
    Si no existe, lo crea dentro de la transacción activa (flush).
    """
    phone_val = (data.phone or "").strip()
    rut_val = (data.rut or "").strip() or None
    email_val = (data.email or "").strip() or None
    city_val = (data.city or "").strip() or None
    name_val = (data.name or "").strip()

    existing: Client | None = None

    if phone_val:
        res = await db.execute(
            select(Client).where(Client.phone == phone_val, Client.system == target_system)
        )
        existing = res.scalar_one_or_none()

    if existing is None and rut_val:
        res = await db.execute(
            select(Client).where(Client.rut == rut_val, Client.system == target_system)
        )
        existing = res.scalar_one_or_none()

    if existing is None and email_val:
        res = await db.execute(
            select(Client).where(Client.email == email_val, Client.system == target_system)
        )
        existing = res.scalar_one_or_none()

    if existing is not None:
        if name_val and not existing.name:
            existing.name = name_val
        if rut_val and not existing.rut:
            existing.rut = rut_val
        if email_val and not existing.email:
            existing.email = email_val
        if city_val and not existing.city:
            existing.city = city_val
        db.add(existing)
        await db.flush()
        return existing

    client = Client(
        name=name_val,
        phone=phone_val,
        email=email_val,
        rut=rut_val,
        city=city_val,
        system=target_system,
    )
    db.add(client)
    await db.flush()
    return client


async def create_client(
    db: AsyncSession,
    data: ClientCreate,
    *,
    reuse_existing: bool = False,
) -> Client:
    # Aislamiento por tienda: la unicidad de teléfono y RUT se valida dentro del mismo sistema
    target_system = data.system or "nova"

    if reuse_existing:
        client = await resolve_or_create_client_in_tx(db, data, target_system)
        await db.commit()
        await db.refresh(client)
        return client

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

    dump = data.model_dump()
    dump["system"] = target_system
    client = Client(**dump)
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
    if system == "bravo":
        bravo_order = select(Repair.id).where(Repair.client_id == Client.id, Repair.system == "bravo").exists()
        other_order = select(Repair.id).where(Repair.client_id == Client.id, Repair.system != "bravo").exists()
        query = query.where(or_(Client.system == "bravo", bravo_order & ~other_order))
    elif system and system != "all":
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
