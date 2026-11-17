"""Upgrade real disposable databases from both pre-merge migration branches."""
import asyncio
import os
import subprocess
import sys
import unittest
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool


@unittest.skipUnless(os.environ.get("BRAVO_POSTGRES_TESTS") == "1", "Requires disposable PostgreSQL")
class MigrationUpgradePathsTest(unittest.TestCase):
    def test_previous_heads_preserve_inventory_and_numbers(self):
        asyncio.run(self.verify_paths())

    async def verify_paths(self):
        import app.models
        from app.db.database import Base
        url = make_url(os.environ["DATABASE_URL"])
        admin = create_async_engine(url, isolation_level="AUTOCOMMIT", poolclass=NullPool)
        for revision in ("011919018867", "a94e82b51f60"):
            name = "merge_upgrade_" + uuid4().hex[:12]
            async with admin.connect() as conn:
                await conn.execute(text(f'CREATE DATABASE "{name}"'))
            test_url = url.set(database=name)
            engine = create_async_engine(test_url, poolclass=NullPool)
            env = {**os.environ, "DATABASE_URL": test_url.render_as_string(hide_password=False)}
            def migrate(target):
                result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", target],
                                        env=env, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
            try:
                migrate(revision)
                async with engine.begin() as conn:
                    if revision == "011919018867":
                        # Master used create_all and startup SQL before migrations.
                        names = ["pricing_rules", "attendance_records", "bravo_orders", "products_3d",
                                 "quotations", "bravo_order_comments", "bravo_order_history",
                                 "bravo_order_inventory", "customization_sessions", "quotation_items",
                                 "bravo_order_lines"]
                        await conn.run_sync(lambda sync: Base.metadata.create_all(
                            sync, tables=[Base.metadata.tables[n] for n in names]))
                        await conn.execute(text("CREATE SEQUENCE bravo_order_number_seq START 100"))
                        await conn.execute(text("SELECT nextval('bravo_order_number_seq')"))
                        await conn.execute(text("ALTER TABLE users ADD COLUMN system VARCHAR(20) DEFAULT 'all' NOT NULL"))
                        await conn.execute(text("ALTER TABLE clients ADD COLUMN system VARCHAR(20) DEFAULT 'nova' NOT NULL"))
                        await conn.execute(text("ALTER TABLE web_config ADD COLUMN content JSON DEFAULT '{}'::json NOT NULL"))
                    await conn.execute(text("INSERT INTO inventory (name, category, stock, min_stock, cost_price, sale_price, system) VALUES ('Existing supply', 'insumo', 17, 2, 300, 0, 'bravo')"))
                migrate("head")
                migrate("head")
                async with engine.connect() as conn:
                    self.assertEqual(await conn.scalar(text("SELECT stock FROM inventory WHERE name='Existing supply'")), 17)
                    self.assertEqual(await conn.scalar(text("SELECT version_num FROM alembic_version")), "ce62d881f205")
                    if revision == "011919018867":
                        self.assertEqual(await conn.scalar(text("SELECT nextval('bravo_order_number_seq')")), 101)
            finally:
                await engine.dispose()
                async with admin.connect() as conn:
                    await conn.execute(text(f'DROP DATABASE "{name}"'))
        await admin.dispose()
