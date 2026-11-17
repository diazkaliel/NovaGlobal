"""Regresiones de acceso y validación de insumos, sin base de datos externa."""
import os
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@127.0.0.1/test_unused")
os.environ.setdefault("SECRET_KEY", "local-test-only-access-inventory")

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.main import app
from app.models.inventory import InventoryItem
from app.schemas.inventory import InventoryItemCreate, InventoryItemResponse, InventoryItemUpdate
from app.services.inventory_service import update_item


class InventoryValidationTests(unittest.TestCase):
    def test_supply_can_omit_sale_price(self):
        item = InventoryItemCreate(name="Papel", category="insumo", cost_price=300)
        self.assertEqual(item.sale_price, Decimal("0"))

    def test_existing_supply_with_zero_sale_price_serializes(self):
        item = InventoryItemResponse(
            id=1, name="Papel", category="insumo", cost_price=300,
            sale_price=0, created_at=datetime.now(timezone.utc),
        )
        self.assertEqual(item.cost_price, Decimal("300"))

    def test_merchandise_price_rule_remains_enforced(self):
        for price in [None, 0, 299]:
            with self.subTest(price=price), self.assertRaises(ValidationError):
                InventoryItemCreate(
                    name="Tazón", category="mercancia", cost_price=300, sale_price=price,
                )

    def test_supply_rejects_negative_stock_and_prices(self):
        for field in ["stock", "min_stock", "cost_price", "sale_price"]:
            with self.subTest(field=field), self.assertRaises(ValidationError):
                InventoryItemCreate(**{
                    "name": "Papel", "category": "insumo", "cost_price": 300, field: -1,
                })


class AccessAndInventoryApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from httpx import ASGITransport, AsyncClient
        self.database = AsyncMock()
        self.database.add = MagicMock(side_effect=self.assign_identity)
        async def test_db():
            yield self.database
        self.previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = test_db
        self.http = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        self.payload = {
            "name": "Operador", "email": "operator@example.com",
            "password": "test-password", "role": "admin",
        }

    def assign_identity(self, item):
        item.id = 1
        item.created_at = datetime.now(timezone.utc)

    def authenticate(self, role):
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
            id=1, role=role, is_active=True,
        )

    async def asyncTearDown(self):
        await self.http.aclose()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(self.previous_overrides)

    async def test_registration_rejects_anonymous(self):
        response = await self.http.post("/auth/register", json=self.payload)
        self.assertIn(response.status_code, [401, 403])
        self.database.commit.assert_not_awaited()

    async def test_registration_rejects_technician(self):
        self.authenticate("technician")
        response = await self.http.post("/auth/register", json=self.payload)
        self.assertEqual(response.status_code, 403)
        self.database.commit.assert_not_awaited()

    async def test_administrator_can_register_user(self):
        self.authenticate("admin")
        user = SimpleNamespace(
            id=2, name="Operador", email="operator@example.com", role="admin",
            is_active=True, created_at=datetime.now(timezone.utc),
        )
        with patch("app.routers.auth.register_user", new=AsyncMock(return_value=user)) as register:
            response = await self.http.post("/auth/register", json=self.payload)
            self.assertEqual(response.status_code, 201, response.text)
            register.assert_awaited_once()
            self.assertNotIn("password", response.json())

    async def test_registration_rejects_unknown_role(self):
        self.authenticate("admin")
        response = await self.http.post("/auth/register", json={**self.payload, "role": "owner"})
        self.assertEqual(response.status_code, 422)

    async def test_technician_cannot_delete_archive_or_cancel(self):
        self.authenticate("technician")
        for path in [
            "/clients/1", "/repairs/1", "/inventory/1", "/screen-prices/1",
            "/bravo/orders/1", "/bravo/inventory/1",
        ]:
            with self.subTest(path=path):
                response = await self.http.delete(path)
                self.assertEqual(response.status_code, 403, response.text)
        for path in ["/repairs/1/status", "/bravo/orders/1/status"]:
            with self.subTest(path=path):
                response = await self.http.patch(path, json={"new_status": "cancelado"})
                self.assertEqual(response.status_code, 403, response.text)
        self.database.execute.assert_not_awaited()
        self.database.commit.assert_not_awaited()

    async def test_admin_can_delete_client(self):
        self.authenticate("admin")
        with patch("app.routers.clients.delete_client", new=AsyncMock()) as delete:
            response = await self.http.delete("/clients/1")
            self.assertEqual(response.status_code, 204, response.text)
            delete.assert_awaited_once_with(self.database, 1)

    async def test_supply_creation_through_both_apis(self):
        self.authenticate("technician")
        for path, system in [("/inventory/", "nova"), ("/bravo/inventory", "bravo")]:
            response = await self.http.post(path, json={
                "name": "Papel", "category": "insumo", "cost_price": 300,
            })
            self.assertEqual(response.status_code, 201, response.text)
            self.assertEqual(Decimal(response.json()["sale_price"]), 0)
            self.assertEqual(response.json()["system"], system)

    async def test_supply_patch_and_category_change(self):
        self.authenticate("technician")
        item = InventoryItem(
            id=1, name="Papel", category="insumo", cost_price=Decimal("300"),
            sale_price=Decimal("0"), stock=5, min_stock=1, system="bravo",
            created_at=datetime.now(timezone.utc),
        )
        result = MagicMock()
        result.scalar_one_or_none.return_value = item
        self.database.execute.return_value = result
        response = await self.http.patch("/bravo/inventory/1", json={"cost_price": 500})
        self.assertEqual(response.status_code, 200, response.text)
        self.database.commit.reset_mock()
        response = await self.http.patch("/bravo/inventory/1", json={"category": "mercancia"})
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(item.category, "insumo")
        self.database.commit.assert_not_awaited()
        response = await self.http.patch(
            "/bravo/inventory/1", json={"category": "mercancia", "sale_price": 700},
        )
        self.assertEqual(response.status_code, 200, response.text)

    async def test_partial_update_rejects_null_and_negative_values(self):
        item = InventoryItem(
            id=1, name="Papel", category="insumo", cost_price=Decimal("300"),
            sale_price=Decimal("0"), stock=5, min_stock=1, system="bravo",
        )
        result = MagicMock()
        result.scalar_one_or_none.return_value = item
        self.database.execute.return_value = result
        for changes in [{"cost_price": None}, {"stock": -1}, {"category": "unknown"}]:
            with self.subTest(changes=changes), self.assertRaises(HTTPException) as failure:
                await update_item(self.database, 1, InventoryItemUpdate(**changes))
            self.assertEqual(failure.exception.status_code, 422)
        self.database.commit.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
