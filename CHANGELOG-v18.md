# v18 — Logotipo SaaS e Empréstimos

- Menu **Logotipo SaaS** movido para o perfil Super Admin.
- Gestão de identidade SaaS ampliada: nome da aplicação, subtítulo, rodapé, powered by e cores.
- Upload de logotipo restrito ao Super Admin.
- Substituição de logotipo com limpeza do ficheiro anterior e cache busting.
- Topbar e rodapé passam a ler a identidade configurada por instituição.
- Menu Empréstimos passa a retornar todos os empréstimos existentes e também pedidos aprovados ainda sem desembolso.
- Endpoint `/loans/active/list` corrigido para não limitar a um único cliente fora do perfil cliente.
- Frontend validado com `npm run build`.
