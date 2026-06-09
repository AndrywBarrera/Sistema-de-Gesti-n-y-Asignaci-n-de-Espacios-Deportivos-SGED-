/**
 * utils/formatHora.js
 *
 * Helpers de PRESENTACIÓN de horas. Convierten el formato interno de 24 h
 * ("18:00") al formato colombiano de 12 h ("6:00 p. m.") SOLO para mostrar
 * al usuario.
 *
 * IMPORTANTE: estas funciones NO deben usarse para construir los datos que se
 * envían al backend. Los valores que viajan a la API siguen siendo strings
 * "HH:MM" en 24 h, sin modificar. Aquí solo formateamos texto para la vista.
 */

/**
 * "18:00" → "6:00 p. m."
 * "00:00" → "12:00 a. m."
 * "12:00" → "12:00 m." (mediodía)  [opcional, ver abajo]
 *
 * Acepta también "18" (sin minutos) y lo trata como "18:00".
 * Si el valor no es una hora válida, lo devuelve tal cual (defensivo).
 *
 * @param {string} hora24  hora en formato 24 h ("HH:MM" o "HH")
 * @returns {string} hora en formato colombiano de 12 h
 */
export function formatHora(hora24) {
  if (hora24 == null) return "";
  const str = String(hora24).trim();

  // Separar HH y MM (MM opcional)
  const match = str.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return str; // no es una hora reconocible → no la tocamos

  let h = parseInt(match[1], 10);
  const m = match[2] ?? "00";

  if (isNaN(h) || h < 0 || h > 24) return str;

  // Normalizar 24 → 0 (medianoche del día siguiente)
  if (h === 24) h = 0;

  const sufijo = h < 12 ? "a. m." : "p. m.";

  // Convertir a 12 h: 0 → 12, 13..23 → 1..11
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;

  return `${h12}:${m} ${sufijo}`;
}

/**
 * Formatea un rango de horas: ("08:00", "10:00") → "8:00 a. m. – 10:00 a. m."
 *
 * @param {string} inicio24  hora inicio en 24 h
 * @param {string} fin24     hora fin en 24 h
 * @param {string} [sep]     separador (por defecto " – ")
 * @returns {string}
 */
export function formatRangoHora(inicio24, fin24, sep = " – ") {
  return `${formatHora(inicio24)}${sep}${formatHora(fin24)}`;
}
