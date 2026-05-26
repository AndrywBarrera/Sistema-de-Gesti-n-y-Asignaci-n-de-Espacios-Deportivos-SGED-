"""
Router de Espacios Deportivos – /api/v1/espacios
CRUD de espacios + subida de imágenes + disponibilidad por fecha.
"""
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File

from app.core.security import (
    require_admin, require_admin_or_adm, require_any_user,
)
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import (
    EspacioCreate, EspacioUpdate, EspacioResponse,
    MessageResponse, PaginatedResponse, EstadoEspacio, TipoEspacio, EspaciosStatsResponse
)
from app.services.imagen_service import subir_imagen_espacio, eliminar_imagen_espacio
from app.services.reserva_service import obtener_disponibilidad

router = APIRouter(prefix="/espacios", tags=["Espacios Deportivos"])


def _serialize(doc: dict) -> EspacioResponse:
    return EspacioResponse(
        id=str(doc["_id"]),
        nombre=doc["nombre"],
        tipo=doc["tipo"],
        capacidad=doc["capacidad"],
        estado=doc["estado"],
        descripcion=doc.get("descripcion"),
        ubicacion=doc.get("ubicacion"),
        horarioApertura=doc["horarioApertura"],
        horarioCierre=doc["horarioCierre"],
        imagenUrl=doc.get("imagenUrl"),
    )


# ── Listar espacios ───────────────────────────────────────────────────────────
@router.get("", response_model=PaginatedResponse, summary="Listar espacios deportivos")
async def listar_espacios(
    tipo:      Optional[TipoEspacio]   = Query(None),
    estado:    Optional[EstadoEspacio] = Query(None),
    pagina:    int                     = Query(1, ge=1),
    por_pagina: int                    = Query(20, ge=1, le=100),
    _payload: dict = Depends(require_any_user),
):
    db     = get_db()
    filtro: dict = {}
    if tipo:   filtro["tipo"]   = tipo.value
    if estado: filtro["estado"] = estado.value

    total  = await db[Collections.ESPACIOS_DEPORTIVOS].count_documents(filtro)
    cursor = (
        db[Collections.ESPACIOS_DEPORTIVOS]
        .find(filtro)
        .sort("nombre", 1)
        .skip((pagina - 1) * por_pagina)
        .limit(por_pagina)
    )
    datos = [_serialize(e) async for e in cursor]
    return PaginatedResponse(total=total, pagina=pagina, por_pagina=por_pagina, datos=datos)


# ── Crear espacio ─────────────────────────────────────────────────────────────
@router.post("", response_model=EspacioResponse, status_code=201,
             summary="Crear espacio deportivo")
async def crear_espacio(
    body: EspacioCreate,
    _payload: dict = Depends(require_admin),
):
    db = get_db()
    if await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"nombre": body.nombre}):
        raise HTTPException(status_code=409, detail="Ya existe un espacio con ese nombre.")

    doc = body.model_dump()
    doc["estado"] = doc["estado"].value if hasattr(doc["estado"], "value") else doc["estado"]
    doc["tipo"]   = doc["tipo"].value   if hasattr(doc["tipo"], "value")   else doc["tipo"]

    result = await db[Collections.ESPACIOS_DEPORTIVOS].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)



@router.get(
    "/stats",
    response_model=EspaciosStatsResponse,
    summary="Obtener estadísticas de espacios"
)
async def obtener_stats_espacios(
    _payload: dict = Depends(require_admin_or_adm),
):
    db = get_db()

    espacios_collection = db[Collections.ESPACIOS_DEPORTIVOS]
    calendario_collection = db[Collections.CALENDARIO]

    espacios = await espacios_collection.find().to_list(None)

    total = len(espacios)

    disponibles = sum(
        1 for e in espacios
        if e.get("estado") == "Disponible"
    )

    mantenimiento = sum(
        1 for e in espacios
        if e.get("estado") == "Mantenimiento"
    )

    ocupados = sum(
        1 for e in espacios
        if e.get("estado") == "Ocupado"
    )

    calendario = await calendario_collection.find().to_list(None)

    uso_por_espacio = []

    for espacio in espacios:

        espacio_id = str(espacio["_id"])

        total_reservas = 0
        horas_totales = 0

        for dia in calendario:

            reservas = dia.get(
                "espacios",
                {}
            ).get(espacio_id, [])

            total_reservas += len(reservas)

            horas_totales += len(reservas)

        uso_por_espacio.append({
            "nombre": espacio["nombre"],
            "total_reservas": total_reservas,
            "horas_totales": horas_totales
        })

    return EspaciosStatsResponse(
        total=total,
        disponibles=disponibles,
        mantenimiento=mantenimiento,
        ocupados=ocupados,
        uso_por_espacio=uso_por_espacio
    )


# ── Obtener espacio ───────────────────────────────────────────────────────────
@router.get("/{espacio_id}", response_model=EspacioResponse,
            summary="Obtener espacio deportivo")
async def obtener_espacio(
    espacio_id: str,
    _payload: dict = Depends(require_any_user),
):
    db  = get_db()
    doc = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(espacio_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")
    return _serialize(doc)


# ── Actualizar espacio ────────────────────────────────────────────────────────
@router.put("/{espacio_id}", response_model=EspacioResponse,
            summary="Actualizar espacio deportivo")
async def actualizar_espacio(
    espacio_id: str,
    body: EspacioUpdate,
    _payload: dict = Depends(require_admin),
):
    db     = get_db()
    updates = body.model_dump(exclude_none=True)
    if "estado" in updates and hasattr(updates["estado"], "value"):
        updates["estado"] = updates["estado"].value
    if "tipo" in updates and hasattr(updates["tipo"], "value"):
        updates["tipo"] = updates["tipo"].value

    result = await db[Collections.ESPACIOS_DEPORTIVOS].update_one(
        {"_id": ObjectId(espacio_id)}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")

    doc = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(espacio_id)})
    return _serialize(doc)


# ── Eliminar espacio ──────────────────────────────────────────────────────────
@router.delete("/{espacio_id}", response_model=MessageResponse,
               summary="Eliminar espacio deportivo")
async def eliminar_espacio(
    espacio_id: str,
    _payload: dict = Depends(require_admin),
):
    db = get_db()
    await eliminar_imagen_espacio(espacio_id)
    result = await db[Collections.ESPACIOS_DEPORTIVOS].delete_one({"_id": ObjectId(espacio_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")
    return MessageResponse(message="Espacio eliminado correctamente.")


# ── Subir imagen ──────────────────────────────────────────────────────────────
@router.post("/{espacio_id}/imagen", response_model=EspacioResponse,
             summary="Subir imagen del espacio")
async def subir_imagen(
    espacio_id: str,
    file: UploadFile = File(..., description="Imagen del espacio (jpg, png, webp)"),
    _payload: dict = Depends(require_admin),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Formato de imagen no permitido. Use jpg, png o webp.")

    db  = get_db()
    doc = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(espacio_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Espacio no encontrado.")

    contents = await file.read()
    url      = await subir_imagen_espacio(contents, file.filename, espacio_id)

    if url:
        await db[Collections.ESPACIOS_DEPORTIVOS].update_one(
            {"_id": ObjectId(espacio_id)}, {"$set": {"imagenUrl": url}}
        )

    updated = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(espacio_id)})
    return _serialize(updated)


# ── Disponibilidad por fecha ──────────────────────────────────────────────────
@router.get("/{espacio_id}/disponibilidad", summary="Ver disponibilidad por fecha")
async def ver_disponibilidad(
    espacio_id: str,
    fecha: str  = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$",
                        description="Fecha en formato YYYY-MM-DD"),
    _payload: dict = Depends(require_any_user),
):
    try:
        return await obtener_disponibilidad(espacio_id, fecha)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))



