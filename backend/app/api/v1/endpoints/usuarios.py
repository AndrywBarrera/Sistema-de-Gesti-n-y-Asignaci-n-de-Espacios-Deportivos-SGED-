"""
Router de Usuarios – /api/v1/usuarios
CRUD de usuarios. Solo el Administrador puede crear/eliminar.
"""
from typing import Optional
from bson import ObjectId
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import (
    get_current_user_payload, require_admin,
    require_admin_or_adm, require_any_user, hash_password, verify_password
)
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse,
    MessageResponse, PaginatedResponse, RolUsuario, UsuarioStatsResponse,
)
from app.pipeline.usersPipeline import pipeline_roles
from app.services.notificacion_service import notificar_actualizacion_datos_admin

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

def _serialize(doc: dict) -> UsuarioResponse:
    
    bogota = ZoneInfo("America/Bogota")

    fecha_registro = doc["fechaRegistro"]
    ultimo_acceso = doc.get("ultimoAcceso")

    if fecha_registro and fecha_registro.tzinfo is None:
        fecha_registro = fecha_registro.replace(tzinfo=timezone.utc)

    fecha_registro = fecha_registro.astimezone(bogota)

    
    if ultimo_acceso:
        if ultimo_acceso.tzinfo is None:
            ultimo_acceso = ultimo_acceso.replace(tzinfo=timezone.utc)

        ultimo_acceso = ultimo_acceso.astimezone(bogota)
    
    
    return UsuarioResponse(
        id=str(doc["_id"]),
        nombre=doc["nombre"],
        correo=doc["correo"],
        rol=doc["rol"],
        telefono=doc.get("telefono"),
        activo=doc.get("activo", True),
        fechaRegistro=fecha_registro,
        ultimoAcceso=ultimo_acceso,
        codigo_inst=doc.get("codigo_inst"),
        dependencia=doc.get("dependencia"),
        programa=doc.get("programa"),
        fuente=doc.get("fuente"),
    )

# ── Listar usuarios (admin) ──────────────────────────────────
@router.get("", response_model=PaginatedResponse, summary="Listar usuarios")
async def listar_usuarios(
    rol:       Optional[RolUsuario] = Query(None),
    activo:    Optional[bool]       = Query(None),
    pagina:    int                  = Query(1, ge=1),
    por_pagina: int                 = Query(20, ge=1, le=100),
    _payload: dict = Depends(require_admin),
):
    db     = get_db()
    filtro: dict = {}
    if rol    is not None: filtro["rol"]    = rol.value
    if activo is not None: filtro["activo"] = activo

    total  = await db[Collections.USUARIOS].count_documents(filtro)
    cursor = (
        db[Collections.USUARIOS]
        .find(filtro, {"password": 0})
        .sort("nombre", 1)
        .skip((pagina - 1) * por_pagina)
        .limit(por_pagina)
    )
    datos = [_serialize(u) async for u in cursor]
    print(datos)
    return PaginatedResponse(total=total, pagina=pagina, por_pagina=por_pagina, datos=datos)

# ── Crear usuario (solo Administrador) ────────────────────────────────────────
@router.post("", response_model=UsuarioResponse, status_code=201, summary="Crear usuario")
async def crear_usuario(
    body: UsuarioCreate,
    _payload: dict = Depends(require_admin),
):
    db = get_db()
    if await db[Collections.USUARIOS].find_one({"correo": body.correo}):
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo.")

    from zoneinfo import ZoneInfo
    from datetime import datetime
    doc = {
        "nombre":        body.nombre,
        "correo":        body.correo,
        "password":      hash_password(body.password),
        "rol":           body.rol.value,
        "telefono":      body.telefono,
        "activo":        True,
        "fechaRegistro": datetime.now(ZoneInfo("America/Bogota")),
        "ultimoAcceso":  None,
        "fuente":        "manual",
    }
    result = await db[Collections.USUARIOS].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)

@router.get("/stats", response_model=UsuarioStatsResponse, summary="Obtener estadísticas de usuarios")
async def obtener_stats_usuarios(
    _payload: dict = Depends(require_admin_or_adm)
):
    db = get_db()

    collection = db[Collections.USUARIOS]

    total = await collection.count_documents({})

    pipeline_roles = [
        {
            "$group": {
                "_id": "$rol",
                "cantidad": {"$sum": 1}
            }
        }
    ]

    roles_cursor = collection.aggregate(pipeline_roles)

    por_rol = {}

    async for item in roles_cursor:
        por_rol[item["_id"]] = item["cantidad"]

    fecha_limite = datetime.now(
        ZoneInfo("UTC")
    ) - timedelta(days=30)

    activos_ultimo_mes = await collection.count_documents({
        "ultimoAcceso": {
            "$gte": fecha_limite
        }
    })

    return UsuarioStatsResponse(
        total=total,
        por_rol=por_rol,
        activos_ultimo_mes=activos_ultimo_mes
    )

# ── Obtener usuario por ID ────────────────────────────────────────────────────
@router.get("/{usuario_id}", response_model=UsuarioResponse, summary="Obtener usuario")
async def obtener_usuario(
    usuario_id: str,
    payload: dict = Depends(require_any_user),
):
    # Usuarios normales solo pueden ver su propio perfil
    if payload["role"] not in ("Administrador", "Administrativo"):
        if payload["sub"] != usuario_id:
            raise HTTPException(status_code=403, detail="Acceso denegado.")

    db  = get_db()
    doc = await db[Collections.USUARIOS].find_one(
        {"_id": ObjectId(usuario_id)}, {"password": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return _serialize(doc)

@router.put("/{usuario_id}",response_model=UsuarioResponse, summary="Actualizar usuario")
async def actualizar_usuario(
    usuario_id: str,
    body: UsuarioUpdate,
    payload: dict = Depends(require_admin),
):

    db = get_db()

    doc = await db[Collections.USUARIOS].find_one({
        "_id": ObjectId(usuario_id)
    })

    if not doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    updates = body.model_dump(exclude_none=True, exclude_unset=True)

    updates.pop("activo", None)
    updates.pop("fechaRegistro", None)
    updates.pop("ultimoAcceso", None)

    if "rol" in updates:
        updates["rol"] = updates["rol"].value

    cambios_realizados = {}
    cambio_password = False

    for key, value in list(updates.items()):

        # Password
        if key == "password":

            if verify_password(value, doc["password"]):
                updates.pop("password")
                continue

            updates["password"] = hash_password(value)
            cambios_realizados["password"] = updates["password"]
            cambio_password = True
            continue

        # Otros campos
        if doc.get(key) == value:
            updates.pop(key)
            continue

        cambios_realizados[key] = value

    if not updates:
        raise HTTPException(status_code=400, detail="No hay cambios para actualizar.")

    updates["fechaActualizacion"] = datetime.now(ZoneInfo("America/Bogota"))

    await db[Collections.USUARIOS].update_one(
        {"_id": ObjectId(usuario_id)},
        {"$set": updates}
    )

    if cambio_password:

        await db[Collections.REFRESH_TOKENS].delete_many({
            "usuario_id": usuario_id
        })

    updated = await db[Collections.USUARIOS].find_one(
        {"_id": ObjectId(usuario_id)},
        {"password": 0}
    )
    
    await notificar_actualizacion_datos_admin(
        usuario_id=usuario_id,
        campos_actualizados=cambios_realizados,
        correo=doc["correo"],
    )

    return _serialize(updated)

# ── Eliminar / desactivar usuario ─────────────────────────────────────────────
@router.delete("/{usuario_id}", response_model=MessageResponse, summary="Desactivar usuario")
async def desactivar_usuario(
    usuario_id: str,
    _payload: dict = Depends(require_admin),
):
    db = get_db()
    result = await db[Collections.USUARIOS].update_one(
        {"_id": ObjectId(usuario_id)},
        {"$set": {"activo": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return MessageResponse(message="Usuario desactivado correctamente.")
