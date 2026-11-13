import type { Produto } from "./types";

export interface Avaliacao {
  id: string;
  idProduto: number;
  idUsuario?: number;
  nome: string;
  nota: number;
  titulo: string;
  comentario: string;
  recomenda: boolean;
  tamanho?: string;
  data: string;
}

export interface ResumoAvaliacoes {
  media: number;
  total: number;
  distribuicao: number[];
  recomendam: number;
}

const STORAGE_KEY = "grena_avaliacoes";

function lerTodas(): Avaliacao[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function gravarTodas(lista: Avaliacao[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

export function listarAvaliacoes(idProduto: number): Avaliacao[] {
  return lerTodas().filter(a => a.idProduto === idProduto);
}

export function salvarAvaliacao(avaliacao: Omit<Avaliacao, "id" | "data">): Avaliacao {
  const nova: Avaliacao = {
    ...avaliacao,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: new Date().toISOString()
  };
  const outras = lerTodas().filter(
    a => !(avaliacao.idUsuario && a.idProduto === avaliacao.idProduto && a.idUsuario === avaliacao.idUsuario)
  );
  gravarTodas([nova, ...outras]);
  return nova;
}

export function removerAvaliacao(id: string) {
  gravarTodas(lerTodas().filter(a => a.id !== id));
}

export function resumoAvaliacoes(produto: Produto, lista: Avaliacao[] = listarAvaliacoes(produto.idProduto ?? 0)): ResumoAvaliacoes {
  const distribuicao = [0, 0, 0, 0, 0];
  if (lista.length === 0) {
    return {
      media: Number(produto.avaliacao || 0),
      total: Number(produto.quantidadeAvaliacoes || 0),
      distribuicao,
      recomendam: 0
    };
  }
  lista.forEach(a => distribuicao[a.nota - 1]++);
  const soma = lista.reduce((s, a) => s + a.nota, 0);
  return {
    media: soma / lista.length,
    total: lista.length,
    distribuicao,
    recomendam: Math.round((lista.filter(a => a.recomenda).length / lista.length) * 100)
  };
}
