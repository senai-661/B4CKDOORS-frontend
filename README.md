# GRENÁ — Frontend (loja + painel administrativo)

Frontend React + TypeScript + Vite para a loja de artigos esportivos GRENÁ,
consumindo o backend `b4-corrigido`.

## Estrutura (inspirada no FiveBits)

```
src/
  api.ts                  # cliente HTTP genérico (CRUD por entidade)
  fetch/AuthRequests.ts   # login, logout, sessão e checagem de expiração do token
  context/CarrinhoContext.tsx
  components/
    Navegacao/            # navbar pública da loja
    Rodape/                # rodapé público
    Rotas/ProtectedRoute.tsx  # guarda de rotas (com suporte a role)
  pages/
    PLogin/     # tela de login + cadastro de cliente
    PLoja/      # vitrine pública de produtos
    PCarrinho/  # carrinho e checkout
    PAdmin/     # painel administrativo (CRUD completo)
```

## Login e perfis (roles)

- **cliente**: ao logar, vai direto para `/loja`.
- **admin**: ao logar, vai direto para `/admin` (painel administrativo).

A loja (`/loja`) pode ser navegada sem login, como uma vitrine normal.
Login é exigido para finalizar a compra (`/carrinho`) e para acessar `/admin`.

Usuários de teste (ver `infra/sql/init.sql` no backend):
- Admin: `admin@grena.com` / `admin123`
- Cliente: `joao.silva@email.com` / `cliente123`

## Conexão com a API

Por padrão: `http://localhost:3333` — ajuste em `.env`:
```
VITE_API_URL=http://localhost:3333
```

## Rodar

```bash
npm install
npm run dev
```

Abra a URL mostrada pelo Vite (normalmente `http://localhost:5173`).

## Funcionalidades

- Login com redirecionamento por role (cliente → loja, admin → painel).
- Cadastro de novos clientes.
- Vitrine pública com busca e filtro por categoria.
- Carrinho de compras (persistido em localStorage) e checkout que gera um pedido.
- Painel administrativo: CRUD de produtos, categorias, usuários e pedidos.
- Rotas protegidas por autenticação e, no caso do painel, por role `admin`.
