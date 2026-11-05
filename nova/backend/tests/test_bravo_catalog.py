"""Checks aislados: reglas comerciales, dinero Decimal y propiedad de catálogo."""
import os
import unittest
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:local@127.0.0.1/bravo_test")
os.environ.setdefault("SECRET_KEY", "test-only-bravo-contract-key-not-used-in-production")

from app.routers.bravo import BravoOrderCreate  # noqa: E402
from app.services.bravo_catalog import quote_catalog_items  # noqa: E402


class CatalogOrderPayloadTests(unittest.TestCase):
    def test_multi_item_order_does_not_require_legacy_device_fields(self):
        order = BravoOrderCreate(
            client_id=1,
            items=[
                {"catalog_product_id": 12, "quantity": 2, "variant": "M · negro"},
                {"catalog_product_id": 13, "quantity": 1, "variant": "blanco"},
            ],
            expected_total="15990.00",
            deposit="5000.00",
        )
        self.assertIsNone(order.device_type)
        self.assertEqual(len(order.items), 2)

    def test_catalog_order_never_accepts_client_specified_total(self):
        with self.assertRaises(ValueError):
            BravoOrderCreate(
                client_id=1,
                items=[{"catalog_product_id": 12, "quantity": 1}],
                expected_total=10000,
                repair_cost=1,
            )

    def test_catalog_order_requires_displayed_price_confirmation(self):
        with self.assertRaises(ValueError):
            BravoOrderCreate(
                client_id=1, items=[{"catalog_product_id": 12, "quantity": 1}]
            )

    def test_line_validation_rejects_invalid_quantities(self):
        for quantity in [0, -2, 1000, 1.5]:
            with self.subTest(quantity=quantity):
                with self.assertRaises(ValueError):
                    BravoOrderCreate(
                        client_id=1,
                        items=[{"catalog_product_id": 12, "quantity": quantity}],
                        expected_total=10000,
                    )


class CatalogQuoteTests(unittest.IsolatedAsyncioTestCase):
    def database_with(self, products):
        database = AsyncMock()
        database_result = MagicMock()
        database_result.scalars.return_value.all.return_value = products
        database.execute.return_value = database_result
        return database

    async def test_multiline_quote_snapshots_current_prices(self):
        database = self.database_with([
            SimpleNamespace(id=12, name="Polera algodón", system="bravo",
                            category="mercancia", sale_price=Decimal("8990.00")),
            SimpleNamespace(id=13, name="Tazón cerámica", system="bravo",
                            category="mercancia", sale_price=Decimal("4500.00")),
        ])
        request = BravoOrderCreate(
            client_id=1,
            items=[
                {"catalog_product_id": 12, "quantity": 2, "variant": "talla M"},
                {"catalog_product_id": 13, "quantity": 1, "variant": "blanco"},
            ],
            expected_total="22480.00",
        )
        lines, total = await quote_catalog_items(database, request.items)
        self.assertEqual(total, Decimal("22480.00"))
        self.assertEqual(lines[0].product_name, "Polera algodón")
        self.assertEqual(lines[0].line_total, Decimal("17980.00"))
        self.assertEqual(lines[0].variant, "talla M")
        self.assertEqual(lines[1].line_total, Decimal("4500.00"))
        self.assertIsNone(lines[0].repair_id)

    async def test_rejects_missing_or_nova_product(self):
        database = self.database_with([])
        request = BravoOrderCreate(
            client_id=1,
            items=[{"catalog_product_id": 99, "quantity": 1}],
            expected_total=1000,
        )
        with self.assertRaises(HTTPException) as failure:
            await quote_catalog_items(database, request.items)
        self.assertEqual(failure.exception.status_code, 422)

    async def test_independent_system_guard_rejects_misrouted_products(self):
        database = self.database_with([
            SimpleNamespace(id=12, name="Producto Nova", system="nova",
                            category="mercancia", sale_price=Decimal("5000.00")),
        ])
        request = BravoOrderCreate(
            client_id=1,
            items=[{"catalog_product_id": 12, "quantity": 1}],
            expected_total=5000,
        )
        with self.assertRaises(HTTPException) as failure:
            await quote_catalog_items(database, request.items)
        self.assertEqual(failure.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
