// ─── COLECCIÓN: espacios_deportivos ──────────────────────────────────────────
export const ESPACIOS = [
  {
    _id: "6a10d17160030f9a532341f0",
    nombre: "Cancha Sintética Norte",
    tipo: "Cancha",
    capacidad: 22,
    estado: "Disponible",
    horarioApertura: "06:00",
    horarioCierre: "22:00",
    descripcion: "Cancha de fútbol 11 con césped sintético de última generación.",
    ubicacion: "Bloque A, Zona Norte",
    imagenUrl: null,
  },
  {
    _id: "2",
    nombre: "Gimnasio Principal",
    tipo: "Gimnasio",
    capacidad: 40,
    estado: "Disponible",
    horarioApertura: "05:30",
    horarioCierre: "21:00",
    descripcion: "Gimnasio equipado con máquinas cardiovasculares y pesas.",
    ubicacion: "Bloque B",
    imagenUrl: null,
  },
  {
    _id: "3",
    nombre: "Cancha de Baloncesto",
    tipo: "Cancha",
    capacidad: 12,
    estado: "Mantenimiento",
    horarioApertura: "07:00",
    horarioCierre: "20:00",
    descripcion: "Cancha techada con piso de madera profesional.",
    ubicacion: "Coliseo Central",
    imagenUrl: null,
  },
  {
    _id: "4",
    nombre: "Piscina Olímpica",
    tipo: "Piscina",
    capacidad: 30,
    estado: "Disponible",
    horarioApertura: "06:00",
    horarioCierre: "18:00",
    descripcion: "Piscina semiolímpica de 25 m con 6 carriles.",
    ubicacion: "Zona Acuática",
    imagenUrl: null,
  },
  {
    _id: "5",
    nombre: "Pista Atlética",
    tipo: "Pista",
    capacidad: 50,
    estado: "Disponible",
    horarioApertura: "05:00",
    horarioCierre: "20:00",
    descripcion: "Pista de atletismo de 400 m con 8 carriles reglamentarios.",
    ubicacion: "Estadio UPTC",
    imagenUrl: null,
  },
];

// ─── COLECCIÓN: reservas (por fecha > espacioId > horarios ocupados) ──────────
export const RESERVAS_MOCK = {
  "2025-05-12": {
     "6a10d17160030f9a532341f0": ["08:00", "09:00", "14:00"],
      "2": ["07:00", "08:00", "09:00", "10:00"] },
  "2025-05-13": { "6a10d17160030f9a532341f0": ["06:00", "07:00", "15:00", "16:00", "17:00"], "4": ["08:00", "09:00", "10:00"] },
  "2025-05-14": { "2": ["11:00", "12:00"], "5": ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"] },
  "2025-05-15": {
    "6a10d17160030f9a532341f0": ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"],
  },
  "2025-05-16": { "3": ["10:00", "11:00", "12:00"], "4": ["14:00", "15:00"] },
  "2025-05-19": { "6a10d17160030f9a532341f0": ["06:00", "07:00", "08:00"], "2": ["09:00", "10:00", "11:00", "12:00"] },
  "2025-05-20": {
    "5": ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"],
  },
};

// ─── COLECCIÓN: notificaciones ────────────────────────────────────────────────
export const NOTIFICACIONES_MOCK = [
  {
    _id: "n1",
    tipo: "Confirmacion",
    mensaje: "Tu reserva en Cancha Sintética Norte el 10 de mayo a las 10:00 fue aprobada.",
    fechaEnvio: "2025-05-10T09:00:00",
    leida: false,
    canal: "Plataforma",
  },
  {
    _id: "n2",
    tipo: "Rechazo",
    mensaje: "Tu solicitud para Piscina Olímpica fue rechazada. Motivo: Mantenimiento programado.",
    fechaEnvio: "2025-05-09T14:30:00",
    leida: false,
    canal: "Plataforma",
  },
  {
    _id: "n3",
    tipo: "Recordatorio",
    mensaje: "Recordatorio: Tienes reserva mañana en Gimnasio Principal a las 07:00.",
    fechaEnvio: "2025-05-08T18:00:00",
    leida: true,
    canal: "Ambos",
  },
  {
    _id: "n4",
    tipo: "Sistema",
    mensaje: "Bienvenido al SGED. Tu cuenta institucional ha sido activada correctamente.",
    fechaEnvio: "2025-05-01T08:00:00",
    leida: true,
    canal: "Plataforma",
  },
];

// ─── COLECCIÓN: solicitudes / reservas con estado ─────────────────────────────
export const SOLICITUDES_MOCK = [
  {
    _id: "s1",
    usuarioNombre: "Carlos Pineda",
    usuarioRol: "Estudiante",
    usuarioCorreo: "c.pineda@uptc.edu.co",
    espacioId: "1",
    espacioNombre: "Cancha Sintética Norte",
    fecha: "2025-05-13",
    horarioInicio: "16:00",
    horarioFin: "17:00",
    motivoReserva: "Entrenamiento fútbol sala",
    numeroParticipantes: 14,
    estado: "Pendiente",
    fechaSolicitud: "2025-05-11T10:20:00",
    justificacion: null,
  },
  {
    _id: "s2",
    usuarioNombre: "Prof. Rodríguez",
    usuarioRol: "Docente",
    usuarioCorreo: "j.rodriguez@uptc.edu.co",
    espacioId: "2",
    espacioNombre: "Gimnasio Principal",
    fecha: "2025-05-14",
    horarioInicio: "09:00",
    horarioFin: "10:00",
    motivoReserva: "Clase de educación física",
    numeroParticipantes: 25,
    estado: "Pendiente",
    fechaSolicitud: "2025-05-11T11:00:00",
    justificacion: null,
  },
  {
    _id: "s3",
    usuarioNombre: "María López",
    usuarioRol: "Estudiante",
    usuarioCorreo: "m.lopez@uptc.edu.co",
    espacioId: "4",
    espacioNombre: "Piscina Olímpica",
    fecha: "2025-05-15",
    horarioInicio: "07:00",
    horarioFin: "08:00",
    motivoReserva: "Entrenamiento natación competitiva",
    numeroParticipantes: 8,
    estado: "Pendiente",
    fechaSolicitud: "2025-05-11T14:30:00",
    justificacion: null,
  },
  {
    _id: "s4",
    usuarioNombre: "Juan Torres",
    usuarioRol: "Empleado",
    usuarioCorreo: "j.torres@uptc.edu.co",
    espacioId: "5",
    espacioNombre: "Pista Atlética",
    fecha: "2025-05-16",
    horarioInicio: "06:00",
    horarioFin: "07:00",
    motivoReserva: "Ejercicio matutino",
    numeroParticipantes: 1,
    estado: "Aprobada",
    fechaSolicitud: "2025-05-10T07:00:00",
    justificacion: null,
  },
  {
    _id: "s5",
    usuarioNombre: "Ana Gómez",
    usuarioRol: "Docente",
    usuarioCorreo: "a.gomez@uptc.edu.co",
    espacioId: "3",
    espacioNombre: "Cancha de Baloncesto",
    fecha: "2025-05-17",
    horarioInicio: "10:00",
    horarioFin: "11:00",
    motivoReserva: "Torneo interfacultades",
    numeroParticipantes: 20,
    estado: "Rechazada",
    fechaSolicitud: "2025-05-09T16:00:00",
    justificacion: "El espacio está en mantenimiento preventivo programado.",
  },
];

// ─── COLECCIÓN: usuarios ──────────────────────────────────────────────────────
export const USUARIOS_MOCK = [
  { _id: "u1", nombre: "Carlos Pineda", correo: "c.pineda@uptc.edu.co", rol: "Estudiante", activo: true, fechaRegistro: "2025-03-01", ultimoAcceso: "2025-05-11" },
  { _id: "u2", nombre: "Prof. Rodríguez", correo: "j.rodriguez@uptc.edu.co", rol: "Docente", activo: true, fechaRegistro: "2025-02-15", ultimoAcceso: "2025-05-10" },
  { _id: "u3", nombre: "María López", correo: "m.lopez@uptc.edu.co", rol: "Administrativo", activo: true, fechaRegistro: "2025-01-20", ultimoAcceso: "2025-05-12" },
  { _id: "u4", nombre: "Juan Torres", correo: "j.torres@uptc.edu.co", rol: "Empleado", activo: false, fechaRegistro: "2025-02-01", ultimoAcceso: "2025-04-30" },
  { _id: "u5", nombre: "Ana Gómez", correo: "a.gomez@uptc.edu.co", rol: "Docente", activo: true, fechaRegistro: "2025-03-10", ultimoAcceso: "2025-05-09" },
  { _id: "u6", nombre: "Admin SGED", correo: "admin.sged@uptc.edu.co", rol: "Administrador", activo: true, fechaRegistro: "2025-01-01", ultimoAcceso: "2025-05-12" },
];


export const ROLES = ["Estudiante", "Docente", "Administrativo", "Empleado", "Administrador"];
export const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
export const DIAS_SEMANA_CORTO = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
export const DIAS_SEMANA_LARGO = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

// Permisos por rol (RF01, RF15)
export const PERMISOS = {
  Estudiante:     { puedeReservar: true,  puedeAprobar: false, puedeVerReportes: false, puedeGestionarUsuarios: false },
  Docente:        { puedeReservar: true,  puedeAprobar: false, puedeVerReportes: false, puedeGestionarUsuarios: false },
  Empleado:       { puedeReservar: true,  puedeAprobar: false, puedeVerReportes: false, puedeGestionarUsuarios: false },
  Administrativo: { puedeReservar: false, puedeAprobar: true,  puedeVerReportes: true,  puedeGestionarUsuarios: false },
  Administrador:  { puedeReservar: false, puedeAprobar: false,  puedeVerReportes: false,  puedeGestionarUsuarios: true  },
};
