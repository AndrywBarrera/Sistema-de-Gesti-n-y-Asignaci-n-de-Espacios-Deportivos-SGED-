/**
 * CustomTimePicker — selector de hora con columnas scrolleables.
 *
 * Props:
 *   name       string        nombre del campo
 *   value      string        hora en formato "HH:MM"
 *   onChange   (e) => void   callback idéntico al de un input nativo:
 *                            recibe { target: { name, value: "HH:MM" } }
 *   minHour?   number        hora mínima (default 0)
 *   maxHour?   number        hora máxima (default 23)
 *   step?      number        paso de minutos: 1, 5, 10, 15, 30 (default 5)
 *   disabled?  boolean
 *
 * Uso en EspacioModal (o cualquier form):
 *   <CustomTimePicker
 *     name="horarioApertura"
 *     value={form.horarioApertura}
 *     onChange={handleChange}
 *     minHour={6}
 *     maxHour={22}
 *     step={15}
 *   />
 */

import { useEffect, useRef, useState } from "react";

function pad(n) { return String(n).padStart(2, "0"); }

export function CustomTimePicker({
  name,
  value = "06:00",
  onChange,
  minHour = 0,
  maxHour = 23,
  step = 5,
  disabled = false,
}) {
  const [open, setOpen]   = useState(false);
  const rootRef           = useRef(null);
  const hourScrollRef     = useRef(null);
  const minuteScrollRef   = useRef(null);

  const [hh, mm] = value.split(":").map(Number);

  // Cierra al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll automático al ítem seleccionado al abrir
  useEffect(() => {
    if (!open) return;
    const ITEM_H = 34;
    if (hourScrollRef.current) {
      const idx = hh - minHour;
      hourScrollRef.current.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H);
    }
    if (minuteScrollRef.current) {
      const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
      const idx = minutes.findIndex((m) => m === mm);
      if (idx >= 0) minuteScrollRef.current.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H);
    }
  }, [open]);

  const emit = (newHH, newMM) => {
    onChange({ target: { name, value: `${pad(newHH)}:${pad(newMM)}` } });
  };

  const hours   = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const minutes = Array.from({ length: Math.ceil(60 / step) },  (_, i) => i * step);

  return (
    <div className="ctp-root" ref={rootRef}>
      {/* Trigger */}
      <button
        type="button"
        className={`ctp-trigger${open ? " is-open" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
      >
        <span className="ctp-icon">🕐</span>
        <span className="ctp-value">{pad(hh)}:{pad(mm)}</span>
        <svg className="ctp-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="ctp-panel">
          <div className="ctp-panel-header">
            <span className="ctp-panel-title">Seleccionar hora</span>
          </div>

          <div className="ctp-columns">
            {/* Columna horas */}
            <div>
              <div className="ctp-col-label">HH</div>
              <div className="ctp-scroll" ref={hourScrollRef}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className={`ctp-item${h === hh ? " is-selected" : ""}`}
                    onClick={() => emit(h, mm)}
                  >
                    {pad(h)}
                  </div>
                ))}
              </div>
            </div>

            <div className="ctp-separator">:</div>

            {/* Columna minutos */}
            <div>
              <div className="ctp-col-label">MM</div>
              <div className="ctp-scroll" ref={minuteScrollRef}>
                {minutes.map((m) => (
                  <div
                    key={m}
                    className={`ctp-item${m === mm ? " is-selected" : ""}`}
                    onClick={() => emit(hh, m)}
                  >
                    {pad(m)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button className="ctp-ok" onClick={() => setOpen(false)}>
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}