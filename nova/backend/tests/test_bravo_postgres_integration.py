"""Prueba real de Bravo contra PostgreSQL efímero, sin credenciales de producción."""
import os
import unittest
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

# Los tests unitarios de la rama base no tienen PostgreSQL ni httpx instalado.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:local@127.0.0.1/bravo_test")
os.environ.setdefault("SECRET_KEY", "test-only-bravo-contract-key-not-used-in-production")

from app.core.security import create_token
from app.db.database import SessionLocal, engine
from app.main import app
from app.models.bravo_order import BravoOrderLine
from app.models.client import Client
from app.models.inventory import InventoryItem
from app.models.repair import Repair
from app.models.user import User


@unittest.skipUnless(os.environ.get('BRAVO_POSTGRES_TESTS') == '1', 'Requires disposable PostgreSQL service')
class BravoPostgresFlowTest(unittest.IsolatedAsyncioTestCase):
    async def test_catalog_sale_and_nova_isolation(self):
        from httpx import ASGITransport, AsyncClient
        # Una sola sesión de pruebas por bucle evita compartir conexiones asyncpg entre loops.
        sample_key = uuid4().hex[:10]
        async with SessionLocal() as database:
            bravo_operator = User(
                name="Bravo staging operator",
                email=f"bravo-qa-{sample_key}@example.invalid",
                hashed_password="no-password-login-allowed-in-this-test",
                role="technician",
                is_active=True,
            )
            tshirt = InventoryItem(
                name="Polera de algodón QA",
                category="mercancia",
                stock=25,
                min_stock=3,
                cost_price=Decimal("4000.00"),
                sale_price=Decimal("8000.00"),
                system="bravo",
            )
            mug = InventoryItem(
                name="Tazón de cerámica QA",
                category="mercancia",
                stock=16,
                min_stock=2,
                cost_price=Decimal("2000.00"),
                sale_price=Decimal("4500.00"),
                system="bravo",
            )
            nova_product = InventoryItem(
                name="Repuesto exclusivo Nova QA",
                category="mercancia",
                stock=7,
                min_stock=1,
                cost_price=Decimal("3000.00"),
                sale_price=Decimal("5500.00"),
                system="nova",
            )
            database.add_all([bravo_operator, tshirt, mug, nova_product])
            await database.commit()

        bearer = create_token({"sub": str(bravo_operator.id)}, "access")
        headers = {"Authorization": f"Bearer {bearer}"}
        client_phone = f"9{sample_key[:8]}"
        quoted_items = [
            {"catalog_product_id": tshirt.id, "variant": "Talla M · negro", "quantity": 2},
            {"catalog_product_id": mug.id, "variant": "Blanco", "quantity": 1},
        ]
        expected_total = Decimal("20500.00")

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://ci.local",
            headers=headers,
            timeout=15,
        ) as http_client:
            catalog_response = await http_client.get("/bravo/catalog")
            self.assertEqual(catalog_response.status_code, 200, catalog_response.text)
            catalog_ids = {product["id"] for product in catalog_response.json()}
            self.assertIn(tshirt.id, catalog_ids)
            self.assertIn(mug.id, catalog_ids)
            self.assertNotIn(nova_product.id, catalog_ids)

            nova_quote = await http_client.post("/bravo/quote", json={
                "items": [{"catalog_product_id": nova_product.id, "quantity": 1}],
            })
            self.assertEqual(nova_quote.status_code, 422, nova_quote.text)

            quote_response = await http_client.post("/bravo/quote", json={"items": quoted_items})
            self.assertEqual(quote_response.status_code, 200, quote_response.text)
            self.assertEqual(
                Decimal(str(quote_response.json()["expected_total"])), expected_total
            )

            order_request = {
                "new_client": {"name": "Cliente Bravo QA", "phone": client_phone},
                "items": quoted_items,
                "reported_issue": "Impresión frontal con logo de prueba",
                "expected_total": "20500.00",
                "deposit": "5000.00",
            }
            wrong_quote = await http_client.post(
                "/bravo/orders", json={**order_request, "expected_total": "1.00"}
            )
            self.assertEqual(wrong_quote.status_code, 409, wrong_quote.text)
            async with SessionLocal() as database:
                leaked_client = await database.scalar(
                    select(Client).where(Client.phone == client_phone)
                )
                self.assertIsNone(leaked_client, "Cliente parcial tras una cotización rechazada")

            created_response = await http_client.post("/bravo/orders", json=order_request)
            self.assertEqual(created_response.status_code, 201, created_response.text)
            created = created_response.json()
            order_id = created["id"]
            self.assertTrue(created["order_number"].startswith("BRV-"))
            self.assertEqual(created["system"], "bravo")
            self.assertEqual(len(created["items"]), 2)
            self.assertEqual(
                Decimal(str(created["repair_cost"])), expected_total
            )
            self.assertNotIn("device_password", created)
            self.assertNotIn("device_password_encrypted", created)

            # El precio queda inmóvil si el catálogo cambia después del pedido.
            changed_price = await http_client.patch(
                f"/bravo/inventory/{tshirt.id}", json={"sale_price": "9000.00"}
            )
            self.assertEqual(changed_price.status_code, 200, changed_price.text)
            saved_response = await http_client.get(f"/bravo/orders/{order_id}")
            self.assertEqual(saved_response.status_code, 200)
            saved = saved_response.json()
            self.assertEqual(Decimal(str(saved["items"][0]["unit_price"])), Decimal("8000.00"))
            self.assertEqual(Decimal(str(saved["repair_cost"])), expected_total)

            forbidden_edit = await http_client.patch(
                f"/bravo/orders/{order_id}", json={"repair_cost": "1.00"}
            )
            self.assertEqual(forbidden_edit.status_code, 422)

            status_response = await http_client.patch(
                f"/bravo/orders/{order_id}/status",
                json={"new_status": "en_reparacion"},
            )
            self.assertEqual(status_response.status_code, 200, status_response.text)
            self.assertEqual(status_response.json()["status"], "en_reparacion")
            self.assertTrue(status_response.json()["history"])

            # Las rutas antiguas de Nova no permiten leer ni mutar órdenes Bravo.
            legacy_get = await http_client.get(f"/repairs/{order_id}")
            self.assertEqual(legacy_get.status_code, 404, legacy_get.text)
            legacy_patch = await http_client.patch(
                f"/repairs/{order_id}", json={"brand": "alteración no autorizada"}
            )
            self.assertEqual(legacy_patch.status_code, 404, legacy_patch.text)

            async with SessionLocal() as database:
                persisted_lines = (
                    await database.execute(
                        select(BravoOrderLine).where(BravoOrderLine.repair_id == order_id)
                    )
                ).scalars().all()
                self.assertEqual(len(persisted_lines), 2)
                self.assertEqual(
                    sum((line.line_total for line in persisted_lines), Decimal("0")),
                    expected_total,
                )
                stock_after_order = await database.get(InventoryItem, tshirt.id)
                self.assertEqual(stock_after_order.stock, 25, "Cotizar no descuenta stock")
                persisted_order = await database.get(Repair, order_id)
                self.assertEqual(persisted_order.system, "bravo")

        await engine.dispose()


if __name__ == "__main__":
    unittest.main()
