import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useReservas } from "../../context/ReservasContext";
import { useNotif } from "../../context/NotifContext";
import { Button, FormGroup, Input, Textarea } from "../ui/index";
import { Icon } from "../ui/Icons";
import { formatHora } from "../../utils/formatHora";

export function ReservaForm({ espacio, dateStr, horarios, onBack, onSuccess, onError }) {
  const { user } = useAuth();
  const { enviarSolicitud, recargarSolicitudes } = useReservas();
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

    try {
      await enviarSolicitud({
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
      onSuccess?.();
    } catch (err) {
      // El backend devuelve el detalle del error (ej: horario ya reservado).
      // Lo mostramos y refrescamos las tablas para que el horario ocupado
      // desaparezca de las opciones seleccionables.
      const msg =
        err?.message ?? "No se pudo enviar la solicitud. Intenta de nuevo.";
      setError(msg);
      showToast(msg, "danger");
      try {
        await recargarSolicitudes();
      } catch {
        /* si la recarga falla, el error principal ya quedó visible */
      }
      // Volver a la grilla de horarios ya actualizada (el slot en conflicto
      // dejará de aparecer como disponible). El toast mantiene visible el error.
      onError?.();
    } finally {
      setLoading(false);
    }
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
            {formatHora(horasOrdenadas[0])} – {formatHora(horaFin)} ({horasOrdenadas.length}h)
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
