"""
Router de Notificaciones – /api/v1/notificaciones
"""
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user_payload, require_any_user
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import (
    NotificacionResponse, MessageResponse, PaginatedResponse,
)

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


# ── Mis notificaciones ────────────────────────────────────────────────────────
@router.get("", response_model=PaginatedResponse, summary="Mis notificaciones")
async def mis_notificaciones(
    solo_no_leidas: bool = Query(False),
    pagina:         int  = Query(1, ge=1),
    por_pagina:     int  = Query(30, ge=1, le=100),
    payload: dict = Depends(require_any_user),
):
    db     = get_db()
    filtro: dict = {"usuarioId": payload["sub"]}
    if solo_no_leidas:
        filtro["leida"] = False

    total  = await db[Collections.NOTIFICACIONES].count_documents(filtro)
    cursor = (
        db[Collections.NOTIFICACIONES]
        .find(filtro)
        .sort("fechaEnvio", -1)
        .skip((pagina - 1) * por_pagina)
        .limit(por_pagina)
    )
    datos = []
    async for n in cursor:
        datos.append(NotificacionResponse(
            id=str(n["_id"]),
            usuarioId=n["usuarioId"],
            tipo=n["tipo"],
            mensaje=n["mensaje"],
            canal=n["canal"],
            leida=n["leida"],
            fechaEnvio=n["fechaEnvio"],
            reservaId=n.get("reservaId"),
        ))
    return PaginatedResponse(total=total, pagina=pagina, por_pagina=por_pagina, datos=datos)


# ── Marcar como leída ─────────────────────────────────────────────────────────
@router.patch("/{noti_id}/leida", response_model=MessageResponse,
              summary="Marcar notificación como leída")
async def marcar_leida(
    noti_id: str,
    payload: dict = Depends(require_any_user),
):
    db  = get_db()
    doc = await db[Collections.NOTIFICACIONES].find_one({"_id": ObjectId(noti_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")
    if doc["usuarioId"] != payload["sub"]:
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    await db[Collections.NOTIFICACIONES].update_one(
        {"_id": ObjectId(noti_id)}, {"$set": {"leida": True}}
    )
    return MessageResponse(message="Notificación marcada como leída.")


# ── Marcar todas como leídas ──────────────────────────────────────────────────
@router.patch("/todas/leidas", response_model=MessageResponse,
              summary="Marcar todas como leídas")
async def marcar_todas_leidas(payload: dict = Depends(require_any_user)):
    db = get_db()
    await db[Collections.NOTIFICACIONES].update_many(
        {"usuarioId": payload["sub"], "leida": False},
        {"$set": {"leida": True}},
    )
    return MessageResponse(message="Todas las notificaciones marcadas como leídas.")
