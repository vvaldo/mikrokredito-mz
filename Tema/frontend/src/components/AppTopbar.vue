<template>
<!-- ============================================================
  SIGEM-MICROCREDITO — AppTopbar.vue
  Topbar com tema OTECH ERP
  ============================================================ -->
<header class="app-topbar">

  <!-- Hamburger mobile -->
  <button class="sidebar-hamburger" @click="$emit('toggle-sidebar')" aria-label="Menu">
    ☰
  </button>

  <!-- Módulo activo -->
  <div class="topbar-brand" style="margin-left: 8px">
    <span class="topbar-module">{{ moduloActivo }}</span>
  </div>

  <div class="topbar-spacer" />

  <!-- Data -->
  <span class="topbar-date">{{ dataHoje }}</span>

  <div class="topbar-divider" />

  <!-- Licença -->
  <div class="topbar-licenca">
    <span>●</span> Licença Activa
  </div>

  <div class="topbar-divider" />

  <!-- Utilizador -->
  <div class="topbar-user" @click="ddOpen = !ddOpen" ref="userBtn">
    <div class="topbar-avatar">
      <img v-if="user?.avatar" :src="user.avatar" :alt="user.nome" />
      <span v-else>{{ initials(user?.nome) }}</span>
    </div>
    <span class="topbar-user-name">{{ user?.nome?.split(' ')[0] }}</span>
    <span class="topbar-user-arrow">▾</span>

    <!-- Dropdown -->
    <div class="user-dropdown" v-if="ddOpen" @click.stop>
      <div class="user-dropdown-header">
        <div class="user-dropdown-name">{{ user?.nome }}</div>
        <div class="user-dropdown-role">{{ user?.perfil }}</div>
      </div>
      <button class="dropdown-item" @click="$emit('perfil'); ddOpen=false">
        👤 &nbsp;Meu Perfil
      </button>
      <button class="dropdown-item" @click="$emit('password'); ddOpen=false">
        🔐 &nbsp;Alterar Password
      </button>
      <button class="dropdown-item" @click="$emit('config'); ddOpen=false">
        ⚙️ &nbsp;Configurações
      </button>
      <div class="dropdown-sep" />
      <button class="dropdown-item danger" @click="$emit('logout'); ddOpen=false">
        🚪 &nbsp;Sair
      </button>
    </div>
  </div>
</header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  user:         { type: Object, default: null },
  moduloActivo: { type: String, default: 'SIGEM-MICROCREDITO' },
})

const emit = defineEmits(['toggle-sidebar', 'logout', 'perfil', 'password', 'config'])
const ddOpen = ref(false)

function initials(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const dataHoje = computed(() => {
  return new Date().toLocaleDateString('pt-MZ', { day:'2-digit', month:'short', year:'numeric' })
})

// Fechar dropdown ao clicar fora
function onClickOutside(e) {
  if (!e.target.closest('.topbar-user')) ddOpen.value = false
}
onMounted(()  => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>
