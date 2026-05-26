"""
Servicio de Notificaciones SGED.
Envía alertas por correo electrónico y/o las registra en plataforma.
"""
from zoneinfo import ZoneInfo
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logger import logger
from app.db.mongodb import get_db, Collections
from app.schemas.schemas import (
    TipoNotificacion, CanalNotificacion, NotificacionCreate
)


# ── Etiquetas legibles para campos de usuario ────────────────────────────────

_ETIQUETAS_CAMPO = {
    "nombre":          "Nombre completo",
    "correo":          "Correo electrónico",
    "password":        "Contraseña",
    "telefono":        "Teléfono",
    "rol":             "Rol",
    "codigo_inst":     "Código institucional",
    "dependencia":     "Dependencia",
    "programa":        "Programa académico",
    "fuente":          "Fuente de autenticación",
}

_CAMPOS_SENSIBLES = {"password"}


# ── Utilidades de formato ─────────────────────────────────────────────────────

def _separador(ancho: int = 60) -> str:
    return "─" * ancho


def _cabecera_email() -> str:
    return (
        "╔══════════════════════════════════════════════════════════╗\n"
        "║          SISTEMA DE GESTIÓN DE ESPACIOS Y DEPORTES       ║\n"
        "║                    SGED – UPTC                           ║\n"
        "╚══════════════════════════════════════════════════════════╝"
    )


def _pie_email() -> str:
    anio = datetime.now(ZoneInfo("America/Bogota")).year
    return (
        f"\n{_separador()}\n"
        "Este correo es generado automáticamente por el sistema SGED.\n"
        "Por favor, no responda directamente a este mensaje.\n"
        "Para soporte, comuníquese con la administración de la UPTC.\n"
        f"\n© {anio} Universidad Pedagógica y Tecnológica de Colombia\n"
        "Tunja, Boyacá, Colombia"
    )


def _formatear_fecha_hora(fecha: str, hora_inicio: str, hora_fin: str) -> str:
    return f"  Fecha        : {fecha}\n  Hora de inicio: {hora_inicio}\n  Hora de fin   : {hora_fin}"


# ── Cuerpos de correo profesionales ──────────────────────────────────────────

def _cuerpo_reserva_recibida(espacio: str, fecha: str, hora_inicio: str, hora_fin: str) -> str:
    return (
        f"{_cabecera_email()}\n\n"
        "Asunto: Solicitud de reserva recibida\n"
        f"{_separador()}\n\n"
        "Estimado/a usuario/a,\n\n"
        "Hemos recibido correctamente su solicitud de reserva en el sistema SGED. "
        "Su petición ha sido registrada y se encuentra en proceso de revisión "
        "por parte del equipo administrativo.\n\n"
        "DETALLES DE LA SOLICITUD\n"
        f"{_separador()}\n"
        f"  Espacio      : {espacio}\n"
        f"{_formatear_fecha_hora(fecha, hora_inicio, hora_fin)}\n"
        f"  Estado actual: EN REVISIÓN\n\n"
        f"{_separador()}\n\n"
        "Le notificaremos tan pronto como su solicitud sea aprobada o rechazada. "
        "El tiempo de respuesta habitual es de 1 a 2 días hábiles.\n\n"
        "Gracias por utilizar el sistema SGED.\n"
        f"{_pie_email()}"
    )


def _cuerpo_reserva_aprobada(espacio: str, fecha: str, hora_inicio: str, hora_fin: str) -> str:
    return (
        f"{_cabecera_email()}\n\n"
        "Asunto: Reserva aprobada exitosamente\n"
        f"{_separador()}\n\n"
        "Estimado/a usuario/a,\n\n"
        "Nos complace informarle que su solicitud de reserva ha sido APROBADA. "
        "A continuación encontrará los detalles confirmados de su reserva.\n\n"
        "DETALLES DE LA RESERVA CONFIRMADA\n"
        f"{_separador()}\n"
        f"  Espacio      : {espacio}\n"
        f"{_formatear_fecha_hora(fecha, hora_inicio, hora_fin)}\n"
        f"  Estado       : ✔ APROBADA\n\n"
        f"{_separador()}\n\n"
        "RECOMENDACIONES\n"
        f"{_separador()}\n"
        "  • Preséntese puntualmente en el espacio reservado.\n"
        "  • Recuerde respetar el horario asignado.\n"
        "  • En caso de no asistir, cancele su reserva con anticipación.\n"
        "  • Deje el espacio en las mismas condiciones en que lo encontró.\n\n"
        f"{_separador()}\n\n"
        "¡Disfrute del espacio!\n\n"
        f"{_pie_email()}"
    )


def _cuerpo_reserva_rechazada(
    espacio: str, fecha: str, hora_inicio: str, hora_fin: str, justificacion: str
) -> str:
    return (
        f"{_cabecera_email()}\n\n"
        "Asunto: Solicitud de reserva rechazada\n"
        f"{_separador()}\n\n"
        "Estimado/a usuario/a,\n\n"
        "Lamentamos informarle que su solicitud de reserva no ha podido ser "
        "aprobada en esta ocasión. A continuación encontrará los detalles "
        "y el motivo del rechazo.\n\n"
        "DETALLES DE LA SOLICITUD\n"
        f"{_separador()}\n"
        f"  Espacio      : {espacio}\n"
        f"{_formatear_fecha_hora(fecha, hora_inicio, hora_fin)}\n"
        f"  Estado       : ✘ RECHAZADA\n\n"
        "MOTIVO DEL RECHAZO\n"
        f"{_separador()}\n"
        f"  {justificacion}\n\n"
        f"{_separador()}\n\n"
        "Si considera que existe un error o desea más información, comuníquese "
        "directamente con la administración de la UPTC.\n\n"
        "Puede realizar una nueva solicitud de reserva para una fecha u horario diferente "
        "a través del sistema SGED.\n\n"
        f"{_pie_email()}"
    )


def _cuerpo_conflicto_automatico(
    espacio: str, fecha: str, hora_inicio: str, hora_fin: str
) -> str:
    return (
        f"{_cabecera_email()}\n\n"
        "Asunto: Reserva cancelada por conflicto de horario\n"
        f"{_separador()}\n\n"
        "Estimado/a usuario/a,\n\n"
        "Le informamos que su solicitud de reserva ha sido rechazada de forma "
        "automática por el sistema, debido a un conflicto de disponibilidad.\n\n"
        "DETALLES DE LA SOLICITUD\n"
        f"{_separador()}\n"
        f"  Espacio      : {espacio}\n"
        f"{_formatear_fecha_hora(fecha, hora_inicio, hora_fin)}\n"
        f"  Estado       : ✘ RECHAZADA AUTOMÁTICAMENTE\n\n"
        "RAZÓN\n"
        f"{_separador()}\n"
        "  El espacio fue asignado a otra solicitud para el mismo horario.\n"
        "  El sistema gestiona las solicitudes por orden de prioridad y llegada.\n\n"
        f"{_separador()}\n\n"
        "Le invitamos a consultar la disponibilidad del espacio en otros horarios "
        "y realizar una nueva solicitud a través del sistema SGED.\n\n"
        f"{_pie_email()}"
    )


def _cuerpo_cancelacion(espacio: str, fecha: str) -> str:
    return (
        f"{_cabecera_email()}\n\n"
        "Asunto: Reserva cancelada\n"
        f"{_separador()}\n\n"
        "Estimado/a usuario/a,\n\n"
        "Le informamos que su reserva ha sido CANCELADA en el sistema SGED.\n\n"
        "DETALLES DE LA RESERVA CANCELADA\n"
        f"{_separador()}\n"
        f"  Espacio      : {espacio}\n"
        f"  Fecha        : {fecha}\n"
        f"  Estado       : CANCELADA\n\n"
        f"{_separador()}\n\n"
        "Si esta cancelación fue realizada por usted, no es necesario ningún "
        "paso adicional.\n\n"
        "Si no reconoce esta cancelación o tiene alguna duda, comuníquese con "
        "la administración de la UPTC a la brevedad posible.\n\n"
        f"{_pie_email()}"
    )


def _cuerpo_actualizacion_datos(campos_actualizados: dict) -> str:
    """
    Genera el cuerpo del correo para notificación de actualización de datos
    por parte de un administrador.

    Los campos sensibles (contraseña) se ocultan con asteriscos.
    Solo se muestran los campos presentes en el diccionario recibido.
    """
    fecha_hora_actual = datetime.now(ZoneInfo("America/Bogota")).strftime(
        "%d/%m/%Y a las %I:%M %p"
    )

    # Construir la tabla de cambios
    filas_cambios = []
    for campo, valor in campos_actualizados.items():
        etiqueta = _ETIQUETAS_CAMPO.get(campo, campo.replace("_", " ").capitalize())
        valor_mostrado = "••••••••" if campo in _CAMPOS_SENSIBLES else str(valor)
        filas_cambios.append(f"  {etiqueta:<28}: {valor_mostrado}")

    tabla_cambios = "\n".join(filas_cambios) if filas_cambios else "  (Sin detalles disponibles)"

    return (
        f"{_cabecera_email()}\n\n"
        "Asunto: Actualización de datos de su cuenta\n"
        f"{_separador()}\n\n"
        "Estimado/a usuario/a,\n\n"
        "Le informamos que un administrador del sistema SGED ha realizado "
        f"modificaciones en su perfil el día {fecha_hora_actual}.\n\n"
        "DATOS ACTUALIZADOS\n"
        f"{_separador()}\n"
        f"{tabla_cambios}\n\n"
        f"{_separador()}\n\n"
        "INFORMACIÓN IMPORTANTE\n"
        f"{_separador()}\n"
        "  • Si usted solicitó estos cambios, puede ignorar este mensaje.\n"
        "  • Si NO reconoce estas modificaciones, comuníquese de inmediato\n"
        "    con la administración de la UPTC para revisar su cuenta.\n"
        "  • Si su contraseña fue actualizada, deberá utilizarla en su\n"
        "    próximo inicio de sesión.\n"
        "  • Si su correo electrónico fue modificado, las próximas\n"
        "    notificaciones llegarán a la nueva dirección registrada.\n\n"
        f"{_separador()}\n\n"
        "Por seguridad, le recomendamos verificar su información de perfil\n"
        "dentro del sistema SGED y reportar cualquier anomalía.\n\n"
        f"{_pie_email()}"
    )


# ── Núcleo del servicio ───────────────────────────────────────────────────────

async def _guardar_notificacion(noti: dict) -> str:
    """Persiste la notificación en MongoDB y retorna su ID."""
    db = get_db()
    result = await db[Collections.NOTIFICACIONES].insert_one(noti)
    return str(result.inserted_id)


async def _enviar_email(correo_destino: str, asunto: str, cuerpo: str) -> bool:
    """
    Envía un correo electrónico usando fastapi-mail.
    Retorna True si tuvo éxito, False si falló (no interrumpe el flujo).
    """
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=bool(settings.MAIL_USERNAME),
            VALIDATE_CERTS=True,
        )

        message = MessageSchema(
            subject=asunto,
            recipients=[correo_destino],
            body=cuerpo,
            subtype=MessageType.plain,
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info("📧 Email enviado a %s — Asunto: %s", correo_destino, asunto)
        return True

    except Exception as exc:
        logger.warning("⚠️  No se pudo enviar email a %s: %s", correo_destino, exc)
        return False


async def enviar_notificacion(
    usuario_id:  str,
    tipo:        TipoNotificacion,
    mensaje:     str,
    canal:       CanalNotificacion = CanalNotificacion.ambos,
    reserva_id:  Optional[str]     = None,
    correo_dest: Optional[str]     = None,
    cuerpo_email: Optional[str]    = None,
) -> str:
    """
    Crea y envía una notificación.
    - Siempre la guarda en plataforma (MongoDB).
    - Si canal es Email o Ambos, también envía correo.

    Args:
        usuario_id:   ID del usuario destinatario.
        tipo:         Tipo de notificación (confirmacion, rechazo, etc.).
        mensaje:      Texto corto para almacenar en plataforma.
        canal:        Canal de envío (email, plataforma o ambos).
        reserva_id:   ID de la reserva relacionada (opcional).
        correo_dest:  Dirección de correo del destinatario (opcional).
        cuerpo_email: Cuerpo completo del correo. Si se omite, se usa `mensaje`.

    Returns:
        ID de la notificación creada en MongoDB.
    """
    doc = {
        "usuarioId":      usuario_id,
        "tipo":           tipo.value,
        "mensaje":        mensaje,
        "canal":          canal.value,
        "leida":          False,
        "fechaEnvio":     datetime.now(ZoneInfo("America/Bogota")),
        "reservaId":      reserva_id,
        "correoDirigido": correo_dest,
        "reserva_id":     reserva_id,
    }

    noti_id = await _guardar_notificacion(doc)

    if canal in (CanalNotificacion.email, CanalNotificacion.ambos) and correo_dest:
        asuntos = {
            TipoNotificacion.confirmacion: "✅ Reserva Confirmada – SGED UPTC",
            TipoNotificacion.rechazo:      "❌ Reserva Rechazada – SGED UPTC",
            TipoNotificacion.recordatorio: "🔔 Recordatorio de Reserva – SGED UPTC",
            TipoNotificacion.cancelacion:  "🚫 Reserva Cancelada – SGED UPTC",
            TipoNotificacion.sistema:      "ℹ️  Aviso del Sistema – SGED UPTC",
        }
        asunto = asuntos.get(tipo, "Notificación – SGED UPTC")
        contenido = cuerpo_email if cuerpo_email else mensaje
        await _enviar_email(correo_dest, asunto, contenido)

    return noti_id


# ── Helpers de notificaciones predefinidas ────────────────────────────────────

async def notificar_reserva_recibida(
    usuario_id: str,
    correo: str,
    espacio: str,
    fecha: str,
    hora_inicio: str,
    hora_fin: str,
    reserva_id: str,
) -> None:
    """Notifica al usuario que su solicitud de reserva fue recibida y está en revisión."""
    mensaje_corto = (
        f"Tu solicitud de reserva para '{espacio}' el {fecha} "
        f"de {hora_inicio} a {hora_fin} fue recibida y está en revisión."
    )
    await enviar_notificacion(
        usuario_id,
        TipoNotificacion.sistema,
        mensaje_corto,
        CanalNotificacion.ambos,
        correo_dest=correo,
        reserva_id=reserva_id,
        cuerpo_email=_cuerpo_reserva_recibida(espacio, fecha, hora_inicio, hora_fin),
    )


async def notificar_reserva_aprobada(
    usuario_id: str,
    correo: str,
    espacio: str,
    fecha: str,
    hora_inicio: str,
    hora_fin: str,
    reserva_id: str,
) -> None:
    """Notifica al usuario que su reserva fue aprobada."""
    mensaje_corto = (
        f"¡Tu reserva fue APROBADA! Espacio: '{espacio}', "
        f"Fecha: {fecha}, Hora: {hora_inicio} – {hora_fin}."
    )
    await enviar_notificacion(
        usuario_id,
        TipoNotificacion.confirmacion,
        mensaje_corto,
        CanalNotificacion.ambos,
        correo_dest=correo,
        reserva_id=reserva_id,
        cuerpo_email=_cuerpo_reserva_aprobada(espacio, fecha, hora_inicio, hora_fin),
    )


async def notificar_reserva_rechazada(
    usuario_id: str,
    correo: str,
    espacio: str,
    fecha: str,
    hora_inicio: str,
    hora_fin: str,
    justificacion: str,
    reserva_id: str,
) -> None:
    """Notifica al usuario que su reserva fue rechazada, indicando el motivo."""
    mensaje_corto = (
        f"Tu reserva para '{espacio}' el {fecha} de {hora_inicio} a {hora_fin} "
        f"fue RECHAZADA. Motivo: {justificacion}"
    )
    await enviar_notificacion(
        usuario_id,
        TipoNotificacion.rechazo,
        mensaje_corto,
        CanalNotificacion.ambos,
        correo_dest=correo,
        reserva_id=reserva_id,
        cuerpo_email=_cuerpo_reserva_rechazada(espacio, fecha, hora_inicio, hora_fin, justificacion),
    )


async def notificar_conflicto_automatico(
    usuario_id: str,
    correo: str,
    espacio: str,
    fecha: str,
    hora_inicio: str,
    hora_fin: str,
    reserva_id: str,
) -> None:
    """Notifica al usuario que su reserva fue rechazada automáticamente por conflicto de horario."""
    mensaje_corto = (
        f"Tu solicitud para '{espacio}' el {fecha} de {hora_inicio} a {hora_fin} "
        f"fue rechazada automáticamente por conflicto de horario."
    )
    await enviar_notificacion(
        usuario_id,
        TipoNotificacion.rechazo,
        mensaje_corto,
        CanalNotificacion.ambos,
        correo_dest=correo,
        reserva_id=reserva_id,
        cuerpo_email=_cuerpo_conflicto_automatico(espacio, fecha, hora_inicio, hora_fin),
    )


async def notificar_cancelacion(
    usuario_id: str,
    correo: str,
    espacio: str,
    fecha: str,
    reserva_id: str,
) -> None:
    """Notifica al usuario que su reserva fue cancelada."""
    mensaje_corto = f"Tu reserva del espacio '{espacio}' para el {fecha} ha sido CANCELADA."
    await enviar_notificacion(
        usuario_id,
        TipoNotificacion.cancelacion,
        mensaje_corto,
        CanalNotificacion.ambos,
        correo_dest=correo,
        reserva_id=reserva_id,
        cuerpo_email=_cuerpo_cancelacion(espacio, fecha),
    )


async def notificar_actualizacion_datos_admin(
    usuario_id: str,
    correo: str,
    campos_actualizados: dict,
) -> None:
    """
    Notifica al usuario que un administrador actualizó datos de su cuenta.

    Args:
        usuario_id:          ID del usuario afectado.
        correo:              Correo al que se enviará la notificación.
                             Si el administrador actualizó el correo, usar el NUEVO correo.
        campos_actualizados: Diccionario con los campos modificados y sus nuevos valores.
                             Ejemplo:
                             {
                                 "nombre":      "Nuevo Nombre",
                                 "correo":      "nuevo@uptc.edu.co",
                                 "password":    "NuevaPassword123",
                                 "telefono":    "3001234567",
                                 "rol":         "Docente",
                                 "codigo_inst": "2026001",
                                 "dependencia": "Bienestar Universitario",
                                 "programa":    "Ingeniería de Sistemas",
                                 "fuente":      "institucional_simulado",
                             }
    """
    campos_legibles = ", ".join(
        _ETIQUETAS_CAMPO.get(c, c) for c in campos_actualizados
    )
    mensaje_corto = (
        f"Un administrador actualizó los siguientes datos de tu cuenta: {campos_legibles}."
    )
    await enviar_notificacion(
        usuario_id,
        TipoNotificacion.sistema,
        mensaje_corto,
        CanalNotificacion.ambos,
        correo_dest=correo,
        cuerpo_email=_cuerpo_actualizacion_datos(campos_actualizados),
    )