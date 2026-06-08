<template>
  <div class="auth-page">
    <div class="auth-left">
      <div class="auth-logo">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <rect width="52" height="52" rx="14" fill="white" opacity=".12"/>
          <path d="M26 10L38 17V31L26 38L14 31V17L26 10Z" fill="white" opacity=".9"/>
          <circle cx="26" cy="24" r="6.5" fill="#E24B4A"/>
        </svg>
      </div>
      <h1 class="auth-brand">MicroCredit SYSTEM</h1>
      <p class="auth-brand-sub">Crie a sua conta em menos de 2 minutos</p>
      <div class="auth-steps">
        <div v-for="(s,i) in steps" :key="i" class="auth-step">
          <div class="auth-step-num">{{ i + 1 }}</div>
          <span>{{ s }}</span>
        </div>
      </div>
    </div>

    <div class="auth-right">
      <div class="auth-card">
        <div class="auth-card-header">
          <h2>Criar conta</h2>
          <p>Preencha os dados para se registar</p>
        </div>

        <form @submit.prevent="submit">
          <div class="form-group">
            <label class="form-label">Nome completo <span class="req">*</span></label>
            <input class="form-input" v-model="form.full_name" required placeholder="Maria da Graça Sitoe" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email <span class="req">*</span></label>
              <input class="form-input" type="email" v-model="form.email" required placeholder="o_seu@email.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Telefone <span class="req">*</span></label>
              <input class="form-input" v-model="form.phone" required placeholder="+258 84 000 0000" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Palavra-passe <span class="req">*</span></label>
            <input class="form-input" type="password" v-model="form.password" minlength="6" required placeholder="Mínimo 6 caracteres" />
          </div>

          <div v-if="error" class="alert alert-danger">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/>
            </svg>
            {{ error }}
          </div>

          <button class="btn btn-primary btn-block" type="submit" :class="{ loading }" :disabled="loading" style="height:42px;margin-top:4px">
            {{ loading ? '' : 'Criar conta' }}
          </button>
        </form>

        <p class="auth-footer-link" style="margin-top:16px">
          Já tem conta? <RouterLink to="/login">Entrar</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

const router = useRouter()
const auth   = useAuthStore()
const toast  = useToast()

const form    = ref({ full_name: '', email: '', phone: '', password: '' })
const loading = ref(false)
const error   = ref('')

const steps = ['Preencha os seus dados', 'Verifique o seu email', 'Complete o KYC', 'Solicite o seu crédito']

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(form.value)
    toast.success('Conta criada! Verifique o seu email.')
    router.push('/login')
  } catch (e) {
    error.value = e.response?.data?.message || 'Erro ao criar conta.'
  } finally { loading.value = false }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: grid; grid-template-columns: 380px 1fr; }
.auth-left {
  background: linear-gradient(160deg, var(--blue-700) 0%, var(--blue-600) 60%, #1a6db8 100%);
  padding: 48px 36px; display: flex; flex-direction: column; color: rgba(255,255,255,.92);
}
.auth-logo { margin-bottom: 18px; }
.auth-brand { font-size: 24px; font-weight: 600; margin-bottom: 6px; }
.auth-brand-sub { font-size: 13px; opacity: .7; margin-bottom: 36px; }
.auth-steps { display: flex; flex-direction: column; gap: 16px; }
.auth-step  { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.auth-step-num {
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; flex-shrink: 0;
}
.auth-right {
  background: var(--mk-surface-3);
  display: flex; align-items: center; justify-content: center; padding: 32px 24px;
}
.auth-card {
  background: var(--mk-surface); border: 0.5px solid var(--mk-border); border-radius: 16px;
  padding: 36px 32px 28px; width: 100%; max-width: 440px;
  box-shadow: 0 4px 24px rgba(0,0,0,.07);
}
.auth-card-header { margin-bottom: 24px; }
.auth-card-header h2 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.auth-card-header p  { font-size: 13px; color: var(--mk-text-2); }
.auth-footer-link { font-size: 12px; text-align: center; color: var(--mk-text-2); }
.auth-footer-link a { color: var(--blue-600); font-weight: 500; }
.req { color: var(--red-600); margin-left: 2px; }
@media (max-width: 768px) { .auth-page { grid-template-columns: 1fr; } .auth-left { display: none; } }
</style>
