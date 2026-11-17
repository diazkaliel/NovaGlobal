"""Prueba real de Bravo contra PostgreSQL efímero, sin credenciales de producción."""
import os
import asyncio
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
                role="admin",
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
            supply = InventoryItem(
                name="Papel de sublimación QA",
                category="insumo",
                stock=5,
                min_stock=1,
                cost_price=Decimal("300.00"),
                sale_price=Decimal("0.00"),
                system="bravo",
            )
            database.add_all([bravo_operator, tshirt, mug, nova_product, supply])
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
            self.assertNotIn(supply.id, catalog_ids)
            supply_response = await http_client.get("/bravo/inventory", params={"category": "insumo"})
            self.assertEqual(supply_response.status_code, 200, supply_response.text)
            supply_ids = {item["id"] for item in supply_response.json()}
            self.assertIn(supply.id, supply_ids)
            self.assertNotIn(tshirt.id, supply_ids)

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

            order_headers = {"Idempotency-Key": str(uuid4())}
            created_response, concurrent_response = await asyncio.gather(
                http_client.post("/bravo/orders", json=order_request, headers=order_headers),
                http_client.post("/bravo/orders", json=order_request, headers=order_headers),
            )
            self.assertEqual(concurrent_response.status_code, 201, concurrent_response.text)
            self.assertEqual(created_response.json(), concurrent_response.json())
            changed_request = await http_client.post(
                "/bravo/orders", json={**order_request, "deposit": "6000.00"}, headers=order_headers,
            )
            self.assertEqual(changed_request.status_code, 409, changed_request.text)
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
            replay = await http_client.post("/bravo/orders", json=order_request, headers=order_headers)
            self.assertEqual(replay.status_code, 201, replay.text)
            self.assertEqual(replay.json(), created)
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

            materials_url = f"/bravo/orders/{order_id}/materials"
            material_headers = {"Idempotency-Key": str(uuid4())}
            insufficient = await http_client.post(
                materials_url,
                json=[{"item_id": supply.id, "quantity": 1}, {"item_id": supply.id, "quantity": 6}],
                headers=material_headers,
            )
            self.assertEqual(insufficient.status_code, 400, insufficient.text)
            consumed, consumed_concurrently = await asyncio.gather(
                http_client.post(materials_url, json=[{"item_id": supply.id, "quantity": 4}], headers=material_headers),
                http_client.post(materials_url, json=[{"item_id": supply.id, "quantity": 4}], headers=material_headers),
            )
            self.assertEqual(consumed_concurrently.status_code, 201, consumed_concurrently.text)
            self.assertEqual(consumed.json(), consumed_concurrently.json())
            replay_consumption = await http_client.post(
                materials_url, json=[{"item_id": supply.id, "quantity": 4}], headers=material_headers,
            )
            self.assertEqual(replay_consumption.status_code, 201, replay_consumption.text)
            self.assertEqual(replay_consumption.json(), consumed.json())
            new_consumption = await http_client.post(
                materials_url, json=[{"item_id": supply.id, "quantity": 4}],
                headers={"Idempotency-Key": str(uuid4())},
            )
            self.assertEqual(new_consumption.status_code, 400, new_consumption.text)
            self.assertEqual(consumed.status_code, 201, consumed.text)
            self.assertEqual(len(consumed.json()), 1)
            self.assertEqual(consumed.json()[0]["quantity"], 4)

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
                remaining_supply = await database.get(InventoryItem, supply.id)
                self.assertEqual(remaining_supply.stock, 1)
                persisted_order = await database.get(Repair, order_id)
                self.assertEqual(persisted_order.system, "bravo")

            # Nova usa una secuencia que admite concurrencia y huecos por borrado.
            async with SessionLocal() as database:
                existing_numbers = (await database.scalars(
                    select(Repair.order_number).where(Repair.order_number.op("~")("^ORD-[0-9]+$"))
                )).all()
                previous_max = max((int(number[4:]) for number in existing_numbers), default=0)
            nova_request = {
                "client_id": created["client_id"], "device_type": "telefono",
                "brand": "Prueba", "model": "QA", "reported_issue": "Prueba de numeración",
            }
            first_nova, second_nova = await asyncio.gather(
                http_client.post("/repairs/", json=nova_request),
                http_client.post("/repairs/", json=nova_request),
            )
            self.assertEqual(first_nova.status_code, 201, first_nova.text)
            self.assertEqual(second_nova.status_code, 201, second_nova.text)
            nova_numbers = [int(response.json()["order_number"][4:]) for response in [first_nova, second_nova]]
            self.assertEqual(len(set(nova_numbers)), 2)
            self.assertGreater(min(nova_numbers), previous_max)
            deleted_nova = await http_client.delete(f"/repairs/{first_nova.json()['id']}")
            self.assertEqual(deleted_nova.status_code, 204, deleted_nova.text)
            third_nova = await http_client.post("/repairs/", json=nova_request)
            self.assertEqual(third_nova.status_code, 201, third_nova.text)
            self.assertGreater(int(third_nova.json()["order_number"][4:]), max(nova_numbers))

            # Archivar conserva referencias y excluye productos de nuevas operaciones.
            for product_id in [tshirt.id, supply.id]:
                archived = await http_client.delete(f"/bravo/inventory/{product_id}")
                self.assertEqual(archived.status_code, 204, archived.text)
                repeated_archive = await http_client.delete(f"/bravo/inventory/{product_id}")
                self.assertEqual(repeated_archive.status_code, 204, repeated_archive.text)
            active_inventory = await http_client.get("/bravo/inventory")
            active_ids = {item["id"] for item in active_inventory.json()}
            self.assertNotIn(tshirt.id, active_ids)
            self.assertNotIn(supply.id, active_ids)
            archived_inventory = await http_client.get("/bravo/inventory", params={"archived": True, "limit": 200})
            archived_by_id = {item["id"]: item for item in archived_inventory.json()}
            self.assertTrue(archived_by_id[supply.id]["archived_at"])
            self.assertEqual(archived_by_id[supply.id]["stock"], 1)
            catalog_after_archive = await http_client.get("/bravo/catalog")
            self.assertNotIn(tshirt.id, {item["id"] for item in catalog_after_archive.json()})
            archived_quote = await http_client.post("/bravo/quote", json={"items": quoted_items})
            self.assertEqual(archived_quote.status_code, 422, archived_quote.text)
            archived_order = await http_client.post("/bravo/orders", json={
                "client_id": created["client_id"], "items": quoted_items, "expected_total": "22500.00",
            })
            self.assertEqual(archived_order.status_code, 422, archived_order.text)
            archived_consumption = await http_client.post(
                materials_url, json=[{"item_id": supply.id, "quantity": 1}],
            )
            self.assertEqual(archived_consumption.status_code, 409, archived_consumption.text)

            # La antigua acción DELETE cancela y mantiene la ficha consultable.
            cancellation = await http_client.delete(f"/bravo/orders/{order_id}")
            self.assertEqual(cancellation.status_code, 204, cancellation.text)
            repeated_cancellation = await http_client.delete(f"/bravo/orders/{order_id}")
            self.assertEqual(repeated_cancellation.status_code, 204, repeated_cancellation.text)
            retained_response = await http_client.get(f"/bravo/orders/{order_id}")
            self.assertEqual(retained_response.status_code, 200, retained_response.text)
            retained = retained_response.json()
            self.assertEqual(retained["status"], "cancelado")
            self.assertEqual(retained["items"], created["items"])
            self.assertEqual(len(retained["materials"]), 1)
            self.assertEqual(retained["materials"][0]["quantity"], 4)
            cancellations = [entry for entry in retained["history"] if entry["new_status"] == "cancelado"]
            self.assertEqual(len(cancellations), 1)
            self.assertEqual(cancellations[0]["changed_by_id"], bravo_operator.id)
            rejected_consumption = await http_client.post(
                materials_url, json=[{"item_id": supply.id, "quantity": 1}],
            )
            self.assertEqual(rejected_consumption.status_code, 409, rejected_consumption.text)
            self.assertIn("Reabre", rejected_consumption.json()["detail"])
            replay_after_cancellation = await http_client.post(
                materials_url, json=[{"item_id": supply.id, "quantity": 4}], headers=material_headers,
            )
            self.assertEqual(replay_after_cancellation.status_code, 201, replay_after_cancellation.text)
            async with SessionLocal() as database:
                self.assertEqual((await database.get(InventoryItem, supply.id)).stock, 1)

        await engine.dispose()


if __name__ == "__main__":
    unittest.main()
