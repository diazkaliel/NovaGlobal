import pytest
import uuid
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.attendance import AttendanceRecord
from app.core.security import hash_password
from app.core.dependencies import get_current_user, get_current_admin
from app.main import app
from sqlalchemy import select


@pytest.mark.asyncio
async def test_clock_in_and_clock_out_flow(client, db_session):
    """Prueba el ciclo de marcar entrada y marcar salida con cálculo de tiempo."""
    uid = uuid.uuid4().hex[:8]
    user = User(
        name=f"Trabajador {uid}",
        email=f"trabajador_{uid}@nova.com",
        hashed_password=hash_password("Password123!"),
        role="technician",
        system="nova",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        # 1. Marcar Entrada
        in_res = await client.post("/attendance/clock-in", json={"notes": "Entrada turno mañana", "system": "nova"})
        assert in_res.status_code == 201
        in_data = in_res.json()
        assert in_data["clock_in"] is not None
        assert in_data["clock_out"] is None
        assert in_data["system"] == "nova"

        # 2. Consultar Estado en Vivo
        status_res = await client.get("/attendance/my-status")
        assert status_res.status_code == 200
        st_data = status_res.json()
        assert st_data["is_clocked_in"] is True
        assert st_data["active_record"]["id"] == in_data["id"]

        # 3. Intentar marcar entrada de nuevo mientras está abierta (debe rechazar con 400)
        duplicate_in = await client.post("/attendance/clock-in", json={"system": "nova"})
        assert duplicate_in.status_code == 400
        assert "Ya tienes un turno activo" in duplicate_in.json()["detail"]

        # 4. Marcar Salida
        out_res = await client.post("/attendance/clock-out", json={"notes": "Salida puntual"})
        assert out_res.status_code == 200
        out_data = out_res.json()
        assert out_data["clock_out"] is not None
        assert out_data["total_minutes"] is not None

        # 5. Consultar Estado después de salida
        status_after = await client.get("/attendance/my-status")
        assert status_after.json()["is_clocked_in"] is False

        # 6. Consultar Mi Historial Personal de Asistencia
        my_hist = await client.get("/attendance/my-history")
        assert my_hist.status_code == 200
        assert len(my_hist.json()) >= 1
        assert my_hist.json()[0]["id"] == in_data["id"]

        # 7. Verificar que un trabajador NO puede acceder a rutas de administración (debe recibir 403)
        admin_users_attempt = await client.get("/admin/users")
        assert admin_users_attempt.status_code == 403

        admin_records_attempt = await client.get("/attendance/admin/records")
        assert admin_records_attempt.status_code == 403

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_user_crud_and_attendance_records(client, db_session):
    """Prueba la gestión de colaboradores y auditoría de horarios por el Administrador."""
    uid = uuid.uuid4().hex[:8]
    admin = User(
        name=f"Admin {uid}",
        email=f"admin_{uid}@nova.com",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        is_active=True
    )
    db_session.add(admin)
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_current_admin] = lambda: admin

    try:
        new_email = f"nuevo_tecnico_{uid}@nova.com"
        # 1. Crear nuevo colaborador desde Admin
        new_user_res = await client.post("/admin/users", json={
            "name": "Nuevo Tecnico",
            "email": new_email,
            "password": "Password123!",
            "role": "technician"
        })
        assert new_user_res.status_code == 201
        created_user = new_user_res.json()
        assert created_user["email"] == new_email
        assert created_user["role"] == "technician"

        # 2. Listar usuarios
        users_list = await client.get("/admin/users")
        assert users_list.status_code == 200
        emails = [u["email"] for u in users_list.json()]
        assert new_email in emails

        # 3. Resetear contraseña de colaborador
        reset_res = await client.post(f"/admin/users/{created_user['id']}/reset-password", json={
            "new_password": "NewSecretPassword2026!"
        })
        assert reset_res.status_code == 200
        assert reset_res.json()["status"] == "success"

        # 4. Consultar registros de asistencia globales
        att_records = await client.get("/attendance/admin/records")
        assert att_records.status_code == 200
        assert isinstance(att_records.json(), list)

        # 5. Consultar Bitácora de Actividades (Auditoría)
        activity_logs = await client.get("/admin/activity-logs")
        assert activity_logs.status_code == 200
        assert isinstance(activity_logs.json(), list)

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_activity_logs_filtering(client, db_session):
    """Prueba los filtros de la bitácora de auditoría (por categoría, colaborador y sistema)."""
    admin = User(
        name="Admin Auditor",
        email=f"auditor_{uuid.uuid4().hex[:6]}@nova.com",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        is_active=True
    )
    db_session.add(admin)
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_current_admin] = lambda: admin

    try:
        # Consultar por categoría attendance
        att_logs = await client.get("/admin/activity-logs?category=attendance")
        assert att_logs.status_code == 200
        assert isinstance(att_logs.json(), list)

        # Consultar por categoría orders
        order_logs = await client.get("/admin/activity-logs?category=orders")
        assert order_logs.status_code == 200
        assert isinstance(order_logs.json(), list)

        # Consultar por sistema
        nova_logs = await client.get("/admin/activity-logs?system=nova")
        assert nova_logs.status_code == 200
        assert isinstance(nova_logs.json(), list)

    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_store_strict_isolation_for_workers(client, db_session):
    """
    Verifica que los trabajadores asignados a Nova no puedan acceder a Bravo
    y que los trabajadores de Bravo no puedan acceder a Nova (aislamiento total).
    Solo el Administrador tiene acceso global.
    """
    uid = uuid.uuid4().hex[:6]
    
    # 1. Colaborador exclusivo de NOVA
    nova_worker = User(
        name="Técnico Nova",
        email=f"nova_worker_{uid}@nova.com",
        hashed_password=hash_password("Pass123!"),
        role="technician",
        system="nova",
        is_active=True
    )
    # 2. Colaborador exclusivo de BRAVO
    bravo_worker = User(
        name="Operador Bravo",
        email=f"bravo_worker_{uid}@bravo.com",
        hashed_password=hash_password("Pass123!"),
        role="technician",
        system="bravo",
        is_active=True
    )
    # 3. Administrador Global
    admin_user = User(
        name="Admin General",
        email=f"super_admin_{uid}@global.com",
        hashed_password=hash_password("Pass123!"),
        role="admin",
        system="all",
        is_active=True
    )
    db_session.add_all([nova_worker, bravo_worker, admin_user])
    await db_session.flush()

    # --- TEST A: Nova Worker intenta acceder a recursos de Bravo -> HTTP 403 ---
    app.dependency_overrides[get_current_user] = lambda: nova_worker
    try:
        # A1: Consultar reparaciones de Bravo
        res_rep = await client.get("/repairs/?system=bravo")
        assert res_rep.status_code == 403

        # A2: Consultar ventas de Bravo
        res_sales = await client.get("/sales/?system=bravo")
        assert res_sales.status_code == 403

        # A3: Consultar caja chica de Bravo
        res_cash = await client.get("/cash-register/status?system=bravo")
        assert res_cash.status_code == 403

        # A4: Consultar inventario de Bravo
        res_inv = await client.get("/inventory/?system=bravo")
        assert res_inv.status_code == 403

        # A5: Marcar entrada en Bravo
        res_clock = await client.post("/attendance/clock-in", json={"system": "bravo"})
        assert res_clock.status_code == 403

        # A6: Consultar sus recursos de Nova -> Permitido (200)
        res_nova_rep = await client.get("/repairs/?system=nova")
        assert res_nova_rep.status_code == 200
    finally:
        app.dependency_overrides.clear()

    # --- TEST B: Bravo Worker intenta acceder a recursos de Nova -> HTTP 403 ---
    app.dependency_overrides[get_current_user] = lambda: bravo_worker
    try:
        # B1: Consultar reparaciones de Nova
        res_rep_nova = await client.get("/repairs/?system=nova")
        assert res_rep_nova.status_code == 403

        # B2: Consultar ventas de Nova
        res_sales_nova = await client.get("/sales/?system=nova")
        assert res_sales_nova.status_code == 403

        # B3: Consultar sus recursos de Bravo -> Permitido (200)
        res_bravo_rep = await client.get("/repairs/?system=bravo")
        assert res_bravo_rep.status_code == 200
    finally:
        app.dependency_overrides.clear()

    # --- TEST C: Admin Global puede consultar ambos sistemas libremente ---
    app.dependency_overrides[get_current_user] = lambda: admin_user
    app.dependency_overrides[get_current_admin] = lambda: admin_user
    try:
        assert (await client.get("/repairs/?system=nova")).status_code == 200
        assert (await client.get("/repairs/?system=bravo")).status_code == 200
        assert (await client.get("/sales/?system=nova")).status_code == 200
        assert (await client.get("/sales/?system=bravo")).status_code == 200
        assert (await client.get("/inventory/?system=nova")).status_code == 200
        assert (await client.get("/inventory/?system=bravo")).status_code == 200
    finally:
        app.dependency_overrides.clear()
