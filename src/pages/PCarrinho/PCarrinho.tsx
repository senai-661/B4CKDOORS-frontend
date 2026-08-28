import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navegacao from "../../components/Navegacao/Navegacao";
import Rodape from "../../components/Rodape/Rodape";
import { useCarrinho } from "../../context/CarrinhoContext";
import AuthRequests from "../../fetch/AuthRequests";
import { api } from "../../api";

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PCarrinho() {
  const navigate = useNavigate();
  const { itens, atualizarQuantidade, remover, limpar, total, quantidadeTotal } = useCarrinho();
  const [finalizando, setFinalizando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function finalizarCompra() {
    setMensagem("");
    setFinalizando(true);
    try {
      const idUsuario = AuthRequests.getIdUsuario();
      if (!idUsuario) {
        navigate("/login");
        return;
      }
      await api.criar("pedidos", { idUsuario, valorTotal: total, status: "PENDENTE" });
      limpar();
      setMensagem("Pedido realizado com sucesso! Acompanhe pelo seu histórico em breve.");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Não foi possível finalizar o pedido.");
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <div className="loja-page">
      <Navegacao cartCount={quantidadeTotal} />

      <section className="carrinho-page">
        <h1>Seu carrinho</h1>

        {mensagem && <div className="toast">{mensagem}</div>}

        {!itens.length ? (
          <p className="loja-estado">Seu carrinho está vazio. Que tal dar uma olhada na loja?</p>
        ) : (
          <>
            <div className="carrinho-lista">
              {itens.map(item => (
                <div className="carrinho-item" key={item.idProduto}>
                  <div className="grow">
                    <strong>{item.nome}</strong>
                    <span>{money(item.preco)} un.</span>
                  </div>
                  <div className="carrinho-qtd">
                    <button onClick={() => atualizarQuantidade(item.idProduto, item.quantidade - 1)}>−</button>
                    <span>{item.quantidade}</span>
                    <button onClick={() => atualizarQuantidade(item.idProduto, item.quantidade + 1)}>+</button>
                  </div>
                  <strong className="carrinho-subtotal">{money(item.preco * item.quantidade)}</strong>
                  <button className="icon-btn danger" onClick={() => remover(item.idProduto)}>⌫</button>
                </div>
              ))}
            </div>

            <div className="carrinho-resumo">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <button className="primary carrinho-finalizar" onClick={finalizarCompra} disabled={finalizando}>
              {finalizando ? "Finalizando..." : "Finalizar compra"}
            </button>
          </>
        )}
      </section>

      <Rodape />
    </div>
  );
}

export default PCarrinho;
