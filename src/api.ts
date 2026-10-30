import type { ApiEntity, Usuario, Categoria, Produto, Pedido } from "./types";

/**
 * URL base da API, vinda de VITE_API_URL (.env).
 * Em desenvolvimento, se não estiver definida, cai em http://localhost:3333.
 * Em produção, se vazia, as chamadas vão para a mesma origem do site (útil com proxy reverso).
 */
export const API_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3333" : "")
).replace(/\/$/, "");

/** Chave do localStorage onde o JWT é guardado após o login */
export const TOKEN_KEY = "grena_token";

/** Evento disparado quando a API responde 401 com um token enviado (sessão expirada/inválida) */
export const UNAUTHORIZED_EVENT = "grena:unauthorized";

function getToken() {
  return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    // Token enviado mas recusado: avisa o AuthContext para encerrar a sessão
    if (response.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const message =
      typeof data === "object" && data && ("mensagem" in data || "message" in data)
        ? String((data as { mensagem?: unknown; message?: unknown }).mensagem ?? (data as { message?: unknown }).message)
        : `Erro HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function healthCheck() {
  return request<{ mensagem?: string; timestamp?: string }>("/");
}

export const api = {
  listar: <T>(entity: ApiEntity) => request<T[]>(`/api/${entity}`),
  buscar: <T>(entity: ApiEntity, id: number) => request<T>(`/api/${entity}/${id}`),
  criar: <T>(entity: ApiEntity, body: T) =>
    request<{ mensagem: string }>(`/api/${entity}`, { method: "POST", body: JSON.stringify(body) }),
  atualizar: <T>(entity: ApiEntity, id: number, body: T) =>
    request<{ mensagem: string }>(`/api/${entity}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remover: (entity: ApiEntity, id: number) =>
    request<{ mensagem: string }>(`/api/${entity}/${id}`, { method: "DELETE" })
};

export type { Usuario, Categoria, Produto, Pedido };
