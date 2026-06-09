/**
 * pages/ReportesPage.jsx
 * RF14: Reportes y estadísticas. Solo Administrativo y Administrador.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useAuth }     from "../context/AuthContext";
import { useNotif }    from "../context/NotifContext";
import { useReservas } from "../context/ReservasContext";
import * as reportesSvc from "../services/reportesService";

// ── REEMPLAZA CON TUS IMPORTS ──────────────────────────────────────────────
import { obtenerStatsEspacios }   from "../services/espaciosService";
import { obtenerStatsUsuarios }   from "../services/usuariosService";
import { obtenerHeatmapReportes } from "../services/reportesService";
import { obtenerTendenciaReportes } from "../services/reportesService";
// ──────────────────────────────────────────────────────────────────────────

import { StatCard, Card, CardTitle, EmptyState, ModalPortal } from "../components/ui/index";
import { CustomSelect } from "../components/ui/CustomSelect";
import { generarPDFReporte } from "../utils/pdfGenerator";

/* ══════════════════════════════════════════════════ CONSTANTES ═══ */
const TIPO_OPTS = [
  { value: "Estadisticas_Generales", label: "Estadísticas generales" },
  { value: "Uso_Espacios",           label: "Uso de espacios"        },
  { value: "Reservas_Usuario",       label: "Reservas por usuario"   },
  { value: "Mantenimiento",          label: "Mantenimiento"          },
];
const FORMATO_OPTS = [
  { value: "JSON", label: "JSON" },
  { value: "CSV",  label: "CSV"  },
  { value: "PDF",  label: "PDF"  },
];
const COLORS     = ["#f5b400","#15803d","#0891b2","#b45309","#7c3aed","#dc2626"];
const ROL_COLORS = {
  Estudiante:"#f5b400", Docente:"#15803d",
  Empleado:"#b45309", Administrativo:"#0891b2", Administrador:"#7c3aed",
};
const MESES_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/* ══════════════════════════════════════════════════════ HELPERS ═══ */
const fmt = (d) => !d ? "—" : new Date(d).toLocaleString("es-CO",
  { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
const fmtDate = (d) => !d ? "—" : new Date(d).toLocaleDateString("es-CO",
  { day:"2-digit", month:"short", year:"numeric" });

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href:url, download:filename });
  a.click(); URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════ DESCARGA PDF ═══ */
// Mantenido por compatibilidad — ahora delega a pdfGenerator.js (jsPDF)
function generarPDF({ reporte, statsEspacios, statsUsuarios, solicitudes }) {
  const { tipoReporte, fechaGeneracion, parametros, datos } = reporte;
  const aprobadas  = solicitudes.filter(s=>s.estado==="Aprobada").length;
  const rechazadas = solicitudes.filter(s=>s.estado==="Rechazada").length;
  const pendientes = solicitudes.filter(s=>s.estado==="Pendiente").length;
  const total      = solicitudes.length;
  const tasa       = Math.round((aprobadas/(total||1))*100);
  const usoEspacios = statsEspacios?.uso_por_espacio ?? [];
  const porRol      = statsUsuarios?.por_rol ?? {};
  const rolItems    = Object.entries(porRol).map(([k,v])=>({label:k,value:v}));
  const maxRol      = Math.max(...rolItems.map(r=>r.value),1);
  const maxEspacio  = Math.max(...usoEspacios.map(e=>e.total_reservas??0),1);

  const barHTML = (items, colors, maxVal) => items.map(({nombre,label,total_reservas,value},i) => {
    const name  = nombre??label??"";
    const val   = total_reservas??value??0;
    const pct   = maxVal>0?(val/maxVal)*100:0;
    const color = colors[i%colors.length];
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="width:130px;font-size:11px;color:#64748b;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
      <div style="flex:1;height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:5px"></div>
      </div>
      <span style="width:30px;font-size:11px;color:#334155;text-align:right">${val}</span>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Reporte SGED</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;background:#fff;color:#1e293b;padding:40px}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #f5b400}
    .badge{width:48px;height:48px;border-radius:12px;background:#14181f;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#f5b400}
    h1{font-size:22px;font-weight:700;color:#0f172a}.sub{font-size:12px;color:#64748b;margin-top:2px}
    .meta{display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}
    .meta-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px}
    .meta-label{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
    .meta-value{font-size:13px;font-weight:600;color:#1e293b;margin-top:2px}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
    .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}
    .stat-val{font-size:26px;font-weight:800;line-height:1}
    .stat-label{font-size:10px;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
    .section{margin-bottom:28px}
    .section-title{font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
    .chart-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
    .chart-title{font-size:12px;font-weight:600;color:#475569;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f1f5f9;padding:8px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#334155}
    tr:last-child td{border-bottom:none}
    .top-badge{background:linear-gradient(135deg,#f59e0b22,#f59e0b11);border:1px solid #f59e0b44;border-radius:12px;padding:16px;text-align:center;margin-bottom:12px}
    .footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="header"><div class="badge">S</div><div>
    <h1>Reporte: ${tipoReporte?.replace(/_/g," ")}</h1>
    <div class="sub">Sistema de Gestión de Espacios Deportivos · UPTC Sogamoso</div>
  </div></div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Generado</div><div class="meta-value">${fmt(fechaGeneracion)}</div></div>
    <div class="meta-item"><div class="meta-label">Tipo</div><div class="meta-value">${tipoReporte?.replace(/_/g," ")}</div></div>
    ${parametros?.fecha_inicio?`<div class="meta-item"><div class="meta-label">Período</div><div class="meta-value">${parametros.fecha_inicio} → ${parametros.fecha_fin??""}</div></div>`:""}
  </div>
  <div class="stats-grid">
    <div class="stat"><div class="stat-val" style="color:#b8860b">${total}</div><div class="stat-label">Total</div></div>
    <div class="stat"><div class="stat-val" style="color:#15803d">${aprobadas}</div><div class="stat-label">Aprobadas</div></div>
    <div class="stat"><div class="stat-val" style="color:#b45309">${pendientes}</div><div class="stat-label">Pendientes</div></div>
    <div class="stat"><div class="stat-val" style="color:#dc2626">${rechazadas}</div><div class="stat-label">Rechazadas</div></div>
  </div>
  <div class="stats-grid">
    <div class="stat"><div class="stat-val" style="color:#15803d">${tasa}%</div><div class="stat-label">Tasa aprobación</div></div>
    <div class="stat"><div class="stat-val" style="color:#b8860b">${statsEspacios?.total??0}</div><div class="stat-label">Espacios</div></div>
    <div class="stat"><div class="stat-val" style="color:#15803d">${statsEspacios?.disponibles??0}</div><div class="stat-label">Disponibles</div></div>
    <div class="stat"><div class="stat-val" style="color:#64748b">${statsUsuarios?.total??0}</div><div class="stat-label">Usuarios</div></div>
  </div>
  <div class="two-col">
    <div class="section">
      <div class="section-title">Uso por espacio</div>
      ${usoEspacios.length>0?`
        ${usoEspacios[0]?`<div class="top-badge"><div style="font-size:24px">🏆</div>
          <div style="font-size:14px;font-weight:700">${usoEspacios[0].nombre}</div>
          <div style="font-size:11px;color:#64748b">${usoEspacios[0].total_reservas} reservas</div>
        </div>`:""}
        <div class="chart-box">${barHTML(usoEspacios,COLORS,maxEspacio)}</div>
      `:"<p style='color:#94a3b8;font-size:12px'>Sin datos.</p>"}
    </div>
    <div class="section">
      <div class="section-title">Usuarios por rol</div>
      ${rolItems.length>0?`
        <div class="chart-box" style="margin-bottom:10px">${barHTML(rolItems,Object.values(ROL_COLORS),maxRol)}</div>
        <div class="chart-box">
          ${rolItems.map(({label,value})=>`
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:12px">
              <span style="color:#475569">${label}</span>
              <span style="font-weight:600;color:${ROL_COLORS[label]??"#64748b"}">${value}</span>
            </div>`).join("")}
          <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:12px;font-weight:700">
            <span>Total</span><span>${statsUsuarios?.total??0}</span>
          </div>
        </div>
      `:"<p style='color:#94a3b8;font-size:12px'>Sin datos.</p>"}
    </div>
  </div>
  <div class="section">
    <div class="section-title">Distribución de solicitudes</div>
    <div class="chart-box">
      ${barHTML([{label:"Aprobadas",value:aprobadas},{label:"Pendientes",value:pendientes},{label:"Rechazadas",value:rechazadas}],
        ["#10b981","#f59e0b","#ef4444"],Math.max(aprobadas,pendientes,rechazadas,1))}
    </div>
  </div>
  ${usoEspacios.length>0?`
  <div class="section">
    <div class="section-title">Detalle uso por espacio</div>
    <table><thead><tr><th>#</th><th>Espacio</th><th>Total reservas</th><th>Horas totales</th></tr></thead>
    <tbody>${usoEspacios.map((e,i)=>`<tr><td>${i+1}</td><td>${e.nombre}</td><td><strong>${e.total_reservas}</strong></td><td>${e.horas_totales??0}h</td></tr>`).join("")}</tbody>
    </table>
  </div>`:""}
  ${datos?.length?`
  <div class="section">
    <div class="section-title">Datos del reporte</div>
    <table><thead><tr>${Object.keys(datos[0]).map(k=>`<th>${k.replace(/_/g," ")}</th>`).join("")}</tr></thead>
    <tbody>${datos.map(r=>`<tr>${Object.values(r).map(v=>`<td>${v??""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`:""}
  <div class="footer">
    <span>SGED · UPTC Sogamoso</span>
    <span>Generado: ${fmt(fechaGeneracion)}</span>
  </div>
  </body></html>`;

  const win = window.open("","_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(()=>win.print(),400);
}

async function descargarReporte(reporte, statsEspacios, statsUsuarios, solicitudes) {
  const { formato, tipoReporte, datos, fechaGeneracion, parametros } = reporte;
  const nombre = `reporte_${tipoReporte}_${fechaGeneracion?.slice(0,10)??"export"}`;
  if (formato === "PDF") {
    // jsPDF — descarga directa sin popup
    await generarPDFReporte({ reporte, statsEspacios, statsUsuarios, solicitudes });
  } else if (formato === "JSON") {
    triggerDownload(new Blob([JSON.stringify({tipoReporte,fechaGeneracion,parametros,datos},null,2)],
      {type:"application/json"}),`${nombre}.json`);
  } else if (formato === "CSV") {
    const filas = Array.isArray(datos)?datos:[datos??{}];
    const keys  = Object.keys(filas[0]??{});
    const csv   = [keys.join(","),...filas.map(f=>keys.map(k=>f[k]??"").join(","))].join("\n");
    triggerDownload(new Blob([csv],{type:"text/csv"}),`${nombre}.csv`);
  }
}

/* ══════════════════════════════════════════ CUSTOM DATE PICKER ═══ */
function CustomDatePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(value ? new Date(value+"T00:00").getFullYear()  : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? new Date(value+"T00:00").getMonth()     : today.getMonth());

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const selected    = value ? new Date(value+"T00:00") : null;

  const selectDay = (day) => {
    const d = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    onChange({ target: { value: d } });
    setOpen(false);
  };

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);

  return (
    <div className="cdp-root" ref={ref}>
      <button type="button" className={`cdp-trigger${open?" is-open":""}`}
        onClick={()=>setOpen(v=>!v)}>
        <span className="cdp-icon">📅</span>
        <span className="cdp-value">{value || "Seleccionar fecha"}</span>
        <svg className="cs-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 6 8 10 12 6"/>
        </svg>
      </button>

      {open && (
        <div className="cdp-panel animate-slideUp">
          <div className="cdp-nav">
            <button className="cdp-nav-btn" onClick={prevMonth}>‹</button>
            <span className="cdp-nav-title">
              {MESES_ES[viewMonth]} {viewYear}
            </span>
            <button className="cdp-nav-btn" onClick={nextMonth}>›</button>
          </div>
          <div className="cdp-weekdays">
            {["Do","Lu","Ma","Mi","Ju","Vi","Sá"].map(d=>(
              <span key={d} className="cdp-weekday">{d}</span>
            ))}
          </div>
          <div className="cdp-grid">
            {cells.map((day,i)=>{
              if (!day) return <div key={`e-${i}`} />;
              const isSelected = selected &&
                selected.getDate()===day &&
                selected.getMonth()===viewMonth &&
                selected.getFullYear()===viewYear;
              const isToday = today.getDate()===day &&
                today.getMonth()===viewMonth &&
                today.getFullYear()===viewYear;
              return (
                <button key={day} type="button"
                  className={`cdp-day${isSelected?" is-selected":""}${isToday&&!isSelected?" is-today":""}`}
                  onClick={()=>selectDay(day)}>
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button className="cdp-clear" onClick={()=>{onChange({target:{value:""}});setOpen(false);}}>
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════ HEATMAP ═══ */
function Heatmap({ data }) {
  const today   = new Date();
  const year    = today.getFullYear();
  const month   = today.getMonth();
  const days    = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // mapear datos del backend
  const countMap = {};
  (data||[]).forEach(({fecha, total}) => {
    const d = new Date(fecha+"T00:00").getDate();
    countMap[d] = total;
  });
  const maxVal = Math.max(...Object.values(countMap), 1);

  const getLevel = (count) => {
    if (!count) return 0;
    const pct = count/maxVal;
    if (pct < 0.25) return 1;
    if (pct < 0.5)  return 2;
    if (pct < 0.75) return 3;
    return 4;
  };

  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=days;d++) cells.push(d);

  return (
    <div>
      <div className="heatmap-header">
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d=>(
          <span key={d} className="text-xs text-muted">{d}</span>
        ))}
      </div>
      <div className="heatmap-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="heatmap-cell heatmap-cell--0" style={{opacity:0}} />;
          const count = countMap[day] ?? 0;
          const level = getLevel(count);
          return (
            <div key={day}
              className={`heatmap-cell heatmap-cell--${level}`}
              title={`${day} ${MESES_ES[month]}: ${count} solicitud${count!==1?"es":""}`}
            />
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span className="text-xs text-muted">Menos</span>
        {[0,1,2,3,4].map(l=>(
          <div key={l} className={`heatmap-cell heatmap-cell--${l}`} style={{position:"static"}}/>
        ))}
        <span className="text-xs text-muted">Más</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ MODAL ANÁLISIS ═══ */
const TooltipCustom = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{
      background:"var(--surface2)", border:"1px solid var(--border2)",
      borderRadius:"var(--radius-sm)", padding:"10px 14px", fontSize:12,
    }}>
      <p style={{fontWeight:600,marginBottom:6,color:"var(--text)"}}>{label}</p>
      {payload.map(p=>(
        <p key={p.dataKey} style={{color:p.color}}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function AnalisisModal({ open, onClose, tendencia, statsEspacios, statsUsuarios, solicitudes }) {
  if (!open) return null;

  const usoEspacios = statsEspacios?.uso_por_espacio ?? [];
  const porRol      = statsUsuarios?.por_rol ?? {};
  const rolData     = Object.entries(porRol).map(([name,value])=>({name,value}));

  const tendData = (tendencia||[]).map(t=>({
    mes: t.mes?.slice(5) ? `${MESES_ES[parseInt(t.mes.slice(5))-1]}` : t.mes,
    Aprobadas:  t.aprobadas,
    Rechazadas: t.rechazadas,
    Pendientes: t.pendientes,
  }));

  const espacioData = usoEspacios.map(e=>({
    name:  e.nombre.length>12 ? e.nombre.slice(0,11)+"…" : e.nombre,
    Reservas: e.total_reservas??0,
    Horas:    e.horas_totales??0,
  }));

  return (
    <ModalPortal>
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--scroll animate-slideUp"
        style={{ maxWidth:780 }}
        onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">📊 Análisis avanzado</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{display:"flex",flexDirection:"column",gap:28}}>

          {/* Tendencia 6 meses */}
          {tendData.length > 0 && (
            <div>
              <p className="rp-chart-title">Tendencia de solicitudes — últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendData} margin={{top:5,right:16,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{fontSize:11,fill:"var(--text3)"}} />
                  <YAxis tick={{fontSize:11,fill:"var(--text3)"}} />
                  <Tooltip content={<TooltipCustom/>} />
                  <Legend wrapperStyle={{fontSize:12}} />
                  <Line type="monotone" dataKey="Aprobadas"  stroke="#10b981" strokeWidth={2} dot={{r:4}} />
                  <Line type="monotone" dataKey="Rechazadas" stroke="#ef4444" strokeWidth={2} dot={{r:4}} />
                  <Line type="monotone" dataKey="Pendientes" stroke="#b45309" strokeWidth={2} dot={{r:4}} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Barras comparativas: Reservas vs Horas por espacio */}
          <div>
            <p className="rp-chart-title">Reservas vs Horas por espacio</p>
            {espacioData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ReBarChart data={espacioData} margin={{top:5,right:16,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{fontSize:10,fill:"var(--text3)"}} />
                  <YAxis tick={{fontSize:11,fill:"var(--text3)"}} allowDecimals={false} />
                  <Tooltip content={<TooltipCustom/>} />
                  <Legend wrapperStyle={{fontSize:12}} />
                  <Bar dataKey="Reservas" fill="#f5b400" radius={[4,4,0,0]} />
                  <Bar dataKey="Horas"    fill="#0891b2" radius={[4,4,0,0]} />
                </ReBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="rp-empty-chart">Sin datos de uso de espacios todavía.</p>
            )}
          </div>

          {/* Pie: distribución por rol */}
          {rolData.length > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:24}}>
              <div style={{flex:1}}>
                <p className="rp-chart-title">Distribución de usuarios por rol</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={rolData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={44}
                      paddingAngle={3}>
                      {rolData.map(({name},i)=>(
                        <Cell key={name} fill={ROL_COLORS[name]??COLORS[i%COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipCustom/>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:140}}>
                {rolData.map(({name,value})=>(
                  <div key={name} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{
                      width:10,height:10,borderRadius:"50%",flexShrink:0,
                      background:ROL_COLORS[name]??"#64748b"
                    }}/>
                    <span style={{fontSize:12,color:"var(--text2)",flex:1}}>{name}</span>
                    <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barras apiladas: estado solicitudes por mes */}
          {tendData.length > 0 && (
            <div>
              <p className="rp-chart-title">Volumen de solicitudes por mes (apilado)</p>
              <ResponsiveContainer width="100%" height={200}>
                <ReBarChart data={tendData} margin={{top:5,right:16,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{fontSize:11,fill:"var(--text3)"}} />
                  <YAxis tick={{fontSize:11,fill:"var(--text3)"}} />
                  <Tooltip content={<TooltipCustom/>} />
                  <Legend wrapperStyle={{fontSize:12}} />
                  <Bar dataKey="Aprobadas"  stackId="a" fill="#10b981" />
                  <Bar dataKey="Pendientes" stackId="a" fill="#d97706" />
                  <Bar dataKey="Rechazadas" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ══════════════════════════════════════ MODAL DETALLE REPORTE ═══ */
function DetalleReporteModal({ reporte, statsEspacios, statsUsuarios, solicitudes, onClose }) {
  if (!reporte) return null;
  const { tipoReporte, formato, fechaGeneracion, parametros, datos, administradorId } = reporte;
  return (
    <ModalPortal>
    <div className="modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="modal-box modal-box--scroll animate-slideUp" style={{maxWidth:560}}
        onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title font-syne">📊 Detalle del reporte</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="rp-meta-grid">
            {[["Tipo",tipoReporte?.replace(/_/g," ")],["Formato",formato],
              ["Generado",fmt(fechaGeneracion)],["Admin ID",administradorId??"—"]]
              .map(([l,v])=>(
              <div key={l} className="rp-meta-item">
                <span className="detalle-label">{l}</span>
                <span className="detalle-value" style={l==="Admin ID"?{fontSize:11,fontFamily:"monospace"}:{}}>{v}</span>
              </div>
            ))}
          </div>
          {parametros && Object.keys(parametros).length>0 && (
            <div>
              <span className="detalle-label" style={{display:"block",marginBottom:6}}>Parámetros</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {Object.entries(parametros).map(([k,v])=>(
                  <span key={k} className="detalle-chip">{k.replace(/_/g," ")}: <strong>{v}</strong></span>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="detalle-label" style={{display:"block",marginBottom:8}}>Datos</span>
            {datos?.length ? (
              <div className="rp-datos-grid">
                {Object.entries(datos[0]).map(([k,v])=>(
                  <div key={k} className="rp-dato">
                    <span className="rp-dato__val">{v??0}</span>
                    <span className="rp-dato__label">{k.replace(/_/g," ")}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted text-sm">Sin datos.</p>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary"
            onClick={()=>descargarReporte(reporte,statsEspacios,statsUsuarios,solicitudes)}>
            ⬇ Descargar {formato}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ══════════════════════════════════════════════ BARCHART SIMPLE ═══ */
function BarChartSimple({ data, max }) {
  return (
    <div className="bar-chart">
      {data.map(({label,value},i)=>(
        <div key={label} className="bar-chart__row">
          <span className="bar-chart__label" title={label}>
            {label.length>16?label.slice(0,15)+"…":label}
          </span>
          <div className="bar-chart__track">
            <div className="bar-chart__fill"
              style={{width:`${max>0?(value/max)*100:0}%`,background:COLORS[i%COLORS.length]}}/>
          </div>
          <span className="bar-chart__val">{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════ PÁGINA PRINCIPAL ═══ */
export function ReportesPage() {
  const { puede }       = useAuth();
  const { showToast }   = useNotif();
  const { solicitudes, recargarSolicitudes } = useReservas();

  const [generando,      setGenerando]      = useState(false);
  const [historial,      setHistorial]      = useState([]);
  const [loadingHist,    setLoadingHist]    = useState(false);
  const [detalleRep,     setDetalleRep]     = useState(null);
  const [ultimoReporte,  setUltimoReporte]  = useState(null);
  const [analisisOpen,   setAnalisisOpen]   = useState(false);
  const [statsEspacios,  setStatsEspacios]  = useState(null);
  const [statsUsuarios,  setStatsUsuarios]  = useState(null);
  const [heatmapData,    setHeatmapData]    = useState([]);
  const [tendencia,      setTendencia]      = useState([]);
  const [loadingStats,   setLoadingStats]   = useState(false);
  const [loadingAnalisis,setLoadingAnalisis]= useState(false);

  const [form, setForm] = useState({
    tipoReporte:"Estadisticas_Generales", formato:"JSON",
    fecha_inicio:"", fecha_fin:"",
  });

  if (!puede("puedeVerReportes")) {
    return (
      <div className="page">
        <EmptyState icon="🔒" title="Acceso restringido"
          description="Solo Administrativo y Administrador pueden ver reportes (RF14)." />
      </div>
    );
  }

  const totalSolic     = solicitudes.length;
  const aprobadas      = solicitudes.filter(s=>s.estado==="Aprobada").length;
  const rechazadas     = solicitudes.filter(s=>s.estado==="Rechazada").length;
  const pendientes     = solicitudes.filter(s=>s.estado==="Pendiente").length;
  const tasaAprobacion = Math.round((aprobadas/(totalSolic||1))*100);

  // Carga inicial: solo stats livianas + historial
  const cargarStats = useCallback(async () => {
    setLoadingStats(true);
    const [se, su, hm] = await Promise.allSettled([
      obtenerStatsEspacios(),
      obtenerStatsUsuarios(),
      obtenerHeatmapReportes(),
    ]);
    // Cada estadística se aplica por separado: si una falla, las demás
    // siguen mostrándose (antes un solo fallo dejaba todo en null).
    if (se.status === "fulfilled") setStatsEspacios(se.value);
    if (su.status === "fulfilled") setStatsUsuarios(su.value);
    if (hm.status === "fulfilled") {
      const v = hm.value;
      setHeatmapData(Array.isArray(v) ? v : v?.datos ?? []);
    }
    setLoadingStats(false);
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoadingHist(true);
    try {
      const resp = await reportesSvc.listarReportes({ por_pagina:20 });
      if (resp?.datos) setHistorial(resp.datos);
      else if (Array.isArray(resp)) setHistorial(resp);
    } catch { /* silencioso */ }
    finally { setLoadingHist(false); }
  }, []);

  useEffect(() => {
    cargarHistorial();
    cargarStats();
    // Refrescar solicitudes desde el servidor para que los conteos
    // (total, aprobadas, pendientes, rechazadas) estén actualizados al entrar.
    recargarSolicitudes?.();
  }, [cargarHistorial, cargarStats, recargarSolicitudes]);

  // Recargar estadísticas si se crea/edita/elimina un espacio en otra vista.
  useEffect(() => {
    const handler = () => cargarStats();
    window.addEventListener("sged:espacios-actualizados", handler);
    return () => window.removeEventListener("sged:espacios-actualizados", handler);
  }, [cargarStats]);

  // Análisis avanzado — solo al pulsar el botón
  const generarAnalisis = async () => {
    setLoadingAnalisis(true);
    try {
      const data = await obtenerTendenciaReportes();
      setTendencia(Array.isArray(data) ? data : data?.datos ?? []);
      setAnalisisOpen(true);
    } catch { showToast("Error al cargar el análisis."); }
    finally { setLoadingAnalisis(false); }
  };

  const generarReporte = async () => {
    setGenerando(true);
    try {
      const body = {
        tipoReporte: form.tipoReporte,
        formato:     form.formato,
        ...(form.fecha_inicio && { fecha_inicio:form.fecha_inicio }),
        ...(form.fecha_fin    && { fecha_fin:form.fecha_fin }),
      };
      const resp = await reportesSvc.generarReporte(body);
      setHistorial(prev=>[resp,...prev]);
      setUltimoReporte(resp);
      showToast("✓ Reporte generado correctamente.");
    } catch (err) {
      showToast(err.message ?? "Error al generar el reporte.");
    } finally {
      setGenerando(false);
    }
  };

  const setField = (k) => (e) => setForm(p=>({...p,[k]:e.target?.value??e}));

  const porEstado   = [{label:"Aprobadas",value:aprobadas},{label:"Pendientes",value:pendientes},{label:"Rechazadas",value:rechazadas}];
  const maxEstado   = Math.max(...porEstado.map(e=>e.value),1);
  const usoEspacios = statsEspacios?.uso_por_espacio ?? [];
  const maxEspacio  = Math.max(...usoEspacios.map(e=>e.total_reservas??0),1);
  const porRol      = statsUsuarios?.por_rol ?? {};
  const rolData     = Object.entries(porRol).map(([label,value])=>({label,value}));
  const maxRol      = Math.max(...rolData.map(r=>r.value),1);
  const mesActual   = MESES_ES[new Date().getMonth()];

  return (
    <div className="page animate-fadeIn">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Reportes y <span style={{color:"var(--accent-text)"}}>Estadísticas</span>
          </h1>
          <p className="page-sub">Análisis de uso y gestión de espacios deportivos (RF14)</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm"
            onClick={()=>{ cargarHistorial(); cargarStats(); }}
            disabled={loadingHist||loadingStats}>
            {loadingHist||loadingStats?"Actualizando…":"↻ Actualizar"}
          </button>
          <button className="btn btn-primary btn-sm"
            onClick={generarAnalisis}
            disabled={loadingAnalisis}>
            {loadingAnalisis ? <><span className="lp-spinner"/>Cargando…</> : "📊 Generar análisis"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard label="Total solicitudes"  value={totalSolic}           sub="Historial completo"  color="azul"     />
        <StatCard label="Tasa aprobación"    value={`${tasaAprobacion}%`} sub="Promedio"            color="verde"    />
        <StatCard label="Pendientes"         value={pendientes}           sub="Por gestionar"       color="amarillo" />
        <StatCard label="Espacios activos"   value={statsEspacios?.disponibles??"—"} sub="Disponibles ahora" color="azul" />
      </div>

      {/* Generador */}
      <Card style={{marginBottom:20}}>
        <CardTitle>Generar nuevo reporte</CardTitle>
        <div className="rp-form-grid">
          <div className="modal-field">
            <label className="modal-label">Tipo de reporte</label>
            <CustomSelect name="tipoReporte" value={form.tipoReporte}
              onChange={e=>setField("tipoReporte")(e.target.value)} options={TIPO_OPTS}/>
          </div>
          <div className="modal-field">
            <label className="modal-label">Formato</label>
            <CustomSelect name="formato" value={form.formato}
              onChange={e=>setField("formato")(e.target.value)} options={FORMATO_OPTS}/>
          </div>
          <div className="modal-field">
            <label className="modal-label">Fecha inicio</label>
            <CustomDatePicker value={form.fecha_inicio} onChange={setField("fecha_inicio")}/>
          </div>
          <div className="modal-field">
            <label className="modal-label">Fecha fin</label>
            <CustomDatePicker value={form.fecha_fin} onChange={setField("fecha_fin")}/>
          </div>
        </div>
        <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-primary" onClick={generarReporte} disabled={generando}>
            {generando?<><span className="lp-spinner"/>Generando…</>:"⬇ Generar reporte"}
          </button>
          {ultimoReporte && (
            <>
              <button className="btn btn-ghost" onClick={()=>setDetalleRep(ultimoReporte)}>
                Ver último resultado
              </button>
              <button className="btn btn-ghost btn-sm"
                onClick={()=>descargarReporte(ultimoReporte,statsEspacios,statsUsuarios,solicitudes)}>
                ⬇ Descargar {ultimoReporte.formato}
              </button>
            </>
          )}
        </div>
      </Card>

      {/* Datos último reporte */}
      {ultimoReporte?.datos?.length>0 && (
        <Card style={{marginBottom:20,borderColor:"var(--accent-md)",marginTop:25}}>
          <CardTitle>
            Datos generados — {ultimoReporte.tipoReporte?.replace(/_/g," ")}
            <span style={{fontSize:11,color:"var(--text3)",marginLeft:10}}>
              {fmtDate(ultimoReporte.fechaGeneracion)}
            </span>
          </CardTitle>
          <div className="rp-datos-grid">
            {Object.entries(ultimoReporte.datos[0]).map(([k,v])=>(
              <div key={k} className="rp-dato">
                <span className="rp-dato__val">{v??0}</span>
                <span className="rp-dato__label">{k.replace(/_/g," ")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cards de gráficas */}
      <div className="report-grid">

        <Card>
          <CardTitle>Distribución de solicitudes</CardTitle>
          <BarChartSimple data={porEstado} max={maxEstado}/>
          <div className="report-totals">
            {[{label:"Aprobadas",value:aprobadas,color:"var(--verde)"},
              {label:"Pendientes",value:pendientes,color:"var(--amarillo)"},
              {label:"Rechazadas",value:rechazadas,color:"var(--rojo)"}]
              .map(({label,value,color})=>(
              <div key={label} className="report-totals__item">
                <span className="report-totals__val" style={{color}}>{value}</span>
                <span className="text-xs text-muted">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Espacios más utilizados</CardTitle>
          {usoEspacios.length>0 ? (
            <>
              <div className="rp-top-espacio">
                <span className="rp-top-espacio__emoji">🏆</span>
                <div>
                  <div className="rp-top-espacio__name">{usoEspacios[0]?.nombre}</div>
                  <div className="text-xs text-muted">
                    {usoEspacios[0]?.total_reservas} reservas · {usoEspacios[0]?.horas_totales??0}h
                  </div>
                </div>
              </div>
              <BarChartSimple
                data={usoEspacios.map(e=>({label:e.nombre,value:e.total_reservas??0}))}
                max={maxEspacio}/>
            </>
          ) : <p className="text-muted text-sm">Cargando datos…</p>}
        </Card>

        <Card>
          <CardTitle>Usuarios por rol</CardTitle>
          {rolData.length>0 ? (
            <>
              <BarChartSimple data={rolData} max={maxRol}/>
              <div className="rp-datos-grid" style={{marginTop:12}}>
                {rolData.map(({label,value})=>(
                  <div key={label} className="rp-dato">
                    <span className="rp-dato__val" style={{color:ROL_COLORS[label]??"var(--accent)"}}>{value}</span>
                    <span className="rp-dato__label">{label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-muted text-sm">Cargando datos…</p>}
        </Card>

        <Card>
          <CardTitle>Estado de espacios</CardTitle>
          {statsEspacios ? (
            <div className="rp-datos-grid">
              {[{label:"Total",value:statsEspacios.total??0,color:"var(--accent-text)"},
                {label:"Disponibles",value:statsEspacios.disponibles??0,color:"var(--verde)"},
                {label:"Mantenimiento",value:statsEspacios.mantenimiento??0,color:"var(--amarillo)"},
                {label:"Ocupados",value:statsEspacios.ocupados??0,color:"var(--rojo)"}]
                .map(({label,value,color})=>(
                <div key={label} className="rp-dato">
                  <span className="rp-dato__val" style={{color}}>{value}</span>
                  <span className="rp-dato__label">{label}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted text-sm">Cargando datos…</p>}
        </Card>

        {/* Heatmap mes actual */}
        <Card style={{width:"fit-content"}}>
          <CardTitle>
            Actividad del mes — {mesActual} {new Date().getFullYear()}
            <span style={{fontSize:11,color:"var(--text3)",marginLeft:8}}>
              Solicitudes por día
            </span>
          </CardTitle>
          <Heatmap data={heatmapData}/>
        </Card>

      </div>

      {/* Historial */}
      {historial.length>0 && (
        <Card style={{marginTop:20}}>
          <CardTitle>Historial de reportes generados</CardTitle>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th><th>Formato</th><th>Fecha generación</th>
                  <th>Rango fechas</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((r,i)=>(
                  <tr key={r._id??r.id??i}>
                    <td style={{fontWeight:500}}>{r.tipoReporte?.replace(/_/g," ")}</td>
                    <td><span className="detalle-chip" style={{fontSize:11}}>{r.formato}</span></td>
                    <td className="text-muted text-sm" style={{fontFamily:"monospace"}}>
                      {fmt(r.fechaGeneracion)}
                    </td>
                    <td className="text-muted text-sm">
                      {r.parametros?.fecha_inicio
                        ?`${r.parametros.fecha_inicio} → ${r.parametros.fecha_fin??"…"}`:"—"}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={()=>setDetalleRep(r)}>
                          Ver datos
                        </button>
                        <button className="btn btn-primary btn-sm"
                          onClick={()=>descargarReporte(r,statsEspacios,statsUsuarios,solicitudes)}>
                          ⬇ {r.formato}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modales */}
      {detalleRep && (
        <DetalleReporteModal
          reporte={detalleRep}
          statsEspacios={statsEspacios}
          statsUsuarios={statsUsuarios}
          solicitudes={solicitudes}
          onClose={()=>setDetalleRep(null)}
        />
      )}

      <AnalisisModal
        open={analisisOpen}
        onClose={()=>setAnalisisOpen(false)}
        tendencia={tendencia}
        statsEspacios={statsEspacios}
        statsUsuarios={statsUsuarios}
        solicitudes={solicitudes}
      />
    </div>
  );
}