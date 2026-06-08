# MikroKrédito MZ v12 — refactor funcional BD/workflow

Principais alterações implementadas:

## Cliente
- Dashboard do cliente ligado a `/api/v1/dashboard/client`.
- Pedidos, pedidos finalizados, notificações e próxima prestação passam a vir da base de dados.
- Notificações do topo mostram contagem real de não lidas.
- Clique em notificação marca como lida e reduz a contagem.
- Nova página `/client/notifications` com abrir popup e marcar todas como lidas.
- “Seus pedidos” mostra apenas pedidos do cliente autenticado.
- Visualizar pedido abre popup com estado, aprovado em, funcionário, CRC e documentos.
- Prestações com setas laterais para navegar entre empréstimos.
- Prestações mostram via de pagamento e referência/comprovativo.
- Perfil KYC grava na BD; cliente não altera salário/rendimento.
- Documentos podem ser baixados e substituídos com referência na tabela `documents`.

## Admin Banco / Gestor
- Dashboard ligado a `/api/v1/dashboard/institution`.
- KPIs reais: clientes, KYC, empréstimos activos, carteira, notificações falhadas, pagamentos por período.
- Pedidos recentes e notificações recentes vindos da BD.
- Cliente pode ser bloqueado/desbloqueado, com campos CRC.
- Cadastro de cliente no backend.
- Pagamento registado com referência obrigatória e comprovativo opcional/anexo.
- Reconciliação actualiza prestações, saldo e total pago.

## Super Admin
- Dashboard ligado a `/api/v1/dashboard/super`.
- KPIs reais consolidados.
- Acções de pedidos chamam endpoint real de alteração de estado.
- Produtos criados por gestor ficam pendentes; só superadmin aprova/desactiva.

## Backend / BD
- Novos campos e modelos: `loan_status_history`, `role_permissions`, CRC, leitura de notificações, comprovativos de pagamento.
- Estados de pedido registam histórico e auditoria.
- Notificações administrativas incluem link_url.
- Endpoint `/api/v1/notifications/my`, `/:id/read`, `/mark-all-read`.
- Endpoint `/api/v1/dashboard/client`, `/institution`, `/super`.
- Download autenticado de documentos mantido.
- Download autenticado de comprovativos de pagamento adicionado.

## Validação
- Frontend build executado com sucesso (`npm run build`).
- Backend validado com `node -c` nos ficheiros alterados.

Notas:
- Em ambiente de desenvolvimento o Sequelize usa `sync({ alter: true })`, logo as colunas/tabelas novas são criadas ao reiniciar o backend.
- Em produção, recomenda-se converter estas alterações para migrations formais antes de publicar.
