import asyncio
import random
import re
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from app.db.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.client import Client
from app.models.repair import Repair, RepairHistory, RepairComment
from app.models.inventory import InventoryItem, RepairInventory
from app.models.cash_register import CashRegisterSession, CashRegisterTransaction
from app.models.sale import Sale, SaleItem
from app.models.machine import Machine, MachineReservation, MachineStatus
from app.models.qa_inspection import QAInspection
from app.models.brand_kit import BrandKit

async def clear_database(db):
    print("Limpiando base de datos...")
    await db.execute(delete(RepairHistory))
    await db.execute(delete(RepairComment))
    await db.execute(delete(RepairInventory))
    await db.execute(delete(QAInspection))
    await db.execute(delete(MachineReservation))
    await db.execute(delete(Notification))
    await db.execute(delete(Repair))
    await db.execute(delete(SaleItem))
    await db.execute(delete(Sale))
    await db.execute(delete(CashRegisterTransaction))
    await db.execute(delete(CashRegisterSession))
    await db.execute(delete(InventoryItem))
    await db.execute(delete(Machine))
    await db.execute(delete(BrandKit))
    await db.execute(delete(Client))
    await db.execute(delete(User).where(User.email != "admin@nova.com"))
    await db.commit()

async def main():
    db = SessionLocal()
    try:
        # Import models inside to ensure clean metadata initialization
        from app.models.notification import Notification
        
        # 1. Limpiar base de datos
        await clear_database(db)
        
        # 2. Asegurar o crear usuarios
        print("Creando usuarios de prueba...")
        res = await db.execute(select(User).where(User.email == "admin@nova.com"))
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(
                name="Admin de Pruebas",
                email="admin@nova.com",
                hashed_password=hash_password("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            await db.flush()
        
        # Crear técnicos independientes para Nova y Bravo
        tech_nova = User(
            name="Claudio Técnico Nova",
            email="claudio@nova.com",
            hashed_password=hash_password("claudio123"),
            role="tecnico",
            is_active=True
        )
        tech_bravo = User(
            name="Beatriz Diseños Bravo",
            email="beatriz@bravo.com",
            hashed_password=hash_password("beatriz123"),
            role="tecnico",
            is_active=True
        )
        db.add(tech_nova)
        db.add(tech_bravo)
        await db.flush()
        
        # 3. Crear clientes realistas para Nova y Bravo (separados por teléfono/rut/email)
        print("Creando clientes independientes...")
        clients_nova_data = [
            {"name": "Juan Perez", "phone": "+56911112222", "email": "juan.perez@email.com", "rut": "15.345.678-9", "city": "Santiago"},
            {"name": "Camila Soto", "phone": "+56922223333", "email": "camila.soto@email.com", "rut": "18.234.567-K", "city": "Viña del Mar"},
            {"name": "Diego Muñoz", "phone": "+56933334444", "email": "diego.m@email.com", "rut": "12.789.123-4", "city": "Valparaíso"},
            {"name": "Elena Rojas", "phone": "+56944445555", "email": "elena.r@email.com", "rut": "16.456.789-0", "city": "Quillota"},
            {"name": "Gabriel Jara", "phone": "+56955556666", "email": "gabriel.j@email.com", "rut": "19.567.890-1", "city": "Santiago"}
        ]
        
        clients_bravo_data = [
            {"name": "Constructora Sol S.A.", "phone": "+56999990000", "email": "contacto@constructorasol.cl", "rut": "76.123.456-K", "city": "Valparaíso"},
            {"name": "Colegio San Martin", "phone": "+56988880000", "email": "director@sanmartin.cl", "rut": "70.456.789-2", "city": "Quillota"},
            {"name": "Banda Rock Quillota", "phone": "+56977770000", "email": "contacto@rockquillota.cl", "rut": "20.123.456-7", "city": "Quillota"},
            {"name": "Pizzería Nápoles", "phone": "+56966660000", "email": "napoles@pizza.cl", "rut": "77.890.123-5", "city": "Limache"},
            {"name": "Gimnasio FitLife", "phone": "+56955550000", "email": "admin@fitlife.cl", "rut": "76.456.123-8", "city": "Viña del Mar"}
        ]
        
        clients_nova = [Client(**c) for c in clients_nova_data]
        clients_bravo = [Client(**c) for c in clients_bravo_data]
        
        db.add_all(clients_nova)
        db.add_all(clients_bravo)
        await db.flush()
        
        # 4. Crear Brand Kits para clientes corporativos de Bravo
        print("Creando Brand Kits de Bravo...")
        for c in clients_bravo:
            brand_kit = BrandKit(
                client_id=c.id,
                brand_name=c.name.split()[0],
                primary_color="#f97316",
                secondary_color="#1e1e24",
                logo_url=f"/uploads/brand_kits/logo_{c.id}.png",
                font_family="Outfit",
                system="bravo"
            )
            db.add(brand_kit)
        await db.flush()

        # 5. Crear inventario de Insumos y Mercancías
        print("Creando catálogo e inventario físico...")
        # Nova (Tecnología y Servicio Técnico)
        items_nova = [
            InventoryItem(name="Pantalla iPhone 11 (OLED)", category="insumo", stock=15, min_stock=4, cost_price=25000.0, sale_price=55000.0, system="nova"),
            InventoryItem(name="Batería compatible iPhone X", category="insumo", stock=20, min_stock=5, cost_price=8000.0, sale_price=22000.0, system="nova"),
            InventoryItem(name="Pantalla Samsung S21 Ultra", category="insumo", stock=5, min_stock=2, cost_price=95000.0, sale_price=175000.0, system="nova"),
            InventoryItem(name="Pin de Carga USB-C Moto G", category="insumo", stock=50, min_stock=10, cost_price=1500.0, sale_price=15000.0, system="nova"),
            InventoryItem(name="Cargador Rápido 20W USB-C", category="mercancia", stock=40, min_stock=10, cost_price=3500.0, sale_price=9990.0, system="nova"),
            InventoryItem(name="Cable Lightning 1.2m reforzado", category="mercancia", stock=60, min_stock=12, cost_price=1800.0, sale_price=5990.0, system="nova"),
            InventoryItem(name="Audífonos Bluetooth NovaPods", category="mercancia", stock=25, min_stock=5, cost_price=8000.0, sale_price=24990.0, system="nova"),
            InventoryItem(name="Lámina Hidrogel Premium", category="mercancia", stock=100, min_stock=20, cost_price=800.0, sale_price=5000.0, system="nova")
        ]
        
        # Bravo (Estampado y Ropa Corporativa)
        items_bravo = [
            InventoryItem(name="Polera Negra Algodón Gildan M", category="insumo", stock=120, min_stock=20, cost_price=2200.0, sale_price=5500.0, system="bravo"),
            InventoryItem(name="Polera Blanca Algodón Gildan L", category="insumo", stock=80, min_stock=15, cost_price=2200.0, sale_price=5500.0, system="bravo"),
            InventoryItem(name="Jockey Trucker Negro/Blanco", category="insumo", stock=150, min_stock=25, cost_price=1100.0, sale_price=3500.0, system="bravo"),
            InventoryItem(name="Tazón Cerámico Blanco Sublimación", category="insumo", stock=200, min_stock=30, cost_price=850.0, sale_price=2500.0, system="bravo"),
            InventoryItem(name="Botella Deportiva Aluminio 750ml", category="insumo", stock=40, min_stock=10, cost_price=1800.0, sale_price=4990.0, system="bravo"),
            InventoryItem(name="Taza Mágica Cerámica", category="mercancia", stock=35, min_stock=8, cost_price=1500.0, sale_price=5000.0, system="bravo"),
            InventoryItem(name="Parche Bordado Bandera Chile", category="mercancia", stock=100, min_stock=15, cost_price=450.0, sale_price=1990.0, system="bravo"),
            InventoryItem(name="Bolsa Ecológica Crea Cruda", category="mercancia", stock=300, min_stock=50, cost_price=350.0, sale_price=1200.0, system="bravo")
        ]
        
        db.add_all(items_nova)
        db.add_all(items_bravo)
        await db.flush()

        # 6. Crear Maquinaria de Taller para Bravo
        print("Creando maquinaria de Bravo...")
        machines = [
            Machine(name="Sublimadora Automática Tazones", type="sublimation", status=MachineStatus.ACTIVE, system="bravo", last_maintenance_date=datetime.utcnow() - timedelta(days=20)),
            Machine(name="Bordadora Industrial Brother 6 Cabezales", type="embroidery", status=MachineStatus.ACTIVE, system="bravo", last_maintenance_date=datetime.utcnow() - timedelta(days=45)),
            Machine(name="Calandra y Plancha Textil Plana 40x60", type="vinyl", status=MachineStatus.ACTIVE, system="bravo", last_maintenance_date=datetime.utcnow() - timedelta(days=10)),
            Machine(name="Plotter de Impresión y Corte DTF", type="dtf", status=MachineStatus.MAINTENANCE, system="bravo", last_maintenance_date=datetime.utcnow() - timedelta(days=2), maintenance_comments="Limpieza de cabezales y alineación", maintenance_incidents="Cabezal obstruido levemente")
        ]
        db.add_all(machines)
        await db.flush()

        # 7. Crear historial financiero mensual (últimos 6 meses) y órdenes de reparaciones
        # Meses de Enero a Junio de 2026
        months = [
            ("Ene", datetime(2026, 1, 15, tzinfo=timezone.utc)),
            ("Feb", datetime(2026, 2, 15, tzinfo=timezone.utc)),
            ("Mar", datetime(2026, 3, 15, tzinfo=timezone.utc)),
            ("Abr", datetime(2026, 4, 15, tzinfo=timezone.utc)),
            ("May", datetime(2026, 5, 15, tzinfo=timezone.utc)),
            ("Jun", datetime(2026, 6, 15, tzinfo=timezone.utc)),
        ]
        
        # Guardaremos IDs para usarlos en transacciones y cajas
        sessions_ids = []

        print("Simulando ciclos de caja chica mensuales...")
        for month_name, base_date in months:
            # Crear 1 sesión de caja por mes para Nova
            nova_sess = CashRegisterSession(
                opened_by_id=admin.id,
                opened_at=(base_date - timedelta(days=12)).isoformat(),
                closed_at=(base_date + timedelta(days=12)).isoformat(),
                initial_balance=100000.0,
                expected_balance=100000.0,
                actual_balance=100000.0,
                status="closed",
                system="nova"
            )
            
            # Crear 1 sesión de caja por mes para Bravo
            bravo_sess = CashRegisterSession(
                opened_by_id=tech_bravo.id,
                opened_at=(base_date - timedelta(days=12)).isoformat(),
                closed_at=(base_date + timedelta(days=12)).isoformat(),
                initial_balance=80000.0,
                expected_balance=80000.0,
                actual_balance=80000.0,
                status="closed",
                system="bravo"
            )
            db.add(nova_sess)
            db.add(bravo_sess)
            await db.flush()
            
            sessions_ids.append((month_name, nova_sess, bravo_sess))
        
        print("Poblando órdenes de servicio y proyectos históricos...")
        order_counter_nova = 1
        order_counter_bravo = 1
        
        # Mapeo de meses a número real
        month_map = {"Ene": 1, "Feb": 2, "Mar": 3, "Abr": 4, "May": 5, "Jun": 6}

        for month_name, base_date in months:
            m_num = month_map[month_name]
            _, nova_sess, bravo_sess = next(s for s in sessions_ids if s[0] == month_name)
            
            # --- NOVA REP-STATS (Generar 8 reparaciones por mes) ---
            # Mezcla de estados: entregados, listos, cancelados, en_reparacion
            devices_nova = [
                ("phone", "Apple", "iPhone 11", "Cambio de pantalla", 1, 55000, 20000, "entregado"),
                ("phone", "Samsung", "Galaxy S21 FE", "Problema de carga", 2, 45000, 0, "entregado"),
                ("laptop", "Lenovo", "ThinkPad T490", "Mantenimiento interno y pasta térmica", 3, 35000, 15000, "entregado"),
                ("console", "Sony", "PlayStation 4 Slim", "Limpieza y lector", 4, 48000, 10000, "entregado"),
                ("phone", "Xiaomi", "Redmi Note 11", "Cambio pin de carga", 0, 25000, 5000, "listo"),
                ("phone", "Apple", "iPhone X", "Cambio batería", 1, 30000, 0, "listo"),
                ("laptop", "HP", "Pavilion 15", "Reinstalación de OS y SSD", 2, 60000, 20000, "en_reparacion"),
                ("phone", "Motorola", "Moto G60", "Humedad y sulfato", 3, 40000, 0, "cancelado")
            ]
            
            for dev_type, brand, model, issue, client_idx, cost, dep, status in devices_nova:
                client = clients_nova[client_idx]
                ord_num = f"ORD-{order_counter_nova:05d}"
                order_counter_nova += 1
                
                # Fechas distribuidas en el mes
                day = random.randint(1, 28)
                created_dt = datetime(2026, m_num, day, 10, 0, tzinfo=timezone.utc)
                delivered_dt = created_dt + timedelta(days=2) if status in ("entregado", "listo") else None
                
                rep = Repair(
                    order_number=ord_num,
                    client_id=client.id,
                    technician_id=tech_nova.id,
                    device_type=dev_type,
                    brand=brand,
                    model=model,
                    reported_issue=issue,
                    accessories="Sin accesorios" if random.random() > 0.5 else "Con carcasa",
                    device_password_encrypted="gAAAAABml4-fake",
                    status=status,
                    estimated_delivery=(created_dt + timedelta(days=3)).date(),
                    repair_cost=cost,
                    deposit=dep,
                    deposit_payment_method="efectivo" if dep > 0 else None,
                    final_payment_method="transferencia" if status == "entregado" else None,
                    system="nova",
                )
                # Override created_at to simulate historic data
                rep.created_at = created_dt
                db.add(rep)
                await db.flush()
                
                # Historial de estados
                hist_rec = RepairHistory(
                    repair_id=rep.id,
                    previous_status=None,
                    new_status="recibido",
                    note="Ingreso del equipo al taller",
                    changed_by_id=tech_nova.id,
                    changed_at=created_dt.isoformat()
                )
                db.add(hist_rec)
                
                if status in ("listo", "entregado"):
                    hist_ready = RepairHistory(
                        repair_id=rep.id,
                        previous_status="recibido",
                        new_status="listo",
                        note="Reparación finalizada con éxito",
                        changed_by_id=tech_nova.id,
                        changed_at=(created_dt + timedelta(days=1)).isoformat()
                    )
                    db.add(hist_ready)
                
                if status == "entregado":
                    hist_deliv = RepairHistory(
                        repair_id=rep.id,
                        previous_status="listo",
                        new_status="entregado",
                        note="Retirado y cancelado saldo pendiente",
                        changed_by_id=tech_nova.id,
                        changed_at=delivered_dt.isoformat()
                    )
                    db.add(hist_deliv)
                elif status == "cancelado":
                    hist_cancel = RepairHistory(
                        repair_id=rep.id,
                        previous_status="recibido",
                        new_status="cancelado",
                        note="Diagnóstico rechazado por presupuesto",
                        changed_by_id=tech_nova.id,
                        changed_at=(created_dt + timedelta(days=1)).isoformat()
                    )
                    db.add(hist_cancel)

                # Registrar consumos de inventario para reparar (ej. pantallas/baterías)
                if status in ("listo", "entregado") and brand in ("Apple", "Samsung"):
                    # Consumir un insumo de Nova
                    item_matched = next((i for i in items_nova if brand in i.name and i.category == "insumo"), None)
                    if item_matched:
                        usage = RepairInventory(
                            repair_id=rep.id,
                            item_id=item_matched.id,
                            quantity=1
                        )
                        db.add(usage)
                        # Reducir stock del insumo
                        item_matched.stock = max(0, item_matched.stock - 1)
                        db.add(item_matched)
                
                # Registrar ingresos a la caja de Nova por la reparación
                if dep > 0:
                    tx_dep = CashRegisterTransaction(
                        session_id=nova_sess.id,
                        transaction_type="ingreso",
                        amount=float(dep),
                        description=f"Abono inicial Orden #{ord_num}",
                        payment_method="efectivo",
                        created_at=created_dt
                    )
                    db.add(tx_dep)
                    nova_sess.expected_balance += dep
                
                if status == "entregado":
                    balance_val = cost - dep
                    if balance_val > 0:
                        tx_bal = CashRegisterTransaction(
                            session_id=nova_sess.id,
                            transaction_type="ingreso",
                            amount=float(balance_val),
                            description=f"Pago saldo restante Orden #{ord_num}",
                            payment_method="transferencia",
                            created_at=delivered_dt
                        )
                        db.add(tx_bal)
                        nova_sess.expected_balance += balance_val
            
            # --- BRAVO STATS (Generar 7 pedidos textiles por mes) ---
            # Técnicas distribuidas: sublimacion, bordado, vinilo, dtf
            devices_bravo = [
                ("Polera", "Poleras estampadas personalizadas", 0, 75000, 35000, "entregado", "sublimacion"),
                ("Polera", "Polera piqué corporativa con logo", 1, 98000, 50000, "entregado", "bordado"),
                ("Jockey", "Gorros trucker bordados", 2, 45000, 20000, "entregado", "bordado"),
                ("Tazón", "Tazones corporativos blancos", 3, 50000, 25000, "entregado", "sublimacion"),
                ("Polera", "Poleras cortaviento logo reflectivo", 4, 120000, 60000, "listo", "vinilo"),
                ("Botella", "Caramayolas con diseño deportivo", 1, 60000, 30000, "listo", "dtf"),
                ("Bolsa", "Tote bags ecológicas estampadas", 2, 35000, 0, "cancelado", "dtf")
            ]
            
            for prod_type, desc, client_idx, cost, dep, status, tech_name in devices_bravo:
                client = clients_bravo[client_idx]
                ord_num = f"BRV-{order_counter_bravo:05d}"
                order_counter_bravo += 1
                
                day = random.randint(1, 28)
                created_dt = datetime(2026, m_num, day, 10, 0, tzinfo=timezone.utc)
                delivered_dt = created_dt + timedelta(days=3) if status in ("entregado", "listo") else None
                
                rep_b = Repair(
                    order_number=ord_num,
                    client_id=client.id,
                    technician_id=tech_bravo.id,
                    device_type=prod_type,
                    brand="BravoTex",
                    model=prod_type + " Custom",
                    reported_issue=desc,
                    accessories="Prendas aportadas por taller" if random.random() > 0.3 else "Prendas aportadas por cliente",
                    status=status,
                    estimated_delivery=(created_dt + timedelta(days=4)).date(),
                    repair_cost=cost,
                    deposit=dep,
                    deposit_payment_method="transferencia" if dep > 0 else None,
                    final_payment_method="efectivo" if status == "entregado" else None,
                    system="bravo",
                    print_technique=tech_name,
                    print_location="Pecho centrado y espalda",
                    print_dimensions="20x25 cm",
                    design_file_url=f"/uploads/designs/design_{ord_num}.png"
                )
                rep_b.created_at = created_dt
                db.add(rep_b)
                await db.flush()
                
                # Historial de Bravo
                hist_rec_b = RepairHistory(
                    repair_id=rep_b.id,
                    previous_status=None,
                    new_status="recibido",
                    note="Recepción de bocetos de diseño y cotización",
                    changed_by_id=tech_bravo.id,
                    changed_at=created_dt.isoformat()
                )
                db.add(hist_rec_b)
                
                if status in ("listo", "entregado"):
                    hist_ready_b = RepairHistory(
                        repair_id=rep_b.id,
                        previous_status="recibido",
                        new_status="listo",
                        note="Proceso de estampado y fijado aprobado",
                        changed_by_id=tech_bravo.id,
                        changed_at=(created_dt + timedelta(days=2)).isoformat()
                    )
                    db.add(hist_ready_b)
                
                if status == "entregado":
                    hist_deliv_b = RepairHistory(
                        repair_id=rep_b.id,
                        previous_status="listo",
                        new_status="entregado",
                        note="Pedido entregado al cliente conforme",
                        changed_by_id=tech_bravo.id,
                        changed_at=delivered_dt.isoformat()
                    )
                    db.add(hist_deliv_b)
                elif status == "cancelado":
                    hist_cancel_b = RepairHistory(
                        repair_id=rep_b.id,
                        previous_status="recibido",
                        new_status="cancelado",
                        note="El cliente rechaza el diseño final",
                        changed_by_id=tech_bravo.id,
                        changed_at=(created_dt + timedelta(days=1)).isoformat()
                    )
                    db.add(hist_cancel_b)
                
                # Consumo de stock de prendas o tazones
                item_matched = next((i for i in items_bravo if prod_type.lower() in i.name.lower() and i.category == "insumo"), None)
                if item_matched and status in ("listo", "entregado"):
                    usage = RepairInventory(
                        repair_id=rep_b.id,
                        item_id=item_matched.id,
                        # Supongamos que un pedido corporativo consume unas 5 unidades de material
                        quantity=5
                    )
                    db.add(usage)
                    item_matched.stock = max(0, item_matched.stock - 5)
                    db.add(item_matched)
                
                # Caja chica para Bravo
                if dep > 0:
                    tx_dep_b = CashRegisterTransaction(
                        session_id=bravo_sess.id,
                        transaction_type="ingreso",
                        amount=float(dep),
                        description=f"Abono inicial Pedido #{ord_num}",
                        payment_method="transferencia",
                        created_at=created_dt
                    )
                    db.add(tx_dep_b)
                    bravo_sess.expected_balance += dep
                
                if status == "entregado":
                    balance_val = cost - dep
                    if balance_val > 0:
                        tx_bal_b = CashRegisterTransaction(
                            session_id=bravo_sess.id,
                            transaction_type="ingreso",
                            amount=float(balance_val),
                            description=f"Pago saldo final Pedido #{ord_num}",
                            payment_method="efectivo",
                            created_at=delivered_dt
                        )
                        db.add(tx_bal_b)
                        bravo_sess.expected_balance += balance_val

                # --- CONTROL DE CALIDAD (QA) Y MERMAS (Sólo para Bravo) ---
                if status in ("listo", "entregado"):
                    # Crear inspección de control de calidad obligatoria
                    passed_val = True if random.random() > 0.15 else False # 15% de error en taller
                    
                    checklist_res = {
                        "limpieza_hilos": True,
                        "inspeccion_superficie": passed_val,
                        "curado_temperatura": True,
                        "empaque_correcto": True
                    }
                    
                    waste = None
                    if not passed_val:
                        # Si no pasó, se registra merma física (descarte)
                        waste_item = next((i for i in items_bravo if prod_type.lower() in i.name.lower() and i.category == "insumo"), None)
                        if waste_item:
                            waste = [{
                                "item_id": waste_item.id,
                                "quantity": 1,
                                "reason": "Mancha de tinta de calor / Quemadura ligera"
                            }]
                            # Reducir stock por merma
                            waste_item.stock = max(0, waste_item.stock - 1)
                            db.add(waste_item)
                    
                    qa_inspect = QAInspection(
                        order_id=rep_b.id,
                        operator_id=tech_bravo.id,
                        inspected_at=created_dt + timedelta(days=2),
                        checklist_results=checklist_res,
                        passed=passed_val,
                        comments="Inspeccionado en mesa plana de taller" if passed_val else "Estampado corrido en el borde",
                        waste_records=waste,
                        system="bravo"
                    )
                    db.add(qa_inspect)
                    
                    # --- RESERVAS DE MAQUINARIA (Sólo para Bravo) ---
                    # Vincular una máquina según la técnica
                    m_matched = next((m for m in machines if m.type == tech_name), None)
                    if m_matched:
                        resv = MachineReservation(
                            machine_id=m_matched.id,
                            order_id=rep_b.id,
                            start_time=created_dt + timedelta(days=1),
                            end_time=created_dt + timedelta(days=1, hours=4),
                            system="bravo"
                        )
                        db.add(resv)

        # 8. Guardar y actualizar balances de todas las sesiones de caja chica
        print("Finalizando balances de cajas...")
        for _, nova_sess, bravo_sess in sessions_ids:
            nova_sess.actual_balance = nova_sess.expected_balance
            bravo_sess.actual_balance = bravo_sess.expected_balance
            db.add(nova_sess)
            db.add(bravo_sess)
            
        await db.commit()
        print("¡Base de datos sembrada con éxito con datos realistas e independientes!")
        
    except Exception as e:
        await db.rollback()
        print(f"Error durante la siembra de datos: {e}")
        raise
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(main())
