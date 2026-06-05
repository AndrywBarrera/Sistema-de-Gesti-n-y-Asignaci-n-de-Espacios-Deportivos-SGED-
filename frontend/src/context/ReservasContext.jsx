/**
 * context/ReservasContext.jsx
 * Estado global de reservas y solicitudes.
 * Conecta con reservasService → /api/v1/reservas
 */
import {
  createContext,
  useEffect,
  useContext,
  useState,
  useCallback,
} from "react";
import * as reservasSvc from "../services/reservasService";
import {
  listarCalendario,
  listarReservas,
  misReservas,
} from "../services/reservasService";
import { useAuth } from "../context/AuthContext";
import { tokenStore } from "../api/client";
const ReservasContext = createContext(null);

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export function ReservasProvider({ children }) {
  // ── Estado local (mock o caché en memoria) ───────────────────────────────
  const [reservas, setReservas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [pendingSlots, setPendingSlots] = useState({});
  const { user } = useAuth();
  const esAdministrativo = user?.rol === "Administrativo";
  const isAdminOrAdmiv =
    user?.rol === "Administrativo" || user?.rol === "Administrador";
  const cargarCalendario = async () => {
    const data = await listarCalendario();
    setReservas(data);
  };
  const cargarSolicitudes = async () => {
    const data = await listarReservas();
    setSolicitudes(data);
  };
  const cargarMisSolicitudes = async () => {
    const data = await misReservas();
    setSolicitudes(data);
  };

  useEffect(() => {
    if (!tokenStore.access) return;

    if (esAdministrativo) {
      cargarSolicitudes();
    } else {
      cargarMisSolicitudes();
    }
  }, [tokenStore.access, esAdministrativo]);

  useEffect(() => {
    if (!tokenStore.access) return;
    cargarCalendario();
  }, [tokenStore.access]);
  // ── Helpers ───────────────────────────────────────────────────────────────
  const getOcupados = useCallback(
    (dateStr, espacioId) => {
      const reserva = reservas?.calendario?.find((r) => r.fecha === dateStr);
      return reserva?.espacios?.[espacioId] ?? [];
    },
    [reservas],
  );
  const getPendientes = useCallback(
    (dateStr, espacioId) => {
      if (!user || isAdminOrAdmiv) return [];

      const pendientesLocales = pendingSlots?.[dateStr]?.[espacioId] ?? [];
      const pendientesBackend = solicitudes
        .filter(
          (r) =>
            r.fecha === dateStr &&
            r.espacioId === espacioId &&
            r.estado === "Pendiente",
        )
        .flatMap((r) => r.horarios_elegidos);

      // unir y quitar repetidos
      return [...new Set([...pendientesLocales, ...pendientesBackend])];
    },
    [pendingSlots, solicitudes, isAdminOrAdmiv, user],
  );

  const setLoading = (id, val) =>
    setLoadingIds((prev) => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });

  // ── Crear reserva — POST /reservas ────────────────────────────────────────
  /**
   * @param {object} params
   *   { usuario, espacioId, espacioNombre, fecha, horarios[], motivo, participantes }
   */
  const enviarSolicitud = useCallback(async (params) => {
    const {
      usuario,
      espacioId,
      espacioNombre,
      fecha,
      horarios,
      motivo,
      participantes,
    } = params;
    const horasOrdenadas = [...horarios].sort();
    const horarioFin = `${String(parseInt(horasOrdenadas[horasOrdenadas.length - 1]) + 1).padStart(2, "0")}:00`;

    const body = {
      espacioId,
      fecha,
      horarioInicio: horasOrdenadas[0],
      horarioFin,
      horarios_elegidos: horasOrdenadas,
      motivoReserva: motivo,
      numeroParticipantes: parseInt(participantes) || 1,
    };

    // ── API real ─────────────────────────────────────────────────────────────
    const nueva = await reservasSvc.crearReserva(body);

    setPendingSlots((prev) => ({
      ...prev,
      [fecha]: {
        ...prev[fecha],
        [espacioId]: [...(prev[fecha]?.[espacioId] ?? []), ...horasOrdenadas],
      },
    }));

    setSolicitudes((prev) => [
      {
        id: nueva.id,
        usuarioNombre: usuario.nombre,
        usuarioRol: usuario.rol,
        usuarioCorreo: usuario.correo,
        espacioId: nueva.espacioId,
        espacioNombre,
        fecha: nueva.fecha,
        horarioInicio: nueva.horarioInicio,
        horarioFin: nueva.horarioFin,
        motivoReserva: nueva.motivoReserva,
        numeroParticipantes: nueva.numeroParticipantes,
        estado: nueva.estado,
        fechaSolicitud: nueva.fechaSolicitud,
        justificacion: null,
        horarios_elegidos: horasOrdenadas,
      },
      ...prev,
    ]);
    return nueva;
  }, []);

  // ── Aprobar reserva — PATCH /reservas/:id/gestion ────────────────────────
  const aprobarSolicitud = useCallback(
    async (solicitudId) => {
      setLoading(solicitudId, true);
      try {
        if (!USE_MOCK) {
          await reservasSvc.gestionarReserva(solicitudId, "aprobar", null);
        } else {
          await new Promise((r) => setTimeout(r, 400));
        }

        setSolicitudes((prev) =>
          prev.map((s) => {
            if (s.id !== solicitudId) return s;
            // RF10: rechaza automáticamente otros pendientes en mismo slot
            return { ...s, estado: "Aprobada" };
          }),
        );

        // Mover de pending a confirmado en el mapa local
        const sol = solicitudes.find((s) => s.id === solicitudId);
        if (sol) {
          setReservas((prev) => ({
            ...prev,
            [sol.fecha]: {
              ...prev[sol.fecha],
              [sol.espacioId]: [
                ...(prev[sol.fecha]?.[sol.espacioId] ?? []),
                sol.horarioInicio,
              ],
            },
          }));
        }
      } finally {
        setLoading(solicitudId, false);
      }
    },
    [solicitudes],
  );

  // ── Rechazar reserva — PATCH /reservas/:id/gestion ───────────────────────
  // justificacion OBLIGATORIA (RF09)
  const rechazarSolicitud = useCallback(async (solicitudId, justificacion) => {
    setLoading(solicitudId, true);
    try {
      if (!USE_MOCK) {
        await reservasSvc.gestionarReserva(
          solicitudId,
          "rechazar",
          justificacion,
        );
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }

      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === solicitudId
            ? { ...s, estado: "Rechazada", justificacion }
            : s,
        ),
      );
    } finally {
      setLoading(solicitudId, false);
    }
  }, []);

  function cancelarSolicitud({ fecha, espacioId, horasEliminar }) {
    // Eliminar horas del pendingSlots
    setPendingSlots((prev) => {
      const horasActuales = prev[fecha]?.[espacioId] ?? [];

      const nuevasHoras = horasActuales.filter(
        (hora) => !horasEliminar.includes(hora),
      );

      const nuevoEstado = {
        ...prev,
        [fecha]: {
          ...prev[fecha],
          [espacioId]: nuevasHoras,
        },
      };

      // Limpiar espacio vacío
      if (nuevasHoras.length === 0) {
        delete nuevoEstado[fecha][espacioId];
      }

      // Limpiar fecha vacía
      if (Object.keys(nuevoEstado[fecha]).length === 0) {
        delete nuevoEstado[fecha];
      }

      return nuevoEstado;
    });
  }

  // ── Cancelar reserva — PATCH /reservas/:id/cancelar ──────────────────────
  const cancelarReserva = useCallback(async (solicitudId, espacioId, fecha, horarios_elegidos) => {
    setLoading(solicitudId, true);
    try {
      if (!USE_MOCK) {
        await reservasSvc.cancelarReserva(solicitudId);
      } 

      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === solicitudId ? { ...s, estado: "Cancelada" } : s,
        ),
      );

      cancelarSolicitud({ fecha, espacioId, horasEliminar: horarios_elegidos });
    } finally {
      setLoading(solicitudId, false);
    }
  }, []);

  // ── Recargar solicitudes desde API ────────────────────────────────────────
  const recargarSolicitudes = useCallback(
    async (params = {}) => {
      if (esAdministrativo) {
        cargarSolicitudes();
      } else {
        cargarMisSolicitudes();
      }
      cargarCalendario();
    },
    [esAdministrativo],
  );

  return (
    <ReservasContext.Provider
      value={{
        reservas,
        solicitudes,
        loadingIds,
        getOcupados,
        getPendientes,
        enviarSolicitud,
        aprobarSolicitud,
        rechazarSolicitud,
        cancelarReserva,
        recargarSolicitudes,
      }}
    >
      {children}
    </ReservasContext.Provider>
  );
}

export function useReservas() {
  const ctx = useContext(ReservasContext);
  if (!ctx)
    throw new Error("useReservas debe usarse dentro de ReservasProvider");
  return ctx;
}
