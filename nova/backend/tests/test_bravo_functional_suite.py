import pytest
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.client import Client
from app.models.inventory import InventoryItem, ProductRecipe
from app.models.repair import Repair
from app.models.machine import Machine, MachineReservation
from app.models.brand_kit import BrandKit
from app.models.quotation import Quotation, QuotationItem
from app.models.cash_register import CashRegisterSession
from app.core.dependencies import get_current_user, get_current_admin
from app.main import app
from sqlalchemy import select, and_
import uuid


def generate_unique_rut():
    num = uuid.uuid4().int % 80000000 + 10000000
    return f"{num}-K"


@pytest.mark.asyncio
async def test_bravo_custom_order_lifecycle_with_recipe_deduction(client, db_session):
    """
    Prueba el ciclo de vida completo de un pedido en Bravo:
    1. Creación de insumo base y producto mercancia con receta (BOM).
    2. Creación de pedido con descuento atómico de stock.
    3. Transición de estados en el pipeline de Bravo, pasando por QA Inspection obligatoria.
    """
    # 1. Crear Insumo y Producto con Receta
    insumo = InventoryItem(
        name=f"Vinilo Textil Dorado {uuid.uuid4().hex[:6]}",
        category="insumo",
        stock=50,
        min_stock=5,
        cost_price=1500.0,
        sale_price=0.0,
        system="bravo"
    )
    db_session.add(insumo)
    await db_session.flush()

    producto = InventoryItem(
        name=f"Polera Negra Estampada {uuid.uuid4().hex[:6]}",
        category="mercancia",
        stock=20,
        min_stock=2,
        cost_price=4000.0,
        sale_price=12990.0,
        system="bravo"
    )
    db_session.add(producto)
    await db_session.flush()

    receta = ProductRecipe(
        product_id=producto.id,
        insumo_id=insumo.id,
        quantity=2.0  # Consume 2 unidades de vinilo por polera
    )
    db_session.add(receta)

    # 2. Crear Cliente y Usuario Admin de Bravo
    client_obj = Client(
        name="Empresa Textil Demo",
        phone=f"+569{uuid.uuid4().int % 100000000:08d}",
        email=f"contacto_{uuid.uuid4().hex[:6]}@demo.cl",
        rut=generate_unique_rut(),
        city="Quillota"
    )
    db_session.add(client_obj)

    user_admin = User(
        name="Admin Bravo Test",
        email=f"admin_bravo_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="all",
        is_active=True
    )
    db_session.add(user_admin)
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: user_admin
    app.dependency_overrides[get_current_admin] = lambda: user_admin

    try:
        # 3. Crear Pedido en Bravo usando 3 unidades del producto
        order_payload = {
            "client_id": client_obj.id,
            "device_type": "polera",
            "brand": "Algodon Premium",
            "model": "3x Polera Negra Estampada",
            "reported_issue": "Estampado logo dorado pecho",
            "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d"),
            "repair_cost": 38970.0,
            "deposit": 15000.0,
            "deposit_payment_method": "transferencia",
            "system": "bravo",
            "print_technique": "vinilo",
            "print_location": "Pecho",
            "print_dimensions": "A4",
            "used_items": [
                {"item_id": producto.id, "quantity": 3}
            ]
        }

        res_create = await client.post("/repairs/", json=order_payload)
        assert res_create.status_code == 201, res_create.text
        order_data = res_create.json()
        assert order_data["order_number"].startswith("BRV-")
        assert order_data["system"] == "bravo"
        assert order_data["status"] == "recibido"

        # Verificar descuento de inventario:
        # Stock de producto: 20 - 3 = 17
        # Stock de insumo componente: 50 - (3 * 2) = 44
        await db_session.refresh(producto)
        await db_session.refresh(insumo)
        assert producto.stock == 17
        assert insumo.stock == 44

        # 4. Transición de estados en el pipeline de estampado
        order_id = order_data["id"]
        
        # Recibido -> Diseno Aprobado
        res_st1 = await client.patch(f"/repairs/{order_id}/status", json={"new_status": "diseno_aprobado"})
        assert res_st1.status_code == 200
        assert res_st1.json()["status"] == "diseno_aprobado"

        # Diseno Aprobado -> En Producción (en_reparacion)
        res_st2 = await client.patch(f"/repairs/{order_id}/status", json={"new_status": "en_reparacion"})
        assert res_st2.status_code == 200
        assert res_st2.json()["status"] == "en_reparacion"

        # Registrar QA Inspection APROBADA (requerido para pasar a listo)
        res_qa = await client.post("/api/bravo/qa/inspect", json={
            "order_id": order_id,
            "checklist_results": {
                "sin_burbujas": True,
                "adherencia_optima": True,
                "empaque_impecable": True
            },
            "passed": True,
            "comments": "Producción conforme para entrega."
        })
        assert res_qa.status_code == 201, res_qa.text

        # En Producción -> Listo (con QA aprobada)
        res_st3 = await client.patch(f"/repairs/{order_id}/status", json={"new_status": "listo"})
        assert res_st3.status_code == 200
        assert res_st3.json()["status"] == "listo"

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bravo_split_order_functionality(client, db_session):
    """
    Verifica la división de un pedido Bravo en un lote secundario (Split Order):
    - Reasigna proporcionalmente costo y abono.
    - Asigna sufijos -A y -B.
    - Deja trazabilidad de historial de derivación.
    """
    client_obj = Client(
        name="Cliente Lote Mayorista",
        phone=f"+569{uuid.uuid4().int % 100000000:08d}",
        email=f"mayorista_{uuid.uuid4().hex[:6]}@test.cl",
        rut=generate_unique_rut(),
        city="La Calera"
    )
    db_session.add(client_obj)

    user_admin = User(
        name="Admin Bravo Split",
        email=f"admin_split_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="bravo",
        is_active=True
    )
    db_session.add(user_admin)
    await db_session.flush()

    parent_order = Repair(
        order_number=f"BRV-{uuid.uuid4().int % 90000 + 10000}",
        client_id=client_obj.id,
        device_type="poleron",
        brand="Rustico",
        model="100x Polerones Bordados",
        reported_issue="Bordado espalda",
        status="en_reparacion",
        repair_cost=500000.0,
        deposit=200000.0,
        deposit_payment_method="transferencia",
        system="bravo",
        print_technique="bordado"
    )
    db_session.add(parent_order)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_admin

    try:
        # Dividir la orden al 40% (0.4)
        res = await client.post(f"/repairs/{parent_order.id}/split?ratio=0.4")
        assert res.status_code == 201, res.text
        child_data = res.json()

        # El lote hijo debe tener el 40% del costo y abono
        assert child_data["order_number"].endswith("-B")
        assert float(child_data["repair_cost"]) == 200000.0
        assert float(child_data["deposit"]) == 80000.0
        assert child_data["system"] == "bravo"

        # La orden padre debe quedar con el 60% restante
        await db_session.refresh(parent_order)
        assert parent_order.order_number.endswith("-A")
        assert float(parent_order.repair_cost) == 300000.0
        assert float(parent_order.deposit) == 120000.0

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bravo_machines_and_overlap_validation(client, db_session):
    """
    Verifica la gestión de maquinaria y el bloqueo de traslapes en agenda.
    """
    user_admin = User(
        name="Admin Maquinaria",
        email=f"admin_mach_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="bravo",
        is_active=True
    )
    db_session.add(user_admin)

    client_obj = Client(
        name="Cliente Agenda",
        phone=f"+569{uuid.uuid4().int % 100000000:08d}",
        rut=generate_unique_rut()
    )
    db_session.add(client_obj)
    await db_session.flush()

    order = Repair(
        order_number=f"BRV-{uuid.uuid4().int % 90000 + 10000}",
        client_id=client_obj.id,
        device_type="taza",
        brand="Generico",
        model="Taza Ceramica",
        reported_issue="Sublimacion 50 tazas",
        status="recibido",
        system="bravo"
    )
    db_session.add(order)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_admin

    try:
        # 1. Crear Maquinaria
        res_m = await client.post("/api/bravo/machines", json={
            "name": f"Plancha de Tazas {uuid.uuid4().hex[:4]}",
            "type": "sublimation",
            "status": "active"
        })
        assert res_m.status_code == 201, res_m.text
        mach_id = res_m.json()["id"]

        # 2. Crear Reserva Válida (10:00 a 12:00)
        base_date = datetime.now(timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0)
        res_r1 = await client.post("/api/bravo/machines/reserve", json={
            "machine_id": mach_id,
            "order_id": order.id,
            "start_time": base_date.isoformat(),
            "end_time": (base_date + timedelta(hours=2)).isoformat()
        })
        assert res_r1.status_code == 201
        res1_id = res_r1.json()["reservation_id"]

        # 3. Intentar Reserva Traslapada (11:00 a 13:00) -> Debe fallar con HTTP 400
        res_r_conflict = await client.post("/api/bravo/machines/reserve", json={
            "machine_id": mach_id,
            "order_id": order.id,
            "start_time": (base_date + timedelta(hours=1)).isoformat(),
            "end_time": (base_date + timedelta(hours=3)).isoformat()
        })
        assert res_r_conflict.status_code == 400
        assert "conflicto de horario" in res_r_conflict.json()["detail"].lower()

        # 4. Reserva No Traslapada (12:00 a 14:00) -> Debe ser exitosa
        res_r2 = await client.post("/api/bravo/machines/reserve", json={
            "machine_id": mach_id,
            "order_id": order.id,
            "start_time": (base_date + timedelta(hours=2)).isoformat(),
            "end_time": (base_date + timedelta(hours=4)).isoformat()
        })
        assert res_r2.status_code == 201

        # 5. Cancelar reserva
        res_del = await client.delete(f"/api/bravo/machines/reserve/{res1_id}")
        assert res_del.status_code == 200

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bravo_qa_inspection_and_waste_deduction(client, db_session):
    """
    Verifica el control de calidad (QA) y el descuento automático de mermas en stock.
    """
    user_admin = User(
        name="Inspector QA Bravo",
        email=f"qa_bravo_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="bravo",
        is_active=True
    )
    db_session.add(user_admin)

    client_obj = Client(
        name="Cliente QA",
        phone=f"+569{uuid.uuid4().int % 100000000:08d}",
        rut=generate_unique_rut()
    )
    db_session.add(client_obj)

    insumo_merma = InventoryItem(
        name=f"Taza Blanca Sublimable {uuid.uuid4().hex[:6]}",
        category="insumo",
        stock=25,
        min_stock=5,
        cost_price=1000.0,
        sale_price=0.0,
        system="bravo"
    )
    db_session.add(insumo_merma)
    await db_session.flush()

    order = Repair(
        order_number=f"BRV-{uuid.uuid4().int % 90000 + 10000}",
        client_id=client_obj.id,
        device_type="taza",
        brand="Generico",
        model="Taza 11oz",
        reported_issue="Estampado 20 tazas con foto",
        status="en_reparacion",
        system="bravo"
    )
    db_session.add(order)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_admin

    try:
        # Registrar inspección QA con 2 tazas de merma
        qa_payload = {
            "order_id": order.id,
            "checklist_results": {
                "sin_burbujas": True,
                "centrado_correcto": True,
                "brillo_esmalte": False,
                "empaque_protector": True
            },
            "passed": False,
            "comments": "2 tazas salieron con manchas por falla de temperatura.",
            "waste_records": [
                {"item_id": insumo_merma.id, "quantity": 2}
            ]
        }

        res = await client.post("/api/bravo/qa/inspect", json=qa_payload)
        assert res.status_code == 201, res.text
        qa_data = res.json()
        assert qa_data["passed"] is False
        assert qa_data["order_id"] == order.id

        # Verificar que el stock de tazas se descontó en 2 unidades (25 -> 23)
        await db_session.refresh(insumo_merma)
        assert insumo_merma.stock == 23

        # Consultar inspección guardada
        res_get = await client.get(f"/api/bravo/qa/order/{order.id}")
        assert res_get.status_code == 200
        assert res_get.json()["comments"] == qa_payload["comments"]

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bravo_brand_kits_crud_and_uniqueness(client, db_session):
    """
    Verifica el catálogo de Brand Kits de clientes y la restricción de nombres duplicados.
    """
    user_admin = User(
        name="Admin Brand Kit",
        email=f"admin_bk_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="bravo",
        is_active=True
    )
    db_session.add(user_admin)

    client_obj = Client(
        name="Agencia Marketing Creativa",
        phone=f"+569{uuid.uuid4().int % 100000000:08d}",
        email=f"agencia_{uuid.uuid4().hex[:6]}@creativa.cl",
        rut=generate_unique_rut()
    )
    db_session.add(client_obj)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_admin

    try:
        kit_payload = {
            "client_id": client_obj.id,
            "brand_name": "Identidad Corporativa Principal",
            "colors": [
                {"name": "Azul Primario", "hex": "#0F172A", "pantone": "296 C"},
                {"name": "Dorado Acento", "hex": "#F59E0B", "pantone": "123 C"}
            ],
            "typographies": [
                {"usage": "Títulos", "font_family": "Outfit", "source": "Google Fonts"}
            ],
            "guidelines": "No alterar proporciones del isotipo en DTF."
        }

        # 1. Crear Brand Kit
        res_create = await client.post("/api/bravo/brand-kits", json=kit_payload)
        assert res_create.status_code == 201, res_create.text
        kit_data = res_create.json()
        assert kit_data["brand_name"] == "Identidad Corporativa Principal"
        kit_id = kit_data["id"]

        # 2. Intento de crear duplicado con el mismo nombre -> HTTP 400
        res_dup = await client.post("/api/bravo/brand-kits", json=kit_payload)
        assert res_dup.status_code == 400
        assert "ya existe" in res_dup.json()["detail"].lower()

        # 3. Listar kits del cliente
        res_list = await client.get(f"/api/bravo/brand-kits/client/{client_obj.id}")
        assert res_list.status_code == 200
        assert len(res_list.json()) == 1

        # 4. Eliminar Brand Kit
        res_del = await client.delete(f"/api/bravo/brand-kits/{kit_id}")
        assert res_del.status_code == 200

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bravo_quotations_public_workflow(client, db_session):
    """
    Verifica el ciclo de cotizaciones y la aprobación pública sin requerir login.
    """
    user_admin = User(
        name="Cotizador Bravo",
        email=f"cotiza_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="bravo",
        is_active=True
    )
    db_session.add(user_admin)

    client_obj = Client(
        name="Cliente Empresa Cotizante",
        phone=f"+569{uuid.uuid4().int % 100000000:08d}",
        email=f"cotizante_{uuid.uuid4().hex[:6]}@empresa.cl",
        rut=generate_unique_rut()
    )
    db_session.add(client_obj)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_admin

    try:
        # 1. Crear Cotización
        quote_payload = {
            "client_id": client_obj.id,
            "status": "borrador",
            "notes": "Cotización sujeta a disponibilidad de stock textil.",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=15)).strftime("%Y-%m-%d"),
            "system": "bravo",
            "items": [
                {
                    "description": "50x Polerones Canguro Estampados DTF",
                    "quantity": 50,
                    "unit_price": 14990.0,
                    "subtotal": 749500.0
                }
            ]
        }

        res_q = await client.post("/quotations/", json=quote_payload)
        assert res_q.status_code == 201, res_q.text
        quote_data = res_q.json()
        quote_number = quote_data["quote_number"]

        # 2. Consultar como público en estado 'borrador' -> Debe bloquear con 403
        res_pub_draft = await client.get(f"/quotations/public/{quote_number}")
        assert res_pub_draft.status_code == 403

        # 3. Cambiar a estado 'enviada'
        await client.put(f"/quotations/{quote_data['id']}", json={
            "status": "enviada"
        })

        # 4. Consultar como público en estado 'enviada' -> Debe retornar 200
        res_pub_sent = await client.get(f"/quotations/public/{quote_number}")
        assert res_pub_sent.status_code == 200
        assert res_pub_sent.json()["quote_number"] == quote_number

        # 5. Cliente acepta la cotización desde el portal público
        res_accept = await client.patch(f"/quotations/public/{quote_number}/status?new_status=aceptada")
        assert res_accept.status_code == 200
        assert res_accept.json()["status"] == "aceptada"

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bravo_cash_register_session_and_chilean_balance(client, db_session):
    """
    Verifica el control de caja chica en Bravo con ingresos, egresos y medios de pago.
    """
    user_admin = User(
        name="Cajero Bravo",
        email=f"caja_bravo_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="bravo",
        is_active=True
    )
    db_session.add(user_admin)
    await db_session.commit()

    # Cerrar cualquier sesión previa abierta para aislar la prueba
    stmt_open = select(CashRegisterSession).where(
        and_(
            CashRegisterSession.system == "bravo",
            CashRegisterSession.status == "open"
        )
    )
    res_open_sess = await db_session.execute(stmt_open)
    for prev_sess in res_open_sess.scalars().all():
        prev_sess.status = "closed"
        prev_sess.closed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: user_admin

    try:
        # 1. Abrir Caja Chica con $50.000 de fondo inicial
        res_open = await client.post("/cash-register/open", json={
            "system": "bravo",
            "initial_balance": 50000.0
        })
        assert res_open.status_code in (200, 201), res_open.text
        session_id = res_open.json()["id"]

        # 2. Registrar Egreso en Efectivo (Compra de cintas e insumos -$10.000)
        res_tx1 = await client.post(f"/cash-register/transaction/{session_id}", json={
            "transaction_type": "egreso",
            "amount": 10000.0,
            "payment_method": "efectivo",
            "description": "[insumos_estampado] Compra de cintas térmicas"
        })
        assert res_tx1.status_code in (200, 201)

        # 3. Registrar Ingreso en Efectivo (Abono de cliente en taller +$20.000)
        res_tx2 = await client.post(f"/cash-register/transaction/{session_id}", json={
            "transaction_type": "ingreso",
            "amount": 20000.0,
            "payment_method": "efectivo",
            "description": "[abono_pedido] Abono orden de poleras"
        })
        assert res_tx2.status_code in (200, 201)

        # 4. Registrar Ingreso vía Transferencia (+$40.000 - No altera efectivo físico)
        res_tx3 = await client.post(f"/cash-register/transaction/{session_id}", json={
            "transaction_type": "ingreso",
            "amount": 40000.0,
            "payment_method": "transferencia",
            "description": "[pago_saldo] Transferencia saldo"
        })
        assert res_tx3.status_code in (200, 201)

        # 5. Consultar Estado en Vivo
        # Efectivo esperado en gaveta: 50.000 - 10.000 + 20.000 = $60.000
        res_status = await client.get("/cash-register/status?system=bravo")
        assert res_status.status_code == 200
        sess_data = res_status.json()["current_session"]
        assert float(sess_data["expected_balance"]) == 60000.0

        # 6. Cerrar Caja con Arqueo Exacto ($60.000)
        res_close = await client.post(f"/cash-register/close/{session_id}", json={
            "actual_balance": 60000.0
        })
        assert res_close.status_code == 200
        close_data = res_close.json()
        assert float(close_data["actual_balance"]) == 60000.0
        assert float(close_data["expected_balance"]) == 60000.0

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bravo_multi_tenant_isolation_boundary(client, db_session):
    """
    Verifica que un operador asignado exclusivamente a Nova NO pueda operar datos de Bravo (HTTP 403),
    y que un operador de Bravo no pueda acceder a datos de Nova.
    """
    worker_nova = User(
        name="Tecnico Nova",
        email=f"tec_nova_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="technician",
        system="nova",
        is_active=True
    )
    worker_bravo = User(
        name="Tecnico Bravo",
        email=f"tec_bravo_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="technician",
        system="bravo",
        is_active=True
    )
    db_session.add_all([worker_nova, worker_bravo])
    await db_session.commit()

    # 1. Operador Nova intentando acceder a Bravo -> 403 Forbidden
    app.dependency_overrides[get_current_user] = lambda: worker_nova

    res_rep_forbidden = await client.get("/repairs?system=bravo")
    assert res_rep_forbidden.status_code == 403
    assert "Acceso Restringido" in res_rep_forbidden.json()["detail"]

    res_cash_forbidden = await client.get("/cash-register/status?system=bravo")
    assert res_cash_forbidden.status_code == 403

    res_inv_forbidden = await client.get("/inventory?system=bravo")
    assert res_inv_forbidden.status_code == 403

    # 2. Operador Bravo accediendo a Bravo (200 OK) y bloqueado en Nova (403 Forbidden)
    app.dependency_overrides[get_current_user] = lambda: worker_bravo

    res_bravo_ok = await client.get("/repairs?system=bravo")
    assert res_bravo_ok.status_code == 200

    res_nova_forbidden = await client.get("/repairs?system=nova")
    assert res_nova_forbidden.status_code == 403
    assert "Acceso Restringido" in res_nova_forbidden.json()["detail"]

    app.dependency_overrides.clear()
