import { DIAS_SEMANA_CORTO } from "../../data/mockData";
import { useCalendar } from "../../hooks/useCalendar";

const STATUS_CLASS = {
  disponible:    "cal-day--disponible",
  parcial:       "cal-day--parcial",
  ocupado:       "cal-day--ocupado",
  mantenimiento: "cal-day--mant",
  pasado:        "cal-day--pasado",
};

const DOT_CLASS = {
  disponible:    "dot--verde",
  parcial:       "dot--amarillo",
  ocupado:       "dot--rojo",
  mantenimiento: "dot--gris",
};

export function CalendarGrid({ año, mes, espacioId, espacio, selectedDay, onDayClick }) {
  const { diasEnMes, primerDia, getDayStatus } = useCalendar(año, mes, espacioId, espacio);
  
  const handleClick = (d) => {
    const status = getDayStatus(d);
    if (status === "pasado" || status === "ocupado" || status === "mantenimiento" || status==="noDisponible") {
      return;
    }
    onDayClick(d);
  };

  return (
    <div className="cal-grid-wrapper">
      {/* Cabecera días semana */}
      <div className="cal-header-row">
        {DIAS_SEMANA_CORTO.map((d) => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="cal-grid">
        {/* Celdas vacías al inicio del mes */}
        {Array.from({ length: primerDia }).map((_, i) => (
          <div key={`empty-${i}`} className="cal-day cal-day--empty" />
        ))}

        {Array.from({ length: diasEnMes }).map((_, i) => {
          const d = i + 1;
          const status = getDayStatus(d);
          const isSelected = selectedDay === d;
          const isInteractive = status !== "pasado" && status !== "ocupado" && status !== "mantenimiento"
          && status !== "noDisponible";

          return (
            <div
              key={d}
              className={[
                "cal-day",
                STATUS_CLASS[status] ?? "",
                isSelected ? "cal-day--selected" : "",
                !isInteractive ? "" : "cal-day--interactive",
              ].join(" ")}
              onClick={() => handleClick(d)}
              title={isInteractive ? `Ver horarios del día ${d}` : undefined}
            >
              <span className="cal-day__num">{d}</span>
              {status !== "pasado" && (
                <span className={`cal-day__dot ${DOT_CLASS[status] ?? ""}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="cal-legend">
        {[
          { label: "Disponible",    cls: "dot--verde" },
          { label: "Parcial",       cls: "dot--amarillo" },
          { label: "Ocupado",       cls: "dot--rojo" },
          { label: "Mantenimiento", cls: "dot--gris" },
        ].map(({ label, cls }) => (
          <div key={label} className="cal-legend__item">
            <span className={`cal-day__dot ${cls}`} style={{ position: "static" }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
