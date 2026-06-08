# v8 — Área do Cliente ajustada

Alterações implementadas:

- Dashboard do cliente mostra apenas: pedidos pendentes, pedidos finalizados, notificações e prestações do próprio cliente.
- Removida lista genérica de pedidos recentes da área do cliente.
- Ícone superior de notificações com contagem de não lidas e dropdown.
- Ícone de perfil com dropdown para editar perfil, adicionar documentos e redefinir senha por email/WhatsApp/SMS.
- Menu do cliente simplificado: Início, Comparar/Simular, Novo Pedido, Meus Empréstimos, Documentos e Perfil KYC.
- Removido menu Pagamentos da área do cliente.
- Comparar/Simular usa produtos configurados pelo banco:
  - Crédito Rápido até 50 mil
  - Crédito 51–100 mil
  - Crédito com GarantiaProdutos
  - Crédito Negócio / Outros
- Taxa mensal é carregada automaticamente pelo produto seleccionado.
- Regra do 1/3 salarial movida para cima do plano de pagamento.
- Regra do 1/3 só se aplica quando a fonte de pagamento for salário ou salário + bens.
- Quando a fonte de pagamento for bens, a regra do 1/3 não é aplicada e o fluxo segue para análise por garantias.
- Plano de pagamento com botão para expandir todas as prestações.
- Novo Pedido preenche automaticamente Nome, NUIT, Telefone e Email sem permitir edição.
- Novo Pedido reaproveita documentos já existentes e solicita apenas os em falta.
- Meus Empréstimos mostra apenas empréstimos do cliente, com estado Concluído ou Em pagamento.
- Documentos mostra submetidos e por submeter, com upload.
- Perfil KYC mostra dados editáveis, documentos, nível de confiança, botão gravar e redefinição de senha.

Build validado com `npm run build`.
