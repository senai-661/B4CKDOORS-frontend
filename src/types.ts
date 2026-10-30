export type Role = "cliente" | "admin";

export interface Usuario {
  idUsuario?: number;
  nome: string;
  email: string;
  cpf: string;
  /** Só é enviada no cadastro/troca de senha; a API nunca devolve a senha. */
  senha?: string;
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
  descricao?: string | null;
  preco: number;
  estoque: number;
  imagem?: string | null;
  idCategoria: number;
}

export interface ItemPedido {
  idProduto: number;
  quantidade: number;
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
