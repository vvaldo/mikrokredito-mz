<template>
  <div class="smtp-page">
    <div class="smtp-card">
      <div class="smtp-header">
        <div>
          <p class="eyebrow">Ferramenta técnica</p>
          <h1>Teste SMTP</h1>
          <p>Valide o envio de email pelo servidor configurado no backend.</p>
        </div>
        <RouterLink to="/login" class="back-link">Voltar ao login</RouterLink>
      </div>

      <div class="config-box">
        <div class="config-item"><span>Servidor</span><strong>{{ config.host || '—' }}:{{ config.port || '—' }}</strong></div>
        <div class="config-item"><span>Conta</span><strong>{{ config.user || '—' }}</strong></div>
        <div class="config-item"><span>SSL/TLS</span><strong>{{ config.secure ? 'Activo' : 'Inactivo' }}</strong></div>
        <div class="config-item"><span>Remetente</span><strong>{{ config.fromEmail || '—' }}</strong></div>
      </div>

      <div class="actions-row">
        <button class="btn-secondary" @click="loadConfig" :disabled="loadingConfig">Actualizar configuração</button>
        <button class="btn-secondary" @click="verifySmtp" :disabled="verifying">{{ verifying ? 'A validar...' : 'Validar ligação SMTP' }}</button>
      </div>

      <form @submit.prevent="sendTest" class="test-form">
        <div class="form-group">
          <label>Email de destino</label>
          <input v-model="form.to" type="email" placeholder="destinatario@dominio.co.mz" required />
        </div>
        <div class="form-group">
          <label>Assunto</label>
          <input v-model="form.subject" type="text" required />
        </div>
        <div class="form-group">
          <label>Mensagem</label>
          <textarea v-model="form.message" rows="6" required></textarea>
        </div>

        <button class="btn-primary" type="submit" :disabled="sending">{{ sending ? 'A enviar...' : 'Enviar email de teste' }}</button>
      </form>

      <div v-if="result" :class="['result', result.success ? 'ok' : 'fail']">
        <strong>{{ result.success ? 'Sucesso' : 'Erro' }}</strong>
        <p>{{ result.message }}</p>
        <pre v-if="result.data">{{ result.data }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'

const config = reactive({})
const form = reactive({
  to: 'comercial@otech.co.mz',
  subject: 'Teste SMTP — MicroCredit SYSTEM / OTECH',
  message: 'Este é um teste de envio SMTP pela página técnica do MicroCredit SYSTEM.'
})

const loadingConfig = ref(false)
const verifying = ref(false)
const sending = ref(false)
const result = ref(null)

async function request(path, options = {}) {
  const response = await fetch(`/api/v1/smtp-test${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const payload = await response.json().catch(() => ({ success: false, message: 'Resposta inválida do servidor' }))
  if (!response.ok) throw payload
  return payload
}

async function loadConfig() {
  loadingConfig.value = true
  result.value = null
  try {
    const payload = await request('/config')
    Object.assign(config, payload.data || {})
    if (config.defaultTo) form.to = config.defaultTo
  } catch (e) {
    result.value = { success: false, message: e.message || 'Não foi possível carregar a configuração SMTP.' }
  } finally {
    loadingConfig.value = false
  }
}

async function verifySmtp() {
  verifying.value = true
  result.value = null
  try {
    result.value = await request('/verify', { method: 'POST', body: '{}' })
  } catch (e) {
    result.value = { success: false, message: e.message || 'Falha ao validar a ligação SMTP.', data: e }
  } finally {
    verifying.value = false
  }
}

async function sendTest() {
  sending.value = true
  result.value = null
  try {
    result.value = await request('/send', { method: 'POST', body: JSON.stringify(form) })
  } catch (e) {
    result.value = { success: false, message: e.message || 'Falha ao enviar email de teste.', data: e }
  } finally {
    sending.value = false
  }
}

onMounted(loadConfig)
</script>

<style scoped>
.smtp-page{min-height:100vh;background:linear-gradient(135deg,#E6F1FB 0%,#fff 58%,#FCEBEB 100%);padding:36px;display:flex;align-items:flex-start;justify-content:center;color:#172033}
.smtp-card{width:100%;max-width:850px;background:#fff;border:1px solid #dbe5f0;border-radius:22px;padding:28px;box-shadow:0 24px 80px rgba(12,68,124,.12)}
.smtp-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:22px}
.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:#A32D2D;font-size:11px;font-weight:700;margin:0 0 6px}
h1{font-size:28px;margin:0 0 6px;color:#0C447C}p{margin:0;color:#64748b;font-size:14px}.back-link{font-size:13px;color:#185FA5;text-decoration:none;font-weight:700;background:#E6F1FB;border:1px solid #B5D4F4;padding:9px 13px;border-radius:12px;white-space:nowrap}.config-box{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.config-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:13px}.config-item span{display:block;font-size:11px;color:#64748b;margin-bottom:4px}.config-item strong{font-size:13px;color:#172033;word-break:break-word}.actions-row{display:flex;gap:10px;margin-bottom:18px}.test-form{display:grid;gap:14px}.form-group label{display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px}input,textarea{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:12px 14px;font:inherit;color:#172033;outline:none}input:focus,textarea:focus{border-color:#185FA5;box-shadow:0 0 0 4px rgba(24,95,165,.12)}.btn-primary,.btn-secondary{border:0;border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer}.btn-primary{background:#185FA5;color:#fff}.btn-primary:hover{background:#0C447C}.btn-secondary{background:#FCEBEB;color:#791F1F;border:1px solid #F7C1C1}.btn-secondary:hover{background:#F7C1C1}button:disabled{opacity:.55;cursor:not-allowed}.result{margin-top:18px;padding:15px;border-radius:16px;border:1px solid}.result.ok{background:#ecfdf5;border-color:#bbf7d0;color:#166534}.result.fail{background:#fef2f2;border-color:#fecaca;color:#991b1b}.result p{color:inherit;margin-top:4px}.result pre{white-space:pre-wrap;background:rgba(255,255,255,.55);padding:10px;border-radius:12px;overflow:auto;font-size:12px}@media(max-width:800px){.smtp-page{padding:18px}.smtp-header{flex-direction:column}.config-box{grid-template-columns:1fr 1fr}.actions-row{flex-direction:column}}@media(max-width:520px){.config-box{grid-template-columns:1fr}}
</style>
