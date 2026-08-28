import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, healthCheck, API_URL } from "../../api";
import type { Categoria, Pedido, Produto, Usuario } from "../../types";
import AuthRequests from "../../fetch/AuthRequests";
import grenaLogo from "../../assets/grena-logo.png";
import grenaMascote from "../../assets/grena-mascote.png";

type Page = "dashboard" | "produtos" | "categorias" | "usuarios" | "pedidos";

const emptyProduct: Produto = { nome: "", descricao: "", preco: 0, estoque: 0, idCategoria: 0 };
const emptyCategory: Categoria = { nome: "" };
const emptyUser: Usuario = { nome: "", email: "", cpf: "", senha: "" };
const emptyOrder: Pedido = { idUsuario: 0, valorTotal: 0, status: "PENDENTE" };

function PAdmin() {
  const [page, setPage] = useState<Page>("dashboard");
  const [online, setOnline] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Produto[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [orders, setOrders] = useState<Pedido[]>([]);

  const [productForm, setProductForm] = useState<Produto>(emptyProduct);
  const [categoryForm, setCategoryForm] = useState<Categoria>(emptyCategory);
  const [userForm, setUserForm] = useState<Usuario>(emptyUser);
  const [orderForm, setOrderForm] = useState<Pedido>(emptyOrder);

  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, c, u, o] = await Promise.all([
        api.listar<Produto>("produtos"),
        api.listar<Categoria>("categorias"),
        api.listar<Usuario>("usuarios"),
        api.listar<Pedido>("pedidos")
      ]);
      setProducts(p);
      setCategories(c);
      setUsers(u);
      setOrders(o);
      setOnline(true);
    } catch (error) {
      setOnline(false);
      setMessage(error instanceof Error ? error.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    healthCheck()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
    loadAll();
  }, []);

  const stats = useMemo(() => ({
    products: products.length,
    categories: categories.length,
    users: users.length,
    orders: orders.length
  }), [products, categories, users, orders]);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  }

  async function submitProduct(e: FormEvent) {
    e.preventDefault();
    try {
      const body = {
        nome: productForm.nome.trim(),
        descricao: productForm.descricao?.trim() || "",
        preco: Number(productForm.preco),
        estoque: Number(productForm.estoque),
        idCategoria: Number(productForm.idCategoria)
      };
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

  async function submitUser(e: FormEvent) {
    e.preventDefault();
    try {
      const body = {
        nome: userForm.nome.trim(),
        email: userForm.email.trim(),
        cpf: userForm.cpf.trim(),
        senha: userForm.senha
      };
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
      const body = {
        idUsuario: Number(orderForm.idUsuario),
        valorTotal: Number(orderForm.valorTotal),
        status: orderForm.status || "PENDENTE"
      };
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

  async function remove(entity: "produtos" | "categorias" | "usuarios" | "pedidos", id?: number) {
    if (!id || !window.confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
      await api.remover(entity, id);
      await loadAll();
      notify("Registro removido com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  function editProduct(item: Produto) {
    setEditing(item.idProduto ?? null);
    setProductForm({ ...item, preco: Number(item.preco), estoque: Number(item.estoque) });
    setPage("produtos");
  }

  function editCategory(item: Categoria) {
    setEditing(item.idCategoria ?? null);
    setCategoryForm({ nome: item.nome });
    setPage("categorias");
  }

  function editUser(item: Usuario) {
    setEditing(item.idUsuario ?? null);
    setUserForm({ ...item, senha: "" });
    setPage("usuarios");
  }

  function editOrder(item: Pedido) {
    setEditing(item.idPedido ?? null);
    setOrderForm({
      idUsuario: Number(item.idUsuario),
      valorTotal: Number(item.valorTotal),
      status: item.status || "PENDENTE",
      idPedido: item.idPedido
    });
    setPage("pedidos");
  }

  function cancelEdit() {
    setEditing(null);
    setProductForm(emptyProduct);
    setCategoryForm(emptyCategory);
    setUserForm(emptyUser);
    setOrderForm(emptyOrder);
  }

  const categoryName = (id: number) =>
    categories.find(c => c.idCategoria === id)?.nome || `Categoria #${id}`;

  const userName = (id: number) =>
    users.find(u => u.idUsuario === id)?.nome || `Usuário #${id}`;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={grenaLogo} alt="Logo GRENÁ" />
          <div>
            <strong>GRENÁ</strong>
            <span>GESTÃO</span>
          </div>
        </div>

        <nav>
          <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>⌂ Dashboard</button>
          <button className={page === "produtos" ? "active" : ""} onClick={() => setPage("produtos")}>▣ Produtos</button>
          <button className={page === "categorias" ? "active" : ""} onClick={() => setPage("categorias")}>◈ Categorias</button>
          <button className={page === "usuarios" ? "active" : ""} onClick={() => setPage("usuarios")}>♙ Usuários</button>
          <button className={page === "pedidos" ? "active" : ""} onClick={() => setPage("pedidos")}>▤ Pedidos</button>
        </nav>

        <div className="admin-sidebar-actions">
          <Link className="secondary admin-link" to="/loja">↗ Ver loja</Link>
          <button className="secondary admin-link" onClick={() => AuthRequests.logout()}>⏻ Sair</button>
        </div>

        <div className="api-status">
          <span className={online ? "dot online" : "dot"} />
          <div>
            <small>API</small>
            <strong>{online ? "Conectada" : "Offline"}</strong>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">PAINEL ADMINISTRATIVO</span>
            <h1>{page === "dashboard" ? "Visão geral" : page[0].toUpperCase() + page.slice(1)}</h1>
          </div>
          <div className="top-actions">
            <span className="api-url">{API_URL}</span>
            <button className="secondary" onClick={loadAll}>{loading ? "Atualizando..." : "↻ Atualizar"}</button>
          </div>
        </header>

        {message && <div className="toast">{message}</div>}

        {page === "dashboard" && (
          <section>
            <div className="hero">
              <div>
                <span className="eyebrow">GRENÁ API</span>
                <h2>Seu frontend conectado ao backend.</h2>
                <p>Interface nova, simples e pronta para consumir os endpoints reais em <b>localhost:3333</b>.</p>
              </div>
              <div className="hero-visual"><img className="hero-mascot" src={grenaMascote} alt="Mascote do GRENÁ" /><div className="hero-badge">{online ? "ONLINE" : "OFFLINE"}</div></div>
            </div>

            <div className="stats">
              <Stat title="Produtos" value={stats.products} icon="▣" onClick={() => setPage("produtos")} />
              <Stat title="Categorias" value={stats.categories} icon="◈" onClick={() => setPage("categorias")} />
              <Stat title="Usuários" value={stats.users} icon="♙" onClick={() => setPage("usuarios")} />
              <Stat title="Pedidos" value={stats.orders} icon="▤" onClick={() => setPage("pedidos")} />
            </div>

            <div className="grid-2">
              <div className="panel">
                <div className="panel-title"><h3>Últimos pedidos</h3><button className="link" onClick={() => setPage("pedidos")}>Ver todos</button></div>
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
                <div className="panel-title"><h3>Produtos em estoque</h3><button className="link" onClick={() => setPage("produtos")}>Gerenciar</button></div>
                {products.slice(0, 5).map(product => (
                  <div className="list-row" key={product.idProduto}>
                    <div className="product-icon">P</div>
                    <div className="grow"><strong>{product.nome}</strong><span>{categoryName(product.idCategoria)}</span></div>
                    <div className="stock">{product.estoque} un.</div>
                  </div>
                ))}
                {!products.length && <Empty text="Nenhum produto encontrado." />}
              </div>
            </div>
          </section>
        )}

        {page === "produtos" && (
          <section className="page-grid">
            <FormPanel title={editing ? "Editar produto" : "Novo produto"} onSubmit={submitProduct} onCancel={editing ? cancelEdit : undefined}>
              <Field label="Nome"><input value={productForm.nome} onChange={e => setProductForm({...productForm, nome:e.target.value})} placeholder="Ex.: Camiseta GRENÁ" /></Field>
              <Field label="Descrição"><textarea value={productForm.descricao || ""} onChange={e => setProductForm({...productForm, descricao:e.target.value})} placeholder="Descrição do produto" /></Field>
              <div className="two-cols">
                <Field label="Preço"><input type="number" min="0" step="0.01" value={productForm.preco} onChange={e => setProductForm({...productForm, preco:Number(e.target.value)})} /></Field>
                <Field label="Estoque"><input type="number" min="0" value={productForm.estoque} onChange={e => setProductForm({...productForm, estoque:Number(e.target.value)})} /></Field>
              </div>
              <Field label="Categoria">
                <select value={productForm.idCategoria || ""} onChange={e => setProductForm({...productForm, idCategoria:Number(e.target.value)})}>
                  <option value="">Selecione</option>
                  {categories.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nome}</option>)}
                </select>
              </Field>
            </FormPanel>
            <TablePanel title="Produtos" count={products.length}>
              <table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Ações</th></tr></thead>
              <tbody>{products.map(p => <tr key={p.idProduto}><td><strong>{p.nome}</strong><small>{p.descricao || "Sem descrição"}</small></td><td>{categoryName(p.idCategoria)}</td><td>{money(p.preco)}</td><td>{p.estoque}</td><td><Actions onEdit={() => editProduct(p)} onDelete={() => remove("produtos", p.idProduto)} /></td></tr>)}</tbody></table>
              {!products.length && <Empty text="Nenhum produto cadastrado." />}
            </TablePanel>
          </section>
        )}

        {page === "categorias" && (
          <section className="page-grid compact">
            <FormPanel title={editing ? "Editar categoria" : "Nova categoria"} onSubmit={submitCategory} onCancel={editing ? cancelEdit : undefined}>
              <Field label="Nome"><input value={categoryForm.nome} onChange={e => setCategoryForm({nome:e.target.value})} placeholder="Ex.: Eletrônicos" /></Field>
            </FormPanel>
            <TablePanel title="Categorias" count={categories.length}>
              <table><thead><tr><th>ID</th><th>Nome</th><th>Ações</th></tr></thead>
              <tbody>{categories.map(c => <tr key={c.idCategoria}><td>#{c.idCategoria}</td><td><strong>{c.nome}</strong></td><td><Actions onEdit={() => editCategory(c)} onDelete={() => remove("categorias", c.idCategoria)} /></td></tr>)}</tbody></table>
              {!categories.length && <Empty text="Nenhuma categoria cadastrada." />}
            </TablePanel>
          </section>
        )}

        {page === "usuarios" && (
          <section className="page-grid">
            <FormPanel title={editing ? "Editar usuário" : "Novo usuário"} onSubmit={submitUser} onCancel={editing ? cancelEdit : undefined}>
              <Field label="Nome"><input value={userForm.nome} onChange={e => setUserForm({...userForm, nome:e.target.value})} /></Field>
              <Field label="E-mail"><input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email:e.target.value})} /></Field>
              <Field label="CPF"><input value={userForm.cpf} onChange={e => setUserForm({...userForm, cpf:e.target.value})} placeholder="Somente conforme seu banco aceitar" /></Field>
              {!editing && <Field label="Senha"><input type="password" value={userForm.senha} onChange={e => setUserForm({...userForm, senha:e.target.value})} /></Field>}
              {editing && <p className="hint">A API atual não atualiza a senha no PUT; por isso ela não é enviada durante a edição.</p>}
            </FormPanel>
            <TablePanel title="Usuários" count={users.length}>
              <table><thead><tr><th>Usuário</th><th>E-mail</th><th>CPF</th><th>Ações</th></tr></thead>
              <tbody>{users.map(u => <tr key={u.idUsuario}><td><strong>{u.nome}</strong><small>#{u.idUsuario}</small></td><td>{u.email}</td><td>{u.cpf}</td><td><Actions onEdit={() => editUser(u)} onDelete={() => remove("usuarios", u.idUsuario)} /></td></tr>)}</tbody></table>
              {!users.length && <Empty text="Nenhum usuário cadastrado." />}
            </TablePanel>
          </section>
        )}

        {page === "pedidos" && (
          <section className="page-grid">
            <FormPanel title={editing ? "Editar pedido" : "Novo pedido"} onSubmit={submitOrder} onCancel={editing ? cancelEdit : undefined}>
              <Field label="Usuário">
                <select value={orderForm.idUsuario || ""} onChange={e => setOrderForm({...orderForm, idUsuario:Number(e.target.value)})}>
                  <option value="">Selecione</option>
                  {users.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nome}</option>)}
                </select>
              </Field>
              <Field label="Valor total"><input type="number" min="0" step="0.01" value={orderForm.valorTotal} onChange={e => setOrderForm({...orderForm, valorTotal:Number(e.target.value)})} /></Field>
              <Field label="Status">
                <select value={orderForm.status || "PENDENTE"} onChange={e => setOrderForm({...orderForm, status:e.target.value})}>
                  <option>PENDENTE</option><option>PROCESSANDO</option><option>ENVIADO</option><option>CONCLUIDO</option><option>CANCELADO</option>
                </select>
              </Field>
            </FormPanel>
            <TablePanel title="Pedidos" count={orders.length}>
              <table><thead><tr><th>Pedido</th><th>Usuário</th><th>Data</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>{orders.map(o => <tr key={o.idPedido}><td><strong>{o.codPedido || `#${o.idPedido}`}</strong></td><td>{userName(o.idUsuario)}</td><td>{formatDate(o.dataPedido)}</td><td>{money(o.valorTotal)}</td><td><Status status={o.status} /></td><td><Actions onEdit={() => editOrder(o)} onDelete={() => remove("pedidos", o.idPedido)} /></td></tr>)}</tbody></table>
              {!orders.length && <Empty text="Nenhum pedido cadastrado." />}
            </TablePanel>
          </section>
        )}
      </main>
    </div>
  );
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
function Empty({text}:{text:string}) { return <div className="empty">{text}</div>; }
function money(value:number) { return Number(value || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function formatDate(value?:string) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR"); }

export default PAdmin;
