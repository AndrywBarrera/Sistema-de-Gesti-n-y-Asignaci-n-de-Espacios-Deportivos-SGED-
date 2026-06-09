import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import * as authService from "../../services/authService";

const PAGE_TITLES = {
  dashboard:      "Inicio",
  calendario:     "Calendario de Reservas",
  espacios:       "Espacios Deportivos",
  notificaciones: "Notificaciones",
  solicitudes:    "Gestión de Solicitudes",
  reportes:       "Reportes y Estadísticas",
  usuarios:       "Gestión de Usuarios",
};

const ROLE_COLORS = {
  Estudiante:     "#b45309",
  Docente:        "var(--verde)",
  Administrativo: "#a16207",
  Empleado:       "var(--text2)",
  Administrador:  "var(--rojo)",
};

/* ── SVG íconos ──────────────────────────────────────────────────────────── */
const IcoEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoEyeOff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

/* ── Input con ojo ──────────────────────────────────────────────────────── */
function PassInput({ value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
      <input
        className="modal-input"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{ paddingRight:36 }}
      />
      <button type="button" tabIndex={-1}
        onClick={() => setShow(v => !v)}
        style={{
          position:"absolute", right:10,
          background:"none", border:"none",
          color:"var(--text3)", cursor:"pointer",
          display:"flex", alignItems:"center",
          padding:"4px", borderRadius:"var(--radius-xs)",
          transition:"color var(--transition)",
        }}
        onMouseEnter={e => e.currentTarget.style.color="var(--text)"}
        onMouseLeave={e => e.currentTarget.style.color="var(--text3)"}
      >
        {show ? <IcoEyeOff /> : <IcoEye />}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════ MODAL PERFIL ═══ */
function PerfilModal({ user, onClose, onUpdate }) {
  // vista: "perfil" | "telefono" | "password"
  const [vista,      setVista]      = useState("perfil");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [exito,      setExito]      = useState("");
  // Teléfono
  const [nuevoTel,   setNuevoTel]   = useState(user?.telefono ?? "");

  // Contraseña
  const [passActual, setPassActual] = useState("");
  const [passNueva,  setPassNueva]  = useState("");
  const [passConf,   setPassConf]   = useState("");

  const resetear = () => {
    setError(""); setExito("");
    setNuevoTel(user?.telefono ?? "");
    setPassActual(""); setPassNueva(""); setPassConf("");
  };

  const irA = (v) => { resetear(); setVista(v); };

  /* Actualizar teléfono */
  const handleTelefono = async () => {

  // Validar teléfono
  if (!nuevoTel.trim()) {
    return setError("Ingresa el nuevo teléfono.");
  }

  setLoading(true);
  setError("");
  setExito("");

  try {

    // Actualizar teléfono
    await authService.cambiarDatosUser({
      telefono: nuevoTel,
    });

    // Actualizar estado local
    onUpdate({ telefono: nuevoTel });

    setExito("✓ Teléfono actualizado correctamente.");

  } catch (err) {

    setError(
      err?.response?.data?.detail ??
      err.message ??
      "Error al actualizar."
    );

  } finally {
    setLoading(false);
  }
};

  /* Actualizar contraseña */
  const handlePassword = async () => {
    if (!passActual.trim()) return setError("Ingresa tu contraseña actual.");
    if (!passNueva.trim())  return setError("Ingresa la nueva contraseña.");
    if (passNueva.length < 8) return setError("La nueva contraseña debe tener mínimo 8 caracteres.");
    if (passNueva !== passConf) return setError("Las contraseñas no coinciden.");
    setLoading(true); setError("");
    try {
      await authService.cambiarDatosUser({
        passwordActual: passActual,
        passwordNueva: passNueva,
      });
      setExito("✓ Contraseña actualizada correctamente.");
      setPassActual(""); setPassNueva(""); setPassConf("");
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? "Error al cambiar contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    const s = typeof d === "object" ? d.$date : d;
    return new Date(s).toLocaleDateString("es-CO",
      { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
  };

  const roleColor = ROLE_COLORS[user?.rol] ?? "var(--accent)";
  const initials  = (user?.nombre ?? "?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--sm animate-slideUp"
        style={{ maxWidth:420 }}
        onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title font-syne">
            {vista === "perfil"   && "Mi perfil"}
            {vista === "telefono" && "← Actualizar teléfono"}
            {vista === "password" && "← Cambiar contraseña"}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ── VISTA PERFIL ── */}
          {vista === "perfil" && (
            <>
              {/* Hero */}
              <div style={{
                display:"flex", alignItems:"center", gap:14,
                marginBottom:20, paddingBottom:16,
                borderBottom:"1px solid var(--border)",
              }}>
                <div style={{
                  width:52, height:52, borderRadius:14, flexShrink:0,
                  background:`linear-gradient(135deg,var(--accent),var(--accent2))`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"var(--accent-ink)",
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:"var(--text)", marginBottom:4 }}>
                    {user?.nombre}
                  </div>
                  <span style={{
                    display:"inline-block", padding:"2px 10px",
                    borderRadius:20, fontSize:11, fontWeight:600,
                    background:`${roleColor}22`, color:roleColor,
                  }}>
                    {user?.rol}
                  </span>
                </div>
              </div>

              {/* Datos */}
              {[
                ["Correo",         user?.correo],
                ["Teléfono",       user?.telefono ?? "—"],
                ["Código inst.",   user?.codigo_inst ?? "—"],
                ["Dependencia",    user?.dependencia ?? "—"],
                ["Programa",       user?.programa ?? "—"],
                ["Último acceso",  fmtDate(user?.ultimoAcceso)],
              ].map(([label, value]) => (
                <div key={label} className="detalle-row"
                  style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                  <span className="detalle-label">{label}</span>
                  <span className="detalle-value" style={{
                    textAlign:"right", maxWidth:220,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                    fontSize:13,
                  }}>
                    {value}
                  </span>
                </div>
              ))}

              {/* Acciones */}
              <div style={{
                display:"flex", gap:10, marginTop:20, flexWrap:"wrap",
              }}>
                <button className="btn btn-ghost btn-sm"
                  style={{ flex:1 }}
                  onClick={() => irA("telefono")}>
                  📱 Actualizar teléfono
                </button>
                <button className="btn btn-ghost btn-sm"
                  style={{ flex:1 }}
                  onClick={() => irA("password")}>
                  🔒 Cambiar contraseña
                </button>
              </div>
            </>
          )}

          {/* ── VISTA TELÉFONO ── */}
          {vista === "telefono" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <p className="text-sm text-muted">
                Ingresa tu nuevo número de teléfono de contacto.
              </p>

              <div className="modal-field">
                <label className="modal-label">Nuevo teléfono</label>
                <input
                  className="modal-input"
                  placeholder="Ej. 3001234567"
                  value={nuevoTel}
                  onChange={e => { setNuevoTel(e.target.value); setError(""); setExito(""); }}
                  disabled={loading}
                  maxLength={15}
                />
              </div>

              {error && <div className="modal-error">{error}</div>}
              {exito && (
                <div style={{
                  background:"var(--verde-lo)", border:"1px solid var(--verde-md)",
                  borderRadius:"var(--radius-sm)", padding:"9px 13px",
                  color:"var(--verde)", fontSize:13,
                }}>
                  {exito}
                </div>
              )}
            </div>
          )}

          {/* ── VISTA CONTRASEÑA ── */}
          {vista === "password" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <p className="text-sm text-muted">
                Para mayor seguridad necesitas confirmar tu contraseña actual.
              </p>

              <div className="modal-field">
                <label className="modal-label">Contraseña actual *</label>
                <PassInput
                  value={passActual}
                  onChange={e => { setPassActual(e.target.value); setError(""); }}
                  placeholder="Tu contraseña actual"
                  disabled={loading}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Nueva contraseña *</label>
                <PassInput
                  value={passNueva}
                  onChange={e => { setPassNueva(e.target.value); setError(""); }}
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Confirmar nueva contraseña *</label>
                <PassInput
                  value={passConf}
                  onChange={e => { setPassConf(e.target.value); setError(""); }}
                  placeholder="Repite la nueva contraseña"
                  disabled={loading}
                />
              </div>

              {error && <div className="modal-error">{error}</div>}
              {exito && (
                <div style={{
                  background:"var(--verde-lo)", border:"1px solid var(--verde-md)",
                  borderRadius:"var(--radius-sm)", padding:"9px 13px",
                  color:"var(--verde)", fontSize:13,
                }}>
                  {exito}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer — cambia según la vista */}
        <div className="modal-footer">
          {vista === "perfil" ? (
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => irA("perfil")} disabled={loading}>
                ← Volver
              </button>
              <button className="btn btn-primary" disabled={loading}
                onClick={vista === "telefono" ? handleTelefono : handlePassword}>
                {loading ? "Guardando…" : "Actualizar"}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════ TOPBAR ═══ */
export function Topbar({ activePage }) {
  const { user, logout } = useAuth();
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [userLocal,  setUserLocal]  = useState(null); // caché local de cambios

  // Fusiona user del contexto con cambios locales (telefono)
  const userActual = userLocal ? { ...user, ...userLocal } : user;

  const initials = (userActual?.nombre ?? "?")
    .split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleUpdate = (cambios) => {
    setUserLocal(prev => ({ ...(prev ?? {}), ...cambios }));
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar__title">
          <span className="topbar__title-sged">SGED</span>
          <span className="topbar__title-sep">·</span>
          <span className="topbar__title-page">{PAGE_TITLES[activePage] ?? "Panel"}</span>
        </div>

        <div className="topbar__right">
          <span
            className="topbar__role-badge"
            style={{
              color:       ROLE_COLORS[userActual?.rol],
              borderColor: (ROLE_COLORS[userActual?.rol] ?? "#fff") + "44",
            }}
          >
            {userActual?.rol}
          </span>

          {/* Área clickeable del usuario */}
          <div
            className="topbar__user topbar__user--clickable"
            onClick={() => setPerfilOpen(true)}
            title="Ver mi perfil"
          >
            <div
              className="topbar__avatar"
              style={{ background:"linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              {initials}
            </div>
            <div className="topbar__user-info">
              <span className="topbar__user-name">
                {(userActual?.nombre ?? "").split(" ").slice(0, 2).join(" ")}
              </span>
              <span className="topbar__user-email">{userActual?.correo}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de perfil */}
      {perfilOpen && (
        <PerfilModal
          user={userActual}
          onClose={() => setPerfilOpen(false)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
}