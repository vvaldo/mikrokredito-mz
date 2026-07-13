<template>
<!-- ============================================================
  SIGEM-MICROCREDITO — AppSidebar.vue
  Sidebar com tema OTECH ERP Navy
  ============================================================ -->
<nav class="app-sidebar" :class="{ open: isOpen }">

  <!-- Logo / Branding -->
  <div class="sidebar-logo">
    <div class="sidebar-logo-icon">
      <img v-if="branding.logo" :src="branding.logo" :alt="branding.nome" />
      <span v-else>{{ branding.initials || 'S' }}</span>
    </div>
    <div class="sidebar-logo-text">
      <div class="sidebar-logo-name">{{ branding.nome || 'SIGEM' }}</div>
      <div class="sidebar-logo-sub">{{ branding.sub || 'Microcrédito' }}</div>
    </div>
  </div>

  <!-- Navegação -->
  <div class="sidebar-nav">
    <template v-for="item in items" :key="item._key || item.tab">

      <!-- Separador de secção -->
      <div v-if="item.sep" class="sidebar-sep" />
      <div v-else-if="item.section" class="sidebar-section">{{ item.section }}</div>

      <!-- Item de navegação -->
      <div
        v-else
        class="sidebar-item"
        :class="{ active: activeTab === item.tab }"
        @click="handleClick(item)"
      >
        <span class="item-icon" v-html="item.icon" />
        <span class="item-label truncate">{{ item.label }}</span>
        <span
          v-if="item.count"
          class="badge-count"
          :class="item.countVariant || ''"
        >{{ item.count }}</span>
      </div>
    </template>
  </div>

  <!-- Utilizador logado (fundo) -->
  <div class="sidebar-user" v-if="user">
    <div class="sidebar-avatar">
      <img v-if="user.avatar" :src="user.avatar" :alt="user.nome" />
      <span v-else>{{ initials(user.nome) }}</span>
    </div>
    <div>
      <div class="sidebar-user-name truncate">{{ user.nome }}</div>
      <div class="sidebar-user-role">{{ user.perfil }}</div>
    </div>
    <button class="sidebar-logout" title="Sair" @click="$emit('logout')">
      <!-- ícone sair -->
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  </div>
</nav>

<!-- Overlay mobile -->
<div
  class="sidebar-overlay"
  :class="{ show: isOpen }"
  @click="$emit('close')"
/>
</template>

<script setup>
const props = defineProps({
  items:     { type: Array,   default: () => [] },
  activeTab: { type: String,  default: '' },
  isOpen:    { type: Boolean, default: false },
  user:      { type: Object,  default: null },
  branding:  { type: Object,  default: () => ({}) },
})

const emit = defineEmits(['set-tab', 'close', 'logout'])

function handleClick(item) {
  if (item.disabled) return
  emit('set-tab', item.tab)
  emit('close')
}

function initials(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
</script>
