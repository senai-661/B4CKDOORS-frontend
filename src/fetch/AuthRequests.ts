import { API_URL, TOKEN_KEY } from "../api";
import type { Role, Usuario } from "../types";

const CHAVES_SESSAO = [TOKEN_KEY, "grena_isAuth", "grena_idUsuario", "grena_nome", "grena_email", "grena_role"];

export interface Sessao {
  token: string;
  usuario: Usuario;
  /** Expiração do token (segundos desde 1970) */
  exp: number;
}

interface JwtPayload {
  id?: number;
  nome?: string;
  email?: string;
  role?: string;
  exp?: number;
}

/** Decodifica o payload de um JWT (base64url). NÃO valida assinatura: isso é papel do backend. */
function decodificarJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Camada de comunicação de login + persistência da sessão no localStorage.
 *
 * Importante: o frontend só ESCONDE/MOSTRA telas conforme a role. Quem realmente
 * protege os dados é o backend (JWT + role validados a cada requisição).
 */
class AuthRequests {
  /** Autentica no backend e grava token + dados do usuário no localStorage. */
  async login(email: string, senha: string): Promise<Usuario> {
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    let data: { auth?: boolean; token?: string; usuario?: Usuario; mensagem?: string; message?: string } = {};
    try {
      data = await response.json();
    } catch {
      /* resposta sem JSON: cai na mensagem padrão abaixo */
    }

    if (!response.ok || !data.auth || !data.token || !data.usuario) {
      throw new Error(data.mensagem || data.message || "E-mail e/ou senha incorretos.");
    }

    this.persistir(data.token, data.usuario);
    return data.usuario;
  }

  private persistir(token: string, usuario: Usuario) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("grena_isAuth", "true");
    localStorage.setItem("grena_idUsuario", String(usuario.idUsuario ?? (usuario as { id?: number }).id ?? ""));
    localStorage.setItem("grena_nome", usuario.nome ?? "");
    localStorage.setItem("grena_email", usuario.email ?? "");
    localStorage.setItem("grena_role", usuario.role ?? "cliente");
  }

  /** Apaga a sessão local (não redireciona: quem chama decide para onde ir). */
  logout() {
    CHAVES_SESSAO.forEach(chave => localStorage.removeItem(chave));
  }

  /**
   * Lê a sessão salva. Retorna null se não houver token, se ele estiver malformado
   * ou expirado (nesse caso a sessão local é limpa). Os dados do usuário e a role
   * vêm do próprio token, assim editar o localStorage não "promove" ninguém na interface.
   */
  lerSessao(): Sessao | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const payload = decodificarJwt(token);
    const agora = Math.floor(Date.now() / 1000);
    if (!payload || !payload.exp || payload.exp <= agora || !payload.id) {
      this.logout();
      return null;
    }

    const role: Role = payload.role === "admin" ? "admin" : "cliente";
    return {
      token,
      exp: payload.exp,
      usuario: {
        idUsuario: payload.id,
        nome: payload.nome ?? localStorage.getItem("grena_nome") ?? "",
        email: payload.email ?? localStorage.getItem("grena_email") ?? "",
        cpf: "",
        role
      }
    };
  }
}

export default new AuthRequests();
