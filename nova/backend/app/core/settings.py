from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    DATABASE_URL: str
    SECRET_KEY: str
    ENVIRONMENT: str = "development"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600  # 1 año de sesión continua
    REFRESH_TOKEN_EXPIRE_DAYS: int = 365
    CORS_ORIGINS: str = ""
    CORS_ORIGIN_REGEX: str = ""


settings = Settings()