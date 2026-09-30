import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.product_3d import Product3DModel, CustomizationSession
from app.schemas.product_3d import (
    Product3DModelResponse,
    PricingQuoteRequest,
    PricingQuoteBreakdown,
    CustomizationSessionCreate,
    CustomizationSessionResponse,
)
from app.services.pricing_engine import calculate_customization_quote

router = APIRouter(prefix="/api/3d", tags=["Personalizador 3D"])

# Catálogo por defecto para inicialización si la tabla está vacía
CATALOG_DEFAULTS = [
    {
        "name": "Polera Premium Algodón",
        "sku": "POL-PREM-01",
        "procedural_type": "t_shirt",
        "base_color_hex": "#ffffff",
        "available_colors": [
            {"name": "Blanco Puro", "hex": "#ffffff"},
            {"name": "Negro Profundo", "hex": "#18181b"},
            {"name": "Azul Marino", "hex": "#1e293b"},
            {"name": "Rojo Carmesí", "hex": "#991b1b"},
            {"name": "Verde Militar", "hex": "#2e3b2e"},
        ],
        "print_zones": [
            {
                "id": "front",
                "name": "Pecho / Frente",
                "max_width_cm": 32.0,
                "max_height_cm": 40.0,
                "allowed_techniques": ["dtf", "sublimacion", "vinilo"],
            }
        ],
        "camera_presets": {},
        "base_price": Decimal("8990.00"),
    },
    {
        "name": "Tazón Cerámico 11oz",
        "sku": "TAZ-CER-11",
        "procedural_type": "mug",
        "base_color_hex": "#ffffff",
        "available_colors": [
            {"name": "Blanco Gloss", "hex": "#ffffff"},
            {"name": "Negro Mágico", "hex": "#1f1f1f"},
        ],
        "print_zones": [
            {
                "id": "front",
                "name": "Cuerpo Cilíndrico",
                "max_width_cm": 20.0,
                "max_height_cm": 9.5,
                "allowed_techniques": ["sublimacion"],
            }
        ],
        "camera_presets": {},
        "base_price": Decimal("4990.00"),
    },
    {
        "name": "Termo Inox 500ml",
        "sku": "TER-INOX-500",
        "procedural_type": "bottle",
        "base_color_hex": "#d0d4d9",
        "available_colors": [
            {"name": "Acero Inox", "hex": "#d0d4d9"},
            {"name": "Negro Mate", "hex": "#1c1c1c"},
        ],
        "print_zones": [
            {
                "id": "front",
                "name": "Cuerpo Lateral",
                "max_width_cm": 14.0,
                "max_height_cm": 18.0,
                "allowed_techniques": ["sublimacion", "vinilo"],
            }
        ],
        "camera_presets": {},
        "base_price": Decimal("12990.00"),
    },
]


@router.post("/quote", response_model=PricingQuoteBreakdown)
async def get_reactive_quote(
    payload: PricingQuoteRequest,
    db: AsyncSession = Depends(get_db)
):
    """Calcula la cotización reactiva en tiempo real según técnica, área de estampa y volumen."""
    stmt = select(Product3DModel).where(Product3DModel.id == payload.product_3d_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    base_price = product.base_price if product else Decimal("8990.00")

    max_w = Decimal("32.0")
    max_h = Decimal("40.0")
    if product and product.print_zones:
        zone = product.print_zones[0]
        max_w = Decimal(str(zone.get("max_width_cm", 32.0)))
        max_h = Decimal(str(zone.get("max_height_cm", 40.0)))

    return calculate_customization_quote(
        base_product_price=base_price,
        decals=payload.decals,
        technique=payload.technique,
        quantity=payload.quantity,
        zone_max_width_cm=max_w,
        zone_max_height_cm=max_h,
    )


@router.get("/models", response_model=List[Product3DModelResponse])
async def list_3d_models(db: AsyncSession = Depends(get_db)):
    """Lista todos los modelos 3D disponibles en el catálogo."""
    stmt = select(Product3DModel)
    result = await db.execute(stmt)
    items = result.scalars().all()

    # Si aún no existen registros, creamos los modelos por defecto automáticamente
    if not items:
        for cat in CATALOG_DEFAULTS:
            model_obj = Product3DModel(**cat)
            db.add(model_obj)
        await db.commit()
        refreshed = await db.execute(select(Product3DModel))
        items = refreshed.scalars().all()

    return items


@router.get("/models/{model_id}", response_model=Product3DModelResponse)
async def get_3d_model(model_id: int, db: AsyncSession = Depends(get_db)):
    """Obtiene la configuración y zonas de un modelo 3D específico."""
    stmt = select(Product3DModel).where(Product3DModel.id == model_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modelo 3D no encontrado"
        )
    return product


@router.post("/sessions", response_model=CustomizationSessionResponse, status_code=status.HTTP_201_CREATED)
async def save_customization_session(
    payload: CustomizationSessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Persiste la sesión completa de personalización 3D para pasarela o generación de orden."""
    stmt = select(Product3DModel).where(Product3DModel.id == payload.product_3d_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    base_price = product.base_price if product else Decimal("8990.00")

    quote = calculate_customization_quote(
        base_product_price=base_price,
        decals=payload.decals,
        technique=payload.technique,
        quantity=payload.quantity,
    )

    session_token = f"3D-{uuid.uuid4().hex[:10].upper()}"

    session = CustomizationSession(
        session_token=session_token,
        product_3d_id=payload.product_3d_id,
        selected_color_hex=payload.selected_color_hex,
        technique=payload.technique,
        decals_config=[d.model_dump(mode="json") for d in payload.decals],
        pricing_breakdown=quote.model_dump(mode="json"),
        total_price=quote.final_total,

        preview_image_url=payload.preview_image_url,
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return CustomizationSessionResponse(
        id=session.id,
        session_token=session.session_token,
        product_3d_id=session.product_3d_id,
        selected_color_hex=session.selected_color_hex,
        decals=payload.decals,
        technique=session.technique,
        quantity=session.quantity,
        pricing=quote,
        preview_image_url=session.preview_image_url,
    )


@router.get("/sessions/{token}", response_model=CustomizationSessionResponse)
async def get_customization_session(token: str, db: AsyncSession = Depends(get_db)):
    """Recupera una sesión 3D guardada por su token único."""
    stmt = select(CustomizationSession).where(CustomizationSession.session_token == token)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de diseño no encontrada"
        )

    return CustomizationSessionResponse(
        id=session.id,
        session_token=session.session_token,
        product_3d_id=session.product_3d_id,
        selected_color_hex=session.selected_color_hex,
        decals=session.decals_config,
        technique=session.technique,
        quantity=session.quantity,
        pricing=session.pricing_breakdown,
        preview_image_url=session.preview_image_url,
    )
