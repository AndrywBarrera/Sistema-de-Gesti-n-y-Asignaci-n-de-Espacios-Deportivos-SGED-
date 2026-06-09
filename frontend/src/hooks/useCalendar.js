import { useMemo, useCallback } from "react";
import { useReservas } from "../context/ReservasContext";

/**
 * Hook de lógica de calendario.
 * Encapsula: estado del día, horarios disponibles/ocupados/pendientes.
 * Usado por CalendarioPage y CalendarGrid.
 */
export function useCalendar(año, mes, espacioId, espacio) {
  const { getOcupados, getPendientes } = useReservas();
  const HORARIOS_BASE = [
    "05:00",
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ];

  const diasEnMes = useMemo(
    () => new Date(año, mes + 1, 0).getDate(),
    [año, mes],
  );

  const primerDia = useMemo(() => new Date(año, mes, 1).getDay(), [año, mes]);

  const formatDate = useCallback(
    (d) =>
      `${año}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    [año, mes],
  );

  /**
   * Estado de un día: "disponible" | "parcial" | "ocupado" | "mantenimiento" | "pasado" | "noDisponible"
   */
  const getDayStatus = useCallback(
    (d) => {
      if (!espacio) return "disponible";

      const date = new Date(año, mes, d);
      const today = new Date();
      today.setDate(today.getDate() - 1);
      if (date < today) return "pasado";
      if (date.getDay() === 0) return "noDisponible";

      if (espacio.estado === "Mantenimiento") return "mantenimiento";

      const dateStr = formatDate(d);
      const ocupados = getOcupados(dateStr, espacioId);

      const horariosDelEspacio = HORARIOS_BASE.filter(
        (h) => h >= espacio.horarioApertura && h < espacio.horarioCierre,
      );
      const total = horariosDelEspacio.length;

      if (ocupados.length === 0) return "disponible";
      if (ocupados.length >= total) return "ocupado";
      return "parcial";
    },
    [año, mes, espacio, espacioId, formatDate, getOcupados],
  );

  /**
   * Slots detallados para el modal de un día (RF04)
   */
  const getSlotsDelDia = useCallback(
    (d) => {
      if (!espacio || !d) return [];
      const dateStr = formatDate(d);
      const ocupados = getOcupados(dateStr, espacioId);
      const pendientes = getPendientes(dateStr, espacioId);

      const todayBlockHore = new Date();

      let horariosDisponibles = HORARIOS_BASE;
      if (dateStr === formatDate(todayBlockHore.getDate())) {
        const horaActual = `${String(todayBlockHore.getHours()).padStart(2, "0")}:00`;
        horariosDisponibles = HORARIOS_BASE.filter((h) => h > horaActual);
      }

      return horariosDisponibles.filter(
        (h) => h >= espacio.horarioApertura && h < espacio.horarioCierre,
      ).map((h) => {
        let estado = "libre";
        if (ocupados.includes(h)) estado = "ocupado";
        else if (pendientes.includes(h)) estado = "pendiente";
        return { hora: h, estado };
      });
    },
    [espacio, espacioId, formatDate, getOcupados, getPendientes],
  );

  return { diasEnMes, primerDia, formatDate, getDayStatus, getSlotsDelDia };
}
