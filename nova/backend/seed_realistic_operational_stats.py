"""
Script de poblado y regularización de estadísticas operativas semestrales (Nova & Bravo).
Genera datos realistas de 6 meses con costos, abonos, trazabilidad de estados (SLA real)
y consumo de insumos/mermas para que los tableros analíticos y el CMS cuenten con
métricas verídicas y consistentes con la base de datos PostgreSQL.
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, delete, func
from app.db.database import SessionLocal
from app.models.client import Client
from app.models.user import User
from app.models.repair import Repair, RepairHistory
from app.models.inventory import InventoryItem, RepairInventory
from app.models.bravo_order import BravoOrder, BravoOrderHistory
from app.models.qa_inspection import QAInspection
from app.models.machine import Machine, MachineReservation, MachineStatus

# Modelos y marcas realistas para Nova (Electrónica)
NOVA_DEVICES = [
    {"type": "Celular", "brand": "Apple", "model": "iPhone 13 Pro", "issue": "Cambio de módulo pantalla Super Retina OLED", "cost": 125000, "item_type": "Pantalla"},
    {"type": "Celular", "brand": "Apple", "model": "iPhone 12", "issue": "Batería degradada 74% - Reemplazo por repuesto alta densidad", "cost": 45000, "item_type": "Batería"},
    {"type": "Celular", "brand": "Samsung", "model": "Galaxy S22 Ultra", "issue": "Reemplazo de pantalla Dynamic AMOLED curva", "cost": 165000, "item_type": "Pantalla"},
    {"type": "Celular", "brand": "Samsung", "model": "Galaxy A54 5G", "issue": "Conector de carga tipo C sulfatado por humedad", "cost": 38000, "item_type": "Pin de Carga"},
    {"type": "Celular", "brand": "Xiaomi", "model": "Redmi Note 12", "issue": "Cambio de batería y display táctil quebrado", "cost": 55000, "item_type": "Pantalla"},
    {"type": "Notebook", "brand": "Apple", "model": "MacBook Air M1", "issue": "Reemplazo de teclado completo y trackpad no responde", "cost": 140000, "item_type": "Teclado"},
    {"type": "Notebook", "brand": "Lenovo", "model": "ThinkPad E14", "issue": "Mantenimiento preventivo, limpieza térmica y pasta Honeywell", "cost": 35000, "item_type": "Pasta Térmica"},
    {"type": "Notebook", "brand": "ASUS", "model": "TUF Gaming F15", "issue": "Upgrade SSD NVMe 1TB Kingston y optimización térmica", "cost": 85000, "item_type": "SSD"},
    {"type": "Notebook", "brand": "HP", "model": "Pavilion 15", "issue": "Reparación de bisagras rotas y cambio de pantalla FHD IPS", "cost": 75000, "item_type": "Pantalla"},
    {"type": "Consola", "brand": "Sony", "model": "PlayStation 5", "issue": "Reparación de puerto HDMI 2.1 dañado por tirón de cable", "cost": 65000, "item_type": "Puerto HDMI"},
    {"type": "Consola", "brand": "Sony", "model": "DualSense PS5", "issue": "Cambio de potenciómetros analógicos con tecnología Hall Effect", "cost": 28000, "item_type": "Análogos"},
    {"type": "Consola", "brand": "Nintendo", "model": "Switch OLED", "issue": "Reparación de lector de tarjetas MicroSD y cambio de cooler", "cost": 42000, "item_type": "Cooler"},
    {"type": "Consola", "brand": "Microsoft", "model": "Xbox Series X", "issue": "Mantención profunda y sustitución de pasta térmica líquida", "cost": 48000, "item_type": "Pasta Térmica"},
    {"type": "Otros", "brand": "Apple", "model": "iPad 9na Gen", "issue": "Cambio de digitalizador de cristal touch", "cost": 58000, "item_type": "Touch"},
]

# Especificaciones de pedidos para Bravo (Taller Gráfico y Textil)
BRAVO_ITEMS = [
    {"cat": "polera", "brand": "Gildan 100% Algodón", "model": "Heavy Cotton", "issue": "Estampado frontal Full Color diseño banda rock", "technique": "dtf", "qty": 10, "cost": 65000},
    {"cat": "polera", "brand": "Yazbek", "model": "Cuello Redondo", "issue": "Logo corporativo pecho y texto en espalda", "technique": "vinilo", "qty": 25, "cost": 145000},
    {"cat": "poleron", "brand": "Roly", "model": "Capucha Canguro", "issue": "Estampado DTF Ultra HD pecho y manga izquierda", "technique": "dtf", "qty": 6, "cost": 96000},
    {"cat": "poleron", "brand": "Gildan", "model": "Crewneck Básico", "issue": "Bordado de escudo colegio en pecho izquierdo", "technique": "bordado", "qty": 15, "cost": 180000},
    {"cat": "tazon", "brand": "Orca", "model": "Cerámica 11oz", "issue": "Sublimación tazas corporativas eventos fin de año", "technique": "sublimacion", "qty": 30, "cost": 75000},
    {"cat": "jockey", "brand": "Flexfit", "model": "Trucker Malla", "issue": "Parche bordado termofijado frontal", "technique": "bordado", "qty": 20, "cost": 110000},
    {"cat": "polera", "brand": "Makito", "model": "Poliéster Deportivo", "issue": "Sublimación full print camisetas de fútbol", "technique": "sublimacion", "qty": 14, "cost": 112000},
    {"cat": "poleron", "brand": "Sol's", "model": "Sudadera Half Zip", "issue": "Vinilo textil reflectante seguridad nocturna", "technique": "vinilo", "qty": 8, "cost": 88000},
]


async def seed_operational_statistics():
    print("[INFO] Iniciando poblado de estadisticas operativas semestrales...")
    
    async with SessionLocal() as db:
        # 1. Obtener usuarios técnicos / operadores
        user_res = await db.execute(select(User))
        users = user_res.scalars().all()
        admin_user = next((u for u in users if u.role == "admin"), users[0])
        tech_users = [u for u in users if u.role in ["tecnico", "operador"]] or [admin_user]

        # 2. Obtener clientes para Nova y Bravo
        clients_res = await db.execute(select(Client))
        all_clients = clients_res.scalars().all()
        nova_clients = [c for c in all_clients if c.system == "nova"] or all_clients[:20]
        bravo_clients = [c for c in all_clients if c.system == "bravo"] or all_clients[20:] or all_clients[:20]

        # 3. Obtener insumos de inventario para ligar costos reales
        inv_res = await db.execute(select(InventoryItem))
        all_inv = inv_res.scalars().all()
        nova_inv = [i for i in all_inv if i.system == "nova"]
        bravo_inv = [i for i in all_inv if i.system == "bravo"]

        # Fecha base actual
        now = datetime.now(timezone.utc)

        # -------------------------------------------------------------
        # POBLAR / SINCRONIZAR REPARACIONES DE NOVA (ÚLTIMOS 6 MESES)
        # -------------------------------------------------------------
        print("\n[NOVA] Sincronizando reparaciones y trazabilidad de Nova...")
        
        # Eliminar historiales huérfanos o antiguos si fuera necesario para regenerar una curva limpia
        # Mantenemos clientes y usuarios intactos
        nova_repairs_res = await db.execute(select(Repair).where(Repair.system == "nova"))
        existing_nova_repairs = nova_repairs_res.scalars().all()
        
        target_nova_count = 175
        needed_new_nova = max(0, target_nova_count - len(existing_nova_repairs))
        
        # Actualizamos las existentes con costos y fechas realistas si estaban en null
        all_nova_repairs = list(existing_nova_repairs)
        
        # Crear nuevas si faltan para completar la muestra estadística
        for i in range(needed_new_nova):
            spec = random.choice(NOVA_DEVICES)
            client = random.choice(nova_clients)
            tech = random.choice(tech_users)
            order_num = f"NOV-{1000 + len(all_nova_repairs) + i}"
            
            repair = Repair(
                order_number=order_num,
                client_id=client.id,
                technician_id=tech.id,
                device_type=spec["type"],
                brand=spec["brand"],
                model=spec["model"],
                reported_issue=spec["issue"],
                status="recibido",
                system="nova",
                repair_cost=Decimal(str(spec["cost"])),
                deposit=Decimal(str(min(spec["cost"], 20000))),
                deposit_payment_method=random.choice(["transferencia", "tarjeta", "efectivo"]),
                warranty_days=90,
                created_at=now
            )
            db.add(repair)
            all_nova_repairs.append(repair)

        await db.flush()

        # Distribuir fechas de forma creciente a lo largo de los últimos 180 días
        # Meses: -5, -4, -3, -2, -1, 0 (cada mes tiene ~25-35 órdenes)
        random.seed(42)  # Para reproducibilidad consistente
        
        # Distribución de estados: 70% entregado, 18% listo, 8% en_reparacion, 3% esperando_repuesto, 1% cancelado
        statuses_weights = ["entregado"] * 70 + ["listo"] * 18 + ["en_reparacion"] * 8 + ["esperando_repuesto"] * 3 + ["cancelado"] * 1
        
        for idx, rep in enumerate(all_nova_repairs):
            # Asignar fecha en los últimos 175 días
            days_ago = max(1, int(175 - (idx * (175 / len(all_nova_repairs))) + random.uniform(-2, 2)))
            created_time = now - timedelta(days=days_ago, hours=random.randint(1, 10), minutes=random.randint(0, 59))
            rep.created_at = created_time
            rep.updated_at = created_time + timedelta(hours=random.randint(12, 48))
            
            # Asignar costo realista si no tenía
            if not rep.repair_cost or float(rep.repair_cost) == 0:
                matching_spec = next((s for s in NOVA_DEVICES if s["type"].lower() in (rep.device_type or "").lower()), NOVA_DEVICES[0])
                rep.repair_cost = Decimal(str(matching_spec["cost"] + random.choice([-5000, 0, 5000, 10000])))
                rep.deposit = Decimal(str(int(float(rep.repair_cost) * 0.35)))
                rep.deposit_payment_method = random.choice(["transferencia", "tarjeta", "efectivo"])
            
            # Asignar estado
            rep.status = random.choice(statuses_weights)
            
            # Limpiar historiales existentes para esta reparación y recrear secuencia SLA precisa
            await db.execute(delete(RepairHistory).where(RepairHistory.repair_id == rep.id))
            
            # 1. Historial inicial
            h1 = RepairHistory(
                repair_id=rep.id,
                previous_status=None,
                new_status="recibido",
                note="Equipo recibido en mesón y registrado en sistema.",
                changed_by_id=rep.technician_id or admin_user.id,
                changed_at=created_time.isoformat()
            )
            db.add(h1)
            
            # 2. Historial en revisión/reparación (+2 a +4 horas)
            if rep.status in ["en_reparacion", "esperando_repuesto", "listo", "entregado"]:
                t_diag = created_time + timedelta(hours=random.uniform(2.0, 4.5))
                h2 = RepairHistory(
                    repair_id=rep.id,
                    previous_status="recibido",
                    new_status="en_reparacion",
                    note="Diagnóstico completado y comienzo de intervención técnica.",
                    changed_by_id=rep.technician_id or admin_user.id,
                    changed_at=t_diag.isoformat()
                )
                db.add(h2)
            
            # 3. Historial listo (SLA realista: 20 a 30 horas promedio desde recibido)
            if rep.status in ["listo", "entregado"]:
                sla_hours = random.uniform(18.0, 32.0)
                t_ready = created_time + timedelta(hours=sla_hours)
                h3 = RepairHistory(
                    repair_id=rep.id,
                    previous_status="en_reparacion",
                    new_status="listo",
                    note="Reparación finalizada exitosamente. Pruebas de control superadas.",
                    changed_by_id=rep.technician_id or admin_user.id,
                    changed_at=t_ready.isoformat()
                )
                db.add(h3)
                
                # 4. Historial entregado (+24 a +48 horas posteriores a estar listo)
                if rep.status == "entregado":
                    t_delivered = t_ready + timedelta(hours=random.uniform(12.0, 48.0))
                    h4 = RepairHistory(
                        repair_id=rep.id,
                        previous_status="listo",
                        new_status="entregado",
                        note="Dispositivo retirado a satisfacción del cliente con ticket de garantía.",
                        changed_by_id=admin_user.id,
                        changed_at=t_delivered.isoformat()
                    )
                    db.add(h4)
            
            # Consumo de insumos en inventario para calcular utilidad real (35-40% costo insumo)
            if rep.status in ["listo", "entregado"] and nova_inv:
                # Comprobar si ya tiene asignado
                usage_res = await db.execute(select(RepairInventory).where(RepairInventory.repair_id == rep.id))
                if not usage_res.scalars().all():
                    chosen_item = random.choice(nova_inv)
                    usage = RepairInventory(
                        repair_id=rep.id,
                        item_id=chosen_item.id,
                        quantity=1
                    )
                    db.add(usage)

        await db.commit()
        print(f"[NOVA] Sincronizadas {len(all_nova_repairs)} reparaciones de Nova con SLA y costos realistas.")

        # -------------------------------------------------------------
        # POBLAR / SINCRONIZAR ÓRDENES TEXTILES DE BRAVO (ÚLTIMOS 6 MESES)
        # -------------------------------------------------------------
        print("\n[BRAVO] Sincronizando ordenes textiles y produccion de Bravo...")
        
        bravo_orders_res = await db.execute(select(BravoOrder))
        all_bravo_orders = list(bravo_orders_res.scalars().all())
        
        target_bravo_count = 150
        needed_new_bravo = max(0, target_bravo_count - len(all_bravo_orders))
        
        for i in range(needed_new_bravo):
            spec = random.choice(BRAVO_ITEMS)
            client = random.choice(bravo_clients)
            tech = random.choice(tech_users)
            order_num = f"BRV-{5000 + len(all_bravo_orders) + i}"
            
            b_order = BravoOrder(
                order_number=order_num,
                client_id=client.id,
                technician_id=tech.id,
                item_category=spec["cat"],
                brand=spec["brand"],
                model=spec["model"],
                reported_issue=spec["issue"],
                print_technique=spec["technique"],
                print_location=random.choice(["Pecho", "Espalda", "Manga", "Contorno"]),
                print_dimensions="A4 (21x30cm)",
                quantity=spec["qty"],
                status="recibido",
                order_cost=Decimal(str(spec["cost"])),
                deposit=Decimal(str(int(spec["cost"] * 0.5))),
                deposit_payment_method=random.choice(["transferencia", "webpay", "efectivo"]),
                created_at=now
            )
            db.add(b_order)
            all_bravo_orders.append(b_order)

        await db.flush()

        # Distribución de estados textiles: 68% entregado, 18% listo, 6% control_calidad, 5% en_produccion, 2% diseno_aprobado, 1% recibido
        bravo_statuses_weights = ["entregado"] * 68 + ["listo"] * 18 + ["control_calidad"] * 6 + ["en_produccion"] * 5 + ["diseno_aprobado"] * 2 + ["recibido"] * 1
        
        for idx, bo in enumerate(all_bravo_orders):
            days_ago = max(1, int(175 - (idx * (175 / len(all_bravo_orders))) + random.uniform(-2, 2)))
            created_time = now - timedelta(days=days_ago, hours=random.randint(1, 10), minutes=random.randint(0, 59))
            bo.created_at = created_time
            bo.updated_at = created_time + timedelta(hours=random.randint(12, 60))
            
            # Asignar costo realista si era 0
            if not bo.order_cost or float(bo.order_cost) == 0:
                matching_spec = next((s for s in BRAVO_ITEMS if s["cat"].lower() in (bo.item_category or "").lower()), BRAVO_ITEMS[0])
                bo.order_cost = Decimal(str(matching_spec["cost"] + random.choice([-5000, 0, 5000, 15000])))
                bo.deposit = Decimal(str(int(float(bo.order_cost) * 0.5)))
                bo.deposit_payment_method = random.choice(["transferencia", "webpay", "efectivo"])
            
            bo.status = random.choice(bravo_statuses_weights)
            
            # Sincronizar historial de Bravo
            await db.execute(delete(BravoOrderHistory).where(BravoOrderHistory.order_id == bo.id))
            
            bh1 = BravoOrderHistory(
                order_id=bo.id,
                previous_status=None,
                new_status="recibido",
                note="Pedido textil ingresado a taller con ficha técnica.",
                changed_by_id=bo.technician_id or admin_user.id,
                changed_at=created_time.isoformat()
            )
            db.add(bh1)
            
            if bo.status in ["diseno_aprobado", "en_produccion", "control_calidad", "listo", "entregado"]:
                t_design = created_time + timedelta(hours=random.uniform(2.0, 5.0))
                bh2 = BravoOrderHistory(
                    order_id=bo.id,
                    previous_status="recibido",
                    new_status="diseno_aprobado",
                    note="Fotomontaje digital validado por el cliente.",
                    changed_by_id=bo.technician_id or admin_user.id,
                    changed_at=t_design.isoformat()
                )
                db.add(bh2)
            
            if bo.status in ["en_produccion", "control_calidad", "listo", "entregado"]:
                t_prod = created_time + timedelta(hours=random.uniform(6.0, 12.0))
                bh3 = BravoOrderHistory(
                    order_id=bo.id,
                    previous_status="diseno_aprobado",
                    new_status="en_produccion",
                    note="Impresión y termotransferencia en maquinaria activa.",
                    changed_by_id=bo.technician_id or admin_user.id,
                    changed_at=t_prod.isoformat()
                )
                db.add(bh3)
            
            if bo.status in ["control_calidad", "listo", "entregado"]:
                t_qc = created_time + timedelta(hours=random.uniform(16.0, 24.0))
                bh4 = BravoOrderHistory(
                    order_id=bo.id,
                    previous_status="en_produccion",
                    new_status="control_calidad",
                    note="Revisión visual de adherencia, curado y empaque.",
                    changed_by_id=admin_user.id,
                    changed_at=t_qc.isoformat()
                )
                db.add(bh4)
            
            if bo.status in ["listo", "entregado"]:
                t_ready = created_time + timedelta(hours=random.uniform(24.0, 36.0))
                bh5 = BravoOrderHistory(
                    order_id=bo.id,
                    previous_status="control_calidad",
                    new_status="listo",
                    note="Lote textil completado y empaquetado para despacho/retiro.",
                    changed_by_id=admin_user.id,
                    changed_at=t_ready.isoformat()
                )
                db.add(bh5)
                
                if bo.status == "entregado":
                    t_deliv = t_ready + timedelta(hours=random.uniform(8.0, 24.0))
                    bh6 = BravoOrderHistory(
                        order_id=bo.id,
                        previous_status="listo",
                        new_status="entregado",
                        note="Pedido entregado al cliente conforme.",
                        changed_by_id=admin_user.id,
                        changed_at=t_deliv.isoformat()
                    )
                    db.add(bh6)

        await db.commit()
        print(f"[BRAVO] Sincronizadas {len(all_bravo_orders)} ordenes textiles de Bravo.")

        # -------------------------------------------------------------
        # SINCRONIZAR REPARACIONES LEGACY DE BRAVO PARA MÁQUINAS Y QA
        # -------------------------------------------------------------
        # Para que MachineReservation y QAInspection (que tienen FK a repairs.id) funcionen al 100%
        bravo_repairs_res = await db.execute(select(Repair).where(Repair.system == "bravo"))
        bravo_repairs = bravo_repairs_res.scalars().all()
        for idx, br in enumerate(bravo_repairs):
            days_ago = max(1, int(175 - (idx * (175 / max(1, len(bravo_repairs))))))
            c_time = now - timedelta(days=days_ago)
            br.created_at = c_time
            br.status = random.choice(["entregado", "listo", "entregado", "entregado"])
            if not br.repair_cost or float(br.repair_cost) == 0:
                br.repair_cost = Decimal(str(random.choice([45000, 65000, 85000, 120000])))
                br.deposit = Decimal(str(int(float(br.repair_cost) * 0.5)))
            
            # Sincronizar historial para cálculo de SLA legacy
            await db.execute(delete(RepairHistory).where(RepairHistory.repair_id == br.id))
            h_init = RepairHistory(
                repair_id=br.id,
                previous_status=None,
                new_status="recibido",
                note="Ingreso orden textil",
                changed_by_id=admin_user.id,
                changed_at=c_time.isoformat()
            )
            h_ready = RepairHistory(
                repair_id=br.id,
                previous_status="recibido",
                new_status="listo",
                note="Producción finalizada",
                changed_by_id=admin_user.id,
                changed_at=(c_time + timedelta(hours=22.5)).isoformat()
            )
            db.add(h_init)
            db.add(h_ready)

        await db.commit()
        print("[BRAVO] Reparaciones legacy de Bravo actualizadas con exito.")

        # -------------------------------------------------------------
        # 4. RESERVAS DE MAQUINARIAS DE BRAVO (OCUPACIÓN REALISTA)
        # -------------------------------------------------------------
        mach_res = await db.execute(select(Machine).where(Machine.system == "bravo"))
        machines = mach_res.scalars().all()
        
        # Eliminar reservas viejas y colocar reservas para la jornada de hoy
        await db.execute(delete(MachineReservation).where(MachineReservation.system == "bravo"))
        
        # DateTime naive para columnas TIMESTAMP WITHOUT TIME ZONE
        today_morning = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
        repairs_for_res = bravo_repairs[:30]
        
        if machines and repairs_for_res:
            res_count = 0
            for idx, m in enumerate(machines[:8]):  # primeras 8 máquinas activas
                # Asignar 4 a 8 horas de reservas
                num_hours = random.randint(4, 9)
                for h in range(num_hours):
                    rep = repairs_for_res[(idx * 3 + h) % len(repairs_for_res)]
                    start_slot = today_morning + timedelta(hours=h)
                    end_slot = start_slot + timedelta(hours=1)
                    resv = MachineReservation(
                        machine_id=m.id,
                        order_id=rep.id,
                        start_time=start_slot,
                        end_time=end_slot,
                        system="bravo"
                    )
                    db.add(resv)
                    res_count += 1
            await db.commit()
            print(f"[BRAVO] Generadas {res_count} reservas activas para el tablero de maquinarias de Bravo.")

        print("\n[OK] Poblado de estadisticas operativas semestrales completado con exito!")


if __name__ == "__main__":
    asyncio.run(seed_operational_statistics())
