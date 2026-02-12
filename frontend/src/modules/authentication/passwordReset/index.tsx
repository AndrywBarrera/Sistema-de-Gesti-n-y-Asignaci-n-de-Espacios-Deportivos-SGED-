import { useState, ChangeEvent, FormEvent } from "react";
import { http } from "../../../api/axios";
import styles from "./passwordReset.module.css";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Hacer la solicitud para resetear la contraseña
      await http.post("/api/password-reset", { email });
      setMessage("Te hemos enviado un correo para resetear tu contraseña.");
    } catch (err) {
      setError("Hubo un error al intentar resetear la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Restablecer Contraseña</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          value={email}
          onChange={handleChange}
          placeholder="Correo electrónico"
          className="w-full p-2 border rounded-md"
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md">
          {loading ? "Cargando..." : "Restablecer Contraseña"}
        </button>
      </form>
      {message && <p className={styles.successMessage}>{message}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
