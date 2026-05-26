"""
Módulo de seguridad SGED.
Maneja: hashing de contraseñas, creación/verificación de JWT,
extracción del usuario actual desde el token.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logger import logger

# ── Configuración de hashing ──────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Bearer scheme ─────────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer(auto_error=False)


# ── Contraseñas ───────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Retorna el hash bcrypt de una contraseña en texto plano."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica que la contraseña plana coincida con el hash."""
    return pwd_context.verify(plain, hashed)


# ── Tokens JWT ────────────────────────────────────────────────────────────────

def _create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    payload.update({
        "iat": now,
        "exp": now + expires_delta,
        "type": token_type,
    })
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str, role: str, extra: dict | None = None) -> str:
    """Crea un JWT de acceso con expiración corta."""
    data = {"sub": subject, "role": role}
    if extra:
        data.update(extra)
    return _create_token(
        data,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(subject: str) -> str:
    """Crea un JWT de refresco con expiración larga."""
    return _create_token(
        {"sub": subject},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


def decode_token(token: str) -> dict:
    """
    Decodifica y valida un JWT.
    Lanza HTTPException 401 si es inválido o expirado.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError as exc:
        logger.warning("Token inválido: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Dependencias FastAPI ──────────────────────────────────────────────────────

def _extract_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autenticación.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def get_current_user_payload(
    token: str = Depends(_extract_token),
) -> dict:
    """Dependencia: retorna el payload del token del usuario autenticado."""
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token de acceso.",
        )
    return payload


class RoleChecker:
    """
    Dependencia de autorización basada en roles.
    Uso: Depends(RoleChecker(["Administrador", "Administrativo"]))
    """

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, payload: dict = Depends(get_current_user_payload)) -> dict:
        role = payload.get("role", "")
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{role}' no tiene permiso para este recurso.",
            )
        return payload


# Dependencias de roles predefinidas
require_admin        = RoleChecker(["Administrador"])
require_admin_or_adm = RoleChecker(["Administrativo"])
require_any_user     = RoleChecker(
    ["Administrador", "Administrativo", "Estudiante", "Docente", "Empleado"]
)
