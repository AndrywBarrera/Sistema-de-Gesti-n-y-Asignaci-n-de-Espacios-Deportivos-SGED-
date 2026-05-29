// @ts-check
import { test, expect } from "@playwright/test";
/** @typedef {import('@playwright/test').APIRequestContext} APIRequestContext */

// ──────────────────────────────────────────────
// CONFIGURACIÓN
// Ajusta BASE_URL si tu API corre en otro puerto
// ──────────────────────────────────────────────
const BASE_URL = process.env.API_URL || "http://localhost:8000/api/v1";

// Credenciales reales que deben existir en tu BD de prueba
const ADMIN_CREDENTIALS = {
  correo: "admin@uptc.edu.co",
  password: "Admin1234",
};
const USER_CREDENTIALS = {
  correo: "andryw.barrera@uptc.edu.co",
  password: "Estudiante1",
};
const ADMINISTRATIVO_CREDENTIALS = {
  correo: "coordinador@uptc.edu.co",
  password: "Coord1234",
};
// IDs que existan realmente en tu BD de prueba
// Puedes sobreescribirlos con variables de entorno también
const ESPACIO_ID_VALIDO = process.env.ESPACIO_ID || "6a10d17160030f9a532341f0";
const RESERVA_ID_VALIDO = process.env.RESERVA_ID || "6a15e33cf2c0bcf7a51f2907";
const USUARIO_ID_VALIDO = process.env.USUARIO_ID || "6a10b40f9f1292ecf5c0e8ad";
const NOTI_ID_VALIDO = process.env.NOTI_ID || "6a135a3333244fcf38321108";

// ──────────────────────────────────────────────
// HELPERS: obtener tokens reales vía login
// ──────────────────────────────────────────────
/** @param {APIRequestContext} request */
async function loginAdmin(request) {
  const res = await request.post(`${BASE_URL}/auth/login`, {
    data: ADMIN_CREDENTIALS,
  });
  expect(res.status(), "Login admin debe retornar 200").toBe(200);
  const json = await res.json();
  return json.access_token;
}

/** @param {APIRequestContext} request */
async function loginAdministrativo(request) {
  const res = await request.post(`${BASE_URL}/auth/login`, {
    data: ADMINISTRATIVO_CREDENTIALS,
  });
  expect(res.status(), "Login administrativo debe retornar 200").toBe(200);
  const json = await res.json();
  return json.access_token;
}

/** @param {APIRequestContext} request */
async function loginUser(request) {
  const res = await request.post(`${BASE_URL}/auth/login`, {
    data: USER_CREDENTIALS,
  });
  expect(res.status(), "Login usuario debe retornar 200").toBe(200);
  const json = await res.json();
  return json.access_token;
}

/**
 * @param {string} token
 */
function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ══════════════════════════════════════════════
// SUITE: AUTH
// ══════════════════════════════════════════════
test.describe("AUTH – /api/v1/auth", () => {
  test("POST /login – credenciales válidas retorna tokens", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: ADMIN_CREDENTIALS,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("access_token");
    expect(json).toHaveProperty("refresh_token");
    expect(json).toHaveProperty("expires_in");
    expect(json.usuario.correo).toBe(ADMIN_CREDENTIALS.correo);
  });

  test("POST /login – credenciales incorrectas retorna 401", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { correo: "noexiste@test.com", password: "wrong" },
    });
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.detail).toMatch(/Credenciales incorrectas/);
  });

  test("GET /me – retorna perfil del usuario autenticado", async ({
    request,
  }) => {
    const token = await loginUser(request);
    const res = await request.get(`${BASE_URL}/auth/me`, authHeaders(token));
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("correo");
    expect(json).toHaveProperty("rol");
    expect(json).toHaveProperty("nombre");
  });

  test("GET /me – sin token retorna 401/403", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/auth/me`);
    expect([401, 403]).toContain(res.status());
  });

  test("POST /logout – cierra sesión correctamente", async ({ request }) => {
    // Hacemos login para obtener refresh_token real
    const loginRes = await request.post(`${BASE_URL}/auth/login`, {
      data: USER_CREDENTIALS,
    });
    const { access_token, refresh_token } = await loginRes.json();

    const res = await request.post(`${BASE_URL}/auth/logout`, {
      data: { refresh_token },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("cerrada");
  });

  test("PUT /cambiarDatosUser – actualiza teléfono", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.put(`${BASE_URL}/auth/cambiarDatosUser`, {
      data: { telefono: "3007654321" },
      ...authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("actualizados");
  });

  test("PUT /cambiarDatosUser – sin datos retorna 400", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.put(`${BASE_URL}/auth/cambiarDatosUser`, {
      data: {},
      ...authHeaders(token),
    });
    expect(res.status()).toBe(400);
  });
});

// ══════════════════════════════════════════════
// SUITE: USUARIOS
// ══════════════════════════════════════════════
test.describe("USUARIOS – /api/v1/usuarios", () => {
  test("GET / – lista todos los usuarios con paginación", async ({
    request,
  }) => {
    const token = await loginAdmin(request);
    const res = await request.get(`${BASE_URL}/usuarios`, authHeaders(token));
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("datos");
    expect(Array.isArray(json.datos)).toBeTruthy();
  });

  test("GET / – filtra por rol Administrador", async ({ request }) => {
    const token = await loginAdmin(request);
    const res = await request.get(
      `${BASE_URL}/usuarios?rol=Administrador`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    json.datos.forEach(
      /** @param {{ rol: string }} u */
      (u) => expect(u.rol).toBe("Administrador"),
    );
  });

  test("POST / – correo duplicado retorna 409", async ({ request }) => {
    const token = await loginAdmin(request);
    const res = await request.post(`${BASE_URL}/usuarios`, {
      data: {
        nombre: "Duplicado",
        correo: ADMIN_CREDENTIALS.correo, // correo que ya existe
        password: "Pass1234!",
        rol: "Estudiante",
      },
      ...authHeaders(token),
    });
    expect(res.status()).toBe(409);
  });

  test("GET /stats – retorna estadísticas de usuarios", async ({ request }) => {
    const token = await loginAdministrativo(request);
    const res = await request.get(
      `${BASE_URL}/usuarios/stats`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("por_rol");
    expect(json).toHaveProperty("activos_ultimo_mes");
  });

  test("GET /:id – obtiene un usuario por ID válido", async ({ request }) => {
    const token = await loginAdmin(request);
    const res = await request.get(
      `${BASE_URL}/usuarios/${USUARIO_ID_VALIDO}`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("id");
    expect(json).toHaveProperty("correo");
  });

  test("GET /:id – ID inexistente retorna 404", async ({ request }) => {
    const token = await loginAdmin(request);
    const res = await request.get(
      `${BASE_URL}/usuarios/000000000000000000000000`,
      authHeaders(token),
    );
    expect(res.status()).toBe(404);
  });
});

// ══════════════════════════════════════════════
// SUITE: ESPACIOS DEPORTIVOS
// ══════════════════════════════════════════════
test.describe("ESPACIOS – /api/v1/espacios", () => {
  test("GET / – lista todos los espacios", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.get(`${BASE_URL}/espacios`, authHeaders(token));
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("datos");
    expect(json.datos[0]).toHaveProperty("nombre");
    expect(json.datos[0]).toHaveProperty("estado");
  });

  test("GET / – filtra por estado Disponible", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.get(
      `${BASE_URL}/espacios?estado=Disponible`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    json.datos.forEach(
      /** @param {{ estado: string }} e */
      (e) => expect(e.estado).toBe("Disponible"),
    );
  });

  test("GET / – filtra por tipo Cancha", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.get(
      `${BASE_URL}/espacios?tipo=Cancha`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    json.datos.forEach(
      /** @param {{ tipo: string }} e */
      (e) => expect(e.tipo).toBe("Cancha"),
    );
  });

  test("GET /stats – estadísticas de espacios (admin)", async ({ request }) => {
    const token = await loginAdministrativo(request);
    const res = await request.get(
      `${BASE_URL}/espacios/stats`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("disponibles");
    expect(json).toHaveProperty("mantenimiento");
  });

  test("GET /:id – obtiene espacio por ID válido", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.get(
      `${BASE_URL}/espacios/${ESPACIO_ID_VALIDO}`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("nombre");
    expect(json).toHaveProperty("capacidad");
  });

  test("GET /:id – ID inexistente retorna 404", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.get(
      `${BASE_URL}/espacios/000000000000000000000000`,
      authHeaders(token),
    );
    expect(res.status()).toBe(404);
  });

  test("GET /:id/disponibilidad – retorna slots disponibles", async ({
    request,
  }) => {
    const token = await loginUser(request);
    // Usa una fecha futura válida
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 7);
    const fechaStr = fecha.toISOString().split("T")[0];

    const res = await request.get(
      `${BASE_URL}/espacios/${ESPACIO_ID_VALIDO}/disponibilidad?fecha=${fechaStr}`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("horas_disponibles");
    expect(json).toHaveProperty("horas_ocupadas");
  });

  test("POST / – nombre duplicado retorna 409", async ({ request }) => {
    // Primero obtenemos el nombre de un espacio real
    const token = await loginAdmin(request);
    const listRes = await request.get(
      `${BASE_URL}/espacios`,
      authHeaders(token),
    );
    const lista = await listRes.json();
    if (!lista.datos.length) return test.skip();

    const nombreExistente = lista.datos[0].nombre;
    const res = await request.post(`${BASE_URL}/espacios`, {
      data: {
        nombre: nombreExistente,
        tipo: "Cancha",
        capacidad: 22,
        estado: "Disponible",
        horarioApertura: "06:00",
        horarioCierre: "22:00",
      },
      ...authHeaders(token),
    });
    expect(res.status()).toBe(409);
  });
});

// ══════════════════════════════════════════════
// SUITE: RESERVAS
// ══════════════════════════════════════════════
test.describe("RESERVAS – /api/v1/reservas", () => {
  test("POST / – crea una reserva con estado Pendiente", async ({
    request,
  }) => {
    const token = await loginUser(request);

    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 14);

    const fechaStr = fecha.toISOString().split("T")[0];

    const res = await request.post(`${BASE_URL}/reservas`, {
      data: {
        espacioId: ESPACIO_ID_VALIDO,
        fecha: fechaStr,
        horarioInicio: "09:00",
        horarioFin: "11:00",
        horarios_elegidos: ["09:00", "10:00"],
      },
      ...authHeaders(token),
    });

    expect(res.status()).toBe(201);

    const json = await res.json();

    expect(json.estado).toBe("Pendiente");
    expect(json.espacioId).toBe(ESPACIO_ID_VALIDO);
  });

  test("GET / – lista reservas (admin)", async ({ request }) => {
    const token = await loginAdministrativo(request);
    const res = await request.get(`${BASE_URL}/reservas`, authHeaders(token));
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("total");
    expect(Array.isArray(json.datos)).toBeTruthy();
  });

  test("GET / – filtra por estado", async ({ request }) => {
    const token = await loginAdministrativo(request);
    const res = await request.get(
      `${BASE_URL}/reservas?estado=Aprobada`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    json.datos.forEach(
      /** @param {{ estado: string }} r */
      (r) => expect(r.estado).toBe("Aprobada"),
    );
  });

  test("GET /mis/reservas – retorna solo las reservas del usuario autenticado", async ({
    request,
  }) => {
    const token = await loginUser(request);
    const res = await request.get(
      `${BASE_URL}/reservas/mis/reservas`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("datos");
  });

  test("PATCH /:id/gestion – rechaza sin justificación retorna 400", async ({
    request,
  }) => {
    const token = await loginAdministrativo(request);
    const res = await request.patch(
      `${BASE_URL}/reservas/${RESERVA_ID_VALIDO}/gestion`,
      {
        data: { accion: "Rechazar" },
        ...authHeaders(token),
      },
    );
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.detail).toMatch(/justificación/i);
  });

  test("PATCH /:id/cancelar – ID inexistente retorna 404", async ({
    request,
  }) => {
    const token = await loginUser(request);
    const res = await request.patch(
      `${BASE_URL}/reservas/000000000000000000000000/cancelar`,
      authHeaders(token),
    );
    expect(res.status()).toBe(404);
  });
});

// ══════════════════════════════════════════════
// SUITE: NOTIFICACIONES
// ══════════════════════════════════════════════
test.describe("NOTIFICACIONES – /api/v1/notificaciones", () => {
  test("GET / – lista notificaciones del usuario autenticado", async ({
    request,
  }) => {
    const token = await loginUser(request);
    const res = await request.get(
      `${BASE_URL}/notificaciones`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("datos");
  });

  test("GET /?solo_no_leidas=true – filtra no leídas", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.get(
      `${BASE_URL}/notificaciones?solo_no_leidas=true`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    json.datos.forEach(
      /** @param {{ leida: boolean }} n */
      (n) => expect(n.leida).toBeFalsy(),
    );
  });

  test("PATCH /:id/leida – marca notificación como leída", async ({
    request,
  }) => {
    const token = await loginUser(request);
    const res = await request.patch(
      `${BASE_URL}/notificaciones/${NOTI_ID_VALIDO}/leida`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("leída");
  });

  test("PATCH /:id/leida – ID inexistente retorna 404", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.patch(
      `${BASE_URL}/notificaciones/000000000000000000000000/leida`,
      authHeaders(token),
    );
    expect(res.status()).toBe(404);
  });

  test("PATCH /todas/leidas – marca todas como leídas", async ({ request }) => {
    const token = await loginUser(request);
    const res = await request.patch(
      `${BASE_URL}/notificaciones/todas/leidas`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("Todas");
  });
});

// ══════════════════════════════════════════════
// SUITE: REPORTES
// ══════════════════════════════════════════════
test.describe("REPORTES – /api/v1/reportes", () => {
  test("POST / – genera reporte de estadísticas generales", async ({
    request,
  }) => {
    const token = await loginAdministrativo(request);

    const res = await request.post(`${BASE_URL}/reportes`, {
      data: {
        tipoReporte: "Estadisticas_Generales",
        formato: "JSON",
      },
      ...authHeaders(token),
    });

    expect(res.status()).toBe(201);

    const json = await res.json();

    expect(json).toHaveProperty("id");
    expect(json).toHaveProperty("datos");
    expect(json.tipoReporte).toBe("Estadisticas_Generales");
  });

  test("POST / – genera reporte de uso de espacios", async ({ request }) => {
    const token = await loginAdministrativo(request);
    
    const res = await request.post(`${BASE_URL}/reportes`, {
      data: {
        tipoReporte: "Uso_Espacios",
        formato: "JSON",
      },
      ...authHeaders(token),
    });
  
    expect(res.status()).toBe(201);
  
    const json = await res.json();
  
    expect(json.tipoReporte).toBe("Uso_Espacios");
  });

  test("GET / – lista historial de reportes", async ({ request }) => {
    const token = await loginAdministrativo(request);
    const res = await request.get(`${BASE_URL}/reportes`, authHeaders(token));
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("datos");
  });

  test("GET /heatmap – retorna datos del heatmap mensual", async ({
    request,
  }) => {
    const token = await loginAdministrativo(request);
    const res = await request.get(
      `${BASE_URL}/reportes/heatmap`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBeTruthy();
  });

  test("GET /tendencia – retorna tendencia de últimos 6 meses", async ({
    request,
  }) => {
    const token = await loginAdministrativo(request);
    const res = await request.get(
      `${BASE_URL}/reportes/tendencia`,
      authHeaders(token),
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBeTruthy();
    json.forEach(
      /** @param {{ mes: string, aprobadas: number }} item */
      (item) => {
        expect(item).toHaveProperty("mes");
        expect(item).toHaveProperty("aprobadas");
      },
    );
  });

  test("GET /heatmap – sin token retorna 401/403", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/reportes/heatmap`);
    expect([401, 403]).toContain(res.status());
  });
});
