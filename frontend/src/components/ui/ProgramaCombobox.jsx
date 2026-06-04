/**
 * components/ui/ProgramaCombobox.jsx
 * Combobox de búsqueda para programa académico.
 * Reutilizable: pásale cualquier lista de opciones via prop `options`.
 *
 * Props:
 *   value      string
 *   onChange   (value: string) => void
 *   options    string[]          — lista de programas (default: PROGRAMAS_UPTC)
 *   placeholder string
 *   disabled   boolean
 */
import { useState, useEffect, useRef } from "react";

export const PROGRAMAS_UPTC = [
  "Ingeniería de Sistemas y Computación",
  "Ingeniería Electrónica",
  "Ingeniería Industrial",
  "Ingeniería Mecánica",
  "Ingeniería Metalúrgica",
  "Ingeniería Geológica",
  "Ingeniería de Minas",
  "Administración de Empresas",
  "Contaduría Pública",
  "Economía",
  "Licenciatura en Matemáticas",
  "Licenciatura en Educación Física",
  "Licenciatura en Ciencias Naturales",
  "Licenciatura en Español y Literatura",
  "Derecho",
  "Medicina",
  "Enfermería",
  "Química",
  "Física",
  "Matemáticas",
  "Tecnología en Regencia de Farmacia",
  "Tecnología en Electrónica",
  "Tecnología en Sistemas",
];

export function ProgramaCombobox({
  value = "",
  onChange,
  options = PROGRAMAS_UPTC,
  placeholder = "Buscar programa académico…",
  disabled = false,
}) {
  const [query,    setQuery]    = useState(value);
  const [open,     setOpen]     = useState(false);
  const rootRef  = useRef(null);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  // Sincroniza query si value cambia externamente
  useEffect(() => { setQuery(value ?? ""); }, [value]);

  // Cierra al click fuera
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtrados = options.filter((p) =>
    p.toLowerCase().includes(query.toLowerCase())
  );

  const select = (p) => {
    setQuery(p);
    onChange(p);
    setOpen(false);
  };

  const clear = () => {
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const isExact = options.includes(query);

  return (
    <div className="pcb-root" ref={rootRef}>
      {/* Trigger / input */}
      <div className={`pcb-wrap${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}>
        <span className="pcb-icon">🎓</span>
        <input
          ref={inputRef}
          className="pcb-input"
          placeholder={placeholder}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
        {/* Indicador de selección válida */}
        {isExact && (
          <span className="pcb-valid">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 8 6.5 12 13 4"/>
            </svg>
          </span>
        )}
        {query && !disabled && (
          <button type="button" className="pcb-clear" onClick={clear} tabIndex={-1}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
            </svg>
          </button>
        )}
        <svg className={`pcb-chevron${open ? " is-open" : ""}`}
          viewBox="0 0 16 16" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 6 8 10 12 6"/>
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="pcb-dropdown" ref={listRef}>
          {filtrados.length === 0 ? (
            <div className="pcb-empty">Sin resultados para "<em>{query}</em>"</div>
          ) : (
            <>
              <div className="pcb-count">{filtrados.length} programa{filtrados.length!==1?"s":""}</div>
              {filtrados.map((p) => (
                <div
                  key={p}
                  className={`pcb-option${p === value ? " is-selected" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); select(p); }}
                >
                  <span className="pcb-option-label">{p}</span>
                  {p === value && (
                    <svg className="pcb-option-check" viewBox="0 0 16 16" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 8 6.5 12 13 4"/>
                    </svg>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}