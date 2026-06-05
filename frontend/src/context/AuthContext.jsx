/**
 * context/AuthContext.jsx
 * Gestión de sesión con JWT real.
 * Conecta con authService → /api/v1/auth
 * En desarrollo (VITE_USE_MOCK=true) usa datos mock sin backend.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import * as authService from "../services/authService";
import { tokenStore } from "../api/client"; // ← añade este import
import { PERMISOS } from "../data/mockData";
import { listarEspacios } from "../services/espaciosService";


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ← true: espera rehidratación
  const [error, setError] = useState(null);
  const [espacios, setEspacios] = useState([]);

  const cargarEspacios = async () => {
    const data = await listarEspacios();
    setEspacios(data);
  };

  useEffect(() => {
    const rehidratar = async () => {
      if (!tokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const data = await authService.getMe(); 
        const usuarioData = data.usuario ?? data;
        setUser({
          ...usuarioData,
          permisos: PERMISOS[usuarioData.rol] ?? PERMISOS.Estudiante,
        });
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    rehidratar();
  }, []); // solo al montar

  // Sesión expirada → forzar logout desde el cliente HTTP
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setError("Tu sesión expiró. Por favor, inicia sesión de nuevo.");
    };
    window.addEventListener("sged:session-expired", handler);
    return () => window.removeEventListener("sged:session-expired", handler);
  }, []);

  /** POST /auth/login */
  const login = useCallback(async (correo, password) => {
    setLoading(true);
    setError(null);
    try {
      let usuarioData;
      
      const resp = await authService.login(correo, password);
      usuarioData = resp.usuario;
      await cargarEspacios(); // Carga espacios al iniciar sesión (necesario para el calendario)

      setUser({
        ...usuarioData,
        permisos: PERMISOS[usuarioData.rol] ?? PERMISOS.Estudiante,
      });
    } catch (err) {
      const msg = err.message ?? "Error al iniciar sesión.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [cargarEspacios, setUser, setError, setLoading]);

  /** POST /auth/logout */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setError(null);
      sessionStorage.removeItem("sged_mock_user"); // limpia mock también
    }
  }, []);

  /** PUT /auth/cambiar-password */
  const cambiarPassword = useCallback(async (actual, nueva) => {
    return authService.cambiarPassword(actual, nueva);
  }, []);

  const puede = useCallback(
    (permiso) => user?.permisos?.[permiso] ?? false,
    [user],
  );
  const esRol = useCallback((...roles) => roles.includes(user?.rol), [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        cambiarPassword,
        puede,
        esRol,
        espacios,
        cargarEspacios,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
