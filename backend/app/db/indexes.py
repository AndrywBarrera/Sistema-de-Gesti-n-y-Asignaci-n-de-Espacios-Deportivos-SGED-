"""
Creación de índices en MongoDB al arrancar la aplicación.
Garantiza rendimiento en las consultas más frecuentes.
"""
from pymongo import ASCENDING, DESCENDING
from app.db.mongodb import get_db, Collections
from app.core.logger import logger


async def create_indexes() -> None:
    db = get_db()

    # ── usuarios ──────────────────────────────────────────────────────────────
    await db[Collections.USUARIOS].create_index(
        [("correo", ASCENDING)], unique=True, name="idx_usuarios_correo"
    )
    await db[Collections.USUARIOS].create_index(
        [("rol", ASCENDING)], name="idx_usuarios_rol"
    )
    await db[Collections.USUARIOS].create_index(
        [("activo", ASCENDING)], name="idx_usuarios_activo"
    )

    # ── espacios_deportivos ───────────────────────────────────────────────────
    await db[Collections.ESPACIOS_DEPORTIVOS].create_index(
        [("nombre", ASCENDING)], unique=True, name="idx_espacios_nombre"
    )
    await db[Collections.ESPACIOS_DEPORTIVOS].create_index(
        [("estado", ASCENDING)], name="idx_espacios_estado"
    )

    # ── reservas ──────────────────────────────────────────────────────────────
    await db[Collections.RESERVAS].create_index(
        [("usuarioId", ASCENDING)], name="idx_reservas_usuario"
    )
    await db[Collections.RESERVAS].create_index(
        [("espacioId", ASCENDING)], name="idx_reservas_espacio"
    )
    await db[Collections.RESERVAS].create_index(
        [("fecha", ASCENDING)], name="idx_reservas_fecha"
    )
    await db[Collections.RESERVAS].create_index(
        [("estado", ASCENDING)], name="idx_reservas_estado"
    )
    # Índice compuesto para detección rápida de conflictos
    await db[Collections.RESERVAS].create_index(
        [("espacioId", ASCENDING), ("fecha", ASCENDING), ("estado", ASCENDING)],
        name="idx_reservas_conflicto",
    )

    # ── notificaciones ────────────────────────────────────────────────────────
    await db[Collections.NOTIFICACIONES].create_index(
        [("usuarioId", ASCENDING)], name="idx_noti_usuario"
    )
    await db[Collections.NOTIFICACIONES].create_index(
        [("leida", ASCENDING)], name="idx_noti_leida"
    )
    await db[Collections.NOTIFICACIONES].create_index(
        [("fechaEnvio", DESCENDING)], name="idx_noti_fecha"
    )

    # ── reportes ──────────────────────────────────────────────────────────────
    await db[Collections.REPORTES].create_index(
        [("administradorId", ASCENDING)], name="idx_reportes_admin"
    )
    await db[Collections.REPORTES].create_index(
        [("fechaGeneracion", DESCENDING)], name="idx_reportes_fecha"
    )

    # ── refresh_tokens ────────────────────────────────────────────────────────
    await db[Collections.REFRESH_TOKENS].create_index(
        [("token", ASCENDING)], unique=True, name="idx_refresh_token"
    )
    await db[Collections.REFRESH_TOKENS].create_index(
        [("usuarioId", ASCENDING)], name="idx_refresh_usuario"
    )
    # TTL: se eliminan automáticamente al expirar
    await db[Collections.REFRESH_TOKENS].create_index(
        [("expira", ASCENDING)],
        expireAfterSeconds=0,
        name="idx_refresh_ttl",
    )

    logger.info("✅ Índices de MongoDB creados/verificados.")
