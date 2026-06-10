# v26 — Tema padronizado, responsividade, relatórios e auditoria

## Corrigido
- Tema modernizado e padronizado para dashboards do Admin Banco/Gestor e Super Admin.
- Sidebar responsiva: no celular deixa de desaparecer e passa a funcionar como barra inferior navegável.
- Grids, KPIs, tabelas, cards, botões e modais ajustados para ecrãs pequenos.
- Relatórios do Admin Banco e Super Admin passam a carregar dados reais dos endpoints `/reports/portfolio`, `/reports/payments-summary` e `/reports/npl`.
- Exportação de relatórios em CSV/Excel e PDF via impressão do navegador.
- Auditoria refeita para mostrar eventos reais da BD com filtros, detalhe, valores alterados, IP, utilizador, perfil e user-agent.
- API preparada para Dokploy/Traefik com `app.set('trust proxy', 1)`.
- Frontend preparado para produção: `VITE_API_BASE_URL`, Vite preview sem erro de permissão e allowedHosts activo.

## Deploy recomendado
Frontend no Dokploy:
- Build Path: `frontend`
- Build Type: `Nixpacks` ou `Static + SPA`
- Environment: `VITE_API_BASE_URL=https://api.microcredito.otech.co.mz/api/v1`

Backend no Dokploy:
- Build Path: `backend`
- Port: `3001`
- DB_HOST: usar o Internal Host real do PostgreSQL.
