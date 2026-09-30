import pytest
from httpx import AsyncClient
from app.main import app
from app.models.user import User
from app.core.dependencies import get_current_user

@pytest.mark.asyncio
async def test_public_web_config_returns_content(client: AsyncClient):
    # Test Nova web config has content
    res_nova = await client.get("/public/web-config?system=nova")
    assert res_nova.status_code == 200
    data_nova = res_nova.json()
    assert "content" in data_nova
    assert "hero" in data_nova["content"]
    assert data_nova["content"]["hero"]["badge"] == "SISTEMA_ONLINE"

    # Test Bravo web config has techniques
    res_bravo = await client.get("/public/web-config?system=bravo")
    assert res_bravo.status_code == 200
    data_bravo = res_bravo.json()
    assert "content" in data_bravo
    assert "techniques" in data_bravo["content"]
    assert len(data_bravo["content"]["techniques"]) > 0


@pytest.mark.asyncio
async def test_admin_can_update_cms_content(client: AsyncClient):
    fake_admin = User(id=999, name="Admin Test", email="admin_cms@test.com", role="admin", system="all", is_active=True)
    app.dependency_overrides[get_current_user] = lambda: fake_admin

    try:
        # Fetch current
        res = await client.get("/public/web-config?system=nova")
        assert res.status_code == 200
        config = res.json()

        # Modify content
        config["content"]["hero"]["title_prefix"] = "LABORATORIO MASTER"
        config["content"]["hero"]["banner_active"] = True
        config["content"]["hero"]["banner_text"] = "Oferta exclusiva tecnicos"

        # Update via POST
        update_res = await client.post(
            "/public/web-config?system=nova",
            json=config
        )
        assert update_res.status_code == 200

        # Verify updated content persisted
        verify_res = await client.get("/public/web-config?system=nova")
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["content"]["hero"]["title_prefix"] == "LABORATORIO MASTER"
        assert verify_data["content"]["hero"]["banner_active"] is True
        assert verify_data["content"]["hero"]["banner_text"] == "Oferta exclusiva tecnicos"
    finally:
        app.dependency_overrides.clear()
