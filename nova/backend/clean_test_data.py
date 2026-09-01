import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.db.database import engine

async def clean_all_test_data():
    async with engine.connect() as conn:
        # Obtener todas las tablas reales en la base de datos pública
        result = await conn.execute(text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT IN ('users', 'alembic_version', 'web_config', 'bravo_machines', 'screen_prices', 'bravo_brand_kits');
        """))
        tables = [row[0] for row in result.fetchall()]
        print("Tablas a vaciar:", tables)
        
        if tables:
            tables_str = ", ".join(f'"{t}"' for t in tables)
            query = f"TRUNCATE TABLE {tables_str} RESTART IDENTITY CASCADE;"
            await conn.execute(text(query))
            await conn.commit()
            print("✓ ¡Todas las tablas de pruebas e inventario fueron vaciadas exitosamente!")

if __name__ == "__main__":
    asyncio.run(clean_all_test_data())
