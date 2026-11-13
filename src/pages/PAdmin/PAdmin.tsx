import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, healthCheck } from "../../api";
import type { ApiEntity, Categoria, Marca, Pedido, Produto, Usuario } from "../../types";
import AuthRequests from "../../fetch/AuthRequests";
import { useConfirmacao } from "../../components/Confirmacao/Confirmacao";
import { listarMarcas, criarMarca, atualizarMarca, removerMarca } from "../../marcas";
import catalogo from "../../data/catalogo-200.json";
import grenaLogo from "../../assets/grena-logo.png";
import grenaMascote from "../../assets/grena-mascote.png";

type Page = "dashboard" | "produtos" | "categorias" | "marcas" | "usuarios" | "pedidos";

const TITULOS: Record<Page, string> = {
  dashboard: "Visão geral", produtos: "Produtos", categorias: "Categorias", marcas: "Marcas", usuarios: "Usuários", pedidos: "Pedidos"
};
const SEM_MARCA = "__sem_marca__";
const STATUS_PEDIDO = ["PENDENTE", "PAGO", "PROCESSANDO", "ENVIADO", "CONCLUIDO", "CANCELADO"];
const POR_PAGINA = 40;

const emptyProduct: Produto = { nome: "", descricao: "", preco: 0, estoque: 0, idCategoria: 0, marca: "" };
const emptyCategory: Categoria = { nome: "" };
const emptyUser: Usuario = { nome: "", email: "", cpf: "", senha: "" };
const emptyOrder: Pedido = { idUsuario: 0, valorTotal: 0, status: "PENDENTE" };

const filtrosProdutoIniciais = { busca: "", categoria: "", marca: "", estoque: "", precoMin: "", precoMax: "", ordem: "recentes" };
const filtrosUsuarioIniciais = { busca: "", perfil: "" };
const filtrosPedidoIniciais = { busca: "", status: "", de: "", ate: "", valorMin: "" };

const norm = (v?: string | null) => (v || "").trim().toLowerCase();

function PAdmin() {
  const confirmar = useConfirmacao();
  const [page, setPage] = useState<Page>("dashboard");
  const [online, setOnline] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Produto[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [orders, setOrders] = useState<Pedido[]>([]);

  const [fProd, setFProd] = useState(filtrosProdutoIniciais);
  const [fUser, setFUser] = useState(filtrosUsuarioIniciais);
  const [fPed, setFPed] = useState(filtrosPedidoIniciais);
  const [fCat, setFCat] = useState("");
  const [fMarca, setFMarca] = useState({ busca: "", uso: "" });
  const [limite, setLimite] = useState(POR_PAGINA);

  const [productForm, setProductForm] = useState<Produto>(emptyProduct);
  const [categoryForm, setCategoryForm] = useState<Categoria>(emptyCategory);
  const [marcaForm, setMarcaForm] = useState({ nome: "" });
  const [userForm, setUserForm] = useState<Usuario>(emptyUser);
  const [orderForm, setOrderForm] = useState<Pedido>(emptyOrder);

  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState<{ feito: number; total: number } | null>(null);

  async function loadAll() {
    setLoading(true);
    const [p, c, u, o, m] = await Promise.allSettled([
      api.listar<Produto>("produtos"),
      api.listar<Categoria>("categorias"),
      api.listar<Usuario>("usuarios"),
      api.listar<Pedido>("pedidos"),
      listarMarcas()
    ]);
    if (p.status === "fulfilled") setProducts(p.value);
    if (c.status === "fulfilled") setCategories(c.value);
    if (u.status === "fulfilled") setUsers(u.value);
    if (o.status === "fulfilled") setOrders(o.value);
    if (m.status === "fulfilled") setMarcas(m.value);
    const falhas = [["produtos", p], ["categorias", c], ["usuarios", u], ["pedidos", o]]
      .filter(([, r]) => (r as PromiseSettledResult<unknown>).status === "rejected")
      .map(([nome, r]) => `${nome}: ${((r as PromiseRejectedResult).reason as Error)?.message ?? "erro"}`);
    if (falhas.length) setMessage(falhas.join(" | "));
    setLoading(false);
  }

  useEffect(() => {
    healthCheck().then(() => setOnline(true)).catch(() => setOnline(false));
    loadAll();
  }, []);

  useEffect(() => { setLimite(POR_PAGINA); }, [fProd]);

  function irPara(p: Page) {
    cancelEdit();
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  }

  // ---------- contagens ----------
  const produtosPorMarca = useMemo(() => {
    const mapa = new Map<string, number>();
    products.forEach(p => { const k = norm(p.marca); if (k) mapa.set(k, (mapa.get(k) || 0) + 1); });
    return mapa;
  }, [products]);

  const semMarca = useMemo(() => products.filter(p => !norm(p.marca)).length, [products]);
  const estoqueBaixo = useMemo(() => products.filter(p => Number(p.estoque) <= 5).length, [products]);

  // marcas cadastradas + marcas que aparecem nos produtos mas ainda não foram cadastradas
  const opcoesMarca = useMemo(() => {
    const nomes = new Map<string, string>();
    marcas.forEach(m => nomes.set(norm(m.nome), m.nome));
    products.forEach(p => { if (norm(p.marca) && !nomes.has(norm(p.marca))) nomes.set(norm(p.marca), p.marca!.trim()); });
    return [...nomes.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [marcas, products]);

  const topMarcas = useMemo(() => [...produtosPorMarca.entries()]
    .map(([k, total]) => ({ nome: opcoesMarca.find(n => norm(n) === k) || k, total }))
    .sort((a, b) => b.total - a.total).slice(0, 6), [produtosPorMarca, opcoesMarca]);

  const stats = { products: products.length, categories: categories.length, marcas: opcoesMarca.length, users: users.length, orders: orders.length };

  // ---------- CRUD ----------
  function corpoProduto(p: Produto) {
    const lista = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split(",")).map(x => String(x).trim()).filter(Boolean);
    return {
      nome: p.nome.trim(),
      descricao: p.descricao?.trim() || "",
      preco: Number(p.preco),
      estoque: Number(p.estoque),
      idCategoria: Number(p.idCategoria),
      // o backend liga a marca pelo nome (cria se for nova); null tira a marca do produto
      marca: p.marca?.trim() || null,
      genero: p.genero?.trim() || null,
      esporte: p.esporte?.trim() || null,
      faixaEtaria: p.faixaEtaria?.trim() || null,
      cores: lista(p.cores),
      tamanhos: lista(p.tamanhos),
      precoAnterior: p.precoAnterior ? Number(p.precoAnterior) : null,
      promocao: Boolean(p.promocao) || (Number(p.precoAnterior) > Number(p.preco))
    };
  }

  async function submitProduct(e: FormEvent) {
    e.preventDefault();
    try {
      const body = corpoProduto(productForm);
      if (!body.nome || body.preco < 0 || body.estoque < 0 || !body.idCategoria) {
        notify("Preencha nome, preço, estoque e categoria corretamente.");
        return;
      }
      if (editing) await api.atualizar("produtos", editing, body);
      else await api.criar("produtos", body);
      setProductForm(emptyProduct);
      setEditing(null);
      await loadAll();
      notify(editing ? "Produto atualizado." : "Produto cadastrado.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao salvar produto.");
    }
  }

  async function trocarMarcaProduto(p: Produto, marca: string) {
    if (!p.idProduto) return;
    const anterior = p.marca;
    setProducts(lista => lista.map(x => (x.idProduto === p.idProduto ? { ...x, marca } : x)));
    try {
      await api.atualizar("produtos", p.idProduto, corpoProduto({ ...p, marca }));
      notify(marca ? `Marca de "${p.nome}" agora é ${marca}.` : `Marca removida de "${p.nome}".`);
    } catch (error) {
      setProducts(lista => lista.map(x => (x.idProduto === p.idProduto ? { ...x, marca: anterior } : x)));
      notify(error instanceof Error ? error.message : "Não foi possível trocar a marca.");
    }
  }

  async function submitCategory(e: FormEvent) {
    e.preventDefault();
    try {
      const body = { nome: categoryForm.nome.trim() };
      if (!body.nome) return notify("Informe o nome da categoria.");
      if (editing) await api.atualizar("categorias", editing, body);
      else await api.criar("categorias", body);
      setCategoryForm(emptyCategory);
      setEditing(null);
      await loadAll();
      notify(editing ? "Categoria atualizada." : "Categoria cadastrada.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao salvar categoria.");
    }
  }

  async function submitMarca(e: FormEvent) {
    e.preventDefault();
    const nome = marcaForm.nome.trim();
    if (!nome) return notify("Informe o nome da marca.");
    try {
      // produtos e marcas são ligados por id no banco: renomear aqui já vale para todos os produtos da marca
      if (editing) await atualizarMarca(editing, nome);
      else await criarMarca(nome);
      setMarcaForm({ nome: "" });
      setEditing(null);
      await loadAll();
      notify(editing ? "Marca atualizada." : "Marca cadastrada.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao salvar marca.");
    }
  }

  async function submitUser(e: FormEvent) {
    e.preventDefault();
    try {
      const body = { nome: userForm.nome.trim(), email: userForm.email.trim(), cpf: userForm.cpf.trim(), senha: userForm.senha };
      if (!body.nome || !body.email || !body.cpf || (!editing && !body.senha)) {
        return notify("Nome, e-mail, CPF e senha são obrigatórios no cadastro.");
      }
      if (editing) await api.atualizar("usuarios", editing, body);
      else await api.criar("usuarios", body);
      setUserForm(emptyUser);
      setEditing(null);
      await loadAll();
      notify(editing ? "Usuário atualizado." : "Usuário cadastrado.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao salvar usuário.");
    }
  }

  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    try {
      const body = { idUsuario: Number(orderForm.idUsuario), valorTotal: Number(orderForm.valorTotal), status: orderForm.status || "PENDENTE" };
      if (!body.idUsuario || body.valorTotal < 0) return notify("Informe usuário e valor total.");
      if (editing) await api.atualizar("pedidos", editing, body);
      else await api.criar("pedidos", body);
      setOrderForm(emptyOrder);
      setEditing(null);
      await loadAll();
      notify(editing ? "Pedido atualizado." : "Pedido cadastrado.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao salvar pedido.");
    }
  }

  async function remove(entity: ApiEntity, id?: number) {
    if (!id) return;
    const ok = await confirmar({ titulo: "Excluir registro", mensagem: "Tem certeza que deseja excluir este registro? Essa ação não pode ser desfeita.", confirmar: "Excluir", perigo: true });
    if (!ok) return;
    try {
      await api.remover(entity, id);
      await loadAll();
      notify("Registro removido com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  async function removeMarca(m: Marca) {
    if (!m.idMarca) return;
    const qtd = produtosPorMarca.get(norm(m.nome)) || 0;
    const ok = await confirmar({
      titulo: `Excluir a marca ${m.nome}?`,
      mensagem: qtd ? `${qtd} produto(s) usam essa marca. Eles ficarão sem marca até você escolher outra.` : "A marca será removida.",
      confirmar: "Excluir", perigo: true
    });
    if (!ok) return;
    try {
      await removerMarca(m.idMarca);
      await loadAll();
      notify("Marca removida.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível remover a marca.");
    }
  }

  async function cadastrarMarcaAvulsa(nome: string) {
    try { await criarMarca(nome); await loadAll(); notify(`Marca ${nome} cadastrada.`); }
    catch (error) { notify(error instanceof Error ? error.message : "Erro ao cadastrar marca."); }
  }

  // ---------- importação do catálogo (200 produtos) ----------
  async function importarCatalogo() {
    const existentes = new Set(products.map(p => norm(p.nome)));
    const novos = catalogo.produtos.filter(p => !existentes.has(norm(p.nome)));
    if (!novos.length) return notify("Os 200 produtos do catálogo já estão cadastrados.");
    const camisas = novos.filter(p => p.categoria === "Camisas de Time").length;
    const ok = await confirmar({
      titulo: "Importar catálogo GRENÁ",
      mensagem: `Vamos cadastrar ${novos.length} produtos (${camisas} camisas de time), já com marca e categoria. Produtos que você já tem não são alterados.`,
      confirmar: "Importar agora"
    });
    if (!ok) return;

    try {
      setImportando({ feito: 0, total: novos.length });
      let cats = categories;
      const faltando = [...new Set(novos.map(p => p.categoria))].filter(n => !cats.some(c => norm(c.nome) === norm(n)));
      for (const nome of faltando) await api.criar("categorias", { nome });
      if (faltando.length) cats = await api.listar<Categoria>("categorias");

      const marcasAtuais = await listarMarcas();
      for (const nome of catalogo.marcas) {
        if (!marcasAtuais.some(m => norm(m.nome) === norm(nome))) await criarMarca(nome).catch(() => undefined);
      }

      let erros = 0;
      const LOTE = 5;
      for (let i = 0; i < novos.length; i += LOTE) {
        const lote = novos.slice(i, i + LOTE);
        const res = await Promise.allSettled(lote.map(p => {
          const { categoria, ...resto } = p;
          const idCategoria = cats.find(c => norm(c.nome) === norm(categoria))?.idCategoria;
          return api.criar("produtos", { ...resto, idCategoria });
        }));
        erros += res.filter(r => r.status === "rejected").length;
        setImportando({ feito: Math.min(i + LOTE, novos.length), total: novos.length });
      }
      await loadAll();
      notify(erros ? `Importação concluída com ${erros} erro(s).` : `${novos.length} produtos importados com sucesso!`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erro ao importar o catálogo.");
    } finally {
      setImportando(null);
    }
  }

  // ---------- edição ----------
  function editProduct(item: Produto) {
    setEditing(item.idProduto ?? null);
    setProductForm({ ...item, preco: Number(item.preco), estoque: Number(item.estoque) });
    setPage("produtos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function editCategory(item: Categoria) { setEditing(item.idCategoria ?? null); setCategoryForm({ nome: item.nome }); setPage("categorias"); }
  function editMarca(item: Marca) { setEditing(item.idMarca ?? null); setMarcaForm({ nome: item.nome }); setPage("marcas"); }
  function editUser(item: Usuario) { setEditing(item.idUsuario ?? null); setUserForm({ ...item, senha: "" }); setPage("usuarios"); }
  function editOrder(item: Pedido) {
    setEditing(item.idPedido ?? null);
    setOrderForm({ idUsuario: Number(item.idUsuario), valorTotal: Number(item.valorTotal), status: item.status || "PENDENTE", idPedido: item.idPedido });
    setPage("pedidos");
  }
  function cancelEdit() {
    setEditing(null);
    setProductForm(emptyProduct);
    setCategoryForm(emptyCategory);
    setMarcaForm({ nome: "" });
    setUserForm(emptyUser);
    setOrderForm(emptyOrder);
  }

  const categoryName = (id: number) => categories.find(c => c.idCategoria === id)?.nome || `Categoria #${id}`;
  const userName = (id: number) => users.find(u => u.idUsuario === id)?.nome || `Usuário #${id}`;

  // ---------- filtros ----------
  const filteredProducts = useMemo(() => {
    const q = norm(fProd.busca);
    const min = fProd.precoMin === "" ? -Infinity : Number(fProd.precoMin);
    const max = fProd.precoMax === "" ? Infinity : Number(fProd.precoMax);
    let r = products.filter(p => {
      if (q && !`${p.nome} ${p.marca || ""} ${p.descricao || ""} ${p.codProduto || ""} ${categoryName(p.idCategoria)}`.toLowerCase().includes(q)) return false;
      if (fProd.categoria && p.idCategoria !== Number(fProd.categoria)) return false;
      if (fProd.marca === SEM_MARCA && norm(p.marca)) return false;
      if (fProd.marca && fProd.marca !== SEM_MARCA && norm(p.marca) !== norm(fProd.marca)) return false;
      const est = Number(p.estoque);
      if (fProd.estoque === "disponivel" && est <= 0) return false;
      if (fProd.estoque === "baixo" && (est <= 0 || est > 5)) return false;
      if (fProd.estoque === "zerado" && est > 0) return false;
      const preco = Number(p.preco);
      return preco >= min && preco <= max;
    });
    const por = {
      nome: (a: Produto, b: Produto) => a.nome.localeCompare(b.nome, "pt-BR"),
      precoAsc: (a: Produto, b: Produto) => Number(a.preco) - Number(b.preco),
      precoDesc: (a: Produto, b: Produto) => Number(b.preco) - Number(a.preco),
      estoque: (a: Produto, b: Produto) => Number(a.estoque) - Number(b.estoque),
      marca: (a: Produto, b: Produto) => (a.marca || "~").localeCompare(b.marca || "~", "pt-BR"),
      recentes: (a: Produto, b: Produto) => (b.idProduto || 0) - (a.idProduto || 0)
    } as Record<string, (a: Produto, b: Produto) => number>;
    return [...r].sort(por[fProd.ordem] || por.recentes);
  }, [products, categories, fProd]);

  const filteredCategories = categories.filter(c => norm(c.nome).includes(norm(fCat)));

  const linhasMarcas = useMemo(() => {
    const cadastradas = marcas.map(m => ({ ...m, total: produtosPorMarca.get(norm(m.nome)) || 0, cadastrada: true }));
    const soNosProdutos = opcoesMarca
      .filter(n => !marcas.some(m => norm(m.nome) === norm(n)))
      .map(n => ({ idMarca: undefined, nome: n, total: produtosPorMarca.get(norm(n)) || 0, cadastrada: false }));
    return [...cadastradas, ...soNosProdutos]
      .filter(m => norm(m.nome).includes(norm(fMarca.busca)))
      .filter(m => fMarca.uso === "" || (fMarca.uso === "com" ? m.total > 0 : m.total === 0))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [marcas, opcoesMarca, produtosPorMarca, fMarca]);

  const filteredUsers = users.filter(u =>
    `${u.nome} ${u.email} ${u.cpf || ""}`.toLowerCase().includes(norm(fUser.busca)) &&
    (!fUser.perfil || (u.role || "cliente") === fUser.perfil));

  const filteredOrders = orders.filter(o => {
    if (!`${o.codPedido || ""} ${o.idPedido} ${userName(o.idUsuario)} ${o.status || ""}`.toLowerCase().includes(norm(fPed.busca))) return false;
    if (fPed.status && (o.status || "PENDENTE").toUpperCase() !== fPed.status) return false;
    if (fPed.valorMin && Number(o.valorTotal) < Number(fPed.valorMin)) return false;
    const data = o.dataPedido ? o.dataPedido.slice(0, 10) : "";
    if (fPed.de && (!data || data < fPed.de)) return false;
    if (fPed.ate && (!data || data > fPed.ate)) return false;
    return true;
  });

  const filtrosAtivosProd = Object.entries(fProd).filter(([k, v]) => k !== "ordem" && v !== "").length;
  const filtrosAtivosPed = Object.values(fPed).filter(v => v !== "").length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={grenaLogo} alt="Logo GRENÁ" />
          <div><strong>GRENÁ</strong><span>GESTÃO</span></div>
        </div>

        <nav>
          {([
            ["dashboard", "⌂", "Dashboard"], ["produtos", "▣", "Produtos"], ["categorias", "◈", "Categorias"],
            ["marcas", "★", "Marcas"], ["usuarios", "♙", "Usuários"], ["pedidos", "▤", "Pedidos"]
          ] as [Page, string, string][]).map(([id, icone, nome]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => irPara(id)}>
              <span className="nav-icon">{icone}</span>{nome}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-actions">
          <Link className="secondary admin-link" to="/loja">↗ Ver loja</Link>
          <button className="secondary admin-link" onClick={() => AuthRequests.logout()}>⏻ Sair</button>
        </div>

        <div className="api-status">
          <span className={online ? "dot online" : "dot"} />
          <div><small>Servidor</small><strong>{online ? "Conectado" : "Offline"}</strong></div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">PAINEL ADMINISTRATIVO</span>
            <h1 key={page} className="topbar-title">{TITULOS[page]}</h1>
          </div>
          <div className="top-actions">
            <button className="secondary" onClick={loadAll}>{loading ? "Atualizando..." : "↻ Atualizar"}</button>
          </div>
        </header>

        {message && <div className="toast">{message}</div>}

        <div key={page} className="admin-page-anim">
        {page === "dashboard" && (
          <section>
            <div className="hero">
              <div>
                <span className="eyebrow">BEM-VINDO DE VOLTA</span>
                <h2>Sua loja em campo, em tempo real.</h2>
                <p>Acompanhe produtos, marcas, clientes e pedidos da GRENÁ em um só lugar.</p>
                <div className="hero-chips">
                  <span>{semMarca} produto(s) sem marca</span>
                  <span>{estoqueBaixo} com estoque baixo</span>
                </div>
              </div>
              <div className="hero-visual"><img className="hero-mascot" src={grenaMascote} alt="Mascote do GRENÁ" /><div className="hero-badge">{online ? "ONLINE" : "OFFLINE"}</div></div>
            </div>

            <div className="stats">
              <Stat title="Produtos" value={stats.products} icon="▣" onClick={() => irPara("produtos")} />
              <Stat title="Categorias" value={stats.categories} icon="◈" onClick={() => irPara("categorias")} />
              <Stat title="Marcas" value={stats.marcas} icon="★" onClick={() => irPara("marcas")} />
              <Stat title="Usuários" value={stats.users} icon="♙" onClick={() => irPara("usuarios")} />
              <Stat title="Pedidos" value={stats.orders} icon="▤" onClick={() => irPara("pedidos")} />
            </div>

            <div className="grid-3">
              <div className="panel">
                <div className="panel-title"><h3>Últimos pedidos</h3><button className="link" onClick={() => irPara("pedidos")}>Ver todos</button></div>
                {orders.slice(0, 5).map(order => (
                  <div className="list-row" key={order.idPedido}>
                    <div className="avatar">{(userName(order.idUsuario)[0] || "U").toUpperCase()}</div>
                    <div className="grow"><strong>{order.codPedido || `Pedido #${order.idPedido}`}</strong><span>{userName(order.idUsuario)}</span></div>
                    <div className="right"><strong>{money(order.valorTotal)}</strong><Status status={order.status} /></div>
                  </div>
                ))}
                {!orders.length && <Empty text="Nenhum pedido encontrado." />}
              </div>

              <div className="panel">
                <div className="panel-title"><h3>Marcas com mais produtos</h3><button className="link" onClick={() => irPara("marcas")}>Gerenciar</button></div>
                <div className="barras-marcas">
                  {topMarcas.map((m, i) => (
                    <button key={m.nome} className="barra-marca" style={{ "--i": i } as React.CSSProperties} onClick={() => { setFProd({ ...filtrosProdutoIniciais, marca: m.nome }); irPara("produtos"); }}>
                      <span>{m.nome}</span>
                      <div className="barra-trilho"><div className="barra-cheia" style={{ width: `${(m.total / (topMarcas[0]?.total || 1)) * 100}%` }} /></div>
                      <b>{m.total}</b>
                    </button>
                  ))}
                </div>
                {!topMarcas.length && <Empty text="Nenhum produto com marca ainda." />}
              </div>

              <div className="panel">
                <div className="panel-title"><h3>Estoque baixo</h3><button className="link" onClick={() => { setFProd({ ...filtrosProdutoIniciais, estoque: "baixo" }); irPara("produtos"); }}>Ver todos</button></div>
                {products.filter(p => Number(p.estoque) <= 5).slice(0, 5).map(product => (
                  <div className="list-row" key={product.idProduto}>
                    <div className="product-icon">{(product.marca || "P")[0]}</div>
                    <div className="grow"><strong>{product.nome}</strong><span>{product.marca || "Sem marca"} · {categoryName(product.idCategoria)}</span></div>
                    <div className={`stock ${Number(product.estoque) <= 0 ? "zerado" : ""}`}>{product.estoque} un.</div>
                  </div>
                ))}
                {!estoqueBaixo && <Empty text="Tudo certo com o estoque." />}
              </div>
            </div>
          </section>
        )}

        {page === "produtos" && (
          <section className="page-grid">
            <div className="admin-col">
              <FormPanel title={editing ? "Editar produto" : "Novo produto"} onSubmit={submitProduct} onCancel={editing ? cancelEdit : undefined}>
                <Field label="Nome"><input value={productForm.nome} onChange={e => setProductForm({ ...productForm, nome: e.target.value })} placeholder="Ex.: Camisa I 2025/26 Flamengo" /></Field>
                <Field label="Descrição"><textarea value={productForm.descricao || ""} onChange={e => setProductForm({ ...productForm, descricao: e.target.value })} placeholder="Descrição do produto" /></Field>
                <div className="two-cols">
                  <Field label="Preço"><input type="number" min="0" step="0.01" value={productForm.preco} onChange={e => setProductForm({ ...productForm, preco: Number(e.target.value) })} /></Field>
                  <Field label="Estoque"><input type="number" min="0" value={productForm.estoque} onChange={e => setProductForm({ ...productForm, estoque: Number(e.target.value) })} /></Field>
                </div>
                <div className="two-cols">
                  <Field label="Marca">
                    <select value={productForm.marca || ""} onChange={e => setProductForm({ ...productForm, marca: e.target.value })}>
                      <option value="">Sem marca</option>
                      {opcoesMarca.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Categoria">
                    <select value={productForm.idCategoria || ""} onChange={e => setProductForm({ ...productForm, idCategoria: Number(e.target.value) })}>
                      <option value="">Selecione</option>
                      {categories.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nome}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="two-cols">
                  <Field label="Gênero">
                    <select value={productForm.genero || ""} onChange={e => setProductForm({ ...productForm, genero: e.target.value })}>
                      <option value="">Não definido</option>
                      {["Masculino", "Feminino", "Unissex"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Faixa etária">
                    <select value={productForm.faixaEtaria || ""} onChange={e => setProductForm({ ...productForm, faixaEtaria: e.target.value })}>
                      <option value="">Não definida</option>
                      {["Bebê", "Infantil", "Juvenil", "Adulto"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="two-cols">
                  <Field label="Esporte"><input value={productForm.esporte || ""} onChange={e => setProductForm({ ...productForm, esporte: e.target.value })} placeholder="Ex.: Futebol" /></Field>
                  <Field label="Preço anterior (promoção)"><input type="number" min="0" step="0.01" value={productForm.precoAnterior || ""} onChange={e => setProductForm({ ...productForm, precoAnterior: Number(e.target.value) || undefined })} placeholder="Opcional" /></Field>
                </div>
                <div className="two-cols">
                  <Field label="Tamanhos (separe por vírgula)"><input value={Array.isArray(productForm.tamanhos) ? productForm.tamanhos.join(", ") : ""} onChange={e => setProductForm({ ...productForm, tamanhos: e.target.value.split(",").map(x => x.trim()) })} placeholder="P, M, G" /></Field>
                  <Field label="Cores (separe por vírgula)"><input value={Array.isArray(productForm.cores) ? productForm.cores.join(", ") : ""} onChange={e => setProductForm({ ...productForm, cores: e.target.value.split(",").map(x => x.trim()) })} placeholder="Preto, Branco" /></Field>
                </div>
                <button type="button" className="link small-link" onClick={() => irPara("marcas")}>+ Cadastrar nova marca</button>
              </FormPanel>

              <div className="panel import-panel">
                <div className="panel-title"><h3>Catálogo GRENÁ</h3><span className="count">200</span></div>
                <p className="hint">Cadastra de uma vez 200 produtos (100 camisas de time + 100 outros), já com marca e categoria. Os produtos que você já tem não mudam.</p>
                {importando ? (
                  <div className="progresso">
                    <div className="progresso-trilho"><div className="progresso-cheio" style={{ width: `${(importando.feito / importando.total) * 100}%` }} /></div>
                    <small>{importando.feito} de {importando.total} produtos...</small>
                  </div>
                ) : (
                  <button className="primary full" onClick={importarCatalogo}>⇪ Importar 200 produtos</button>
                )}
              </div>

              <BuscaPorId<Produto> entity="produtos" dados={products} titulo="Buscar produto por ID" render={p => <><Dado label="ID">#{p.idProduto}</Dado><Dado label="Código">{p.codProduto || "—"}</Dado><Dado label="Nome">{p.nome}</Dado><Dado label="Marca">{p.marca || "—"}</Dado><Dado label="Categoria">{categoryName(p.idCategoria)}</Dado><Dado label="Preço">{money(p.preco)}</Dado><Dado label="Estoque">{p.estoque}</Dado><Dado label="Descrição">{p.descricao || "Sem descrição"}</Dado></>} />
            </div>

            <TablePanel title="Produtos" count={filteredProducts.length}>
              <FilterBar ativos={filtrosAtivosProd} onLimpar={() => setFProd(filtrosProdutoIniciais)}>
                <FilterField label="Pesquisar" wide>
                  <input className="admin-search" value={fProd.busca} onChange={e => setFProd({ ...fProd, busca: e.target.value })} placeholder="Nome, código, marca ou descrição..." />
                </FilterField>
                <FilterField label="Marca">
                  <select value={fProd.marca} onChange={e => setFProd({ ...fProd, marca: e.target.value })}>
                    <option value="">Todas as marcas</option>
                    <option value={SEM_MARCA}>Sem marca ({semMarca})</option>
                    {opcoesMarca.map(m => <option key={m} value={m}>{m} ({produtosPorMarca.get(norm(m)) || 0})</option>)}
                  </select>
                </FilterField>
                <FilterField label="Categoria">
                  <select value={fProd.categoria} onChange={e => setFProd({ ...fProd, categoria: e.target.value })}>
                    <option value="">Todas</option>
                    {categories.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nome}</option>)}
                  </select>
                </FilterField>
                <FilterField label="Estoque">
                  <select value={fProd.estoque} onChange={e => setFProd({ ...fProd, estoque: e.target.value })}>
                    <option value="">Todos</option>
                    <option value="disponivel">Disponível</option>
                    <option value="baixo">Baixo (até 5)</option>
                    <option value="zerado">Esgotado</option>
                  </select>
                </FilterField>
                <FilterField label="Preço mín.">
                  <input type="number" min="0" value={fProd.precoMin} onChange={e => setFProd({ ...fProd, precoMin: e.target.value })} placeholder="R$ 0" />
                </FilterField>
                <FilterField label="Preço máx.">
                  <input type="number" min="0" value={fProd.precoMax} onChange={e => setFProd({ ...fProd, precoMax: e.target.value })} placeholder="R$ 9999" />
                </FilterField>
                <FilterField label="Ordenar">
                  <select value={fProd.ordem} onChange={e => setFProd({ ...fProd, ordem: e.target.value })}>
                    <option value="recentes">Mais recentes</option>
                    <option value="nome">Nome (A-Z)</option>
                    <option value="marca">Marca (A-Z)</option>
                    <option value="precoAsc">Menor preço</option>
                    <option value="precoDesc">Maior preço</option>
                    <option value="estoque">Menor estoque</option>
                  </select>
                </FilterField>
              </FilterBar>

              <div className="marca-chips">
                <button className={fProd.marca === "" ? "ativo" : ""} onClick={() => setFProd({ ...fProd, marca: "" })}>Todas</button>
                <button className={fProd.marca === SEM_MARCA ? "ativo" : ""} onClick={() => setFProd({ ...fProd, marca: SEM_MARCA })}>Sem marca · {semMarca}</button>
                {opcoesMarca.filter(m => produtosPorMarca.get(norm(m))).map(m => (
                  <button key={m} className={fProd.marca === m ? "ativo" : ""} onClick={() => setFProd({ ...fProd, marca: m })}>{m} · {produtosPorMarca.get(norm(m))}</button>
                ))}
              </div>

              <div className="table-scroll">
                <table><thead><tr><th>Produto</th><th>Marca</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Ações</th></tr></thead>
                <tbody>{filteredProducts.slice(0, limite).map((p, i) => (
                  <tr key={p.idProduto} style={{ "--i": Math.min(i, 15) } as React.CSSProperties}>
                    <td><strong>{p.nome}</strong><small>{p.descricao || "Sem descrição"}</small></td>
                    <td>
                      <select className={`inline-select ${p.marca ? "" : "vazio"}`} value={p.marca || ""} onChange={e => trocarMarcaProduto(p, e.target.value)} aria-label={`Marca de ${p.nome}`}>
                        <option value="">— sem marca —</option>
                        {opcoesMarca.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </td>
                    <td><span className="tag">{categoryName(p.idCategoria)}</span></td>
                    <td>{money(p.preco)}</td>
                    <td><span className={`estoque-pill ${Number(p.estoque) <= 0 ? "zerado" : Number(p.estoque) <= 5 ? "baixo" : ""}`}>{p.estoque}</span></td>
                    <td><Actions onEdit={() => editProduct(p)} onDelete={() => remove("produtos", p.idProduto)} /></td>
                  </tr>
                ))}</tbody></table>
              </div>
              {filteredProducts.length > limite && <button className="secondary mostrar-mais" onClick={() => setLimite(l => l + POR_PAGINA)}>Mostrar mais ({filteredProducts.length - limite} restantes)</button>}
              {!filteredProducts.length && <Empty text="Nenhum produto encontrado com esses filtros." />}
            </TablePanel>
          </section>
        )}

        {page === "categorias" && (
          <section className="page-grid compact">
            <div className="admin-col">
              <FormPanel title={editing ? "Editar categoria" : "Nova categoria"} onSubmit={submitCategory} onCancel={editing ? cancelEdit : undefined}>
                <Field label="Nome"><input value={categoryForm.nome} onChange={e => setCategoryForm({ nome: e.target.value })} placeholder="Ex.: Camisas de Time" /></Field>
              </FormPanel>
              <BuscaPorId<Categoria> entity="categorias" dados={categories} titulo="Buscar categoria por ID" render={c => <><Dado label="ID">#{c.idCategoria}</Dado><Dado label="Nome">{c.nome}</Dado></>} />
            </div>
            <TablePanel title="Categorias" count={filteredCategories.length}>
              <FilterBar ativos={fCat ? 1 : 0} onLimpar={() => setFCat("")}>
                <FilterField label="Pesquisar" wide><input className="admin-search" value={fCat} onChange={e => setFCat(e.target.value)} placeholder="Nome da categoria..." /></FilterField>
              </FilterBar>
              <div className="table-scroll">
                <table><thead><tr><th>ID</th><th>Nome</th><th>Produtos</th><th>Ações</th></tr></thead>
                <tbody>{filteredCategories.map((c, i) => <tr key={c.idCategoria} style={{ "--i": Math.min(i, 15) } as React.CSSProperties}><td>#{c.idCategoria}</td><td><strong>{c.nome}</strong></td><td>{products.filter(p => p.idCategoria === c.idCategoria).length}</td><td><Actions onEdit={() => editCategory(c)} onDelete={() => remove("categorias", c.idCategoria)} /></td></tr>)}</tbody></table>
              </div>
              {!filteredCategories.length && <Empty text="Nenhuma categoria encontrada." />}
            </TablePanel>
          </section>
        )}

        {page === "marcas" && (
          <section className="page-grid compact">
            <div className="admin-col">
              <FormPanel title={editing ? "Editar marca" : "Nova marca"} onSubmit={submitMarca} onCancel={editing ? cancelEdit : undefined}>
                <Field label="Nome da marca"><input value={marcaForm.nome} onChange={e => setMarcaForm({ nome: e.target.value })} placeholder="Ex.: Nike, Adidas, Umbro" /></Field>
              </FormPanel>
              <div className="panel">
                <div className="panel-title"><h3>Resumo</h3></div>
                <div className="resumo-marcas">
                  <div><strong>{marcas.length}</strong><span>marcas cadastradas</span></div>
                  <div><strong>{products.length - semMarca}</strong><span>produtos com marca</span></div>
                  <div><strong>{semMarca}</strong><span>produtos sem marca</span></div>
                </div>
                {semMarca > 0 && <button className="secondary full" onClick={() => { setFProd({ ...filtrosProdutoIniciais, marca: SEM_MARCA }); irPara("produtos"); }}>Definir marca dos produtos sem marca →</button>}
                
              </div>
            </div>
            <TablePanel title="Marcas" count={linhasMarcas.length}>
              <FilterBar ativos={(fMarca.busca ? 1 : 0) + (fMarca.uso ? 1 : 0)} onLimpar={() => setFMarca({ busca: "", uso: "" })}>
                <FilterField label="Pesquisar" wide><input className="admin-search" value={fMarca.busca} onChange={e => setFMarca({ ...fMarca, busca: e.target.value })} placeholder="Nome da marca..." /></FilterField>
                <FilterField label="Uso">
                  <select value={fMarca.uso} onChange={e => setFMarca({ ...fMarca, uso: e.target.value })}>
                    <option value="">Todas</option><option value="com">Com produtos</option><option value="sem">Sem produtos</option>
                  </select>
                </FilterField>
              </FilterBar>
              <div className="table-scroll">
                <table><thead><tr><th>Marca</th><th>Produtos</th><th>Situação</th><th>Ações</th></tr></thead>
                <tbody>{linhasMarcas.map((m, i) => (
                  <tr key={m.nome} style={{ "--i": Math.min(i, 15) } as React.CSSProperties}>
                    <td><div className="marca-nome"><span className="marca-avatar">{m.nome[0]}</span><strong>{m.nome}</strong></div></td>
                    <td><button className="link" onClick={() => { setFProd({ ...filtrosProdutoIniciais, marca: m.nome }); irPara("produtos"); }}>{m.total} produto(s)</button></td>
                    <td>{m.cadastrada ? <span className="tag ok">Cadastrada</span> : <button className="tag alerta" onClick={() => cadastrarMarcaAvulsa(m.nome)}>Só nos produtos · cadastrar</button>}</td>
                    <td>{m.cadastrada ? <Actions onEdit={() => editMarca(m)} onDelete={() => removeMarca(m)} /> : "—"}</td>
                  </tr>
                ))}</tbody></table>
              </div>
              {!linhasMarcas.length && <Empty text="Nenhuma marca encontrada." />}
            </TablePanel>
          </section>
        )}

        {page === "usuarios" && (
          <section className="page-grid">
            <div className="admin-col">
              <FormPanel title={editing ? "Editar usuário" : "Novo usuário"} onSubmit={submitUser} onCancel={editing ? cancelEdit : undefined}>
                <Field label="Nome"><input value={userForm.nome} onChange={e => setUserForm({ ...userForm, nome: e.target.value })} /></Field>
                <Field label="E-mail"><input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} /></Field>
                <Field label="CPF"><input value={userForm.cpf} onChange={e => setUserForm({ ...userForm, cpf: e.target.value })} placeholder="Somente números" /></Field>
                {!editing && <Field label="Senha"><input type="password" value={userForm.senha} onChange={e => setUserForm({ ...userForm, senha: e.target.value })} /></Field>}
                {editing && <p className="hint">A API atual não atualiza a senha no PUT; por isso ela não é enviada durante a edição.</p>}
              </FormPanel>
              <BuscaPorId<Usuario> entity="usuarios" dados={users} titulo="Buscar usuário por ID" render={u => <><Dado label="ID">#{u.idUsuario}</Dado><Dado label="Nome">{u.nome}</Dado><Dado label="E-mail">{u.email}</Dado><Dado label="CPF">{u.cpf || "—"}</Dado><Dado label="Perfil">{u.role || "cliente"}</Dado></>} />
            </div>
            <TablePanel title="Usuários" count={filteredUsers.length}>
              <FilterBar ativos={(fUser.busca ? 1 : 0) + (fUser.perfil ? 1 : 0)} onLimpar={() => setFUser(filtrosUsuarioIniciais)}>
                <FilterField label="Pesquisar" wide><input className="admin-search" value={fUser.busca} onChange={e => setFUser({ ...fUser, busca: e.target.value })} placeholder="Nome, e-mail ou CPF..." /></FilterField>
                <FilterField label="Perfil">
                  <select value={fUser.perfil} onChange={e => setFUser({ ...fUser, perfil: e.target.value })}>
                    <option value="">Todos</option><option value="cliente">Cliente</option><option value="admin">Admin</option>
                  </select>
                </FilterField>
              </FilterBar>
              <div className="table-scroll">
                <table><thead><tr><th>Usuário</th><th>E-mail</th><th>CPF</th><th>Perfil</th><th>Ações</th></tr></thead>
                <tbody>{filteredUsers.map((u, i) => <tr key={u.idUsuario} style={{ "--i": Math.min(i, 15) } as React.CSSProperties}><td><strong>{u.nome}</strong><small>#{u.idUsuario}</small></td><td>{u.email}</td><td>{u.cpf}</td><td><span className={`tag ${u.role === "admin" ? "ok" : ""}`}>{u.role || "cliente"}</span></td><td><Actions onEdit={() => editUser(u)} onDelete={() => remove("usuarios", u.idUsuario)} /></td></tr>)}</tbody></table>
              </div>
              {!filteredUsers.length && <Empty text="Nenhum usuário encontrado." />}
            </TablePanel>
          </section>
        )}

        {page === "pedidos" && (
          <section className="page-grid">
            <div className="admin-col">
              <FormPanel title={editing ? "Editar pedido" : "Novo pedido"} onSubmit={submitOrder} onCancel={editing ? cancelEdit : undefined}>
                <Field label="Usuário">
                  <select value={orderForm.idUsuario || ""} onChange={e => setOrderForm({ ...orderForm, idUsuario: Number(e.target.value) })}>
                    <option value="">Selecione</option>
                    {users.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nome}</option>)}
                  </select>
                </Field>
                <Field label="Valor total"><input type="number" min="0" step="0.01" value={orderForm.valorTotal} onChange={e => setOrderForm({ ...orderForm, valorTotal: Number(e.target.value) })} /></Field>
                <Field label="Status">
                  <select value={orderForm.status || "PENDENTE"} onChange={e => setOrderForm({ ...orderForm, status: e.target.value })}>
                    {STATUS_PEDIDO.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </FormPanel>
              <BuscaPorId<Pedido> entity="pedidos" dados={orders} titulo="Buscar pedido por ID" render={o => <><Dado label="ID">#{o.idPedido}</Dado><Dado label="Código">{o.codPedido || "—"}</Dado><Dado label="Usuário">{userName(o.idUsuario)}</Dado><Dado label="Data">{formatDate(o.dataPedido)}</Dado><Dado label="Total">{money(o.valorTotal)}</Dado><Dado label="Status"><Status status={o.status} /></Dado></>} />
            </div>
            <TablePanel title="Pedidos" count={filteredOrders.length}>
              <FilterBar ativos={filtrosAtivosPed} onLimpar={() => setFPed(filtrosPedidoIniciais)}>
                <FilterField label="Pesquisar" wide><input className="admin-search" value={fPed.busca} onChange={e => setFPed({ ...fPed, busca: e.target.value })} placeholder="Código, nº do pedido ou cliente..." /></FilterField>
                <FilterField label="Status">
                  <select value={fPed.status} onChange={e => setFPed({ ...fPed, status: e.target.value })}>
                    <option value="">Todos</option>
                    {STATUS_PEDIDO.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FilterField>
                <FilterField label="De"><input type="date" value={fPed.de} onChange={e => setFPed({ ...fPed, de: e.target.value })} /></FilterField>
                <FilterField label="Até"><input type="date" value={fPed.ate} onChange={e => setFPed({ ...fPed, ate: e.target.value })} /></FilterField>
                <FilterField label="Valor mín."><input type="number" min="0" value={fPed.valorMin} onChange={e => setFPed({ ...fPed, valorMin: e.target.value })} placeholder="R$ 0" /></FilterField>
              </FilterBar>
              <div className="table-scroll">
                <table><thead><tr><th>Pedido</th><th>Usuário</th><th>Data</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>{filteredOrders.map((o, i) => <tr key={o.idPedido} style={{ "--i": Math.min(i, 15) } as React.CSSProperties}><td><strong>{o.codPedido || `#${o.idPedido}`}</strong></td><td>{userName(o.idUsuario)}</td><td>{formatDate(o.dataPedido)}</td><td>{money(o.valorTotal)}</td><td><Status status={o.status} /></td><td><Actions onEdit={() => editOrder(o)} onDelete={() => remove("pedidos", o.idPedido)} /></td></tr>)}</tbody></table>
              </div>
              {!filteredOrders.length && <Empty text="Nenhum pedido encontrado." />}
            </TablePanel>
          </section>
        )}
        </div>
      </main>
    </div>
  );
}

function FilterBar({ ativos, onLimpar, children }: { ativos: number; onLimpar: () => void; children: ReactNode }) {
  return (
    <div className="filter-bar">
      <div className="filter-grid">{children}</div>
      <div className="filter-foot">
        <span>{ativos ? `${ativos} filtro(s) ativo(s)` : "Nenhum filtro ativo"}</span>
        {ativos > 0 && <button type="button" className="link" onClick={onLimpar}>Limpar filtros</button>}
      </div>
    </div>
  );
}
function FilterField({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`filter-field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>;
}
function Stat({title, value, icon, onClick}:{title:string;value:number;icon:string;onClick:()=>void}) {
  return <button className="stat" onClick={onClick}><span className="stat-icon">{icon}</span><span><small>{title}</small><strong>{value}</strong></span><b>→</b></button>;
}
function Field({label, children}:{label:string;children:ReactNode}) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function FormPanel({title,onSubmit,onCancel,children}:{title:string;onSubmit:(e:FormEvent)=>void;onCancel?:()=>void;children:ReactNode}) {
  return <div className="panel form-panel"><div className="panel-title"><h3>{title}</h3></div><form onSubmit={onSubmit}>{children}<div className="form-actions"><button className="primary" type="submit">{title.startsWith("Editar") ? "Salvar alterações" : "Cadastrar"}</button>{onCancel && <button className="secondary" type="button" onClick={onCancel}>Cancelar</button>}</div></form></div>;
}
function TablePanel({title,count,children}:{title:string;count:number;children:ReactNode}) {
  return <div className="panel table-panel"><div className="panel-title"><h3>{title}</h3><span className="count">{count}</span></div>{children}</div>;
}
function Actions({onEdit,onDelete}:{onEdit:()=>void;onDelete:()=>void}) {
  return <div className="actions"><button className="icon-btn" title="Editar" onClick={onEdit}>✎</button><button className="icon-btn danger" title="Excluir" onClick={onDelete}>⌫</button></div>;
}
function Status({status}:{status?:string}) {
  return <span className={`status ${String(status || "PENDENTE").toLowerCase()}`}>{status || "PENDENTE"}</span>;
}
function BuscaPorId<T>({entity,dados,titulo,render}:{entity:ApiEntity;dados:unknown[];titulo:string;render:(item:T)=>ReactNode}) {
  const [id, setId] = useState("");
  const [idBuscado, setIdBuscado] = useState<number | null>(null);
  const [item, setItem] = useState<T | null>(null);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);

  async function executar(numero: number) {
    setBuscando(true);
    try {
      setItem(await api.buscar<T>(entity, numero));
      setErro("");
    } catch (error) {
      setItem(null);
      setErro(error instanceof Error ? error.message : "Registro não encontrado.");
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    if (idBuscado !== null) executar(idBuscado);
  }, [dados]);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    const numero = Number(id);
    setItem(null);
    if (!Number.isInteger(numero) || numero <= 0) {
      setIdBuscado(null);
      setErro("Informe um ID válido (número inteiro maior que zero).");
      return;
    }
    setErro("");
    setIdBuscado(numero);
    await executar(numero);
  }

  function limpar() {
    setId("");
    setIdBuscado(null);
    setItem(null);
    setErro("");
  }

  return <div className="panel busca-id"><div className="panel-title"><h3>{titulo}</h3></div><form className="busca-id-form" onSubmit={buscar}><input type="number" min="1" step="1" value={id} onChange={e => setId(e.target.value)} placeholder="ID" aria-label={titulo} /><button className="primary" type="submit" disabled={buscando}>{buscando ? "Buscando..." : "Buscar"}</button>{(item || erro) && <button className="secondary" type="button" onClick={limpar}>Limpar</button>}</form>{erro && <p className="busca-id-erro">{erro}</p>}{item && <dl className="busca-id-resultado">{render(item)}</dl>}</div>;
}
function Dado({label, children}:{label:string;children:ReactNode}) {
  return <><dt>{label}</dt><dd>{children}</dd></>;
}
function Empty({text}:{text:string}) { return <div className="empty">{text}</div>; }
function money(value:number) { return Number(value || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function formatDate(value?:string) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR"); }

export default PAdmin;
