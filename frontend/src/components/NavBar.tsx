import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="flex gap-4 p-4 bg-gray-100 shadow">
      <Link to="/" className="text-blue-600 font-semibold">Login</Link>
      <Link to="/register" className="text-blue-600">Registrarse</Link>
    </nav>
  );
}