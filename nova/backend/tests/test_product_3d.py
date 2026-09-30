import pytest
from decimal import Decimal
from app.schemas.product_3d import DecalConfig, DecalTransform
from app.services.pricing_engine import calculate_customization_quote


def test_pricing_engine_single_decal():
    """Valida el cálculo de área y costo de una estampa individual al 50% de escala."""
    decals = [
        DecalConfig(
            id="d1",
            zone_id="front",
            artwork_type="raster",
            transform=DecalTransform(x=0.5, y=0.5, scale=0.5, rotation_deg=0.0),
        )
    ]
    # Zona de 32 x 40 cm -> a 50% de escala el ancho es 16 cm y el alto es 20 cm = 320 cm²
    # 320 cm² * $15 (DTF) = $4.800 de estampado
    # Prenda base $8.990 + $4.800 = $13.790
    quote = calculate_customization_quote(
        base_product_price=Decimal("8990"),
        decals=decals,
        technique="dtf",
        quantity=1,
        zone_max_width_cm=Decimal("32.0"),
        zone_max_height_cm=Decimal("40.0"),
    )

    assert quote.total_print_area_cm2 == 320.0
    assert quote.customization_cost == Decimal("4800")
    assert quote.volume_discount_pct == Decimal("0")
    assert quote.unit_price == Decimal("13790")
    assert quote.final_total == Decimal("13790")


def test_pricing_engine_volume_discounts():
    """Verifica los tramos de descuento por volumen (8% >=10, 15% >=25, 25% >=50)."""
    decals = [
        DecalConfig(
            id="d1",
            zone_id="front",
            artwork_type="raster",
            transform=DecalTransform(x=0.5, y=0.5, scale=0.5, rotation_deg=0.0),
        )
    ]

    # 1 unidad: 0% desc
    q1 = calculate_customization_quote(Decimal("10000"), decals, "dtf", quantity=1)
    assert q1.volume_discount_pct == Decimal("0")

    # 10 unidades: 8% desc
    q10 = calculate_customization_quote(Decimal("10000"), decals, "dtf", quantity=10)
    assert q10.volume_discount_pct == Decimal("8")
    assert q10.final_total < q1.unit_price * Decimal(10)

    # 25 unidades: 15% desc
    q25 = calculate_customization_quote(Decimal("10000"), decals, "dtf", quantity=25)
    assert q25.volume_discount_pct == Decimal("15")

    # 50 unidades: 25% desc
    q50 = calculate_customization_quote(Decimal("10000"), decals, "dtf", quantity=50)
    assert q50.volume_discount_pct == Decimal("25")


def test_pricing_engine_multiple_decals_accumulation():
    """Comprueba la suma acumulativa de múltiples estampas en diferentes zonas."""
    decals = [
        DecalConfig(
            id="d1",
            zone_id="front",
            artwork_type="raster",
            transform=DecalTransform(scale=0.5),
        ),
        DecalConfig(
            id="d2",
            zone_id="front",
            artwork_type="text",
            textContent="LOGO",
            transform=DecalTransform(scale=0.25),
        ),
    ]

    quote = calculate_customization_quote(
        base_product_price=Decimal("5000"),
        decals=decals,
        technique="sublimacion",
        quantity=5,
    )

    # 320 cm² (decal 1) + 80 cm² (decal 2: 8x10cm) = 400 cm²
    assert quote.total_print_area_cm2 == 400.0
    # 400 cm² * $12 (sublimación) = $4.800
    assert quote.customization_cost == Decimal("4800")
    assert quote.unit_price == Decimal("9800")


@pytest.mark.asyncio
async def test_3d_endpoints_integration(client):
    """Verifica que los endpoints REST /api/3d respondan correctamente con el ASGI client."""
    # 1. Listado de modelos
    res_models = await client.get("/api/3d/models")
    assert res_models.status_code == 200
    models_data = res_models.json()
    assert len(models_data) >= 1
    prod_id = models_data[0]["id"]

    # 2. Cotización reactiva
    quote_payload = {
        "product_3d_id": prod_id,
        "technique": "dtf",
        "quantity": 12,
        "decals": [
            {
                "id": "decal-test",
                "zone_id": "front",
                "artwork_type": "raster",
                "transform": {"x": 0.5, "y": 0.45, "scale": 0.5, "rotation_deg": 0},
            }
        ],
    }
    res_quote = await client.post("/api/3d/quote", json=quote_payload)
    assert res_quote.status_code == 200
    quote_data = res_quote.json()
    assert quote_data["volume_discount_pct"] == "8"
    assert float(quote_data["final_total"]) > 0

    # 3. Guardar sesión
    session_payload = {
        "product_3d_id": prod_id,
        "selected_color_hex": "#ffffff",
        "technique": "dtf",
        "quantity": 12,
        "decals": quote_payload["decals"],
    }
    res_session = await client.post("/api/3d/sessions", json=session_payload)
    assert res_session.status_code == 201
    created_session = res_session.json()
    assert "session_token" in created_session
    token = created_session["session_token"]

    # 4. Recuperar sesión
    res_get_session = await client.get(f"/api/3d/sessions/{token}")
    assert res_get_session.status_code == 200
    fetched = res_get_session.json()
    assert fetched["session_token"] == token
