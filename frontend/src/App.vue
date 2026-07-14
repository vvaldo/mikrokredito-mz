<template>
  <RouterView />
</template>

<script setup>
import { RouterView, useRouter } from 'vue-router'
import { onMounted, onUnmounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import { useBrandingStore } from '@/stores/branding'

const router = useRouter()
const auth = useAuthStore()
const branding = useBrandingStore()
const toast = useToast()

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
let idleTimer = null

function resetIdleTimer() {
  clearTimeout(idleTimer)
  if (!auth.isLoggedIn) return
  const minutes = Number(branding.sessionTimeoutMinutes) || 60
  idleTimer = setTimeout(onIdleTimeout, minutes * 60 * 1000)
}

function onIdleTimeout() {
  if (!auth.isLoggedIn) return
  auth.logout()
  toast.info('Sessão terminada por inactividade. Entre novamente.')
  router.push('/login')
}

watch(() => auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) resetIdleTimer()
  else clearTimeout(idleTimer)
})

onMounted(() => {
  ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }))
  resetIdleTimer()
})
onUnmounted(() => {
  ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetIdleTimer))
  clearTimeout(idleTimer)
})
</script>
