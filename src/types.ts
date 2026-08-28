export type Role = "cliente" | "admin";

export interface Usuario {
  idUsuario?: number;
  nome: string;
  email: string;
  cpf: string;
  senha: string;
  role?: Role;
}

export interface CartItem {
  idProduto: number;
  nome: string;
  preco: number;
  quantidade: number;
}

export interface Categoria {
  idCategoria?: number;
  nome: string;
}

export interface Produto {
  idProduto?: number;
  codProduto?: string;
  nome: string;
  descricao?: string;
  preco: number;
  estoque: number;
  idCategoria: number;
}

export interface Pedido {
  idPedido?: number;
  codPedido?: string;
  idUsuario: number;
  dataPedido?: string;
  valorTotal: number;
  status?: string;
}

export type ApiEntity = "usuarios" | "categorias" | "produtos" | "pedidos";
