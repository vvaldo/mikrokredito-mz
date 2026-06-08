<template>
  <header class="topbar">
    <RouterLink to="/" class="topbar-brand">
      <div class="topbar-logo">
        <img :src="logoSrc" alt="Logo da instituição" @error="logoErrored=true" v-if="!logoErrored" />
        <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L14 5.5V11L9 14.5L4 11V5.5L9 2Z" fill="white" opacity=".9"/><circle cx="9" cy="8.5" r="2.5" fill="#E24B4A"/></svg>
      </div>
      <div><div class="topbar-name">{{ appName }}</div><div class="topbar-tagline">{{ appSubtitle }}</div></div>
    </RouterLink>
    <div class="topbar-right">
      <button class="topbar-bell" @click="toggleNotifs" title="Notificações">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2v1M6 14a3 3 0 006 0"/><path d="M3 11V9a6 6 0 1112 0v2l1 2H2l1-2z"/></svg>
        <span v-if="unreadCount > 0" class="bell-dot"></span>
        <strong v-if="unreadCount > 0" style="position:absolute;top:-6px;right:-8px;background:#A32D2D;color:#fff;border-radius:999px;font-size:10px;line-height:16px;min-width:16px;padding:0 4px">{{ unreadCount }}</strong>
      </button>
      <div v-if="showNotifs" class="topbar-menu" style="right:84px;width:340px">
        <strong>Notificações</strong>
        <p class="muted" style="margin:4px 0 8px">Clique para abrir e marcar como lida.</p>
        <div v-if="loadingNotifs" class="menu-line"><span>A carregar...</span></div>
        <div v-else-if="notifications.length===0" class="menu-line"><span>Sem notificações.</span></div>
        <button v-for="n in notifications" :key="n.id" class="menu-line notif-line" @click="openNotif(n)">
          <span><b>{{ n.subject || eventLabel(n.event) }}</b><br><small>{{ n.bodyText }}</small></span><small>{{ date(n.created_at) }}</small>
        </button>
        <RouterLink :to="notificationCenterRoute" class="menu-action" @click="showNotifs=false">Abrir centro de notificações</RouterLink>
      </div>
      <div class="user-chip" @click="showProfile = !showProfile" style="cursor:pointer">
        <div class="avatar">{{ initials }}</div><span style="font-size:13px">{{ firstName }}</span>
      </div>
      <div v-if="showProfile" class="topbar-menu">
        <strong>{{ auth.user?.full_name || 'Utilizador' }}</strong>
        <p class="muted" style="margin:4px 0 10px">{{ auth.user?.email || '' }}</p>
        <RouterLink :to="profileRoute" class="menu-action">Meu perfil / Alterar senha</RouterLink>
        <RouterLink v-if="auth.user?.role==='client'" to="/client/documents" class="menu-action">Adicionar documentos</RouterLink>
        <RouterLink v-if="auth.user?.role==='super_admin'" to="/super/branding" class="menu-action">Logotipo e identidade SaaS</RouterLink>
        <button class="menu-action" @click="sendToken('email')">Redefinir senha por email</button>
        <button class="menu-action" @click="sendToken('whatsapp')">Redefinir senha por WhatsApp/SMS</button>
      </div>
      <button class="topbar-logout" @click="$emit('logout')" title="Sair"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2H2v12h4M10 11l4-3-4-3M6 8h8"/></svg></button>
    </div>
  </header>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import api, { assetUrl } from '@/services/api'
const props = defineProps({ unreadCount: { type: Number, default: 0 } })
const emit = defineEmits(['logout','notifications-read'])
const auth = useAuthStore(); const toast = useToast(); const router = useRouter()
const showProfile = ref(false), showNotifs = ref(false), loadingNotifs = ref(false), notifications = ref([]), logoErrored = ref(false)
const firstName = computed(() => auth.user?.full_name?.split(' ')[0] || 'Utilizador')
const initials = computed(() => auth.user?.full_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'U')
const notificationCenterRoute = computed(() => auth.user?.role === 'client' ? '/client/home' : auth.user?.role === 'super_admin' ? '/super/notifications' : '/institution/notifications')
const profileRoute = computed(() => auth.user?.role === 'client' ? '/client/profile' : auth.user?.role === 'super_admin' ? '/super/profile' : '/institution/profile')

const branding = computed(() => {
  const inst = auth.user?.institution || auth.user?.Institution || {}
  const b = inst.settings?.branding || {}
  const local = JSON.parse(localStorage.getItem('tenantBranding') || '{}')
  return { ...local, ...b }
})
const appName = computed(() => branding.value.app_name || 'MicroCredit SYSTEM')
const appSubtitle = computed(() => branding.value.app_subtitle || 'Sistema Integrado de Gestão de Microcrédito')
const logoSrc = computed(() => {
  const instLogo = auth.user?.institution?.logo_url || auth.user?.Institution?.logo_url || localStorage.getItem('tenantLogoUrl')
  return instLogo ? `${assetUrl(instLogo)}${String(instLogo).includes('?') ? '&' : '?'}v=${localStorage.getItem('tenantLogoVersion') || Date.now()}` : '/default-client-logo.jpg'
})
watch(logoSrc, () => { logoErrored.value = false })
function eventLabel(e){return String(e||'Notificação').replaceAll('_',' ')}
function date(v){return v?new Date(v).toLocaleString('pt-MZ'):''}
async function toggleNotifs(){ showNotifs.value=!showNotifs.value; if(showNotifs.value) await loadNotifs() }
async function loadNotifs(){ loadingNotifs.value=true; try{ const {data}=await api.get('/notifications/my?limit=6'); notifications.value=(data.data||[]).map(n=>({...n, bodyText:String(n.body||'').replace(/<[^>]+>/g,' ').slice(0,90)})) } finally { loadingNotifs.value=false } }
async function openNotif(n){ try{ await api.post(`/notifications/${n.id}/read`); emit('notifications-read'); toast.info(n.subject || eventLabel(n.event)); showNotifs.value=false; router.push(notificationCenterRoute.value) }catch(e){ toast.error(e.response?.data?.message||'Erro ao abrir notificação') } }
async function sendToken(channel){ try{ await api.post('/auth/request-password-reset-token', { channel }); toast.success(`Token solicitado por ${channel}.`) }catch(e){ toast.error(e.response?.data?.message||'Erro ao solicitar token') } }
</script>
<style scoped>
.topbar-right{position:relative}.topbar-menu{position:absolute;top:42px;right:38px;z-index:50;background:var(--color-background-primary,#fff);border:1px solid var(--color-border-tertiary,#e2e8f0);box-shadow:0 18px 35px rgba(15,23,42,.16);border-radius:14px;padding:14px;width:260px}.menu-action{display:block;width:100%;text-align:left;border:0;background:transparent;color:var(--color-text-primary,#1a202c);padding:9px 8px;border-radius:8px;text-decoration:none;font-size:13px;cursor:pointer}.menu-action:hover{background:var(--color-background-secondary,#f7fafc)}.menu-line{display:flex;justify-content:space-between;gap:10px;border:0;border-top:1px solid var(--color-border-tertiary,#e2e8f0);padding:8px 0;font-size:13px;background:transparent;width:100%;text-align:left;color:inherit;cursor:pointer}.menu-line:hover{background:var(--color-background-secondary,#f7fafc)}.menu-line small{color:var(--color-text-secondary,#718096)}.notif-line span{max-width:230px;overflow:hidden}
</style>
