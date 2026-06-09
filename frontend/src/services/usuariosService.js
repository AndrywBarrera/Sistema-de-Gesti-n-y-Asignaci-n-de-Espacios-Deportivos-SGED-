/**
 * services/usuariosService.js
 * Mapea los endpoints de /api/v1/usuarios (usuarios.py)
 */
import { api } from "../api/client";

/**
 * GET /usuarios
 * Solo Administrador 
 * @param {object} params - { rol, activo, pagina, por_pagina }
 * @returns PaginatedResponse<UsuarioResponse>
 */
export async function listarUsuarios(params = {}) {
  return api.get("/usuarios", { params });
}

/**
 * POST /usuarios
 * Solo Administrador puede crear usuarios.
 * @param {object} body - { nombre, correo, password, rol, telefono }
 */
export async function crearUsuario(body) {
  return api.post("/usuarios", { body });
}

/**
 * GET /usuarios/:id
 * Admin/Administrativo ven cualquier perfil.
 * Otros roles solo su propio perfil.
 */
export async function obtenerUsuario(id) {
  return api.get(`/usuarios/${id}`);
}

/**
 * PUT /usuarios/:id
 * Solo Administrador puede cambiar el rol.
 * @param {object} body - UsuarioUpdate
 */
export async function actualizarUsuario(id, body) {
  return api.put(`/usuarios/${id}`, { body });
}

/**
 * DELETE /usuarios/:id  → desactiva (soft delete)
 * Solo Administrador.
 */
export async function desactivarUsuario(id) {
  return api.delete(`/usuarios/${id}`);
}

/**
 * PUT /usuarios/activate/:id  → reactiva un usuario desactivado.
 * Solo Administrador. No requiere body.
 */
export async function activarUsuario(id) {
  return api.put(`/usuarios/activate/${id}`);
}

/**
 * GET /usuarios/stats
 * Obtiene estadísticas generales de usuarios.
 */
export async function obtenerStatsUsuarios() {
  return api.get("/usuarios/stats");
}