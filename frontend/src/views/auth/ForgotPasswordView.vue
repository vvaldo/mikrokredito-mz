<template>
  <div class="auth-page">
    <div class="auth-left">
      <div class="auth-logo">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect width="52" height="52" rx="14" fill="white" opacity=".12"/><path d="M26 10L38 17V31L26 38L14 31V17L26 10Z" fill="white" opacity=".9"/><circle cx="26" cy="24" r="6.5" fill="#E24B4A"/></svg>
      </div>
      <h1 class="auth-brand">MicroCredit SYSTEM</h1>
      <p class="auth-brand-sub">Sistema Integrado de Gestão de Microcrédito</p>
      <div class="auth-features">
        <div class="auth-feature"><span class="auth-feature-icon">✓</span><span>Recuperação segura com token temporário</span></div>
        <div class="auth-feature"><span class="auth-feature-icon">✓</span><span>Token enviado apenas para email registado</span></div>
        <div class="auth-feature"><span class="auth-feature-icon">✓</span><span>Auditoria do pedido de redefinição</span></div>
      </div>
      <p class="auth-powered">Powered by: OTECH - Open Technology (www.otech.co.mz)</p>
    </div>
    <div class="auth-right">
      <div class="auth-card">
        <div class="auth-card-header">
          <h2>Recuperar senha</h2>
          <p>Informe o email registado para receber o token de redefinição.</p>
        </div>

        <div v-if="!tokenStep">
          <div class="form-group">
            <label class="form-label">Email registado</label>
            <input class="form-input" type="email" v-model="form.email" placeholder="o_seu@email.com" autocomplete="email" />
          </div>
          <button class="btn btn-primary btn-block" :disabled="loading" @click="requestToken">
            {{ loading ? 'A verificar...' : 'Enviar token' }}
          </button>
        </div>

        <div v-else>
          <div class="alert alert-info" style="margin-bottom:14px">Token enviado para o email registado.</div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" v-model="form.email" readonly />
          </div>
          <div class="form-group">
            <label class="form-label">Token</label>
            <input class="form-input" v-model="form.token" placeholder="token" autocomplete="one-time-code" />
          </div>
          <div class="form-group password-field">
            <label class="form-label">Nova senha</label>
            <input class="form-input" :type="showPwd ? 'text' : 'password'" v-model="form.new_password" placeholder="Nova senha" />
            <button type="button" class="pwd-eye" @click="showPwd = !showPwd">{{ showPwd ? 'Ocultar' : 'Mostrar' }}</button>
          </div>
          <button class="btn btn-primary btn-block" :disabled="loading" @click="resetPassword">
            {{ loading ? 'A redefinir...' : 'Redefinir senha' }}
          </button>
        </div>

        <p class="auth-footer-link"><RouterLink to="/login">Voltar ao login</RouterLink></p>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/services/api'
const router = useRouter(); const toast = useToast(); const loading = ref(false); const tokenStep = ref(false); const showPwd = ref(false)
const form = ref({ email:'', token:'', new_password:'' })
async function requestToken(){
  loading.value=true
  try{ await api.post('/auth/forgot-password',{ email: form.value.email }); tokenStep.value=true; toast.success('Token enviado para o email registado.') }
  catch(e){ toast.error(e.response?.data?.message || 'Email não encontrado ou erro de envio.') }
  finally{ loading.value=false }
}
async function resetPassword(){
  loading.value=true
  try{ await api.post('/auth/reset-password', form.value); toast.success('Senha redefinida. Entre com a nova senha.'); router.push('/login') }
  catch(e){ toast.error(e.response?.data?.message || 'Erro ao redefinir senha') }
  finally{ loading.value=false }
}
</script>
<style scoped>
.auth-page{min-height:100vh;display:grid;grid-template-columns:420px 1fr}.auth-left{background:linear-gradient(160deg,var(--blue-700) 0%,var(--blue-600) 60%,#1a6db8 100%);padding:48px 40px;display:flex;flex-direction:column;color:rgba(255,255,255,.92)}.auth-logo{margin-bottom:20px}.auth-brand{font-size:26px;font-weight:600;margin-bottom:6px}.auth-brand-sub{font-size:13px;opacity:.7;margin-bottom:40px}.auth-features{display:flex;flex-direction:column;gap:14px;flex:1}.auth-feature{display:flex;align-items:center;gap:12px;font-size:13px}.auth-feature-icon{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}.auth-powered{font-size:11px;opacity:.65}.auth-right{display:flex;align-items:center;justify-content:center;background:var(--mk-surface-3);padding:40px}.auth-card{width:min(440px,92vw);background:var(--color-background-primary,#fff);border:1px solid var(--color-border-tertiary,#e2e8f0);border-radius:24px;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.12)}.auth-card-header h2{font-size:22px;margin-bottom:4px}.auth-card-header p{color:var(--color-text-secondary);margin-bottom:22px}.password-field{position:relative}.pwd-eye{position:absolute;right:8px;bottom:7px;border:0;background:transparent;color:var(--blue-600);font-size:12px;cursor:pointer;padding:6px 8px;border-radius:8px}.pwd-eye:hover{background:var(--color-background-secondary)}
</style>
