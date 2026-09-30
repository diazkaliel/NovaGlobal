import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.db.database import engine, Base
import app.models  # Import all models so metadata is populated

async def sync_schema():
    print("Iniciando sincronización de esquema de Base de Datos...")
    async with engine.begin() as conn:
        # 1. Crear todas las tablas que no existan
        await conn.run_sync(Base.metadata.create_all)
        print("Tablas verificadas/creadas.")

        # 2. Verificar y agregar columnas que falten en tablas existentes
        # Columna users.system
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS system VARCHAR(20) DEFAULT 'all' NOT NULL;"))
            print("users.system OK")
        except Exception as e:
            print(f"users.system: {e}")

        # Columnas en inventory
        try:
            await conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS system VARCHAR(20) DEFAULT 'nova' NOT NULL;"))
            await conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;"))
            print("inventory columns OK")
        except Exception as e:
            print(f"inventory: {e}")

        # Columnas en repairs
        try:
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS system VARCHAR(20) DEFAULT 'nova' NOT NULL;"))
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;"))
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS mockup_file_url TEXT;"))
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS design_file_url TEXT;"))
            print("repairs columns OK")
        except Exception as e:
            print(f"repairs: {e}")

        # Columnas en clients y aislamiento por tienda
        try:
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS system VARCHAR(20) DEFAULT 'nova' NOT NULL;"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS rut VARCHAR(20);"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS region VARCHAR(100);"))

            # En PostgreSQL, liberamos la unicidad global para permitir unicidad compuesta por tienda
            await conn.execute(text("ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_phone_key;"))
            await conn.execute(text("ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_rut_key;"))
            await conn.execute(text("ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_key;"))

            # Crear índices únicos compuestos por tienda
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_client_phone_system ON clients (phone, system);"))
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_client_rut_system ON clients (rut, system) WHERE rut IS NOT NULL;"))
            print("clients system isolation OK")
        except Exception as e:
            print(f"clients: {e}")

        # Migrar datos históricos de 'repairs' con system='bravo' hacia 'bravo_orders' sin pérdida
        try:
            await conn.execute(text("""
                INSERT INTO bravo_orders (
                    order_number, client_id, technician_id, item_category, brand, model,
                    quantity, reported_issue, accessories, print_technique, print_location, print_dimensions,
                    design_file_url, mockup_file_url, status, estimated_delivery, order_cost,
                    deposit, deposit_payment_method, final_payment_method, parent_order_id,
                    is_split_child, created_at, updated_at
                )
                SELECT 
                    r.order_number, r.client_id, r.technician_id, r.device_type, r.brand, r.model,
                    1, r.reported_issue, r.accessories, r.print_technique, r.print_location, r.print_dimensions,
                    r.design_file_url, r.mockup_file_url, r.status, r.estimated_delivery, COALESCE(r.repair_cost, 0),
                    COALESCE(r.deposit, 0), r.deposit_payment_method, r.final_payment_method, NULL,
                    r.is_split_child, r.created_at, r.updated_at

                FROM repairs r
                WHERE r.system = 'bravo'
                  AND NOT EXISTS (
                      SELECT 1 FROM bravo_orders b WHERE b.order_number = r.order_number
                  );
            """))


            # Asignar a 'bravo' los clientes que solo han tenido pedidos textiles
            await conn.execute(text("""
                UPDATE clients
                SET system = 'bravo'
                WHERE id IN (
                    SELECT DISTINCT client_id FROM repairs WHERE system = 'bravo'
                )
                AND id NOT IN (
                    SELECT DISTINCT client_id FROM repairs WHERE system = 'nova'
                );
            """))
            print("bravo_orders backfill y asignación de clientes OK")
        except Exception as e:
            print(f"bravo_orders backfill: {e}")

        # Columna content en web_config
        try:
            await conn.execute(text("ALTER TABLE web_config ADD COLUMN IF NOT EXISTS content JSON DEFAULT '{}'::json NOT NULL;"))
            print("web_config.content OK")
        except Exception as e:
            print(f"web_config: {e}")

    print("Esquema sincronizado exitosamente con PostgreSQL.")


if __name__ == "__main__":
    asyncio.run(sync_schema())
