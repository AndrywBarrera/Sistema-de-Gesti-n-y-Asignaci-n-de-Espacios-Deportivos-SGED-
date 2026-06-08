/**
 * services/authService.js
 * Mapea los endpoints de /api/v1/auth (auth.py)
 */

import { api, tokenStore } from "../api/client";

/**
 * POST /auth/login
 * Autentica al usuario y almacena los tokens.
 * @returns { usuario, access_token, refresh_token, expires_in }
 */
export async function login(correo, password) {
  const data = await api.post("/auth/login", {
    body: { correo, password },
    auth: false,
  });

  tokenStore.set(data.access_token, data.refresh_token);

  return data; // { access_token, refresh_token, expires_in, usuario }
}

/**
 * POST /auth/logout
 * Invalida el refresh_token en el servidor.
 */
export async function logout() {
  try {
    await api.post("/auth/logout", {
      body: {
        refresh_token: tokenStore.refresh,
      },
    });
  } finally {
    tokenStore.clear();
  }
}

/**
 * POST /auth/refresh
 * Renueva el access_token con el refresh_token actual.
 */
export async function refreshToken() {
  const data = await api.post("/auth/refresh", {
    body: {
      refresh_token: tokenStore.refresh,
    },
    auth: false,
  });

  tokenStore.set(data.access_token, data.refresh_token);

  return data;
}

/**
 * GET /auth/me
 * Devuelve el perfil del usuario autenticado.
 */
export async function getMe() {
  return api.get("/auth/me");
}

/**
 * PUT /auth/cambiarDatosUser
 */
export async function cambiarDatosUser({
  passwordActual,
  passwordNueva,
  telefono,
}) {
  const body = {};

  if (telefono !== undefined) {
    body.telefono = telefono;
  }

  if (passwordNueva !== undefined) {
    body.password_actual = passwordActual;
    body.password_nueva = passwordNueva;
  }

  return api.put("/auth/cambiarDatosUser", { body });
}