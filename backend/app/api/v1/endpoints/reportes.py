"""
Router de Reportes – /api/v1/reportes
Genera estadísticas de uso de espacios deportivos.
Solo accesible por Administrador y Administrativo.
"""
from zoneinfo import ZoneInfo
from datetime import datetime
from typing import Optional
from dateutil.relativedelta import relativedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import require_admin_or_adm
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import (
    ReporteRequest, ReporteResponse, PaginatedResponse,
    TipoReporte, FormatoReporte, HeatmapItem, TendenciaItem
)

router = APIRouter(prefix="/reportes", tags=["Reportes"])


async def _datos_uso_espacios(db, params: dict) -> list:
    """Estadísticas de uso por espacio deportivo."""
    pipeline = [
        {"$match": {
            "estado": "Aprobada",
            **({"fecha": {"$gte": params.get("fecha_inicio"), "$lte": params.get("fecha_fin")}}
               if params.get("fecha_inicio") else {}),
        }},
        {"$group": {
            "_id":              "$espacioId",
            "total_reservas":   {"$sum": 1},
            "fechas":           {"$addToSet": "$fecha"},
        }},
        {"$sort": {"total_reservas": -1}},
    ]
    cursor  = db[Collections.RESERVAS].aggregate(pipeline)
    results = []
    async for row in cursor:
        espacio = await db[Collections.ESPACIOS_DEPORTIVOS].find_one(
            {"_id": ObjectId(row["_id"])}
        )
        results.append({
            "espacio_id":     row["_id"],
            "espacio_nombre": espacio["nombre"] if espacio else row["_id"],
            "total_reservas": row["total_reservas"],
            "dias_utilizados": len(row["fechas"]),
        })
    return results


async def _datos_reservas_usuario(db, params: dict) -> list:
    """Reservas agrupadas por usuario."""
    pipeline = [
        {"$group": {
            "_id":            "$usuarioId",
            "total":          {"$sum": 1},
            "aprobadas":      {"$sum": {"$cond": [{"$eq": ["$estado", "Aprobada"]}, 1, 0]}},
            "rechazadas":     {"$sum": {"$cond": [{"$eq": ["$estado", "Rechazada"]}, 1, 0]}},
            "canceladas":     {"$sum": {"$cond": [{"$eq": ["$estado", "Cancelada"]}, 1, 0]}},
        }},
        {"$sort": {"total": -1}},
        {"$limit": 50},
    ]
    cursor  = db[Collections.RESERVAS].aggregate(pipeline)
    results = []
    async for row in cursor:
        try:
            usuario = await db[Collections.USUARIOS].find_one(
                {"_id": ObjectId(row["_id"])}, {"password": 0}
            )
        except Exception:
            usuario = None
        results.append({
            "usuario_id":    row["_id"],
            "usuario_nombre": usuario["nombre"] if usuario else row["_id"],
            "usuario_rol":   usuario["rol"]    if usuario else "Desconocido",
            "total":         row["total"],
            "aprobadas":     row["aprobadas"],
            "rechazadas":    row["rechazadas"],
            "canceladas":    row["canceladas"],
        })
    return results


async def _datos_estadisticas_generales(db, params: dict) -> list:
    """Resumen general del sistema."""
    total_reservas = await db[Collections.RESERVAS].count_documents({})
    aprobadas      = await db[Collections.RESERVAS].count_documents({"estado": "Aprobada"})
    rechazadas     = await db[Collections.RESERVAS].count_documents({"estado": "Rechazada"})
    canceladas     = await db[Collections.RESERVAS].count_documents({"estado": "Cancelada"})
    pendientes     = await db[Collections.RESERVAS].count_documents({"estado": "Pendiente"})
    total_espacios = await db[Collections.ESPACIOS_DEPORTIVOS].count_documents({})
    total_usuarios = await db[Collections.USUARIOS].count_documents({"activo": True})

    return [{
        "total_reservas":   total_reservas,
        "aprobadas":        aprobadas,
        "rechazadas":       rechazadas,
        "canceladas":       canceladas,
        "pendientes":       pendientes,
        "total_espacios":   total_espacios,
        "usuarios_activos": total_usuarios,
    }]


@router.get("/heatmap",response_model=list[HeatmapItem],
            summary="Obtener heatmap de reservas del mes actual")
async def obtener_heatmap_reportes(
    _payload: dict = Depends(require_admin_or_adm),
):
    db = get_db()

    calendario_collection = db[Collections.CALENDARIO]
    vencidos_collection = db[Collections.VENCIDO_CALENDARIO]

    ahora = datetime.now(
        ZoneInfo("America/Bogota")
    )

    inicio_mes = datetime(
        ahora.year,
        ahora.month,
        1,
        tzinfo=ZoneInfo("America/Bogota")
    )

    if ahora.month == 12:
        siguiente_mes = datetime(
            ahora.year + 1,
            1,
            1,
            tzinfo=ZoneInfo("America/Bogota")
        )
    else:
        siguiente_mes = datetime(
            ahora.year,
            ahora.month + 1,
            1,
            tzinfo=ZoneInfo("America/Bogota")
        )

    filtro_fecha = {
        "fecha": {
            "$gte": inicio_mes,
            "$lt": siguiente_mes
        }
    }

    calendario = await calendario_collection.find(
        filtro_fecha
    ).to_list(None)

    vencidos = await vencidos_collection.find(
        filtro_fecha
    ).to_list(None)

    documentos = calendario + vencidos

    resultado = []

    for doc in documentos:

        total = 0

        espacios = doc.get("espacios", {})

        for horas in espacios.values():
            total += len(horas)

        if total > 0:

            fecha = doc["fecha"].strftime("%Y-%m-%d")

            resultado.append({
                "fecha": fecha,
                "total": total
            })

    resultado.sort(
        key=lambda x: x["fecha"]
    )

    return resultado

@router.get(
    "/tendencia",
    response_model=list[TendenciaItem],
    summary="Obtener tendencia de reservas de los últimos 6 meses"
)
async def obtener_tendencia_reportes(
    _payload: dict = Depends(require_admin_or_adm),
):
    db = get_db()

    reservas_collection = db[Collections.RESERVAS]

    ahora = datetime.now(
        ZoneInfo("America/Bogota")
    )

    inicio_periodo = datetime(
        ahora.year,
        ahora.month,
        1,
        tzinfo=ZoneInfo("America/Bogota")
    ) - relativedelta(months=5)

    reservas = await reservas_collection.find(
        {
            "fechaSolicitud": {
                "$gte": inicio_periodo
            }
        },
        {
            "fechaSolicitud": 1,
            "estado": 1
        }
    ).to_list(None)

    meses = {}

    for i in range(6):

        fecha_mes = inicio_periodo + relativedelta(months=i)

        clave_mes = fecha_mes.strftime("%Y-%m")

        meses[clave_mes] = {
            "mes": clave_mes,
            "aprobadas": 0,
            "rechazadas": 0,
            "pendientes": 0,
            "canceladas": 0
        }

    for reserva in reservas:

        fecha = reserva.get("fechaSolicitud")
        estado = reserva.get("estado")

        if not fecha or not estado:
            continue

        clave_mes = fecha.strftime("%Y-%m")

        if clave_mes not in meses:
            continue

        if estado == "Aprobada":
            meses[clave_mes]["aprobadas"] += 1

        elif estado == "Rechazada":
            meses[clave_mes]["rechazadas"] += 1

        elif estado == "Pendiente":
            meses[clave_mes]["pendientes"] += 1

        elif estado == "Cancelada":
            meses[clave_mes]["canceladas"] += 1

    return list(meses.values())

# ── Generar reporte ───────────────────────────────────────────────────────────
@router.post("", response_model=ReporteResponse, status_code=201,
             summary="Generar reporte")
async def generar_reporte(
    body: ReporteRequest,
    payload: dict = Depends(require_admin_or_adm),
):
    db     = get_db()
    params = {
        "fecha_inicio": str(body.fecha_inicio) if body.fecha_inicio else None,
        "fecha_fin":    str(body.fecha_fin)    if body.fecha_fin    else None,
        "espacio_id":   body.espacio_id,
        "usuario_id":   body.usuario_id,
    }

    dispatch = {
        TipoReporte.uso_espacios:         _datos_uso_espacios,
        TipoReporte.reservas_usuario:     _datos_reservas_usuario,
        TipoReporte.estadisticas_general: _datos_estadisticas_generales,
        TipoReporte.mantenimiento:        _datos_uso_espacios,  # reutiliza
    }
    fn   = dispatch.get(body.tipoReporte, _datos_estadisticas_generales)
    data = await fn(db, params)

    doc = {
        "administradorId": payload["sub"],
        "tipoReporte":     body.tipoReporte.value,
        "formato":         body.formato.value,
        "fechaGeneracion": datetime.now(ZoneInfo("America/Bogota")),
        "parametros":      {k: v for k, v in params.items() if v},
        "datos":           data,
    }
    result = await db[Collections.REPORTES].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return ReporteResponse(**doc)


# ── Historial de reportes ─────────────────────────────────────────────────────
@router.get("", response_model=PaginatedResponse, summary="Historial de reportes")
async def listar_reportes(
    pagina:    int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    payload: dict = Depends(require_admin_or_adm),
):
    db    = get_db()
    total = await db[Collections.REPORTES].count_documents({})
    cursor = (
        db[Collections.REPORTES]
        .find({})
        .sort("fechaGeneracion", -1)
        .skip((pagina - 1) * por_pagina)
        .limit(por_pagina)
    )
    datos = []
    async for r in cursor:
        datos.append(ReporteResponse(
            id=str(r["_id"]),
            administradorId=r["administradorId"],
            tipoReporte=r["tipoReporte"],
            formato=r["formato"],
            fechaGeneracion=r["fechaGeneracion"],
            parametros=r.get("parametros"),
            datos=r.get("datos", []),
        ))
    return PaginatedResponse(total=total, pagina=pagina, por_pagina=por_pagina, datos=datos)
