from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from decimal import Decimal

from app.models.quotation import Quotation, QuotationItem
from app.schemas.quotation import QuotationCreate, QuotationUpdate


async def _generate_quote_number(db: AsyncSession) -> str:
    result = await db.execute(select(func.count()).select_from(Quotation))
    count = result.scalar() or 0
    return f"COT-{(count + 1):05d}"


async def _load_quotation(db: AsyncSession, quotation_id: int) -> Quotation:
    result = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.client),
            selectinload(Quotation.items)
        )
        .where(Quotation.id == quotation_id)
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    return q


async def create_quotation(db: AsyncSession, data: QuotationCreate, created_by_id: int) -> Quotation:
    quote_number = await _generate_quote_number(db)

    subtotal = sum(Decimal(str(item.unit_price)) * item.quantity for item in data.items)
    discount = Decimal(str(data.discount))
    total = subtotal - discount

    quotation = Quotation(
        system=data.system,
        quote_number=quote_number,
        client_id=data.client_id,
        client_name=data.client_name,
        client_email=data.client_email,
        client_phone=data.client_phone,
        valid_until=data.valid_until,
        notes=data.notes,
        terms=data.terms,
        discount=float(discount),
        subtotal=float(subtotal),
        total=float(total),
        status="borrador",
        created_by_id=created_by_id,
    )
    db.add(quotation)
    await db.flush()

    for item_data in data.items:
        item_subtotal = Decimal(str(item_data.unit_price)) * item_data.quantity
        item = QuotationItem(
            quotation_id=quotation.id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=float(item_data.unit_price),
            subtotal=float(item_subtotal),
            inventory_item_id=item_data.inventory_item_id,
        )
        db.add(item)

    await db.commit()
    return await _load_quotation(db, quotation.id)


async def get_quotations(db: AsyncSession, system: str = "bravo") -> list[Quotation]:
    result = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.client),
            selectinload(Quotation.items)
        )
        .where(Quotation.system == system)
        .order_by(Quotation.created_at.desc())
    )
    return list(result.scalars().all())


async def get_quotation(db: AsyncSession, quotation_id: int) -> Quotation:
    return await _load_quotation(db, quotation_id)


async def update_quotation(db: AsyncSession, quotation_id: int, data: QuotationUpdate) -> Quotation:
    q = await _load_quotation(db, quotation_id)

    update_fields = data.model_dump(exclude_unset=True, exclude={"items"})
    for field, value in update_fields.items():
        setattr(q, field, value)

    if data.items is not None:
        # Delete existing items and recreate
        for old_item in q.items:
            await db.delete(old_item)
        await db.flush()

        subtotal = sum(Decimal(str(i.unit_price)) * i.quantity for i in data.items)
        discount = Decimal(str(q.discount or 0))
        q.subtotal = float(subtotal)
        q.total = float(subtotal - discount)

        for item_data in data.items:
            item_subtotal = Decimal(str(item_data.unit_price)) * item_data.quantity
            new_item = QuotationItem(
                quotation_id=q.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=float(item_data.unit_price),
                subtotal=float(item_subtotal),
                inventory_item_id=item_data.inventory_item_id,
            )
            db.add(new_item)

    await db.commit()
    return await _load_quotation(db, quotation_id)


async def delete_quotation(db: AsyncSession, quotation_id: int) -> None:
    q = await _load_quotation(db, quotation_id)
    await db.delete(q)
    await db.commit()


async def get_quotation_by_number(db: AsyncSession, quote_number: str) -> Quotation:
    result = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.client),
            selectinload(Quotation.items)
        )
        .where(Quotation.quote_number == quote_number)
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    return q


async def update_quotation_status(db: AsyncSession, quote_number: str, new_status: str) -> Quotation:
    valid = {"borrador", "enviada", "aceptada", "rechazada"}
    if new_status not in valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Estado inválido. Válidos: {valid}")
    q = await get_quotation_by_number(db, quote_number)
    q.status = new_status
    await db.commit()
    return await _load_quotation(db, q.id)
