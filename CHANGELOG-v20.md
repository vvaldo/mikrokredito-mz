# v20 — Logo, bancos, utilizadores por instituição e recuperação de senha

## Corrigido
- Logotipo SaaS agora carrega correctamente no frontend usando `/uploads` via proxy do Vite e helper `assetUrl()`.
- Preview e topbar passam a usar URL absoluta/compatível com backend.
- Recuperação de senha foi movida para página própria `/forgot-password`.

## Super Admin
- Criar utilizador com perfil Agente, Gestor/Admin Banco ou Cliente exige seleccionar banco/instituição.
- Gestão de Utilizadores agora permite filtrar por banco.
- Menu Instituições agora gere bancos/instituições de crédito, não produtos.
- Super Admin pode criar, editar, activar, inactivar/suspender e apagar instituições sem utilizadores associados.

## Backend
- Validação server-side para impedir criação de utilizador institucional sem `institution_id`.
- Novos endpoints:
  - `POST /api/v1/institutions/:id/activate`
  - `POST /api/v1/institutions/:id/suspend`
  - `DELETE /api/v1/institutions/:id`
