import pytest
from app.models.inventory import InventoryItem
from app.services.inventory_service import use_items_in_repair
from app.schemas.inventory import RepairInventoryCreate
from app.models.repair import Repair
from app.models.client import Client
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_inventory_use_items_atomicity(db_session):
    # 1. Crear un cliente y una reparación de prueba
    import time
    phone = f"+569{int(time.time() * 1000) % 100000000}"
    client = Client(name="Juan Pérez", phone=phone)
    db_session.add(client)
    await db_session.flush()

    repair = Repair(
        client_id=client.id,
        system="nova",
        device_type="Celular",
        brand="Apple",
        model="iPhone 13",
        reported_issue="Pantalla trizada",
        status="recibido",
        order_number=f"ORD-TEST-{int(time.time() * 1000) % 1000000}"
    )
    db_session.add(repair)
    await db_session.flush()

    # 2. Crear dos insumos con suficiente stock
    item1 = InventoryItem(
        name="Pantalla iPhone 13",
        category="insumo",
        stock=5,
        min_stock=2,
        cost_price=30000.0,
        sale_price=60000.0,
        system="nova"
    )
    item2 = InventoryItem(
        name="Pegamento B7000",
        category="insumo",
        stock=10,
        min_stock=2,
        cost_price=2000.0,
        sale_price=5000.0,
        system="nova"
    )
    db_session.add(item1)
    db_session.add(item2)
    await db_session.flush()

    item1_id = item1.id
    item2_id = item2.id

    # 3. Intentar consumir insumos con uno excediendo el stock disponible
    # item1 pide 2 (disponible 5) - ok
    # item2 pide 12 (disponible 10) - falla (stock insuficiente)
    usage = [
        RepairInventoryCreate(item_id=item1_id, quantity=2),
        RepairInventoryCreate(item_id=item2_id, quantity=12)
    ]

    with pytest.raises(HTTPException) as exc_info:
        await use_items_in_repair(db_session, repair.id, usage)

    assert exc_info.value.status_code == 400
    assert "Stock insuficiente" in exc_info.value.detail

    # 4. Verificar que se hizo rollback y los stocks iniciales siguen intactos
    from sqlalchemy import select
    res1 = await db_session.execute(select(InventoryItem).where(InventoryItem.id == item1_id))
    db_item1 = res1.scalar_one()
    res2 = await db_session.execute(select(InventoryItem).where(InventoryItem.id == item2_id))
    db_item2 = res2.scalar_one()

    assert db_item1.stock == 5
    assert db_item2.stock == 10


@pytest.mark.asyncio
async def test_create_repair_with_used_items_atomicity(db_session):
    from app.services.repair_service import create_repair
    from app.schemas.repair import RepairCreate
    import time

    # 1. Crear un cliente
    phone = f"+569{int(time.time() * 1000) % 100000000}"
    client = Client(name="Cliente Insumos", phone=phone)
    db_session.add(client)
    await db_session.flush()

    # 2. Crear un insumo
    item = InventoryItem(
        name="Insumo Test",
        category="insumo",
        stock=5,
        min_stock=1,
        cost_price=1000.0,
        sale_price=2000.0,
        system="bravo"
    )
    db_session.add(item)
    await db_session.flush()
    item_id = item.id

    # 3. Crear una orden con insumo válido
    repair_data = RepairCreate(
        client_id=client.id,
        device_type="polera",
        brand="Algodón",
        model="Estampado",
        reported_issue="Estampado de polera",
        print_technique="dtf_textil",
        used_items=[RepairInventoryCreate(item_id=item_id, quantity=3)]
    )

    created_repair = await create_repair(db_session, repair_data, created_by_id=1)
    
    # Verificar descuento de stock
    await db_session.refresh(item)
    assert item.stock == 2
    assert len(created_repair.inventory_usage) == 1
    assert created_repair.inventory_usage[0].quantity == 3
    assert created_repair.inventory_usage[0].item_id == item_id

    # 4. Intentar crear orden excediendo el stock
    exceeding_data = RepairCreate(
        client_id=client.id,
        device_type="polera",
        brand="Algodón",
        model="Estampado 2",
        reported_issue="Estampado de polera 2",
        print_technique="dtf_textil",
        used_items=[RepairInventoryCreate(item_id=item_id, quantity=10)]
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_repair(db_session, exceeding_data, created_by_id=1)

    assert exc_info.value.status_code == 400
    assert "Stock insuficiente" in exc_info.value.detail

    # Verificar que el stock del insumo sigue siendo 2 (no cambió)
    await db_session.refresh(item)
    assert item.stock == 2
