"""
Schemas Pydantic para toda la aplicación SGED.
Cubre: Usuarios, Espacios, Reservas, Notificaciones, Reportes y Auth.
"""
from datetime import datetime, date
from zoneinfo import ZoneInfo
from enum import Enum
from typing import Optional, List, Any, Dict, Annotated
from pydantic import BaseModel, EmailStr, Field, field_validator
from bson import ObjectId


# ── Helper para ObjectId de MongoDB ──────────────────────────────────────────
class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if ObjectId.is_valid(str(v)):
            return str(v)
        raise ValueError(f"ObjectId inválido: {v}")


# ── ENUMS ─────────────────────────────────────────────────────────────────────
class RolUsuario(str, Enum):
    estudiante     = "Estudiante"
    docente        = "Docente"
    administrativo = "Administrativo"
    empleado       = "Empleado"
    administrador  = "Administrador"


class TipoEspacio(str, Enum):
    cancha   = "Cancha"
    gimnasio = "Gimnasio"
    piscina  = "Piscina"
    pista    = "Pista"
    otro     = "Otro"


class EstadoEspacio(str, Enum):
    disponible    = "Disponible"
    mantenimiento = "Mantenimiento"
    ocupado       = "Ocupado"
    inactivo      = "Inactivo"


class EstadoReserva(str, Enum):
    pendiente  = "Pendiente"
    aprobada   = "Aprobada"
    rechazada  = "Rechazada"
    cancelada  = "Cancelada"


class TipoNotificacion(str, Enum):
    confirmacion = "Confirmacion"
    rechazo      = "Rechazo"
    recordatorio = "Recordatorio"
    cancelacion  = "Cancelacion"
    sistema      = "Sistema"


class CanalNotificacion(str, Enum):
    plataforma = "Plataforma"
    email      = "Email"
    ambos      = "Ambos"


class TipoReporte(str, Enum):
    uso_espacios         = "Uso_Espacios"
    reservas_usuario     = "Reservas_Usuario"
    estadisticas_general = "Estadisticas_Generales"
    mantenimiento        = "Mantenimiento"


class FormatoReporte(str, Enum):
    json = "JSON"
    csv  = "CSV"
    pdf  = "PDF"
    
class UsoPorEspacio(BaseModel):
    nombre: str
    total_reservas: int
    horas_totales: int


class EspaciosStatsResponse(BaseModel):
    total: int
    disponibles: int
    mantenimiento: int
    ocupados: int
    uso_por_espacio: list[UsoPorEspacio]   
    
# ══════════════════════════════════════════════════════════════════════════════
#   Calendario
# ══════════════════════════════════════════════════════════════════════════════
    
class ReservaDia(BaseModel):
    """
    Documento individual del calendario:
    {
      "fecha": "2025-05-12",
      "espacios": {
        "1": ["08:00", "09:00"],
        "2": ["10:00", "11:00"]
      }
    }
    """
    fecha: str = Field(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$"
    )

    espacios: Dict[str, List[str]]

    model_config = {
        "populate_by_name": True,
        "from_attributes": True
    }


class CalendarioResponse(BaseModel):
    """
    Respuesta completa:
    {
      "calendario": [...]
    }
    """
    calendario: List[ReservaDia]

    model_config = {
        "from_attributes": True
    }

# ══════════════════════════════════════════════════════════════════════════════
#   USUARIOS
# ══════════════════════════════════════════════════════════════════════════════

class UsuarioBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    correo: EmailStr
    rol: RolUsuario

    telefono: Optional[str] = Field(None, max_length=15)

    codigo_inst: Optional[str] = Field(None, max_length=50)
    dependencia: Optional[str] = Field(None, max_length=150)
    programa: Optional[str] = Field(None, max_length=150)
    fuente: Optional[str] = Field(None, max_length=100)

class UsuarioCreate(UsuarioBase):
    """Schema para registrar un usuario (con contraseña)."""
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe tener al menos una mayúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe tener al menos un número.")
        return v


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(
        None,
        min_length=2,
        max_length=100
    )

    correo: Optional[EmailStr] = None
    
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=128
    )

    telefono: Optional[str] = Field(
        None,
        max_length=15
    )

    rol: Optional[RolUsuario] = None

    codigo_inst: Optional[str] = Field(
        None,
        max_length=50
    )

    dependencia: Optional[str] = Field(
        None,
        max_length=100
    )

    programa: Optional[str] = Field(
        None,
        max_length=100
    )

    fuente: Optional[str] = Field(
        None,
        max_length=100
    )

    fechaActualizacion: datetime = Field(
        default_factory=lambda: datetime.now(
            ZoneInfo("America/Bogota")
        )
    )

class UsuarioResponse(UsuarioBase):
    """Schema de respuesta (sin contraseña)."""
    id:             str
    activo:         bool
    fechaRegistro:  datetime
    ultimoAcceso:   Optional[datetime] = None

    model_config = {"from_attributes": True}


class UsuarioInDB(UsuarioBase):
    """Representación interna con hash de contraseña."""
    id:             str
    password:       str
    activo:         bool      = True
    fechaRegistro:  datetime  = Field(default_factory=datetime.utcnow)
    ultimoAcceso:   Optional[datetime] = None

class UsuarioStatsResponse(BaseModel):
    total: int
    por_rol: Dict[str, int]
    activos_ultimo_mes: int

# ══════════════════════════════════════════════════════════════════════════════
#   AUTH
# ══════════════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    correo:   EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int          # segundos
    usuario:       UsuarioResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    password_actual: str
    password_nueva:  str = Field(..., min_length=8, max_length=128)

    @field_validator("password_nueva")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe tener al menos una mayúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe tener al menos un número.")
        return v


# ══════════════════════════════════════════════════════════════════════════════
#   ESPACIOS DEPORTIVOS
# ══════════════════════════════════════════════════════════════════════════════

class EspacioBase(BaseModel):
    nombre:          str             = Field(..., min_length=2, max_length=100)
    tipo:            TipoEspacio
    capacidad:       int             = Field(..., ge=1)
    descripcion:     Optional[str]   = Field(None, max_length=500)
    ubicacion:       Optional[str]   = Field(None, max_length=200)
    horarioApertura: str             = Field(..., pattern=r"^\d{2}:\d{2}$")
    horarioCierre:   str             = Field(..., pattern=r"^\d{2}:\d{2}$")


class EspacioCreate(EspacioBase):
    estado:    EstadoEspacio = EstadoEspacio.disponible
    imagenUrl: Optional[str] = None


class EspacioUpdate(BaseModel):
    nombre:          Optional[str]          = None
    tipo:            Optional[TipoEspacio]  = None
    capacidad:       Optional[int]          = Field(None, ge=1)
    estado:          Optional[EstadoEspacio]= None
    descripcion:     Optional[str]          = None
    ubicacion:       Optional[str]          = None
    horarioApertura: Optional[str]          = Field(None, pattern=r"^\d{2}:\d{2}$")
    horarioCierre:   Optional[str]          = Field(None, pattern=r"^\d{2}:\d{2}$")
    imagenUrl:       Optional[str]          = None


class EspacioResponse(EspacioBase):
    id:        str
    estado:    EstadoEspacio
    imagenUrl: Optional[str] = None

    model_config = {"from_attributes": True}


class DisponibilidadHoraria(BaseModel):
    """Horario individual con estado de disponibilidad."""
    hora_inicio: str
    hora_fin:    str
    disponible:  bool
    reserva_id:  Optional[str] = None
    actividad:   Optional[str] = None


class DisponibilidadDia(BaseModel):
    """Disponibilidad de un espacio en un día específico."""
    espacio_id:   str
    espacio_nombre: str
    fecha:        date
    horarios:     List[DisponibilidadHoraria]


# ══════════════════════════════════════════════════════════════════════════════
#   RESERVAS
# ══════════════════════════════════════════════════════════════════════════════

Hora = Annotated[
    str,
    Field(pattern=r"^\d{2}:\d{2}$")
]

class ReservaBase(BaseModel):
    espacioId:           str
    fecha:               date
    horarioInicio:       str = Field(..., pattern=r"^\d{2}:\d{2}$")
    horarioFin:          str = Field(..., pattern=r"^\d{2}:\d{2}$")
    horarios_elegidos:   List[Hora]
    motivoReserva:       Optional[str] = Field(None, max_length=200)
    numeroParticipantes: Optional[int] = Field(None, ge=1)


class ReservaCreate(ReservaBase):
    pass


class ReservaUpdate(BaseModel):
    """Solo campos modificables por el solicitante antes de aprobación."""
    motivoReserva:       Optional[str] = None
    numeroParticipantes: Optional[int] = Field(None, ge=1)


class GestionReservaRequest(BaseModel):
    """Payload del Administrativo al aprobar/rechazar."""
    accion:        str   = Field(..., pattern=r"^(aprobar|rechazar)$")
    justificacion: Optional[str] = Field(None, max_length=500)

    @field_validator("justificacion")
    @classmethod
    def justificacion_requerida_al_rechazar(cls, v, info):
        # Se valida en el servicio para poder acceder a 'accion'
        return v


class ReservaResponse(BaseModel):
    id:                  str
    usuarioId:           str
    espacioId:           str
    fecha:               date
    horarioInicio:       str
    horarioFin:          str
    estado:              EstadoReserva
    motivoReserva:       Optional[str]     = None
    numeroParticipantes: Optional[int]     = None
    justificacion:       Optional[str]     = None
    fechaSolicitud:      datetime
    aprobadoPor:         Optional[str]     = None
    # Datos enriquecidos (join)
    espacio_nombre:      Optional[str]     = None
    usuario_nombre:      Optional[str]     = None
    horarios_elegidos:   List[Hora] =  []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#   NOTIFICACIONES
# ══════════════════════════════════════════════════════════════════════════════

class NotificacionBase(BaseModel):
    usuarioId:  str
    tipo:       TipoNotificacion
    mensaje:    str = Field(..., max_length=1000)
    canal:      CanalNotificacion = CanalNotificacion.ambos
    reservaId:  Optional[str] = None


class NotificacionCreate(NotificacionBase):
    pass


class NotificacionResponse(NotificacionBase):
    id:         str
    leida:      bool
    fechaEnvio: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#   REPORTES
# ══════════════════════════════════════════════════════════════════════════════

class ReporteRequest(BaseModel):
    tipoReporte:  TipoReporte
    formato:      FormatoReporte  = FormatoReporte.json
    fecha_inicio: Optional[date]  = None
    fecha_fin:    Optional[date]  = None
    espacio_id:   Optional[str]   = None
    usuario_id:   Optional[str]   = None

class HeatmapItem(BaseModel):
    fecha: str
    total: int
    
class TendenciaItem(BaseModel):
    mes: str
    aprobadas: int
    rechazadas: int
    pendientes: int
    canceladas: int

class ReporteResponse(BaseModel):
    id:               str
    administradorId:  str
    tipoReporte:      TipoReporte
    formato:          FormatoReporte
    fechaGeneracion:  datetime
    parametros:       Optional[dict]    = None
    datos:            List[Any]         = []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#   RESPUESTAS GENÉRICAS
# ══════════════════════════════════════════════════════════════════════════════

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    total:    int
    pagina:   int
    por_pagina: int
    datos:    List[Any]
