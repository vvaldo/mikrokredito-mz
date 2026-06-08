# MikroKrédito MZ v15 — Produtos, Simulador Global, Utilizadores e Perfis

## Alterações implementadas

### Produtos de crédito pela base de dados
- O simulador/comparador deixa de depender de lista hardcoded.
- Produtos visíveis vêm de `GET /api/v1/products`.
- Gestores do banco criam produtos como pendentes/inactivos.
- Superadmin aprova produtos em `POST /api/v1/products/:id/approve`.
- Apenas produtos aprovados e visíveis entram no simulador.

### Menu Comparar / Simular em todos os perfis
- Cliente: `/client/compare`.
- Gestor/Admin Banco: `/institution/compare` e `/institution/simulator`.
- Superadmin: `/super/compare`.

### Superadmin — gestão de utilizadores
- Novo menu: `Utilizadores`.
- CRUD funcional via `/api/v1/users`.
- Criar, editar, activar e desabilitar utilizadores.
- Suporta clientes, agentes, gestores/admin banco e superadmin.

### Superadmin — gestão de perfis e privilégios
- Novo menu: `Perfis/Privilégios`.
- Catálogo de perfis e permissões operacionais.
- Atribuir/alterar/desabilitar perfil via `/api/v1/roles`.
- Alterações registadas em `audit_logs`.

### Superadmin — aprovação de produtos
- Novo menu: `Aprovar Produtos`.
- Lista produtos criados por gestores.
- Aprovar, editar, desactivar e exportar CSV.

## Validação
- Frontend validado com `npm run build`.
- Novas rotas backend validadas com `node -c`.
