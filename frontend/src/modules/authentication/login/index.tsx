import { useState, ChangeEvent, FormEvent } from "react";
import { http,setAuthToken,setRefreshToken } from "../../../api/axios";
import styles from "./login.module.css";  // Aquí importas el archivo CSS Module

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await http.post("/api/login", form);
      setAuthToken(response.data.accessToken);
      setRefreshToken(response.data.refreshToken);
      // Redirigir a la siguiente página si el login es exitoso
    } catch (err) {
      setError("Credenciales incorrectas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}> {/* Aquí usas las clases definidas en el CSS Module */}
      <h1 className={styles.title}>Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Correo electrónico"
          className="w-full p-2 border rounded-md"
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Contraseña"
          className="w-full p-2 border rounded-md"
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md">
          {loading ? "Cargando..." : "Iniciar sesión"}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
