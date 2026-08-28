import type { Role, Usuario } from "../types";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3333").replace(/\/$/, "");

/**
 * Classe responsável por autenticação, persistência de sessão (localStorage)
 * e checagem de expiração do token — mesma mecânica usada no FiveBits (AuthRequests.ts),
 * adaptada às chaves e ao endpoint já usados pelo GRENÁ.
 */
class AuthRequests {
  private serverUrl = API_URL;
  private endpointLogin = "/api/login";

  /**
   * Autentica no backend. Persiste token + dados do usuário (incluindo role) no localStorage.
   * @returns o usuário autenticado (com role) em caso de sucesso
   */
  async login(email: string, senha: string): Promise<Usuario> {
    const response = await fetch(`${this.serverUrl}${this.endpointLogin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const data = await response.json();

    if (!response.ok || !data.auth) {
      throw new Error(data.message || "Usuário e/ou senha incorretos.");
    }

    this.persistToken(data.token, data.usuario);
    return data.usuario as Usuario;
  }

  /** Salva token e dados do usuário logado no localStorage */
  private persistToken(token: string, usuario: Usuario) {
    localStorage.setItem("grena_token", token);
    localStorage.setItem("grena_isAuth", "true");
    localStorage.setItem("grena_idUsuario", String(usuario.idUsuario ?? ""));
    localStorage.setItem("grena_nome", usuario.nome ?? "");
    localStorage.setItem("grena_email", usuario.email ?? "");
    localStorage.setItem("grena_role", usuario.role ?? "cliente");
  }

  /** Remove a sessão e manda o usuário de volta para o login */
  logout(redirect = true) {
    ["grena_token", "grena_isAuth", "grena_idUsuario", "grena_nome", "grena_email", "grena_role"].forEach(key =>
      localStorage.removeItem(key)
    );
    if (redirect) window.location.href = "/login";
  }

  /** true se existir um token salvo e ele ainda não tiver expirado */
  isAuthenticated(): boolean {
    const token = localStorage.getItem("grena_token");
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiry = payload.exp as number;
      const now = Math.floor(Date.now() / 1000);
      if (expiry < now) {
        this.logout(false);
        return false;
      }
      return true;
    } catch {
      this.logout(false);
      return false;
    }
  }

  getRole(): Role | null {
    if (!this.isAuthenticated()) return null;
    return (localStorage.getItem("grena_role") as Role) || "cliente";
  }

  getNome(): string {
    return localStorage.getItem("grena_nome") || "";
  }

  getIdUsuario(): number | null {
    const id = localStorage.getItem("grena_idUsuario");
    return id ? Number(id) : null;
  }
}

export default new AuthRequests();
