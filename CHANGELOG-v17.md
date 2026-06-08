# v17 — Alertas, pagamentos reais, mora e recuperação de senha

## Alterações principais
- Alertas por email para utilizadores afectados em acções sensíveis:
  - criação/alteração/desabilitação/activação de utilizadores;
  - alteração de perfil/KYC;
  - upload/reupload/revisão de documentos;
  - registo de pagamento;
  - criação/alteração/aprovação de produtos.
- Registo em `notification_logs` e `audit_logs` para os alertas enviados ou falhados.
- Pagamentos corrigidos:
  - Super Admin vê a lista completa da base de dados;
  - Admin/Gestor vê pagamentos da sua instituição;
  - cliente continua limitado aos seus pagamentos;
  - registo exige empréstimo, valor, referência e comprovativo digitalizado;
  - download autenticado de comprovativos;
  - KPIs reais de hoje, semana, mês e ano via `/payments/summary`.
- Juros de mora:
  - campo `late_fee_rate` no produto financeiro;
  - configurável na criação/edição do produto;
  - cálculo automático sobre prestações vencidas em atraso.
- Login:
  - “Esqueceu?” agora envia token público por email;
  - redefinição pública de senha com token.
- UI:
  - campos críticos com labels acima dos inputs.

## Notas técnicas
- Em desenvolvimento, `sequelize.sync({ alter: true })` adiciona os novos campos automaticamente.
- Em produção, criar migration para `payment_transactions.applied_late_fee`, `payment_transactions.payment_month`, `payment_transactions.registered_by` se `sync alter` estiver desactivado.
