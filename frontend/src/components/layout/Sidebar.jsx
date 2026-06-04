import { useState } from "react";
import { Icon } from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useNotif } from "../../context/NotifContext";

const ALL_NAV = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: "home",
    roles: [
      "Estudiante",
      "Docente",
      "Empleado",
      "Administrativo",
      "Administrador",
    ],
  },
  {
    id: "calendario",
    label: "Calendario",
    icon: "calendar",
    roles: ["Estudiante", "Docente", "Empleado", "Administrativo"],
  },
  {
    id: "espacios",
    label: "Espacios",
    icon: "building",
    roles: [
      "Estudiante",
      "Docente",
      "Empleado",
      "Administrativo",
      "Administrador",
    ],
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    icon: "bell",
    roles: ["Estudiante", "Docente", "Empleado"],
  },
  {
    id: "solicitudes",
    label: "Solicitudes",
    icon: "clipboard",
    roles: ["Administrativo"],
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: "chart",
    roles: ["Administrativo"],
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: "users",
    roles: ["Administrador"],
  },
];

export function Sidebar({ activePage, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const { user, logout } = useAuth();
  const { sinLeer } = useNotif();

  // RF01 / RF15: filtrar nav según rol
  const navItems = ALL_NAV.filter((n) => n.roles.includes(user?.rol));

  const badgeCount = (id) => {
    if (id === "notificaciones") return sinLeer > 0 ? sinLeer : null;
    return null;
  };

  return (
    <aside
      className={`sidebar ${expanded ? "sidebar--expanded" : ""}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* LOGO */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">S</div>
        {expanded && (
          <div className="sidebar__logo-text">
            <span className="sidebar__logo-name">SGED</span>
            <span className="sidebar__logo-sub">UPTC · Deportes</span>
          </div>
        )}
      </div>

      {/* NAV ITEMS */}
      <nav className="sidebar__nav">
        {navItems.map((item) => {
          const count = badgeCount(item.id);
          return (
            <button
              key={item.id}
              className={`sidebar__item ${activePage === item.id ? "sidebar__item--active" : ""}`}
              onClick={() => onNavigate(item.id)}
              title={!expanded ? item.label : undefined}
            >
              <span className="sidebar__item-icon">
                <Icon name={item.icon} size={20} />
              </span>
              {expanded && (
                <span className="sidebar__item-label">{item.label}</span>
              )}
              {count != null && (
                <span
                  className={`sidebar__badge ${expanded ? "" : "sidebar__badge--dot"}`}
                >
                  {expanded ? count : ""}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <button
        className="sidebar__logout"
        onClick={async () => {
          await logout(); 
          onNavigate("dashboard"); 
        }}
        title="Cerrar sesión"
      >
        <Icon name="logout" size={18} />
        {expanded && <span>Cerrar sesión</span>}
      </button>
    </aside>
  );
}
