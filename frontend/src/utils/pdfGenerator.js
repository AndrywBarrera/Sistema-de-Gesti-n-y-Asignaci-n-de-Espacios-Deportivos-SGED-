/**
 * utils/pdfGenerator.js
 * Genera PDFs de reportes SGED usando jsPDF + jsPDF-autotable.
 * Descarga directo sin popups ni window.open.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ── Paleta ────────────────────────────────────────────────────────────────── */
const C = {
  azul:     [59,  130, 246],
  cian:     [6,   182, 212],
  verde:    [16,  185, 129],
  amarillo: [245, 158, 11],
  rojo:     [239, 68,  68],
  morado:   [139, 92,  246],
  slate900: [15,  23,  42],
  slate700: [51,  65,  85],
  slate500: [100, 116, 139],
  slate400: [148, 163, 184],
  slate300: [148, 163, 184],
  slate100: [241, 245, 249],
  slate50:  [248, 250, 252],
  white:    [255, 255, 255],
};

const ROL_COLORS = {
  Estudiante:    C.azul,
  Docente:       C.verde,
  Empleado:      C.amarillo,
  Administrativo:C.cian,
  Administrador: C.morado,
};

const ESTADO_COLORS = {
  Aprobada:   C.verde,
  Pendiente:  C.amarillo,
  Rechazada:  C.rojo,
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/* ── Helpers internos ──────────────────────────────────────────────────────── */
const fmt = (d) => !d ? "—" : new Date(d).toLocaleString("es-CO",
  { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

function colorForIndex(i) {
  const palette = [C.azul,C.verde,C.amarillo,C.cian,C.morado,C.rojo];
  return palette[i % palette.length];
}

/* ── Dibuja una barra horizontal ───────────────────────────────────────────── */
function drawBar(doc, x, y, label, value, maxVal, color, w = 130) {
  const trackW = w - 50;
  const fillW  = maxVal > 0 ? Math.max((value/maxVal)*trackW, 2) : 2;

  // Label
  doc.setFontSize(8);
  doc.setTextColor(...C.slate500);
  doc.text(label.length > 18 ? label.slice(0,17)+"…" : label, x+36, y+3.5, { align:"right" });

  // Track
  doc.setFillColor(...C.slate100);
  doc.roundedRect(x+40, y, trackW, 5, 2, 2, "F");

  // Fill
  doc.setFillColor(...color);
  doc.roundedRect(x+40, y, fillW, 5, 2, 2, "F");

  // Valor
  doc.setFontSize(8);
  doc.setTextColor(...C.slate700);
  doc.text(String(value), x+w-2, y+3.5, { align:"right" });
}

/* ── Caja de stat ──────────────────────────────────────────────────────────── */
function drawStatBox(doc, x, y, w, h, value, label, color) {
  // Fondo
  doc.setFillColor(...C.slate50);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  // Borde superior de color
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, 2.5, 1, 1, "F");
  // Valor
  doc.setFontSize(18);
  doc.setFont("helvetica","bold");
  doc.setTextColor(...color);
  doc.text(String(value), x+w/2, y+h/2+1, { align:"center" });
  // Label
  doc.setFontSize(7);
  doc.setFont("helvetica","normal");
  doc.setTextColor(...C.slate500);
  doc.text(label.toUpperCase(), x+w/2, y+h-3, { align:"center" });
}

/* ══════════════════════════════════════════════ EXPORTACIÓN PRINCIPAL ═══ */
export async function generarPDFReporte({ reporte, statsEspacios, statsUsuarios, solicitudes }) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const PW  = doc.internal.pageSize.getWidth();   // 210
  const PH  = doc.internal.pageSize.getHeight();  // 297
  const M   = 14; // margen
  let   cy  = M;  // cursor Y

  const { tipoReporte, fechaGeneracion, parametros, datos } = reporte;
  const aprobadas   = solicitudes.filter(s=>s.estado==="Aprobada").length;
  const rechazadas  = solicitudes.filter(s=>s.estado==="Rechazada").length;
  const pendientes  = solicitudes.filter(s=>s.estado==="Pendiente").length;
  const total       = solicitudes.length;
  const tasa        = Math.round((aprobadas/(total||1))*100);
  const usoEspacios = statsEspacios?.uso_por_espacio ?? [];
  const porRol      = statsUsuarios?.por_rol ?? {};
  const rolItems    = Object.entries(porRol).map(([k,v])=>({label:k,value:v}));
  const maxEspacio  = Math.max(...usoEspacios.map(e=>e.total_reservas??0), 1);
  const maxRol      = Math.max(...rolItems.map(r=>r.value), 1);

  /* ── Función para nueva página ── */
  const checkPage = (needed = 20) => {
    if (cy + needed > PH - 18) {
      doc.addPage();
      cy = M;
      drawFooter();
    }
  };

  /* ── Footer en cada página ── */
  const drawFooter = () => {
    const pg = doc.internal.getCurrentPageInfo().pageNumber;
    doc.setFillColor(...C.slate100);
    doc.rect(0, PH-10, PW, 10, "F");
    doc.setFontSize(7);
    doc.setTextColor(...C.slate400);
    doc.setFont("helvetica","normal");
    doc.text("SGED · Universidad Pedagógica y Tecnológica de Colombia · Sogamoso", M, PH-4);
    doc.text(`Pág. ${pg}`, PW-M, PH-4, { align:"right" });
  };

  /* ══════════════════════════════ PORTADA ══════════════════════════════ */

  // Franja superior degradada (azul → cian)
  doc.setFillColor(...C.azul);
  doc.rect(0, 0, PW, 38, "F");
  doc.setFillColor(...C.cian);
  doc.rect(PW-60, 0, 60, 38, "F");
  // Blend visual
  for (let i=0;i<60;i++) {
    const t = i/60;
    const r = Math.round(C.azul[0]*(1-t)+C.cian[0]*t);
    const g = Math.round(C.azul[1]*(1-t)+C.cian[1]*t);
    const b = Math.round(C.azul[2]*(1-t)+C.cian[2]*t);
    doc.setFillColor(r,g,b);
    doc.rect(PW-60+i, 0, 1, 38, "F");
  }

  // Badge "S"
  doc.setFillColor(...C.white);
  doc.roundedRect(M, 8, 22, 22, 4, 4, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica","bold");
  doc.setTextColor(...C.azul);
  doc.text("S", M+11, 22, { align:"center" });

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica","bold");
  doc.setTextColor(...C.white);
  doc.text(`Reporte: ${tipoReporte?.replace(/_/g," ") ?? ""}`, M+28, 17);
  doc.setFontSize(8);
  doc.setFont("helvetica","normal");
  doc.setTextColor(220,240,255);
  doc.text("Sistema de Gestión de Espacios Deportivos · UPTC Sogamoso", M+28, 24);
  doc.text(`Generado: ${fmt(fechaGeneracion)}`, M+28, 30);

  cy = 46;

  // Meta chips
  const metaItems = [
    ["Tipo",    tipoReporte?.replace(/_/g," ")??"-"],
    ...(parametros?.fecha_inicio ? [
      ["Desde", parametros.fecha_inicio],
      ["Hasta", parametros.fecha_fin ?? "—"],
    ] : []),
  ];
  let mx = M;
  metaItems.forEach(([k,v]) => {
    const w = Math.max(doc.getTextWidth(`${k}: ${v}`)+8, 30);
    doc.setFillColor(...C.slate100);
    doc.roundedRect(mx, cy, w, 8, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica","bold");
    doc.setTextColor(...C.slate500);
    doc.text(`${k}: `, mx+4, cy+5.2);
    const kw = doc.getTextWidth(`${k}: `);
    doc.setFont("helvetica","normal");
    doc.setTextColor(...C.slate700);
    doc.text(v, mx+4+kw, cy+5.2);
    mx += w + 4;
  });
  cy += 14;

  /* ══════════════════════════════ STATS ════════════════════════════════ */
  doc.setFontSize(9);
  doc.setFont("helvetica","bold");
  doc.setTextColor(...C.slate700);
  doc.text("RESUMEN GENERAL", M, cy);
  cy += 4;

  const boxW = (PW - M*2 - 9) / 4;
  const boxH = 20;
  const statsRow1 = [
    [total,      "Total solicitudes", C.azul],
    [aprobadas,  "Aprobadas",         C.verde],
    [pendientes, "Pendientes",        C.amarillo],
    [rechazadas, "Rechazadas",        C.rojo],
  ];
  statsRow1.forEach(([val,lbl,col],i) => {
    drawStatBox(doc, M + i*(boxW+3), cy, boxW, boxH, val, lbl, col);
  });
  cy += boxH + 4;

  const statsRow2 = [
    [`${tasa}%`,                       "Tasa aprobación",   C.verde],
    [statsEspacios?.total??0,          "Total espacios",    C.azul],
    [statsEspacios?.disponibles??0,    "Disponibles",       C.verde],
    [statsUsuarios?.total??0,          "Usuarios totales",  C.slate500],
  ];
  statsRow2.forEach(([val,lbl,col],i) => {
    drawStatBox(doc, M + i*(boxW+3), cy, boxW, boxH, val, lbl, col);
  });
  cy += boxH + 8;

  /* ══════════════════════════════ DISTRIBUCIÓN SOLICITUDES ════════════ */
  checkPage(50);
  doc.setFontSize(9);
  doc.setFont("helvetica","bold");
  doc.setTextColor(...C.slate700);
  doc.text("DISTRIBUCIÓN DE SOLICITUDES", M, cy);
  cy += 5;

  const solData = [
    {label:"Aprobadas",  value:aprobadas,  color:C.verde},
    {label:"Pendientes", value:pendientes, color:C.amarillo},
    {label:"Rechazadas", value:rechazadas, color:C.rojo},
  ];
  solData.forEach(({label,value,color}) => {
    drawBar(doc, M, cy, label, value, total||1, color, PW-M*2);
    cy += 8;
  });
  cy += 4;

  /* ══════════════════════════════ USO POR ESPACIO ════════════════════ */
  if (usoEspacios.length > 0) {
    checkPage(usoEspacios.length*8+20);
    doc.setFontSize(9);
    doc.setFont("helvetica","bold");
    doc.setTextColor(...C.slate700);
    doc.text("USO POR ESPACIO (RESERVAS)", M, cy);
    cy += 3;

    // Trofeo: espacio #1
    let top = usoEspacios[0];

    for(let i=0; i<usoEspacios.length; i++) {
        if(usoEspacios[i].horas_totales > top.horas_totales) {
            top = usoEspacios[i];
        }
    }
    
    doc.setFillColor(...C.amarillo);
    doc.setFillColor(255,247,230);
    doc.roundedRect(M, cy, PW-M*2, 12, 2, 2, "F");
    doc.setFillColor(...C.amarillo);
    doc.roundedRect(M, cy, 3, 12, 1, 1, "F");
    // Trofeo dibujado con formas
    const tx = M + 6;
    const ty = cy + 2;
    doc.setFillColor(...C.amarillo);
    doc.roundedRect(tx, ty, 6, 5, 1, 1, "F");       // copa
    doc.rect(tx+2, ty+5, 2, 2, "F");                 // pie
    doc.rect(tx+1, ty+7, 4, 1, "F");                 // base
    doc.setFillColor(255,200,0);
    doc.circle(tx+3, ty+2.5, 1.2, "F");             // brillo
 
    doc.setFontSize(9);
    doc.setFont("helvetica","bold");
    doc.setTextColor(...C.amarillo);
    doc.text(top.nombre, M+16, cy+5);
    doc.setFontSize(8);
    doc.setFont("helvetica","normal");
    doc.setTextColor(...C.slate500);
    doc.text(`${top.total_reservas} reservas · ${top.horas_totales??0}h totales`, M+16, cy+9.5);
    cy += 16;

    usoEspacios.forEach(({nombre,total_reservas},i) => {
      drawBar(doc, M, cy, nombre, total_reservas??0, maxEspacio, colorForIndex(i), PW-M*2);
      cy += 8;
    });

    cy += 4;

    // Tabla detallada
    checkPage(30);
    autoTable(doc, {
      startY: cy,
      head: [["#","Espacio","Reservas","Horas totales","Estado"]],
      body: usoEspacios.map((e,i) => [
        i+1, e.nombre, e.total_reservas??0,
        `${e.horas_totales??0}h`, e.estado??"—",
      ]),
      theme: "grid",
      headStyles: {
        fillColor: C.azul,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: C.slate700 },
      alternateRowStyles: { fillColor: C.slate50 },
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 8, halign:"center" },
        2: { halign:"center" },
        3: { halign:"center" },
        4: { halign:"center" },
      },
    });
    cy = doc.lastAutoTable.finalY + 8;
  }

  /* ══════════════════════════════ USUARIOS POR ROL ═══════════════════ */
  if (rolItems.length > 0) {
    checkPage(rolItems.length*8+20);
    doc.setFontSize(9);
    doc.setFont("helvetica","bold");
    doc.setTextColor(...C.slate700);
    doc.text("USUARIOS POR ROL", M, cy);
    cy += 5;

    rolItems.forEach(({label,value}) => {
      drawBar(doc, M, cy, label, value, maxRol, ROL_COLORS[label]??C.azul, PW-M*2);
      cy += 8;
    });
    cy += 4;

    // Mini tabla resumen
    checkPage(25);
    autoTable(doc, {
      startY: cy,
      head: [["Rol","Cantidad","%"]],
      body: rolItems.map(({label,value}) => [
        label,
        value,
        `${Math.round((value/(statsUsuarios?.total||1))*100)}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: C.cian, textColor: C.white, fontStyle:"bold", fontSize:8 },
      bodyStyles: { fontSize: 8, textColor: C.slate700 },
      alternateRowStyles: { fillColor: C.slate50 },
      margin: { left: M, right: M },
      columnStyles: {
        1: { halign:"center" },
        2: { halign:"center" },
      },
    });
    cy = doc.lastAutoTable.finalY + 8;
  }

  /* ══════════════════════════════ DATOS MONGODB ══════════════════════ */
  if (datos?.length) {
    checkPage(30);
    doc.setFontSize(9);
    doc.setFont("helvetica","bold");
    doc.setTextColor(...C.slate700);
    doc.text("DATOS DEL REPORTE (MONGODB)", M, cy);
    cy += 4;

    const keys = Object.keys(datos[0]);
    autoTable(doc, {
      startY: cy,
      head: [keys.map(k=>k.replace(/_/g," ").toUpperCase())],
      body: datos.map(row => keys.map(k => row[k]??"")),
      theme: "grid",
      headStyles: { fillColor: C.slate700, textColor: C.white, fontStyle:"bold", fontSize:7.5 },
      bodyStyles: { fontSize: 8, textColor: C.slate700 },
      alternateRowStyles: { fillColor: C.slate50 },
      margin: { left: M, right: M },
    });
    cy = doc.lastAutoTable.finalY + 8;
  }

  /* ── Footer en todas las páginas ── */
  const totalPages = doc.internal.getNumberOfPages();
  for (let p=1; p<=totalPages; p++) {
    doc.setPage(p);
    drawFooter();
  }

  /* ── Descarga ── */
  const nombre = `reporte_${tipoReporte}_${fechaGeneracion?.slice(0,10)??"export"}.pdf`;
  doc.save(nombre);
}