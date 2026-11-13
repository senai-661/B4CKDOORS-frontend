import { useNavigate } from "react-router-dom";

import Navegacao from "../../components/Navegacao/Navegacao";
import Rodape from "../../components/Rodape/Rodape";

import { useCarrinho } from "../../context/CarrinhoContext";
import AuthRequests from "../../fetch/AuthRequests";

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function PCarrinho() {
  const navigate = useNavigate();

  const {
    itens,
    atualizarQuantidade,
    remover,
    total,
    quantidadeTotal,
  } = useCarrinho();

  function irParaPagamento() {
    const idUsuario = AuthRequests.getIdUsuario();

    // Caso o usuário não esteja logado
    if (!idUsuario) {
      navigate("/login");
      return;
    }

    // Não cria o pedido ainda.
    // Apenas envia o usuário para o pagamento.
    navigate("/pagamento");
  }

  return (
    <div className="loja-page">
      <Navegacao cartCount={quantidadeTotal} />

      <section className="carrinho-page">
        <h1>Seu carrinho</h1>

        {!itens.length ? (
          <div className="loja-estado">
            <p>
              Seu carrinho está vazio. Que tal dar uma olhada na loja?
            </p>

            <button
              className="primary"
              onClick={() => navigate("/loja")}
            >
              Voltar para a loja
            </button>
          </div>
        ) : (
          <>
            <div className="carrinho-lista">
              {itens.map((item) => (
                <div
                  className="carrinho-item"
                  key={item.idProduto}
                >
                  <div className="grow">
                    <strong>{item.nome}</strong>

                    <span>
                      {money(item.preco)} un.
                    </span>
                  </div>

                  <div className="carrinho-qtd">
                    <button
                      type="button"
                      onClick={() =>
                        atualizarQuantidade(
                          item.idProduto,
                          item.quantidade - 1,
                        )
                      }
                    >
                      −
                    </button>

                    <span>
                      {item.quantidade}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        atualizarQuantidade(
                          item.idProduto,
                          item.quantidade + 1,
                        )
                      }
                    >
                      +
                    </button>
                  </div>

                  <strong className="carrinho-subtotal">
                    {money(
                      item.preco *
                        item.quantidade,
                    )}
                  </strong>

                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() =>
                      remover(item.idProduto)
                    }
                    title="Remover produto"
                  >
                    ⌫
                  </button>
                </div>
              ))}
            </div>

            <div className="carrinho-resumo">
              <span>Total</span>

              <strong>
                {money(total)}
              </strong>
            </div>

            <button
              type="button"
              className="primary carrinho-finalizar"
              onClick={irParaPagamento}
            >
              Ir para pagamento
            </button>
          </>
        )}
      </section>

      <Rodape />
    </div>
  );
}

export default PCarrinho;