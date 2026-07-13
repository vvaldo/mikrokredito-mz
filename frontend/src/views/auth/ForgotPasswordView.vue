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
        <template v-if="!sent">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:6px;color:var(--mk-text)">Recuperar palavra-passe</h2>
          <p style="font-size:13px;color:var(--mk-text-2);margin-bottom:24px">Introduza o seu email e enviaremos um link de recuperação.</p>
          <form @submit.prevent="submit">
            <div class="form-group">
              <label class="form-label">Email <span class="req">*</span></label>
              <div class="search-wrap">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l6 5 6-5"/><rect x="1" y="3" width="14" height="10" rx="2"/></svg>
                <input class="form-input" type="email" v-model="email" required placeholder="o_seu@email.com" autocomplete="email"/>
              </div>
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <button class="btn btn-primary btn-block" type="submit" :class="{loading}" :disabled="loading" style="height:44px;font-size:14px">
              {{ loading ? '' : '📧 Enviar link de recuperação' }}
            </button>
          </form>
        </template>
        <template v-else>
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:48px;margin-bottom:16px">✅</div>
            <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;color:var(--mk-text)">Email enviado!</h2>
            <p style="font-size:13px;color:var(--mk-text-2);line-height:1.7">
              Verifique a caixa de entrada de <strong style="color:var(--blue-400)">{{ email }}</strong> e clique no link para definir a nova palavra-passe.
            </p>
            <p style="font-size:12px;color:var(--mk-text-3);margin-top:8px">Se não receber em 5 minutos, verifique a pasta de spam.</p>
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
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/services/api'
import { useToast } from 'vue-toastification'
const toast=useToast(), email=ref(''), loading=ref(false), error=ref(''), sent=ref(false)
async function submit(){
  loading.value=true; error.value=''
  try{ await api.post('/auth/forgot-password',{email:email.value}); sent.value=true }
  catch(e){ error.value=e.response?.data?.message||'Erro ao enviar email.' }
  finally{ loading.value=false }
}
</script>
