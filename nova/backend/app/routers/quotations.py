from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.quotation import QuotationCreate, QuotationUpdate, QuotationResponse
from app.services import quotation_service

router = APIRouter(prefix="/quotations", tags=["quotations"])


@router.get("", response_model=list[QuotationResponse])
@router.get("/", response_model=list[QuotationResponse], include_in_schema=False)
async def list_quotations(
    system: str = "bravo",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return await quotation_service.get_quotations(db, system=system)


@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_quotation(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return await quotation_service.create_quotation(db, data, created_by_id=current_user.id)


@router.get("/public/{quote_number}", response_model=QuotationResponse)
async def get_public_quotation(
    quote_number: str,
    db: AsyncSession = Depends(get_db)
):
    """Endpoint público (sin auth) para ver una cotización desde el portal del cliente."""
    q = await quotation_service.get_quotation_by_number(db, quote_number)
    # Solo mostrar cotizaciones enviadas o aceptadas/rechazadas públicamente
    if q.status not in ("enviada", "aceptada", "rechazada"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cotización no está disponible públicamente aún."
        )
    return q


@router.patch("/public/{quote_number}/status", response_model=QuotationResponse)
async def update_public_quotation_status(
    quote_number: str,
    new_status: str,
    db: AsyncSession = Depends(get_db)
):
    """Endpoint público para que el cliente acepte o rechace su cotización."""
    if new_status not in ("aceptada", "rechazada"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede aceptar o rechazar desde el portal del cliente."
        )
    return await quotation_service.update_quotation_status(db, quote_number, new_status)


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return await quotation_service.get_quotation(db, quotation_id)


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: int,
    data: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return await quotation_service.update_quotation(db, quotation_id, data)


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    await quotation_service.delete_quotation(db, quotation_id)
