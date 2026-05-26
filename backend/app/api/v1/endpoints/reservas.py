"""
Router de Reservas – /api/v1/reservas
Endpoints para solicitar, gestionar, cancelar y consultar reservas.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import (
    get_current_user_payload, require_admin_or_adm, require_any_user,
)
from app.schemas.schemas import (
    ReservaCreate, GestionReservaRequest, ReservaResponse,
    MessageResponse, PaginatedResponse, EstadoReserva, CalendarioResponse
)
from app.services import reserva_service as svc

router = APIRouter(prefix="/reservas", tags=["Reservas"])


# ── Crear reserva (cualquier usuario) ────────────────────────────────────────
@router.post("", response_model=ReservaResponse, status_code=201,
             summary="Solicitar reserva")
async def crear_reserva(
    body: ReservaCreate,
    payload: dict = Depends(require_any_user),
):
    """Crea una nueva solicitud de reserva con estado Pendiente."""
    try:
        doc = await svc.crear_reserva(payload["sub"], body)
        return ReservaResponse(**doc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── Listar Calendario ────────────────────────────────────────
@router.get("/calendario", response_model=CalendarioResponse, summary="Listar Calendario")
async def listar_calendario(
    payload: dict = Depends(require_any_user),
):
    """
    Retorna el calendario completo con la disponibilidad de los espacios.
    """
    calendario = await svc.obtener_disponibilidad()
    return CalendarioResponse(**calendario)

# ── Listar reservas ───────────────────────────────────────────────────────────
@router.get("", response_model=PaginatedResponse, summary="Listar reservas")
async def listar_reservas(
    espacio_id: Optional[str]          = Query(None),
    estado:     Optional[EstadoReserva]= Query(None),
    fecha:      Optional[str]          = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    pagina:     int                    = Query(1, ge=1),
    por_pagina: int                    = Query(20, ge=1, le=100),
    payload: dict = Depends(require_admin_or_adm),
):
    """
    - Administrador / Administrativo: ven todas las reservas.
    - Otros roles: ven solo sus propias reservas.
    """
    usuario_id = None
    if payload["role"] not in ("Administrador", "Administrativo"):
        usuario_id = payload["sub"]

    result = await svc.listar_reservas(
        usuario_id=usuario_id,
        espacio_id=espacio_id,
        estado=estado,
        fecha=fecha,
        pagina=pagina,
        por_pagina=por_pagina,
    )
    return PaginatedResponse(**result)


# ── Obtener reserva por ID ────────────────────────────────────────────────────
@router.get("/{reserva_id}", response_model=ReservaResponse,
            summary="Obtener reserva por ID")
async def obtener_reserva(
    reserva_id: str,
    payload: dict = Depends(require_any_user),
):
    doc = await svc.obtener_reserva_por_id(reserva_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Reserva no encontrada.")

    # Usuarios normales solo ven sus propias reservas
    if payload["role"] not in ("Administrador", "Administrativo"):
        if doc["usuarioId"] != payload["sub"]:
            raise HTTPException(status_code=403, detail="Acceso denegado.")

    return ReservaResponse(**doc)


# ── Gestionar reserva (aprobar / rechazar) – solo Administrativo/Admin ────────
@router.patch("/{reserva_id}/gestion", response_model=ReservaResponse,
              summary="Aprobar o rechazar una reserva")
async def gestionar_reserva(
    reserva_id: str,
    body: GestionReservaRequest,
    payload: dict = Depends(require_admin_or_adm),
):
    """
    Aprueba o rechaza una solicitud de reserva.
    - Rechazar requiere justificación obligatoria.
    - Aprobar dispara rechazo automático de conflictos (RF10).
    """
    try:
        doc = await svc.gestionar_reserva(
            reserva_id,
            body.accion,
            payload["sub"],
            body.justificacion,
        )
        return ReservaResponse(**doc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Cancelar reserva (el propio solicitante) ──────────────────────────────────
@router.patch("/{reserva_id}/cancelar", response_model=ReservaResponse,
              summary="Cancelar mi reserva")
async def cancelar_reserva(
    reserva_id: str,
    payload: dict = Depends(require_any_user),
):
    """El usuario cancela su propia reserva (Pendiente o Aprobada)."""
    try:
        doc = await svc.cancelar_reserva(reserva_id, payload["sub"])
        return ReservaResponse(**doc)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ── Mis reservas ──────────────────────────────────────────────────────────────
@router.get("/mis/reservas", response_model=PaginatedResponse,
            summary="Mis reservas")
async def mis_reservas(
    estado:     Optional[EstadoReserva] = Query(None),
    pagina:     int                     = Query(1, ge=1),
    por_pagina: int                     = Query(20, ge=1, le=100),
    payload: dict = Depends(require_any_user),
):
    """Shortcut: retorna únicamente las reservas del usuario autenticado."""
    result = await svc.listar_reservas(
        usuario_id=payload["sub"],
        estado=estado,
        pagina=pagina,
        por_pagina=por_pagina,
    )
    return PaginatedResponse(**result)

