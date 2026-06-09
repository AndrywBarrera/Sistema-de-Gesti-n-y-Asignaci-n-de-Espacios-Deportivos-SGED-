import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useReservas } from "../context/ReservasContext";
import { useNotif } from "../context/NotifContext";
import { StatCard, Card, CardTitle, Badge } from "../components/ui/index";
import { formatHora } from "../utils/formatHora";

const ESPACIO_EMOJI = {
  Cancha: "⚽",
  Gimnasio: "💪",
  Piscina: "🏊",
  Pista: "🏃",
  Otro: "🏟️",
};

// Roles que ven notificaciones
const ROLES_NOTIF = ["Estudiante", "Docente", "Empleado"];
// Rol que ve "Mis solicitudes recientes"
const ROL_MIS_SOLIC = ["Estudiante", "Administrativo", "Empleado", "Docente"];

export function DashboardPage({ onNavigate }) {
  const [reservas, setReservas] = useState([]);
  const { user, puede, esRol, espacios, cargarEspacios } = useAuth();
  const { solicitudes } = useReservas();
  const { sinLeer } = useNotif();
  useEffect(() => {
    const cargar = async () => {
      try {
        await cargarEspacios();
      } catch (error) {
        console.error("Error cargando espacios:", error);
      }
    };

    cargar();
  }, []);

  const disponibles = espacios.filter((e) => e.estado === "Disponible");
  const misReservas = solicitudes.filter((s) => s.estado === "Aprobada");
  const pendientes = solicitudes.filter((s) => s.estado === "Pendiente");

  const primerNombre = user.nombre.split(" ")[0];
  const puedeVerNotif = ROLES_NOTIF.includes(user.rol);
  const puedeVerMisSolic = esRol(ROL_MIS_SOLIC);

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">
          Bienvenido,{" "}
          <span style={{ color: "var(--accent-text)" }}>{primerNombre}</span>
        </h1>
        <p className="page-sub">
          {new Date().toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* STATS */}
      <div className="stat-grid">
        <StatCard
          label="Espacios disponibles"
          value={disponibles.length}
          sub={`de ${espacios.length} totales`}
          color="azul"
        />
        {puede("puedeReservar") && (
          <>
            <StatCard
              label="Mis reservas activas"
              value={misReservas.length}
              sub="Aprobadas"
              color="verde"
            />
            <StatCard
              label="Solicitudes pendientes"
              value={pendientes.length}
              sub="Esperando aprobación"
              color="amarillo"
            />
          </>
        )}
        {puede("puedeAprobar") && (
          <StatCard
            label="Pendientes por revisar"
            value={pendientes.length}
            sub="Requieren acción"
            color="amarillo"
          />
        )}
        {/* Notificaciones: solo Estudiante, Docente, Empleado */}
        {puedeVerNotif && (
          <StatCard
            label="Notificaciones"
            value={sinLeer}
            sub="Sin leer"
            color="rojo"
          />
        )}
      </div>

      <div className="dashboard-grid">
        {/* Espacios disponibles hoy — todos los roles */}
        <Card>
          <CardTitle>Espacios disponibles hoy</CardTitle>
          <div className="dashboard-list">
            {disponibles.map((e, i) => (
              <div
                key={e.id}
                className="dashboard-list__row"
                style={{
                  borderBottom:
                    i < disponibles.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <div className="dashboard-list__icon">
                  {ESPACIO_EMOJI[e.tipo] ?? "🏟️"}
                </div>
                <div className="dashboard-list__info">
                  <span className="dashboard-list__name">{e.nombre}</span>
                  <span className="text-sm text-muted">
                    Cap. {e.capacidad} · {formatHora(e.horarioApertura)}–{formatHora(e.horarioCierre)}
                  </span>
                </div>
                <Badge label="Disponible" variant="Disponible" />
              </div>
            ))}
          </div>
          <button
            className="dashboard-link"
            onClick={() => onNavigate("espacios")}
          >
            Ver todos los espacios →
          </button>
        </Card>

        {/* Solicitudes recientes — solo Administrativo */}
        {puedeVerMisSolic && (
          <Card>
            <CardTitle>Mis solicitudes recientes</CardTitle>
            <div className="dashboard-list">
              {[...misReservas, ...pendientes].slice(0, 4).map((s, i, arr) => (
                <div
                  key={s._id}
                  className="dashboard-list__row"
                  style={{
                    borderBottom:
                      i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="dashboard-list__icon">🏟️</div>
                  <div className="dashboard-list__info">
                    <span className="dashboard-list__name">
                      {s.espacioNombre}
                    </span>
                    <span className="text-sm text-muted">
                      {s.fecha} · {formatHora(s.horarioInicio)}–{formatHora(s.horarioFin)}
                    </span>
                  </div>
                  <Badge label={s.estado} variant={s.estado} />
                </div>
              ))}
              {[...misReservas, ...pendientes].length === 0 && (
                <p className="text-muted text-sm" style={{ padding: "12px 0" }}>
                  No tienes solicitudes aún.
                </p>
              )}
            </div>
            <button
              className="dashboard-link"
              onClick={() => onNavigate("calendario")}
            >
              Ir al calendario →
            </button>
          </Card>
        )}

        {/* Solicitudes para aprobar — solo quien tiene puedeAprobar */}
        {puede("puedeAprobar") && (
          <Card>
            <CardTitle>Solicitudes recientes</CardTitle>
            <div className="dashboard-list">
              {solicitudes.slice(0, 4).map((s, i, arr) => (
                <div
                  key={s.id}
                  className="dashboard-list__row"
                  style={{
                    borderBottom:
                      i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="dashboard-list__icon">🏟️</div>
                  <div className="dashboard-list__info">
                    <span className="dashboard-list__name">
                      {s.espacioNombre}
                    </span>
                    <span className="text-sm text-muted">
                      {s.fecha} · {formatHora(s.horarioInicio)}–{formatHora(s.horarioFin)} ·{" "}
                      {s.usuarioNombre}
                    </span>
                  </div>
                  <Badge label={s.estado} variant={s.estado} />
                </div>
              ))}
              {solicitudes.length === 0 && (
                <p className="text-muted text-sm" style={{ padding: "12px 0" }}>
                  No hay solicitudes aún.
                </p>
              )}
            </div>
            <button
              className="dashboard-link"
              onClick={() => onNavigate("solicitudes")}
            >
              Gestionar solicitudes →
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
