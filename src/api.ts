import type { ApiEntity, Usuario, Categoria, Produto, Pedido } from "./types";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3333").replace(/\/$/, "");
const configuredToken = import.meta.env.VITE_API_TOKEN || "";

function getToken() {
  if (typeof window !== "undefined") return window.localStorage.getItem("grena_token") || configuredToken;
  return configuredToken;
}

function normalizeEntity<T>(entity: ApiEntity, value: T): T {
  if (entity !== "pedidos" || !value || typeof value !== "object") return value;
  const item = value as T & { total?: number; valorTotal?: number };
  if (item.valorTotal === undefined && item.total !== undefined) {
    return { ...item, valorTotal: Number(item.total) } as T;
  }
  return item;
}

function serializeBody(entity: ApiEntity, body: unknown) {
  if (entity !== "pedidos" || !body || typeof body !== "object") return body;
  const pedido = body as { valorTotal?: number; total?: number } & Record<string, unknown>;
  const { valorTotal, ...rest } = pedido;
  return { ...rest, total: valorTotal ?? pedido.total };
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
    const message =
      typeof data === "object" && data && ("mensagem" in data || "message" in data)
        ? String((data as { mensagem?: unknown; message?: unknown }).mensagem ?? (data as { message?: unknown }).message)
        : `Erro HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function healthCheck() {
  return request<{ mensagem?: string; message?: string; timestamp?: string }>("/");
}

export const api = {
  listar: async <T>(entity: ApiEntity) => {
    const data = await request<T[]>(`/api/${entity}`);
    return data.map(item => normalizeEntity(entity, item));
  },
  buscar: async <T>(entity: ApiEntity, id: number) => {
    const data = await request<T>(`/api/${entity}/${id}`);
    return normalizeEntity(entity, data);
  },
  criar: <T>(entity: ApiEntity, body: T) =>
    request<{ mensagem: string }>(`/api/${entity}`, {
      method: "POST",
      body: JSON.stringify(serializeBody(entity, body))
    }),
  atualizar: <T>(entity: ApiEntity, id: number, body: T) =>
    request<{ mensagem: string }>(`/api/${entity}/${id}`, {
      method: "PUT",
      body: JSON.stringify(serializeBody(entity, body))
    }),
  remover: (entity: ApiEntity, id: number) =>
    request<{ mensagem: string }>(`/api/${entity}/${id}`, {
      method: "DELETE"
    }),
};

export type { Usuario, Categoria, Produto, Pedido };
