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
const router=useRouter(),route=useRoute(),auth=useAuthStore(),notifStore=useNotificationStore()
const sidebarOpen=ref(false)
const I={
  home:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 6l6-4 6 4v7H1V6z"/><rect x="5" y="9" width="4" height="4"/></svg>`,
  user:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="4" r="3"/><path d="M1 13c0-3 2.6-5 6-5s6 2 6 5"/></svg>`,
  plus:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>`,
  file:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 1h7l3 3v9H2V1z"/><path d="M9 1v3h3"/></svg>`,
  calc:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="1" width="10" height="12" rx="1"/><line x1="4" y1="4" x2="10" y2="4"/></svg>`,
}
const menuItems=[
  {tab:'dashboard', label:'Dashboard',      icon:I.home, to:'/agent/dashboard'},
  {sep:true,_key:'s1'},
  {tab:'clients',   label:'Meus clientes',  icon:I.user, to:'/agent/clients'},
  {tab:'register-client', label:'Cadastrar cliente', icon:I.plus, to:'/agent/register-client'},
  {sep:true,_key:'s2'},
  {tab:'applications', label:'Pedidos',     icon:I.file, to:'/agent/applications'},
  {tab:'apply',     label:'Novo pedido',    icon:I.plus, to:'/agent/apply'},
  {tab:'simulator', label:'Simulador',      icon:I.calc, to:'/agent/simulator'},
  {sep:true,_key:'s3'},
  {tab:'profile',   label:'Meu Perfil',     icon:I.user, to:'/agent/profile'},
]
const activeTab=computed(()=>route.path.split('/')[2]||'dashboard')
function setTab(t){const i=menuItems.find(x=>x.tab===t);if(i?.to)router.push(i.to)}
function logout(){auth.logout();router.push('/login')}
</script>
