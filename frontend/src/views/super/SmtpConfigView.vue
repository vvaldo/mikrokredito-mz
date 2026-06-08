<template>
  <div class="content-inner">
    <div class="page-header">
      <div>
        <h1 class="page-title">Configurações SMTP</h1>
        <p class="page-sub">Teste e valide o servidor de email configurado no backend</p>
      </div>
    </div>

    <!-- Config display -->
    <div class="card mb-4">
      <div class="card-title">
        Configuração actual
        <button class="btn btn-sm" @click="loadConfig" :disabled="loading">Actualizar</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        <div v-for="(v,k) in displayConfig" :key="k" style="background:#f8fafc;border-radius:8px;padding:10px 12px">
          <div style="font-size:11px;color:#4a5568;margin-bottom:3px">{{ k }}</div>
          <div style="font-size:13px;font-weight:500;font-family:monospace">{{ v }}</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- Verify connection -->
      <div class="card">
        <div class="card-title">Validar ligação SMTP</div>
        <p style="font-size:13px;color:#4a5568;margin-bottom:16px">
          Testa a ligação ao servidor SMTP sem enviar email. Confirma autenticação e configurações de TLS.
        </p>
        <button class="btn btn-primary" @click="verify" :class="{ loading: verifying }" :disabled="verifying" style="width:100%;height:40px">
          {{ verifying ? '' : '✓ Validar ligação SMTP' }}
        </button>
        <div v-if="verifyResult" class="alert mt-3" :class="verifyResult.success ? 'alert-success' : 'alert-danger'">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <template v-if="verifyResult.success"><polyline points="2,7 6,11 12,3"/></template>
            <template v-else><circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/></template>
          </svg>
          <div>{{ verifyResult.message }}</div>
        </div>
      </div>

      <!-- Send test email -->
      <div class="card">
        <div class="card-title">Enviar email de teste</div>
        <div class="form-group">
          <label class="form-label">Destinatário <span style="color:red">*</span></label>
          <input class="form-input" type="email" v-model="form.to" placeholder="email@dominio.co.mz" required />
        </div>
        <div class="form-group">
          <label class="form-label">Assunto</label>
          <input class="form-input" v-model="form.subject" />
        </div>
        <div class="form-group">
          <label class="form-label">Mensagem</label>
          <textarea class="form-textarea" v-model="form.message" rows="4"></textarea>
        </div>
        <button class="btn btn-primary" @click="send" :class="{ loading: sending }" :disabled="sending" style="width:100%;height:40px">
          {{ sending ? '' : '📧 Enviar email de teste' }}
        </button>

        <div v-if="sendResult" class="alert mt-3" :class="sendResult.success ? 'alert-success' : 'alert-danger'">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <template v-if="sendResult.success"><polyline points="2,7 6,11 12,3"/></template>
            <template v-else><circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/></template>
          </svg>
          <div>
            <strong>{{ sendResult.message }}</strong>
            <div v-if="sendResult.data" style="font-size:11px;margin-top:6px;font-family:monospace;white-space:pre-wrap">{{ JSON.stringify(sendResult.data, null, 2) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Help -->
    <div class="card mt-4">
      <div class="card-title">Como configurar o SMTP</div>
      <p style="font-size:13px;color:#4a5568;margin-bottom:12px">Adicione as seguintes variáveis ao ficheiro <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">backend/.env</code>:</p>
      <div style="background:#1a202c;border-radius:8px;padding:16px;font-family:monospace;font-size:12px;color:#e2e8f0;line-height:1.8">
        SMTP_HOST=mail.otech.co.mz<br>
        SMTP_PORT=465<br>
        SMTP_SECURE=true<br>
        SMTP_USER=comercial@otech.co.mz<br>
        SMTP_PASS=sua_palavra_passe<br>
        EMAIL_FROM=noreply@mikrokredito.co.mz<br>
        EMAIL_FROM_NAME=MikroKrédito MZ
      </div>
      <p style="font-size:12px;color:#4a5568;margin-top:8px">Reinicie o backend após alterar o .env para as novas configurações surtirem efeito.</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const loading   = ref(false)
const verifying = ref(false)
const sending   = ref(false)
const config    = ref({})
const verifyResult = ref(null)
const sendResult   = ref(null)

const form = reactive({
  to: '',
  subject: 'Teste SMTP — MikroKrédito MZ',
  message: 'Este é um email de teste enviado pela página de configurações SMTP do MikroKrédito MZ.\n\nSe recebeu este email, o servidor SMTP está configurado correctamente.',
})

const displayConfig = computed(() => {
  const c = config.value
  if (!c.host) return { 'Status': 'Configuração não carregada' }
  return {
    'Servidor (host)': `${c.host}:${c.port}`,
    'SSL/TLS': c.secure ? 'Activo (porta 465)' : 'TLS (porta 587)',
    'Conta de envio': c.user || '—',
    'Palavra-passe': c.password || '(não definida)',
    'Remetente (From)': c.fromEmail || '—',
    'Nome remetente': c.fromName || '—',
    'Destino padrão': c.defaultTo || '—',
  }
})

async function loadConfig() {
  loading.value = true
  try {
    const { data } = await api.get('/smtp-test/config')
    config.value = data.data || {}
    if (config.value.defaultTo && !form.to) form.to = config.value.defaultTo
  } catch (e) {
    config.value = { host: 'Erro ao carregar configuração' }
  } finally { loading.value = false }
}

async function verify() {
  verifying.value = true
  verifyResult.value = null
  try {
    const { data } = await api.post('/smtp-test/verify')
    verifyResult.value = data
  } catch (e) {
    verifyResult.value = { success: false, message: e.response?.data?.message || e.message }
  } finally { verifying.value = false }
}

async function send() {
  if (!form.to) return
  sending.value = true
  sendResult.value = null
  try {
    const { data } = await api.post('/smtp-test/send', { to: form.to, subject: form.subject, message: form.message })
    sendResult.value = data
  } catch (e) {
    sendResult.value = { success: false, message: e.response?.data?.message || e.message }
  } finally { sending.value = false }
}

onMounted(loadConfig)
</script>
