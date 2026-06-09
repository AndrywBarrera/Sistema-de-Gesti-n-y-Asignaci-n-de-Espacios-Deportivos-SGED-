/**
 * api/client.js
 * Cliente HTTP base con:
 *  - baseURL desde .env
 *  - Inyección automática del Authorization header (Bearer token)
 *  - Refresh automático del access_token cuando expira (401)
 *  - Logout forzado si el refresh también falla
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// ─── tokenStore — lee y escribe en localStorage ───────────────────────────────
// FIX: las variables _accessToken/_refreshToken en memoria se pierden al recargar.
// Ahora request() siempre lee tokenStore.access directamente desde localStorage.
export const tokenStore = {
  get access()  { return localStorage.getItem("sged_access")  ?? ""; },
  get refresh() { return localStorage.getItem("sged_refresh") ?? ""; },

  set(accessToken, refreshToken) {
    localStorage.setItem("sged_access",  accessToken);
    localStorage.setItem("sged_refresh", refreshToken);
  },

  clear() {
    localStorage.removeItem("sged_access");
    localStorage.removeItem("sged_refresh");
  },
};

// ─── Petición base ────────────────────────────────────────────────────────────
async function request(method, path, { body, params, auth = true } = {}) {
  const url = new URL(`${BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined) url.searchParams.append(k, v);
    });
  }

  const headers = { "Content-Type": "application/json" };
  // FIX: lee siempre de tokenStore (localStorage), no de variable en memoria
  if (auth && tokenStore.access) {
    headers["Authorization"] = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expirado → intentar refrescar
  if (res.status === 401 && tokenStore.refresh && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Reintentar con el nuevo access token
      headers["Authorization"] = `Bearer ${tokenStore.access}`;
      const retry = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return handleResponse(retry);
    } else {
      tokenStore.clear();
      window.dispatchEvent(new Event("sged:session-expired"));
      throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
    }
  }

  return handleResponse(res);
}

async function handleResponse(res) {
  const ct   = res.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      data?.detail ??
      (typeof data === "string" ? data : "Error inesperado del servidor.");
    const err = new Error(message);
    err.status = res.status;
    err.data   = data;
    throw err;
  }

  return data;
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refresh_token: tokenStore.refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenStore.set(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

// ─── Métodos públicos ─────────────────────────────────────────────────────────
export const api = {
  get:    (path, opts) => request("GET",    path, opts),
  post:   (path, opts) => request("POST",   path, opts),
  put:    (path, opts) => request("PUT",    path, opts),
  patch:  (path, opts) => request("PATCH",  path, opts),
  delete: (path, opts) => request("DELETE", path, opts),
};