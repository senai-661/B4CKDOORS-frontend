import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import AuthRequests from "../../fetch/AuthRequests";
import type { Role } from "../../types";

interface ProtectedRouteProps {
  element: ReactElement;
  /** Se informado, além de logado o usuário precisa ter uma dessas roles */
  allowedRoles?: Role[];
}

/**
 * Protege rotas que exigem login (e opcionalmente uma role específica).
 * Sem sessão válida -> manda para /login.
 * Logado mas sem a role exigida -> manda para a área correta do próprio usuário.
 */
function ProtectedRoute({ element, allowedRoles }: ProtectedRouteProps) {
  const autenticado = AuthRequests.isAuthenticated();

  if (!autenticado) return <Navigate to="/login" replace />;

  const role = AuthRequests.getRole();
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === "admin" ? "/admin" : "/loja"} replace />;
  }

  return element;
}

export default ProtectedRoute;
