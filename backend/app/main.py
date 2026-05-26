"""
Aplicación principal FastAPI – SGED
Configuración de: CORS, rate limiting, lifecycle hooks, routers, manejo de errores.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.logger import logger
from app.db.mongodb import connect_db, close_db
from app.db.indexes import create_indexes
from app.api.v1.router import api_router


# ── Rate Limiter (slowapi) ────────────────────────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup y shutdown de la aplicación."""
    logger.info("🚀 Iniciando SGED API v%s [%s]", settings.APP_VERSION, settings.APP_ENV)
    await connect_db()
    await create_indexes()
    logger.info("✅ SGED listo en http://%s:%d%s", settings.HOST, settings.PORT, settings.API_V1_PREFIX)
    yield
    await close_db()
    logger.info("🛑 SGED detenido.")


# ── Factory ───────────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "**API REST del Sistema de Gestión y Asignación de Espacios Deportivos (SGED)**\n\n"
            "Universidad Pedagógica y Tecnológica de Colombia – UPTC\n\n"
            "### Roles del sistema\n"
            "- **Administrador**: control total\n"
            "- **Administrativo**: gestiona reservas y espacios\n"
            "- **Estudiante / Docente / Empleado**: consultan y solicitan reservas\n"
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        debug=settings.DEBUG,
    )

    # ── Rate limiting ─────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # ── Handlers globales de errores ──────────────────────────────────────────
    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"success": False, "detail": "Recurso no encontrado."},
        )

    @app.exception_handler(500)
    async def server_error_handler(request: Request, exc):
        logger.error("❌ Error interno: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "detail": "Error interno del servidor."},
        )

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["Sistema"], summary="Estado de la API")
    async def health():
        return {
            "status": "ok",
            "app":    settings.APP_NAME,
            "version": settings.APP_VERSION,
            "env":    settings.APP_ENV,
        }

    return app


app = create_app()
