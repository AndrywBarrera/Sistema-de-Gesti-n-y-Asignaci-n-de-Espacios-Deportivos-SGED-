import { useState } from "react";
import { ModalOverlay, Button, FormGroup, Textarea } from "../ui/index";
import { Icon } from "../ui/Icons";

/**
 * Modal de rechazo con justificación obligatoria (RF09).
 * Solo accesible para Administrativo / Administrador.
 */
export function RejectModal({ solicitud, onConfirm, onCancel }) {
  const [justificacion, setJustificacion] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!justificacion.trim()) {
      setError("La justificación es obligatoria para rechazar una solicitud.");
      return;
    }
    onConfirm(solicitud.id, justificacion.trim());
  };

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="reject-modal animate-slideUp">
        <div className="reject-modal__header">
          <div className="reject-modal__icon">
            <Icon name="alertCircle" size={22} />
          </div>
          <div>
            <h3 className="reject-modal__title">Rechazar solicitud</h3>
            <p className="text-sm text-muted">
              Solicitante: <strong>{solicitud.usuarioNombre}</strong> · {solicitud.espacioNombre}
            </p>
          </div>
        </div>

        <div className="reject-modal__body">
          <FormGroup label="Justificación del rechazo" required>
            <Textarea
              placeholder="Ej: El espacio está reservado para un evento institucional, mantenimiento programado…"
              value={justificacion}
              onChange={(e) => { setJustificacion(e.target.value); setError(""); }}
              rows={4}
            />
          </FormGroup>
          {error && (
            <div className="form-error">
              <Icon name="alertCircle" size={14} />
              {error}
            </div>
          )}
          <p className="text-sm text-muted" style={{ marginTop: 8 }}>
            Esta justificación será enviada automáticamente al solicitante (RF09).
          </p>
        </div>

        <div className="reject-modal__actions">
          <Button variant="danger" onClick={handleConfirm} icon={<Icon name="x" size={14} />}>
            Confirmar rechazo
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
