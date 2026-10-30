import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types";

interface ProtectedRouteProps {
  element: ReactElement;
  /** Se informado, além de logado o usuário precisa ter uma dessas roles */
  allowedRoles?: Role[];
}

/**
 * Protege rotas que exigem login (e opcionalmente uma role específica).
 * Sem sessão válida -> /login. Logado sem a role exigida -> área do próprio perfil.
 * (A proteção real dos dados é feita pela API; aqui é só a experiência de navegação.)
 */
function ProtectedRoute({ element, allowedRoles }: ProtectedRouteProps) {
  const { autenticado, role } = useAuth();
  const location = useLocation();

  if (!autenticado) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === "admin" ? "/admin" : "/loja"} replace />;
  }

  return element;
}

export default ProtectedRoute;
