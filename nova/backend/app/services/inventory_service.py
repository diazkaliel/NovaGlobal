import csv
import io
import re
from decimal import Decimal
from typing import BinaryIO
import openpyxl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.inventory import InventoryItem, RepairInventory, ProductRecipe
from app.models.repair import Repair
from app.schemas.inventory import (
    InventoryItemCreate, InventoryItemUpdate,
    RepairInventoryCreate,
    InventoryBulkUploadResponse, InventoryBulkRowError
)


async def create_item(db: AsyncSession, data: InventoryItemCreate) -> InventoryItem:
    dump = data.model_dump()
    recipe_data = dump.pop("recipe", None)
    item = InventoryItem(**dump)
    db.add(item)
    await db.flush()  # Para obtener el ID autogenerado
    
    # Si no se provee código de barras, autogenerar uno secuencial único
    if not item.barcode:
        item.barcode = f"INV-{item.id:05d}"
        db.add(item)

    if recipe_data:
        for r_item in recipe_data:
            rec = ProductRecipe(
                product_id=item.id,
                insumo_id=r_item["insumo_id"],
                quantity=r_item.get("quantity", 1.0)
            )
            db.add(rec)
        
    await db.commit()
    return await get_item(db, item.id)


async def get_item(db: AsyncSession, item_id: int) -> InventoryItem:
    try:
        result = await db.execute(
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.recipe_items).selectinload(ProductRecipe.insumo)
            )
            .where(InventoryItem.id == item_id)
        )
        item = result.scalar_one_or_none()
    except Exception:
        result = await db.execute(
            select(InventoryItem).where(InventoryItem.id == item_id)
        )
        item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    try:
        if hasattr(item, 'recipe_items') and item.recipe_items:
            for rec in item.recipe_items:
                if getattr(rec, 'insumo', None):
                    rec.insumo_name = rec.insumo.name
    except Exception:
        pass
    return item


async def get_items(
    db: AsyncSession,
    category: str | None = None,
    low_stock_only: bool = False,
    system: str | None = None,
    skip: int = 0,
    limit: int = 10000
) -> list[InventoryItem]:
    try:
        query = (
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.recipe_items).selectinload(ProductRecipe.insumo)
            )
        )

        if category:
            query = query.where(InventoryItem.category == category)

        if low_stock_only:
            query = query.where(InventoryItem.stock <= InventoryItem.min_stock)

        if system:
            query = query.where(InventoryItem.system == system)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()
    except Exception:
        query = select(InventoryItem)
        if category:
            query = query.where(InventoryItem.category == category)
        if low_stock_only:
            query = query.where(InventoryItem.stock <= InventoryItem.min_stock)
        if system:
            query = query.where(InventoryItem.system == system)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()

    for item in items:
        try:
            if hasattr(item, 'recipe_items') and item.recipe_items:
                for rec in item.recipe_items:
                    if getattr(rec, 'insumo', None):
                        rec.insumo_name = rec.insumo.name
        except Exception:
            pass
    return items


async def update_item(
    db: AsyncSession,
    item_id: int,
    data: InventoryItemUpdate
) -> InventoryItem:
    item = await get_item(db, item_id)
    update_data = data.model_dump(exclude_unset=True)
    recipe_data = update_data.pop("recipe", None)

    for field, value in update_data.items():
        setattr(item, field, value)

    if recipe_data is not None:
        await db.execute(
            delete(ProductRecipe).where(ProductRecipe.product_id == item_id)
        )
        for r_item in recipe_data:
            rec = ProductRecipe(
                product_id=item_id,
                insumo_id=r_item["insumo_id"],
                quantity=r_item.get("quantity", 1.0)
            )
            db.add(rec)

    await db.commit()
    return await get_item(db, item_id)


async def use_items_in_repair(
    db: AsyncSession,
    repair_id: int,
    items: list[RepairInventoryCreate]
) -> list[RepairInventory]:
    """
    Registra el uso de insumos en una reparación y descuenta el stock.

    CRÍTICO: Todo ocurre dentro de una sola transacción.
    Si cualquier validación falla (stock insuficiente, item no existe),
    se hace rollback completo — no se descuenta nada.
    """
    # Verificamos que la reparación existe
    repair_result = await db.execute(
        select(Repair).where(Repair.id == repair_id)
    )
    if not repair_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reparación no encontrada"
        )

    records = []

    async with db.begin_nested():
        for item_data in items:
            # Bloqueamos el registro con FOR UPDATE para evitar
            # condiciones de carrera si dos requests llegan al mismo tiempo
            result = await db.execute(
                select(InventoryItem)
                .where(InventoryItem.id == item_data.item_id)
                .with_for_update()
            )
            item = result.scalar_one_or_none()

            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto con id {item_data.item_id} no encontrado"
                )

            if item.stock < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para '{item.name}'. Disponible: {item.stock}, solicitado: {item_data.quantity}"
                )

            # Descontamos el stock
            item.stock -= item_data.quantity
            db.add(item)

            # Descontamos receta de insumos si es mercancía
            if item.category == "mercancia":
                from app.models.inventory import ProductRecipe
                rec_result = await db.execute(
                    select(ProductRecipe).where(ProductRecipe.product_id == item.id)
                )
                recipes = rec_result.scalars().all()
                for rec in recipes:
                    insumo_res = await db.execute(
                        select(InventoryItem).where(InventoryItem.id == rec.insumo_id).with_for_update()
                    )
                    ins_item = insumo_res.scalar_one_or_none()
                    if ins_item:
                        ins_item.stock -= item_data.quantity * rec.quantity
                        db.add(ins_item)

            # Registramos el movimiento
            record = RepairInventory(
                repair_id=repair_id,
                item_id=item_data.item_id,
                quantity=item_data.quantity,
            )
            db.add(record)
            records.append(record)
        await db.flush()
    await db.commit()

    # Recargamos con la relación item para que Pydantic pueda serializar sin MissingGreenlet error
    record_ids = [r.id for r in records]
    if record_ids:
        from sqlalchemy.orm import selectinload
        res = await db.execute(
            select(RepairInventory)
            .options(selectinload(RepairInventory.item))
            .where(RepairInventory.id.in_(record_ids))
        )
        return res.scalars().all()

    return []


async def get_low_stock_alerts(db: AsyncSession, system: str | None = None) -> list[InventoryItem]:
    """Retorna items cuyo stock está en o bajo el mínimo"""
    query = select(InventoryItem).where(
        InventoryItem.stock <= InventoryItem.min_stock
    )
    if system:
        query = query.where(InventoryItem.system == system)
    result = await db.execute(query)
    return result.scalars().all()


async def delete_item(db: AsyncSession, item_id: int) -> None:
    """Elimina un ítem de inventario"""
    item = await get_item(db, item_id)
    await db.delete(item)
    await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades de Carga Masiva de Inventario (Excel / CSV)
# ─────────────────────────────────────────────────────────────────────────────

def _clean_header(h: str) -> str:
    """Limpia y normaliza los nombres de columnas"""
    if not h:
        return ""
    h = str(h).strip().lower()
    h = h.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    h = re.sub(r"[^a-z0-9_]", "_", h)
    return h


def _map_inventory_columns(headers: list[str]) -> dict[str, str]:
    """
    Mapea encabezados del archivo a los nombres canónicos de InventoryItem:
    name, category, stock, min_stock, cost_price, sale_price, barcode
    """
    mapping = {}
    for raw_h in headers:
        clean = _clean_header(raw_h)
        if clean in ("nombre", "name", "producto", "item", "articulo", "descripcion", "titulo"):
            mapping[raw_h] = "name"
        elif clean in ("categoria", "category", "tipo", "tipo_item", "rubro"):
            mapping[raw_h] = "category"
        elif clean in ("stock", "cantidad", "existencias", "stock_actual", "qty"):
            mapping[raw_h] = "stock"
        elif clean in ("stock_minimo", "min_stock", "stock_min", "minimo", "alerta_stock"):
            mapping[raw_h] = "min_stock"
        elif clean in ("costo", "cost_price", "precio_costo", "costo_precio", "precio_de_costo", "cost"):
            mapping[raw_h] = "cost_price"
        elif clean in ("venta", "sale_price", "precio_venta", "precio_cliente", "precio", "pvp", "precio_publico", "precio_de_venta", "valor_de_venta"):
            mapping[raw_h] = "sale_price"
        elif clean in ("barcode", "codigo_barra", "codigo_de_barra", "codigo", "sku"):
            mapping[raw_h] = "barcode"
    return mapping


def _parse_decimal(val: any) -> Decimal | None:
    """Limpia strings con $, comas, puntos y convierte a Decimal"""
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, Decimal)):
        return Decimal(str(val))
    cleaned = str(val).strip().replace("$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except Exception:
        # Intento fallback si venía con formato 12.34
        try:
            return Decimal(str(val).strip().replace("$", "").replace(" ", ""))
        except Exception:
            return None


def _parse_int(val: any, default: int = 0) -> int:
    """Convierte valor a entero de forma segura"""
    if val is None or val == "":
        return default
    try:
        return int(float(str(val).strip()))
    except Exception:
        return default


def _read_csv(file_bytes: bytes) -> tuple[list[str], list[dict[str, str]]]:
    """Lee CSV probando varias codificaciones y detectando delimitador"""
    text = None
    for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
        try:
            text = file_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError("No se pudo decodificar el archivo CSV con UTF-8 o Latin-1.")

    first_line = text.split("\n")[0]
    delimiter = ";" if ";" in first_line else ","
    
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    headers = [str(h).strip() for h in (reader.fieldnames or []) if h]
    rows = [dict(row) for row in reader if any(v.strip() for v in row.values() if v)]
    return headers, rows


def _read_excel(file_bytes: bytes) -> tuple[list[str], list[dict[str, str]]]:
    """Lee archivo Excel (.xlsx) usando openpyxl"""
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    
    headers_row = next(rows_iter, None)
    if not headers_row:
        return [], []
    
    headers = [str(h).strip() for h in headers_row if h is not None]
    rows = []
    for r in rows_iter:
        if not any(r):
            continue
        row_dict = {}
        for h, v in zip(headers, r):
            row_dict[h] = "" if v is None else str(v).strip()
        rows.append(row_dict)
    return headers, rows


async def bulk_import_inventory(
    db: AsyncSession,
    file_bytes: bytes,
    filename: str,
    system: str = "bravo"
) -> InventoryBulkUploadResponse:
    """
    Procesa un archivo CSV o Excel de productos/insumos de inventario.
    Ejecuta validaciones, conversiones y realiza un Upsert atómico por (name, system).
    """
    filename_lower = filename.lower()
    if filename_lower.endswith(".csv"):
        headers, raw_rows = _read_csv(file_bytes)
    elif filename_lower.endswith((".xlsx", ".xls")):
        headers, raw_rows = _read_excel(file_bytes)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no soportado. Debe ser .csv o .xlsx"
        )

    if not raw_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío o no contiene filas de datos."
        )

    col_map = _map_inventory_columns(headers)
    if "name" not in col_map.values():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no contiene la columna obligatoria 'Nombre' o 'Producto'."
        )

    # Obtenemos los ítems existentes en este sistema para hacer Upsert eficiente
    stmt = select(InventoryItem).where(InventoryItem.system == system)
    result = await db.execute(stmt)
    existing_items = {item.name.strip().lower(): item for item in result.scalars().all()}

    created_count = 0
    updated_count = 0
    errors: list[InventoryBulkRowError] = []

    for row_idx, row in enumerate(raw_rows, start=2):  # Fila 2 por encabezados
        # Extraer campos normalizados
        item_data: dict[str, any] = {}
        for original_h, canon_key in col_map.items():
            val = row.get(original_h, "")
            item_data[canon_key] = val

        name = str(item_data.get("name", "")).strip()
        if not name:
            errors.append(InventoryBulkRowError(
                row=row_idx,
                raw_data=row,
                error="El nombre del producto no puede estar vacío"
            ))
            continue

        raw_cat = str(item_data.get("category", "")).strip().lower()
        if raw_cat in ("insumo", "materia_prima", "material", "repuesto"):
            category = "insumo"
        else:
            category = "mercancia"

        stock = _parse_int(item_data.get("stock"), 0)
        min_stock = _parse_int(item_data.get("min_stock"), 5)

        cost_price = _parse_decimal(item_data.get("cost_price"))
        sale_price = _parse_decimal(item_data.get("sale_price"))

        if cost_price is None:
            cost_price = Decimal("0.00")
        if sale_price is None or sale_price < cost_price:
            sale_price = cost_price

        barcode = str(item_data.get("barcode", "")).strip() or None

        lookup_key = name.lower()
        if lookup_key in existing_items:
            existing = existing_items[lookup_key]
            existing.category = category
            existing.stock = stock
            existing.min_stock = min_stock
            existing.cost_price = cost_price
            existing.sale_price = sale_price
            if barcode:
                existing.barcode = barcode
            db.add(existing)
            updated_count += 1
        else:
            new_item = InventoryItem(
                name=name,
                category=category,
                stock=stock,
                min_stock=min_stock,
                cost_price=cost_price,
                sale_price=sale_price,
                barcode=barcode,
                system=system
            )
            db.add(new_item)
            await db.flush()
            if not new_item.barcode:
                new_item.barcode = f"INV-{new_item.id:05d}"
                db.add(new_item)
            existing_items[lookup_key] = new_item
            created_count += 1

    await db.commit()

    return InventoryBulkUploadResponse(
        total_processed=len(raw_rows),
        created=created_count,
        updated=updated_count,
        errors_count=len(errors),
        errors=errors
    )


def generate_inventory_template_csv(system: str = "bravo") -> str:
    """Genera una plantilla CSV amigable con ejemplos según el sistema (Bravo o Nova)"""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "Nombre",
        "Categoria",
        "Stock",
        "Stock_Minimo",
        "Precio_Costo",
        "Precio_Venta",
        "Codigo_Barra"
    ])
    
    if system == "bravo":
        writer.writerow(["Polera Algodón 100% Negra S", "Mercancía", "50", "10", "4500", "9990", "BRAVO-001"])
        writer.writerow(["Tinta Sublimación Cyan 1L", "Insumo", "8", "2", "12000", "18000", "BRAVO-002"])
        writer.writerow(["Polerón Canguro Gris L", "Mercancía", "25", "5", "9000", "19990", "BRAVO-003"])
        writer.writerow(["Vinilo Textil Glitter Dorado 1m", "Insumo", "15", "3", "3500", "6000", "BRAVO-004"])
    else:
        writer.writerow(["Batería iPhone 11 Original", "Insumo", "12", "3", "15000", "28000", "NOVA-001"])
        writer.writerow(["Cargador Rápido 20W USB-C", "Mercancía", "30", "5", "4000", "12990", "NOVA-002"])
        writer.writerow(["Pegamento B-7000 50ml", "Insumo", "6", "2", "2500", "4500", "NOVA-003"])

    return output.getvalue()