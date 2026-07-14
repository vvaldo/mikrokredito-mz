<template>
  <header class="topbar">
    <button class="topbar-ham" @click="$emit('toggle-sidebar')" aria-label="Menu">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
        <line x1="2" y1="5"  x2="18" y2="5"/>
        <line x1="2" y1="10" x2="18" y2="10"/>
        <line x1="2" y1="15" x2="18" y2="15"/>
      </svg>
    </button>

    <RouterLink to="/" class="topbar-brand">
      <div class="topbar-logo">
        <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.name" />
        <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2L14 5.5V11L9 14.5L4 11V5.5L9 2Z" fill="white" opacity=".9"/>
          <circle cx="9" cy="8.5" r="2.5" fill="#E24B4A"/>
        </svg>
      </div>
      <div class="topbar-brand-text">
        <div class="topbar-name">{{ brand.name }}</div>
        <div class="topbar-tagline">{{ brand.tagline }}</div>
      </div>
    </RouterLink>

    <div class="topbar-right">
      <!-- Dark/Light mode toggle -->
      <button class="theme-toggle" @click="theme.toggle()" :title="theme.dark ? 'Modo claro' : 'Modo escuro'">
        {{ theme.dark ? '☀️' : '🌙' }}
      </button>

      <!-- Notification bell -->
      <div class="topbar-dropdown-wrap" ref="notifWrap">
        <button class="topbar-bell" @click="toggleNotifs" title="Notificações">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 2v1M6 14a3 3 0 006 0"/>
            <path d="M3 11V9a6 6 0 0112 0v2l1 2H2l1-2z"/>
          </svg>
          <span v-if="notifStore.unreadCount > 0" class="bell-dot"></span>
        </button>

        <span v-if="notifStore.unreadCount > 0"
          style="background:#A32D2D;color:#fff;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;cursor:pointer;flex-shrink:0"
          @click="toggleNotifs">{{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}</span>

        <div v-if="notifsOpen" class="topbar-dropdown notif-dropdown">
          <div class="dropdown-title">Notificações</div>
          <div v-if="!notifStore.recent.length" class="dropdown-empty">Sem notificações recentes.</div>
          <button v-for="n in notifStore.recent" :key="n.id" class="dropdown-item notif-item" :class="{ unread: !n.read_at }" @click="openNotif(n)">
            <span class="notif-item-title">{{ n.subject || n.event || 'Notificação' }}</span>
            <span class="notif-item-date">{{ fmtDate(n.created_at) }}</span>
          </button>
          <button class="dropdown-item dropdown-footer" @click="goAllNotifs">Ver todas</button>
        </div>
      </div>

      <!-- User menu -->
      <div class="topbar-dropdown-wrap" ref="userWrap">
        <div class="user-chip" @click="userOpen = !userOpen">
          <div class="avatar">{{ initials }}</div>
          <span>{{ firstName }}</span>
        </div>
        <div v-if="userOpen" class="topbar-dropdown user-dropdown">
          <button class="dropdown-item" @click="goProfile">👤 Perfil</button>
          <button class="dropdown-item" @click="goProfile">🔒 Alterar senha</button>
          <div class="dropdown-sep"></div>
          <button class="dropdown-item" @click="$emit('logout')">↩ Sair</button>
        </div>
      </div>

      <button class="topbar-logout" @click="$emit('logout')" title="Sair">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2H2v12h4M10 11l4-3-4-3M6 8h8"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useBrandingStore } from '@/stores/branding'
import { useThemeStore } from '@/stores/theme'

const auth   = useAuthStore()
const notifStore = useNotificationStore()
const brand  = useBrandingStore()
const theme  = useThemeStore()
const router = useRouter()

defineProps({ unreadCount: { type: Number, default: 0 } })
defineEmits(['toggle-notifs', 'logout', 'toggle-sidebar'])

const firstName = computed(() => auth.user?.full_name?.split(' ')[0] || '')
const initials  = computed(() => auth.user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?')

const profileRoute = computed(() => {
  const role = auth.user?.role
  if (role === 'super_admin') return '/super/profile'
  if (role === 'inst_admin') return '/institution/profile'
  if (role === 'inst_agent') return '/agent/profile'
  if (role === 'client') return '/client/profile'
  return '/login'
})
const notifsRoute = computed(() => {
  const role = auth.user?.role
  if (role === 'super_admin') return '/super/notifications'
  if (role === 'inst_admin' || role === 'inst_agent') return '/institution/notifications'
  if (role === 'client') return '/client/notifications'
  return '/login'
})

const notifsOpen = ref(false)
const userOpen = ref(false)
const notifWrap = ref(null)
const userWrap = ref(null)

function toggleNotifs() {
  notifsOpen.value = !notifsOpen.value
  userOpen.value = false
  if (notifsOpen.value) notifStore.fetchRecent()
}
function goProfile() { userOpen.value = false; router.push(profileRoute.value) }
function goAllNotifs() { notifsOpen.value = false; router.push(notifsRoute.value) }
async function openNotif(n) {
  if (!n.read_at) await notifStore.markRead(n.id)
  notifsOpen.value = false
  if (n.link_path) router.push(n.link_path)
  else router.push(notifsRoute.value)
}
function fmtDate(v) { return v ? new Date(v).toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }

function onClickOutside(e) {
  if (notifWrap.value && !notifWrap.value.contains(e.target)) notifsOpen.value = false
  if (userWrap.value && !userWrap.value.contains(e.target)) userOpen.value = false
}

let timer
onMounted(() => {
  notifStore.fetchUnreadCount()
  timer = setInterval(() => notifStore.fetchUnreadCount(), 30000)
  window.addEventListener('click', onClickOutside, true)
})
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('click', onClickOutside, true)
})
</script>

<style scoped>
.topbar-dropdown-wrap { position: relative; }
.topbar-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0; min-width: 220px;
  background: var(--mk-surface); border: 1px solid var(--mk-border);
  border-radius: var(--mk-r); box-shadow: var(--mk-shadow-md);
  padding: 6px; z-index: var(--mk-z-dropdown); display: flex; flex-direction: column; gap: 2px;
}
.dropdown-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--mk-text-3); padding: 6px 10px 4px; }
.dropdown-empty { font-size: 12px; color: var(--mk-text-3); padding: 10px; text-align: center; }
.dropdown-item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; text-align: left; padding: 8px 10px; border-radius: calc(var(--mk-r) - 2px);
  background: transparent; border: none; cursor: pointer; font-size: 12.5px; color: var(--mk-text-1);
  font-family: var(--mk-font); transition: background .12s;
}
.dropdown-item:hover { background: var(--mk-surface-2); }
.dropdown-sep { height: 1px; background: var(--mk-border); margin: 4px 6px; }
.dropdown-footer { justify-content: center; font-weight: 600; color: var(--erp-blue); }
.notif-item { flex-direction: column; align-items: flex-start; gap: 2px; }
.notif-item.unread { background: rgba(0,123,255,.06); }
.notif-item-title { font-size: 12.5px; font-weight: 600; color: var(--mk-text-1); }
.notif-item-date { font-size: 10.5px; color: var(--mk-text-3); }
</style>
