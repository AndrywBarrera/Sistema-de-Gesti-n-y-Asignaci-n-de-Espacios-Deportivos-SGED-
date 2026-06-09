/**
 * context/NotifContext.jsx
 * Estado global de notificaciones.
 * Conecta con notificacionesService → /api/v1/notificaciones
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import * as notifSvc from "../services/notificacionesService";
import { tokenStore } from "../api/client";

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [toast, setToast] = useState(null);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  // ── Cargar desde API al montar ────────────────────────────────────────────
  const cargarNotificaciones = useCallback(async (params = {}) => {
    if (!tokenStore.access) return;
    setLoadingNotifs(true);
    try {
      const resp = await notifSvc.listarNotificaciones(params);
      if (resp?.datos) {
        setNotificaciones(
          resp.datos.map((n) => ({
            _id: n.id,
            tipo: n.tipo,
            mensaje: n.mensaje,
            fechaEnvio: n.fechaEnvio,
            leida: n.leida,
            canal: n.canal,
            reservaId: n.reservaId ?? null,
          })),
        );
      }
    } catch {
      // Silencioso: el badge quedará en 0 si falla
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  // Cargar al montar el provider (cuando hay usuario autenticado)
  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  // ── Marcar una como leída — PATCH /notificaciones/:id/leida ──────────────
  const marcarLeida = useCallback(async (id) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n._id === id ? { ...n, leida: true } : n)),
    );
    await notifSvc.marcarLeida(id).catch(() => {}); // fire-and-forget
  }, []);

  // ── Marcar todas — PATCH /notificaciones/todas/leidas ────────────────────
  const marcarTodasLeidas = useCallback(async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    await notifSvc.marcarTodasLeidas().catch(() => {});
  }, []);

  // ── Agregar notificación local (del sistema, sin API) ─────────────────────
  const agregar = useCallback(async () => {
    await cargarNotificaciones();
  }, [cargarNotificaciones]);

  // ── Toast flotante ────────────────────────────────────────────────────────
  const showToast = useCallback((msg, variant = "success") => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <NotifContext.Provider
      value={{
        notificaciones,
        sinLeer,
        loadingNotifs,
        marcarLeida,
        marcarTodasLeidas,
        agregar,
        cargarNotificaciones,
        toast,
        showToast,
      }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotif debe usarse dentro de NotifProvider");
  return ctx;
}
