/**
 * services/reservasService.js
 * Mapea los endpoints de /api/v1/reservas (reservas.py)
 */
import { api } from "../api/client";

/**
 * POST /reservas
 * Crea una solicitud de reserva con estado Pendiente.
 * @param {object} body - ReservaCreate
 *   { espacioId, fecha, horarioInicio, horarioFin, motivoReserva, numeroParticipantes }
 */
export async function crearReserva(body) {
  return api.post("/reservas", { body });
}

/**
 * GET /reservas
 * Admin/Administrativo ven todas; otros solo las propias.
 * @param {object} params - { espacio_id, estado, fecha, pagina, por_pagina }
 */
export async function listarReservas(params = {}) {
  const response = await api.get("/reservas", { params });
  return response.datos;
}

/**
 * GET /reservas/calendario
 * Retorna el calendario completo con la disponibilidad de los espacios.
 * @param {object} params - { fecha, horario, espacio_id } (opcionales)
 */
export async function listarCalendario(params = {}) {
  const data = await api.get("/reservas/calendario", {
    params,
  });

  return data;
}

/**
 * GET /reservas/:id
 */
export async function obtenerReserva(id) {
  return api.get(`/reservas/${id}`);
}

/**
 * PATCH /reservas/:id/gestion
 * Aprueba o rechaza (requiere rol Administrativo/Administrador).
 * Rechazo: justificacion obligatoria (RF09).
 * Aprobar dispara rechazo automático de conflictos (RF10).
 *
 * @param {string} id
 * @param {"aprobar"|"rechazar"} accion
 * @param {string|null} justificacion - requerida si accion === "rechazar"
 */
export async function gestionarReserva(id, accion, justificacion = null) {
  return api.patch(`/reservas/${id}/gestion`, {
    body: { accion, justificacion },
  });
}

/**
 * PATCH /reservas/:id/cancelar
 * El propio solicitante cancela su reserva (Pendiente o Aprobada).
 */
export async function cancelarReserva(id) {
  return api.patch(`/reservas/${id}/cancelar`, {});
}

/**
 * GET /reservas/mis/reservas
 * Shortcut: solo las reservas del usuario autenticado.
 * @param {object} params - { estado, pagina, por_pagina }
 */
export async function misReservas(params = {}) {
  const data = await api.get("/reservas/mis/reservas", { params });
  return data.datos;
}
