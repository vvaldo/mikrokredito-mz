<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>🔔 Centro de Notificações</h1>
      <p>Logs enviados, templates de mensagens e reenvio automático. Nome e link da app incluídos automaticamente.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="activeTab='logs'">Logs de envio</button>
        <button class="btn" @click="activeTab='templates'">Personalizar mensagens</button>
        <button class="btn btn-danger-soft" @click="retryFailed">Reenviar falhadas</button>
      </div>
    </section>

    <div class="notif-tabs">
      <button class="notif-tab" :class="{active:activeTab==='logs'}" @click="activeTab='logs'">
        📋 Logs de envio <span class="tab-count">{{ logs.length }}</span>
      </button>
      <button class="notif-tab" :class="{active:activeTab==='templates'}" @click="activeTab='templates'">
        ✏️ Templates de mensagens <span class="tab-count">{{ templates.length }}</span>
      </button>
      <button class="notif-tab" :class="{active:activeTab==='rules'}" @click="activeTab='rules'">
        ⚙️ Regras de envio
      </button>
    </div>

    <!-- ── LOGS TAB ── -->
    <template v-if="activeTab==='logs'">
      <div class="modern-card">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <input class="input" v-model="logSearch" placeholder="Pesquisar destinatário ou evento…" style="flex:1;min-width:180px">
          <select class="input" v-model="logStatus" style="width:140px">
            <option value="">Todos os estados</option>
            <option value="sent">Enviado</option>
            <option value="delivered">Entregue</option>
            <option value="failed">Falhado</option>
            <option value="queued">Em fila</option>
          </select>
          <select class="input" v-model="logChannel" style="width:120px">
            <option value="">Todos canais</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <table class="modern-table">
          <thead><tr><th>Data</th><th>Canal</th><th>Evento</th><th>Destinatário</th><th>Tentativas</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            <tr v-for="n in filteredLogs" :key="n.id">
              <td style="white-space:nowrap;font-size:11px">{{ dfmt(n.created_at) }}</td>
              <td><span class="ch-pill" :class="'ch-'+n.channel">{{ n.channel }}</span></td>
              <td style="font-size:11px;max-width:180px" class="truncate">{{ evLabel(n.event) }}</td>
              <td class="td-muted td-clamp">{{ n.recipient_email || n.recipient_phone || '—' }}</td>
              <td style="text-align:center;font-size:11px">{{ n.attempts }}/{{ n.max_attempts }}</td>
              <td>
                <span class="badge" :class="statusBadge(n.status)" style="font-size:10px">
                  {{ {sent:'Enviado',delivered:'Entregue',failed:'Falhado',queued:'Em fila',sending:'A enviar'}[n.status]||n.status }}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-xs btn-blue-soft" @click="viewLog(n)">Ver</button>
                  <button v-if="n.status==='failed'" class="btn btn-xs btn-danger-soft" @click="retrySingle(n)">↩</button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredLogs.length"><td colspan="7" style="text-align:center;padding:28px;color:var(--mk-text-2)">Sem registos encontrados.</td></tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── TEMPLATES TAB ── -->
    <template v-else-if="activeTab==='templates'">
      <div class="alert alert-info mb-4" style="font-size:12px">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6.5" cy="6.5" r="5.5"/><line x1="6.5" y1="5" x2="6.5" y2="8"/></svg>
        <div>
          Variáveis disponíveis: <strong>&#123;&#123;nome_cliente&#125;&#125;</strong>, <strong>&#123;&#123;valor&#125;&#125;</strong>, <strong>&#123;&#123;referencia&#125;&#125;</strong>,
          <strong>&#123;&#123;app_name&#125;&#125;</strong> (= {{ brand.name }}), <strong>&#123;&#123;app_url&#125;&#125;</strong>.
          Estas variáveis são substituídas automaticamente no envio.
        </div>
      </div>
      <div v-if="!templates.length && !tmplLoading" class="modern-card" style="text-align:center;padding:40px;color:var(--mk-text-2)">
        Sem templates. Clique em "+ Novo template" para criar.
        <button class="btn btn-primary" style="display:block;margin:16px auto 0" @click="openTmpl()">+ Novo template</button>
      </div>
      <div v-else class="modern-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:12px;color:var(--mk-text-2)">{{ templates.length }} templates</span>
          <button class="btn btn-primary btn-sm" @click="openTmpl()">+ Novo template</button>
        </div>
        <table class="modern-table">
          <thead><tr><th>Evento</th><th>Canal</th><th>Assunto</th><th>Pré-visualização</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in templates" :key="t.id">
              <td><span class="badge badge-blue" style="font-size:10px">{{ t.key }}</span></td>
              <td><span class="ch-pill" :class="'ch-'+t.channel">{{ t.channel }}</span></td>
              <td style="font-size:12px;max-width:200px" class="truncate">{{ t.subject || '—' }}</td>
              <td style="font-size:11px;color:var(--mk-text-2);max-width:260px" class="truncate">{{ stripHtml(t.body) }}</td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-xs btn-blue-soft" @click="openTmpl(t)">Editar</button>
                  <button class="btn btn-xs btn-danger-soft" @click="deleteTmpl(t)">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── RULES TAB ── -->
    <template v-else-if="activeTab==='rules'">
      <div class="modern-card">
        <p class="muted" style="margin-bottom:14px">Configure quais eventos enviam notificações e por que canal. Gravado na base de dados.</p>
        <table class="modern-table">
          <thead><tr><th>Evento</th><th>Email</th><th>SMS</th><th>WhatsApp</th><th>Activo</th></tr></thead>
          <tbody>
            <tr v-for="ev in eventKeys" :key="ev.k">
              <td style="font-size:12px;font-weight:500">{{ ev.label }}</td>
              <td><label class="toggle"><input type="checkbox" v-model="rulesByEvent[ev.k].email"><span class="toggle-track"/></label></td>
              <td><label class="toggle"><input type="checkbox" v-model="rulesByEvent[ev.k].sms"><span class="toggle-track"/></label></td>
              <td><label class="toggle"><input type="checkbox" v-model="rulesByEvent[ev.k].whatsapp"><span class="toggle-track"/></label></td>
              <td><label class="toggle"><input type="checkbox" v-model="rulesByEvent[ev.k].is_active"><span class="toggle-track"/></label></td>
            </tr>
          </tbody>
        </table>
        <button class="btn btn-primary" style="margin-top:14px" :disabled="savingRules" @click="saveRules">{{ savingRules ? 'A gravar...' : 'Guardar regras' }}</button>
      </div>
    </template>

    <!-- Log modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedLog" class="modal-overlay" @click.self="selectedLog=null">
          <div class="modal lg">
            <div class="modal-header">
              <h3 class="modal-title">Log: {{ evLabel(selectedLog.event) }}</h3>
              <button class="modal-close" @click="selectedLog=null">✕</button>
            </div>
            <div class="modal-body">
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                <span class="badge badge-blue" style="font-size:11px">{{ selectedLog.channel }}</span>
                <span class="badge" :class="statusBadge(selectedLog.status)" style="font-size:11px">{{ selectedLog.status }}</span>
                <span style="font-size:11px;color:var(--mk-text-2)">{{ dfmt(selectedLog.created_at) }}</span>
              </div>
              <div class="form-group"><label class="form-label">Destinatário</label><div style="font-size:12px">{{ selectedLog.recipient_email || selectedLog.recipient_phone }}</div></div>
              <div v-if="selectedLog.subject" class="form-group"><label class="form-label">Assunto</label><div style="font-size:12px">{{ selectedLog.subject }}</div></div>
              <div class="form-group"><label class="form-label">Conteúdo enviado</label>
                <div style="background:var(--mk-surface-2);border:1px solid var(--glass-border);border-radius:var(--mk-r);padding:12px;font-size:12px;line-height:1.7;max-height:200px;overflow-y:auto" v-html="selectedLog.body"></div>
              </div>
              <div v-if="selectedLog.error_message" class="alert alert-danger" style="font-size:11px;font-family:monospace">{{ selectedLog.error_message }}</div>
            </div>
            <div class="modal-footer"><button class="btn" @click="selectedLog=null">Fechar</button></div>
          </div>
        </div>
      </Transition>

      <!-- Template editor modal -->
      <Transition name="modal">
        <div v-if="tmplModal" class="modal-overlay" @click.self="tmplModal=false">
          <div class="modal lg">
            <div class="modal-header">
              <h3 class="modal-title">{{ editingTmpl.id ? 'Editar template' : 'Novo template' }}</h3>
              <button class="modal-close" @click="tmplModal=false">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Evento (key) <span class="req">*</span></label>
                  <select class="form-select" v-model="editingTmpl.key" required>
                    <option value="">Selecionar evento</option>
                    <option v-for="ev in eventKeys" :key="ev.k" :value="ev.k">{{ ev.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Canal <span class="req">*</span></label>
                  <select class="form-select" v-model="editingTmpl.channel" required>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>
              <div v-if="editingTmpl.channel==='email'" class="form-group">
                <label class="form-label">Assunto do email</label>
                <input class="form-input" v-model="editingTmpl.subject" :placeholder="'[' + brand.name + '] Assunto aqui'" />
              </div>
              <div class="form-group">
                <label class="form-label">Corpo da mensagem <span class="req">*</span></label>
                <textarea class="form-textarea" v-model="editingTmpl.body" rows="7"
                  :placeholder="editingTmpl.channel==='sms' ? 'Ex: {{app_name}}: Caro(a) {{nome_cliente}}, o seu pedido {{referencia}} foi aprovado.' : 'HTML ou texto. Use {{nome_cliente}}, {{valor}}, {{referencia}}, {{app_name}}, {{app_url}}'"></textarea>
                <p class="form-hint">Link automático: {{ brand.name }} · {{ appUrl }}</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn" @click="tmplModal=false">Cancelar</button>
              <button class="btn btn-primary" @click="saveTmpl" :class="{loading:tmplSaving}">
                {{ tmplSaving ? '' : '💾 Guardar template' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notifications'
import { useBrandingStore } from '@/stores/branding'
import { useToast } from 'vue-toastification'

const notif = useNotificationStore(), brand = useBrandingStore(), toast = useToast()
const activeTab  = ref('logs')
const logs       = ref([])
const templates  = ref([])
const tmplLoading= ref(false)
const tmplSaving = ref(false)
const tmplModal  = ref(false)
const editingTmpl= ref({})
const selectedLog= ref(null)
const logSearch  = ref('')
const logStatus  = ref('')
const logChannel = ref('')
const appUrl = window.location.origin

const filteredLogs = computed(() => logs.value.filter(n => {
  const s = logSearch.value.toLowerCase()
  const matchSearch = !s || (n.recipient_email||n.recipient_phone||n.event||'').toLowerCase().includes(s)
  const matchStatus = !logStatus.value || n.status === logStatus.value
  const matchCh     = !logChannel.value || n.channel === logChannel.value
  return matchSearch && matchStatus && matchCh
}))

const eventKeys = [
  { k:'loan_submitted',       label:'Pedido submetido' },
  { k:'loan_approved',        label:'Pedido aprovado' },
  { k:'loan_rejected',        label:'Pedido rejeitado' },
  { k:'loan_disbursed',       label:'Empréstimo desembolsado' },
  { k:'payment_received',     label:'Pagamento recebido' },
  { k:'payment_failed',       label:'Pagamento falhado' },
  { k:'payment_due_reminder', label:'Lembrete de vencimento' },
  { k:'kyc_approved',         label:'KYC aprovado' },
  { k:'kyc_rejected',         label:'KYC rejeitado' },
  { k:'client_registered',    label:'Cliente registado' },
  { k:'docs_requested',       label:'Documentos solicitados' },
]

const rulesByEvent = ref({})
const savingRules = ref(false)

function buildRulesView() {
  const map = {}
  for (const ev of eventKeys) {
    const existing = notif.rules.find(r => r.event === ev.k)
    map[ev.k] = existing
      ? {
          id: existing.id, event: ev.k,
          email: existing.channels.includes('email'), sms: existing.channels.includes('sms'), whatsapp: existing.channels.includes('whatsapp'),
          is_active: existing.is_active, notify_client: existing.notify_client, notify_agent: existing.notify_agent,
          notify_admin: existing.notify_admin, delay_minutes: existing.delay_minutes,
        }
      : { id: null, event: ev.k, email: false, sms: false, whatsapp: false, is_active: true, notify_client: true, notify_agent: false, notify_admin: false, delay_minutes: 0 }
  }
  rulesByEvent.value = map
}
buildRulesView() // valores por omissão antes do fetch, para o template nunca ver undefined

async function loadRules() { await notif.fetchRules(); buildRulesView() }

async function saveRules() {
  savingRules.value = true
  try {
    for (const ev of eventKeys) {
      const r = rulesByEvent.value[ev.k]
      const channels = [r.email && 'email', r.sms && 'sms', r.whatsapp && 'whatsapp'].filter(Boolean)
      if (!r.id && !channels.length) continue // nada por gravar para este evento
      await notif.saveRule({
        id: r.id, event: r.event, channels, is_active: r.is_active,
        notify_client: r.notify_client, notify_agent: r.notify_agent, notify_admin: r.notify_admin, delay_minutes: r.delay_minutes,
      })
    }
    toast.success('Regras guardadas na base de dados')
    await loadRules()
  } catch (e) { toast.error(e.response?.data?.message || 'Erro ao guardar regras') }
  finally { savingRules.value = false }
}

async function loadLogs()  { try { const {data}=await notif.fetchLogs({limit:200}) } catch(e){} logs.value = notif.logs }
async function loadTmpls() { tmplLoading.value=true; await notif.fetchTemplates(); templates.value=notif.templates; tmplLoading.value=false }

function openTmpl(t) {
  editingTmpl.value = t ? { ...t } : { key:'', channel:'email', subject:'', body:'' }
  tmplModal.value = true
}
async function saveTmpl() {
  if (!editingTmpl.value.key || !editingTmpl.value.channel || !editingTmpl.value.body) {
    toast.error('Preencha todos os campos obrigatórios'); return
  }
  tmplSaving.value = true
  try {
    await notif.saveTemplate(editingTmpl.value)
    toast.success('Template guardado')
    tmplModal.value = false
    await loadTmpls()
  } catch(e) { toast.error('Erro ao guardar') }
  finally { tmplSaving.value = false }
}
async function deleteTmpl(t) {
  if (!confirm(`Eliminar template "${t.key}" (${t.channel})?`)) return
  await notif.deleteTemplate(t.id)
  toast.success('Template eliminado')
  templates.value = templates.value.filter(x => x.id !== t.id)
}

async function retrySingle(n) { await notif.retrySingle(n.id); toast.success('Colocado em fila'); n.status='queued' }
async function retryFailed() { const r=await notif.retryFailed(); toast.success(r.message||'Reenviadas') }
function viewLog(n) { selectedLog.value = n }

const dfmt = d => d ? new Date(d).toLocaleString('pt-MZ') : '—'
const stripHtml = s => s?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||''
const statusBadge = s => ({sent:'badge-approved',delivered:'badge-approved',failed:'badge-rejected',queued:'badge-warning',sending:'badge-warning'}[s]||'badge-neutral')
const evLabel = ev => eventKeys.find(e=>e.k===ev)?.label || ev

onMounted(() => { loadLogs(); loadTmpls(); loadRules() })
</script>
