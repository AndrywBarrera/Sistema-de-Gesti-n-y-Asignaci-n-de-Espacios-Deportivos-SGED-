import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ReservasProvider } from "./context/ReservasContext";
import { NotifProvider } from "./context/NotifContext";

import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Toast } from "./components/ui/index";

import { LoginPage }          from "./pages/LoginPage";
import { DashboardPage }      from "./pages/DashboardPage";
import { CalendarioPage }     from "./pages/CalendarioPage";
import { EspaciosPage }       from "./pages/EspaciosPage";
import { NotificacionesPage } from "./pages/NotificacionesPage";
import { SolicitudesPage }    from "./pages/SolicitudesPage";
import { ReportesPage }       from "./pages/ReportesPage";
import { UsuariosPage }       from "./pages/UsuariosPage";

import "./styles/global.css";
import "./styles/components.css";

// ─── PANTALLA DE CARGA ────────────────────────────────────────────────────────
// Se muestra mientras AuthContext verifica si hay sesión activa (rehidratación).
// Evita el flash al login cuando el usuario ya estaba autenticado.
function AppLoading() {
  return (
    <div className="app-loading">
      <div className="app-loading__badge">
        <span className="app-loading__letter">S</span>
      </div>
      <div className="app-loading__spinner" />
      <p className="app-loading__text">Verificando sesión…</p>
    </div>
  );
}

// ─── INNER APP (con contextos ya disponibles) ─────────────────────────────────
function AppInner() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");

  // Mientras rehidrata la sesión, muestra pantalla de carga (no redirige al login)
  if (loading) return <AppLoading />;

  // Sin sesión → login
  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":      return <DashboardPage      onNavigate={setActivePage} />;
      case "calendario":     return <CalendarioPage />;
      case "espacios":       return <EspaciosPage />;
      case "notificaciones": return <NotificacionesPage />;
      case "solicitudes":    return <SolicitudesPage />;
      case "reportes":       return <ReportesPage />;
      case "usuarios":       return <UsuariosPage />;
      default:               return <DashboardPage      onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="sged-app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="sged-main">
        <Topbar activePage={activePage} />
        <main className="sged-content">
          {renderPage()}
        </main>
      </div>
      <Toast />
    </div>
  );
}

// ─── ROOT — envuelve todo en providers ───────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <NotifProvider>
        <ReservasProvider>
          <AppInner />
        </ReservasProvider>
      </NotifProvider>
    </AuthProvider>
  );
}