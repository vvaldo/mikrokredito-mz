# Patch v27 — Tema, responsividade, relatórios e auditoria

Aplicar sobre o repositório correcto:
https://github.com/vvaldo/mikrokredito-mz.git

## Ficheiros incluídos

Copie a pasta `frontend/` deste pacote para a raiz do seu repositório, substituindo os ficheiros correspondentes.

### O que muda

1. `frontend/src/assets/styles/main.css`
   - Garante importação centralizada de tokens, layout, componentes, formulários, botões, modais e o novo CSS responsivo.

2. `frontend/src/assets/styles/responsive-admin.css`
   - Padroniza dashboard Admin/Super Admin.
   - Corrige menu no celular: deixa de desaparecer e passa a menu horizontal rolável.
   - Corrige grids, tabelas, filtros e botões em mobile.
   - Melhora impressão/PDF.

3. `frontend/src/utils/exporters.js`
   - Exportação CSV compatível com Excel.
   - Exportação PDF via janela de impressão.

4. `frontend/src/views/super/DashboardView.vue`
   - Dashboard do Super Admin baseado em `/reports/portfolio`, `/reports/payments-summary` e `/reports/npl`.

5. `frontend/src/views/institution/DashboardView.vue`
   - Dashboard do Banco/Gestor com o mesmo padrão visual e responsivo.

6. `frontend/src/views/super/ReportsView.vue`
   - Relatórios com filtros, CSV/Excel e PDF.

7. `frontend/src/views/institution/ReportsView.vue`
   - Igual ao relatório do Super Admin, respeitando filtro institucional do backend.

8. `frontend/src/views/super/AuditView.vue`
   - Auditoria com filtros, IP, utilizador, perfil, acção, entidade, valores antes/depois e exportação.

## Como aplicar

No seu computador:

```bash
git clone https://github.com/vvaldo/mikrokredito-mz.git
cd mikrokredito-mz
# copie a pasta frontend deste pacote para cá
npm --prefix frontend install --legacy-peer-deps
npm --prefix frontend run build
git add frontend
git commit -m "v27 responsive admin theme reports audit"
git push
```

Depois no Dokploy:

- Redeploy do `microcredit-web`
- Clean Cache ON

## Observação

Este patch não altera o backend, porque os endpoints necessários já existem:
- `/api/v1/reports/portfolio`
- `/api/v1/reports/payments-summary`
- `/api/v1/reports/npl`
- `/api/v1/audit`

Se a auditoria continuar vazia, o problema estará no backend não gravar eventos em `audit_logs`, não na tela.
