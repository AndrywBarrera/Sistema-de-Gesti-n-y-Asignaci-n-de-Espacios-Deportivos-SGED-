"""
Router de Autenticación – /api/v1/auth
Endpoints: login, refresh, logout, cambio de contraseña, perfil propio.
"""
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import (
    create_access_token, create_refresh_token, decode_token,
    get_current_user_payload, hash_password, verify_password,
)
from app.core.logger import logger
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import (
    LoginRequest, TokenResponse, RefreshRequest, ChangePasswordRequest,
    UsuarioResponse, MessageResponse,
)
from app.services.sso_service import autenticar_usuario_institucional 


router = APIRouter(prefix="/auth", tags=["Autenticación"])


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse, summary="Iniciar sesión")
async def login(body: LoginRequest):
    """
    Autentica un usuario con su correo y contraseña institucional.
    Retorna access_token y refresh_token.
    """
    usuario = await autenticar_usuario_institucional(body.correo, body.password)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas o usuario inactivo.",
        )

    access  = create_access_token(usuario["id"], usuario["rol"])
    refresh = create_refresh_token(usuario["id"])

    # Guardar refresh token en DB (con TTL)
    db = get_db()
    expira = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db[Collections.REFRESH_TOKENS].insert_one({
        "token":     refresh,
        "usuarioId": usuario["id"],
        "expira":    expira,
    })

    logger.info("🔑 Login exitoso: %s [%s]", usuario["correo"], usuario["rol"])

    fecha_registro, ultimo_acceso = conocerFechasParseadas(usuario)
    
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        usuario=UsuarioResponse(
            id=str(usuario["id"]),
            nombre=usuario["nombre"],
            correo=usuario["correo"],
            rol=usuario["rol"],
            telefono=usuario.get("telefono"),

            codigo_inst=usuario.get("codigo_inst"),
            dependencia=usuario.get("dependencia"),
            programa=usuario.get("programa"),
            fuente=usuario.get("fuente"),

            activo=usuario["activo"],
            fechaRegistro=fecha_registro,
            ultimoAcceso=ultimo_acceso,
        ),
    )


# ── Refresh Token ─────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse, summary="Refrescar token")
async def refresh_token(body: RefreshRequest):
    """
    Genera un nuevo access_token a partir de un refresh_token válido.
    """
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token de refresco inválido.")

    db    = get_db()
    doc   = await db[Collections.REFRESH_TOKENS].find_one({"token": body.refresh_token})
    if not doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Refresh token no encontrado o ya fue usado.")

    usuario_id = payload["sub"]
    usuario    = await db[Collections.USUARIOS].find_one({"_id": ObjectId(usuario_id)})
    if not usuario or not usuario.get("activo"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario no encontrado o inactivo.")

    new_access  = create_access_token(usuario_id, usuario["rol"])
    new_refresh = create_refresh_token(usuario_id)

    # Rotar el refresh token (eliminar el anterior, guardar el nuevo)
    await db[Collections.REFRESH_TOKENS].delete_one({"token": body.refresh_token})
    expira = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db[Collections.REFRESH_TOKENS].insert_one({
        "token":     new_refresh,
        "usuarioId": usuario_id,
        "expira":    expira,
    })
    
    fecha_registro, ultimo_acceso = conocerFechasParseadas(usuario)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        usuario=UsuarioResponse(
            id=str(usuario["id"]),
            nombre=usuario["nombre"],
            correo=usuario["correo"],
            rol=usuario["rol"],
            telefono=usuario.get("telefono"),

            codigo_inst=usuario.get("codigo_inst"),
            dependencia=usuario.get("dependencia"),
            programa=usuario.get("programa"),
            fuente=usuario.get("fuente"),

            activo=usuario["activo"],
            fechaRegistro=fecha_registro,
            ultimoAcceso=ultimo_acceso,
        ),
    )


# ── Logout ────────────────────────────────────────────────────────────────────
@router.post("/logout", response_model=MessageResponse, summary="Cerrar sesión")
async def logout(
    body: RefreshRequest,
    payload: dict = Depends(get_current_user_payload),
):
    """Invalida el refresh_token del usuario (lista negra)."""
    db = get_db()
    await db[Collections.REFRESH_TOKENS].delete_one({"token": body.refresh_token})
    logger.info("👋 Logout: usuario %s", payload["sub"])
    return MessageResponse(message="Sesión cerrada correctamente.")


def conocerFechasParseadas(usuario):
    bogota = ZoneInfo("America/Bogota")

    fecha_registro = usuario["fechaRegistro"]
    ultimo_acceso = usuario.get("ultimoAcceso")

    if fecha_registro and fecha_registro.tzinfo is None:
        fecha_registro = fecha_registro.replace(tzinfo=timezone.utc)

    fecha_registro = fecha_registro.astimezone(bogota)

    
    if ultimo_acceso:
        if ultimo_acceso.tzinfo is None:
            ultimo_acceso = ultimo_acceso.replace(tzinfo=timezone.utc)

        ultimo_acceso = ultimo_acceso.astimezone(bogota)
        
    return fecha_registro, ultimo_acceso    

# ── Perfil propio ─────────────────────────────────────────────────────────────
@router.get("/me", response_model=UsuarioResponse, summary="Mi perfil")
async def me(payload: dict = Depends(get_current_user_payload)):
    """Retorna la información del usuario autenticado."""
    db  = get_db()
    doc = await db[Collections.USUARIOS].find_one({"_id": ObjectId(payload["sub"])})
    
    fecha_registro, ultimo_acceso = conocerFechasParseadas(doc)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return UsuarioResponse(
        id=str(doc["_id"]),
        nombre=doc["nombre"],
        correo=doc["correo"],
        rol=doc["rol"],
        telefono=doc.get("telefono"),
    
        codigo_inst=doc.get("codigo_inst"),
        dependencia=doc.get("dependencia"),
        programa=doc.get("programa"),
        fuente=doc.get("fuente"),
    
        activo=doc["activo"],
        fechaRegistro=fecha_registro,
        ultimoAcceso=ultimo_acceso,
    )


# ── Cambio de contraseña ──────────────────────────────────────────────────────
@router.put(
    "/cambiarDatosUser",
    response_model=MessageResponse,
    summary="Actualizar datos del usuario"
)
async def cambiar_datos_usuario(
    body: ChangePasswordRequest,
    payload: dict = Depends(get_current_user_payload),
):

    db = get_db()
    usuario_id = payload["sub"]

    # Buscar usuario
    doc = await db[Collections.USUARIOS].find_one({
        "_id": ObjectId(usuario_id)
    })

    if not doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    updates = {}

    # Cambiar contraseña
    if body.password_nueva is not None:

        if body.password_actual is None:
            raise HTTPException(status_code=400, detail="Debes ingresar la contraseña actual.")

        if not verify_password(body.password_actual, doc["password"]):
            raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")

        updates["password"] = hash_password(body.password_nueva)

    # Cambiar teléfono
    if body.telefono is not None:
        updates["telefono"] = body.telefono

    # Validar cambios
    if not updates:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar.")

    # Fecha actualización
    updates["fechaActualizacion"] = datetime.now(ZoneInfo("America/Bogota"))

    # Actualizar usuario
    await db[Collections.USUARIOS].update_one(
        {"_id": ObjectId(usuario_id)},
        {"$set": updates}
    )

    # Invalidar sesiones si cambió contraseña
    if "password" in updates:

        await db[Collections.REFRESH_TOKENS].delete_many({
            "usuarioId": usuario_id
        })

        logger.info("🔐 Contraseña cambiada para usuario %s.", usuario_id)

    return MessageResponse(
        message="Datos actualizados correctamente."
    )