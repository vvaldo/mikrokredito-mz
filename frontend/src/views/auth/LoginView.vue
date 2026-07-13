<template>
  <div class="auth-page">
    <!-- Left panel -->
    <div class="auth-left" :style="leftStyle">
      <div class="auth-logo">
        <img v-if="branding.logoUrl" :src="branding.logoUrl" style="width:56px;height:56px;object-fit:contain;border-radius:12px;background:rgba(255,255,255,.1);padding:6px" />
        <div v-else class="auth-logo-default">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 3L28 9.5V20L16 26.5L4 20V9.5L16 3Z" fill="white" opacity=".9"/>
            <circle cx="16" cy="15" r="5" :fill="branding.dangerColor"/>
          </svg>
        </div>
      </div>
      <h1 class="auth-brand">{{ branding.leftTitle }}</h1>
      <p class="auth-brand-sub">{{ branding.leftSub }}</p>

      <div v-if="branding.creditPolicy" class="auth-policy">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0;margin-top:1px"><path d="M7 1L13 12H1L7 1z"/><line x1="7" y1="6" x2="7" y2="9"/></svg>
        {{ branding.creditPolicy }}
      </div>

      <div class="auth-features">
        <div v-for="f in branding.features" :key="f" class="auth-feature">
          <div class="auth-feature-icon">
            <svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2"><polyline points="1,6 5,10 11,2"/></svg>
          </div>
          <span>{{ f }}</span>
        </div>
      </div>
      <p class="auth-powered">{{ branding.poweredBy }}</p>
    </div>

    <!-- Right panel -->
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
              <RouterLink to="/forgot-password" style="float:right;font-size:11px;color:var(--blue-400)">Esqueceu?</RouterLink>
            </label>
            <div class="search-wrap">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/>
              </svg>
              <input class="form-input has-icon-right" :type="showPwd ? 'text' : 'password'"
                v-model="form.password" placeholder="••••••••"
                autocomplete="current-password" required />
              <button type="button" class="pwd-eye" @click="showPwd = !showPwd" :title="showPwd ? 'Ocultar' : 'Mostrar'">
                <svg v-if="!showPwd" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2"/><path d="M7.1 7.1C3.9 8.8 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/><path d="M14.2 6.3A10.8 10.8 0 0122 12s-.8 1.4-2.2 2.8"/></svg>
              </button>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger" style="margin-bottom:12px">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/>
            </svg>
            {{ error }}
          </div>

          <button class="btn btn-primary btn-block" type="submit"
            :class="{ loading }" :disabled="loading" style="height:44px;font-size:14px">
            {{ loading ? '' : 'Entrar no sistema' }}
          </button>
        </form>

        <template v-if="!branding.hideDemoCredentials">
          <div class="auth-divider"><span>contas de demonstração</span></div>

          <div class="demo-grid">
            <button v-for="d in demos" :key="d.role" class="demo-btn" @click="fillDemo(d)">
              <div class="demo-icon" :style="{ background: d.color }">{{ d.icon }}</div>
              <div>
                <div class="demo-label">{{ d.label }}</div>
                <div class="demo-email">{{ d.email }}</div>
              </div>
            </button>
          </div>
        </template>

        <p class="auth-footer-link">
          Não tem conta? <RouterLink to="/register">Criar conta</RouterLink>
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

const leftStyle = computed(() => ({
  background: `linear-gradient(145deg, #020917 0%, #0d1b3e 40%, ${branding.primaryColor}44 80%, #0d1117 100%)`
}))

const demos = [
  { label:'Super Admin',  role:'super_admin', email:'superadmin@mikrokredito.co.mz', password:'demo1234', color:'#1a6ff5', icon:'🛡' },
  { label:'Admin Banco',  role:'inst_admin',  email:'admin@bancooportunidade.co.mz', password:'demo1234', color:'#0891b2', icon:'🏦' },
  { label:'Cliente',      role:'client',      email:'maria@cliente.mz',              password:'demo1234', color:'#dc2626', icon:'👤' },
]

function fillDemo(d) { form.value.email = d.email; form.value.password = d.password }

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(form.value.email, form.value.password)
    toast.success(`Bem-vindo ao ${branding.name}!`)
    router.push(auth.defaultRoute)
  } catch (e) {
    error.value = e.response?.data?.message || 'Credenciais incorrectas.'
  } finally { loading.value = false }
}
</script>

<style scoped>
.auth-page { min-height:100vh; display:grid; grid-template-columns:400px 1fr; }

.auth-left {
  padding:44px 36px; display:flex; flex-direction:column;
  color:rgba(255,255,255,.92); position:relative; overflow:hidden;
}
.auth-left::after {
  content:''; position:absolute; right:-80px; top:-80px;
  width:300px; height:300px; border-radius:50%;
  background:rgba(26,111,245,.12); filter:blur(60px); pointer-events:none;
}
.auth-left::before {
  content:''; position:absolute; inset:0; z-index:0;
  background:repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(255,255,255,.01) 60px, rgba(255,255,255,.01) 61px);
}
.auth-logo { margin-bottom:20px; position:relative; z-index:1; }
.auth-logo-default {
  width:56px; height:56px; border-radius:14px;
  background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2);
  display:flex; align-items:center; justify-content:center;
}
.auth-brand { font-size:22px; font-weight:800; margin-bottom:5px; position:relative; z-index:1; letter-spacing:.3px; }
.auth-brand-sub { font-size:12px; opacity:.65; margin-bottom:20px; position:relative; z-index:1; }
.auth-policy {
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:8px;
  padding:10px 12px; font-size:11px; margin-bottom:20px; position:relative; z-index:1;
  line-height:1.6; display:flex; gap:8px;
}
.auth-features { display:flex; flex-direction:column; gap:11px; position:relative; z-index:1; flex:1; }
.auth-feature { display:flex; align-items:center; gap:10px; font-size:12px; }
.auth-feature-icon { width:18px; height:18px; border-radius:50%; background:rgba(255,255,255,.15); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.auth-feature-icon svg { width:10px; height:10px; }
.auth-powered { font-size:10px; opacity:.35; margin-top:28px; position:relative; z-index:1; }

.auth-right {
  background:var(--mk-surface-3); display:flex;
  align-items:center; justify-content:center; padding:32px 24px;
}
.auth-card {
  background:#ffffffe6;
  backdrop-filter:blur(20px);
  border:1px solid rgba(26,111,245,.15);
  border-radius:18px; padding:36px 32px 28px;
  width:100%; max-width:420px;
  box-shadow:0 0 40px rgba(0,123,255,.08), 0 20px 50px rgba(10,35,66,.16);
}
.auth-card-header { margin-bottom:24px; }
.auth-card-header h2 { font-size:20px; font-weight:700; margin-bottom:4px; color:var(--mk-text); }
.auth-card-header p  { font-size:12px; color:var(--mk-text-2); }
.auth-divider { position:relative; text-align:center; margin:18px 0; color:var(--mk-text-3); font-size:10px; text-transform:uppercase; letter-spacing:.5px; }
.auth-divider::before { content:''; position:absolute; top:50%; left:0; right:0; height:1px; background:rgba(148,163,184,.1); }
.auth-divider span { position:relative; background:#ffffffe6; padding:0 10px; }
.demo-grid { display:flex; flex-direction:column; gap:7px; margin-bottom:18px; }
.demo-btn { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:8px; border:1px solid rgba(10,35,66,.09); background:rgba(10,35,66,.02); cursor:pointer; transition:.15s; text-align:left; font-family:var(--mk-font); }
.demo-btn:hover { border-color:rgba(26,111,245,.3); background:rgba(26,111,245,.08); }
.demo-icon { width:30px; height:30px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
.demo-label { font-size:12px; font-weight:600; color:var(--mk-text); }
.demo-email { font-size:10px; color:var(--mk-text-2); }
.auth-footer-link { font-size:12px; text-align:center; color:var(--mk-text-2); }
.auth-footer-link a { color:var(--blue-400); font-weight:600; }

@media (max-width:768px) { .auth-page { grid-template-columns:1fr; } .auth-left { display:none; } }
</style>
