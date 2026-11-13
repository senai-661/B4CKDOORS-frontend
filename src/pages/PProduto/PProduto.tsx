import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import Navegacao from "../../components/Navegacao/Navegacao";
import Rodape from "../../components/Rodape/Rodape";
import ImagemProduto from "../../components/ImagemProduto/ImagemProduto";
import { api } from "../../api";
import AuthRequests from "../../fetch/AuthRequests";
import { useCarrinho } from "../../context/CarrinhoContext";
import { useConfirmacao } from "../../components/Confirmacao/Confirmacao";
import type { Categoria, Produto } from "../../types";
import {
  listarAvaliacoes,
  removerAvaliacao,
  resumoAvaliacoes,
  salvarAvaliacao,
  type Avaliacao
} from "../../avaliacoes";

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const FRETE_GRATIS_A_PARTIR = 199;
const ROTULO_NOTA = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];

interface Frete {
  cidade: string;
  uf: string;
  valor: number;
  prazo: number;
}

function Estrelas({ nota, tamanho = "" }: { nota: number; tamanho?: string }) {
  return (
    <span className={`estrelas ${tamanho}`} aria-label={`Nota ${nota.toFixed(1)} de 5`}>
      <span className="estrelas-fundo">★★★★★</span>
      <span className="estrelas-cheias" style={{ width: `${(Math.max(0, Math.min(5, nota)) / 5) * 100}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

function calcularFrete(uf: string, subtotal: number): { valor: number; prazo: number } {
  const sudesteSul = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
  const prazo = uf === "SP" ? 3 : sudesteSul.includes(uf) ? 5 : 9;
  if (subtotal >= FRETE_GRATIS_A_PARTIR) return { valor: 0, prazo };
  return { valor: uf === "SP" ? 14.9 : sudesteSul.includes(uf) ? 22.9 : 34.9, prazo };
}

function PProduto() {
  const { idProduto } = useParams();
  const { adicionar, quantidadeTotal } = useCarrinho();
  const confirmar = useConfirmacao();
  const [p, setP] = useState<Produto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [relacionados, setRelacionados] = useState<Produto[]>([]);
  const [tamanho, setTamanho] = useState("");
  const [cor, setCor] = useState("");
  const [qtd, setQtd] = useState(1);
  const [aviso, setAviso] = useState("");

  const [cep, setCep] = useState("");
  const [frete, setFrete] = useState<Frete | null>(null);
  const [erroFrete, setErroFrete] = useState("");
  const [calculando, setCalculando] = useState(false);

  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [filtroNota, setFiltroNota] = useState(0);
  const [ordem, setOrdem] = useState("recentes");
  const [nota, setNota] = useState(0);
  const [notaHover, setNotaHover] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [comentario, setComentario] = useState("");
  const [recomenda, setRecomenda] = useState(true);
  const [tamanhoUsado, setTamanhoUsado] = useState("");
  const [erroAvaliacao, setErroAvaliacao] = useState("");
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);

  const logado = AuthRequests.isAuthenticated();
  const nomeUsuario = AuthRequests.getNome() || "Cliente";
  const idUsuario = AuthRequests.getIdUsuario() || undefined;
  const isAdmin = AuthRequests.getRole() === "admin";

  useEffect(() => {
    const id = Number(idProduto);
    window.scrollTo(0, 0);
    setP(null);
    setAviso("");
    setTamanho("");
    setCor("");
    setQtd(1);
    setFrete(null);
    setFiltroNota(0);
    setAvaliacaoEnviada(false);
    setAvaliacoes(listarAvaliacoes(id));
    api.buscar<Produto>("produtos", id).then(setP).catch(() => setAviso("Produto não encontrado."));
    api.listar<Categoria>("categorias").then(setCategorias).catch(() => setCategorias([]));
    api.listar<Produto>("produtos").then(setRelacionados).catch(() => setRelacionados([]));
  }, [idProduto]);

  const resumo = useMemo(() => (p ? resumoAvaliacoes(p, avaliacoes) : null), [p, avaliacoes]);

  const avaliacoesVisiveis = useMemo(() => {
    const lista = avaliacoes.filter(a => !filtroNota || a.nota === filtroNota);
    if (ordem === "maior") return [...lista].sort((a, b) => b.nota - a.nota);
    if (ordem === "menor") return [...lista].sort((a, b) => a.nota - b.nota);
    return [...lista].sort((a, b) => b.data.localeCompare(a.data));
  }, [avaliacoes, filtroNota, ordem]);

  if (!p || !resumo) {
    return (
      <div className="loja-page">
        <Navegacao cartCount={quantidadeTotal} />
        <p className="loja-estado">{aviso || "Carregando produto..."}</p>
      </div>
    );
  }

  const produto = p;
  const categoria = categorias.find(c => c.idCategoria === produto.idCategoria)?.nome;
  const parcelas = produto.parcelas && produto.parcelas > 1 ? produto.parcelas : produto.preco >= 100 ? 6 : 1;
  const precoAnterior = produto.precoAnterior && produto.precoAnterior > produto.preco ? produto.precoAnterior : 0;
  const desconto = precoAnterior ? Math.round((1 - produto.preco / precoAnterior) * 100) : 0;
  const outros = relacionados
    .filter(r => r.idProduto !== produto.idProduto && r.idCategoria === produto.idCategoria)
    .slice(0, 4);
  const minhaAvaliacao = avaliacoes.find(a => idUsuario && a.idUsuario === idUsuario);

  const fichaTecnica: [string, string | undefined][] = [
    ["Marca", produto.marca ?? undefined],
    ["Código", produto.codProduto],
    ["Categoria", categoria],
    ["Gênero", produto.genero],
    ["Esporte", produto.esporte],
    ["Modalidade", produto.modalidade !== produto.esporte ? produto.modalidade : undefined],
    ["Linha", produto.linha],
    ["Faixa etária", produto.faixaEtaria],
    ["Cores disponíveis", produto.cores?.join(", ")],
    ["Tamanhos disponíveis", produto.tamanhos?.join(", ")],
    ...(produto.caracteristicas || []).map(c => [c.nome, c.valor] as [string, string])
  ];
  const fichaPreenchida = fichaTecnica.filter(([, valor]) => valor && String(valor).trim());

  function comprar() {
    if ((produto.tamanhos?.length || 0) > 1 && !tamanho) return setAviso("Selecione um tamanho.");
    if ((produto.cores?.length || 0) > 1 && !cor) return setAviso("Selecione uma cor.");
    adicionar(produto, qtd, { tamanho: tamanho || produto.tamanhos?.[0], cor: cor || produto.cores?.[0] });
    setAviso("Produto adicionado ao carrinho.");
  }

  async function consultarFrete(e: FormEvent) {
    e.preventDefault();
    const digitos = cep.replace(/\D/g, "");
    setFrete(null);
    if (digitos.length !== 8) return setErroFrete("Digite um CEP válido com 8 números.");
    setErroFrete("");
    setCalculando(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (dados.erro) throw new Error();
      setFrete({ cidade: dados.localidade, uf: dados.uf, ...calcularFrete(dados.uf, produto.preco * qtd) });
    } catch {
      setErroFrete("CEP não encontrado.");
    } finally {
      setCalculando(false);
    }
  }

  function enviarAvaliacao(e: FormEvent) {
    e.preventDefault();
    if (!nota) return setErroAvaliacao("Escolha uma nota de 1 a 5 estrelas.");
    if (titulo.trim().length < 3) return setErroAvaliacao("Dê um título para a sua avaliação.");
    if (comentario.trim().length < 10) return setErroAvaliacao("Escreva um comentário com pelo menos 10 caracteres.");
    salvarAvaliacao({
      idProduto: produto.idProduto!,
      idUsuario,
      nome: nomeUsuario,
      nota,
      titulo: titulo.trim(),
      comentario: comentario.trim(),
      recomenda,
      tamanho: tamanhoUsado || undefined
    });
    setAvaliacoes(listarAvaliacoes(produto.idProduto!));
    setNota(0);
    setTitulo("");
    setComentario("");
    setRecomenda(true);
    setTamanhoUsado("");
    setErroAvaliacao("");
    setAvaliacaoEnviada(true);
  }

  async function excluirAvaliacao(id: string) {
    const ok = await confirmar({ titulo: "Excluir avaliação", mensagem: "Tem certeza que deseja excluir esta avaliação?", confirmar: "Excluir", perigo: true });
    if (!ok) return;
    removerAvaliacao(id);
    setAvaliacoes(listarAvaliacoes(produto.idProduto!));
  }

  return (
    <div className="loja-page">
      <Navegacao cartCount={quantidadeTotal} />
      <main className="produto-detalhe-page">
        <div className="breadcrumb">
          <Link to="/loja">Loja</Link> / {categoria || produto.esporte || "Produtos"} / {produto.nome}
        </div>

        <section className="produto-detalhe-grid">
          <div className="produto-galeria">
            {desconto > 0 && <span className="produto-desconto">-{desconto}%</span>}
            <ImagemProduto nome={produto.nome} imagem={produto.imagem} />
          </div>

          <div className="produto-compra">
            <span className="produto-marca">{produto.marca || "GRENÁ"}</span>
            <h1>{produto.nome}</h1>
            <a href="#avaliacoes" className="produto-rating grande">
              <Estrelas nota={resumo.media} />
              <b>{resumo.media.toFixed(1)}</b>
              <span>
                ({resumo.total} {resumo.total === 1 ? "avaliação" : "avaliações"})
              </span>
            </a>
            {produto.codProduto && <p className="produto-codigo">Código: {produto.codProduto}</p>}

            <div className="produto-preco-bloco">
              {precoAnterior > 0 && (
                <div className="produto-preco-antigo">
                  <del>{money(precoAnterior)}</del>
                  <span className="produto-economia">Economize {money(precoAnterior - produto.preco)}</span>
                </div>
              )}
              <div className="produto-preco-detalhe">
                {money(produto.preco)} <small>no Pix</small>
              </div>
              <p className="produto-parcelamento">
                ou {parcelas}x de <b>{money(produto.preco / parcelas)}</b> sem juros no cartão
              </p>
            </div>

            {(produto.cores?.length || 0) > 0 && (
              <div className="produto-opcao">
                <strong>Cor: {cor}</strong>
                <div className="opcoes-botoes">
                  {produto.cores!.map(c => (
                    <button className={cor === c ? "ativo" : ""} onClick={() => setCor(c)} key={c}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(produto.tamanhos?.length || 0) > 0 && (
              <div className="produto-opcao">
                <strong>Tamanho: {tamanho}</strong>
                <div className="opcoes-botoes">
                  {produto.tamanhos!.map(t => (
                    <button className={tamanho === t ? "ativo" : ""} onClick={() => setTamanho(t)} key={t}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="produto-quantidade">
              <button onClick={() => setQtd(Math.max(1, qtd - 1))}>−</button>
              <span>{qtd}</span>
              <button onClick={() => setQtd(Math.min(produto.estoque, qtd + 1))}>+</button>
            </div>
            <button className="produto-comprar primary" disabled={produto.estoque <= 0} onClick={comprar}>
              {produto.estoque > 0 ? "Adicionar ao carrinho" : "Produto sem estoque"}
            </button>
            {aviso && <p className="produto-aviso">{aviso}</p>}
            <p className={`produto-estoque ${produto.estoque > 0 && produto.estoque <= 5 ? "baixo" : ""}`}>
              {produto.estoque <= 0
                ? "Indisponível no momento"
                : produto.estoque <= 5
                  ? `Últimas ${produto.estoque} unidades!`
                  : `Em estoque: ${produto.estoque} unidades disponíveis`}
            </p>

            <form className="produto-frete" onSubmit={consultarFrete}>
              <label htmlFor="cep">Calcular frete e prazo</label>
              <div>
                <input
                  id="cep"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="00000-000"
                  value={cep}
                  onChange={e => setCep(e.target.value.replace(/[^\d-]/g, ""))}
                />
                <button type="submit" className="secondary" disabled={calculando}>
                  {calculando ? "..." : "Calcular"}
                </button>
              </div>
              {erroFrete && <p className="produto-frete-erro">{erroFrete}</p>}
              {frete && (
                <p className="produto-frete-resultado">
                  Entrega para {frete.cidade}/{frete.uf}:{" "}
                  <b>{frete.valor === 0 ? "Frete grátis" : money(frete.valor)}</b> · até {frete.prazo} dias úteis
                </p>
              )}
            </form>

            <ul className="produto-beneficios">
              <li>
                <b>Frete grátis</b> em compras acima de {money(FRETE_GRATIS_A_PARTIR)}
              </li>
              <li>
                <b>Troca grátis</b> em até 30 dias
              </li>
              <li>
                <b>Compra segura</b> com seus dados protegidos
              </li>
            </ul>
          </div>
        </section>

        <section className="produto-informacoes">
          <h2>Descrição do produto</h2>
          <p>{produto.descricao || "Produto esportivo selecionado pela GRENÁ."}</p>
          {(produto.marca || categoria) && (
            <p>
              {[
                produto.marca && `Produto original ${produto.marca}`,
                categoria && `da categoria ${categoria}`,
                produto.genero && `modelo ${produto.genero.toLowerCase()}`
              ]
                .filter(Boolean)
                .join(", ")}
              . Vendido e entregue pela GRENÁ.
            </p>
          )}

          <h2>Ficha técnica</h2>
          <div className="caracteristicas-grid">
            {fichaPreenchida.map(([nome, valor]) => (
              <div key={nome}>
                <span>{nome}</span>
                <strong>{valor}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="produto-informacoes produto-avaliacoes" id="avaliacoes">
          <h2>Avaliações dos clientes</h2>
          <div className="avaliacoes-topo">
            <div className="avaliacoes-media">
              <strong>{resumo.media.toFixed(1)}</strong>
              <Estrelas nota={resumo.media} tamanho="grande" />
              <span>
                {resumo.total} {resumo.total === 1 ? "avaliação" : "avaliações"}
              </span>
              {avaliacoes.length > 0 && <span className="avaliacoes-recomendam">{resumo.recomendam}% recomendam</span>}
            </div>

            <div className="avaliacoes-barras">
              {[5, 4, 3, 2, 1].map(n => {
                const qtdNota = resumo.distribuicao[n - 1];
                const pct = avaliacoes.length ? (qtdNota / avaliacoes.length) * 100 : 0;
                return (
                  <button
                    key={n}
                    type="button"
                    className={filtroNota === n ? "ativo" : ""}
                    onClick={() => setFiltroNota(filtroNota === n ? 0 : n)}
                    disabled={!qtdNota}
                  >
                    <span>{n} ★</span>
                    <span className="barra">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <span>{qtdNota}</span>
                  </button>
                );
              })}
            </div>

            <div className="avaliacoes-form">
              {!logado ? (
                <div className="avaliacoes-login">
                  <p>Comprou este produto? Conte para outros clientes o que achou.</p>
                  <Link to="/login" className="primary">
                    Entrar para avaliar
                  </Link>
                </div>
              ) : avaliacaoEnviada ? (
                <div className="avaliacoes-login">
                  <p>Obrigado! Sua avaliação foi publicada.</p>
                  <button type="button" className="secondary" onClick={() => setAvaliacaoEnviada(false)}>
                    Escrever outra
                  </button>
                </div>
              ) : (
                <form onSubmit={enviarAvaliacao}>
                  <strong>{minhaAvaliacao ? "Atualizar sua avaliação" : "Avalie este produto"}</strong>
                  <div className="avaliacoes-escolher-nota" onMouseLeave={() => setNotaHover(0)}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        type="button"
                        key={n}
                        aria-label={`${n} estrelas`}
                        className={(notaHover || nota) >= n ? "cheia" : ""}
                        onMouseEnter={() => setNotaHover(n)}
                        onClick={() => setNota(n)}
                      >
                        ★
                      </button>
                    ))}
                    <span>{ROTULO_NOTA[notaHover || nota]}</span>
                  </div>
                  <input placeholder="Título (ex.: Muito confortável)" value={titulo} maxLength={80} onChange={e => setTitulo(e.target.value)} />
                  <textarea
                    placeholder="Conte o que achou do produto: qualidade, conforto, tamanho..."
                    value={comentario}
                    maxLength={600}
                    rows={4}
                    onChange={e => setComentario(e.target.value)}
                  />
                  {(produto.tamanhos?.length || 0) > 0 && (
                    <select value={tamanhoUsado} onChange={e => setTamanhoUsado(e.target.value)}>
                      <option value="">Tamanho comprado (opcional)</option>
                      {produto.tamanhos!.map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  )}
                  <div className="avaliacoes-recomenda">
                    <span>Você recomendaria?</span>
                    <button type="button" className={recomenda ? "ativo" : ""} onClick={() => setRecomenda(true)}>
                      Sim
                    </button>
                    <button type="button" className={!recomenda ? "ativo" : ""} onClick={() => setRecomenda(false)}>
                      Não
                    </button>
                  </div>
                  {erroAvaliacao && <p className="produto-frete-erro">{erroAvaliacao}</p>}
                  <button type="submit" className="primary">
                    Publicar avaliação
                  </button>
                </form>
              )}
            </div>
          </div>

          {avaliacoes.length > 0 && (
            <div className="avaliacoes-barra-lista">
              <span>
                {filtroNota ? `Mostrando avaliações de ${filtroNota} estrela${filtroNota > 1 ? "s" : ""}` : "Todas as avaliações"}
                {filtroNota > 0 && (
                  <button type="button" onClick={() => setFiltroNota(0)}>
                    Limpar filtro
                  </button>
                )}
              </span>
              <select value={ordem} onChange={e => setOrdem(e.target.value)}>
                <option value="recentes">Mais recentes</option>
                <option value="maior">Maior nota</option>
                <option value="menor">Menor nota</option>
              </select>
            </div>
          )}

          {avaliacoes.length === 0 ? (
            <p className="avaliacoes-vazio">Este produto ainda não tem avaliações. Seja o primeiro a avaliar!</p>
          ) : (
            <ul className="avaliacoes-lista">
              {avaliacoesVisiveis.map(a => (
                <li key={a.id}>
                  <div className="avaliacao-cabecalho">
                    <span className="avaliacao-avatar">{a.nome.charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>{a.nome}</strong>
                      <small>{new Date(a.data).toLocaleDateString("pt-BR")}</small>
                    </div>
                    {(isAdmin || (idUsuario && a.idUsuario === idUsuario)) && (
                      <button type="button" className="avaliacao-excluir" onClick={() => excluirAvaliacao(a.id)}>
                        Excluir
                      </button>
                    )}
                  </div>
                  <div className="avaliacao-nota">
                    <Estrelas nota={a.nota} /> <b>{a.titulo}</b>
                  </div>
                  <p>{a.comentario}</p>
                  <div className="avaliacao-rodape">
                    {a.tamanho && <span>Tamanho comprado: {a.tamanho}</span>}
                    <span className={a.recomenda ? "sim" : "nao"}>
                      {a.recomenda ? "✓ Recomenda este produto" : "✗ Não recomenda"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {outros.length > 0 && (
          <section className="produto-relacionados">
            <h2>Você também pode gostar</h2>
            <div className="loja-grid nova-grid">
              {outros.map(r => {
                const res = resumoAvaliacoes(r);
                return (
                  <Link to={`/produto/${r.idProduto}`} className="produto-card produto-card-link" key={r.idProduto}>
                    <ImagemProduto nome={r.nome} imagem={r.imagem} />
                    <div className="produto-card-corpo">
                      <small>{r.marca || "GRENÁ"}</small>
                      <h3>{r.nome}</h3>
                      <div className="produto-rating">
                        ★ {res.media.toFixed(1)} <span>({res.total})</span>
                      </div>
                      <strong className="produto-preco">
                        {money(r.preco)} <small>no Pix</small>
                      </strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Rodape />
    </div>
  );
}

export default PProduto;
