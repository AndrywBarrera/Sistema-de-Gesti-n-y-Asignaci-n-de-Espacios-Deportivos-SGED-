import { Routes, Route } from "react-router-dom";
import RegisterPage from "./modules/authentication/register/index";
import LoginPage from "./modules/authentication/login/index";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./routes/ProtectedRoute";
import PasswordResetPage from "./modules/authentication/passwordReset/index";

export default function App() {
  return (
    <>
      <NavBar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/usuarios" element={<PasswordResetPage />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}
