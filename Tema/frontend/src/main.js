// ============================================================
//  SIGEM-MICROCREDITO — main.js
//  Importar TODOS os CSS do tema OTECH ERP aqui
//  Ficheiro: frontend/src/main.js
// ============================================================
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// ── 1. IMPORTAR TEMA OTECH ERP (ORDEM IMPORTANTE) ───────────
import './assets/styles/tokens.css'      // variáveis CSS
import './assets/styles/main.css'        // reset + layout + cards + botões + tabelas + formulários
import './assets/styles/sidebar.css'     // sidebar navy
import './assets/styles/components.css'  // topbar + dashboard + microcredito + login

// ── 2. App ───────────────────────────────────────────────────
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')


// ============================================================
//  INSTRUÇÕES DE APLICAÇÃO DO TEMA
//  README: Como aplicar o tema OTECH ERP ao SIGEM
// ============================================================

/*
╔══════════════════════════════════════════════════════════════╗
║   SIGEM-MICROCREDITO — Tema OTECH ERP                      ║
║   Guia de Aplicação                                         ║
╚══════════════════════════════════════════════════════════════╝

═══ FICHEIROS ENTREGUES ════════════════════════════════════════

  frontend/src/assets/styles/
  ├── tokens.css        ← CSS variables (cores, sombras, fontes)
  ├── main.css          ← Estilos base globais
  ├── sidebar.css       ← Sidebar navy OTECH
  └── components.css    ← Topbar, cards, forms, login, microcredito

  frontend/src/components/
  ├── AppSidebar.vue    ← Sidebar Vue 3 pronta
  └── AppTopbar.vue     ← Topbar Vue 3 pronta

═══ COMO APLICAR (PASSO A PASSO) ══════════════════════════════

  PASSO 1 — Copiar os 4 ficheiros CSS para:
    frontend/src/assets/styles/
    (substituir os existentes)

  PASSO 2 — Copiar AppSidebar.vue e AppTopbar.vue para:
    frontend/src/components/
    (substituir os existentes)

  PASSO 3 — No main.js, substituir os imports CSS antigos por:
    import './assets/styles/tokens.css'
    import './assets/styles/main.css'
    import './assets/styles/sidebar.css'
    import './assets/styles/components.css'

  PASSO 4 — No App.vue, usar o novo layout:
    <div class="app-layout">
      <AppSidebar :items="navItems" :active-tab="tab" :user="user" :branding="branding" @set-tab="tab=$event" />
      <div class="app-main">
        <AppTopbar :user="user" :modulo-activo="moduloLabel" @logout="doLogout" />
        <div class="app-page">
          <!-- conteúdo dos ecrãs aqui -->
        </div>
      </div>
    </div>

  PASSO 5 — Nas suas views/pages, usar as classes do tema:
    .card, .card-accent.blue, .kpi-grid, .kpi-card
    .btn, .btn-primary, .btn-outline, .btn-success, .btn-danger
    .form-group, .form-label, .form-control
    .table, .badge, .badge-aprovado, .badge-pendente
    .alert, .alert-info, .alert-warning, .alert-success
    .tabs, .tab-item, .filters-bar, .search-box
    .modal-overlay, .modal, .modal-header, .modal-body

═══ CLASSES ESPECÍFICAS MICROCREDITO ═══════════════════════════

  Para tabelas de pedidos:
    .pedido-num         → número do pedido (monospace azul)
    .cliente-info       → bloco nome + NUIT + telefone
    .valor-montante     → valor a negrito

  Para cards de pedido:
    .pedido-card        → card clicável com hover
    .pedido-card-valor  → valor grande em destaque

  Para o simulador:
    .simulador-result   → painel de resultado
    .simulador-row      → linha label / valor
    .simulador-total    → total final

  Para o wizard de registo:
    .wizard-steps       → barra de progresso de passos
    .wizard-step.done / .active

  Para o login:
    .login-page         → fundo gradiente navy
    .login-card         → card branco central
    .login-logo-icon    → ícone com gradiente azul

═══ CORES RÁPIDAS (variáveis principais) ═══════════════════════

  var(--mk-dark)    #0A2342   Navy escuro (sidebar)
  var(--mk-blue)    #007BFF   Azul primário
  var(--mk-cyan)    #00AACC   Ciano (gradientes)
  var(--mk-green)   #00A843   Verde (aprovado)
  var(--mk-orange)  #FF9800   Laranja (pendente)
  var(--mk-red)     #D32F2F   Vermelho (recusado/erro)
  var(--mk-bg)      #F0F4F8   Fundo da página
  var(--mk-surface) #FFFFFF   Fundo dos cards

═══════════════════════════════════════════════════════════════*/
