import { useState } from "react";
import { useReservas } from "../context/ReservasContext";
import { useNotif } from "../context/NotifContext";
import { useAuth } from "../context/AuthContext";
import { RejectModal } from "../components/solicitudes/RejectModal";
import { StatCard, Table, Badge, EmptyState } from "../components/ui/index";

const FILTERS = ["Todas", "Pendiente", "Aprobada", "Rechazada"];

/* ── Modal: detalle de horario y motivo ───────────────────────────────────── */
function DetalleModal({ solicitud, onClose }) {
  if (!solicitud) return null;
  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--sm animate-slideUp"
        onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">📋 Detalle de solicitud</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Solicitante + espacio */}
          <div className="detalle-row">
            <span className="detalle-label">Solicitante</span>
            <span className="detalle-value">{solicitud.usuario_nombre}</span>
          </div>
          <div className="detalle-row">
            <span className="detalle-label">Espacio</span>
            <span className="detalle-value">{solicitud.espacio_nombre}</span>
          </div>
          <div className="detalle-row">
            <span className="detalle-label">Fecha</span>
            <span className="detalle-value" style={{ fontFamily: "monospace" }}>{solicitud.fecha}</span>
          </div>

          {/* Horarios — puede ser uno o varios */}
          <div>
            <span className="detalle-label" style={{ display: "block", marginBottom: 6 }}>
              Horario(s)
            </span>
            {Array.isArray(solicitud.horarios) && solicitud.horarios.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {solicitud.horarios.map((h, i) => (
                  <span key={i} className="detalle-chip">
                    🕐 {h}
                  </span>
                ))}
              </div>
            ) : (
              <span className="detalle-chip">
                🕐 {solicitud.horarioInicio} – {solicitud.horarioFin}
              </span>
            )}
          </div>

          {/* Motivo */}
          <div>
            <span className="detalle-label" style={{ display: "block", marginBottom: 6 }}>
              Motivo de reserva
            </span>
            <div className="detalle-motivo">
              {solicitud.motivoReserva ?? "Sin motivo registrado."}
            </div>
          </div>

          {/* Estado */}
          <div className="detalle-row">
            <span className="detalle-label">Estado</span>
            <Badge label={solicitud.estado} variant={solicitud.estado} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: motivo de rechazo (solo lectura) ──────────────────────────────── */
function MotivoModal({ solicitud, onClose }) {
  if (!solicitud) return null;
  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--sm animate-slideUp"
        onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">❌ Motivo de rechazo</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="text-sm text-muted">
            Solicitud de{" "}
            <strong style={{ color: "var(--text)" }}>{solicitud.usuario_nombre}</strong>{" "}
            para{" "}
            <strong style={{ color: "var(--text)" }}>{solicitud.espacio_nombre}</strong>
          </p>
          <div className="detalle-motivo detalle-motivo--rechazo">
            {solicitud.justificacion}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────────────────────── */
export function SolicitudesPage() {
  const { user, puede } = useAuth();
  const { solicitudes, aprobarSolicitud, rechazarSolicitud } = useReservas();
  const { agregar, showToast } = useNotif();

  const [rejectTarget, setRejectTarget] = useState(null);
  const [motivoTarget, setMotivoTarget] = useState(null);
  const [detalleTarget, setDetalleTarget] = useState(null);
  const [filtro, setFiltro]             = useState("Todas");
  const [procesando, setProcesando]     = useState(new Set());

  if (!puede("puedeAprobar")) {
    return (
      <div className="page">
        <EmptyState
          icon="🔒"
          title="Acceso restringido"
          description="Solo los roles Administrativo y Administrador pueden gestionar solicitudes."
        />
      </div>
    );
  }

  const filtradas = filtro === "Todas"
    ? solicitudes
    : solicitudes.filter((s) => s.estado === filtro);

  const setProcesandoId = (id, val) =>
    setProcesando((prev) => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });

  const handleAprobar = async (id) => {
    setProcesandoId(id, true);
    try {
      await aprobarSolicitud(id);
      agregar("Confirmacion", `Una solicitud ha sido aprobada por ${user.nombre}.`);
      showToast("✓ Solicitud aprobada y notificación enviada.");
    } finally {
      setProcesandoId(id, false);
    }
  };

  const handleRechazar = async (id, justificacion) => {
    setProcesandoId(id, true);
    try {
      await rechazarSolicitud(id, justificacion);
      agregar("Rechazo", `Una solicitud fue rechazada. Motivo: ${justificacion}`);
      showToast("Solicitud rechazada. El solicitante fue notificado.");
    } finally {
      setProcesandoId(id, false);
      setRejectTarget(null);
    }
  };

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">
          Gestión de <span style={{ color: "var(--accent)" }}>Solicitudes</span>
        </h1>
        <p className="page-sub">
          Aprueba o rechaza solicitudes de reserva de espacios deportivos (RF08–RF10)
        </p>
      </div>

      <div className="stat-grid">
        <StatCard label="Total"      value={solicitudes.length}                                         color="azul"     />
        <StatCard label="Pendientes" value={solicitudes.filter((s) => s.estado === "Pendiente").length}  color="amarillo" />
        <StatCard label="Aprobadas"  value={solicitudes.filter((s) => s.estado === "Aprobada").length}   color="verde"    />
        <StatCard label="Rechazadas" value={solicitudes.filter((s) => s.estado === "Rechazada").length}  color="rojo"     />
      </div>

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-tab ${filtro === f ? "filter-tab--active" : ""}`}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon="📋" title="Sin solicitudes" description="No hay solicitudes con este filtro." />
      ) : (
        <Table headers={["Solicitante", "Espacio", "Fecha", "Horario / Motivo", "Estado", "Acciones"]}>
          {filtradas.map((s) => {
            const id        = s.id;
            const enProceso = procesando.has(id);

            return (
              <tr key={id} style={{ opacity: enProceso ? 0.6 : 1, transition: "opacity 0.2s" }}>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.usuario_nombre}</div>
                  <div className="text-xs text-muted">{s.usuarioRol} · {s.usuario_correo}</div>
                </td>
                <td>{s.espacio_nombre}</td>
                <td style={{ fontFamily: "monospace" }}>{s.fecha}</td>

                {/* Horario / Motivo — botón ver detalle */}
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDetalleTarget(s)}
                    title="Ver horario y motivo completo"
                  >
                    🕐 {s.horarioInicio}–{s.horarioFin}
                  </button>
                </td>

                <td><Badge label={s.estado} variant={s.estado} /></td>

                <td>
                  {s.estado === "Pendiente" && (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAprobar(id)}
                        disabled={enProceso}
                      >
                        {enProceso ? "…" : "✓ Aprobar"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setRejectTarget(s)}
                        disabled={enProceso}
                      >
                        ✕ Rechazar
                      </button>
                    </div>
                  )}
                  {s.estado === "Aprobada" && (
                    <span className="text-muted text-xs">—</span>
                  )}
                  {s.estado === "Rechazada" && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setMotivoTarget(s)}
                    >
                      Ver motivo
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {rejectTarget && (
        <RejectModal
          solicitud={rejectTarget}
          onConfirm={handleRechazar}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {motivoTarget && (
        <MotivoModal
          solicitud={motivoTarget}
          onClose={() => setMotivoTarget(null)}
        />
      )}

      {detalleTarget && (
        <DetalleModal
          solicitud={detalleTarget}
          onClose={() => setDetalleTarget(null)}
        />
      )}
    </div>
  );
}