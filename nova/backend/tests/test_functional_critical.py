import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.client import Client
from app.main import app
from app.core.dependencies import get_current_user
import io

@pytest.mark.asyncio
async def test_upload_public_design_success(client):
    # 1. Preparar un archivo PNG simulado (pequeño y válido en formato)
    file_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"file": ("test_logo.png", file_data, "image/png")}
    
    # 2. Hacer la petición POST
    response = await client.post("/public/upload-design", files=files)
    
    # 3. Verificar estado 201 y que retorne una URL en uploads
    assert response.status_code == 201
    json_data = response.json()
    assert "url" in json_data
    assert json_data["url"].startswith("/uploads/public_")
    
    # Limpieza: borrar archivo creado
    filename = json_data["url"].split("/")[-1]
    filepath = f"uploads/{filename}"
    import os
    if os.path.exists(filepath):
        os.remove(filepath)

@pytest.mark.asyncio
async def test_upload_public_design_invalid_format(client):
    # 1. Preparar un archivo de texto con extensión no permitida
    file_data = b"contenido de prueba ejecutable o texto plano"
    files = {"file": ("malicious_script.sh", file_data, "text/plain")}
    
    # 2. Hacer la petición POST
    response = await client.post("/public/upload-design", files=files)
    
    # 3. Debe fallar con HTTP 400 Bad Request
    assert response.status_code == 400
    assert "Formato de archivo no soportado" in response.json()["detail"]

@pytest.mark.asyncio
async def test_upload_public_design_exceeds_size_limit(client):
    # 1. Preparar un archivo de más de 5MB
    # 5MB + 1 byte
    five_mb_plus = b"x" * (5 * 1024 * 1024 + 1)
    files = {"file": ("huge_image.png", five_mb_plus, "image/png")}
    
    # 2. Hacer la petición POST
    response = await client.post("/public/upload-design", files=files)
    
    # 3. Debe fallar con HTTP 400 Bad Request por tamaño excedido
    assert response.status_code == 400
    assert "El archivo excede el tamaño máximo" in response.json()["detail"]

@pytest.mark.asyncio
async def test_request_order_validation_success(client, db_session):
    # 1. Enviar una petición de orden pública válida
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
        "accessories": "Entregar en empaque de regalo",
        "design_file_url": "/uploads/test_design.png",
        "mockup_file_url": "/uploads/test_mockup.png"
    }
    
    response = await client.post("/public/order-requests", json=order_data)
    
    assert response.status_code == 201
    resp_json = response.json()
    assert resp_json["status"] == "success"
    assert "order_number" in resp_json


@pytest.mark.asyncio
async def test_request_order_validation_invalid_email(client):
    # 1. Enviar un email con formato inválido
    order_data = {
        "client_name": "Juan Perez",
        "client_phone": "+56912345678",
        "client_email": "email_sin_formato_correcto",
        "device_type": "Tazón",
        "brand": "Sublimado",
        "model": "Blanco",
        "reported_issue": "Foto familiar"
    }
    
    response = await client.post("/public/order-requests", json=order_data)
    
    # Pydantic retorna 422 Unprocessable Entity si falla la validación
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"] == ["body", "client_email"] for err in errors)

@pytest.mark.asyncio
async def test_request_order_missing_required_fields(client):
    # 1. Omitir campos requeridos (client_name y device_type)
    order_data = {
        "client_phone": "+56912345678",
        "brand": "Personalizado",
        "model": "Estampado",
        "reported_issue": "Detalles del diseño"
    }
    
    response = await client.post("/public/order-requests", json=order_data)
    
    # Debe fallar con 422
    assert response.status_code == 422
    errors = response.json()["detail"]
    locs = [err["loc"] for err in errors]
    assert ["body", "client_name"] in locs
    assert ["body", "device_type"] in locs

@pytest.mark.asyncio
async def test_upload_inventory_image_unauthorized(client):
    # Intentar subir sin estar autenticado (debe fallar 401)
    file_data = b"dummy file bytes"
    files = {"file": ("product.jpg", file_data, "image/jpeg")}
    
    response = await client.post("/inventory/upload", files=files)
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

@pytest.mark.asyncio
async def test_upload_inventory_image_authorized_success(client, db_session):
    # 1. Crear un usuario técnico de prueba en DB
    user = User(
        name="Admin Test",
        email="admin_test@email.com",
        hashed_password="fake_password",
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    # 2. Hacer override de la dependencia get_current_user
    app.dependency_overrides[get_current_user] = lambda: user

    try:
        # 3. Subir archivo
        file_data = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06"  # Cabecera dummy JPEG
        files = {"file": ("test_item.jpg", file_data, "image/jpeg")}
        
        response = await client.post("/inventory/upload", files=files)
        
        assert response.status_code == 200
        json_data = response.json()
        assert "url" in json_data
        assert json_data["url"].startswith("/uploads/")
        
        # Limpieza
        filename = json_data["url"].split("/")[-1]
        filepath = f"uploads/{filename}"
        import os
        if os.path.exists(filepath):
            os.remove(filepath)
    finally:
        # Limpiar overrides
        app.dependency_overrides.clear()
