from pydantic import BaseModel


# Lo que el usuario envía para hacer login
class LoginRequest(BaseModel):
    email: str
    password: str


# Lo que la API devuelve tras un login exitoso
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int | None = None