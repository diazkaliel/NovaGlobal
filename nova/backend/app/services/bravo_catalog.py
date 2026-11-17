"""Cotización Bravo: precio del servidor, snapshot inmutable y cero descuentos de stock."""
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bravo_order import BravoOrderLine
from app.models.inventory import InventoryItem


MAX_ORDER_TOTAL = Decimal("99999999.99")


async def quote_catalog_items(db: AsyncSession, requested_items: list) -> tuple[list[BravoOrderLine], Decimal]:
    product_ids = {line.catalog_product_id for line in requested_items}
    products = (await db.execute(
        select(InventoryItem).where(
            InventoryItem.id.in_(product_ids),
            InventoryItem.system == "bravo",
            InventoryItem.category.in_(["insumo", "mercancia"]),
            InventoryItem.archived_at.is_(None),
        ).with_for_update(read=True)
    )).scalars().all()
    product_by_id = {product.id: product for product in products}
    if len(product_by_id) != len(product_ids):
        raise HTTPException(status_code=422, detail="Hay productos que no pertenecen al catálogo de Bravo")

    quoted_lines: list[BravoOrderLine] = []
    total = Decimal("0.00")
    for requested in requested_items:
        product = product_by_id[requested.catalog_product_id]
        if product.system != "bravo" or product.category not in ("insumo", "mercancia"):
            raise HTTPException(status_code=422, detail="Producto no disponible en Bravo")
        sale_val = Decimal(str(product.sale_price or 0))
        cost_val = Decimal(str(product.cost_price or 0))
        unit_price = sale_val if sale_val > 0 else cost_val
        if not unit_price.is_finite() or unit_price < 0:
            raise HTTPException(status_code=422, detail="El catálogo contiene un precio inválido")
        total += unit_price * requested.quantity
        if total > MAX_ORDER_TOTAL:
            raise HTTPException(status_code=422, detail="El valor de la orden excede el límite permitido")
        quoted_lines.append(
            BravoOrderLine(
                catalog_product_id=product.id,
                product_name=product.name,
                variant=requested.variant.strip(),
                quantity=requested.quantity,
                unit_price=unit_price,
            )
        )
    return quoted_lines, total.quantize(Decimal("0.01"))
