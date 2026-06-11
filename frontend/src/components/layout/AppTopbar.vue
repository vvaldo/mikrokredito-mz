<template>
  <header class="topbar">
    <!-- Hamburger (mobile) -->
    <button class="topbar-ham" @click="$emit('toggle-sidebar')" aria-label="Menu">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
        <line x1="2" y1="5"  x2="18" y2="5"/>
        <line x1="2" y1="10" x2="18" y2="10"/>
        <line x1="2" y1="15" x2="18" y2="15"/>
      </svg>
    </button>

    <RouterLink to="/" class="topbar-brand">
      <div class="topbar-logo">
        <img v-if="branding.logoUrl" :src="branding.logoUrl" :alt="branding.name" />
        <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2L14 5.5V11L9 14.5L4 11V5.5L9 2Z" fill="white" opacity=".9"/>
          <circle cx="9" cy="8.5" r="2.5" fill="#E24B4A"/>
        </svg>
      </div>
      <div class="topbar-brand-text">
        <div class="topbar-name">{{ branding.name }}</div>
        <div class="topbar-tagline">{{ branding.tagline }}</div>
      </div>
    </RouterLink>

    <div class="topbar-right">
      <button class="topbar-bell" @click="$emit('toggle-notifs')" title="Notificações">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 2v1M6 14a3 3 0 006 0"/>
          <path d="M3 11V9a6 6 0 0112 0v2l1 2H2l1-2z"/>
        </svg>
        <span v-if="unreadCount > 0" class="bell-dot"></span>
      </button>
      <span v-if="unreadCount > 0"
        style="background:#A32D2D;color:#fff;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;cursor:pointer;flex-shrink:0"
        @click="$emit('toggle-notifs')">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>

      <div class="user-chip">
        <div class="avatar">{{ initials }}</div>
        <span>{{ firstName }}</span>
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
import { computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useBrandingStore } from '@/stores/branding'

const auth   = useAuthStore()
const notif  = useNotificationStore()
const brand  = useBrandingStore()

const props = defineProps({ unreadCount: { type: Number, default: 0 } })
defineEmits(['toggle-notifs', 'logout', 'toggle-sidebar'])

const firstName = computed(() => auth.user?.full_name?.split(' ')[0] || '')
const initials  = computed(() => auth.user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?')
const branding  = computed(() => brand)

let timer
onMounted(() => {
  notif.fetchUnreadCount()
  timer = setInterval(() => notif.fetchUnreadCount(), 30000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.topbar-brand-text { min-width: 0; }
</style>
