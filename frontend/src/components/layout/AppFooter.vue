<template>
  <footer class="app-footer">
    <div>
      <strong>{{ footerTitle }}</strong><br>
      <span>{{ footerSubtitle }}</span>
    </div>
    <div class="app-footer-powered">
      Powered by: <strong>{{ poweredByName }}</strong>
      <a :href="poweredUrlHref" target="_blank" rel="noopener">{{ poweredByUrl }}</a>
    </div>
  </footer>
</template>
<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const branding = computed(() => {
  const inst = auth.user?.institution || auth.user?.Institution || {}
  const local = JSON.parse(localStorage.getItem('tenantBranding') || '{}')
  return { ...local, ...(inst.settings?.branding || {}) }
})
const footerTitle = computed(() => branding.value.footer_title || branding.value.app_name || 'MicroCredit SYSTEM')
const footerSubtitle = computed(() => branding.value.footer_subtitle || branding.value.app_subtitle || 'Sistema Integrado de Gestão de Microcrédito')
const poweredByName = computed(() => branding.value.powered_by_name || 'OTECH - Open Technology')
const poweredByUrl = computed(() => branding.value.powered_by_url || 'www.otech.co.mz')
const poweredUrlHref = computed(() => String(poweredByUrl.value).startsWith('http') ? poweredByUrl.value : `https://${poweredByUrl.value}`)
</script>
