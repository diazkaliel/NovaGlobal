from decimal import Decimal
from typing import Sequence
from app.schemas.product_3d import DecalConfig, PricingQuoteBreakdown

# Tarifas base industriales de producción en CLP
TECHNIQUE_RATES_PER_CM2 = {
    "dtf": Decimal("15.00"),
    "sublimacion": Decimal("12.00"),
    "vinilo": Decimal("18.00"),
    "serigrafia": Decimal("8.00"),
}

DEFAULT_MAX_ZONE_WIDTH_CM = Decimal("32.0")
DEFAULT_MAX_ZONE_HEIGHT_CM = Decimal("40.0")


def calculate_customization_quote(
    base_product_price: Decimal,
    decals: Sequence[DecalConfig],
    technique: str = "dtf",
    quantity: int = 1,
    zone_max_width_cm: Decimal = DEFAULT_MAX_ZONE_WIDTH_CM,
    zone_max_height_cm: Decimal = DEFAULT_MAX_ZONE_HEIGHT_CM,
) -> PricingQuoteBreakdown:
    """
    Calcula el costo y desglose determinista de una personalización 3D.
    
    El área se computa multiplicando las dimensiones físicas máximas de la zona
    por el factor de escala normalizado de cada decal aplicado.
    """
    technique_clean = technique.lower().strip()
    rate_per_cm2 = TECHNIQUE_RATES_PER_CM2.get(technique_clean, TECHNIQUE_RATES_PER_CM2["dtf"])

    total_area_cm2 = Decimal("0.0")

    for decal in decals:
        scale = Decimal(str(decal.transform.scale))
        # Escala proporcional del decal respecto a la zona física de estampa
        w = zone_max_width_cm * scale
        h = zone_max_height_cm * scale
        total_area_cm2 += w * h

    # Costo unitario de estampado según el área de consumo de tinta / insumo
    customization_cost = (total_area_cm2 * rate_per_cm2).quantize(Decimal("1"))

    # Tramos de descuento por volumen escalonados
    volume_discount_pct = Decimal("0")
    if quantity >= 50:
        volume_discount_pct = Decimal("25")
    elif quantity >= 25:
        volume_discount_pct = Decimal("15")
    elif quantity >= 10:
        volume_discount_pct = Decimal("8")

    subtotal_unit = base_product_price + customization_cost
    discount_multiplier = (Decimal("100") - volume_discount_pct) / Decimal("100")
    unit_price = (subtotal_unit * discount_multiplier).quantize(Decimal("1"))
    final_total = unit_price * Decimal(quantity)

    return PricingQuoteBreakdown(
        base_product_price=base_product_price,
        customization_cost=customization_cost,
        total_print_area_cm2=float(round(total_area_cm2, 2)),
        volume_discount_pct=volume_discount_pct,
        unit_price=unit_price,
        final_total=final_total,
    )
