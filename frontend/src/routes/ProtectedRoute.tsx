import { Navigate, Outlet } from "react-router-dom";
import { getAuthToken } from "../api/axios";

export default function ProtectedRoute() {
  const isAuth = !!getAuthToken();
  return isAuth ? <Outlet /> : <Navigate to="/" replace />;
}
