import { useEffect, useMemo, useState } from "react";
import Navegacao from "../../components/Navegacao/Navegacao";
import Rodape from "../../components/Rodape/Rodape";
import { api } from "../../api";
import { useCarrinho } from "../../context/CarrinhoContext";
import type { Categoria, Produto } from "../../types";
import grenaMascote from "../../assets/grena-mascote.png";
import produto01 from "../../assets/products/produto-01-sao-paulo-2025.jpg";
import camisaSpfc92 from "../../assets/products/produto-camisa-spfc-92.webp";
import produto02 from "../../assets/products/produto-02-palmeiras.jpg";
import produto03 from "../../assets/products/produto-03-corinthians.jpg";
import produto04 from "../../assets/products/produto-04-lakers.jpg";
import produto05 from "../../assets/products/produto-05-celtics.jpg";
import produto06 from "../../assets/products/produto-06-nike-air-run.jpg";
import produto07 from "../../assets/products/produto-07-puma-carina.jpg";
import produto08 from "../../assets/products/produto-08-puma-squad.jpg";
import produto09 from "../../assets/products/produto-09-inter-infantil.jpg";
import produto10 from "../../assets/products/produto-10-meias-puma.jpg";
import produto11 from "../../assets/products/produto-11-shorts-adidas.jpg";
import produto12 from "../../assets/products/produto-12-coqueteleira.jpg";

const imagensProdutos: Record<number, string> = {
  1: produto01,
  2: produto02,
  3: produto03,
  4: produto04,
  5: produto05,
  6: produto06,
  7: produto07,
  8: produto08,
  9: produto09,
  10: produto10,
  11: produto11,
  12: produto12,
};

function imagemDoProduto(produto: Produto) {
  const nome = produto.nome.trim().toLowerCase();
  const nomeNormalizado = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ehCamisaSpfc92 = nomeNormalizado.includes("sao paulo") && nomeNormalizado.includes("92/93");
  if (ehCamisaSpfc92) return camisaSpfc92;
  return imagensProdutos[produto.idProduto ?? 0];
}

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PLoja() {
  const { adicionar, quantidadeTotal } = useCarrinho();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    Promise.all([api.listar<Produto>("produtos"), api.listar<Categoria>("categorias")])
      .then(([p, c]) => {
        setProdutos(p);
        setCategorias(c);
      })
      .catch(() => setAviso("Não foi possível carregar os produtos agora."))
      .finally(() => setCarregando(false));
  }, []);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const bateCategoria = categoriaAtiva === "todas" || p.idCategoria === categoriaAtiva;
      const bateBusca = p.nome.toLowerCase().includes(busca.trim().toLowerCase());
      return bateCategoria && bateBusca;
    });
  }, [produtos, categoriaAtiva, busca]);

  function comprar(produto: Produto) {
    adicionar(produto, 1);
    setAviso(`${produto.nome} adicionado ao carrinho.`);
    window.setTimeout(() => setAviso(""), 2500);
  }

  return (
    <div className="loja-page">
      <Navegacao cartCount={quantidadeTotal} />

      <section className="loja-hero">
        <div>
          <span className="eyebrow">GRENÁ ESPORTES</span>
          <h1>Equipamento de verdade para quem treina de verdade.</h1>
          <p>Camisetas, chuteiras, bolas e acessórios esportivos com entrega para todo o Brasil.</p>
        </div>
        <img src={grenaMascote} alt="Mascote GRENÁ" className="loja-hero-mascote" />
      </section>

      <section className="loja-filtros">
        <div className="loja-categorias">
          <button className={categoriaAtiva === "todas" ? "active" : ""} onClick={() => setCategoriaAtiva("todas")}>
            Todas
          </button>
          {categorias.map(c => (
            <button
              key={c.idCategoria}
              className={categoriaAtiva === c.idCategoria ? "active" : ""}
              onClick={() => setCategoriaAtiva(c.idCategoria!)}
            >
              {c.nome}
            </button>
          ))}
        </div>
        <input
          className="loja-busca"
          placeholder="Buscar produto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </section>

      {aviso && <div className="toast">{aviso}</div>}

      <section className="loja-grid">
        {carregando && <p className="loja-estado">Carregando produtos...</p>}
        {!carregando && !produtosFiltrados.length && <p className="loja-estado">Nenhum produto encontrado.</p>}
        {produtosFiltrados.map(p => (
          <article key={p.idProduto} className="produto-card">
            <div className="produto-card-imagem">
              <img src={imagemDoProduto(p)} alt={p.nome} />
            </div>
            <div className="produto-card-corpo">
              <h3>{p.nome}</h3>
              <p>{p.descricao || "Sem descrição."}</p>
              <div className="produto-card-rodape">
                <strong>{money(p.preco)}</strong>
                <button
                  className="primary"
                  disabled={p.estoque <= 0}
                  onClick={() => comprar(p)}
                >
                  {p.estoque > 0 ? "Adicionar" : "Sem estoque"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <Rodape />
    </div>
  );
}

export default PLoja;
