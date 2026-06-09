/**
 * pages/NotificacionesPage.jsx
 * RF13: Panel de notificaciones del usuario autenticado.
 * Conecta con NotifContext → notificacionesService → /api/v1/notificaciones
 */
import { useEffect } from "react";
import { useNotif } from "../context/NotifContext";
import { Badge, Button, EmptyState } from "../components/ui/index";
import { Icon } from "../components/ui/Icons";

const TIPO_ICON = {
  Confirmacion: "✅",
  Rechazo: "❌",
  Recordatorio: "⏰",
  Sistema: "ℹ️",
  Cancelacion: "🚫",
};

function NotifItem({ notif, onMarcarLeida }) {
  return (
    <div
      className={`notif-item ${!notif.leida ? "notif-item--unread" : ""} animate-slideIn`}
    >
      <div className="notif-item__icon">{TIPO_ICON[notif.tipo] ?? "📬"}</div>

      <div className="notif-item__body">
        <p className="notif-item__msg">{notif.mensaje}</p>
        <div className="notif-item__meta">
          <span className="text-xs text-muted">
            {new Date(notif.fechaEnvio).toLocaleString("es-CO", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <span className="text-xs text-muted">· Canal: {notif.canal}</span>
          {!notif.leida && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
                marginLeft: 4,
              }}
            />
          )}
        </div>
      </div>

      <div className="notif-item__right">
        <Badge label={notif.tipo} variant={notif.tipo} />
        {!notif.leida && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarcarLeida(notif._id)}
          >
            Leído
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificacionesPage() {
  const {
    notificaciones,
    sinLeer,
    loadingNotifs,
    marcarLeida,
    marcarTodasLeidas,
    cargarNotificaciones,
  } = useNotif();

  // Recargar todas las notificaciones automáticamente al abrir el panel,
  // sin que el usuario tenga que pulsar "Actualizar".
  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  return (
    <div className="page animate-fadeIn">
      <div className="notify-header">
        <div className="notify-header__info">
          <h1 className="page-title">
            Notificaciones
            {sinLeer > 0 && (
              <span
                style={{
                  color: "var(--accent-text)",
                  fontSize: 20,
                  marginLeft: 8,
                }}
              >
                ({sinLeer})
              </span>
            )}
          </h1>

          <p className="page-sub">
            Alertas y mensajes del sistema sobre tus reservas (RF13)
          </p>
        </div>
      </div>

      {/* Tabs sin leer / todas */}
      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        <span
          className={`filter-tab ${sinLeer === 0 ? "" : "filter-tab--active"}`}
        >
          Sin leer ({sinLeer})
        </span>
        <span className="filter-tab">Total ({notificaciones.length})</span>
        <div className="notify-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => cargarNotificaciones()}
            disabled={loadingNotifs}
            icon={<Icon name="check" size={13} />}
          >
            {loadingNotifs ? "Cargando…" : "Actualizar"}
          </Button>

          {sinLeer > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={marcarTodasLeidas}
              icon={<Icon name="check" size={13} />}
            >
              Marcar todas leídas
            </Button>
          )}
        </div>
      </div>

      {notificaciones.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Sin notificaciones"
          description="Cuando haya cambios en tus reservas o mensajes del sistema, aparecerán aquí."
        />
      ) : (
        <div className="notif-list">
          {notificaciones.map((n) => (
            <NotifItem key={n._id} notif={n} onMarcarLeida={marcarLeida} />
          ))}
        </div>
      )}
    </div>
  );
}
