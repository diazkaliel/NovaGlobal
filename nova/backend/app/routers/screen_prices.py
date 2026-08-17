from fastapi import APIRouter, Depends, UploadFile, File, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.screen_price import (
    ScreenPriceCreate,
    ScreenPriceResponse,
    ScreenPriceUpdate,
    ScreenPriceBulkUploadResponse
)
from app.services.screen_price_service import (
    create_screen_price,
    get_screen_prices,
    update_screen_price,
    delete_screen_price,
    bulk_import_screen_prices,
    generate_screen_prices_template_csv
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


@router.get("/template-csv")
async def get_template(
    current_user: User = Depends(get_current_user)
):
    """Descarga una plantilla CSV de ejemplo para la carga masiva de pantallas"""
    csv_content = generate_screen_prices_template_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=plantilla_pantallas_nova.csv"
        }
    )


@router.post("/bulk-upload", response_model=ScreenPriceBulkUploadResponse)
async def upload_bulk(
    file: UploadFile = File(...),
    default_margin: float = Form(100.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Importa masivamente precios de pantallas desde un archivo Excel (.xlsx) o CSV (.csv).
    Aplica lógica Upsert (actualiza si ya existe marca/modelo/calidad, o crea si es nuevo).
    Si el archivo no trae 'precio_venta', lo calcula automáticamente con base en 'default_margin'.
    """
    content = await file.read()
    return await bulk_import_screen_prices(
        db,
        content,
        file.filename or "archivo.csv",
        default_margin_percent=default_margin
    )



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

