/**
 * services/reportesService.js
 * Mapea los endpoints de /api/v1/reportes (reportes.py)
 * Solo accesible por Administrador y Administrativo.
 */
import { api } from "../api/client";

/**
 * POST /reportes
 * Genera un reporte y lo persiste en MongoDB.
 *
 * @param {object} body - ReporteRequest
 *   {
 *     tipoReporte: "Uso_Espacios" | "Reservas_Usuario" | "Estadisticas_Generales" | "Mantenimiento",
 *     formato:     "JSON" | "CSV" | "PDF",
 *     fecha_inicio?: "YYYY-MM-DD",
 *     fecha_fin?:    "YYYY-MM-DD",
 *     espacio_id?:   string,
 *     usuario_id?:   string,
 *   }
 * @returns ReporteResponse
 */
export async function generarReporte(body) {
  return api.post("/reportes", { body });
}

/**
 * GET /reportes
 * Historial de reportes generados, paginado.
 * @param {object} params - { pagina, por_pagina }
 */
export async function listarReportes(params = {}) {
  return api.get("/reportes", { params });
}

/**
 * GET /reportes/heatmap
 * Obtiene el heatmap de reservas del mes actual.
 */
export async function obtenerHeatmapReportes() {
  return api.get("/reportes/heatmap");
}

/**
 * GET /reportes/tendencia
 * Obtiene la tendencia de reservas de los últimos 6 meses.
 */
export async function obtenerTendenciaReportes() {
  return api.get("/reportes/tendencia");
}