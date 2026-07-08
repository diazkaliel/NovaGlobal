import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.models.screen_price import ScreenPrice

SCREENS_SEED_DATA = [
    # ─── Apple (iPhone) ──────────────────────────────────────────────────
    {"brand": "Apple", "model": "iPhone X", "quality": "OLED", "cost_price": 35000.0, "sale_price": 70000.0},
    {"brand": "Apple", "model": "iPhone X", "quality": "In-Cell", "cost_price": 20000.0, "sale_price": 40000.0},
    {"brand": "Apple", "model": "iPhone XR", "quality": "Original", "cost_price": 30000.0, "sale_price": 60000.0},
    {"brand": "Apple", "model": "iPhone XR", "quality": "In-Cell", "cost_price": 22000.0, "sale_price": 44000.0},
    {"brand": "Apple", "model": "iPhone XS", "quality": "OLED", "cost_price": 42000.0, "sale_price": 84000.0},
    {"brand": "Apple", "model": "iPhone XS Max", "quality": "OLED", "cost_price": 55000.0, "sale_price": 110000.0},
    {"brand": "Apple", "model": "iPhone 11", "quality": "Original", "cost_price": 38000.0, "sale_price": 76000.0},
    {"brand": "Apple", "model": "iPhone 11", "quality": "In-Cell", "cost_price": 24000.0, "sale_price": 48000.0},
    {"brand": "Apple", "model": "iPhone 11 Pro", "quality": "OLED", "cost_price": 55000.0, "sale_price": 110000.0},
    {"brand": "Apple", "model": "iPhone 11 Pro Max", "quality": "OLED", "cost_price": 70000.0, "sale_price": 140000.0},
    {"brand": "Apple", "model": "iPhone 12 mini", "quality": "OLED", "cost_price": 60000.0, "sale_price": 120000.0},
    {"brand": "Apple", "model": "iPhone 12", "quality": "OLED", "cost_price": 65000.0, "sale_price": 130000.0},
    {"brand": "Apple", "model": "iPhone 12", "quality": "In-Cell", "cost_price": 35000.0, "sale_price": 70000.0},
    {"brand": "Apple", "model": "iPhone 12 Pro", "quality": "OLED", "cost_price": 75000.0, "sale_price": 150000.0},
    {"brand": "Apple", "model": "iPhone 12 Pro Max", "quality": "OLED", "cost_price": 90000.0, "sale_price": 180000.0},
    {"brand": "Apple", "model": "iPhone 13 mini", "quality": "OLED", "cost_price": 70000.0, "sale_price": 140000.0},
    {"brand": "Apple", "model": "iPhone 13", "quality": "OLED", "cost_price": 80000.0, "sale_price": 160000.0},
    {"brand": "Apple", "model": "iPhone 13 Pro", "quality": "OLED", "cost_price": 120000.0, "sale_price": 240000.0},
    {"brand": "Apple", "model": "iPhone 13 Pro Max", "quality": "OLED", "cost_price": 140000.0, "sale_price": 280000.0},
    {"brand": "Apple", "model": "iPhone 14", "quality": "OLED", "cost_price": 110000.0, "sale_price": 220000.0},
    {"brand": "Apple", "model": "iPhone 14 Plus", "quality": "OLED", "cost_price": 130000.0, "sale_price": 260000.0},
    {"brand": "Apple", "model": "iPhone 14 Pro", "quality": "OLED", "cost_price": 150000.0, "sale_price": 300000.0},
    {"brand": "Apple", "model": "iPhone 14 Pro Max", "quality": "OLED", "cost_price": 170000.0, "sale_price": 340000.0},
    {"brand": "Apple", "model": "iPhone 15", "quality": "Original", "cost_price": 180000.0, "sale_price": 360000.0},
    {"brand": "Apple", "model": "iPhone 15 Plus", "quality": "Original", "cost_price": 20000.0, "sale_price": 400000.0},
    {"brand": "Apple", "model": "iPhone 15 Pro", "quality": "Original", "cost_price": 220000.0, "sale_price": 440000.0},
    {"brand": "Apple", "model": "iPhone 15 Pro Max", "quality": "Original", "cost_price": 250000.0, "sale_price": 500000.0},

    # ─── Samsung (Galaxy S, Note & A) ────────────────────────────────────
    {"brand": "Samsung", "model": "Galaxy S9", "quality": "OLED", "cost_price": 45000.0, "sale_price": 90000.0},
    {"brand": "Samsung", "model": "Galaxy S10", "quality": "OLED", "cost_price": 55000.0, "sale_price": 110000.0},
    {"brand": "Samsung", "model": "Galaxy S10+", "quality": "OLED", "cost_price": 65000.0, "sale_price": 130000.0},
    {"brand": "Samsung", "model": "Galaxy S20", "quality": "OLED", "cost_price": 70000.0, "sale_price": 140000.0},
    {"brand": "Samsung", "model": "Galaxy S20 FE", "quality": "OLED", "cost_price": 45000.0, "sale_price": 90000.0},
    {"brand": "Samsung", "model": "Galaxy S21", "quality": "OLED", "cost_price": 80000.0, "sale_price": 160000.0},
    {"brand": "Samsung", "model": "Galaxy S21 FE", "quality": "OLED", "cost_price": 55000.0, "sale_price": 110000.0},
    {"brand": "Samsung", "model": "Galaxy S21+", "quality": "OLED", "cost_price": 90000.0, "sale_price": 180000.0},
    {"brand": "Samsung", "model": "Galaxy S21 Ultra", "quality": "OLED", "cost_price": 130000.0, "sale_price": 260000.0},
    {"brand": "Samsung", "model": "Galaxy S22", "quality": "OLED", "cost_price": 90000.0, "sale_price": 180000.0},
    {"brand": "Samsung", "model": "Galaxy S22+", "quality": "OLED", "cost_price": 110000.0, "sale_price": 220000.0},
    {"brand": "Samsung", "model": "Galaxy S22 Ultra", "quality": "OLED", "cost_price": 160000.0, "sale_price": 320000.0},
    {"brand": "Samsung", "model": "Galaxy S23", "quality": "OLED", "cost_price": 120000.0, "sale_price": 240000.0},
    {"brand": "Samsung", "model": "Galaxy S23 Ultra", "quality": "OLED", "cost_price": 180000.0, "sale_price": 360000.0},
    {"brand": "Samsung", "model": "Galaxy S24", "quality": "OLED", "cost_price": 140000.0, "sale_price": 280000.0},
    {"brand": "Samsung", "model": "Galaxy S24 Ultra", "quality": "OLED", "cost_price": 210000.0, "sale_price": 420000.0},
    {"brand": "Samsung", "model": "Galaxy Note 10", "quality": "OLED", "cost_price": 85000.0, "sale_price": 170000.0},
    {"brand": "Samsung", "model": "Galaxy Note 20 Ultra", "quality": "OLED", "cost_price": 150000.0, "sale_price": 300000.0},
    {"brand": "Samsung", "model": "Galaxy A10", "quality": "Original", "cost_price": 15000.0, "sale_price": 30000.0},
    {"brand": "Samsung", "model": "Galaxy A20", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Samsung", "model": "Galaxy A30", "quality": "Original", "cost_price": 22000.0, "sale_price": 44000.0},
    {"brand": "Samsung", "model": "Galaxy A31", "quality": "Original", "cost_price": 25000.0, "sale_price": 50000.0},
    {"brand": "Samsung", "model": "Galaxy A32", "quality": "Original", "cost_price": 28000.0, "sale_price": 56000.0},
    {"brand": "Samsung", "model": "Galaxy A50", "quality": "Original", "cost_price": 25000.0, "sale_price": 50000.0},
    {"brand": "Samsung", "model": "Galaxy A51", "quality": "Original", "cost_price": 32000.0, "sale_price": 64000.0},
    {"brand": "Samsung", "model": "Galaxy A52", "quality": "Original", "cost_price": 40000.0, "sale_price": 80000.0},
    {"brand": "Samsung", "model": "Galaxy A52", "quality": "In-Cell", "cost_price": 22000.0, "sale_price": 44000.0},
    {"brand": "Samsung", "model": "Galaxy A53", "quality": "Original", "cost_price": 45000.0, "sale_price": 90000.0},
    {"brand": "Samsung", "model": "Galaxy A54", "quality": "Original", "cost_price": 50000.0, "sale_price": 100000.0},
    {"brand": "Samsung", "model": "Galaxy A71", "quality": "Original", "cost_price": 48000.0, "sale_price": 96000.0},
    {"brand": "Samsung", "model": "Galaxy A72", "quality": "Original", "cost_price": 55000.0, "sale_price": 110000.0},
    {"brand": "Samsung", "model": "Galaxy A73", "quality": "Original", "cost_price": 65000.0, "sale_price": 130000.0},

    # ─── Xiaomi (Redmi & POCO) ───────────────────────────────────────────
    {"brand": "Xiaomi", "model": "Redmi 9", "quality": "Original", "cost_price": 16000.0, "sale_price": 32000.0},
    {"brand": "Xiaomi", "model": "Redmi 10", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 9 Pro", "quality": "Original", "cost_price": 24000.0, "sale_price": 48000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 10", "quality": "OLED", "cost_price": 30000.0, "sale_price": 60000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 10 Pro", "quality": "OLED", "cost_price": 35000.0, "sale_price": 70000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 11", "quality": "Original", "cost_price": 28000.0, "sale_price": 56000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 11", "quality": "In-Cell", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 11 Pro", "quality": "OLED", "cost_price": 42000.0, "sale_price": 84000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 12", "quality": "Original", "cost_price": 32000.0, "sale_price": 64000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 12 Pro", "quality": "OLED", "cost_price": 48000.0, "sale_price": 96000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 13", "quality": "Original", "cost_price": 35000.0, "sale_price": 70000.0},
    {"brand": "Xiaomi", "model": "Redmi Note 13 Pro", "quality": "OLED", "cost_price": 58000.0, "sale_price": 116000.0},
    {"brand": "Xiaomi", "model": "POCO X3", "quality": "Original", "cost_price": 22000.0, "sale_price": 44000.0},
    {"brand": "Xiaomi", "model": "POCO X3 Pro", "quality": "Original", "cost_price": 25000.0, "sale_price": 50000.0},
    {"brand": "Xiaomi", "model": "POCO X4 Pro", "quality": "OLED", "cost_price": 45000.0, "sale_price": 90000.0},
    {"brand": "Xiaomi", "model": "POCO X5 Pro", "quality": "OLED", "cost_price": 50000.0, "sale_price": 100000.0},
    {"brand": "Xiaomi", "model": "POCO F3", "quality": "OLED", "cost_price": 48000.0, "sale_price": 96000.0},
    {"brand": "Xiaomi", "model": "POCO F4", "quality": "OLED", "cost_price": 55000.0, "sale_price": 110000.0},
    {"brand": "Xiaomi", "model": "POCO F5", "quality": "OLED", "cost_price": 65000.0, "sale_price": 130000.0},

    # ─── Motorola ───────────────────────────────────────────────────────
    {"brand": "Motorola", "model": "Moto G8 Power", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Motorola", "model": "Moto G9 Play", "quality": "Original", "cost_price": 19000.0, "sale_price": 38000.0},
    {"brand": "Motorola", "model": "Moto G10", "quality": "Original", "cost_price": 17000.0, "sale_price": 34000.0},
    {"brand": "Motorola", "model": "Moto G20", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Motorola", "model": "Moto G30", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Motorola", "model": "Moto G50", "quality": "Original", "cost_price": 22000.0, "sale_price": 44000.0},
    {"brand": "Motorola", "model": "Moto G60", "quality": "Original", "cost_price": 28000.0, "sale_price": 56000.0},
    {"brand": "Motorola", "model": "Moto G71", "quality": "OLED", "cost_price": 38000.0, "sale_price": 76000.0},
    {"brand": "Motorola", "model": "Moto G82", "quality": "OLED", "cost_price": 45000.0, "sale_price": 90000.0},
    {"brand": "Motorola", "model": "Moto G100", "quality": "Original", "cost_price": 35000.0, "sale_price": 70000.0},
    {"brand": "Motorola", "model": "Moto G200", "quality": "Original", "cost_price": 48000.0, "sale_price": 96000.0},
    {"brand": "Motorola", "model": "Moto Edge 30", "quality": "OLED", "cost_price": 60000.0, "sale_price": 120000.0},
    {"brand": "Motorola", "model": "Moto Edge 40", "quality": "OLED", "cost_price": 85000.0, "sale_price": 170000.0},
    {"brand": "Motorola", "model": "Moto G22", "quality": "Original", "cost_price": 16000.0, "sale_price": 32000.0},

    # ─── Huawei ──────────────────────────────────────────────────────────
    {"brand": "Huawei", "model": "P30", "quality": "OLED", "cost_price": 55000.0, "sale_price": 110000.0},
    {"brand": "Huawei", "model": "P30 Lite", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Huawei", "model": "P30 Pro", "quality": "OLED", "cost_price": 95000.0, "sale_price": 190000.0},
    {"brand": "Huawei", "model": "P40", "quality": "OLED", "cost_price": 65000.0, "sale_price": 130000.0},
    {"brand": "Huawei", "model": "P40 Lite", "quality": "Original", "cost_price": 20000.0, "sale_price": 40000.0},
    {"brand": "Huawei", "model": "P40 Pro", "quality": "OLED", "cost_price": 110000.0, "sale_price": 220000.0},
    {"brand": "Huawei", "model": "Mate 20", "quality": "Original", "cost_price": 30000.0, "sale_price": 60000.0},
    {"brand": "Huawei", "model": "Mate 20 Lite", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Huawei", "model": "Mate 20 Pro", "quality": "OLED", "cost_price": 90000.0, "sale_price": 180000.0},
    {"brand": "Huawei", "model": "Mate 30 Pro", "quality": "OLED", "cost_price": 120000.0, "sale_price": 240000.0},
    {"brand": "Huawei", "model": "Y9 Prime", "quality": "Original", "cost_price": 18000.0, "sale_price": 36000.0},
    {"brand": "Huawei", "model": "Y9a", "quality": "Original", "cost_price": 22000.0, "sale_price": 44000.0},
]

async def main():
    async with SessionLocal() as db:
        added_count = 0
        updated_count = 0
        
        for data in SCREENS_SEED_DATA:
            # Consultamos si el modelo con esa marca y calidad ya existe
            result = await db.execute(
                select(ScreenPrice).where(
                    ScreenPrice.brand == data["brand"],
                    ScreenPrice.model == data["model"],
                    ScreenPrice.quality == data["quality"]
                )
            )
            existing = result.scalar_one_or_none()
            
            # Forzamos que la venta sea exactamente 2x costo (regla de negocio del usuario)
            target_sale_price = data["cost_price"] * 2.0
            
            if existing:
                # Si existe, actualizamos los precios para asegurar consistencia
                existing.cost_price = data["cost_price"]
                existing.sale_price = target_sale_price
                updated_count += 1
            else:
                # Si no existe, creamos el nuevo registro
                screen = ScreenPrice(
                    brand=data["brand"],
                    model=data["model"],
                    quality=data["quality"],
                    cost_price=data["cost_price"],
                    sale_price=target_sale_price
                )
                db.add(screen)
                added_count += 1
            
        await db.commit()
            
        print(f"Seeding y Ajuste de Precios completado:")
        print(f"  - Nuevas alternativas añadidas: {added_count}")
        print(f"  - Alternativas existentes actualizadas (precio 2x): {updated_count}")

if __name__ == "__main__":
    asyncio.run(main())
