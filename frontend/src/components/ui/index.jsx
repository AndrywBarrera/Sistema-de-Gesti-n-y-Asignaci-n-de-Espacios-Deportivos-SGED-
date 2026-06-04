import { useEffect } from "react";
import { useNotif } from "../../context/NotifContext";

/* ─── BUTTON ─────────────────────────────────────────────────────────────── */
const VARIANT_CLASSES = {
  primary:   "btn--primary",
  secondary: "btn--secondary",
  success:   "btn--success",
  danger:    "btn--danger",
  ghost:     "btn--ghost",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  full = false,
  disabled = false,
  onClick,
  type = "button",
  icon,
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "btn",
        VARIANT_CLASSES[variant] ?? "btn--primary",
        size === "sm" ? "btn--sm" : size === "lg" ? "btn--lg" : "",
        full ? "btn--full" : "",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </button>
  );
}

/* ─── ICON BUTTON ────────────────────────────────────────────────────────── */
export function IconBtn({ children, onClick, title, active = false }) {
  return (
    <button
      className={`icon-btn ${active ? "icon-btn--active" : ""}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

/* ─── BADGE / STATUS ─────────────────────────────────────────────────────── */
const BADGE_VARIANTS = {
  Pendiente:      "badge--warning",
  Aprobada:       "badge--success",
  Rechazada:      "badge--danger",
  Cancelada:      "badge--muted",
  Disponible:     "badge--success",
  Mantenimiento:  "badge--muted",
  Ocupado:        "badge--danger",
  Confirmacion:   "badge--success",
  Rechazo:        "badge--danger",
  Recordatorio:   "badge--warning",
  Sistema:        "badge--info",
};

export function Badge({ label, variant }) {
  const cls = BADGE_VARIANTS[variant ?? label] ?? "badge--info";
  return <span className={`badge ${cls}`}>{label}</span>;
}

/* ─── CARD ───────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  accent,
  onClick,
  style
}) {
  return (
    <div
      className={`card ${className} ${onClick ? "card--clickable" : ""}`}
      onClick={onClick}
      style={{
        ...(accent ? { "--card-accent": accent } : {}),
        ...style
      }}
    >
      {accent && <div className="card__accent" />}
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <div className="card__title">{children}</div>;
}

/* ─── FORM CONTROLS ──────────────────────────────────────────────────────── */
export function FormGroup({ label, children, required }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span style={{ color: "var(--rojo)", marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

export function Input({ ...props }) {
  return <input className="form-input" {...props} />;
}

export function Textarea({ ...props }) {
  return <textarea className="form-textarea" {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className="form-select" {...props}>
      {children}
    </select>
  );
}

/* ─── DIVIDER ────────────────────────────────────────────────────────────── */
export function Divider() {
  return <div className="divider" />;
}

/* ─── EMPTY STATE ────────────────────────────────────────────────────────── */
export function EmptyState({ icon = "📭", title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__title">{title}</div>
      {description && <div className="empty-state__desc">{description}</div>}
    </div>
  );
}

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
export function StatCard({ label, value, sub, color = "azul" }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}

/* ─── TOAST ──────────────────────────────────────────────────────────────── */
export function Toast() {
  const { toast } = useNotif();
  if (!toast) return null;
  return (
    <div className={`toast toast--${toast.variant ?? "success"}`}>
      {toast.msg}
    </div>
  );
}

/* ─── MODAL OVERLAY ──────────────────────────────────────────────────────── */
export function ModalOverlay({ children, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target.classList.contains("modal-overlay")) onClose?.(); }}
    >
      {children}
    </div>
  );
}

/* ─── TABLE ──────────────────────────────────────────────────────────────── */
export function Table({ headers, children }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
