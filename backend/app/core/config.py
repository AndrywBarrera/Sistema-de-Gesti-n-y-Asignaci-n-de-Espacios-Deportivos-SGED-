"""
Configuración central del proyecto SGED.
Lee todas las variables desde el archivo .env usando pydantic-settings.
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- APP ---
    APP_NAME: str = "SGED API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # --- SERVIDOR ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    # --- SEGURIDAD / JWT ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- MONGODB ---
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "sged_db"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    CORS_ALLOW_CREDENTIALS: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    # --- SSO INSTITUCIONAL (simulado con MongoDB) ---
    SSO_ENABLED: bool = False
    SSO_PROVIDER_URL: str = "https://sso.uptc.edu.co"
    SSO_CLIENT_ID: str = "sged_client"
    SSO_CLIENT_SECRET: str = "secret"
    SSO_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/sso/callback"
    SSO_SCOPE: str = "openid email profile"

    # --- CLOUDINARY ---
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_FOLDER: str = "sged/espacios"

    # --- EMAIL ---
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "notificaciones@uptc.edu.co"
    MAIL_FROM_NAME: str = "SGED - UPTC"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # --- RATE LIMITING ---
    RATE_LIMIT_PER_MINUTE: int = 60

    # --- LOGGING ---
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/sged.log"


@lru_cache()
def get_settings() -> Settings:
    """Retorna instancia cacheada de Settings (singleton)."""
    return Settings()


settings = get_settings()
