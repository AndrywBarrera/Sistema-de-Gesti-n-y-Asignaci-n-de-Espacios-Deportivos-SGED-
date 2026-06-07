import { useEffect, useState } from "react";
import { Card, Badge } from "../components/ui/index";
import { useAuth } from "../context/AuthContext";
import { CustomSelect }     from "../components/ui/CustomSelect";
import { CustomTimePicker } from "../components/ui/CustomTimePicker";

// ─── REEMPLAZA CON TUS IMPORTS DE SERVICIO ───────────────────────────────────
import {
  listarEspacios,      // GET    /api/v1/espacios
  crearEspacio,        // POST   /api/v1/espacios
  actualizarEspacio,   // PUT    /api/v1/espacios/:id
  eliminarEspacio,     // DELETE /api/v1/espacios/:id
  subirImagen,         // POST   /api/v1/espacios/:id/imagen
} from "../services/espaciosService";
// ─────────────────────────────────────────────────────────────────────────────

const TIPO_EMOJI = {
  Cancha: "⚽", Gimnasio: "💪", Piscina: "🏊", Pista: "🏃", Otro: "🏟️",
};
const ACCENT_COLOR = {
  Cancha: "#3b82f6", Gimnasio: "#10b981", Piscina: "#06b6d4",
  Pista: "#f59e0b", Otro: "#8b5cf6",
};

const TIPOS_OPTIONS  = ["Cancha", "Gimnasio", "Piscina", "Pista", "Otro"]
  .map((t) => ({ value: t, label: t, emoji: TIPO_EMOJI[t] }));

const ESTADOS_OPTIONS = ["Disponible", "Ocupado", "Mantenimiento"]
  .map((s) => ({ value: s, label: s }));

const FORM_INICIAL = {
  nombre: "", tipo: "Cancha", capacidad: "", estado: "Disponible",
  descripcion: "", ubicacion: "", horarioApertura: "06:00", horarioCierre: "22:00",
};

// ─── MODAL CREAR / EDITAR ────────────────────────────────────────────────────
function EspacioModal({ open, onClose, onSaved, espacioEditar }) {
  const [form, setForm]       = useState(FORM_INICIAL);
  const [imagen, setImagen]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const esEditar = Boolean(espacioEditar);

  useEffect(() => {
    if (open) {
      setForm(esEditar ? {
        nombre:          espacioEditar.nombre          ?? "",
        tipo:            espacioEditar.tipo            ?? "Cancha",
        capacidad:       espacioEditar.capacidad       ?? "",
        estado:          espacioEditar.estado          ?? "Disponible",
        descripcion:     espacioEditar.descripcion     ?? "",
        ubicacion:       espacioEditar.ubicacion       ?? "",
        horarioApertura: espacioEditar.horarioApertura ?? "06:00",
        horarioCierre:   espacioEditar.horarioCierre   ?? "22:00",
      } : FORM_INICIAL);
      setImagen(null);
      setError("");
    }
  }, [open, espacioEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio.");
    if (!form.capacidad || Number(form.capacidad) < 1)
      return setError("La capacidad debe ser un número mayor a 0.");

    setLoading(true);
    setError("");
    try {
      const payload = { ...form, capacidad: Number(form.capacidad) };
      const saved   = esEditar
        ? await actualizarEspacio(espacioEditar.id, payload)
        : await crearEspacio(payload);

      if (imagen && saved?.id) {
        await subirImagen(saved.id, imagen);
      }

      onSaved();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.detail ?? "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box animate-slideUp" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title font-syne">
            {esEditar ? "✏️ Editar espacio" : "➕ Nuevo espacio deportivo"}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-grid">

            {/* Nombre */}
            <div className="modal-field modal-field--full">
              <label className="modal-label">Nombre *</label>
              <input className="modal-input" name="nombre"
                placeholder="Ej. Cancha Principal"
                value={form.nombre} onChange={handleChange} />
            </div>

            {/* Tipo */}
            <div className="modal-field">
              <label className="modal-label">Tipo *</label>
              <CustomSelect
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                options={TIPOS_OPTIONS}
              />
            </div>

            {/* Estado */}
            <div className="modal-field">
              <label className="modal-label">Estado *</label>
              <CustomSelect
                name="estado"
                value={form.estado}
                onChange={handleChange}
                options={ESTADOS_OPTIONS}
              />
            </div>

            {/* Capacidad */}
            <div className="modal-field">
              <label className="modal-label">Capacidad (personas) *</label>
              <input className="modal-input" name="capacidad" type="number" min={1}
                placeholder="Ej. 22" value={form.capacidad} onChange={handleChange} />
            </div>

            {/* Ubicación */}
            <div className="modal-field">
              <label className="modal-label">Ubicación</label>
              <input className="modal-input" name="ubicacion"
                placeholder="Ej. Bloque C, piso 1"
                value={form.ubicacion} onChange={handleChange} />
            </div>

            {/* Horario apertura */}
            <div className="modal-field">
              <label className="modal-label">Apertura *</label>
              <CustomTimePicker
                name="horarioApertura"
                value={form.horarioApertura}
                onChange={handleChange}
                minHour={6} maxHour={22} step={15}
              />
            </div>

            {/* Horario cierre */}
            <div className="modal-field">
              <label className="modal-label">Cierre *</label>
              <CustomTimePicker
                name="horarioCierre"
                value={form.horarioCierre}
                onChange={handleChange}
                minHour={6} maxHour={22} step={15}
              />
            </div>

            {/* Descripción */}
            <div className="modal-field modal-field--full">
              <label className="modal-label">Descripción</label>
              <textarea className="modal-input modal-textarea" name="descripcion"
                placeholder="Descripción breve del espacio..."
                value={form.descripcion} onChange={handleChange} rows={3} />
            </div>

            {/* Imagen */}
            <div className="modal-field modal-field--full">
              <label className="modal-label">
                Imagen {esEditar ? "(vacío = conservar actual)" : ""}
              </label>
              <label className={`file-upload-area${imagen ? " has-file" : ""}`}>
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setImagen(e.target.files?.[0] ?? null)} />
                <span className="file-upload-icon">{imagen ? "🖼️" : "📁"}</span>
                <div className="file-upload-text">
                  <span className="file-upload-label">
                    {imagen ? "Imagen seleccionada" : "Seleccionar imagen"}
                  </span>
                  <span className="file-upload-hint">
                    {imagen ? imagen.name : "jpg, png o webp"}
                  </span>
                </div>
              </label>
            </div>

          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando…" : esEditar ? "Guardar cambios" : "Crear espacio"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── MODAL CONFIRMAR ELIMINACIÓN ─────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, nombre, loading }) {
  if (!open) return null;
  return (
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--sm animate-slideUp"
        onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">🗑️ Eliminar espacio</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            ¿Estás seguro de que deseas eliminar{" "}
            <strong style={{ color: "var(--text)" }}>{nombre}</strong>?<br />
            Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando…" : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export function EspaciosPage() {
  const [espacios, setEspacios]               = useState([]);
  const [modalOpen, setModalOpen]             = useState(false);
  const [espacioEditar, setEspacioEditar]     = useState(null);
  const [confirmOpen, setConfirmOpen]         = useState(false);
  const [espacioEliminar, setEspacioEliminar] = useState(null);
  const [deletingId, setDeletingId]           = useState(null);

  const { user } = useAuth();
  const esAdmin = user?.rol === "Administrador";

  const cargar = async () => {
    const data = await listarEspacios();
    setEspacios(data);
  };
  useEffect(() => { cargar(); }, []);

  const abrirCrear    = () => { setEspacioEditar(null); setModalOpen(true); };
  const abrirEditar   = (e) => { setEspacioEditar(e);  setModalOpen(true); };
  const abrirEliminar = (e) => { setEspacioEliminar(e); setConfirmOpen(true); };

  const confirmarEliminar = async () => {
    if (!espacioEliminar) return;
    setDeletingId(espacioEliminar.id);
    try {
      await eliminarEspacio(espacioEliminar.id);
      await cargar();
    } finally {
      setDeletingId(null);
      setConfirmOpen(false);
      setEspacioEliminar(null);
    }
  };
  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Espacios <span style={{ color: "var(--accent)" }}>Deportivos</span>
          </h1>
          <p className="page-sub">
            Catálogo de instalaciones deportivas disponibles en la UPTC · Sogamoso
          </p>
        </div>
        {esAdmin && (
          <button className="btn btn-primary" onClick={abrirCrear}>+ Nuevo espacio</button>
        )}
      </div>

      <div className="espacios-grid">
        {(espacios || []).map((e) => (
          <Card key={e.id}
            accent={e.estado === "Mantenimiento" ? "var(--text3)" : ACCENT_COLOR[e.tipo]}>
            <div className="espacio-card__emoji">{TIPO_EMOJI[e.tipo] ?? "🏟️"}</div>
            <div className="espacio-card__tipo">{e.tipo}</div>
            <h3 className="espacio-card__nombre">{e.nombre}</h3>
            <p className="espacio-card__desc">{e.descripcion}</p>
            <div className="espacio-card__meta">
              <div className="espacio-card__meta-row"><span>📍</span><span>{e.ubicacion}</span></div>
              <div className="espacio-card__meta-row"><span>👥</span><span>Capacidad: {e.capacidad} personas</span></div>
              <div className="espacio-card__meta-row"><span>🕐</span><span>{e.horarioApertura} – {e.horarioCierre}</span></div>
            </div>
            <div className="espacio-card__footer">
              <Badge label={e.estado} variant={e.estado} />
              {esAdmin && (
                <div className="espacio-card__actions">
                  <button className="btn-icon btn-icon--edit" title="Editar"
                    onClick={() => abrirEditar(e)}>✏️</button>
                  <button className="btn-icon btn-icon--delete" title="Eliminar"
                    onClick={() => abrirEliminar(e)} disabled={deletingId === e.id}>🗑️</button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <EspacioModal open={modalOpen} onClose={() => setModalOpen(false)}
        onSaved={cargar} espacioEditar={espacioEditar} />

      <ConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)}
        onConfirm={confirmarEliminar} nombre={espacioEliminar?.nombre}
        loading={Boolean(deletingId)} />
    </div>
  );
}