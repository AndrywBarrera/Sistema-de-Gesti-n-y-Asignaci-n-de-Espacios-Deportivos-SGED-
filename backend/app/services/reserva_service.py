"""
Servicio de Reservas SGED.
Gestiona: creación, consulta, aprobación/rechazo, cancelación
y detección automática de conflictos (RF10).
"""
from zoneinfo import ZoneInfo
from datetime import datetime
from typing import Optional, List
from zoneinfo import ZoneInfo

from bson import ObjectId

from app.core.logger import logger
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import EstadoReserva, ReservaCreate
from app.services import notificacion_service as ns
from app.pipeline.calendarioPipeLine import generar_pipeline_calendario

def _to_str_id(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


# ── Helpers de conversión de hora ─────────────────────────────────────────────

def _hhmm_to_minutes(hhmm: str) -> int:
    """'14:30' → 870"""
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _horarios_se_solapan(
    ini1: str, fin1: str, ini2: str, fin2: str
) -> bool:
    """True si los dos bloques horarios se superponen (exclusivo en extremos)."""
    a, b = _hhmm_to_minutes(ini1), _hhmm_to_minutes(fin1)
    c, d = _hhmm_to_minutes(ini2), _hhmm_to_minutes(fin2)
    return a < d and c < b


# ── CRUD básico ───────────────────────────────────────────────────────────────

async def crear_reserva(
    usuario_id: str,
    data: ReservaCreate,
) -> dict:
    """
    Crea una reserva con estado Pendiente.
    No bloquea si hay otras pendientes para el mismo horario
    (el bloqueo definitivo ocurre al aprobar).
    """
    db  = get_db()

    # Verificar que el espacio existe y está disponible
    espacio = await db[Collections.ESPACIOS_DEPORTIVOS].find_one(
        {"_id": ObjectId(data.espacioId)}
    )
    if not espacio:
        raise ValueError("El espacio deportivo no existe.")
    if espacio["estado"] == "Inactivo":
        raise ValueError("El espacio deportivo está inactivo.")
    if espacio["estado"] == "Mantenimiento":
        raise ValueError("El espacio está en mantenimiento.")

    # Verificar que NO existe ya una reserva APROBADA en ese horario/fecha/espacio
    conflicto_aprobado = await _buscar_conflicto_aprobado(
        data.espacioId, str(data.fecha), data.horarioInicio, data.horarioFin
    )
    if conflicto_aprobado:
        raise ValueError(
            "Ya existe una reserva aprobada para ese horario. "
            "Consulta el calendario para ver disponibilidad."
        )

    doc = {
        "usuarioId":           usuario_id,
        "espacioId":           data.espacioId,
        "fecha":               str(data.fecha),
        "horarioInicio":       data.horarioInicio,
        "horarioFin":          data.horarioFin,
        "estado":              EstadoReserva.pendiente.value,
        "motivoReserva":       data.motivoReserva,
        "numeroParticipantes": data.numeroParticipantes,
        "justificacion":       None,
        "fechaSolicitud":      datetime.now(ZoneInfo("America/Bogota")),
        "aprobadoPor":         None,
        "horarios_elegidos":   data.horarios_elegidos,
    }

    result = await db[Collections.RESERVAS].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)

    # Notificar recepción
    usuario = await db[Collections.USUARIOS].find_one({"_id": ObjectId(usuario_id)})
    if usuario:
        await ns.notificar_reserva_recibida(
            usuario_id, usuario["correo"],
            espacio["nombre"], str(data.fecha),
            data.horarioInicio, data.horarioFin, doc["id"]
        )

    logger.info("📋 Reserva %s creada por usuario %s.", doc["id"], usuario_id)
    return doc


async def obtener_reserva_por_id(reserva_id: str) -> Optional[dict]:
    db = get_db()
    try:
        doc = await db[Collections.RESERVAS].find_one({"_id": ObjectId(reserva_id)})
    except Exception:
        return None
    if doc:
        return await _enriquecer_reserva(_to_str_id(doc))
    return None


async def listar_reservas(
    usuario_id:  Optional[str]         = None,
    espacio_id:  Optional[str]         = None,
    estado:      Optional[EstadoReserva]= None,
    fecha:       Optional[str]          = None,
    pagina:      int                    = 1,
    por_pagina:  int                    = 20,
) -> dict:
    db = get_db()
    filtro: dict = {}
    if usuario_id: filtro["usuarioId"] = usuario_id
    if espacio_id: filtro["espacioId"] = espacio_id
    if estado:     filtro["estado"]    = estado.value
    if fecha:      filtro["fecha"]     = fecha

    total  = await db[Collections.RESERVAS].count_documents(filtro)
    cursor = (
        db[Collections.RESERVAS]
        .find(filtro)
        .sort("fechaSolicitud", -1)
        .skip((pagina - 1) * por_pagina)
        .limit(por_pagina)
    )
    docs = []
    async for doc in cursor:
        docs.append(await _enriquecer_reserva(_to_str_id(doc)))

    return {"total": total, "pagina": pagina, "por_pagina": por_pagina, "datos": docs}


async def gestionar_reserva(
    reserva_id:    str,
    accion:        str,        # "aprobar" | "rechazar"
    admin_id:      str,
    justificacion: Optional[str] = None,
) -> dict:
    """
    Aprobar o rechazar una reserva.
    Al aprobar, detecta y rechaza automáticamente conflictos (RF10).
    """
    if accion == "rechazar" and not justificacion:
        raise ValueError("La justificación es obligatoria al rechazar una reserva.")

    db  = get_db()
    reserva = await db[Collections.RESERVAS].find_one({"_id": ObjectId(reserva_id)})
    if not reserva:
        raise ValueError("Reserva no encontrada.")
    if reserva["estado"] != EstadoReserva.pendiente.value:
        raise ValueError(f"Solo se pueden gestionar reservas Pendientes. Estado actual: {reserva['estado']}")

    nuevo_estado = EstadoReserva.aprobada if accion == "aprobar" else EstadoReserva.rechazada

    await db[Collections.RESERVAS].update_one(
        {"_id": ObjectId(reserva_id)},
        {"$set": {
            "estado":        nuevo_estado.value,
            "aprobadoPor":   admin_id,
            "justificacion": justificacion,
        }},
    )

    # Obtener datos del solicitante para notificación
    usuario   = await db[Collections.USUARIOS].find_one({"_id": ObjectId(reserva["usuarioId"])})
    espacio   = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(reserva["espacioId"])})
    correo    = usuario["correo"] if usuario else ""
    nom_esp   = espacio["nombre"] if espacio else reserva["espacioId"]

    if accion == "aprobar":
        logger.info("✅ Reserva %s APROBADA por admin %s.", reserva_id, admin_id)

        if usuario:
            await ns.notificar_reserva_aprobada(
                reserva["usuarioId"], correo, nom_esp,
                reserva["fecha"], reserva["horarioInicio"], reserva["horarioFin"], reserva_id
            )
            fecha = datetime.strptime(reserva["fecha"], "%Y-%m-%d")
            fecha = fecha.replace(tzinfo=ZoneInfo("America/Bogota"))
            await db[Collections.CALENDARIO].update_one(
                {
                    "fecha": fecha
                },
                generar_pipeline_calendario(reserva,fecha),
                upsert=True
            )
        # ── RF10: Rechazar automáticamente conflictos ──────────────────────
        await _rechazar_conflictos(
            reserva_id_aprobado=reserva_id,
            espacio_id=reserva["espacioId"],
            fecha=reserva["fecha"],
            inicio=reserva["horarioInicio"],
            fin=reserva["horarioFin"],
            db=db,
        )

    else:
        logger.info("❌ Reserva %s RECHAZADA por admin %s. Motivo: %s",
                    reserva_id, admin_id, justificacion)
        if usuario:
            await ns.notificar_reserva_rechazada(
                reserva["usuarioId"], correo, nom_esp,
                reserva["fecha"], reserva["horarioInicio"], reserva["horarioFin"], reserva_id,
                justificacion or "",
            )

    doc = await db[Collections.RESERVAS].find_one({"_id": ObjectId(reserva_id)})
    return await _enriquecer_reserva(_to_str_id(doc))


async def cancelar_reserva(reserva_id: str, usuario_id: str) -> dict:
    """El propio solicitante cancela su reserva (solo si aún está Pendiente)."""
    db = get_db()
    reserva = await db[Collections.RESERVAS].find_one({"_id": ObjectId(reserva_id)})
    if not reserva:
        raise ValueError("Reserva no encontrada.")
    if reserva["usuarioId"] != usuario_id:
        raise PermissionError("No tienes permiso para cancelar esta reserva.")
    if reserva["estado"] not in (EstadoReserva.pendiente.value, EstadoReserva.aprobada.value):
        raise ValueError("Solo puedes cancelar reservas Pendientes o Aprobadas.")

    await db[Collections.RESERVAS].update_one(
        {"_id": ObjectId(reserva_id)},
        {"$set": {"estado": EstadoReserva.cancelada.value}},
    )

    espacio = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(reserva["espacioId"])})
    usuario = await db[Collections.USUARIOS].find_one({"_id": ObjectId(usuario_id)})
    nom_esp = espacio["nombre"] if espacio else reserva["espacioId"]

    if usuario:
        await ns.notificar_cancelacion(
            usuario_id, usuario["correo"], nom_esp, reserva["fecha"], reserva_id
        )

    logger.info("🚫 Reserva %s CANCELADA por usuario %s.", reserva_id, usuario_id)
    doc = await db[Collections.RESERVAS].find_one({"_id": ObjectId(reserva_id)})
    return await _enriquecer_reserva(_to_str_id(doc))


# ── Disponibilidad ────────────────────────────────────────────────────────────

async def obtener_disponibilidad() -> dict:
    """
    Retorna el calendario completo indicando
    qué horarios están ocupados por espacio,
    sin incluir el _id de Mongo.
    """
    db = get_db()

    calendario = await db[Collections.CALENDARIO].find(
        {},
        {"_id": 0}   # excluir _id
    ).to_list(length=None)
    
    for doc in calendario:
        doc["fecha"] = doc["fecha"].strftime("%Y-%m-%d") 

    return {
        "calendario": calendario
    }

# ── Helpers internos ──────────────────────────────────────────────────────────

def _generar_bloques(apertura: str, cierre: str) -> list[tuple[str, str]]:
    """Genera bloques de 1 hora entre apertura y cierre."""
    ini = _hhmm_to_minutes(apertura)
    fin = _hhmm_to_minutes(cierre)
    bloques = []
    cur = ini
    while cur + 60 <= fin:
        h1 = f"{cur // 60:02d}:{cur % 60:02d}"
        h2 = f"{(cur + 60) // 60:02d}:{(cur + 60) % 60:02d}"
        bloques.append((h1, h2))
        cur += 60
    return bloques


async def _buscar_conflicto_aprobado(
    espacio_id: str, fecha: str, inicio: str, fin: str
) -> Optional[dict]:
    db = get_db()
    cursor = db[Collections.RESERVAS].find({
        "espacioId": espacio_id,
        "fecha":     fecha,
        "estado":    EstadoReserva.aprobada.value,
    })
    async for r in cursor:
        if _horarios_se_solapan(inicio, fin, r["horarioInicio"], r["horarioFin"]):
            return r
    return None


async def _rechazar_conflictos(
    reserva_id_aprobado: str,
    espacio_id: str,
    fecha: str,
    inicio: str,
    fin: str,
    db,
) -> None:
    """Rechaza automáticamente todas las solicitudes pendientes en conflicto."""
    reserva_id = reserva_id_aprobado
    cursor = db[Collections.RESERVAS].find({
        "espacioId": espacio_id,
        "fecha":     fecha,
        "estado":    EstadoReserva.pendiente.value,
    })

    async for r in cursor:
        rid = str(r["_id"])
        if rid == reserva_id_aprobado:
            continue
        if not _horarios_se_solapan(inicio, fin, r["horarioInicio"], r["horarioFin"]):
            continue

        await db[Collections.RESERVAS].update_one(
            {"_id": r["_id"]},
            {"$set": {
                "estado":        EstadoReserva.rechazada.value,
                "justificacion": "Rechazada automáticamente: el espacio fue asignado a otra solicitud en el mismo horario.",
            }},
        )

        # Notificar al usuario afectado
        usuario = await db[Collections.USUARIOS].find_one({"_id": ObjectId(r["usuarioId"])})
        espacio = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(espacio_id)})
        if usuario and espacio:
            await ns.notificar_conflicto_automatico(
                r["usuarioId"], usuario["correo"],
                espacio["nombre"], fecha, inicio, fin, reserva_id
            )
        logger.info("⚡ Reserva %s rechazada automáticamente por conflicto con %s.", rid, reserva_id_aprobado)


async def _enriquecer_reserva(doc: dict) -> dict:
    """Agrega nombre de espacio y usuario al documento de reserva."""
    db = get_db()
    try:
        esp = await db[Collections.ESPACIOS_DEPORTIVOS].find_one({"_id": ObjectId(doc["espacioId"])})
        doc["espacio_nombre"] = esp["nombre"] if esp else None
    except Exception:
        doc["espacio_nombre"] = None
    try:
        usr = await db[Collections.USUARIOS].find_one({"_id": ObjectId(doc["usuarioId"])})
        doc["usuario_nombre"] = usr["nombre"] if usr else None
        doc["usuario_correo"]= usr["correo"] if usr else None
    except Exception:
        doc["usuario_nombre"] = None
    return doc
