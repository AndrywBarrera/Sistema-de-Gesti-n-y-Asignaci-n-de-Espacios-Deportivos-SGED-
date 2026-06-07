/**
 * pages/UsuariosPage.jsx
 * RF15: Gestión de usuarios y roles. Solo Administrador.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth }  from "../context/AuthContext";
import { useNotif } from "../context/NotifContext";
import * as usuariosSvc from "../services/usuariosService";
import { StatCard, Badge, EmptyState } from "../components/ui/index";
import { CustomSelect }     from "../components/ui/CustomSelect";
import { ProgramaCombobox } from "../components/ui/ProgramaCombobox";

/* ══════════════════════════════════════════════════ DATOS ═══ */
const ROLES         = ["Estudiante","Docente","Administrativo","Empleado","Administrador"];
const ROLES_CRITICOS = ["Administrativo","Administrador"];

const DEPENDENCIAS = [
  "Dirección de Sistemas","Bienestar Universitario","Vicerrectoría Académica",
  "Dirección Administrativa","Facultad de Ingeniería","Facultad de Ciencias",
  "Facultad de Educación","Rectoría",
];

const ROLE_COLOR = {
  Estudiante:"#3b82f6", Docente:"#10b981", Administrativo:"#f59e0b",
  Empleado:"#94a3b8",   Administrador:"#ef4444",
};

const ROLE_OPTS = ROLES.map(r => ({ value:r, label:r }));
const DEP_OPTS  = DEPENDENCIAS.map(d => ({ value:d, label:d }));

const initials = (n) => (n??"?").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
const fmtDate  = (d) => {
  if (!d) return "—";
  const s = typeof d === "object" ? d.$date : d;
  return new Date(s).toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"});
};

const FORM_VACIO = {
  nombre:"", correo:"", password:"", rol:"Estudiante",
  telefono:"", codigo_inst:"", dependencia:"", programa:"",
};

/* ══════════════════════════════════════════ ÍCONO OJO ═══ */
const IcoEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

/* ══════════════════════════════ MODAL CONFIRMACIÓN DE DATOS ═══ */
function ConfirmDatosModal({ open, form, esEditar, onConfirm, onClose, loading }) {
  if (!open) return null;

  const ETIQUETAS = {
    nombre:"Nombre completo", correo:"Correo", password:"Contraseña",
    rol:"Rol", telefono:"Teléfono", codigo_inst:"Código institucional",
    dependencia:"Dependencia", programa:"Programa académico",
  };

  const filas = Object.entries(form).filter(([k, v]) => {
    if (k === "password" && !v) return false; // ocultar si vacía en edición
    return true;
  });

  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--sm animate-slideUp"
        onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">
            {esEditar ? "✏️ Confirmar cambios" : "➕ Confirmar creación"}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-muted" style={{ marginBottom:14 }}>
            {esEditar
              ? "Revisa los datos antes de guardar los cambios:"
              : "Revisa los datos antes de crear el usuario:"}
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {filas.map(([k, v]) => (
              <div key={k} className="detalle-row"
                style={{ padding:"7px 0", borderBottom:"1px solid var(--border)" }}>
                <span className="detalle-label">{ETIQUETAS[k] ?? k}</span>
                <span className="detalle-value" style={{
                  textAlign:"right", maxWidth:220,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  color: k==="rol" ? ROLE_COLOR[v] : undefined,
                  fontWeight: k==="rol" ? 600 : undefined,
                }}>
                  {k === "password" ? "••••••••" : (v || "—")}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Revisar
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Guardando…" : esEditar ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════ MODAL CREAR / EDITAR ═══ */
function UsuarioModal({ open, onClose, onGuardado, usuarioEditar }) {
  const [form,       setForm]       = useState(FORM_VACIO);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const esEditar = Boolean(usuarioEditar);

  useEffect(() => {
    if (open) {
      setForm(esEditar ? {
        nombre:      usuarioEditar.nombre      ?? "",
        correo:      usuarioEditar.correo      ?? "",
        password:    "",
        rol:         usuarioEditar.rol         ?? "Estudiante",
        telefono:    usuarioEditar.telefono    ?? "",
        codigo_inst: usuarioEditar.codigo_inst ?? "",
        dependencia: usuarioEditar.dependencia ?? "",
        programa:    usuarioEditar.programa    ?? "",
      } : FORM_VACIO);
      setError("");
      setShowPass(false);
      setConfirmOpen(false);
    }
  }, [open, usuarioEditar]);

  const set       = (k) => (e) => setForm(p => ({ ...p, [k]: e.target?.value ?? e }));
  const setDirect = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Validar antes de abrir confirmación
  const handlePrevisualize = () => {
    if (!form.nombre.trim())
      return setError("El nombre es obligatorio.");
    if (!form.correo.includes("@uptc.edu.co"))
      return setError("El correo debe ser institucional (@uptc.edu.co).");
    if (!esEditar && !form.password.trim())
      return setError("La contraseña es obligatoria para nuevos usuarios.");
    if (!esEditar && form.password.length < 8)
      return setError("La contraseña debe tener al menos 8 caracteres.");
    setError("");
    setConfirmOpen(true);
  };

  // Ejecutar guardado real
  const handleGuardar = async () => {
    setLoading(true);
    try {
      const body = {
        nombre:      form.nombre,
        correo:      form.correo,
        rol:         form.rol,
        telefono:    form.telefono    || undefined,
        codigo_inst: form.codigo_inst || undefined,
        dependencia: form.dependencia || undefined,
        programa:    form.programa    || null,
        fuente:      "institucional_sistema",
        activo:      true,
        ...(form.password ? { password: form.password } : {}),
      };
      const guardado = esEditar
        ? await usuariosSvc.actualizarUsuario(usuarioEditar._id, body)
        : await usuariosSvc.crearUsuario(body);
      onGuardado(guardado, esEditar);
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      setConfirmOpen(false);
      setError(err?.response?.data?.detail ?? err.message ?? "Error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="modal-overlay animate-fadeIn" onClick={onClose}>
        <div className="modal-box animate-slideUp" style={{ maxWidth:560 }}
          onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title font-syne">
              {esEditar ? "✏️ Editar usuario" : "➕ Nuevo usuario"}
            </h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-grid">

              

              {/* Correo */}
              <div className="modal-field modal-field--full">
                <label className="modal-label">Correo institucional *</label>
                <input className="modal-input" type="email"
                  placeholder="usuario@uptc.edu.co"
                  value={form.correo} onChange={set("correo")} disabled={esEditar} />
              </div>

              {/* Programa — key fuerza remontaje al cambiar entre crear/editar */}
              <div className="modal-field modal-field--full">
                <label className="modal-label">Programa académico</label>
                <ProgramaCombobox
                  key={`prog-${usuarioEditar?._id ?? "nuevo"}-${open}`}
                  value={form.programa}
                  onChange={v => setDirect("programa", v)}
                />
              </div>

              {/* Nombre */}
              <div className="modal-field modal-field--full">
                <label className="modal-label">Nombre completo *</label>
                <input className="modal-input" placeholder="Ej. Ana María Torres"
                  value={form.nombre} onChange={set("nombre")} />
              </div>

              {/* Contraseña con ojo */}
              <div className="modal-field modal-field--full">
                <label className="modal-label">
                  Contraseña {esEditar ? "(vacío = sin cambios)" : "*"}
                </label>
                <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                  <input
                    className="modal-input"
                    type={showPass ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={set("password")}
                    style={{ paddingRight:38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position:"absolute", right:10,
                      background:"none", border:"none",
                      color:"var(--text3)", cursor:"pointer",
                      display:"flex", alignItems:"center",
                      padding:"4px", borderRadius:"var(--radius-xs)",
                      transition:"color var(--transition)",
                    }}
                    tabIndex={-1}
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onMouseEnter={e => e.currentTarget.style.color="var(--text)"}
                    onMouseLeave={e => e.currentTarget.style.color="var(--text3)"}
                  >
                    {showPass ? <IcoEyeOff /> : <IcoEye />}
                  </button>
                </div>
              </div>

              {/* Rol */}
              <div className="modal-field">
                <label className="modal-label">Rol *</label>
                <CustomSelect name="rol" value={form.rol}
                  onChange={e => setDirect("rol", e.target.value)}
                  options={ROLE_OPTS} />
              </div>

              {/* Teléfono */}
              <div className="modal-field">
                <label className="modal-label">Teléfono</label>
                <input className="modal-input" placeholder="3001234567"
                  value={form.telefono} onChange={set("telefono")} />
              </div>

              {/* Código institucional */}
              <div className="modal-field">
                <label className="modal-label">Código institucional</label>
                <input className="modal-input" placeholder="Ej. ADM-001 / 2021xxxxxxx"
                  value={form.codigo_inst} onChange={set("codigo_inst")} disabled={esEditar}/>
              </div>

              {/* Dependencia */}
              <div className="modal-field">
                <label className="modal-label">Dependencia</label>
                <CustomSelect name="dependencia" value={form.dependencia}
                  onChange={e => setDirect("dependencia", e.target.value)}
                  options={DEP_OPTS} placeholder="Seleccionar…" />
              </div>

              

            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handlePrevisualize} disabled={loading}>
              {esEditar ? "Revisar cambios →" : "Revisar datos →"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de datos */}
      <ConfirmDatosModal
        open={confirmOpen}
        form={form}
        esEditar={esEditar}
        onConfirm={handleGuardar}
        onClose={() => setConfirmOpen(false)}
        loading={loading}
      />
    </>
  );
}

/* ══════════════════════════════════ MODAL DETALLE ═══ */
function DetalleUsuarioModal({ usuario, onClose, onEditar }) {
  if (!usuario) return null;
  const filas = [
    ["Correo",        usuario.correo],
    ["Teléfono",      usuario.telefono    ?? "—"],
    ["Código inst.",  usuario.codigo_inst ?? "—"],
    ["Dependencia",   usuario.dependencia ?? "—"],
    ["Programa",      usuario.programa    ?? "—"],
    ["Fuente",        usuario.fuente      ?? "—"],
    ["Registro",      fmtDate(usuario.fechaRegistro)],
    ["Último acceso", fmtDate(usuario.ultimoAcceso)],
    ["Estado",        usuario.activo ? "Activo" : "Inactivo"],
  ];
  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--sm animate-slideUp"
        onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">Perfil de usuario</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="usr-detalle-hero">
            <div className="usr-avatar-lg"
              style={{ background:`linear-gradient(135deg,${ROLE_COLOR[usuario.rol]},${ROLE_COLOR[usuario.rol]}88)` }}>
              {initials(usuario.nombre)}
            </div>
            <div>
              <div className="usr-detalle-nombre">{usuario.nombre}</div>
              <span className="usr-rol-badge"
                style={{ background:`${ROLE_COLOR[usuario.rol]}22`, color:ROLE_COLOR[usuario.rol] }}>
                {usuario.rol}
              </span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:0, marginTop:12 }}>
            {filas.map(([label, value]) => (
              <div key={label} className="detalle-row"
                style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <span className="detalle-label">{label}</span>
                <span className="detalle-value" style={{
                  textAlign:"right", maxWidth:240,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary"
            onClick={() => { onClose(); onEditar(usuario); }}>
            ✏️ Editar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════ MODAL CONFIRMAR ACCIÓN ═══ */
function ConfirmAccionModal({ open, titulo, mensaje, advertencia, onConfirm, onClose, loading, variante="danger" }) {
  if (!open) return null;
  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--sm animate-slideUp"
        onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">{titulo}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <p style={{ color:"var(--text2)", lineHeight:1.6 }}>{mensaje}</p>
          {advertencia && (
            <div style={{
              background:"var(--rojo-lo)", border:"1px solid var(--rojo-md)",
              borderRadius:"var(--radius-sm)", padding:"9px 13px",
              color:"var(--rojo)", fontSize:12, lineHeight:1.5,
            }}>
              ⚠️ {advertencia}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className={`btn btn-${variante}`} onClick={onConfirm} disabled={loading}>
            {loading ? "Procesando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ PÁGINA PRINCIPAL ═══ */
export function UsuariosPage() {
  const { puede }     = useAuth();
  const { showToast } = useNotif();

  const [usuarios,      setUsuarios]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filtroRol,     setFiltroRol]     = useState("Todos");
  const [filtroEstado,  setFiltroEstado]  = useState("Todos");
  const [busqueda,      setBusqueda]      = useState("");
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [detalle,       setDetalle]       = useState(null);
  const [confirmData,   setConfirmData]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!puede("puedeGestionarUsuarios")) {
    return (
      <div className="page">
        <EmptyState icon="🔒" title="Acceso restringido"
          description="Solo el rol Administrador puede gestionar usuarios (RF15)." />
      </div>
    );
  }

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const resp  = await usuariosSvc.listarUsuarios();
      const lista = resp?.datos ?? (Array.isArray(resp) ? resp : []);
      setUsuarios(lista.map(u => ({
        _id:           u.id ?? u._id,
        nombre:        u.nombre,
        correo:        u.correo,
        rol:           u.rol,
        telefono:      u.telefono,
        codigo_inst:   u.codigo_inst,
        dependencia:   u.dependencia,
        programa:      u.programa,
        fuente:        u.fuente,
        activo:        u.activo,
        fechaRegistro: u.fechaRegistro,
        ultimoAcceso:  u.ultimoAcceso,
      })));
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarAccion = async () => {
    if (!confirmData) return;
    const { id, accion } = confirmData;
    setActionLoading(true);
    try {
      if (accion === "desactivar") {
        await usuariosSvc.desactivarUsuario(id);
        setUsuarios(prev => prev.map(u => u._id===id ? {...u, activo:false} : u));
        showToast("Usuario desactivado.");
      } else {
        await usuariosSvc.actualizarUsuario(id, { activo: true });
        setUsuarios(prev => prev.map(u => u._id===id ? {...u, activo:true} : u));
        showToast("✓ Usuario reactivado.");
      }
    } catch (err) {
      showToast(err.message ?? "Error.");
    } finally {
      setActionLoading(false);
      setConfirmData(null);
    }
  };

  const handleGuardado = (guardado, esEditar) => {
    const u = {
      _id:           guardado.id ?? guardado._id,
      nombre:        guardado.nombre,
      correo:        guardado.correo,
      rol:           guardado.rol,
      telefono:      guardado.telefono,
      codigo_inst:   guardado.codigo_inst,
      dependencia:   guardado.dependencia,
      programa:      guardado.programa,
      fuente:        guardado.fuente,
      activo:        guardado.activo ?? true,
      fechaRegistro: guardado.fechaRegistro,
      ultimoAcceso:  guardado.ultimoAcceso,
    };
    if (esEditar) {
      setUsuarios(prev => prev.map(x => x._id===u._id ? u : x));
      showToast("✓ Usuario actualizado.");
    } else {
      setUsuarios(prev => [u, ...prev]);
      showToast("✓ Usuario creado.");
    }
  };

  const pedirDesactivar = (u) => setConfirmData({
    id:u._id, accion:"desactivar", nombre:u.nombre, rol:u.rol,
    critico: ROLES_CRITICOS.includes(u.rol),
  });
  const pedirActivar = (u) => setConfirmData({
    id:u._id, accion:"activar", nombre:u.nombre, rol:u.rol, critico:false,
  });

  const filtrados = usuarios
    .filter(u => filtroRol === "Todos" || u.rol === filtroRol)
    .filter(u => {
      if (filtroEstado === "Activo")   return u.activo;
      if (filtroEstado === "Inactivo") return !u.activo;
      return true;
    })
    .filter(u => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return u.nombre?.toLowerCase().includes(q) ||
             u.correo?.toLowerCase().includes(q) ||
             u.codigo_inst?.toLowerCase().includes(q) ||
             u.programa?.toLowerCase().includes(q);
    });

  const activos   = usuarios.filter(u => u.activo).length;
  const inactivos = usuarios.filter(u => !u.activo).length;

  return (
    <div className="page animate-fadeIn">

      <div className="page-header">
        <div>
          <h1 className="page-title">
            Gestión de <span style={{ color:"var(--accent)" }}>Usuarios</span>
          </h1>
          <p className="page-sub">Administra perfiles, roles y permisos del sistema (RF15)</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={cargar} disabled={loading}>
            {loading ? "Cargando…" : "↻ Actualizar"}
          </button>
          <button className="btn btn-primary"
            onClick={() => { setEditTarget(null); setModalOpen(true); }}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {ROLES.map(r => (
          <StatCard key={r} label={r} value={usuarios.filter(u=>u.rol===r).length} color="azul" />
        ))}
        <StatCard label="Activos"   value={activos}        color="verde" sub="Con acceso"  />
        <StatCard label="Inactivos" value={inactivos}       color="rojo"  sub="Sin acceso" />
        <StatCard label="Total"     value={usuarios.length} color="azul"  sub="Registrados"/>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:220 }}>
          <span style={{
            position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            color:"var(--text3)", fontSize:13, pointerEvents:"none",
          }}>🔍</span>
          <input className="modal-input" style={{ paddingLeft:30 }}
            placeholder="Buscar por nombre, correo, código o programa…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {busqueda && (
            <button style={{
              position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", color:"var(--text3)", cursor:"pointer",
              fontSize:13, padding:"2px 4px",
            }} onClick={() => setBusqueda("")}>✕</button>
          )}
        </div>
        <div className="filter-tabs" style={{ margin:0 }}>
          {["Todos",...ROLES].map(r => (
            <button key={r} className={`filter-tab${filtroRol===r?" filter-tab--active":""}`}
              onClick={() => setFiltroRol(r)}>{r}</button>
          ))}
        </div>
        <div className="filter-tabs" style={{ margin:0 }}>
          {["Todos","Activo","Inactivo"].map(e => (
            <button key={e} className={`filter-tab${filtroEstado===e?" filter-tab--active":""}`}
              onClick={() => setFiltroEstado(e)}>{e}</button>
          ))}
        </div>
      </div>

      {!loading && (
        <p className="text-xs text-muted" style={{ marginBottom:10 }}>
          Mostrando {filtrados.length} de {usuarios.length} usuarios
        </p>
      )}

      {loading ? (
        <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text3)" }}>
          Cargando usuarios…
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="👥" title="Sin usuarios" description="No hay usuarios con este filtro." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th><th>Correo</th><th>Rol</th><th>Código</th>
                <th>Registro</th><th>Último acceso</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div className="topbar__avatar" style={{
                        width:34, height:34, fontSize:12, flexShrink:0,
                        background:`linear-gradient(135deg,${ROLE_COLOR[u.rol]},${ROLE_COLOR[u.rol]}88)`,
                      }}>
                        {initials(u.nombre)}
                      </div>
                      <div>
                        <div style={{ fontWeight:500, fontSize:13 }}>{u.nombre}</div>
                        {u.programa && (
                          <div className="text-xs text-muted" style={{
                            maxWidth:160, overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap",
                          }}>{u.programa}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-muted text-sm">{u.correo}</td>
                  <td>
                    <span className="usr-rol-badge"
                      style={{ background:`${ROLE_COLOR[u.rol]}22`, color:ROLE_COLOR[u.rol] }}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{u.codigo_inst ?? "—"}</td>
                  <td className="text-muted text-sm">{fmtDate(u.fechaRegistro)}</td>
                  <td className="text-muted text-sm">{fmtDate(u.ultimoAcceso)}</td>
                  <td>
                    <Badge label={u.activo?"Activo":"Inactivo"}
                      variant={u.activo?"Aprobada":"Rechazada"} />
                  </td>
                  <td>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <button className="btn-icon" title="Ver perfil"
                        onClick={() => setDetalle(u)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button className="btn-icon btn-icon--edit" title="Editar usuario"
                        onClick={() => { setEditTarget(u); setModalOpen(true); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      {u.activo ? (
                        <button className="btn btn-danger btn-sm" onClick={() => pedirDesactivar(u)}>
                          Desactivar
                        </button>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => pedirActivar(u)}>
                          Activar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UsuarioModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onGuardado={handleGuardado}
        usuarioEditar={editTarget}
      />

      <DetalleUsuarioModal
        usuario={detalle}
        onClose={() => setDetalle(null)}
        onEditar={u => { setDetalle(null); setEditTarget(u); setModalOpen(true); }}
      />

      <ConfirmAccionModal
        open={Boolean(confirmData)}
        titulo={confirmData?.accion==="desactivar" ? "Desactivar usuario" : "Activar usuario"}
        mensaje={
          confirmData?.accion==="desactivar"
            ? `¿Desactivar a ${confirmData?.nombre}? No podrá iniciar sesión hasta ser reactivado.`
            : `¿Reactivar a ${confirmData?.nombre}? Recuperará acceso al sistema.`
        }
        advertencia={
          confirmData?.critico
            ? `${confirmData?.nombre} tiene el rol ${confirmData?.rol}, que tiene permisos elevados. Esta acción puede afectar operaciones críticas del sistema.`
            : undefined
        }
        variante={confirmData?.accion==="desactivar" ? "danger" : "success"}
        onConfirm={ejecutarAccion}
        onClose={() => setConfirmData(null)}
        loading={actionLoading}
      />
    </div>
  );
}