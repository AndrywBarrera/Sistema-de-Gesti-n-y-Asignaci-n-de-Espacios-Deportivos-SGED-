import { useState } from "react";
import { DIAS_SEMANA_LARGO, MESES } from "../../data/mockData";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuth } from "../../context/AuthContext";
import { ModalOverlay, Button, Divider } from "../ui/index";
import { Icon } from "../ui/Icons";
import { ReservaForm } from "../reservas/ReservaForm";

const SLOT_CLASS = {
  libre:    "slot--libre",
  ocupado:  "slot--ocupado",
  pendiente:"slot--pendiente",
};

const SLOT_LABEL = {
  libre:    "Disponible",
  ocupado:  "Ocupado",
  pendiente:"⏳ Pendiente",
};

export function DayModal({ año, mes, dia, espacioId, espacio, onClose, onSuccess }) {
  const { getSlotsDelDia } = useCalendar(año, mes, espacioId, espacio);
  const { puede } = useAuth();
  const [selectedHoras, setSelectedHoras] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const slots = getSlotsDelDia(dia);
  const dateStr = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const dayName = DIAS_SEMANA_LARGO[new Date(año, mes, dia).getDay()];
  const libres = slots.filter((s) => s.estado === "libre").length;
  const pendientes = slots.filter((s) => s.estado === "pendiente").length;
  const ocupados = slots.filter((s) => s.estado === "ocupado").length;

  // RF05: selección múltiple de horarios libres
  const toggleHora = (hora, estado) => {
    if (estado !== "libre") return;
    setSelectedHoras((prev) =>
      prev.includes(hora) ? prev.filter((h) => h !== hora) : [...prev, hora]
    );
  };

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="day-modal animate-slideUp">
        {/* Header */}
        <div className="day-modal__header">
          <div>
            <h2 className="day-modal__title">
              {dayName}, {dia} de {MESES[mes]}
            </h2>
            <p className="day-modal__sub">
              {espacio.nombre} · {espacio.tipo} · Cap. {espacio.capacidad} personas
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="day-modal__body">
          {/* SLOTS */}
          <div className="day-modal__slots-panel">
            <div className="day-modal__slots-header">
              <span className="card__title" style={{ marginBottom: 0 }}>
                Horarios disponibles
              </span>
              <span className="text-sm text-muted">
                {libres} libres · {ocupados} ocupados · {pendientes} pendientes
              </span>
            </div>

            <div className="slots-grid">
              {slots.map(({ hora, estado }) => {
                const isSelected = selectedHoras.includes(hora);
                const horaFin = `${String(parseInt(hora) + 1).padStart(2, "0")}:00`;
                return (
                  <div
                    key={hora}
                    className={[
                      "slot",
                      SLOT_CLASS[estado] ?? "",
                      isSelected ? "slot--selected" : "",
                      puede("puedeReservar") && estado === "libre" ? "slot--clickable" : "",
                    ].join(" ")}
                    onClick={() => puede("puedeReservar") && toggleHora(hora, estado)}
                  >
                    <span className="slot__time">{hora} – {horaFin}</span>
                    <span className="slot__label">
                      {isSelected ? "✓ Seleccionado" : SLOT_LABEL[estado]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Resumen de selección */}
            {selectedHoras.length > 0 && (
              <div className="slot-summary">
                <p className="slot-summary__label">
                  {selectedHoras.length} horario{selectedHoras.length > 1 ? "s" : ""} seleccionado{selectedHoras.length > 1 ? "s" : ""}
                </p>
                <div className="slot-summary__chips">
                  {[...selectedHoras].sort().map((h) => (
                    <span key={h} className="chip">{h}</span>
                  ))}
                </div>
                {!showForm && (
                  <Button
                    onClick={() => setShowForm(true)}
                    icon={<Icon name="send" size={14} />}
                    full
                  >
                    Continuar con la solicitud
                  </Button>
                )}
              </div>
            )}

            {/* Mensaje para roles sin permiso de reserva */}
            {!puede("puedeReservar") && (
              <div className="slot-readonly-msg">
                <Icon name="info" size={16} />
                Vista de solo lectura para tu rol
              </div>
            )}
          </div>

          {/* FORMULARIO LATERAL RF06 */}
          <div className="day-modal__form-panel">
            {showForm && selectedHoras.length > 0 ? (
              <ReservaForm
                espacio={espacio}
                dateStr={dateStr}
                horarios={selectedHoras}
                onBack={() => setShowForm(false)}
                onSuccess={handleSuccess}
              />
            ) : (
              <div className="day-modal__form-placeholder">
                <div style={{ fontSize: 36 }}>👆</div>
                <p>
                  {puede("puedeReservar")
                    ? "Selecciona uno o más horarios libres para iniciar tu solicitud"
                    : "Solo los usuarios con rol Estudiante, Docente o Empleado pueden realizar reservas"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
