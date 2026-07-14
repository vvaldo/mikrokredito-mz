<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>WhatsApp</h1>
      <p>Sessão do WhatsApp Web para envio automático de notificações (sem API oficial da Meta).</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="refresh" :disabled="loading">Actualizar estado</button>
        <button v-if="canConnect" class="btn btn-blue-soft" @click="connect" :disabled="connecting">{{ connecting ? 'A ligar...' : 'Ligar WhatsApp' }}</button>
        <button v-if="canLogout" class="btn btn-danger-soft" @click="logout" :disabled="loggingOut">{{ loggingOut ? 'A terminar...' : 'Terminar sessão' }}</button>
      </div>
    </section>

    <div class="modern-card mb-4">
      <h2>Estado da sessão</h2>
      <div class="detail-grid">
        <div><span class="muted">Estado</span><strong :style="statusColor">{{ statusLabel }}</strong></div>
        <div v-if="status.info?.number"><span class="muted">Número ligado</span><strong>+{{ status.info.number }}</strong></div>
        <div v-if="status.info?.pushname"><span class="muted">Nome</span><strong>{{ status.info.pushname }}</strong></div>
        <div v-if="status.error"><span class="muted">Último erro</span><strong style="color:var(--erp-red)">{{ status.error }}</strong></div>
      </div>
    </div>

    <div v-if="status.status === 'qr' && status.qr" class="modern-card mb-4">
      <h2>Ler código QR</h2>
      <p class="muted">No telemóvel: WhatsApp → Definições → Dispositivos ligados → Ligar dispositivo. Aponte a câmara para o código abaixo.</p>
      <div style="display:flex;justify-content:center;padding:16px">
        <img :src="status.qr" alt="QR code WhatsApp" style="width:260px;height:260px;border:1px solid var(--mk-border);border-radius:var(--mk-r)" />
      </div>
    </div>

    <div class="modern-card">
      <h2>Enviar mensagem de teste</h2>
      <p class="muted">Disponível apenas quando a sessão estiver "Pronto".</p>
      <div class="form-grid">
        <input class="input" v-model="test.to" placeholder="Nº de telefone (ex: +258840000000)" :disabled="status.status !== 'ready'" />
        <input class="input" v-model="test.message" placeholder="Mensagem de teste" :disabled="status.status !== 'ready'" />
      </div>
      <button class="btn btn-primary" style="margin-top:10px" :disabled="status.status !== 'ready' || sending" @click="sendTest">{{ sending ? 'A enviar...' : 'Enviar teste' }}</button>
      <div v-if="result" :class="result.success ? 'alert alert-success' : 'alert alert-danger'" style="margin-top:12px">{{ result.message }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const toast = useToast()
const loading = ref(false)
const connecting = ref(false)
const loggingOut = ref(false)
const sending = ref(false)
const result = ref(null)
const status = ref({ status: 'idle', qr: null, error: null, info: null })
const test = ref({ to: '', message: 'MicroCredit SYSTEM: mensagem de teste via WhatsApp.' })

const labels = {
  idle: 'Desligado', initializing: 'A iniciar sessão...', qr: 'Aguarda leitura do código QR',
  authenticated: 'Autenticado, a preparar...', ready: 'Pronto', disconnected: 'Sessão terminada', auth_failure: 'Falha de autenticação',
}
const statusLabel = computed(() => labels[status.value.status] || status.value.status)
const statusColor = computed(() => {
  if (status.value.status === 'ready') return { color: 'var(--erp-blue)' }
  if (['auth_failure', 'disconnected'].includes(status.value.status)) return { color: 'var(--erp-red)' }
  return {}
})
const canConnect = computed(() => ['idle', 'disconnected', 'auth_failure'].includes(status.value.status))
const canLogout = computed(() => ['qr', 'authenticated', 'ready', 'initializing'].includes(status.value.status))

async function refresh() {
  loading.value = true
  try { const { data } = await api.get('/whatsapp/status'); status.value = data.data } catch (e) {}
  finally { loading.value = false }
}

async function connect() {
  connecting.value = true
  try { await api.post('/whatsapp/connect'); toast.info('A iniciar sessão do WhatsApp...'); await refresh() }
  catch (e) { toast.error(e.response?.data?.message || 'Erro ao ligar WhatsApp') }
  finally { connecting.value = false }
}

async function logout() {
  loggingOut.value = true
  try { await api.post('/whatsapp/logout'); toast.success('Sessão terminada'); await refresh() }
  catch (e) { toast.error(e.response?.data?.message || 'Erro ao terminar sessão') }
  finally { loggingOut.value = false }
}

async function sendTest() {
  sending.value = true
  result.value = null
  try {
    const { data } = await api.post('/whatsapp/test', test.value)
    result.value = { success: true, message: data.message || 'Mensagem enviada com sucesso.' }
  } catch (e) {
    result.value = { success: false, message: e.response?.data?.message || 'Erro ao enviar mensagem de teste.' }
  } finally { sending.value = false }
}

let timer
onMounted(() => { refresh(); timer = setInterval(refresh, 4000) })
onUnmounted(() => clearInterval(timer))
</script>
