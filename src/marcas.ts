import { api } from "./api";
import type { Marca } from "./types";

/**
 * Serviço de MARCAS — conversa direto com o backend (rotas /api/marcas).
 * Tudo fica salvo na tabela "marca" do banco; não existe mais cópia local no navegador.
 */
const ordenar = (lista: Marca[]) => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

export async function listarMarcas(): Promise<Marca[]> {
  const data = await api.get<Marca[]>("/api/marcas");
  if (!Array.isArray(data)) throw new Error("Resposta inválida de /api/marcas.");
  return ordenar(data);
}

export async function criarMarca(nome: string): Promise<void> {
  await api.post("/api/marcas", { nome: nome.trim() });
}

export async function atualizarMarca(id: number, nome: string): Promise<void> {
  await api.put(`/api/marcas/${id}`, { nome: nome.trim() });
}

export async function removerMarca(id: number): Promise<void> {
  await api.del(`/api/marcas/${id}`);
}
