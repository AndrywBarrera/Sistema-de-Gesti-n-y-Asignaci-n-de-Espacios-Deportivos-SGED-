/**
 * CustomSelect — dropdown completamente estilizado con scroll.
 *
 * Props:
 *   name        string
 *   value       string
 *   onChange    (e) => void   — { target: { name, value } }
 *   options     Array<{ value, label, emoji? }>
 *   placeholder string
 *   disabled    boolean
 *   maxVisible  number        — máx opciones visibles antes de hacer scroll (default 6)
 */
import { useEffect, useRef, useState } from "react";

export function CustomSelect({
  name,
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar…",
  disabled = false,
  maxVisible = 6,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll al ítem seleccionado al abrir
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const handleSelect = (optValue) => {
    onChange({ target: { name, value: optValue } });
    setOpen(false);
  };

  // Altura máxima del dropdown: cada opción ~36px
  const dropdownMaxH = maxVisible * 30;

  return (
    <div className="cs-root" ref={rootRef}>
      <button
        type="button"
        className={`cs-trigger${open ? " is-open" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cs-trigger-left">
          {selected?.emoji && <span className="cs-trigger-emoji">{selected.emoji}</span>}
          <span className="cs-trigger-label">{selected ? selected.label : placeholder}</span>
        </span>
        <svg className="cs-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {open && (
        <div
          className="cs-dropdown"
          role="listbox"
          style={{ maxHeight: dropdownMaxH, overflowY: "auto" }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                ref={isSelected ? selectedRef : null}
                className={`cs-option${isSelected ? " is-selected" : ""}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.emoji && <span className="cs-option-emoji">{opt.emoji}</span>}
                <span className="cs-option-label">{opt.label}</span>
                <svg className="cs-check" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 8 6.5 12 13 4" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}