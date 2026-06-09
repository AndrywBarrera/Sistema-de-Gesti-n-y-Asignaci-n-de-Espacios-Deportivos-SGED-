/**
 * services/notificacionesService.js
 * Mapea los endpoints de /api/v1/notificaciones (notificaciones.py)
 */
import { api } from "../api/client";

/**
 * GET /notificaciones
 * Retorna las notificaciones del usuario autenticado.
 * @param {object} params - { solo_no_leidas, pagina, por_pagina }
 * @returns PaginatedResponse<NotificacionResponse>
 */
export async function listarNotificaciones(params = {}) {
  const data = await api.get("/notificaciones", { params });
  return data;
}

/**
 * PATCH /notificaciones/:id/leida
 * Marca una notificación como leída.
 */
export async function marcarLeida(id) {
  const data = await api.patch(`/notificaciones/${id}/leida`, {});
  return data;
}

/**
 * PATCH /notificaciones/todas/leidas
 * Marca todas las notificaciones del usuario como leídas.
 */
export async function marcarTodasLeidas() {
  const data = await api.patch("/notificaciones/todas/leidas", {});
  return data;
}
