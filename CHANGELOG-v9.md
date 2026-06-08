# MikroKrédito MZ v9 — Persistência real, documentos e token de senha

## Backend
- Adicionado `GET /api/v1/clients/me` para carregar perfil KYC real do cliente autenticado.
- Adicionado `PATCH /api/v1/clients/me` para gravar dados do utilizador e KYC directamente na base de dados.
- Adicionado `POST /api/v1/auth/request-password-reset-token` para gerar token, gravar hash na BD e enviar por SMTP.
- Adicionado `POST /api/v1/auth/reset-password-with-token` para validar token e gravar nova senha na BD.
- Adicionado `GET /api/v1/documents/:id/download` com controlo de acesso.
- Upload de documentos agora guarda ficheiro em pasta física e referência na tabela `documents`.
- Reupload de documento de perfil substitui a versão anterior para evitar duplicação documental.
- Adicionado `GET /api/v1/loans/my` para listar apenas pedidos/empréstimos do cliente autenticado com documentos e prestações.
- Pedido de empréstimo agora bloqueia duplicação para o mesmo produto enquanto existir pedido aberto.
- Aprovação administrativa bloqueada se faltar BI, NUIT, atestado de residência ou extracto bancário.

## Frontend Cliente
- Perfil KYC agora carrega e grava via API real.
- Botão de token de senha chama API real e envia email por SMTP.
- Documentos permitem upload, novo upload e download real.
- Novo pedido exige documentos no acto da submissão e grava no backend.
- Após submeter pedido, limpa o formulário e mostra apenas confirmação; ao fechar volta ao dashboard.
- Meus empréstimos agora carrega dados reais, abre popup de detalhes, mostra aprovador, data de aprovação, documentos baixáveis, prestações e situação de Central de Riscos.

## Validação
- Frontend validado com `npm run build`.
- Backend validado com `node -c` nas rotas alteradas.
