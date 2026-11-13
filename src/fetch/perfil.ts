import { api } from "../api";
import AuthRequests from "./AuthRequests";
import type { UserProfile } from "../types";

function idLogado(): number {
  const id = AuthRequests.getIdUsuario();
  if (!id) throw new Error("Sessão expirada. Faça login novamente.");
  return id;
}

export async function getPerfil(): Promise<UserProfile> {
  return api.buscar<UserProfile>("usuarios", idLogado());
}

export async function atualizarPerfil(payload: UserProfile): Promise<UserProfile> {
  const id = idLogado();
  await api.atualizar("usuarios", id, { nome: payload.nome, email: payload.email, cpf: payload.cpf });
  localStorage.setItem("grena_nome", payload.nome);
  localStorage.setItem("grena_email", payload.email);
  return getPerfil();
}
