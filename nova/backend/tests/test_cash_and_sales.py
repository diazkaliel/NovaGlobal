import pytest
from app.models.client import Client
from app.models.user import User
from app.models.cash_register import CashRegisterSession
from app.models.sale import Sale
from app.models.inventory import InventoryItem
from app.services.cash_service import get_session_by_id, open_session
from app.services.sale_service import get_sale_by_id, create_sale
from app.schemas.cash_register import CashRegisterSessionCreate
from app.schemas.sale import SaleCreate, SaleItemCreate

@pytest.mark.asyncio
async def test_cash_session_preloads_relationships(db_session):
    import time
    timestamp = int(time.time() * 1000)
    user = User(
        name="Test Technician",
        email=f"test_tech_{timestamp}@email.com",
        hashed_password="fake_hashed_password",
        role="tecnico",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    from sqlalchemy import delete
    from app.models.cash_register import CashRegisterSession, CashRegisterTransaction
    await db_session.execute(delete(CashRegisterTransaction))
    await db_session.execute(delete(CashRegisterSession).where(CashRegisterSession.system == "nova"))
    await db_session.flush()

    # 2. Abrir una sesión de caja
    session = await open_session(db_session, CashRegisterSessionCreate(initial_balance=50000.0), user.id)
    session_id = session.id

    # 3. Recuperar la sesión usando el service
    retrieved = await get_session_by_id(db_session, session_id)
    
    # 4. Comprobar que podemos acceder a 'opened_by' y 'transactions' sin disparar error asíncrono de Greenlet
    assert retrieved.opened_by is not None
    assert retrieved.opened_by.name == "Test Technician"
    assert isinstance(retrieved.transactions, list)

@pytest.mark.asyncio
async def test_sale_preloads_relationships(db_session):
    # 1. Crear un cliente
    import time
    timestamp = int(time.time() * 1000)
    phone = f"+569{timestamp % 100000000}"
    client = Client(name="María López", phone=phone)
    db_session.add(client)
    
    # 2. Crear un ítem de inventario (mercancía)
    item = InventoryItem(
        name="Cargador Tipo C",
        category="mercancia",
        stock=20,
        min_stock=5,
        cost_price=3000.0,
        sale_price=8000.0,
        system="nova"
    )
    db_session.add(item)
    
    # 3. Crear un usuario (vendedor)
    user = User(
        name="Seller User",
        email=f"seller_{timestamp}@email.com",
        hashed_password="fake_hashed_password",
        role="tecnico",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    # 4. Crear una venta usando el service
    sale_data = SaleCreate(
        client_id=client.id,
        payment_method="efectivo",
        items=[
            SaleItemCreate(item_id=item.id, quantity=2, unit_price=8000.0)
        ]
    )
    sale = await create_sale(db_session, sale_data, user.id)
    sale_id = sale.id

    # 5. Obtener la venta
    retrieved_sale = await get_sale_by_id(db_session, sale_id)

    # 6. Validar pre-cargas para la serialización Pydantic
    assert retrieved_sale.client is not None
    assert retrieved_sale.client.name == "María López"
    assert len(retrieved_sale.items) == 1
    assert retrieved_sale.items[0].item is not None
    assert retrieved_sale.items[0].item.name == "Cargador Tipo C"

@pytest.mark.asyncio
async def test_repair_delivery_registers_cash_transaction(db_session):
    import time
    timestamp = int(time.time() * 1000)
    
    # 1. Crear usuario, cliente y reparación
    user = User(
        name="Tech User",
        email=f"tech_{timestamp}@email.com",
        hashed_password="fake_password",
        role="tecnico",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    phone = f"+569{timestamp % 100000000}"
    client = Client(name="Cliente Entrega", phone=phone)
    db_session.add(client)
    await db_session.flush()

    from app.models.repair import Repair
    repair = Repair(
        client_id=client.id,
        system="nova",
        device_type="Celular",
        brand="Xiaomi",
        model="Poco X3",
        reported_issue="Cambio de bateria",
        status="listo",
        order_number=f"ORD-DEL-{timestamp % 1000000}"
    )
    db_session.add(repair)
    await db_session.flush()

    # 2. Intentar entregar sin caja abierta (debe fallar)
    from sqlalchemy import delete
    from app.models.cash_register import CashRegisterSession, CashRegisterTransaction
    await db_session.execute(delete(CashRegisterTransaction))
    await db_session.execute(delete(CashRegisterSession).where(CashRegisterSession.system == "nova"))
    await db_session.flush()

    from app.schemas.repair import RepairStatusUpdate
    from app.services.repair_service import update_repair_status
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await update_repair_status(
            db_session,
            repair.id,
            RepairStatusUpdate(new_status="entregado", payment_amount=15000.0, payment_method="efectivo"),
            changed_by_id=user.id
        )
    assert exc_info.value.status_code == 400
    assert "No hay una sesión de caja chica abierta" in exc_info.value.detail

    # 3. Abrir caja chica
    from app.schemas.cash_register import CashRegisterSessionCreate
    from app.services.cash_service import open_session
    
    session = await open_session(db_session, CashRegisterSessionCreate(initial_balance=50000.0), user.id)
    session_id = session.id

    # 4. Entregar reparación (ahora debe funcionar)
    updated = await update_repair_status(
        db_session,
        repair.id,
        RepairStatusUpdate(new_status="entregado", payment_amount=15000.0, payment_method="efectivo"),
        changed_by_id=user.id
    )

    assert updated.status == "entregado"
    assert updated.final_payment_method == "efectivo"

    # 5. Verificar que se registró la transacción en la caja chica
    db_session.expire_all()
    from app.services.cash_service import get_session_by_id
    cash_session = await get_session_by_id(db_session, session_id)
    assert len(cash_session.transactions) == 1
    assert cash_session.transactions[0].amount == 15000.0
    assert cash_session.transactions[0].payment_method == "efectivo"
    assert "Xiaomi Poco X3" in cash_session.transactions[0].description
