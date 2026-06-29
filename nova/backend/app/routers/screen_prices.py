from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.screen_price import ScreenPriceCreate, ScreenPriceResponse, ScreenPriceUpdate
from app.services.screen_price_service import (
    create_screen_price, get_screen_prices,
    update_screen_price, delete_screen_price
)

router = APIRouter(prefix="/screen-prices", tags=["screen-prices"])


@router.post("/", response_model=ScreenPriceResponse, status_code=201)
async def create(
    data: ScreenPriceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un nuevo precio de pantalla"""
    return await create_screen_price(db, data)


@router.get("/", response_model=list[ScreenPriceResponse])
async def list_prices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna la lista de todos los precios de pantallas"""
    return await get_screen_prices(db)


@router.put("/{screen_price_id}", response_model=ScreenPriceResponse)
async def update(
    screen_price_id: int,
    data: ScreenPriceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza un precio de pantalla existente"""
    return await update_screen_price(db, screen_price_id, data)


@router.delete("/{screen_price_id}", status_code=204)
async def delete(
    screen_price_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina un precio de pantalla existente"""
    await delete_screen_price(db, screen_price_id)
