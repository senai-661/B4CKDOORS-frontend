import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem, Produto } from "../types";

const STORAGE_KEY = "grena_carrinho";

interface CarrinhoContextValue {
  itens: CartItem[];
  adicionar: (produto: Produto, quantidade?: number) => void;
  remover: (idProduto: number) => void;
  atualizarQuantidade: (idProduto: number, quantidade: number) => void;
  limpar: () => void;
  total: number;
  quantidadeTotal: number;
}

const CarrinhoContext = createContext<CarrinhoContextValue | null>(null);

function lerCarrinhoInicial(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>(lerCarrinhoInicial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
  }, [itens]);

  function adicionar(produto: Produto, quantidade = 1) {
    setItens(atual => {
      const existente = atual.find(i => i.idProduto === produto.idProduto);
      if (existente) {
        return atual.map(i =>
          i.idProduto === produto.idProduto ? { ...i, quantidade: i.quantidade + quantidade } : i
        );
      }
      return [
        ...atual,
        { idProduto: produto.idProduto!, nome: produto.nome, preco: Number(produto.preco), quantidade }
      ];
    });
  }

  function remover(idProduto: number) {
    setItens(atual => atual.filter(i => i.idProduto !== idProduto));
  }

  function atualizarQuantidade(idProduto: number, quantidade: number) {
    if (quantidade <= 0) return remover(idProduto);
    setItens(atual => atual.map(i => (i.idProduto === idProduto ? { ...i, quantidade } : i)));
  }

  function limpar() {
    setItens([]);
  }

  const total = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
  const quantidadeTotal = itens.reduce((soma, i) => soma + i.quantidade, 0);

  return (
    <CarrinhoContext.Provider value={{ itens, adicionar, remover, atualizarQuantidade, limpar, total, quantidadeTotal }}>
      {children}
    </CarrinhoContext.Provider>
  );
}

export function useCarrinho() {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) throw new Error("useCarrinho precisa estar dentro de um CarrinhoProvider");
  return ctx;
}
