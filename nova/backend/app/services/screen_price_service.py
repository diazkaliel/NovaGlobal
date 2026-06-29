from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.screen_price import ScreenPrice
from app.schemas.screen_price import ScreenPriceCreate, ScreenPriceUpdate


async def create_screen_price(db: AsyncSession, data: ScreenPriceCreate) -> ScreenPrice:
    """Crea un nuevo registro de precio de pantalla en la base de datos"""
    screen_price = ScreenPrice(**data.model_dump())
    db.add(screen_price)
    await db.commit()
    await db.refresh(screen_price)
    return screen_price


async def get_screen_prices(db: AsyncSession) -> list[ScreenPrice]:
    """Retorna la lista completa de precios de pantallas ordenados por marca y modelo"""
    query = select(ScreenPrice).order_by(ScreenPrice.brand, ScreenPrice.model)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_screen_price(db: AsyncSession, screen_price_id: int, data: ScreenPriceUpdate) -> ScreenPrice:
    """Actualiza un precio de pantalla existente"""
    query = select(ScreenPrice).where(ScreenPrice.id == screen_price_id)
    result = await db.execute(query)
    screen_price = result.scalar_one_or_none()
    if not screen_price:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Precio de pantalla no encontrado"
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(screen_price, field, value)
    await db.commit()
    await db.refresh(screen_price)
    return screen_price


async def delete_screen_price(db: AsyncSession, screen_price_id: int) -> None:
    """Elimina un precio de pantalla existente"""
    query = select(ScreenPrice).where(ScreenPrice.id == screen_price_id)
    result = await db.execute(query)
    screen_price = result.scalar_one_or_none()
    if not screen_price:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Precio de pantalla no encontrado"
        )
    await db.delete(screen_price)
    await db.commit()
