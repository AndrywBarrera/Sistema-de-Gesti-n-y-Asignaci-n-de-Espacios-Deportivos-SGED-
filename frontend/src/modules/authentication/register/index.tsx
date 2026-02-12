import { useState, ChangeEvent, FormEvent } from "react";
import { http } from "../../../api/axios";
import styles from "./register.module.css";  // Importas el archivo CSS Module

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await http.post("/api/register", form);
      // Redirigir a la siguiente página si el registro es exitoso
    } catch (err) {
      setError("Error en el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}> {/* Aquí usas las clases definidas en el CSS Module */}
      <h1 className={styles.title}>Registro</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Nombre de usuario"
          className="w-full p-2 border rounded-md"
        />
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
          {loading ? "Cargando..." : "Registrar"}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
