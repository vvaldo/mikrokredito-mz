<template>
  <div class="app-shell">
    <AppTopbar :unread-count="notifStore.unreadCount" @logout="logout" @toggle-sidebar="sidebarOpen=!sidebarOpen"/>
    <div class="sidebar-overlay" :class="{open:sidebarOpen}" @click="sidebarOpen=false"/>
    <div class="body-layout">
      <AppSidebar :items="menuItems" :active-tab="activeTab" :is-open="sidebarOpen" @set-tab="setTab" @close="sidebarOpen=false"/>
      <main class="main-content"><RouterView/><AppFooter/></main>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const router = useRouter(), route = useRoute()
const auth = useAuthStore(), notifStore = useNotificationStore()
const sidebarOpen = ref(false)

const I = {
  home:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 6l6-4 6 4v7H1V6z"/><rect x="5" y="9" width="4" height="4"/></svg>`,
  chart: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="1,11 4,7 7,9 11,3"/><line x1="1" y1="13" x2="13" y2="13"/></svg>`,
  plus:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>`,
  file:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 1h7l3 3v9H2V1z"/><path d="M9 1v3h3"/></svg>`,
  card:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="3" width="12" height="8" rx="1"/><line x1="1" y1="7" x2="13" y2="7"/></svg>`,
  bell:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 2v1M4 11a3 3 0 006 0"/><path d="M1 9V7a6 6 0 1112 0v2l1 2H0l1-2z"/></svg>`,
  user:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="4" r="3"/><path d="M1 13c0-3 2.6-5 6-5s6 2 6 5"/></svg>`,
}

const menuItems = computed(() => [
  { tab:'home',          label:'Início',            icon:I.home,  to:'/client/home' },
  { tab:'compare',       label:'Comparar / Simular',icon:I.chart, to:'/client/compare' },
  { sep:true, _key:'s1' },
  { tab:'apply',         label:'Novo pedido',       icon:I.plus,  to:'/client/apply' },
  { tab:'my-loans',      label:'Meus empréstimos',  icon:I.file,  to:'/client/my-loans' },
  { tab:'payments',      label:'Pagamentos',        icon:I.card,  to:'/client/payments' },
  { tab:'documents',     label:'Documentos',        icon:I.file,  to:'/client/documents' },
  { sep:true, _key:'s2' },
  { tab:'notifications', label:'Notificações',      icon:I.bell,  to:'/client/notifications', count: notifStore.unreadCount || undefined },
  { tab:'profile',       label:'Perfil KYC',        icon:I.user,  to:'/client/profile' },
])

const activeTab = computed(() => route.path.split('/')[2] || 'home')
function setTab(t) { const i = menuItems.value.find(x => x.tab === t); if (i?.to) router.push(i.to) }
function logout() { auth.logout(); router.push('/login') }
onMounted(() => notifStore.fetchUnreadCount())
</script>
