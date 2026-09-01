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

        # Columnas en clients
        try:
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS rut VARCHAR(20);"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS region VARCHAR(100);"))
            print("clients columns OK")
        except Exception as e:
            print(f"clients: {e}")

    print("Esquema sincronizado exitosamente con PostgreSQL.")

if __name__ == "__main__":
    asyncio.run(sync_schema())
