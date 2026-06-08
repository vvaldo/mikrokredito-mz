<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Dashboard do Cliente</h1>
      <p>Acompanhe apenas pedidos, notificações e prestações associados ao seu perfil autenticado.</p>
      <div class="hero-actions"><RouterLink class="btn btn-primary" to="/client/apply">Novo pedido</RouterLink><RouterLink class="btn" to="/client/profile">Editar perfil</RouterLink><span class="hero-chip">{{ unread }} notificações não lidas</span></div>
    </section>
    <div v-if="loading" class="modern-card"><p class="muted">A carregar os seus dados...</p></div>
    <template v-else>
      <div class="kpi-grid">
        <div class="kpi warn"><div class="label">Pedido pendente</div><div class="value">{{ pendingCount }}</div><div class="note">Submetido/em análise/documentos</div></div>
        <div class="kpi good"><div class="label">Pedido finalizado</div><div class="value">{{ finishedCount }}</div><div class="note">Rejeitado/desembolsado/cancelado</div></div>
        <div class="kpi danger"><div class="label">Notificações</div><div class="value">{{ unread }}</div><div class="note">Não lidas</div></div>
        <div class="kpi"><div class="label">Próxima prestação</div><div class="value">{{ nextDue ? mzn(nextDue.total_due) : '—' }}</div><div class="note">{{ nextDue ? date(nextDue.due_date) : 'Sem prestação activa' }}</div></div>
      </div>

      <div class="modern-grid-2">
        <div class="modern-card">
          <h2>Seus pedidos</h2><p class="muted">Mostra somente pedidos associados ao seu perfil.</p>
          <div v-if="applications.length === 0" class="notice">Ainda não tem pedidos. Use “Novo pedido” para simular e submeter.</div>
          <table v-else class="modern-table"><thead><tr><th>Ref.</th><th>Produto</th><th>Valor</th><th>Estado</th><th>Acção</th></tr></thead><tbody><tr v-for="r in applications" :key="r.id"><td><strong>{{ r.reference }}</strong></td><td>{{ r.CreditProduct?.name || 'Produto' }}</td><td>{{ mzn(r.requested_amount) }}</td><td><span :class="statusClass(r.status)">{{ statusLabel(r.status, r.Loan) }}</span></td><td><button class="btn btn-sm" @click="openRequest(r)">Visualizar</button></td></tr></tbody></table>
        </div>
        <div class="modern-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h2>Notificações</h2><p class="muted">A contagem também aparece no ícone superior.</p></div><button class="btn btn-sm" @click="showAllNotifications=!showAllNotifications">{{ showAllNotifications ? 'Ocultar' : 'Expandir' }}</button></div>
          <div v-if="notifications.length===0" class="notice">Sem notificações para este cliente.</div>
          <button v-for="n in visibleNotifications" :key="n.id" class="notif-card" @click="openNotification(n)">
            <div><strong>{{ n.subject || eventLabel(n.event) }}</strong><p class="muted" style="margin:2px 0 0" v-html="shortBody(n.body)"></p></div><span :class="n.read_at ? 'status-pill st-approved' : 'status-pill st-rejected'">{{ n.read_at ? 'Lida' : 'Nova' }}</span>
          </button>
        </div>
      </div>

      <div class="modern-card" v-if="activeLoan">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <button class="btn" :disabled="loanIndex===0" @click="loanIndex--">‹</button>
          <div style="flex:1"><h2>Prestações do empréstimo {{ activeLoan.application?.reference || activeLoan.id }}</h2><p class="muted">Use as setas para navegar entre empréstimos. Pode expandir todas as prestações.</p></div>
          <button class="btn" :disabled="loanIndex>=loans.length-1" @click="loanIndex++">›</button>
          <button class="btn" @click="showPayments = !showPayments">{{ showPayments ? 'Ocultar' : 'Expandir prestações' }}</button>
        </div>
        <div class="grid-3" style="gap:8px;margin:12px 0"><div class="stat-card"><div class="stat-value">{{ mzn(activeLoan.principal) }}</div><div class="stat-label">Valor aprovado</div></div><div class="stat-card"><div class="stat-value">{{ activeLoan.installments_paid || 0 }}/{{ activeLoan.PaymentSchedules?.length || activeLoan.installments_total || 0 }}</div><div class="stat-label">Pagas</div></div><div class="stat-card"><div class="stat-value">{{ mzn(activeLoan.outstanding_balance) }}</div><div class="stat-label">Saldo por pagar</div></div></div>
        <table v-if="showPayments" class="modern-table"><thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Estado</th></tr></thead><tbody><tr v-for="p in activeLoan.PaymentSchedules" :key="p.id"><td>{{ p.installment_number }}</td><td>{{ date(p.due_date) }}</td><td>{{ mzn(p.total_due) }}</td><td>{{ mzn(p.total_paid) }}</td><td><span :class="paymentClass(p.status)">{{ paymentLabel(p.status) }}</span></td></tr></tbody></table>
      </div>
    </template>

    <div v-if="selected" class="modal-backdrop" @click.self="selected=null">
      <div class="mk-modal large"><div class="mk-modal-head"><h2>{{ selected.reference || selected.subject }}</h2><button class="modal-x" @click="selected=null">×</button></div>
        <div v-if="selected.reference">
          <div class="grid-3" style="gap:8px"><div class="stat-card"><div class="stat-label">Estado actual</div><div class="stat-value">{{ statusLabel(selected.status, selected.Loan) }}</div></div><div class="stat-card"><div class="stat-label">Aprovado em</div><div class="stat-value">{{ selected.reviewed_at ? date(selected.reviewed_at) : '—' }}</div></div><div class="stat-card"><div class="stat-label">Desembolsado em</div><div class="stat-value">{{ selected.disbursed_at ? date(selected.disbursed_at) : '—' }}</div></div></div>
          <p class="notice" style="margin-top:12px">Estado actual: <strong>{{ statusLabel(selected.status, selected.Loan) }}</strong>. {{ statusExplanation(selected) }}</p>
          <h3>Documentos</h3><div v-if="!(selected.Documents||[]).length" class="muted">Sem documentos associados.</div>
          <div v-for="d in selected.Documents||[]" :key="d.id" class="doc-row"><div><strong>{{ docLabel(d.type) }}</strong><p class="muted">{{ d.original_name || d.file_name }}</p></div><button class="btn" @click="downloadDoc(d)">Baixar</button></div>
        </div>
        <div v-else><p v-html="selected.body"></p></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useToast } from 'vue-toastification'
import api, { downloadDocument } from '@/services/api'
const emit = defineEmits(['notifications-read'])
const toast = useToast(); const showPayments = ref(false); const showAllNotifications = ref(false); const loading = ref(true); const data = ref({}); const applications=ref([]); const notifications=ref([]); const loans=ref([]); const loanIndex=ref(0); const selected=ref(null)
const unread = computed(()=>notifications.value.filter(n=>!n.read_at).length)
const pendingCount = computed(()=>data.value.pending_count || 0)
const finishedCount = computed(()=>data.value.finished_count || 0)
const nextDue = computed(()=>data.value.next_due)
const activeLoan = computed(()=>loans.value[loanIndex.value] || null)
const visibleNotifications = computed(()=>showAllNotifications.value ? notifications.value : notifications.value.slice(0,3))
function mzn(v){return Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})}
function date(v){return v?new Date(v).toLocaleDateString('pt-MZ'):'—'}
function statusLabel(s, loan){ if(s==='disbursed' && loan) return 'Aprovado & desembolsado'; return {submitted:'Submetido',under_review:'Em análise',docs_requested:'Documentos solicitados',approved:'Aprovado',rejected:'Desaprovado',disbursed:'Aprovado & desembolsado',cancelled:'Cancelado',draft:'Rascunho'}[s]||s}
function statusClass(s){return 'status-pill '+(['approved','disbursed'].includes(s)?'st-approved':s==='rejected'?'st-rejected':'st-under_review')}
function paymentLabel(s){return {pending:'Por pagar',partial:'Parcial',paid:'Paga',overdue:'Em atraso'}[s]||s}
function paymentClass(s){return s==='paid'?'status-pill st-approved':s==='overdue'?'status-pill st-rejected':'status-pill st-under_review'}
function eventLabel(e){return String(e||'Notificação').replaceAll('_',' ')}
function shortBody(b){return String(b||'').replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').slice(0,130)}
function statusExplanation(app){ if(app.status==='submitted') return 'Foi recebido pelo Gestor.'; if(app.status==='under_review') return 'Está em validação pelo banco.'; if(app.status==='approved') return 'Aguarda desembolso.'; if(app.status==='disbursed') return 'Activo e desembolsado.'; if(app.status==='rejected') return 'Pedido finalizado sem aprovação.'; return 'Foi recebido pelo banco.' }
function docLabel(t){return {bi:'BI',nuit:'NUIT',residence_certificate:'Atestado de residência',bank_statement:'Extracto bancário',income_proof:'Folha salarial'}[t]||t}
function openRequest(r){selected.value=r}
async function openNotification(n){ try{ await api.post(`/notifications/${n.id}/read`); n.read_at = new Date().toISOString(); emit('notifications-read'); selected.value=n }catch(e){ toast.error(e.response?.data?.message||'Erro ao marcar notificação') } }
async function downloadDoc(d){ await downloadDocument(d.id, d.original_name || d.file_name || 'documento') }
async function load(){loading.value=true; try{ const res=await api.get('/dashboard/client'); data.value=res.data.data||{}; applications.value=data.value.applications||[]; notifications.value=data.value.notifications||[]; loans.value=applications.value.filter(a=>a.Loan).map(a=>({...a.Loan, application:a, PaymentSchedules:a.Loan?.PaymentSchedules||[]})); }catch(e){toast.error(e.response?.data?.message||'Erro ao carregar dashboard')}finally{loading.value=false}}
onMounted(load)
</script>
<style scoped>.notif-card{display:flex;justify-content:space-between;gap:10px;border:0;border-bottom:1px solid var(--color-border-tertiary);padding:10px 0;background:transparent;width:100%;text-align:left;color:inherit;cursor:pointer}.notif-card:hover{background:var(--color-background-secondary)}.doc-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--color-border-tertiary);padding:10px 0}.large{max-width:900px;width:min(92vw,900px)}</style>
