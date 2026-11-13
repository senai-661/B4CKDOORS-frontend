import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import type {CartItem,Produto} from "../types";
const STORAGE_KEY="grena_carrinho";
interface Opcoes{tamanho?:string;cor?:string;}
interface CarrinhoContextValue{itens:CartItem[];adicionar:(produto:Produto,quantidade?:number,opcoes?:Opcoes)=>void;remover:(idProduto:number,tamanho?:string,cor?:string)=>void;atualizarQuantidade:(idProduto:number,quantidade:number,tamanho?:string,cor?:string)=>void;limpar:()=>void;total:number;quantidadeTotal:number;}
const CarrinhoContext=createContext<CarrinhoContextValue|null>(null);
const mesma=(i:CartItem,id:number,t?:string,c?:string)=>i.idProduto===id&&(i.tamanho||"")===(t||"")&&(i.cor||"")===(c||"");
function ler():CartItem[]{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");}catch{return[];}}
export function CarrinhoProvider({children}:{children:ReactNode}){const[itens,setItens]=useState<CartItem[]>(ler);useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(itens)),[itens]);
function adicionar(p:Produto,q=1,o:Opcoes={}){if(!p.idProduto)return;setItens(a=>{const ex=a.find(i=>mesma(i,p.idProduto!,o.tamanho,o.cor));return ex?a.map(i=>mesma(i,p.idProduto!,o.tamanho,o.cor)?{...i,quantidade:i.quantidade+q}:i):[...a,{idProduto:p.idProduto!,nome:p.nome,preco:Number(p.preco),quantidade:q,tamanho:o.tamanho,cor:o.cor,imagem:p.imagem}]});}
function remover(id:number,t?:string,c?:string){setItens(a=>a.filter(i=>!mesma(i,id,t,c)));}
function atualizarQuantidade(id:number,q:number,t?:string,c?:string){if(q<=0)return remover(id,t,c);setItens(a=>a.map(i=>mesma(i,id,t,c)?{...i,quantidade:q}:i));}
const limpar=()=>setItens([]);const total=itens.reduce((s,i)=>s+i.preco*i.quantidade,0);const quantidadeTotal=itens.reduce((s,i)=>s+i.quantidade,0);
return <CarrinhoContext.Provider value={{itens,adicionar,remover,atualizarQuantidade,limpar,total,quantidadeTotal}}>{children}</CarrinhoContext.Provider>}
export function useCarrinho(){const c=useContext(CarrinhoContext);if(!c)throw new Error("useCarrinho precisa estar dentro de um CarrinhoProvider");return c;}
