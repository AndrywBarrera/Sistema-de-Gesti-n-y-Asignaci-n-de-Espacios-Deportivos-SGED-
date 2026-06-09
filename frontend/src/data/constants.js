/**
 * data/constants.js
 * Constantes de la aplicación (no son datos de prueba).
 * Roles, nombres de meses/días y matriz de permisos por rol.
 */

export const ROLES = ["Estudiante", "Docente", "Administrativo", "Empleado", "Administrador"];

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DIAS_SEMANA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_SEMANA_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Permisos por rol (RF01, RF15)
export const PERMISOS = {
  Estudiante:     { puedeReservar: true,  puedeAprobar: false, puedeVerReportes: false, puedeGestionarUsuarios: false },
  Docente:        { puedeReservar: true,  puedeAprobar: false, puedeVerReportes: false, puedeGestionarUsuarios: false },
  Empleado:       { puedeReservar: true,  puedeAprobar: false, puedeVerReportes: false, puedeGestionarUsuarios: false },
  Administrativo: { puedeReservar: false, puedeAprobar: true,  puedeVerReportes: true,  puedeGestionarUsuarios: false },
  Administrador:  { puedeReservar: false, puedeAprobar: false, puedeVerReportes: false, puedeGestionarUsuarios: true  },
};
