/**
 * services/espaciosService.js
 * Mapea los endpoints de /api/v1/espacios (espacios.py)
 */
import { api } from "../api/client";

/**
 * GET /espacios
 * Lista espacios con filtros y paginación.
 * @param {object} params - { tipo, estado, pagina, por_pagina }
 * @returns PaginatedResponse<EspacioResponse>
 */
export async function listarEspacios(params = {}) {
  const response = await api.get("/espacios", { params });
  return response.datos;
}
/**
 * POST /espacios
 * Crea un espacio (requiere rol Administrador o Administrativo).
 * @param {object} body - EspacioCreate
 */
export async function crearEspacio(body) {
  return api.post("/espacios", { body });
}

/**
 * GET /espacios/:id
 */
export async function obtenerEspacio(id) {
  return api.get(`/espacios/${id}`);
}

/**
 * PUT /espacios/:id
 * @param {object} body - EspacioUpdate
 */
export async function actualizarEspacio(id, body) {
  return api.put(`/espacios/${id}`, { body });
}

/**
 * DELETE /espacios/:id
 * Solo Administrador.
 */
export async function eliminarEspacio(id) {
  return api.delete(`/espacios/${id}`);
}

/**
 * POST /espacios/:id/imagen
 * Sube imagen (multipart/form-data) → Cloudinary.
 */
export async function subirImagen(id, file) {
  const form = new FormData();
  // cambiar "file" por "imagen"
  form.append("file", file);

  const { tokenStore } = await import("../api/client");
  const BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

  const res = await fetch(`${BASE_URL}/espacios/${id}/imagen`, {
    method: "POST",
    headers: tokenStore.access
      ? {
          Authorization: `Bearer ${tokenStore.access}`,
        }
      : undefined,
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Error backend:", err);
    throw new Error(
      err.detail || err.message || "Error al subir la imagen."
    );
  }

  return await res.json();
}

/**
 * GET /espacios/:id/disponibilidad?fecha=YYYY-MM-DD
 */
export async function obtenerDisponibilidad(id, fecha) {
  return api.get(`/espacios/${id}/disponibilidad`, { params: { fecha } });
}

/**
 * GET /espacios/stats
 * Obtiene estadísticas generales de espacios deportivos.
 */
export async function obtenerStatsEspacios() {
  return api.get("/espacios/stats");
}