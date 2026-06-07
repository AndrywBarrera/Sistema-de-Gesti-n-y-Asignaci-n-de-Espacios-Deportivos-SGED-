import { useState, useEffect } from "react";
import { MESES } from "../data/mockData";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { DayModal } from "../components/calendar/DayModal";
import { IconBtn } from "../components/ui/index";
import { Icon } from "../components/ui/Icons";
import { useAuth } from "../context/AuthContext";
import { useReservas } from "../context/ReservasContext";
import { useNotif } from "../context/NotifContext";
import { CustomSelect } from "../components/ui/CustomSelect";

const TODAY = new Date();

const TIPO_EMOJI = {
  Cancha: "⚽",
  Gimnasio: "💪",
  Piscina: "🏊",
  Pista: "🏃",
  Otro: "🏟️",
};

const ESTADO_COLOR = {
  Pendiente: { bg: "var(--ama-lo)", color: "var(--amarillo)" },
  Aprobada: { bg: "var(--verde-lo)", color: "var(--verde)" },
  Rechazada: { bg: "var(--rojo-lo)", color: "var(--rojo)" },
  Cancelada: { bg: "var(--surface3)", color: "var(--text3)" },
};

/* ── Modal confirmar cancelación ─────────────────────────────────────────── */
function CancelarModal({ reserva, onConfirm, onClose, loading }) {
  if (!reserva) return null;
  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div
        className="modal-box modal-box--sm animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title font-syne">Cancelar reserva</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            ¿Cancelar la reserva de{" "}
            <strong style={{ color: "var(--text)" }}>
              {reserva.espacio_nombre ?? reserva.espacioNombre}
            </strong>{" "}
            el <strong style={{ color: "var(--text)" }}>{reserva.fecha}</strong>{" "}
            de {reserva.horarioInicio} a {reserva.horarioFin}?
          </p>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Volver
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Cancelando…" : "Sí, cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ PÁGINA ═══ */
export function CalendarioPage() {
  const [año, setAño] = useState(TODAY.getFullYear());
  const [mes, setMes] = useState(TODAY.getMonth());
  const [espacioId, setEspacioId] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [recargando, setRecargando] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const { espacios, cargarEspacios, user } = useAuth();
  const { solicitudes, recargarSolicitudes, cancelarReserva } = useReservas();
  const { showToast } = useNotif();
  
  const rol = user?.rol;

  useEffect(() => {
    const cargar = async () => {
      try {
        await cargarEspacios();
      } catch (error) {
        console.error("Error cargando espacios:", error);
      }
    };
    setEspacioId(espacios[0]?.id || "");
    cargar();
  }, []);

  const espacio = espacios.find((e) => e.id === espacioId);

  const espacioOpts = espacios.map((e) => ({
    value: e.id,
    label: `${e.nombre} — ${e.tipo}`,
    emoji: TIPO_EMOJI[e.tipo] ?? "🏟️",
  }));

  // Reservas propias activas (Pendiente o Aprobada)
  const misReservasActivas = solicitudes.filter(
    (s) => s.estado === "Pendiente" || s.estado === "Aprobada",
  );

  const navMes = (dir) => {
    let nm = mes + dir,
      na = año;
    if (nm < 0) {
      nm = 11;
      na--;
    } else if (nm > 11) {
      nm = 0;
      na++;
    }
    setMes(nm);
    setAño(na);
    setSelectedDay(null);
  };

  const handleRecargar = async () => {
    setRecargando(true);
    try {
      await recargarSolicitudes();
      showToast("✓ Calendario actualizado.");
    } catch {
      showToast("Error al recargar.");
    } finally {
      setRecargando(false);
    }
  };

  const handleCancelar = async () => {
    if (!cancelTarget) return;
    setCancelando(true);
    try {
      await cancelarReserva(
        cancelTarget.id,
        cancelTarget.espacioId,
        cancelTarget.fecha,
        cancelTarget.horarios_elegidos,
      );
      showToast("Reserva cancelada correctamente.");
      setCancelTarget(null);
    } catch {
      showToast("Error al cancelar la reserva.");
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Calendario de{" "}
            <span style={{ color: "var(--accent)" }}>Reservas</span>
          </h1>
          <p className="page-sub">
            Visualiza disponibilidad y solicita reservas. Haz clic en un día
            disponible.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleRecargar}
          disabled={recargando}
        >
          {recargando ? "Actualizando…" : "↻ Recargar"}
        </button>
      </div>

      <div className="card cal-card">
        {/* CONTROLES */}
        <div className="cal-controls">
          <div className="cal-nav">
            <IconBtn onClick={() => navMes(-1)} title="Mes anterior">
              <Icon name="chevronLeft" size={16} />
            </IconBtn>
            <span className="cal-nav__month">
              {MESES[mes]} {año}
            </span>
            <IconBtn onClick={() => navMes(1)} title="Mes siguiente">
              <Icon name="chevronRight" size={16} />
            </IconBtn>
          </div>

          <div style={{ minWidth: 240 }}>
            <CustomSelect
              name="espacioId"
              value={espacioId}
              onChange={(e) => {
                setEspacioId(e.target.value);
                setSelectedDay(null);
              }}
              options={espacioOpts}
              placeholder="Seleccionar espacio…"
            />
          </div>

          {espacio && (
            <div className="cal-espacio-info">
              <span
                className="badge"
                style={{
                  background:
                    espacio.estado === "Mantenimiento"
                      ? "var(--surface3)"
                      : "var(--verde-lo)",
                  color:
                    espacio.estado === "Mantenimiento"
                      ? "var(--text3)"
                      : "var(--verde)",
                }}
              >
                {espacio.estado}
              </span>
              <span className="text-sm text-muted">
                Cap. {espacio.capacidad} · {espacio.horarioApertura}–
                {espacio.horarioCierre}
              </span>
            </div>
          )}
        </div>

        {espacio?.estado === "Mantenimiento" && (
          <div className="cal-maint-banner">
            <Icon name="alertCircle" size={16} />
            Este espacio está en mantenimiento y no admite reservas en este
            período.
          </div>
        )}

        <CalendarGrid
          año={año}
          mes={mes}
          espacioId={espacioId}
          espacio={espacio}
          selectedDay={selectedDay}
          onDayClick={setSelectedDay}
        />
      </div>

      {/* MIS RESERVAS ACTIVAS */}
      {rol !== "Administrativo" &&
        rol !== "Administrador" &&
        misReservasActivas.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <h3 className="card__title" style={{ marginBottom: 0 }}>
                Mis reservas activas
              </h3>
              <span className="text-xs text-muted">
                {misReservasActivas.length} reserva
                {misReservasActivas.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="cal-reservas-list">
              {misReservasActivas.map((s) => {
                const ec = ESTADO_COLOR[s.estado] ?? ESTADO_COLOR.Cancelada;
                return (
                  <div key={s.id} className="cal-reserva-row">
                    <div className="cal-reserva-row__info">
                      <span className="cal-reserva-row__espacio">
                        {TIPO_EMOJI[s.espacioTipo] ?? "🏟️"}{" "}
                        {s.espacio_nombre ?? s.espacioNombre}
                      </span>
                      <span className="text-xs text-muted">
                        📅 {s.fecha} · 🕐 {s.horarioInicio} – {s.horarioFin}
                      </span>
                      {s.motivoReserva && (
                        <span
                          className="text-xs text-muted"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 260,
                          }}
                        >
                          {s.motivoReserva}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: ec.bg,
                          color: ec.color,
                        }}
                      >
                        {s.estado}
                      </span>

                      {s.estado === "Pendiente" && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setCancelTarget(s)}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      {selectedDay && (
        <DayModal
          año={año}
          mes={mes}
          dia={selectedDay}
          espacioId={espacioId}
          espacio={espacio}
          onClose={() => setSelectedDay(null)}
          onSuccess={() => setSelectedDay(null)}
        />
      )}

      <CancelarModal
        reserva={cancelTarget}
        onConfirm={handleCancelar}
        onClose={() => setCancelTarget(null)}
        loading={cancelando}
      />
    </div>
  );
}
