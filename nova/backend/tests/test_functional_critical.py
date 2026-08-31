import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.client import Client
from app.main import app
from app.core.dependencies import get_current_user, get_current_admin
from app.core.security import hash_password
import io
import os
import uuid


@pytest.mark.asyncio
async def test_upload_public_design_success(client):
    file_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"file": ("test_logo.png", file_data, "image/png")}
    
    response = await client.post("/public/upload-design", files=files)
    
    assert response.status_code == 201
    json_data = response.json()
    assert "url" in json_data
    assert json_data["url"].startswith("/uploads/public_")
    
    filename = json_data["url"].split("/")[-1]
    filepath = f"uploads/{filename}"
    if os.path.exists(filepath):
        os.remove(filepath)


@pytest.mark.asyncio
async def test_upload_public_design_invalid_format(client):
    file_data = b"contenido de prueba ejecutable o texto plano"
    files = {"file": ("malicious_script.sh", file_data, "text/plain")}
    
    response = await client.post("/public/upload-design", files=files)
    
    assert response.status_code == 400
    assert "Formato de archivo no soportado" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_public_design_exceeds_size_limit(client):
    five_mb_plus = b"x" * (5 * 1024 * 1024 + 1)
    files = {"file": ("huge_image.png", five_mb_plus, "image/png")}
    
    response = await client.post("/public/upload-design", files=files)
    
    assert response.status_code == 400
    assert "El archivo excede el tamaño máximo" in response.json()["detail"]


@pytest.mark.asyncio
async def test_request_order_validation_success(client, db_session):
    order_data = {
        "client_name": "Juan Perez",
        "client_phone": "+56912345678",
        "client_email": "juan.perez@example.com",
        "client_rut": "12345678-9",
        "client_city": "Santiago",
        "device_type": "Polera",
        "brand": "Personalizado",
        "model": "Negro L",
        "reported_issue": "Estampado de logo en el pecho",
        "accessories": "Sin accesorios",
        "design_file_url": "/uploads/public_mock.png",
        "mockup_file_url": "/uploads/public_mockup.png"
    }

    response = await client.post("/public/order-requests", json=order_data)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert "order_number" in data
    assert data["order_number"].startswith("BRV-")


@pytest.mark.asyncio
async def test_public_order_missing_mandatory_fields(client):
    incomplete_order = {
        "client_email": "incompleto@example.com"
    }

    response = await client.post("/public/order-requests", json=incomplete_order)
    assert response.status_code == 422
    errors = response.json()["detail"]
    locs = [err["loc"] for err in errors]
    assert ["body", "client_name"] in locs
    assert ["body", "device_type"] in locs


@pytest.mark.asyncio
async def test_upload_inventory_image_unauthorized(client):
    file_data = b"dummy file bytes"
    files = {"file": ("product.jpg", file_data, "image/jpeg")}
    
    response = await client.post("/inventory/upload", files=files)
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_inventory_image_authorized_success(client, db_session):
    user = User(
        name="Admin Test",
        email="admin_test@email.com",
        hashed_password="fake_password",
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        file_data = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06"
        files = {"file": ("test_item.jpg", file_data, "image/jpeg")}
        
        response = await client.post("/inventory/upload", files=files)
        
        assert response.status_code == 200
        json_data = response.json()
        assert "url" in json_data
        assert json_data["url"].startswith("/uploads/")
        
        filename = json_data["url"].split("/")[-1]
        filepath = f"uploads/{filename}"
        if os.path.exists(filepath):
            os.remove(filepath)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_auth_register_prevents_privilege_escalation(client, db_session):
    """Verifica que el endpoint de registro no acepte rol 'admin' inyectado."""
    email = f"hacker_{uuid.uuid4().hex[:8]}@test.com"
    payload = {
        "name": "Intento Hacker",
        "email": email,
        "password": "Password123!",
        "role": "admin"
    }

    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "technician"
    assert data["email"] == email


@pytest.mark.asyncio
async def test_auth_login_success_and_failure(client, db_session):
    """Verifica login con credenciales válidas e inválidas."""
    email = f"login_user_{uuid.uuid4().hex[:8]}@test.com"
    user = User(
        name="Usuario Login",
        email=email,
        hashed_password=hash_password("CorrectPassword123!"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    # Login inválido
    res_fail = await client.post("/auth/login", json={
        "email": email,
        "password": "WrongPassword"
    })
    assert res_fail.status_code == 401

    # Login válido
    res_ok = await client.post("/auth/login", json={
        "email": email,
        "password": "CorrectPassword123!"
    })
    assert res_ok.status_code == 200
    tokens = res_ok.json()
    assert "access_token" in tokens
    assert tokens["token_type"] == "bearer"
