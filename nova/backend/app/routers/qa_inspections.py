from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.qa_inspection import QAInspection
from app.schemas.qa_inspection import QAInspectionCreate, QAInspectionResponse

router = APIRouter(
    prefix="/api/bravo/qa",
    tags=["qa-inspections"]
)

@router.get("/order/{order_id}", response_model=QAInspectionResponse)
async def get_qa_inspection(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(QAInspection).where(QAInspection.order_id == order_id, QAInspection.system == "bravo")
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="No se encontró registro de control de calidad para este pedido.")
    return ins

@router.post("/inspect", response_model=QAInspectionResponse, status_code=201)
async def create_qa_inspection(payload: QAInspectionCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validar si ya existe
    result = await db.execute(
        select(QAInspection).where(QAInspection.order_id == payload.order_id, QAInspection.system == "bravo")
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Actualizar datos existentes
        existing.operator_id = current_user.id
        existing.checklist_results = payload.checklist_results
        existing.passed = payload.passed
        existing.comments = payload.comments
        await db.commit()
        await db.refresh(existing)
        return existing

    new_ins = QAInspection(
        order_id=payload.order_id,
        operator_id=current_user.id,
        checklist_results=payload.checklist_results,
        passed=payload.passed,
        comments=payload.comments,
        system="bravo"
    )
    db.add(new_ins)
    await db.commit()
    await db.refresh(new_ins)
    return new_ins
