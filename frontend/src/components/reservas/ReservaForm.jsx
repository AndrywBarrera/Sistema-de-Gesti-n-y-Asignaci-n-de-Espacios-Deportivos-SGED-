import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useReservas } from "../../context/ReservasContext";
import { useNotif } from "../../context/NotifContext";
import { Button, FormGroup, Input, Textarea } from "../ui/index";
import { Icon } from "../ui/Icons";

export function ReservaForm({ espacio, dateStr, horarios, onBack, onSuccess }) {
  const { user } = useAuth();
  const { enviarSolicitud } = useReservas();
  const { agregar, showToast } = useNotif();

  const [motivo, setMotivo] = useState("");
  const [participantes, setParticipantes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const horasOrdenadas = [...horarios].sort();
  const horaFin = `${String(parseInt(horasOrdenadas[horasOrdenadas.length - 1]) + 1).padStart(2, "0")}:00`;

  const handleSubmit = async () => {
    if (!motivo.trim()) {
      setError("El motivo de la reserva es obligatorio.");
      return;
    }
    if (participantes && parseInt(participantes) > espacio.capacidad) {
      setError(
        `El número de participantes supera la capacidad máxima (${espacio.capacidad}).`,
      );
      return;
    }

    setLoading(true);
    setError("");

    enviarSolicitud({
      usuario: user,
      espacioId: espacio.id,
      espacioNombre: espacio.nombre,
      fecha: dateStr,
      horarios: horasOrdenadas,
      motivo: motivo.trim(),
      participantes,
    });
    // RF13: notificación automática al usuario
    
    await agregar();
    

    showToast("✓ Solicitud enviada. Pendiente de aprobación.");
    setLoading(false);
    onSuccess?.();
  };

  return (
    <div className="reserva-form animate-slideIn">
      <div className="card__title">Datos de la reserva</div>

      {/* Resumen no editable */}
      <div className="reserva-form__summary">
        <div className="reserva-form__summary-row">
          <span className="text-muted text-sm">Espacio</span>
          <span>{espacio.nombre}</span>
        </div>
        <div className="reserva-form__summary-row">
          <span className="text-muted text-sm">Fecha</span>
          <span>{dateStr}</span>
        </div>
        <div className="reserva-form__summary-row">
          <span className="text-muted text-sm">Horario</span>
          <span>
            {horasOrdenadas[0]} – {horaFin} ({horasOrdenadas.length}h)
          </span>
        </div>
        <div className="reserva-form__summary-row">
          <span className="text-muted text-sm">Solicitante</span>
          <span>{user.nombre}</span>
        </div>
      </div>

      <div className="reserva-form__divider" />

      {/* Campos */}
      <FormGroup label="Motivo de la reserva" required>
        <Textarea
          placeholder="Ej: Entrenamiento equipo fútbol, clase de educación física..."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setError("");
          }}
          rows={3}
        />
      </FormGroup>

      <FormGroup label={`N.° de participantes (máx. ${espacio.capacidad})`}>
        <Input
          type="number"
          min={1}
          max={espacio.capacidad}
          placeholder={`1 – ${espacio.capacidad}`}
          value={participantes}
          onChange={(e) => {
            setParticipantes(e.target.value);
            setError("");
          }}
        />
      </FormGroup>

      {error && (
        <div className="form-error">
          <Icon name="alertCircle" size={14} />
          {error}
        </div>
      )}

      <div className="reserva-form__actions">
        <Button
          variant="primary"
          full
          disabled={loading || !motivo.trim()}
          onClick={handleSubmit}
          icon={<Icon name="send" size={14} />}
        >
          {loading ? "Enviando…" : "Enviar solicitud"}
        </Button>
        <Button variant="ghost" full onClick={onBack}>
          ← Volver a horarios
        </Button>
      </div>
    </div>
  );
}
