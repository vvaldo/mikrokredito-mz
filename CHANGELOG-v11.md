# v11 — Fluxo real de pedidos, expansão e SMTP robusto

## Cliente
- Reposto o botão **Expandir** em “Meus empréstimos” para todos os pedidos, mesmo antes da aprovação/desembolso.
- O detalhe mostra: data de aprovação, ID do funcionário que avaliou, estado, documentos submetidos e prestações.
- Documentos continuam a baixar por endpoint autenticado.
- Pedidos sem plano de pagamento mostram mensagem clara: ainda não desembolsado.
- Incluída observação de Central de Riscos para empréstimos com atraso prolongado.

## Banco / Superadmin
- Pedidos submetidos pelo cliente aparecem na listagem real `/loans` para admin do banco e superadmin.
- Fluxo de status controlado: `submitted → under_review → approved/rejected → disbursed`.
- Botões reais: visualizar, enviar para análise, aprovar, desaprovar e desembolsar.
- Aprovação continua bloqueada sem BI, NUIT, atestado de residência e extracto bancário.
- Notificações de novo pedido e mudança de estado são registadas para admin do banco e superadmin.

## SMTP
- O envio de email passou a usar fallback automático entre portas 465, 587 e 25.
- O teste SMTP agora mostra o host/porta usados quando funcionar.
- Quando houver erro `535 Incorrect authentication data`, a API devolve uma mensagem clara de credenciais SMTP inválidas em vez de erro genérico.
