<template>
  <div class="app-shell">
    <AppTopbar :unread-count="unreadCount" @logout="logout"
      @toggle-sidebar="sidebarOpen = !sidebarOpen" @notifications-read="refreshUnread" />
    <!-- Mobile overlay -->
    <div class="sidebar-overlay" :class="{ open: sidebarOpen }" @click="sidebarOpen = false" />
    <div class="body-layout">
      <AppSidebar :items="menuItems" :active-tab="activeTab" :is-open="sidebarOpen" @set-tab="setTab" @close="sidebarOpen = false" />
      <main class="main-content"><RouterView @notifications-read="refreshUnread" /><AppFooter/></main>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
const router = useRouter()
const sidebarOpen = ref(false), route = useRoute(), auth = useAuthStore()
const unreadCount = ref(0)
const icons = {
  home:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 6l6-4 6 4v7H1V6z"/><rect x="5" y="9" width="4" height="4"/></svg>`,
  user:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="4" r="3"/><path d="M1 13c0-3 2.6-5 6-5s6 2 6 5"/></svg>`,
  file:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 1h7l3 3v9H2V1z"/><path d="M9 1v3h3"/></svg>`,
  chart:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="1,11 4,7 7,9 11,3"/><line x1="1" y1="13" x2="13" y2="13"/></svg>`,
}
const menuItems = [
  { tab:'home', label:'Início', icon:icons.home, to:'/client/home' },
  { tab:'compare', label:'Comparar / Simular', icon:icons.chart, to:'/client/compare' },
  { sep:true, _key:'s1' },
  { tab:'apply', label:'Novo pedido', icon:icons.file, to:'/client/apply' },
  { tab:'my-loans', label:'Meus empréstimos', icon:icons.file, to:'/client/my-loans' },
  { tab:'documents', label:'Documentos', icon:icons.file, to:'/client/documents' },
  { sep:true, _key:'s2' },
  { tab:'profile', label:'Perfil KYC', icon:icons.user, to:'/client/profile' },
]
const activeTab = computed(() => route.path.split('/')[2] || 'home')
function setTab(t){ const i = menuItems.find(x => x.tab === t); if(i?.to) router.push(i.to) }
function logout(){ auth.logout(); router.push('/login') }
async function refreshUnread(){ try{ const { data } = await api.get('/notifications/my/unread-count'); unreadCount.value = data.data?.count || 0 }catch{ unreadCount.value = 0 } }
onMounted(refreshUnread)
watch(() => route.fullPath, refreshUnread)
</script>
