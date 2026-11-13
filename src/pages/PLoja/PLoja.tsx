import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navegacao from "../../components/Navegacao/Navegacao";
import Rodape from "../../components/Rodape/Rodape";
import ImagemProduto from "../../components/ImagemProduto/ImagemProduto";
import { api } from "../../api";
import { useCarrinho } from "../../context/CarrinhoContext";
import { resumoAvaliacoes } from "../../avaliacoes";
import type { Categoria, Marca, Produto } from "../../types";
import { listarMarcas } from "../../marcas";
import bannerDesconto from "../../assets/banner-desconto.png";
import bannerVasco from "../../assets/banner-vasco.png";
import bannerNike from "../../assets/banner-nike.png";

const banners = [bannerDesconto, bannerVasco, bannerNike];
const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Compara sem se importar com maiúsculas/minúsculas e acentos (Grená = grena)
const norm = (v?: string | null) => (v || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const mesmo = (a?: string | null, b?: string | null) => norm(a) === norm(b);

// Ordem preferida de cada filtro. Só aparecem as opções que existem de verdade nos produtos (com a quantidade).
const ORDEM = {
    genero: ["Masculino", "Feminino", "Unissex"],
    tamanho: [
        "PP", "P", "M", "G", "GG", "XG", "XGG",
        "2", "4", "6", "8", "10", "12", "14", "16",
        ...Array.from({ length: 13 }, (_, i) => String(33 + i)),
        "Único",
    ],
    idade: ["Bebê", "Infantil", "Juvenil", "Adulto"],
};

type Opcao = { valor: string; total: number };

// Conta quantos produtos têm cada valor e devolve as opções (ordem fixa quando existir, senão A-Z).
function opcoesDe(valores: (string | null | undefined)[], ordem?: string[], extras: string[] = []): Opcao[] {
    const mapa = new Map<string, Opcao>();
    for (const v of valores) {
        const nome = (v || "").trim();
        if (!nome) continue;
        const k = norm(nome);
        const atual = mapa.get(k);
        if (atual) atual.total++; else mapa.set(k, { valor: nome, total: 1 });
    }
    // marcas cadastradas no banco que ainda não têm produto aparecem com (0)
    for (const e of extras) { if (!mapa.has(norm(e))) mapa.set(norm(e), { valor: e, total: 0 }); }
    const lista = [...mapa.values()];
    if (!ordem) return lista.sort((a, b) => a.valor.localeCompare(b.valor, "pt-BR"));
    const pos = (v: string) => { const i = ordem.findIndex(o => mesmo(o, v)); return i === -1 ? 999 : i; };
    return lista.sort((a, b) => pos(a.valor) - pos(b.valor) || a.valor.localeCompare(b.valor, "pt-BR"));
}

function PLoja() {
    const { quantidadeTotal } = useCarrinho();
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcasBanco, setMarcasBanco] = useState<Marca[]>([]);
    const [busca, setBusca] = useState("");
    const [cat, setCat] = useState<number | "todas">("todas");
    const [marca, setMarca] = useState("");
    const [genero, setGenero] = useState("");
    const [esporte, setEsporte] = useState("");
    const [tamanho, setTamanho] = useState("");
    const [cor, setCor] = useState("");
    const [idade, setIdade] = useState("");
    const [promo, setPromo] = useState(false);
    const [ordem, setOrdem] = useState("relevancia");
    const [carregando, setCarregando] = useState(true);
    const [aviso, setAviso] = useState("");
    const [banner, setBanner] = useState(0);

    useEffect(() => {
        Promise.all([api.listar<Produto>("produtos"), api.listar<Categoria>("categorias")])
            .then(([p, c]) => { setProdutos(p); setCategorias(c); })
            .catch(() => setAviso("Não foi possível carregar os produtos agora."))
            .finally(() => setCarregando(false));
        // marcas vêm direto da tabela "marca" do backend
        listarMarcas().then(setMarcasBanco).catch(() => setMarcasBanco([]));
    }, []);

    useEffect(() => {
        const i = setInterval(() => setBanner(b => (b + 1) % banners.length), 5000);
        return () => clearInterval(i);
    }, []);

    const filtrados = useMemo(() => {
        const q = norm(busca);
        let r = produtos.filter(p =>
            (cat === "todas" || p.idCategoria === cat) &&
            (!q || norm(`${p.nome} ${p.descricao || ""} ${p.marca || ""} ${p.esporte || ""}`).includes(q)) &&
            (!marca || mesmo(p.marca, marca)) &&
            (!genero || mesmo(p.genero, genero)) &&
            (!esporte || mesmo(p.esporte, esporte)) &&
            (!tamanho || (p.tamanhos || []).some(t => mesmo(t, tamanho))) &&
            (!cor || (p.cores || []).some(c => mesmo(c, cor))) &&
            (!idade || mesmo(p.faixaEtaria, idade)) &&
            (!promo || p.promocao || (p.desconto || 0) > 0)
        );
        if (ordem === "menor") r = [...r].sort((a, b) => a.preco - b.preco);
        if (ordem === "maior") r = [...r].sort((a, b) => b.preco - a.preco);
        if (ordem === "desconto") r = [...r].sort((a, b) => (b.desconto || 0) - (a.desconto || 0));
        if (ordem === "avaliacao") r = [...r].sort((a, b) => resumoAvaliacoes(b).media - resumoAvaliacoes(a).media);
        return r;
    }, [produtos, busca, cat, marca, genero, esporte, tamanho, cor, idade, promo, ordem]);

    // opções de cada filtro, montadas com o que existe no banco
    const listas = useMemo(() => ({
        marca: opcoesDe(produtos.map(p => p.marca), undefined, marcasBanco.map(m => m.nome)),
        genero: opcoesDe(produtos.map(p => p.genero), ORDEM.genero),
        esporte: opcoesDe(produtos.map(p => p.esporte)),
        tamanho: opcoesDe(produtos.flatMap(p => p.tamanhos || []), ORDEM.tamanho),
        cor: opcoesDe(produtos.flatMap(p => p.cores || [])),
        idade: opcoesDe(produtos.map(p => p.faixaEtaria), ORDEM.idade),
    }), [produtos, marcasBanco]);

    const filtros: [string, string, (v: string) => void, Opcao[]][] = [
        ["Marca", marca, setMarca, listas.marca],
        ["Gênero", genero, setGenero, listas.genero],
        ["Esporte", esporte, setEsporte, listas.esporte],
        ["Tamanho", tamanho, setTamanho, listas.tamanho],
        ["Cor", cor, setCor, listas.cor],
        ["Idade", idade, setIdade, listas.idade],
    ];
    const filtrosAtivos = filtros.filter(([, v]) => v).length + (promo ? 1 : 0);
    // muda quando qualquer filtro muda: a grade é remontada e os cards entram animados
    const chaveGrade = [cat, busca, marca, genero, esporte, tamanho, cor, idade, promo, ordem].join("|");

    const limpar = () => { setCat("todas"); setMarca(""); setGenero(""); setEsporte(""); setTamanho(""); setCor(""); setIdade(""); setPromo(false); setBusca(""); };

    return (
        <div className="loja-page">
            <Navegacao cartCount={quantidadeTotal} />
            <section className="loja-topo">
                <input className="loja-busca" placeholder="Buscar produtos, marcas e categorias..." value={busca} onChange={e => setBusca(e.target.value)} />
                <div className="loja-categorias">
                    <button className={cat === "todas" ? "active" : ""} onClick={() => setCat("todas")}>Todos</button>
                    {categorias.map(c => <button key={c.idCategoria} className={cat === c.idCategoria ? "active" : ""} onClick={() => setCat(c.idCategoria!)}>{c.nome}</button>)}
                </div>
            </section>
            <section className="loja-hero-banner">
                {banners.map((b, i) => <img key={b} src={b} className={`loja-banner-img ${i === banner ? "ativo" : ""}`} alt="Promoção GRENÁ" aria-hidden={i !== banner} />)}
                <div className="banner-dots">{banners.map((_, i) => <button key={i} className={i === banner ? "ativo" : ""} onClick={() => setBanner(i)} aria-label={`Banner ${i + 1}`} />)}</div>
                <button className="banner-seta banner-seta-esquerda" onClick={() => setBanner(b => (b - 1 + banners.length) % banners.length)}>‹</button>
                <button className="banner-seta banner-seta-direita" onClick={() => setBanner(b => (b + 1) % banners.length)}>›</button>
            </section>
            {aviso && <div className="toast">{aviso}</div>}
            <main className="catalogo-layout">
                <aside className="filtros-sidebar">
                    <div className="filtro-titulo">
                        <strong>Filtros{filtrosAtivos > 0 && <span className="filtro-contador">{filtrosAtivos}</span>}</strong>
                        <button onClick={limpar}>Limpar</button>
                    </div>
                    {filtros.map(([titulo, valor, setter, opcoes]) => (
                        <label className="filtro-grupo" key={titulo}>
                            <span>{titulo}</span>
                            <select value={valor} onChange={e => setter(e.target.value)} className={valor ? "filtro-ativo" : ""}>
                                <option value="">Todos</option>
                                {opcoes.map(o => <option key={o.valor} value={o.valor}>{o.valor} ({o.total})</option>)}
                            </select>
                        </label>
                    ))}
                    <label className="filtro-check"><input type="checkbox" checked={promo} onChange={e => setPromo(e.target.checked)} /> Somente promoções</label>
                </aside>
                <section className="catalogo-conteudo">
                    <div className="catalogo-barra">
                        <strong>{filtrados.length} produtos</strong>
                        <select value={ordem} onChange={e => setOrdem(e.target.value)}>
                            <option value="relevancia">Relevância</option>
                            <option value="menor">Menor preço</option>
                            <option value="maior">Maior preço</option>
                            <option value="desconto">Maior desconto</option>
                            <option value="avaliacao">Melhor avaliação</option>
                        </select>
                    </div>
                    <div className="loja-grid nova-grid" key={chaveGrade}>
                        {carregando && Array.from({ length: 8 }, (_, i) => <div key={i} className="produto-card skeleton-card" aria-hidden="true"><div className="skeleton-img" /><div className="skeleton-line" /><div className="skeleton-line curta" /></div>)}
                        {!carregando && filtrados.length === 0 && <p className="loja-estado">Nenhum produto encontrado com esses filtros.{filtrosAtivos > 0 && <> <button className="link" onClick={limpar}>Limpar filtros</button></>}</p>}
                        {filtrados.map((p, i) => (
                            <Link to={`/produto/${p.idProduto}`} className="produto-card produto-card-link" key={p.idProduto} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                                {(p.desconto || 0) > 0 && <span className="produto-desconto">-{p.desconto}%</span>}
                                <ImagemProduto nome={p.nome} imagem={p.imagem} />
                                <div className="produto-card-corpo">
                                    <small>{p.marca || "GRENÁ"}</small>
                                    <h3>{p.nome}</h3>
                                    <div className="produto-rating">★ {resumoAvaliacoes(p).media.toFixed(1)} <span>({resumoAvaliacoes(p).total})</span></div>
                                    {p.precoAnterior && <del>{money(p.precoAnterior)}</del>}
                                    <strong className="produto-preco">{money(p.preco)} <small>no Pix</small></strong>
                                    <p className="produto-parcela">ou {p.parcelas || 6}x de {money(p.preco / (p.parcelas || 6))} sem juros</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
            <Rodape />
        </div>
    );
}
export default PLoja;
