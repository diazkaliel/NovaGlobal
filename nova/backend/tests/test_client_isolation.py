import pytest
from app.models.user import User
from app.core.dependencies import get_current_user, get_current_admin
from app.main import app
import uuid


@pytest.mark.asyncio
async def test_client_isolation_between_nova_and_bravo(client, db_session):
    """
    Verifica que la lógica de aislamiento de clientes entre Nova y Bravo funcione:
    1. Un mismo teléfono puede registrarse en Nova y en Bravo sin colisión.
    2. Intentar registrar el mismo teléfono dos veces en la misma tienda debe arrojar error 400.
    3. El filtrado por sistema en la API solo retorna los clientes pertenecientes a esa tienda.
    """
    # Crear admin transversal para realizar las pruebas
    admin = User(
        name="Admin Test Isolation",
        email=f"admin_iso_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password="hash",
        role="admin",
        system="all",
        is_active=True
    )
    db_session.add(admin)
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_current_admin] = lambda: admin

    shared_phone = f"+569{uuid.uuid4().int % 100000000:08d}"
    rut_nova = f"{uuid.uuid4().int % 80000000 + 10000000}-1"
    rut_bravo = f"{uuid.uuid4().int % 80000000 + 10000000}-2"

    try:
        # 1. Registrar cliente en Nova
        payload_nova = {
            "name": "Cliente Nova Electrónica",
            "phone": shared_phone,
            "email": f"cliente_nova_{uuid.uuid4().hex[:4]}@mail.cl",
            "rut": rut_nova,
            "city": "Quillota",
            "system": "nova"
        }
        res_nova = await client.post("/clients/", json=payload_nova)
        assert res_nova.status_code == 201, res_nova.text
        nova_client_data = res_nova.json()
        assert nova_client_data["system"] == "nova"

        # 2. Registrar cliente en Bravo con el MISMO teléfono (debe permitirse por aislamiento)
        payload_bravo = {
            "name": "Cliente Bravo Textil",
            "phone": shared_phone,
            "email": f"cliente_bravo_{uuid.uuid4().hex[:4]}@mail.cl",
            "rut": rut_bravo,
            "city": "Quillota",
            "system": "bravo"
        }
        res_bravo = await client.post("/clients/", json=payload_bravo)
        assert res_bravo.status_code == 201, f"Falló registro cruzado: {res_bravo.text}"
        bravo_client_data = res_bravo.json()
        assert bravo_client_data["system"] == "bravo"
        assert bravo_client_data["id"] != nova_client_data["id"]

        # 3. Intentar registrar un segundo cliente en Nova con el MISMO teléfono (debe rebotar con 400)
        payload_nova_dup = {
            "name": "Cliente Nova Duplicado",
            "phone": shared_phone,
            "system": "nova"
        }
        res_dup = await client.post("/clients/", json=payload_nova_dup)
        assert res_dup.status_code == 400
        assert "ya está registrado" in res_dup.json()["detail"]

        # 4. Consultar clientes filtrados por Nova
        list_nova = await client.get("/clients/", params={"system": "nova", "search": shared_phone})
        assert list_nova.status_code == 200
        items_nova = list_nova.json()
        assert len(items_nova) == 1
        assert items_nova[0]["name"] == "Cliente Nova Electrónica"

        # 5. Consultar clientes filtrados por Bravo
        list_bravo = await client.get("/clients/", params={"system": "bravo", "search": shared_phone})
        assert list_bravo.status_code == 200
        items_bravo = list_bravo.json()
        assert len(items_bravo) == 1
        assert items_bravo[0]["name"] == "Cliente Bravo Textil"

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_current_admin, None)
