# v16 — Rebranding SaaS e logotipo por instituição

## Identidade
- Nome da aplicação alterado para **MicroCredit SYSTEM**.
- Subtítulo alterado para **Sistema Integrado de Gestão de Microcrédito**.
- Rodapé global adicionado em todos os perfis:
  - MicroCredit SYSTEM
  - Sistema Integrado de Gestão de Microcrédito
  - Powered by: OTECH - Open Technology (www.otech.co.mz)

## SaaS / White-label
- Logotipo padrão incluído em `frontend/public/default-client-logo.jpg`.
- Topbar passa a carregar `institution.logo_url` quando existir.
- Admin/Gestor do banco passa a ter menu **Logotipo SaaS**.
- Novo endpoint backend: `POST /api/v1/institutions/:id/logo`.
- Upload do logotipo grava ficheiro em `backend/uploads/logos` e actualiza `institutions.logo_url`.

## Auth / Sessão
- `/api/v1/auth/me` agora devolve também a instituição do utilizador, incluindo `logo_url`.

## Validação
- Build do frontend validado com `npm run build`.
- Syntax check dos ficheiros backend alterados validado com `node -c`.
