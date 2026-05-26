"""
Agregador de todos los routers de la API v1.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, usuarios, espacios, reservas, notificaciones, reportes,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(espacios.router)
api_router.include_router(reservas.router)
api_router.include_router(notificaciones.router)
api_router.include_router(reportes.router)
