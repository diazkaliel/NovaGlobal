from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.brand_kit import BrandKit
from app.schemas.brand_kit import BrandKitCreate, BrandKitResponse

router = APIRouter(
    prefix="/api/bravo/brand-kits",
    tags=["brand-kits"]
)

@router.get("/client/{client_id}", response_model=List[BrandKitResponse])
async def get_client_brand_kits(client_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(BrandKit).where(BrandKit.client_id == client_id, BrandKit.system == "bravo")
    )
    return result.scalars().all()

@router.post("", response_model=BrandKitResponse, status_code=201)
async def create_brand_kit(payload: BrandKitCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validar si ya existe un Brand Kit con el mismo nombre para este cliente
    result = await db.execute(
        select(BrandKit).where(
            BrandKit.client_id == payload.client_id,
            BrandKit.brand_name == payload.brand_name,
            BrandKit.system == "bravo"
        )
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Ya existe una identidad de marca con este nombre para el cliente."
        )

    # Convertir sub-schemas a dict para guardarlos en JSONB
    new_kit = BrandKit(
        client_id=payload.client_id,
        brand_name=payload.brand_name,
        colors=[c.model_dump() for c in payload.colors],
        typographies=[t.model_dump() for t in payload.typographies],
        guidelines=payload.guidelines,
        system="bravo"
    )
    db.add(new_kit)
    await db.commit()
    await db.refresh(new_kit)
    return new_kit

@router.delete("/{id}", status_code=200)
async def delete_brand_kit(id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(BrandKit).where(BrandKit.id == id, BrandKit.system == "bravo")
    )
    kit = result.scalar_one_or_none()
    if not kit:
        raise HTTPException(status_code=404, detail="Identidad de marca no encontrada")
    await db.delete(kit)
    await db.commit()
    return {"status": "success", "detail": "Identidad de marca eliminada correctamente"}
