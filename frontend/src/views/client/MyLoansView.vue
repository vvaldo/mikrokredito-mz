<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Meus empréstimos</h1>
      <p>Pedidos recentes e empréstimos do cliente autenticado, com detalhes, documentos e prestações.</p>
    </section>

    <div v-if="loading" class="modern-card"><p class="muted">A carregar...</p></div>
    <div v-else-if="apps.length === 0" class="modern-card">
      <h2>Sem pedidos recentes</h2>
      <p class="muted">Ainda não submeteu pedidos de crédito.</p>
    </div>

    <div v-for="app in apps" :key="app.id" class="modern-card" style="border-left:4px solid var(--mk-blue,#185FA5)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div>
          <h2>{{ app.reference }} — {{ app.CreditProduct?.name || 'Produto' }}</h2>
          <p class="muted">{{ mzn(app.requested_amount) }} · submetido em {{ date(app.created_at) }}</p>
        </div>
        <span :class="statusClass(app.status)">{{ statusLabel(app.status, app.Loan) }}</span>
      </div>

      <div class="grid-3" style="gap:8px;margin:12px 0">
        <div class="stat-card"><div class="stat-value">{{ app.Loan?.installments_paid || 0 }}/{{ app.term_months }}</div><div class="stat-label">Prestações pagas</div></div>
        <div class="stat-card"><div class="stat-value">{{ mzn(balance(app)) }}</div><div class="stat-label">Saldo por pagar</div></div>
        <div class="stat-card"><div class="stat-value">{{ app.Loan?.next_due_date ? date(app.Loan.next_due_date) : statusHint(app.status) }}</div><div class="stat-label">Próximo passo</div></div>
      </div>

      <div class="action-row">
        <button class="btn btn-primary" @click="openDetails(app)">Visualizar</button>
        <button class="btn" @click="toggle(app.id)">{{ expanded[app.id] ? 'Ocultar' : 'Expandir' }}</button>
      </div>

      <div v-if="expanded[app.id]" class="loan-detail" style="margin-top:12px">
        <h3>Prestações pagas e por pagar</h3>
        <div v-if="app.Loan?.PaymentSchedules?.length" class="table-wrap">
        <table class="modern-table">
          <thead><tr><th>#</th><th>Data</th><th>Valor</th><th>Pago</th><th>Estado</th></tr></thead>
          <tbody><tr v-for="p in app.Loan.PaymentSchedules" :key="p.id"><td>{{ p.installment_number }}</td><td>{{ date(p.due_date) }}</td><td>{{ mzn(p.total_due) }}</td><td>{{ mzn(p.total_paid) }}</td><td><span :class="paymentClass(p.status)">{{ paymentLabel(p.status) }}</span></td></tr></tbody>
        </table>
        </div>
        <p v-else class="muted">Ainda não há prestações porque o pedido ainda não foi desembolsado.</p>
      </div>
    </div>

    <div v-if="selected" class="modal-backdrop" @click.self="selected=null">
      <div class="mk-modal large">
        <div class="mk-modal-head"><h2>Detalhes do pedido {{ selected.reference }}</h2><button class="modal-x" @click="selected=null">×</button></div>
        <div class="grid-3" style="gap:8px">
          <div class="stat-card"><div class="stat-label">Aprovado em</div><div class="stat-value">{{ selected.reviewed_at ? date(selected.reviewed_at) : 'Ainda não aprovado' }}</div></div>
          <div class="stat-card"><div class="stat-label">ID do funcionário</div><div class="stat-value small-id">{{ selected.reviewed_by || '—' }}</div></div>
          <div class="stat-card"><div class="stat-label">Central de riscos</div><div class="stat-value">{{ riskLabel(selected) }}</div></div>
        </div>

        <div class="notice" :class="selected.status==='rejected' ? 'danger' : ''" style="margin-top:12px">
          Estado actual: <strong>{{ statusLabel(selected.status, selected.Loan) }}</strong>. {{ statusExplanation(selected) }}
        </div>

        <h3 style="margin-top:16px">Documentos submetidos</h3>
        <div v-if="(selected.Documents||[]).length===0" class="muted">Sem documentos associados ao pedido.</div>
        <div v-for="d in selected.Documents" :key="d.id" class="doc-row">
          <div><strong>{{ docLabel(d.type) }}</strong><p class="muted">{{ d.original_name || d.file_name }} · {{ date(d.created_at) }}</p></div>
          <button type="button" class="btn" @click="downloadDoc(d)">Baixar / descarregar</button>
        </div>

        <h3 style="margin-top:16px">Prestações</h3>
        <div v-if="selected.Loan?.PaymentSchedules?.length" class="table-wrap">
        <table class="modern-table">
          <thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Estado</th></tr></thead>
          <tbody><tr v-for="p in selected.Loan.PaymentSchedules" :key="p.id"><td>{{ p.installment_number }}</td><td>{{ date(p.due_date) }}</td><td>{{ mzn(p.total_due) }}</td><td>{{ mzn(p.total_paid) }}</td><td>{{ paymentLabel(p.status) }}</td></tr></tbody>
        </table>
        </div>
        <p v-else class="muted">Ainda não existe plano de pagamento porque o pedido não foi desembolsado.</p>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import api, { downloadDocument } from '@/services/api'
const loading=ref(true), apps=ref([]), expanded=ref({}), selected=ref(null)
function mzn(v){return Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})}
function date(v){return v?new Date(v).toLocaleDateString('pt-MZ'):'—'}
function balance(app){return Number(app.Loan?.outstanding_balance || (['completed'].includes(app.Loan?.status)?0:app.total_repayable||app.requested_amount||0))}
function toggle(id){expanded.value[id]=!expanded.value[id]}
function openDetails(app){selected.value=app}
async function downloadDoc(d){ await downloadDocument(d.id, d.original_name || d.file_name || 'documento') }
function statusLabel(s, loan){ if(s==='disbursed' && loan) return 'Aprovado & desembolsado'; return {submitted:'Submetido',under_review:'Em análise',docs_requested:'Documentos solicitados',approved:'Aprovado',rejected:'Desaprovado',disbursed:'Aprovado & desembolsado',cancelled:'Cancelado',draft:'Rascunho'}[s]||s}
function statusClass(s){return ['approved','disbursed'].includes(s)?'status-pill st-approved':s==='rejected'?'status-pill st-rejected':'status-pill st-under_review'}
function statusHint(s){return {submitted:'Aguarda análise',under_review:'Em análise',approved:'Aguarda desembolso',rejected:'Finalizado',disbursed:'Ver calendário'}[s]||'—'}
function statusExplanation(app){ if(app.status==='approved') return 'Aguarda desembolso.'; if(app.status==='disbursed') return 'Activo e desembolsado.'; if(app.status==='rejected') return 'Pedido finalizado sem aprovação.'; if(app.status==='under_review') return 'Está em validação pelo banco.'; return 'Foi recebido pelo banco.' }
function riskLabel(app){ if(app.Loan?.status==='overdue' && Number(app.Loan.days_overdue||0)>=365) return 'Pode ser enviado à Central de Riscos do Banco de Moçambique'; if(app.Loan?.status==='overdue') return `${app.Loan.days_overdue||0} dias em atraso`; return 'Sem envio' }
function docLabel(t){return {bi:'BI',nuit:'NUIT',residence_certificate:'Atestado de residência',bank_statement:'Extracto bancário',income_proof:'Folha salarial'}[t]||t}
function paymentLabel(s){return {pending:'Por pagar',partial:'Parcial',paid:'Pago',overdue:'Em atraso'}[s]||s}
function paymentClass(s){return s==='paid'?'status-pill st-approved':s==='overdue'?'status-pill st-rejected':'status-pill st-submitted'}
async function load(){loading.value=true; try{const {data}=await api.get('/loans/my'); apps.value=data.data||[]} finally{loading.value=false}}
onMounted(load)
</script>
<style scoped>.doc-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--color-border-tertiary);padding:10px 0}.large{max-width:900px;width:min(92vw,900px)}.small-id{font-size:12px;word-break:break-all}.loan-detail{background:var(--color-background-secondary);border:1px solid var(--color-border-tertiary);border-radius:12px;padding:12px}</style>
