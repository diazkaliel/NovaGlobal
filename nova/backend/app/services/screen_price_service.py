import csv
import io
import re
from decimal import Decimal
from typing import BinaryIO
import openpyxl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.models.screen_price import ScreenPrice
from app.schemas.screen_price import (
    ScreenPriceCreate,
    ScreenPriceUpdate,
    ScreenPriceBulkUploadResponse,
    ScreenPriceBulkRowError
)


async def create_screen_price(db: AsyncSession, data: ScreenPriceCreate) -> ScreenPrice:
    """Crea un nuevo registro de precio de pantalla en la base de datos"""
    screen_price = ScreenPrice(**data.model_dump())
    db.add(screen_price)
    await db.commit()
    await db.refresh(screen_price)
    return screen_price


async def get_screen_prices(db: AsyncSession) -> list[ScreenPrice]:
    """Retorna la lista completa de precios de pantallas ordenados por marca y modelo"""
    query = select(ScreenPrice).order_by(ScreenPrice.brand, ScreenPrice.model)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_screen_price(db: AsyncSession, screen_price_id: int, data: ScreenPriceUpdate) -> ScreenPrice:
    """Actualiza un precio de pantalla existente"""
    query = select(ScreenPrice).where(ScreenPrice.id == screen_price_id)
    result = await db.execute(query)
    screen_price = result.scalar_one_or_none()
    if not screen_price:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Precio de pantalla no encontrado"
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(screen_price, field, value)
    await db.commit()
    await db.refresh(screen_price)
    return screen_price


async def delete_screen_price(db: AsyncSession, screen_price_id: int) -> None:
    """Elimina un precio de pantalla existente"""
    query = select(ScreenPrice).where(ScreenPrice.id == screen_price_id)
    result = await db.execute(query)
    screen_price = result.scalar_one_or_none()
    if not screen_price:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Precio de pantalla no encontrado"
        )
    await db.delete(screen_price)
    await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades de Carga Masiva (Excel / CSV)
# ─────────────────────────────────────────────────────────────────────────────

def _clean_header(h: str) -> str:
    """Limpia y normaliza los nombres de columnas"""
    if not h:
        return ""
    h = str(h).strip().lower()
    # Reemplazar acentos y caracteres especiales
    h = h.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    h = re.sub(r"[^a-z0-9_]", "_", h)
    return h


def _map_columns(headers: list[str]) -> dict[str, str]:
    """
    Mapea encabezados del archivo a los nombres canónicos de ScreenPrice:
    brand, model, quality, cost_price, sale_price
    """
    mapping = {}
    for raw_h in headers:
        clean = _clean_header(raw_h)
        if clean in ("marca", "brand", "fabricante"):
            mapping[raw_h] = "brand"
        elif clean in ("modelo", "model", "dispositivo", "telefono", "equipo"):
            mapping[raw_h] = "model"
        elif clean in ("calidad", "quality", "tipo_pantalla", "tipo", "panel"):
            mapping[raw_h] = "quality"
        elif clean in ("costo", "cost_price", "precio_costo", "costo_precio", "precio_de_costo", "cost"):
            mapping[raw_h] = "cost_price"
        elif clean in ("venta", "sale_price", "precio_venta", "precio_cliente", "precio", "pvp", "precio_publico", "precio_de_venta"):
            mapping[raw_h] = "sale_price"
    return mapping


def _parse_numeric_value(val: any) -> Decimal:
    """Convierte cadenas con símbolos de moneda o formatos varios a Decimal"""
    if val is None or val == "":
        raise ValueError("El valor no puede estar vacío")
    if isinstance(val, (int, float, Decimal)):
        return Decimal(str(val))
    
    val_str = str(val).strip()
    # Eliminar símbolos de moneda y espacios
    val_str = re.sub(r"[\$\s€£\.]", "", val_str) if "," in val_str and "." in val_str else re.sub(r"[\$\s€£]", "", val_str)
    # Reemplazar coma decimal si aplica
    val_str = val_str.replace(",", ".")
    return Decimal(val_str)


def parse_csv_file(content_bytes: bytes) -> list[dict]:
    """Parsea un archivo CSV en una lista de diccionarios normalizados"""
    # Intentar decodificar con UTF-8 con fallback a Latin-1
    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1")
    
    # Detectar delimitador (coma o punto y coma)
    sample = text[:2048]
    delimiter = ";" if ";" in sample and sample.count(";") > sample.count(",") else ","
    
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        return []
    
    col_map = _map_columns(reader.fieldnames)
    rows = []
    for row in reader:
        # Filtrar filas completamente vacías
        if not any(str(v).strip() for v in row.values() if v is not None):
            continue
        mapped_row = {}
        for original_col, value in row.items():
            canonical = col_map.get(original_col)
            if canonical:
                mapped_row[canonical] = str(value).strip() if value is not None else ""
        rows.append(mapped_row)
    return rows


def parse_excel_file(content_bytes: bytes) -> list[dict]:
    """Parsea un archivo Excel (.xlsx) en una lista de diccionarios normalizados"""
    wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
    ws = wb.active
    if not ws:
        return []
    
    raw_rows = list(ws.iter_rows(values_only=True))
    if not raw_rows or len(raw_rows) < 2:
        return []
    
    headers = [str(h).strip() if h is not None else "" for h in raw_rows[0]]
    col_map = _map_columns(headers)
    
    rows = []
    for row_values in raw_rows[1:]:
        if not any(v is not None and str(v).strip() != "" for v in row_values):
            continue
        mapped_row = {}
        for idx, val in enumerate(row_values):
            if idx < len(headers):
                original_col = headers[idx]
                canonical = col_map.get(original_col)
                if canonical:
                    mapped_row[canonical] = val
        rows.append(mapped_row)
    return rows


def _round_clean_currency(value: Decimal, min_value: Decimal) -> Decimal:
    """Redondea el valor al millar más cercano para precios limpios de cara al cliente"""
    if value >= Decimal("1000"):
        rounded = (value / Decimal("1000")).quantize(Decimal("1"), rounding="ROUND_HALF_UP") * Decimal("1000")
        if rounded < min_value:
            rounded = ((min_value + Decimal("999")) / Decimal("1000")).quantize(Decimal("1"), rounding="ROUND_FLOOR") * Decimal("1000")
        return rounded
    return value.quantize(Decimal("0.01"))


async def bulk_import_screen_prices(
    db: AsyncSession,
    file_bytes: bytes,
    filename: str,
    default_margin_percent: float = 100.0
) -> ScreenPriceBulkUploadResponse:
    """
    Procesa un archivo CSV o Excel, valida cada registro con Pydantic,
    calcula el precio público con base en el margen si no viene especificado,
    y realiza un 'Upsert' atómico en la base de datos.
    """
    filename_lower = filename.lower()
    if filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
        raw_rows = parse_excel_file(file_bytes)
    elif filename_lower.endswith(".csv") or filename_lower.endswith(".txt"):
        raw_rows = parse_csv_file(file_bytes)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no soportado. Por favor sube un archivo .xlsx o .csv"
        )
    
    if not raw_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no contiene filas de datos o los encabezados no son reconocibles."
        )

    # Cargar en memoria todos los precios de pantalla existentes para indexación O(1)
    existing_query = await db.execute(select(ScreenPrice))
    existing_items = list(existing_query.scalars().all())
    
    # Llave compuesta: (marca_normalizada, modelo_normalizado, calidad_normalizada)
    lookup: dict[tuple[str, str, str], ScreenPrice] = {
        (item.brand.strip().lower(), item.model.strip().lower(), (item.quality or "Original").strip().lower()): item
        for item in existing_items
    }

    created_count = 0
    updated_count = 0
    errors: list[ScreenPriceBulkRowError] = []

    # Multiplicador según el margen elegido (ej. 100% -> 2.0x, 50% -> 1.5x)
    safe_margin = max(0.0, float(default_margin_percent))
    multiplier = Decimal("1") + (Decimal(str(safe_margin)) / Decimal("100"))

    for idx, row in enumerate(raw_rows, start=2):  # start=2 contando el encabezado en fila 1
        brand = str(row.get("brand") or "").strip()
        model = str(row.get("model") or "").strip()
        quality = str(row.get("quality") or "Original").strip() or "Original"
        raw_cost = row.get("cost_price")
        raw_sale = row.get("sale_price")

        if not brand or not model:
            errors.append(ScreenPriceBulkRowError(
                row=idx,
                brand=brand,
                model=model,
                error="Marca o modelo no pueden estar vacíos"
            ))
            continue

        if raw_cost is None or str(raw_cost).strip() == "":
            errors.append(ScreenPriceBulkRowError(
                row=idx,
                brand=brand,
                model=model,
                error="El precio de costo no puede estar vacío"
            ))
            continue

        try:
            cost_val = _parse_numeric_value(raw_cost)
            if cost_val <= Decimal("0"):
                raise ValueError("El costo debe ser mayor a 0")
        except Exception as e:
            errors.append(ScreenPriceBulkRowError(
                row=idx,
                brand=brand,
                model=model,
                error=f"Error en precio de costo: {str(e)}"
            ))
            continue

        # Si el precio de venta viene vacío o en 0, calcularlo automáticamente con el margen
        if raw_sale is None or str(raw_sale).strip() == "" or str(raw_sale).strip() == "0":
            computed = cost_val * multiplier
            sale_val = _round_clean_currency(computed, min_value=cost_val)
        else:
            try:
                sale_val = _parse_numeric_value(raw_sale)
                # Si el precio de venta explícito es menor al costo, reportar error
                if sale_val < cost_val:
                    # Alternativa amigable: aplicar margen sugerido
                    sale_val = _round_clean_currency(cost_val * multiplier, min_value=cost_val)
            except Exception as e:
                # Si viene con texto inválido, recalcular con el margen
                sale_val = _round_clean_currency(cost_val * multiplier, min_value=cost_val)

        # Validación con Pydantic
        try:
            validated_data = ScreenPriceCreate(
                brand=brand,
                model=model,
                quality=quality,
                cost_price=cost_val,
                sale_price=sale_val
            )
        except ValidationError as val_err:
            msg = "; ".join([err.get("msg", str(err)) for err in val_err.errors()])
            errors.append(ScreenPriceBulkRowError(
                row=idx,
                brand=brand,
                model=model,
                error=msg
            ))
            continue


        # Lógica Upsert
        key = (brand.lower(), model.lower(), quality.lower())
        existing_screen = lookup.get(key)

        if existing_screen:
            # Actualizar precios
            existing_screen.cost_price = validated_data.cost_price
            existing_screen.sale_price = validated_data.sale_price
            # Si se desea estandarizar la capitalización original
            existing_screen.brand = validated_data.brand
            existing_screen.model = validated_data.model
            existing_screen.quality = validated_data.quality
            updated_count += 1
        else:
            new_screen = ScreenPrice(
                brand=validated_data.brand,
                model=validated_data.model,
                quality=validated_data.quality,
                cost_price=validated_data.cost_price,
                sale_price=validated_data.sale_price
            )
            db.add(new_screen)
            lookup[key] = new_screen
            created_count += 1

    # Guardar cambios atómicamente
    await db.commit()

    return ScreenPriceBulkUploadResponse(
        total_processed=len(raw_rows),
        created=created_count,
        updated=updated_count,
        errors=errors
    )


def generate_screen_prices_template_csv() -> str:
    """Genera el contenido de una plantilla CSV con datos de ejemplo"""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=",")
    writer.writerow(["marca", "modelo", "calidad", "precio_costo", "precio_venta"])
    writer.writerow(["Apple", "iPhone 11", "Original", "38000", "76000"])
    writer.writerow(["Apple", "iPhone 11", "In-Cell", "24000", "48000"])
    writer.writerow(["Samsung", "Galaxy A52", "Original", "40000", "80000"])
    writer.writerow(["Xiaomi", "Redmi Note 11", "Original", "28000", "56000"])
    writer.writerow(["Motorola", "Moto G60", "Original", "28000", "56000"])
    return output.getvalue()

