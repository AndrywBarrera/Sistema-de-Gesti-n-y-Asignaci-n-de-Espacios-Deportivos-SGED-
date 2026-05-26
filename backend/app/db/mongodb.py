"""
Conexión asíncrona a MongoDB usando Motor.
Expone la instancia de la base de datos y helpers de colección.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logger import logger

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """Abre la conexión al iniciar la aplicación."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    # Ping para verificar la conexión
    await _client.admin.command("ping")
    logger.info("✅ MongoDB conectado → %s / %s", settings.MONGO_URI, settings.MONGO_DB_NAME)


async def close_db() -> None:
    """Cierra la conexión al detener la aplicación."""
    global _client
    if _client:
        _client.close()
        logger.info("🔌 MongoDB desconectado.")


def get_db() -> AsyncIOMotorDatabase:
    """Retorna la instancia de la base de datos activa."""
    if _client is None:
        raise RuntimeError("La base de datos no está conectada. Llama connect_db() primero.")
    return _client[settings.MONGO_DB_NAME]


# ── Nombres de colecciones (fuente única de verdad) ──────────────────────────
class Collections:
    USUARIOS            = "usuarios"
    ESPACIOS_DEPORTIVOS = "espacios_deportivos"
    RESERVAS            = "reservas"
    NOTIFICACIONES      = "notificaciones"
    REPORTES            = "reportes"
    REFRESH_TOKENS      = "refresh_tokens"   # lista negra / almacén de refresh
    CALENDARIO          = "calendario"       # eventos recurrentes, bloqueos, etc.
    VENCIDO_CALENDARIO   = "vencido_calendario" # eventos pasados para estadísticas/histórico
