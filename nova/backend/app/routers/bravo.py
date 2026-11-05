"""Contratos de Bravo. No altera las rutas ni el comportamiento de Nova."""
from datetime import datetime, timezone, date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr, model_validator, ConfigDict
from sqlalchemy import select, func, text, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.client import Client
from app.models.bravo_order import BravoOrderLine
from app.models.inventory import InventoryItem, RepairInventory
from app.models.repair import Repair, RepairHistory
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse, RepairInventoryCreate
)
from app.schemas.repair import RepairHistoryResponse
from app.services.inventory_service import (
    create_item, get_items, update_item, delete_item, use_items_in_repair
)
from app.services.repair_service import VALID_STATUSES
from app.services.bravo_catalog import quote_catalog_items

router = APIRouter(prefix="/bravo", tags=["Bravo"])


class BravoOrderItemInput(BaseModel):
    catalog_product_id: int = Field(gt=0)
    variant: str = Field(default="", max_length=120)
    quantity: int = Field(ge=1, le=999)


class BravoOrderLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    catalog_product_id: int | None
    product_name: str
    variant: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class BravoOrderCreate(BaseModel):
    client_id: int | None = None
    new_client: ClientCreate | None = None
    # Legacy Bravo orders can still be entered without catalog lines.
    device_type: str | None = Field(default=None, min_length=1, max_length=50)
    brand: str | None = Field(default=None, min_length=1, max_length=50)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    reported_issue: str | None = Field(default=None, min_length=1)
    items: list[BravoOrderItemInput] | None = Field(default=None, min_length=1, max_length=30)
    expected_total: Decimal | None = Field(default=None, ge=0)
    accessories: str | None = None
    design_reference: str | None = Field(default=None, max_length=500)
    estimated_delivery: date | None = None
    repair_cost: Decimal | None = Field(default=None, ge=0)
    deposit: Decimal | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def verify_input(self):
        if (self.client_id is None) == (self.new_client is None):
            raise ValueError("Selecciona un cliente existente o registra uno nuevo")
        if self.items is not None:
            if self.repair_cost is not None:
                raise ValueError("El total del catálogo se calcula en el servidor")
            if self.expected_total is None:
                raise ValueError("Debes confirmar el precio mostrado del catálogo")
            return self
        if not all([self.device_type, self.brand, self.model, self.reported_issue]):
            raise ValueError("Completa la descripción del pedido manual")
        if self.deposit is not None and self.repair_cost is not None and self.deposit > self.repair_cost:
            raise ValueError("El abono no puede superar el precio total")
        if self.deposit and self.repair_cost is None:
            raise ValueError("Indica el precio total si existe un abono")
        return self


class BravoOrderUpdate(BaseModel):
    device_type: str | None = None
    brand: str | None = None
    model: str | None = None
    reported_issue: str | None = None
    accessories: str | None = None
    design_reference: str | None = Field(default=None, max_length=500)
    estimated_delivery: date | None = None
    repair_cost: Decimal | None = Field(default=None, ge=0)
    deposit: Decimal | None = Field(default=None, ge=0)
    deposit_payment_method: str | None = None
    final_payment_method: str | None = None
    client: ClientUpdate | None = None


class BravoStatusUpdate(BaseModel):
    new_status: str
    note: str | None = None


class BravoMaterialRead(BaseModel):
    id: int
    item_id: int
    name: str
    quantity: int


class BravoOrderList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_number: str
    client_id: int
    client: ClientResponse | None = None
    device_type: str
    brand: str
    model: str
    reported_issue: str
    accessories: str | None = None
    design_reference: str | None = None
    estimated_delivery: date | None = None
    repair_cost: Decimal | None = None
    deposit: Decimal | None = None
    deposit_payment_method: str | None = None
    final_payment_method: str | None = None
    status: str
    system: str
    created_at: datetime


class BravoOrderDetail(BravoOrderList):
    history: list[RepairHistoryResponse] = Field(default_factory=list)
    materials: list[BravoMaterialRead] = Field(default_factory=list)
    items: list[BravoOrderLineRead] = Field(default_factory=list)


async def scoped_order(db: AsyncSession, order_id: int, *, lock: bool = False) -> Repair:
    query = select(Repair).where(Repair.id == order_id, Repair.system == "bravo")
    if lock:
        query = query.with_for_update()
    order = (await db.execute(query)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Orden Bravo no encontrada")
    return order


async def scoped_inventory(db: AsyncSession, item_id: int) -> InventoryItem:
    item = (await db.execute(
        select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.system == "bravo")
    )).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Producto Bravo no encontrado")
    return item


async def serialize_detail(db: AsyncSession, order_id: int) -> BravoOrderDetail:
    order = (await db.execute(
        select(Repair).options(
            selectinload(Repair.client),
            selectinload(Repair.history),
            selectinload(Repair.inventory_usage).selectinload(RepairInventory.item),
        ).where(Repair.id == order_id, Repair.system == "bravo")
    )).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Orden Bravo no encontrada")
    order_lines = (await db.execute(
        select(BravoOrderLine)
        .where(BravoOrderLine.repair_id == order_id)
        .order_by(BravoOrderLine.id)
    )).scalars().all()
    response = BravoOrderDetail.model_validate(order)
    return response.model_copy(update={
        "materials": [
            BravoMaterialRead(
                id=usage.id,
                item_id=usage.item_id,
                name=usage.item.name if usage.item else "Insumo retirado",
                quantity=usage.quantity,
            ) for usage in order.inventory_usage
        ],
        "items": [BravoOrderLineRead.model_validate(line) for line in order_lines],
    })


@router.get("/orders", response_model=list[BravoOrderList])
async def list_orders(
    status: str | None = None,
    client_id: int | None = None,
    search: str | None = Query(default=None, max_length=120),
    active_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Repair).options(selectinload(Repair.client)).where(Repair.system == "bravo")
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Estado inválido")
        query = query.where(Repair.status == status)
    if client_id is not None:
        query = query.where(Repair.client_id == client_id)
    if active_only:
        query = query.where(Repair.status.not_in(['entregado', 'cancelado']))
    if search:
        term = f"%{search.strip()}%"
        query = query.join(Repair.client).where(or_(
            Repair.order_number.ilike(term), Repair.device_type.ilike(term),
            Repair.brand.ilike(term), Repair.model.ilike(term),
            Client.name.ilike(term), Client.phone.ilike(term)
        ))
    result = await db.execute(query.order_by(Repair.id.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/orders/counts")
async def order_counts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    counts = (await db.execute(
        select(Repair.status, func.count()).where(Repair.system == "bravo").group_by(Repair.status)
    )).all()
    overdue = await db.scalar(select(func.count()).select_from(Repair).where(
        Repair.system == "bravo", Repair.estimated_delivery < date.today(),
        Repair.status.not_in(["entregado", "cancelado"])
    ))
    return {"by_status": {state: quantity for state, quantity in counts},
            "total": sum(quantity for _, quantity in counts), "overdue": overdue or 0}


@router.get("/calendar", response_model=list[BravoOrderList])
async def calendar_orders(
    start: date,
    end: date,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if end < start or (end - start).days > 93:
        raise HTTPException(status_code=422, detail="Rango de calendario inválido")
    result = await db.execute(
        select(Repair)
        .options(selectinload(Repair.client))
        .where(
            Repair.system == "bravo",
            Repair.estimated_delivery >= start,
            Repair.estimated_delivery <= end,
            Repair.status.not_in(["entregado", "cancelado"]),
        )
        .order_by(Repair.estimated_delivery, Repair.id)
    )
    return result.scalars().all()


@router.get("/orders/{order_id}", response_model=BravoOrderDetail)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await serialize_detail(db, order_id)


@router.post("/orders", response_model=BravoOrderDetail, status_code=201)
async def create_order(
    payload: BravoOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        async with db.begin_nested():
            if payload.new_client is not None:
                clean_client = payload.new_client.model_dump(exclude_none=True)
                client = Client(**clean_client)
                db.add(client)
                await db.flush()
                client_id = client.id
            else:
                client_id = payload.client_id
                exists = await db.scalar(select(Client.id).where(Client.id == client_id))
                if exists is None:
                    raise HTTPException(status_code=404, detail="Cliente no encontrado")

            quoted_lines = []
            order_total = payload.repair_cost
            device_type = payload.device_type
            brand = payload.brand
            model = payload.model
            reported_issue = payload.reported_issue

            if payload.items is not None:
                quoted_lines, order_total = await quote_catalog_items(db, payload.items)
                if order_total != payload.expected_total:
                    raise HTTPException(
                        status_code=409,
                        detail="Los precios del catálogo cambiaron. Revisa el total antes de confirmar.",
                    )
                if payload.deposit is not None and payload.deposit > order_total:
                    raise HTTPException(status_code=422, detail="El abono no puede superar el total")
                first_product = quoted_lines[0]
                units_count = sum(line.quantity for line in quoted_lines)
                device_type = first_product.product_name[:50]
                brand = (first_product.variant or "Personalizado")[:50]
                model = f"{units_count} unidades · {len(quoted_lines)} productos"
                reported_issue = payload.reported_issue or "Personalización según detalle de productos"

            sequence_number = await db.scalar(text("SELECT nextval('bravo_order_number_seq')"))
            order = Repair(
                order_number=f"BRV-{sequence_number:05d}",
                client_id=client_id,
                device_type=device_type,
                brand=brand,
                model=model,
                reported_issue=reported_issue,
                accessories=payload.accessories,
                design_reference=payload.design_reference,
                estimated_delivery=payload.estimated_delivery,
                repair_cost=order_total,
                deposit=payload.deposit,
                status="recibido",
                system="bravo",
            )
            db.add(order)
            await db.flush()
            for line in quoted_lines:
                line.repair_id = order.id
                db.add(line)
            db.add(RepairHistory(
                repair_id=order.id,
                previous_status=None,
                new_status="recibido",
                note="Orden de personalización ingresada",
                changed_by_id=user.id,
                changed_at=datetime.now(timezone.utc).isoformat(),
            ))
            order_id = order.id
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Cliente duplicado o datos no válidos") from exc
    return await serialize_detail(db, order_id)


@router.patch("/orders/{order_id}", response_model=BravoOrderDetail)
async def update_order(
    order_id: int,
    payload: BravoOrderUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        async with db.begin_nested():
            order = await scoped_order(db, order_id, lock=True)
            changes = payload.model_dump(exclude_unset=True, exclude={"client"})
            # El total de una orden catalogada proviene de sus líneas, no de la edición manual.
            has_catalog_lines = await db.scalar(
                select(BravoOrderLine.id).where(BravoOrderLine.repair_id == order_id).limit(1)
            )
            if has_catalog_lines and "repair_cost" in changes:
                raise HTTPException(
                    status_code=422,
                    detail="El precio de una orden de catálogo no se modifica manualmente",
                )
            for field, value in changes.items():
                setattr(order, field, value)
            if payload.client is not None:
                client = (await db.execute(
                    select(Client).where(Client.id == order.client_id).with_for_update()
                )).scalar_one()
                for field, value in payload.client.model_dump(exclude_unset=True).items():
                    setattr(client, field, value)
            if order.deposit is not None and order.repair_cost is not None and order.deposit > order.repair_cost:
                raise HTTPException(status_code=422, detail="El abono supera el precio total")
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Datos de cliente duplicados") from exc
    return await serialize_detail(db, order_id)


@router.patch("/orders/{order_id}/status", response_model=BravoOrderDetail)
async def set_status(
    order_id: int,
    payload: BravoStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.new_status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="Estado inválido")
    async with db.begin_nested():
        order = await scoped_order(db, order_id, lock=True)
        if order.status == payload.new_status:
            raise HTTPException(status_code=409, detail="La orden ya tiene ese estado")
        db.add(RepairHistory(
            repair_id=order.id,
            previous_status=order.status,
            new_status=payload.new_status,
            note=payload.note,
            changed_by_id=user.id,
            changed_at=datetime.now(timezone.utc).isoformat(),
        ))
        order.status = payload.new_status
    await db.commit()
    return await serialize_detail(db, order_id)


@router.delete("/orders/{order_id}", status_code=204)
async def remove_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    async with db.begin_nested():
        order = await scoped_order(db, order_id, lock=True)
        await db.delete(order)
    await db.commit()


@router.get("/catalog", response_model=list[InventoryItemResponse])
async def search_catalog(
    search: str | None = Query(default=None, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Sólo mercancía Bravo; los insumos técnicos no son artículos vendibles.
    query = select(InventoryItem).where(
        InventoryItem.system == "bravo",
        InventoryItem.category == "mercancia",
    )
    if search and search.strip():
        query = query.where(InventoryItem.name.ilike(f"%{search.strip()}%"))
    products = (await db.execute(
        query.order_by(InventoryItem.name, InventoryItem.id).offset(skip).limit(limit)
    )).scalars().all()
    for product in products:
        product.is_low_stock = product.stock <= product.min_stock
    return products


@router.get("/inventory", response_model=list[InventoryItemResponse])
async def list_inventory(
    category: str | None = None,
    low_stock: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inventory = await get_items(db, category, low_stock, "bravo", skip, limit)
    for product in inventory:
        product.is_low_stock = product.stock <= product.min_stock
    return inventory


@router.get("/inventory/counts")
async def inventory_counts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = await db.scalar(
        select(func.count()).select_from(InventoryItem).where(InventoryItem.system == "bravo")
    )
    return {"total": count or 0}


@router.post("/inventory", response_model=InventoryItemResponse, status_code=201)
async def add_inventory(
    payload: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.stock < 0 or payload.min_stock < 0 or payload.cost_price < 0 or payload.sale_price < 0:
        raise HTTPException(status_code=422, detail="Stock y precios no pueden ser negativos")
    product = await create_item(db, payload.model_copy(update={"system": "bravo"}))
    product.is_low_stock = product.stock <= product.min_stock
    return product


@router.patch("/inventory/{item_id}", response_model=InventoryItemResponse)
async def change_inventory(
    item_id: int,
    payload: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    current = await scoped_inventory(db, item_id)
    if payload.category is not None and payload.category not in {"insumo", "mercancia"}:
        raise HTTPException(status_code=422, detail="Categoría no válida")
    if any(number is not None and number < 0 for number in (
        payload.stock, payload.min_stock, payload.cost_price, payload.sale_price
    )):
        raise HTTPException(status_code=422, detail="Stock y precios no pueden ser negativos")
    next_cost = payload.cost_price if payload.cost_price is not None else current.cost_price
    next_price = payload.sale_price if payload.sale_price is not None else current.sale_price
    if next_price < next_cost:
        raise HTTPException(status_code=422, detail="Precio de venta menor que costo")
    product = await update_item(db, item_id, payload.model_copy(update={"system": "bravo"}))
    product.is_low_stock = product.stock <= product.min_stock
    return product


@router.delete("/inventory/{item_id}", status_code=204)
async def remove_inventory(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await scoped_inventory(db, item_id)
    await delete_item(db, item_id)


@router.post("/orders/{order_id}/materials", response_model=list[BravoMaterialRead], status_code=201)
async def add_materials(
    order_id: int,
    materials: list[RepairInventoryCreate],
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await scoped_order(db, order_id)
    for material in materials:
        await scoped_inventory(db, material.item_id)
    await use_items_in_repair(db, order_id, materials)
    return (await serialize_detail(db, order_id)).materials
