<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--mk-surface-3);padding:20px">
    <div style="width:100%;max-width:420px">
      <!-- Logo -->
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:52px;height:52px;border-radius:14px;background:var(--grad-primary);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;box-shadow:var(--glow-blue)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M12 2L20 7V16L12 21L4 16V7L12 2Z"/><circle cx="12" cy="11.5" r="3.5" fill="white" stroke="none"/></svg>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--blue-400);letter-spacing:.5px;text-transform:uppercase">SIGEM-MICROCREDITO</div>
      </div>

      <div style="background:#ffffffe6;backdrop-filter:blur(20px);border:1px solid rgba(26,111,245,.15);border-radius:18px;padding:36px 32px 28px;box-shadow:0 0 40px rgba(0,123,255,.08), 0 20px 50px rgba(10,35,66,.16)">
        <template v-if="step==='request'">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:6px;color:var(--mk-text)">Recuperar palavra-passe</h2>
          <p style="font-size:13px;color:var(--mk-text-2);margin-bottom:24px">Introduza o seu email e enviaremos um token de confirmação.</p>
          <form @submit.prevent="submitRequest">
            <div class="form-group">
              <label class="form-label">Email <span class="req">*</span></label>
              <div class="search-wrap">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l6 5 6-5"/><rect x="1" y="3" width="14" height="10" rx="2"/></svg>
                <input class="form-input" type="email" v-model="email" required placeholder="o_seu@email.com" autocomplete="email"/>
              </div>
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <button class="btn btn-primary btn-block" type="submit" :class="{loading}" :disabled="loading" style="height:44px;font-size:14px">
              {{ loading ? '' : '📧 Enviar token' }}
            </button>
          </form>
        </template>

        <template v-else-if="step==='confirm'">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:6px;color:var(--mk-text)">Confirmar token</h2>
          <p style="font-size:13px;color:var(--mk-text-2);margin-bottom:24px">
            Enviámos um token para <strong style="color:var(--blue-600)">{{ email }}</strong>. Introduza-o abaixo com a nova palavra-passe.
          </p>
          <form @submit.prevent="submitReset">
            <div class="form-group">
              <label class="form-label">Token <span class="req">*</span></label>
              <input class="form-input" v-model="token" required minlength="6" maxlength="12" placeholder="Código recebido por email"/>
            </div>
            <div class="form-group">
              <label class="form-label">Nova palavra-passe <span class="req">*</span></label>
              <input class="form-input" type="password" v-model="newPassword" required minlength="6" placeholder="Mínimo 6 caracteres"/>
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar nova palavra-passe <span class="req">*</span></label>
              <input class="form-input" type="password" v-model="confirmPassword" required placeholder="Repita a palavra-passe"/>
              <p v-if="pwdMismatch" class="form-error">As palavras-passe não coincidem</p>
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <button class="btn btn-primary btn-block" type="submit" :class="{loading}" :disabled="loading || pwdMismatch" style="height:44px;font-size:14px">
              {{ loading ? '' : '✓ Redefinir palavra-passe' }}
            </button>
          </form>
          <div style="text-align:center;margin-top:14px">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="loading" @click="submitRequest">Reenviar token</button>
          </div>
        </template>

        <template v-else>
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:48px;margin-bottom:16px">✅</div>
            <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;color:var(--mk-text)">Palavra-passe redefinida!</h2>
            <p style="font-size:13px;color:var(--mk-text-2);line-height:1.7">
              A sua palavra-passe foi alterada com sucesso. Já pode entrar com a nova palavra-passe.
            </p>
          </div>
        </template>
        <div style="text-align:center;margin-top:20px">
          <RouterLink to="/login" style="font-size:12px;color:var(--blue-400);font-weight:500">← Voltar ao login</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/services/api'
import { useToast } from 'vue-toastification'
const toast=useToast()
const email=ref(''), token=ref(''), newPassword=ref(''), confirmPassword=ref('')
const loading=ref(false), error=ref(''), step=ref('request')
const pwdMismatch = computed(() => confirmPassword.value && newPassword.value !== confirmPassword.value)

async function submitRequest(){
  loading.value=true; error.value=''
  try{
    await api.post('/auth/forgot-password',{email:email.value})
    toast.success('Token enviado para o seu email.')
    step.value='confirm'
  }
  catch(e){ error.value=e.response?.data?.message||'Erro ao enviar email.' }
  finally{ loading.value=false }
}
async function submitReset(){
  if(pwdMismatch.value) return
  loading.value=true; error.value=''
  try{
    await api.post('/auth/reset-password',{email:email.value, token:token.value, new_password:newPassword.value})
    step.value='done'
  }
  catch(e){ error.value=e.response?.data?.message||'Erro ao redefinir palavra-passe.' }
  finally{ loading.value=false }
}
</script>
