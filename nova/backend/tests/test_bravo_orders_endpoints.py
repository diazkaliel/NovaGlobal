import pytest
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.client import Client
from app.models.inventory import InventoryItem, ProductRecipe
from app.models.bravo_order import BravoOrder
from app.core.dependencies import get_current_user, get_current_admin
from app.main import app
import uuid


@pytest.mark.asyncio
async def test_bravo_native_orders_flow(client, db_session):
    """
    Prueba el flujo nativo e independiente de pedidos en Bravo:
    1. Creación de cliente exclusivo de Bravo.
    2. Creación de pedido en /bravo/orders/ con generación de BRV-XXXXX.
    3. Consulta de listado y actualización de estado de producción.
    4. Consulta de estadísticas exclusivas de taller.
    """
    admin_bravo = User(
        name="Admin Bravo Native",
        email=f"admin_native_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="bravo",
        is_active=True
    )
    db_session.add(admin_bravo)

    client_bravo = Client(
        name="Liceo Deportivo Quillota",
        phone=f"+569{uuid.uuid4().int % 100000000:08d}",
        email=f"deportes_{uuid.uuid4().hex[:6]}@liceo.cl",
        rut=f"{uuid.uuid4().int % 80000000 + 10000000}-K",
        city="Quillota",
        system="bravo"
    )
    db_session.add(client_bravo)
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: admin_bravo
    app.dependency_overrides[get_current_admin] = lambda: admin_bravo

    try:
        # 1. Crear Orden Nativa de Bravo
        order_payload = {
            "client_id": client_bravo.id,
            "item_category": "poleron",
            "brand": "Gildan Heavy Blend",
            "model": "Canguro con Capucha",
            "garment_color": "Azul Marino",
            "garment_size": "L",
            "quantity": 15,
            "reported_issue": "Bordado insignia institucional en pecho y estampado vinilo en espalda",
            "print_technique": "bordado",
            "print_location": "Pecho y Espalda",
            "print_dimensions": "10x10cm y 28x35cm",
            "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d"),
            "order_cost": 225000.0,
            "deposit": 100000.0,
            "deposit_payment_method": "transferencia"
        }

        res_create = await client.post("/bravo/orders/", json=order_payload)
        assert res_create.status_code == 201, res_create.text
        order_data = res_create.json()
        assert order_data["order_number"].startswith("BRV-")
        assert order_data["item_category"] == "poleron"
        assert order_data["quantity"] == 15
        assert order_data["status"] == "recibido"
        order_id = order_data["id"]

        # 2. Consultar listado de órdenes en Bravo
        res_list = await client.get("/bravo/orders/", params={"status": "recibido"})
        assert res_list.status_code == 200
        orders_list = res_list.json()
        assert any(o["id"] == order_id for o in orders_list)

        # 3. Transicionar estado: recibido -> diseno_aprobado
        res_status = await client.patch(
            f"/bravo/orders/{order_id}/status",
            json={"new_status": "diseno_aprobado", "note": "Diseño vectorial aprobado por profesor"}
        )
        assert res_status.status_code == 200
        assert res_status.json()["status"] == "diseno_aprobado"

        # 4. Consultar estadísticas de producción
        res_stats = await client.get("/bravo/orders/stats")
        assert res_stats.status_code == 200
        stats_data = res_stats.json()
        assert "total_active" in stats_data
        assert stats_data["total_active"] >= 1

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_current_admin, None)
