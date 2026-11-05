"""Contratos de Bravo sin acceso a la base de datos real."""
import os
import unittest
from unittest.mock import AsyncMock

from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:local@127.0.0.1/bravo_test")
os.environ.setdefault("SECRET_KEY", "test-only-bravo-contract-key-not-used-in-production")

from app.routers.bravo import (  # noqa: E402
    BravoOrderCreate, BravoOrderDetail, scoped_order, scoped_inventory
)


class BravoOrderContractTests(unittest.TestCase):
    def test_order_requires_exactly_one_customer_source(self):
        base = {
            "device_type": "polera",
            "brand": "algodón negro",
            "model": "talla L",
            "reported_issue": "Estampado frontal",
        }
        with self.assertRaises(ValueError):
            BravoOrderCreate(**base)
        with self.assertRaises(ValueError):
            BravoOrderCreate(**base, client_id=1, new_client={
                "name": "Cliente", "phone": "912345678"
            })
        valid = BravoOrderCreate(**base, client_id=1)
        self.assertEqual(valid.client_id, 1)

    def test_deposit_must_not_exceed_total(self):
        base = {
            "client_id": 1,
            "device_type": "tazón",
            "brand": "cerámica",
            "model": "blanco",
            "reported_issue": "Sublimación",
        }
        with self.assertRaises(ValueError):
            BravoOrderCreate(**base, repair_cost=10000, deposit=12000)
        with self.assertRaises(ValueError):
            BravoOrderCreate(**base, deposit=1000)
        with self.assertRaises(ValueError):
            BravoOrderCreate(**base, repair_cost=-1)

    def test_bravo_responses_do_not_expose_device_passwords(self):
        self.assertNotIn("device_password", BravoOrderDetail.model_fields)
        self.assertNotIn("device_password_encrypted", BravoOrderDetail.model_fields)


class BravoResourceScopeTests(unittest.IsolatedAsyncioTestCase):
    async def test_unknown_or_nova_order_is_not_accessible(self):
        db = AsyncMock()
        db.execute.return_value.scalar_one_or_none.return_value = None
        with self.assertRaises(HTTPException) as failure:
            await scoped_order(db, 72)
        self.assertEqual(failure.exception.status_code, 404)

    async def test_unknown_or_nova_inventory_is_not_accessible(self):
        db = AsyncMock()
        db.execute.return_value.scalar_one_or_none.return_value = None
        with self.assertRaises(HTTPException) as failure:
            await scoped_inventory(db, 72)
        self.assertEqual(failure.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
