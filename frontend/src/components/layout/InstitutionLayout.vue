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
import { ref, computed } from 'vue'
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
  user:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="4" r="3"/><path d="M1 13c0-3 2.6-5 6-5s6 2 6 5"/></svg>`,
  file:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 1h7l3 3v9H2V1z"/><path d="M9 1v3h3"/></svg>`,
  card:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="3" width="12" height="8" rx="1"/><line x1="1" y1="7" x2="13" y2="7"/></svg>`,
  bell:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 2v1M4 11a3 3 0 006 0"/><path d="M1 9V7a6 6 0 1112 0v2l1 2H0l1-2z"/></svg>`,
  chart: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="1,11 4,7 7,9 11,3"/><line x1="1" y1="13" x2="13" y2="13"/></svg>`,
  calc:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="1" width="10" height="12" rx="1"/><line x1="4" y1="4" x2="10" y2="4"/></svg>`,
  tag:   `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 1H13V6L6 13L1 8L8 1z"/></svg>`,
  cog:   `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="2"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2"/></svg>`,
  chat:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 2h12v7H4l-3 3V2z"/></svg>`,
  shield:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1L2 3v4c0 3 2.5 5 5 6 2.5-1 5-3 5-6V3L7 1z"/></svg>`,
}

const menuItems = computed(() => [
  { tab:'dashboard',    label:'Dashboard',         icon:I.home,  to:'/institution/dashboard' },
  { tab:'clients',      label:'Clientes',          icon:I.user,  to:'/institution/clients' },
  { sep:true, _key:'s1' },
  { tab:'applications', label:'Pedidos',           icon:I.file,  to:'/institution/applications' },
  { tab:'loans',        label:'Empréstimos',       icon:I.file,  to:'/institution/loans' },
  { tab:'simulator',    label:'Simulador',         icon:I.calc,  to:'/institution/simulator' },
  { tab:'compare',      label:'Comparar / Simular',icon:I.chart, to:'/institution/compare' },
  { tab:'payments',     label:'Pagamentos',        icon:I.card,  to:'/institution/payments' },
  { sep:true, _key:'s2' },
  { tab:'products',     label:'Produtos',          icon:I.tag,   to:'/institution/products' },
  { tab:'settings',     label:'Marca / Logo',      icon:I.cog,   to:'/institution/settings' },
  { tab:'whatsapp',     label:'WhatsApp',          icon:I.chat,  to:'/institution/whatsapp' },
  { sep:true, _key:'s3' },
  { tab:'notifications',label:'Notificações',      icon:I.bell,  to:'/institution/notifications', count: notifStore.unreadCount || undefined },
  { tab:'audit',        label:'Auditoria',         icon:I.shield,to:'/institution/audit' },
  { tab:'reports',      label:'Relatórios',        icon:I.chart, to:'/institution/reports' },
  { tab:'profile',      label:'Meu Perfil',        icon:I.user,  to:'/institution/profile' },
])

const activeTab = computed(() => route.path.split('/')[2] || 'dashboard')
function setTab(t) { const i = menuItems.value.find(x => x.tab === t); if (i?.to) router.push(i.to) }
function logout() { auth.logout(); router.push('/login') }
</script>
