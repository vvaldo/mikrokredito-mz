<template>
  <div class="auth-page">
    <!-- Left panel — branding -->
    <div class="auth-left">
      <div class="auth-logo">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <rect width="52" height="52" rx="14" fill="white" opacity=".12"/>
          <path d="M26 10L38 17V31L26 38L14 31V17L26 10Z" fill="white" opacity=".9"/>
          <circle cx="26" cy="24" r="6.5" fill="#E24B4A"/>
        </svg>
      </div>
      <h1 class="auth-brand">MicroCredit SYSTEM</h1>
      <p class="auth-brand-sub">Sistema Integrado de Gestão de Microcrédito</p>

      <div class="auth-features">
        <div v-for="f in features" :key="f.label" class="auth-feature">
          <div class="auth-feature-icon">
            <svg viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2">
              <polyline points="2,7 6,11 12,3"/>
            </svg>
          </div>
          <span>{{ f.label }}</span>
        </div>
      </div>

      <p class="auth-powered">Powered by: OTECH - Open Technology (www.otech.co.mz)</p>
    </div>

    <!-- Right panel — form -->
    <div class="auth-right">
      <div class="auth-card">
        <div class="auth-card-header">
          <h2>Entrar na plataforma</h2>
          <p>Introduza as suas credenciais para aceder</p>
        </div>
        <div class="credit-policy">
          <strong>Condição de desembolso:</strong><br>
          Valores abaixo de 50.000 MZN podem ser desembolsados em menos de 24 horas, desde que todos os documentos obrigatórios estejam validados.
          De 51.000 a 100.000 MZN, o processo fica condicionado à formalização documental em cartório/escritório.
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
                <rect x="3" y="7" width="10" height="7" rx="1"/>
                <path d="M5 7V5a3 3 0 016 0v2"/>
              </svg>
              <input class="form-input" :type="showPwd ? 'text' : 'password'"
                v-model="form.password" placeholder="••••••••"
                autocomplete="current-password" required />
              <button type="button" class="pwd-eye" @click="showPwd = !showPwd" :aria-label="showPwd ? 'Ocultar senha' : 'Mostrar senha'">
                <svg v-if="!showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2"/><path d="M7.1 7.1C3.9 8.8 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/><path d="M14.2 6.3A10.8 10.8 0 0122 12s-.8 1.4-2.2 2.8"/></svg>
              </button>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger" style="margin-bottom:14px">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/>
              <circle cx="7" cy="10" r=".5" fill="currentColor"/>
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
          <button v-for="d in demos" :key="d.role"
            class="demo-btn" @click="fillDemo(d)">
            <div class="demo-icon" :style="{ background: d.color }">{{ d.icon }}</div>
            <div>
              <div class="demo-label">{{ d.label }}</div>
              <div class="demo-email">{{ d.email }}</div>
            </div>
          </button>
        </div>


        <p class="auth-footer-link">
          Não tem conta?
          <RouterLink to="/register">Criar conta gratuita</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const router = useRouter()
const auth   = useAuthStore()
const toast  = useToast()

const form    = ref({ email: '', password: '' })
const loading = ref(false)
const error   = ref('')
const showPwd = ref(false)
const forgotOpen = ref(false)
const resetTokenStep = ref(false)
const forgotLoading = ref(false)
const forgot = ref({ email: '', token: '', new_password: '' })

const defaultFeatures = [
  'Multi-tenant — isolamento por instituição',
  'Simulador com regra do 1/3 salarial',
  'Notificações via Email, SMS e WhatsApp',
  'Pagamentos M-Pesa e e-Mola integrados',
  'KYC e upload de documentos',
]
const branding = ref({})
const features = computed(() => {
  const custom = branding.value.login_features
  const list = Array.isArray(custom) ? custom : String(custom || '').split('\n').map(x => x.trim()).filter(Boolean)
  return (list.length ? list : defaultFeatures).map(label => ({ label }))
})
onMounted(() => {
  try { branding.value = JSON.parse(localStorage.getItem('tenantBranding') || '{}') } catch { branding.value = {} }
})

const demos = [
  { label: 'Super Admin',   role: 'super_admin', email: 'superadmin@mikrokredito.co.mz', password: 'demo1234', color: '#185FA5', icon: '🛡' },
  { label: 'Admin Banco',   role: 'inst_admin',  email: 'admin@bancooportunidade.co.mz', password: 'demo1234', color: '#185FA5', icon: '🏦' },
  { label: 'Cliente',       role: 'client',      email: 'maria@cliente.mz',              password: 'demo1234', color: '#A32D2D', icon: '👤' },
]

function fillDemo(d) {
  form.value.email    = d.email
  form.value.password = d.password
  forgot.value.email  = d.email
}

async function requestForgot() {
  forgotLoading.value = true
  try {
    await api.post('/auth/forgot-password', { email: forgot.value.email || form.value.email })
    resetTokenStep.value = true
    toast.success('Token enviado para o email informado')
  } catch (e) {
    toast.error(e.response?.data?.message || 'Erro ao enviar token')
  } finally { forgotLoading.value = false }
}

async function resetPassword() {
  forgotLoading.value = true
  try {
    await api.post('/auth/reset-password', forgot.value)
    toast.success('Senha redefinida. Entre com a nova senha.')
    form.value.email = forgot.value.email
    forgotOpen.value = false
    resetTokenStep.value = false
  } catch (e) {
    toast.error(e.response?.data?.message || 'Erro ao redefinir senha')
  } finally { forgotLoading.value = false }
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(form.value.email, form.value.password)
    toast.success(`Bem-vindo, ${auth.user?.full_name?.split(' ')[0]}!`)
    router.push(auth.defaultRoute)
  } catch (e) {
    error.value = e.response?.data?.message || 'Credenciais incorrectas. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 420px 1fr;
}

/* ── Left ── */
.auth-left {
  background: linear-gradient(160deg, var(--blue-700) 0%, var(--blue-600) 60%, #1a6db8 100%);
  padding: 48px 40px;
  display: flex; flex-direction: column;
  color: rgba(255,255,255,.92);
  position: relative; overflow: hidden;
}
.auth-left::after {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}
.auth-logo { margin-bottom: 20px; position: relative; z-index: 1; }
.auth-brand { font-size: 26px; font-weight: 600; margin-bottom: 6px; position: relative; z-index: 1; }
.auth-brand-sub { font-size: 13px; opacity: .7; margin-bottom: 40px; position: relative; z-index: 1; }

.auth-features { display: flex; flex-direction: column; gap: 14px; position: relative; z-index: 1; flex: 1; }
.auth-feature { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.auth-feature-icon {
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255,255,255,.18);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.auth-feature-icon svg { width: 10px; height: 10px; }
.auth-powered { font-size: 10px; opacity: .4; margin-top: 40px; position: relative; z-index: 1; }

/* ── Right ── */
.auth-right {
  background: var(--mk-surface-3);
  display: flex; align-items: center; justify-content: center;
  padding: 32px 24px;
}

.auth-card {
  background: var(--mk-surface);
  border: 0.5px solid var(--mk-border);
  border-radius: 16px;
  padding: 36px 32px 28px;
  width: 100%; max-width: 400px;
  box-shadow: 0 4px 24px rgba(0,0,0,.07);
}

.auth-card-header { margin-bottom: 24px; }
.auth-card-header h2 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.auth-card-header p  { font-size: 13px; color: var(--mk-text-2); }

.auth-divider {
  position: relative; text-align: center;
  margin: 20px 0; color: var(--mk-text-3); font-size: 11px;
}
.auth-divider::before {
  content: ''; position: absolute; top: 50%; left: 0; right: 0;
  height: 0.5px; background: var(--mk-border);
}
.auth-divider span {
  position: relative; background: var(--mk-surface); padding: 0 10px;
}

.demo-grid { display: flex; flex-direction: column; gap: 7px; margin-bottom: 20px; }
.demo-btn {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px;
  border: 0.5px solid var(--mk-border);
  background: var(--mk-surface); cursor: pointer;
  transition: border-color .12s, background .12s; text-align: left;
  font-family: var(--mk-font);
}
.demo-btn:hover { border-color: var(--blue-400); background: var(--blue-50); }
.demo-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.demo-label { font-size: 13px; font-weight: 500; color: var(--mk-text); }
.demo-email { font-size: 11px; color: var(--mk-text-2); }

.auth-footer-link { font-size: 12px; text-align: center; color: var(--mk-text-2); }
.auth-footer-link a { color: var(--blue-600); font-weight: 500; }
.auth-footer-link a:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .auth-page { grid-template-columns: 1fr; }
  .auth-left  { display: none; }
}
.credit-policy{margin:-8px 0 18px;padding:12px 14px;border-radius:14px;background:#E6F1FB;border:1px solid #B5D4F4;color:#062E55;font-size:12px;line-height:1.55}
.forgot-box{margin:16px 0 18px;padding:14px;border-radius:14px;border:1px solid var(--mk-border);background:var(--mk-surface-2)}
.pwd-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--mk-text-2);width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer}.pwd-eye:hover{background:var(--color-background-secondary)}.pwd-eye svg{width:18px;height:18px}.search-wrap .form-input{padding-right:44px}
</style>
