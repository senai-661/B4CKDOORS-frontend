import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AuthRequests, { type Sessao } from "../fetch/AuthRequests";
import { TOKEN_KEY, UNAUTHORIZED_EVENT } from "../api";
import type { Role, Usuario } from "../types";

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  autenticado: boolean;
  role: Role | null;
  isAdmin: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => AuthRequests.lerSessao());

  const logout = useCallback(() => {
    AuthRequests.logout();
    setSessao(null);
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const usuario = await AuthRequests.login(email, senha);
    setSessao(AuthRequests.lerSessao());
    return usuario;
  }, []);

  // Encerra a sessão automaticamente quando o token expira
  useEffect(() => {
    if (!sessao) return;
    const restanteMs = Math.max(sessao.exp * 1000 - Date.now(), 0);
    const timer = window.setTimeout(logout, Math.min(restanteMs, 2_000_000_000));
    return () => window.clearTimeout(timer);
  }, [sessao, logout]);

  // A API recusou o token (expirado, usuário excluído...) -> volta ao estado deslogado
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  // Mantém várias abas sincronizadas (login/logout em outra aba)
  useEffect(() => {
    function aoMudarStorage(e: StorageEvent) {
      if (e.key === TOKEN_KEY || e.key === null) setSessao(AuthRequests.lerSessao());
    }
    window.addEventListener("storage", aoMudarStorage);
    return () => window.removeEventListener("storage", aoMudarStorage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario: sessao?.usuario ?? null,
      token: sessao?.token ?? null,
      autenticado: !!sessao,
      role: sessao?.usuario.role ?? null,
      isAdmin: sessao?.usuario.role === "admin",
      login,
      logout
    }),
    [sessao, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de um AuthProvider");
  return ctx;
}
