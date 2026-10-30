# Grená — Frontend (B4CKDOORS)

Interface web do **Grená**, e-commerce de artigos esportivos desenvolvido pelo grupo **B4CKDOORS**.
Inclui a **loja** (vitrine pública, carrinho e finalização de compra) e o **painel administrativo** (produtos, categorias, usuários e pedidos), com login via **JWT** e telas diferentes conforme o perfil do usuário (`admin` ou `cliente`).

**Stack:** React 19 · TypeScript · Vite · React Router

> Backend: repositório `B4CKDOORS-backend` (Node.js + Express + PostgreSQL). O frontend precisa dele rodando.

---

## 1. Pré-requisitos

| Ferramenta | Versão |
|---|---|
| [Node.js](https://nodejs.org/) | 20 ou superior |
| npm | vem com o Node.js |
| Backend Grená | em execução (por padrão em `http://localhost:3333`) |

O backend, por sua vez, exige **PostgreSQL** — veja o README dele.

## 2. Instalação e execução local

```bash
# 1. Suba antes o backend (veja o README do B4CKDOORS-backend)

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de ambiente a partir do modelo
cp .env.example .env

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:5173**.

> Se o backend usar `FRONTEND_URL`, ele precisa conter `http://localhost:5173` para o navegador conseguir chamar a API (CORS).

### Contas para teste (criadas pelo `init.sql` do backend)

| Perfil | E-mail | Senha | Ao entrar |
|---|---|---|---|
| Administrador | `admin@grena.com` | `admin123` | vai para `/admin` |
| Cliente | `joao.silva@email.com` | `cliente123` | vai para `/loja` |

Qualquer pessoa também pode criar uma conta de cliente em **Entrar → Criar conta**.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Checa os tipos (`tsc`) e gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente o build de produção |

## 3. Variáveis de ambiente (`.env.example`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | sim | URL base da API do backend, sem barra final. Local: `http://localhost:3333`. Em produção: URL pública da API. |

Detalhes:

- A URL é lida em `src/api.ts` via `import.meta.env.VITE_API_URL`.
- Em **desenvolvimento**, se a variável estiver vazia, usa `http://localhost:3333`. Em **produção**, se vazia, as chamadas vão para a mesma origem do site (útil com proxy reverso).
- As variáveis `VITE_*` são **embutidas no JavaScript público** do site. **Nunca** coloque tokens ou senhas nelas.
- O valor é fixado **no momento do build**: ao trocar a URL da API, rode `npm run build` de novo.

## 4. Como funciona a autenticação

1. A tela `/login` envia `POST /api/login` com e-mail e senha.
2. A API devolve `{ auth, token, usuario: { id, nome, email, role } }`.
3. O frontend grava no `localStorage`: `grena_token` (JWT), `grena_nome`, `grena_email`, `grena_idUsuario` e `grena_role`.
4. Todas as chamadas seguintes enviam `Authorization: Bearer <token>` (`src/api.ts`).
5. O `AuthContext` (`src/context/AuthContext.tsx`) mantém a sessão em memória, encerra-a automaticamente quando o token expira e também quando a API responde `401`.
6. A interface muda conforme a `role` (lida do próprio token):
   - **cliente:** loja, carrinho e finalização de compra;
   - **admin:** tudo isso + link "Painel admin" e a rota `/admin`.

> ⚠️ Esconder telas no frontend é apenas experiência de uso. **A segurança real é feita pelo backend**, que valida o token e a role em cada requisição — mesmo editando o `localStorage`, ninguém consegue acessar dados administrativos.

### Rotas do frontend

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | público | Redireciona para `/loja`. |
| `/loja` | público | Vitrine com busca e filtro por categoria. |
| `/login` | público | Entrar e criar conta de cliente. |
| `/carrinho` | logado (qualquer perfil) | Carrinho e finalização da compra. |
| `/admin` | **somente admin** | Painel de gestão (dashboard, produtos, categorias, usuários, pedidos). |

## 5. Endpoints da API consumidos

URL base: `VITE_API_URL`. Documentação completa (corpos e respostas) no README do backend.

| Método | Endpoint | Quem usa | Descrição |
|---|---|---|---|
| POST | `/api/login` | login | Autentica e recebe o JWT. Corpo: `{ "email", "senha" }`. |
| POST | `/api/usuarios` | cadastro / admin | Cria usuário. Corpo: `{ "nome", "email", "cpf", "senha" }` (admin pode enviar `role`). |
| GET | `/api/produtos` · `/api/categorias` | loja e painel | Listagem pública. |
| POST / PUT / DELETE | `/api/produtos` · `/api/categorias` | painel (admin) | Gestão do catálogo. |
| GET / PUT / DELETE | `/api/usuarios` | painel (admin) | Gestão de usuários (`senha` opcional na edição). |
| POST | `/api/pedidos` | carrinho | Finaliza a compra. Corpo: `{ "itens": [{ "idProduto", "quantidade" }] }`. O total é calculado pelo servidor. |
| GET / PUT / DELETE | `/api/pedidos` | painel (admin) | Gestão de pedidos. |
| GET | `/` | painel | Verifica se a API está online. |

## 6. Estrutura do projeto

```
src/
├── main.tsx / App.tsx        # entrada e roteamento
├── api.ts                    # cliente HTTP (VITE_API_URL + Bearer token)
├── types.ts                  # tipos compartilhados
├── context/
│   ├── AuthContext.tsx       # sessão, login/logout, role
│   └── CarrinhoContext.tsx   # carrinho (persistido no localStorage)
├── fetch/AuthRequests.ts     # login + leitura/gravação da sessão
├── components/               # Navegacao, Rodape, Rotas/ProtectedRoute
├── pages/                    # PLoja, PLogin, PCarrinho, PAdmin
└── assets/                   # logos e imagens dos produtos
```

## 7. Deploy

1. Defina `VITE_API_URL` com a URL pública do backend e rode `npm run build`.
2. Publique a pasta `dist/` em qualquer hospedagem estática (Vercel, Netlify, Cloudflare Pages…).
3. O app é uma SPA: a hospedagem precisa devolver `index.html` em qualquer rota. Já estão incluídos `vercel.json` (Vercel) e `public/_redirects` (Netlify).
4. No backend, coloque a URL pública do frontend em `FRONTEND_URL` (CORS).

## 8. Documentação (DER)

O Diagrama Entidade-Relacionamento e os demais documentos do projeto ficam na pasta `docs/` do repositório do **backend** (`B4CKDOORS-backend/docs/`): `DER-GRENA.png` e `DER-grena.drawio`.

## 9. Links do projeto

- Sprints: <https://senai-661.notion.site/Sprint-s-Projeto-em-grupo-2f55d25a87a18004b223ffe0bf47330a?source=copy_link>
- Repositório backend: <https://github.com/senai-661/B4CKDOORS-backend.git>
