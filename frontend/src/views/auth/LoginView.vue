<template>
  <div class="auth-page">
    <!-- Left panel — configurable via branding store -->
    <div class="auth-left" :style="{ background: `linear-gradient(160deg, ${darkColor} 0%, ${branding.primaryColor} 60%, ${branding.primaryColor}cc 100%)` }">
      <div class="auth-logo">
        <img v-if="branding.logoUrl" :src="branding.logoUrl" :alt="branding.name" style="width:52px;height:52px;border-radius:12px;object-fit:contain;background:rgba(255,255,255,.15);padding:4px" />
        <svg v-else width="52" height="52" viewBox="0 0 52 52" fill="none">
          <rect width="52" height="52" rx="14" fill="white" opacity=".12"/>
          <path d="M26 10L38 17V31L26 38L14 31V17L26 10Z" fill="white" opacity=".9"/>
          <circle cx="26" cy="24" r="6.5" :fill="branding.dangerColor"/>
        </svg>
      </div>
      <h1 class="auth-brand">{{ branding.leftTitle }}</h1>
      <p class="auth-brand-sub">{{ branding.leftSub }}</p>

      <div v-if="branding.creditPolicy" class="auth-policy">{{ branding.creditPolicy }}</div>

      <div class="auth-features">
        <div v-for="f in branding.features" :key="f" class="auth-feature">
          <div class="auth-feature-icon">
            <svg viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2">
              <polyline points="2,7 6,11 12,3"/>
            </svg>
          </div>
          <span>{{ f }}</span>
        </div>
      </div>

      <p class="auth-powered">{{ branding.poweredBy }}</p>
    </div>

    <!-- Right panel — form -->
    <div class="auth-right">
      <div class="auth-card">
        <div class="auth-card-header">
          <h2>{{ branding.welcomeTitle }}</h2>
          <p>{{ branding.welcomeSub }}</p>
        </div>

        <form @submit.prevent="submit">
          <div class="form-group">
            <label class="form-label">Email</label>
            <div class="search-wrap">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M2 4l6 5 6-5"/><rect x="1" y="3" width="14" height="10" rx="2"/>
              </svg>
              <input class="form-input" type="email" v-model="form.email"
                placeholder="o_seu@email.com" autocomplete="email" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              Palavra-passe
              <RouterLink to="/forgot-password" style="float:right;font-size:11px;color:var(--blue-600)">Esqueceu?</RouterLink>
            </label>
            <div class="search-wrap">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/>
              </svg>
              <input class="form-input" :type="showPwd ? 'text' : 'password'"
                v-model="form.password" placeholder="••••••••" autocomplete="current-password" required />
              <button type="button" class="pwd-eye" @click="showPwd = !showPwd">
                <svg v-if="!showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2"/>
                  <path d="M7.1 7.1C3.9 8.8 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/>
                  <path d="M14.2 6.3A10.8 10.8 0 0122 12s-.8 1.4-2.2 2.8"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger" style="margin-bottom:14px">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/>
            </svg>
            {{ error }}
          </div>

          <button class="btn btn-primary btn-block" type="submit"
            :class="{ loading }" :disabled="loading" style="height:42px">
            {{ loading ? '' : 'Entrar' }}
          </button>
        </form>

        <div class="auth-divider"><span>ou use uma conta de demonstração</span></div>

        <div class="demo-grid">
          <button v-for="d in demos" :key="d.role" class="demo-btn" @click="fillDemo(d)">
            <div class="demo-icon" :style="{ background: d.color }">{{ d.icon }}</div>
            <div>
              <div class="demo-label">{{ d.label }}</div>
              <div class="demo-email">{{ d.email }}</div>
            </div>
          </button>
        </div>

        <p class="auth-footer-link">
          Não tem conta?
          <RouterLink to="/register">Criar conta</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBrandingStore } from '@/stores/branding'
import { useToast } from 'vue-toastification'

const router   = useRouter()
const auth     = useAuthStore()
const branding = useBrandingStore()
const toast    = useToast()

const form    = ref({ email: '', password: '' })
const loading = ref(false)
const error   = ref('')
const showPwd = ref(false)

// Darken primary color for gradient
const darkColor = computed(() => {
  const c = branding.primaryColor
  if (!c.startsWith('#')) return '#062E55'
  const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16)
  return `rgb(${Math.max(0,r-60)},${Math.max(0,g-60)},${Math.max(0,b-60)})`
})

const demos = [
  { label:'Super Admin',  role:'super_admin', email:'superadmin@mikrokredito.co.mz', password:'demo1234', color:'#185FA5', icon:'🛡' },
  { label:'Admin Banco',  role:'inst_admin',  email:'admin@bancooportunidade.co.mz', password:'demo1234', color:'#185FA5', icon:'🏦' },
  { label:'Cliente',      role:'client',      email:'maria@cliente.mz',              password:'demo1234', color:'#A32D2D', icon:'👤' },
]

function fillDemo(d) { form.value.email = d.email; form.value.password = d.password }

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(form.value.email, form.value.password)
    toast.success(`Bem-vindo, ${auth.user?.full_name?.split(' ')[0]}!`)
    router.push(auth.defaultRoute)
  } catch (e) {
    error.value = e.response?.data?.message || 'Credenciais incorrectas. Tente novamente.'
  } finally { loading.value = false }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: grid; grid-template-columns: 400px 1fr; }
.auth-left {
  padding: 44px 36px; display: flex; flex-direction: column;
  color: rgba(255,255,255,.92); position: relative; overflow: hidden;
}
.auth-left::after { content:''; position:absolute; inset:0; background:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E"); pointer-events:none; }
.auth-logo { margin-bottom:18px; position:relative;z-index:1; }
.auth-brand { font-size:24px;font-weight:600;margin-bottom:6px;position:relative;z-index:1; }
.auth-brand-sub { font-size:13px;opacity:.7;margin-bottom:24px;position:relative;z-index:1; }
.auth-policy { background:rgba(255,255,255,.1);border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:20px;line-height:1.6;position:relative;z-index:1; }
.auth-features { display:flex;flex-direction:column;gap:12px;position:relative;z-index:1;flex:1; }
.auth-feature { display:flex;align-items:center;gap:10px;font-size:13px; }
.auth-feature-icon { width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.auth-feature-icon svg { width:10px;height:10px; }
.auth-powered { font-size:10px;opacity:.4;margin-top:32px;position:relative;z-index:1; }
.auth-right { background:var(--mk-surface-3,#f1f5f9);display:flex;align-items:center;justify-content:center;padding:32px 24px; }
.auth-card { background:var(--mk-surface,#fff);border:1px solid var(--mk-border,#e2e8f0);border-radius:16px;padding:34px 30px 26px;width:100%;max-width:400px;box-shadow:0 4px 24px rgba(0,0,0,.07); }
.auth-card-header { margin-bottom:22px; }
.auth-card-header h2 { font-size:20px;font-weight:600;margin-bottom:4px; }
.auth-card-header p { font-size:13px;color:var(--mk-text-2,#475569); }
.auth-divider { position:relative;text-align:center;margin:18px 0;color:var(--mk-text-3,#94a3b8);font-size:11px; }
.auth-divider::before { content:'';position:absolute;top:50%;left:0;right:0;height:1px;background:var(--mk-border,#e2e8f0); }
.auth-divider span { position:relative;background:var(--mk-surface,#fff);padding:0 10px; }
.demo-grid { display:flex;flex-direction:column;gap:7px;margin-bottom:18px; }
.demo-btn { display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:8px;border:1px solid var(--mk-border,#e2e8f0);background:var(--mk-surface,#fff);cursor:pointer;transition:.12s;text-align:left;font-family:var(--mk-font,inherit); }
.demo-btn:hover { border-color:var(--blue-400,#378ADD);background:var(--blue-50,#E6F1FB); }
.demo-icon { width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0; }
.demo-label { font-size:13px;font-weight:500; }
.demo-email { font-size:11px;color:var(--mk-text-2,#475569); }
.auth-footer-link { font-size:12px;text-align:center;color:var(--mk-text-2,#475569); }
.auth-footer-link a { color:var(--blue-600,#185FA5);font-weight:500; }
.search-wrap { position:relative;display:flex;align-items:center; }
.search-wrap > svg { position:absolute;left:10px;width:14px;height:14px;color:var(--mk-text-3,#94a3b8);pointer-events:none; }
.search-wrap .form-input { padding-left:32px;padding-right:36px; }
.pwd-eye { position:absolute;right:10px;background:none;border:none;cursor:pointer;color:var(--mk-text-3,#94a3b8);padding:2px;display:flex; }
.pwd-eye svg { width:16px;height:16px; }
@media (max-width: 768px) { .auth-page { grid-template-columns:1fr; } .auth-left { display:none; } }
</style>
