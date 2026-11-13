import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../../api";
import AuthRequests from "../../fetch/AuthRequests";
import { useCarrinho } from "../../context/CarrinhoContext";
import grenaMascoteJoia from "../../assets/grena-mascote-joia.png";
import Fogos from "../../components/Fogos/Fogos";

type MetodoPagamento = "pix" | "cartao" | "boleto";

interface ItemPedido {
  nome: string;
  preco: number;
  qtd: number;
}

interface DadosCartao {
  numero: string;
  nome: string;
  validade: string;
  cvv: string;
  parcelas: number;
}

const COLORS = {
  bg: "#170c12",
  card: "#20121a",
  border: "#3a2230",
  gold: "#d9b25c",
  goldMuted: "#a8935f",
  wine: "#9b3350",
  wineHover: "#b23e5e",
  text: "#f2ece7",
  textMuted: "#b8a9ac",
  success: "#4caf7d",
  danger: "#e57373",
};

const METODOS: {
  id: MetodoPagamento;
  label: string;
  desc: string;
}[] = [
  {
    id: "pix",
    label: "Pix",
    desc: "Aprovação na hora",
  },
  {
    id: "cartao",
    label: "Cartão",
    desc: "Crédito em até 12x",
  },
  {
    id: "boleto",
    label: "Boleto",
    desc: "Vence em 3 dias úteis",
  },
];

function formatCardNumber(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(valor: string) {
  const numeros = valor
    .replace(/\D/g, "")
    .slice(0, 4);

  return numeros.length > 2
    ? `${numeros.slice(0, 2)}/${numeros.slice(2)}`
    : numeros;
}

function formatCPF(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function PPagamento() {
  const navigate = useNavigate();

  const [metodo, setMetodo] =
    useState<MetodoPagamento>("pix");

  const [processando, setProcessando] =
    useState(false);

  const [concluido, setConcluido] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [totalPago, setTotalPago] =
    useState("");

  const [copiado, setCopiado] =
    useState(false);

  const [cartao, setCartao] =
    useState<DadosCartao>({
      numero: "",
      nome: "",
      validade: "",
      cvv: "",
      parcelas: 1,
    });

  const [cpfBoleto, setCpfBoleto] =
    useState("");

  const { itens: itensCarrinho, limpar } = useCarrinho();

  const itens: ItemPedido[] = itensCarrinho.map(item => ({
    nome: [item.nome, item.tamanho, item.cor].filter(Boolean).join(" · "),
    preco: item.preco,
    qtd: item.quantidade,
  }));

  const total = itens.reduce(
    (soma, item) =>
      soma + item.preco * item.qtd,
    0,
  );

  const totalFmt =
    total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const codigoPix =
    "00020126580014BR.GOV.BCB.PIX0136GRENAPAGAMENTO1234567895204000053039865406199.905802BR5920GRENA STORE6009SAO PAULO62070503***6304ABCD";

  function validarPagamento() {
    if (metodo === "cartao") {
      const numero =
        cartao.numero.replace(/\s/g, "");

      if (numero.length !== 16) {
        return "Número do cartão incompleto.";
      }

      if (!cartao.nome.trim()) {
        return "Informe o nome impresso no cartão.";
      }

      if (cartao.validade.length !== 5) {
        return "Validade inválida.";
      }

      const mes = Number(
        cartao.validade.substring(0, 2),
      );

      if (mes < 1 || mes > 12) {
        return "Mês de validade inválido.";
      }

      if (cartao.cvv.length < 3) {
        return "CVV inválido.";
      }
    }

    if (metodo === "boleto") {
      const cpf =
        cpfBoleto.replace(/\D/g, "");

      if (cpf.length !== 11) {
        return "Informe um CPF válido.";
      }
    }

    return "";
  }

  async function confirmarPagamento() {
    const mensagemErro =
      validarPagamento();

    if (mensagemErro) {
      setErro(mensagemErro);
      return;
    }

    setErro("");
    setProcessando(true);

    const idUsuario = AuthRequests.getIdUsuario();
    if (!idUsuario) {
      setProcessando(false);
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      await api.criar("pedidos", {
        idUsuario,
        valorTotal: Number(total.toFixed(2)),
        status: metodo === "boleto" ? "PENDENTE" : "PAGO",
      });
      setTotalPago(totalFmt);
      limpar();
      setConcluido(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar o pedido.");
    } finally {
      setProcessando(false);
    }
  }

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(
        codigoPix,
      );

      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 2000);
    } catch {
      setErro(
        "Não foi possível copiar o código Pix.",
      );
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#150a10",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "11px 12px",
    color: COLORS.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    display: "block",
  };

  /*
    TELA DE PAGAMENTO CONCLUÍDO
  */
  if (!concluido && itens.length === 0) {
    return <Navigate to="/carrinho" replace />;
  }

  if (concluido) {
    return (
      <div className="celebracao-page">
        <Fogos />
        <div className="celebracao-card">
          <div className="celebracao-mascote-wrap">
            <span className="celebracao-brilho" aria-hidden="true" />
            <img className="celebracao-mascote" src={grenaMascoteJoia} alt="Mascote GRENÁ fazendo joinha" />
          </div>
          <div className="celebracao-check" aria-hidden="true">✓</div>
          <span className="eyebrow">COMPRA CONCLUÍDA</span>
          <h2>Valeu, campeão!</h2>
          <p className="celebracao-texto">
            {metodo === "pix" && "Pagamento via Pix aprovado com sucesso."}
            {metodo === "cartao" && `Cobrança de ${totalPago} aprovada no cartão.`}
            {metodo === "boleto" && "Boleto gerado com sucesso. Efetue o pagamento em até 3 dias úteis."}
          </p>
          <p className="celebracao-sub">Seu pedido já está com a gente. Agora é só esperar a encomenda chegar!</p>
          <div className="celebracao-acoes">
            <button type="button" className="primary" onClick={() => navigate("/loja")}>Continuar comprando</button>
            <button type="button" className="secondary" onClick={() => navigate("/perfil")}>Ver meu perfil</button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        padding: "32px 16px",
        fontFamily: "Arial, sans-serif",
        color: COLORS.text,
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        {/* VOLTAR */}
        <button
          type="button"
          onClick={() =>
            navigate("/carrinho")
          }
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            marginBottom: 18,
            padding: 0,
            fontSize: 14,
          }}
        >
          ← Voltar para o carrinho
        </button>

        <h1
          style={{
            color: COLORS.text,
            fontSize: 28,
            margin:
              "0 0 8px",
          }}
        >
          Pagamento
        </h1>

        <p
          style={{
            color: COLORS.textMuted,
            margin:
              "0 0 26px",
            fontSize: 14,
          }}
        >
          Escolha a forma de pagamento
          para finalizar seu pedido.
        </p>

        {/* RESUMO */}
        <div
          style={{
            background: COLORS.card,
            border:
              `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              color: COLORS.gold,
              margin:
                "0 0 16px",
              fontSize: 16,
            }}
          >
            Resumo do pedido
          </h3>

          {itens.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 20,
                fontSize: 14,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  color:
                    COLORS.textMuted,
                }}
              >
                {item.nome}

                {item.qtd > 1
                  ? ` x${item.qtd}`
                  : ""}
              </span>

              <span>
                {(
                  item.preco *
                  item.qtd
                ).toLocaleString(
                  "pt-BR",
                  {
                    style:
                      "currency",
                    currency:
                      "BRL",
                  },
                )}
              </span>
            </div>
          ))}

          <div
            style={{
              borderTop:
                `1px solid ${COLORS.border}`,
              marginTop: 14,
              paddingTop: 14,
              display: "flex",
              justifyContent:
                "space-between",
              fontWeight: 600,
            }}
          >
            <span>Total</span>

            <span
              style={{
                color: COLORS.gold,
                fontSize: 20,
              }}
            >
              {totalFmt}
            </span>
          </div>
        </div>

        {/* MÉTODOS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {METODOS.map(
            (opcao) => (
              <button
                type="button"
                key={opcao.id}
                onClick={() => {
                  setMetodo(opcao.id);
                  setErro("");
                }}
                style={{
                  background:
                    metodo ===
                    opcao.id
                      ? "rgba(155,51,80,0.18)"
                      : COLORS.card,

                  border:
                    `1.5px solid ${
                      metodo ===
                      opcao.id
                        ? COLORS.wine
                        : COLORS.border
                    }`,

                  borderRadius: 10,
                  padding:
                    "14px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color:
                      metodo ===
                      opcao.id
                        ? COLORS.gold
                        : COLORS.text,
                    fontSize: 15,
                  }}
                >
                  {opcao.label}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      COLORS.textMuted,
                    marginTop: 3,
                  }}
                >
                  {opcao.desc}
                </div>
              </button>
            ),
          )}
        </div>

        {/* CONTEÚDO */}
        <div
          style={{
            background: COLORS.card,
            border:
              `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 22,
            marginBottom: 20,
          }}
        >
          {/* PIX */}
          {metodo === "pix" && (
            <div
              style={{
                textAlign: "center",
                padding: "10px 0",
              }}
            >
              <h3
                style={{
                  color: COLORS.gold,
                  margin:
                    "0 0 16px",
                }}
              >
                Pagamento via Pix
              </h3>

              <div
                style={{
                  width: 190,
                  height: 190,
                  background: "#fff",
                  borderRadius: 10,
                  margin:
                    "0 auto 18px",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color: "#333",
                  padding: 20,
                  boxSizing:
                    "border-box",
                }}
              >
                QR CODE PIX
              </div>

              <p
                style={{
                  fontSize: 13,
                  color:
                    COLORS.textMuted,
                  marginBottom: 14,
                }}
              >
                Escaneie o QR Code no
                aplicativo do seu banco ou
                copie o código Pix.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  readOnly
                  value={codigoPix}
                  style={{
                    ...inputStyle,
                    fontSize: 11,
                    flex: 1,
                  }}
                />

                <button
                  type="button"
                  onClick={copiarPix}
                  style={{
                    background:
                      COLORS.wine,
                    border: "none",
                    borderRadius: 8,
                    padding:
                      "0 16px",
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {copiado
                    ? "Copiado!"
                    : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* CARTÃO */}
          {metodo ===
            "cartao" && (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 15,
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Número do cartão
                </label>

                <input
                  style={
                    inputStyle
                  }
                  placeholder="0000 0000 0000 0000"
                  value={
                    cartao.numero
                  }
                  onChange={(e) =>
                    setCartao({
                      ...cartao,
                      numero:
                        formatCardNumber(
                          e.target
                            .value,
                        ),
                    })
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Nome impresso no cartão
                </label>

                <input
                  style={
                    inputStyle
                  }
                  placeholder="Como está no cartão"
                  value={
                    cartao.nome
                  }
                  onChange={(e) =>
                    setCartao({
                      ...cartao,
                      nome:
                        e.target
                          .value,
                    })
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Validade
                  </label>

                  <input
                    style={
                      inputStyle
                    }
                    placeholder="MM/AA"
                    value={
                      cartao.validade
                    }
                    onChange={(e) =>
                      setCartao({
                        ...cartao,
                        validade:
                          formatExpiry(
                            e.target
                              .value,
                          ),
                      })
                    }
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    CVV
                  </label>

                  <input
                    style={
                      inputStyle
                    }
                    placeholder="123"
                    value={
                      cartao.cvv
                    }
                    onChange={(e) =>
                      setCartao({
                        ...cartao,
                        cvv:
                          e.target.value
                            .replace(
                              /\D/g,
                              "",
                            )
                            .slice(
                              0,
                              4,
                            ),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Parcelas
                </label>

                <select
                  style={
                    inputStyle
                  }
                  value={
                    cartao.parcelas
                  }
                  onChange={(e) =>
                    setCartao({
                      ...cartao,
                      parcelas:
                        Number(
                          e.target
                            .value,
                        ),
                    })
                  }
                >
                  {Array.from(
                    {
                      length: 12,
                    },
                    (_, index) =>
                      index + 1,
                  ).map(
                    (numero) => (
                      <option
                        key={
                          numero
                        }
                        value={
                          numero
                        }
                      >
                        {numero}x de{" "}
                        {(
                          total /
                          numero
                        ).toLocaleString(
                          "pt-BR",
                          {
                            style:
                              "currency",
                            currency:
                              "BRL",
                          },
                        )}
                        {numero ===
                        1
                          ? " à vista"
                          : " sem juros"}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          )}

          {/* BOLETO */}
          {metodo ===
            "boleto" && (
            <div>
              <label
                style={labelStyle}
              >
                CPF do titular
              </label>

              <input
                style={inputStyle}
                placeholder="000.000.000-00"
                value={cpfBoleto}
                onChange={(e) =>
                  setCpfBoleto(
                    formatCPF(
                      e.target.value,
                    ),
                  )
                }
              />

              <p
                style={{
                  fontSize: 12,
                  color:
                    COLORS.textMuted,
                  marginTop: 12,
                  lineHeight: 1.5,
                }}
              >
                O boleto será gerado
                após a confirmação.
                Vencimento em até 3 dias
                úteis.
              </p>
            </div>
          )}

          {erro && (
            <div
              style={{
                marginTop: 15,
                color:
                  COLORS.danger,
                fontSize: 13,
              }}
            >
              {erro}
            </div>
          )}
        </div>

        {/* CONFIRMAR */}
        <button
          type="button"
          onClick={
            confirmarPagamento
          }
          disabled={processando}
          style={{
            width: "100%",

            background:
              processando
                ? COLORS.goldMuted
                : COLORS.wine,

            border: "none",
            borderRadius: 10,

            padding: 15,

            color: "#fff",

            fontSize: 15,

            fontWeight: 600,

            cursor:
              processando
                ? "default"
                : "pointer",

            transition:
              "0.2s",
          }}
        >
          {processando
            ? "Processando..."
            : metodo === "pix"
              ? "Já paguei"
              : metodo ===
                  "boleto"
                ? "Gerar boleto"
                : `Pagar ${totalFmt}`}
        </button>
      </div>
    </div>
  );
}

export default PPagamento;
