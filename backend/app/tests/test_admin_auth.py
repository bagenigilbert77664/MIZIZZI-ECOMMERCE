import pytest
from httpx import AsyncClient
from fastapi import status
from app.main import app

# Test credentials (ensure these exist in your test DB)
VALID_EMAIL = "REDACTED-SENDER-EMAIL"
VALID_PASSWORD = "junior2020"
INVALID_EMAIL = "invalid@example.com"
INVALID_PASSWORD = "wrongpassword"

@pytest.mark.asyncio
async def test_admin_login_success():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/admin/login", json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD
        })
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == VALID_EMAIL
    assert data["user"]["role"] == "admin"

@pytest.mark.asyncio
async def test_admin_login_invalid_password():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/admin/login", json={
            "email": VALID_EMAIL,
            "password": INVALID_PASSWORD
        })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_admin_login_invalid_email():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/admin/login", json={
            "email": INVALID_EMAIL,
            "password": VALID_PASSWORD
        })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

# Add more tests for refresh, logout, password reset, etc. if those endpoints exist
# Example:
# @pytest.mark.asyncio
# async def test_admin_logout():
#     ...
# @pytest.mark.asyncio
# async def test_admin_refresh_token():
#     ...
# @pytest.mark.asyncio
# async def test_admin_password_reset():
#     ...
