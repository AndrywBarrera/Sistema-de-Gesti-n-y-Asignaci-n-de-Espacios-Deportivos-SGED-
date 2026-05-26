"""
Servicio de simulación del SSO Institucional UPTC.
En producción real, este módulo se reemplaza por la integración
con el proveedor SSO real (OAuth2 / SAML / LDAP).

La simulación consulta MongoDB como fuente de usuarios institucionales,
permitiendo desarrollo y pruebas sin depender del SSO real.
"""
from zoneinfo import ZoneInfo
from datetime import datetime
from typing import Optional

from bson import ObjectId

from app.core.config import settings
from app.core.logger import logger
from app.core.security import verify_password, hash_password
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import RolUsuario




async def autenticar_usuario_institucional(
    correo: str,
    password: str,
) -> Optional[dict]:
    """
    Simula la autenticación contra el SSO institucional.
    Flujo real:
      1. Redirigir al usuario al proveedor SSO (OAuth2 / SAML).
      2. Recibir el token/aserción.
      3. Extraer claims del token.
      4. Crear o actualizar el usuario local en MongoDB.
    """
    if settings.SSO_ENABLED:
        # Aquí iría la lógica real de SSO
        raise NotImplementedError(
            "SSO real aún no implementado. Configura SSO_ENABLED=False para usar simulación."
        )

    db = get_db()
    usuario = await db[Collections.USUARIOS].find_one({"correo": correo})

    if not usuario:
        return None

    if not verify_password(password, usuario["password"]):
        return None

    if not usuario.get("activo", False):
        return None
    print("Usuario autenticado:", usuario)
    # Actualizar último acceso
    await db[Collections.USUARIOS].update_one(
        {"_id": usuario["_id"]},
        {"$set": {"ultimoAcceso": datetime.now(ZoneInfo("America/Bogota"))}},
    )

    return _serialize_usuario(usuario)


def _serialize_usuario(doc: dict) -> dict:
    """Convierte un documento Mongo a dict serializable."""
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password", None)
    return doc


async def obtener_usuario_por_id(usuario_id: str) -> Optional[dict]:
    """Obtiene un usuario por su ObjectId."""
    db = get_db()
    try:
        doc = await db[Collections.USUARIOS].find_one({"_id": ObjectId(usuario_id)})
    except Exception:
        return None
    if doc:
        return _serialize_usuario(doc)
    return None


async def obtener_usuario_por_correo(correo: str) -> Optional[dict]:
    """Obtiene un usuario por su correo institucional."""
    db = get_db()
    doc = await db[Collections.USUARIOS].find_one({"correo": correo})
    if doc:
        return _serialize_usuario(doc)
    return None

from datetime import datetime, timedelta, timezone
from typing import Dict

