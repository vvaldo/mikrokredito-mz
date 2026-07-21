<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Empréstimos</h1>
      <p>Lista de empréstimos aprovados, desembolsados e activos. O estado só fica Liquidado quando Valor total (capital + juros + mora) estiver totalmente pago.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="router.push(applicationsPath)">+ Criar pedido</button>
        <button class="btn" @click="load">Actualizar</button>
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi good"><div class="label">Activos</div><div class="value">{{ loans.length }}</div></div>
      <div class="kpi"><div class="label">Valor desembolsado</div><div class="value">{{ mzn(totalPrincipal) }}</div></div>
      <div class="kpi warn"><div class="label">Valor total</div><div class="value">{{ mzn(totalRepayable) }}</div></div>
      <div class="kpi danger"><div class="label">Saldo em dívida</div><div class="value">{{ mzn(totalBalance) }}</div></div>
    </div>

    <div class="modern-card">
      <h2>Lista de empréstimos</h2>
      <div class="table-wrap">
      <table class="modern-table">
        <thead>
          <tr><th>Ref.</th><th>Cliente</th><th>Valor</th><th>Juros</th><th>Valor total</th><th>Saldo</th><th>Estado</th><th>Acções</th></tr>
        </thead>
        <tbody>
          <template v-for="l in loans" :key="l.id">
            <tr>
              <td><strong>{{ l.LoanApplication?.reference || l.id }}</strong></td>
              <td>{{ l.LoanApplication?.Client?.User?.full_name || 'Cliente' }}</td>
              <td>{{ mzn(disbursedAmount(l)) }}</td>
              <td>{{ mzn(interestAmount(l)) }}</td>
              <td><strong>{{ mzn(repayableAmount(l)) }}</strong></td>
              <td><strong :class="balanceAmount(l) > 0 ? 'danger-text' : 'ok-text'">{{ mzn(balanceAmount(l)) }}</strong></td>
              <td><StatusBadge :status="displayStatus(l)" /></td>
              <td>
                <div class="action-row">
                  <button class="btn btn-sm btn-blue-soft" @click="toggle(l)">{{ opened[l.id] ? 'Fechar' : 'Expandir' }}</button>
                  <button class="btn btn-sm btn-primary" @click="openPay(l)">Registar pagamento</button>
                  <button class="btn btn-sm btn-danger-soft" @click="notify(l)">Notificar</button>
                  <button class="btn btn-sm" @click="viewLoan(l)">Visualizar</button>
                  <button class="btn btn-sm" @click="downloadStatementPdf(l)">Baixar PDF</button>
                  <button class="btn btn-sm" @click="editDisbursement(l)">Editar desembolso</button>
                </div>
              </td>
            </tr>
            <tr v-if="opened[l.id]">
              <td colspan="8">
                <div class="loan-detail">
                  <div class="statement-summary">
                    <div><span>Total por pagar</span><strong>{{ mzn(repayableAmount(l)) }}</strong></div>
                    <div><span>Total pago</span><strong>{{ mzn(totalPaid(l)) }}</strong></div>
                    <div><span>Saldo em dívida</span><strong>{{ mzn(balanceAmount(l)) }}</strong></div>
                    <div><span>Prazo</span><strong>{{ termMonths(l) }} meses</strong></div>
                    <div><span>Juros de mora acumulado</span><strong>{{ mzn(lateFees(l)) }}</strong></div>
                  </div>
                  <strong>Todas as prestações</strong>
                  <div class="table-wrap">
                  <table class="modern-table">
                    <thead><tr><th>Nº</th><th>Vencimento</th><th>Capital</th><th>Juros</th><th>Mora</th><th>Total</th><th>Pago</th><th>Estado</th></tr></thead>
                    <tbody>
                      <tr v-for="p in l.PaymentSchedules" :key="p.id">
                        <td>{{ p.installment_number }}</td><td>{{ date(p.due_date) }}</td><td>{{ mzn(p.principal_due) }}</td><td>{{ mzn(p.interest_due) }}</td><td>{{ mzn(p.late_fee) }}</td><td>{{ mzn(Number(p.total_due||0)+Number(p.late_fee||0)) }}</td><td>{{ mzn(p.total_paid) }}</td><td><StatusBadge :status="p.status" /></td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!loans.length"><td colspan="8" class="empty-state">Sem empréstimos activos para apresentar.</td></tr>
        </tbody>
      </table>
      </div>
    </div>

    <div v-if="modal" class="modal-backdrop" @click.self="modal=null">
      <div class="mk-modal wide">
        <div class="mk-modal-head"><h2>{{ modal==='pay' ? 'Registar pagamento' : modal==='redisburse' ? 'Editar data de desembolso' : 'Detalhe do empréstimo' }}</h2><button class="modal-x" @click="modal=null">×</button></div>
        <div v-if="modal==='redisburse' && selected">
          <p>Empréstimo <strong>{{ selected.LoanApplication?.reference || selected.id }}</strong> — {{ selected.LoanApplication?.Client?.User?.full_name }}</p>
          <div class="form-group" style="margin-top:10px">
            <label class="form-label">Nova data de desembolso</label>
            <input class="form-input" type="date" v-model="redisburseDate" :max="todayStr" required>
            <p class="form-hint">A tabela de prestações é recalculada a partir desta data. Se, com a nova data, alguma prestação já estiver vencida, os juros de mora são recalculados automaticamente.</p>
          </div>
          <div v-if="hasPaidInstallments(selected)" class="alert alert-danger" style="margin-top:10px">
            Este empréstimo já tem prestações pagas — não é possível alterar a data de desembolso sem reverter esses pagamentos primeiro.
          </div>
          <div class="modal-actions"><button class="btn" @click="modal=null">Cancelar</button><button class="btn btn-primary" :disabled="!redisburseDate || hasPaidInstallments(selected)" @click="confirmRedisburse">Guardar e recalcular</button></div>
        </div>
        <div v-if="modal==='view'" class="detail-grid">
          <div><span class="muted">Cliente</span><strong>{{ selected.LoanApplication?.Client?.User?.full_name }}</strong></div>
          <div><span class="muted">Referência</span><strong>{{ selected.LoanApplication?.reference }}</strong></div>
          <div><span class="muted">Valor desembolsado</span><strong>{{ mzn(disbursedAmount(selected)) }}</strong></div>
          <div><span class="muted">Juros totais</span><strong>{{ mzn(interestAmount(selected)) }}</strong></div>
          <div><span class="muted">Valor total</span><strong>{{ mzn(repayableAmount(selected)) }}</strong></div>
          <div><span class="muted">Total pago</span><strong>{{ mzn(totalPaid(selected)) }}</strong></div>
          <div><span class="muted">Saldo em dívida</span><strong>{{ mzn(balanceAmount(selected)) }}</strong></div>
          <div><span class="muted">Juros de mora acumulado</span><strong>{{ mzn(lateFees(selected)) }}</strong></div>
          <div><span class="muted">Prazo</span><strong>{{ termMonths(selected) }} meses</strong></div>
          <div><span class="muted">Desembolsado em</span><strong>{{ date(selected.disbursed_at || selected.LoanApplication?.disbursed_at) }}</strong></div>
          <div><span class="muted">Estado</span><strong>{{ statusLabel(displayStatus(selected)) }}</strong></div>
        </div>
        <form v-if="modal==='pay'" @submit.prevent="savePay">
          <div class="form-grid">
            <label class="field"><span>Valor pago</span><input class="input" type="number" v-model.number="pay.amount" required></label>
            <label class="field"><span>Via de pagamento</span><select class="input" v-model="pay.method"><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option><option value="bank_transfer">Transferência bancária</option><option value="cash">Depósito/POS</option></select></label>
            <label class="field"><span>Nº referência/comprovativo</span><input class="input" v-model="pay.external_reference" required></label>
            <label class="field"><span>Telefone opcional</span><input class="input" v-model="pay.phone_number"></label>
          </div>
          <label class="upload-card"><div><strong>Comprovativo digitalizado</strong><span>{{ pay.receipt?.name || 'Anexar ficheiro' }}</span></div><input type="file" @change="e=>pay.receipt=e.target.files?.[0]" required></label>
          <div class="modal-actions"><button class="btn" type="button" @click="modal=null">Cancelar</button><button class="btn btn-primary" type="submit">Gravar pagamento na BD</button></div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/services/api'
import StatusBadge from '@/components/common/StatusBadge.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const loans = ref([])
const opened = ref({})
const modal = ref(null)
const selected = ref(null)
const pay = ref({})
const todayStr = new Date().toISOString().slice(0,10)
const redisburseDate = ref(todayStr)
const applicationsPath = computed(() => route.path.startsWith('/super') ? '/super/applications?new=1' : '/institution/applications?new=1')

const mzn = v => Number(v || 0).toLocaleString('pt-MZ', { style:'currency', currency:'MZN', maximumFractionDigits:0 })
const date = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'
function disbursedAmount(l){ return Number(l?.financial_summary?.principal ?? l?.principal ?? l?.LoanApplication?.approved_amount ?? l?.LoanApplication?.requested_amount ?? 0) }
function repayableAmount(l){ const s = l?.financial_summary; if (s?.total_repayable != null) return Number(s.total_repayable); const fromSchedule=(l?.PaymentSchedules||[]).reduce((a,p)=>a+Number(p.total_due||0)+Number(p.late_fee||0),0); return Math.max(Number(l?.LoanApplication?.total_repayable||0), fromSchedule, Number(l?.outstanding_balance||0), disbursedAmount(l)) }
function totalPaid(l){ return Number(l?.financial_summary?.total_paid ?? l?.total_paid ?? 0) }
function balanceAmount(l){ const s = l?.financial_summary; if (s?.outstanding_balance != null) return Number(s.outstanding_balance); return Math.max(repayableAmount(l)-totalPaid(l), Number(l?.outstanding_balance||0), 0) }
function interestAmount(l){ return Number(l?.financial_summary?.total_interest ?? Math.max(repayableAmount(l)-disbursedAmount(l),0)) }
function lateFees(l){ return Number(l?.financial_summary?.late_fee_accumulated ?? (l?.PaymentSchedules||[]).reduce((a,p)=>a+Number(p.late_fee||0),0)) }
function termMonths(l){ return Number(l?.financial_summary?.term_months ?? l?.term_months ?? l?.LoanApplication?.term_months ?? 0) }
function displayStatus(l){ return balanceAmount(l) > 0.01 && l?.status === 'completed' ? 'active' : (l?.financial_summary?.computed_status || l?.status) }
function statusLabel(s){ return ({completed:'Liquidado',active:'Activo',overdue:'Em falta',approved_pending_disbursement:'Aprovado / por desembolsar',disbursed_without_schedule:'Desembolsado'})[s] || s }
const totalPrincipal = computed(()=>loans.value.reduce((s,l)=>s+disbursedAmount(l),0))
const totalRepayable = computed(()=>loans.value.reduce((s,l)=>s+repayableAmount(l),0))
const totalBalance = computed(()=>loans.value.reduce((s,l)=>s+balanceAmount(l),0))
async function load(){ try{ const {data}=await api.get('/loans/active/list?limit=100000'); loans.value=(data.data||[]).filter(l=>['active','overdue','completed','approved_pending_disbursement','disbursed_without_schedule'].includes(displayStatus(l))) }catch(e){ toast.error(e.response?.data?.message||'Erro ao carregar empréstimos') } }
function toggle(l){ opened.value[l.id]=!opened.value[l.id] }
function viewLoan(l){ selected.value=l; modal.value='view' }
function openPay(l){ selected.value=l; pay.value={loan_id:l.id, method:'bank_transfer', amount:null, external_reference:'', phone_number:'', receipt:null}; modal.value='pay' }
async function savePay(){ try{ const fd=new FormData(); for(const k of ['loan_id','amount','method','external_reference','phone_number']) fd.append(k,pay.value[k]||''); fd.append('receipt',pay.value.receipt); await api.post('/payments/manual',fd,{headers:{'Content-Type':'multipart/form-data'}}); toast.success('Pagamento registado e reflectido na conta do cliente'); modal.value=null; await load() }catch(e){ toast.error(e.response?.data?.message||'Erro ao registar pagamento') } }
async function notify(l){ try{ await api.post(`/loans/${l.id}/notify-payment`); toast.success('Email de cobrança enviado ao cliente e registado em logs') }catch(e){ toast.error(e.response?.data?.message||'Erro ao enviar email de notificação') } }
function hasPaidInstallments(l){ return (l?.PaymentSchedules||[]).some(p => ['paid','partial'].includes(p.status)) }
function editDisbursement(l){ selected.value=l; redisburseDate.value=(l.disbursed_at||todayStr).slice(0,10); modal.value='redisburse' }
async function confirmRedisburse(){
  try{
    await api.patch(`/loans/${selected.value.id}/disbursement`,{disbursed_at:redisburseDate.value})
    toast.success('Data de desembolso actualizada e prestações recalculadas')
    modal.value=null; await load()
  }catch(e){ toast.error(e.response?.data?.message || 'Erro ao actualizar desembolso') }
}
function downloadStatementPdf(l){ const rows=(l.PaymentSchedules||[]).map(p=>`<tr><td>${p.installment_number}</td><td>${date(p.due_date)}</td><td>${mzn(p.principal_due)}</td><td>${mzn(p.interest_due)}</td><td>${mzn(p.late_fee)}</td><td>${mzn(Number(p.total_due||0)+Number(p.late_fee||0))}</td><td>${mzn(p.total_paid)}</td><td>${statusLabel(p.status)}</td></tr>`).join(''); const html=`<html><head><title>Pagamentos ${l.LoanApplication?.reference||''}</title><style>body{font-family:Arial;padding:24px;color:#111827}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ddd;padding:7px;font-size:12px}.totals{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0}.totals div{border:1px solid #ddd;padding:10px}.brand{font-size:11px;color:#6b7280;margin-top:24px}</style></head><body><h1>Mapa de Pagamentos - ${l.LoanApplication?.reference||''}</h1><p><strong>Cliente:</strong> ${l.LoanApplication?.Client?.User?.full_name||'Cliente'}</p><div class="totals"><div>Total por pagar: <strong>${mzn(repayableAmount(l))}</strong></div><div>Total Pago: <strong>${mzn(totalPaid(l))}</strong></div><div>Saldo em dívida: <strong>${mzn(balanceAmount(l))}</strong></div><div>Prazo: <strong>${termMonths(l)} meses</strong></div><div>Juros de moras acumulado: <strong>${mzn(lateFees(l))}</strong></div><div>Estado: <strong>${statusLabel(displayStatus(l))}</strong></div></div><table><thead><tr><th>Nº</th><th>Vencimento</th><th>Capital</th><th>Juros</th><th>Mora</th><th>Total</th><th>Pago</th><th>Estado</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Sem prestações geradas.</td></tr>'}</tbody></table><div class="brand">MicroCredit SYSTEM — Powered by OTECH</div></body></html>`; const win=window.open('','_blank'); win.document.write(html); win.document.close(); win.focus(); win.print() }
onMounted(load)
</script>
<style scoped>
.danger-text{color:#b91c1c}.ok-text{color:#047857}.statement-summary{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:8px;margin-bottom:14px}.statement-summary div{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:10px}.statement-summary span{display:block;font-size:11px;color:#64748b;margin-bottom:3px}
</style>
