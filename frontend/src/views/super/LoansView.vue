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
      <div class="filters-bar">
        <label class="field"><span>Pesquisar</span><input class="input" v-model="filters.q" placeholder="Referência (EMP-...) ou nome do cliente"></label>
        <label class="field"><span>Estado</span><select class="input" v-model="filters.status"><option value="">Todos</option><option value="active">Activo</option><option value="overdue">Em falta</option><option value="completed">Liquidado</option><option value="approved_pending_disbursement">Aprovado / por desembolsar</option><option value="disbursed_without_schedule">Desembolsado</option></select></label>
        <label class="field" v-if="productOptions.length"><span>Produto</span><select class="input" v-model="filters.product"><option value="">Todos</option><option v-for="p in productOptions" :key="p" :value="p">{{ p }}</option></select></label>
        <label class="field"><span>Valor mínimo</span><input class="input" type="number" v-model.number="filters.min" placeholder="0"></label>
        <label class="field"><span>Valor máximo</span><input class="input" type="number" v-model.number="filters.max" placeholder="—"></label>
        <label class="field"><span>Desembolso de</span><input class="input" type="date" v-model="filters.from"></label>
        <label class="field"><span>Desembolso até</span><input class="input" type="date" v-model="filters.to"></label>
        <div class="filters-actions">
          <button class="btn btn-primary btn-sm" @click="qDebounced=filters.q">Filtrar</button>
          <button class="btn btn-sm" @click="clearFilters">Limpar filtros</button>
        </div>
      </div>
      <LoadingSpinner v-if="loading" label="A carregar empréstimos..." />
      <template v-else>
      <div class="table-wrap desktop-only">
      <table class="modern-table">
        <thead>
          <tr><th>Ref.</th><th>Cliente</th><th>Valor</th><th>Juros</th><th>Valor total</th><th>Saldo</th><th>Estado</th><th>Acções</th></tr>
        </thead>
        <tbody>
          <template v-for="l in pagedLoans" :key="l.id">
            <tr class="clickable-row" tabindex="0" role="button" :aria-label="`Ver detalhe do empréstimo ${l.LoanApplication?.reference||''}`" @click="openDetail(l)" @keydown.enter="openDetail(l)" @keydown.space.prevent="openDetail(l)">
              <td><strong>{{ l.LoanApplication?.reference || l.id }}</strong></td>
              <td>{{ l.LoanApplication?.Client?.User?.full_name || 'Cliente' }}</td>
              <td>{{ mzn(disbursedAmount(l)) }}</td>
              <td>{{ mzn(interestAmount(l)) }}</td>
              <td><strong>{{ mzn(repayableAmount(l)) }}</strong></td>
              <td><strong :class="balanceAmount(l) > 0 ? 'danger-text' : 'ok-text'">{{ mzn(balanceAmount(l)) }}</strong></td>
              <td><StatusBadge :status="displayStatus(l)" /></td>
              <td>
                <div class="action-row" @click.stop>
                  <button class="btn btn-sm btn-blue-soft" @click.stop="toggle(l)">{{ opened[l.id] ? 'Fechar' : 'Expandir' }}</button>
                  <button class="btn btn-sm btn-primary" @click.stop="openPay(l)">Registar pagamento</button>
                  <button class="btn btn-sm btn-danger-soft" @click.stop="notify(l)">Notificar</button>
                  <button class="btn btn-sm" @click.stop="viewLoan(l)">Visualizar</button>
                  <button class="btn btn-sm" @click.stop="downloadStatementPdf(l)">Baixar PDF</button>
                  <button class="btn btn-sm" @click.stop="editDisbursement(l)">Editar desembolso</button>
                  <button class="btn btn-sm btn-blue-soft" @click.stop="recalculate(l)">Recalcular</button>
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
          <tr v-else-if="!filteredLoans.length"><td colspan="8" class="empty-state">Nenhum empréstimo corresponde aos filtros.</td></tr>
        </tbody>
      </table>
      </div>

      <!-- Cartões mobile: mesma informação e mesmas acções, sem esconder nada atrás de overflow-x. -->
      <div class="mobile-cards mobile-only">
        <div v-for="l in pagedLoans" :key="l.id" class="loan-card" tabindex="0" role="button" @click="openDetail(l)" @keydown.enter="openDetail(l)" @keydown.space.prevent="openDetail(l)">
          <div class="loan-card-head">
            <div><strong>{{ l.LoanApplication?.reference || l.id }}</strong><br><span class="muted">{{ l.LoanApplication?.Client?.User?.full_name || 'Cliente' }}</span></div>
            <StatusBadge :status="displayStatus(l)" />
          </div>
          <div class="loan-card-grid">
            <div><span class="muted">Valor</span><strong>{{ mzn(disbursedAmount(l)) }}</strong></div>
            <div><span class="muted">Total</span><strong>{{ mzn(repayableAmount(l)) }}</strong></div>
            <div><span class="muted">Pago</span><strong>{{ mzn(totalPaid(l)) }}</strong></div>
            <div><span class="muted">Saldo</span><strong :class="balanceAmount(l) > 0 ? 'danger-text' : 'ok-text'">{{ mzn(balanceAmount(l)) }}</strong></div>
          </div>
          <div class="action-row" @click.stop>
            <button class="btn btn-sm btn-blue-soft" @click.stop="toggle(l)">{{ opened[l.id] ? 'Fechar' : 'Expandir' }}</button>
            <button class="btn btn-sm btn-primary" @click.stop="openPay(l)">Registar pagamento</button>
            <button class="btn btn-sm btn-danger-soft" @click.stop="notify(l)">Notificar</button>
            <button class="btn btn-sm" @click.stop="viewLoan(l)">Visualizar</button>
            <button class="btn btn-sm" @click.stop="downloadStatementPdf(l)">Baixar PDF</button>
            <button class="btn btn-sm" @click.stop="editDisbursement(l)">Editar desembolso</button>
            <button class="btn btn-sm btn-blue-soft" @click.stop="recalculate(l)">Recalcular</button>
            <button class="btn btn-sm" @click.stop="openDetail(l)">Ver detalhes</button>
          </div>
          <div v-if="opened[l.id]" class="table-wrap" style="margin-top:10px" @click.stop>
            <table class="modern-table">
              <thead><tr><th>Nº</th><th>Venc.</th><th>Total</th><th>Pago</th><th>Estado</th></tr></thead>
              <tbody>
                <tr v-for="p in l.PaymentSchedules" :key="p.id">
                  <td>{{ p.installment_number }}</td><td>{{ date(p.due_date) }}</td><td>{{ mzn(Number(p.total_due||0)+Number(p.late_fee||0)) }}</td><td>{{ mzn(p.total_paid) }}</td><td><StatusBadge :status="p.status" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p v-if="loans.length && !filteredLoans.length" class="empty-state">Nenhum empréstimo corresponde aos filtros.</p>
        <p v-if="!loans.length" class="empty-state">Sem empréstimos activos para apresentar.</p>
      </div>

      <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="filteredLoans.length" />
      </template>
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

        <template v-if="modal==='detail' && selected">
          <div class="notif-tabs">
            <button class="notif-tab" :class="{active:detailTab==='resumo'}" @click="onDetailTab('resumo')">Resumo</button>
            <button class="notif-tab" :class="{active:detailTab==='prestacoes'}" @click="onDetailTab('prestacoes')">Prestações</button>
            <button class="notif-tab" :class="{active:detailTab==='pagamentos'}" @click="onDetailTab('pagamentos')">Pagamentos</button>
            <button class="notif-tab" :class="{active:detailTab==='cliente'}" @click="onDetailTab('cliente')">Cliente</button>
            <button class="notif-tab" :class="{active:detailTab==='historico'}" @click="onDetailTab('historico')">Histórico</button>
          </div>
          <div class="mk-modal-body">

          <div v-if="detailTab==='resumo'">
            <div class="mini-stats">
              <div><span>Capital</span><strong>{{ mzn(disbursedAmount(selected)) }}</strong></div>
              <div><span>Juros</span><strong>{{ mzn(interestAmount(selected)) }}</strong></div>
              <div><span>Mora</span><strong>{{ mzn(lateFees(selected)) }}</strong></div>
              <div><span>Total pago</span><strong>{{ mzn(totalPaid(selected)) }}</strong></div>
              <div><span>Saldo</span><strong :class="balanceAmount(selected) > 0 ? 'danger-text' : 'ok-text'">{{ mzn(balanceAmount(selected)) }}</strong></div>
            </div>
            <div class="detail-grid">
              <div><span class="muted">Referência</span><strong>{{ selected.LoanApplication?.reference }}</strong></div>
              <div><span class="muted">Cliente</span><strong>{{ selected.LoanApplication?.Client?.User?.full_name }}</strong></div>
              <div><span class="muted">Produto</span><strong>{{ selected.LoanApplication?.CreditProduct?.name || '—' }}</strong></div>
              <div><span class="muted">Valor desembolsado</span><strong>{{ mzn(disbursedAmount(selected)) }}</strong></div>
              <div><span class="muted">Valor total</span><strong>{{ mzn(repayableAmount(selected)) }}</strong></div>
              <div><span class="muted">Prazo</span><strong>{{ termMonths(selected) }} meses</strong></div>
              <div><span class="muted">Data de desembolso</span><strong>{{ date(selected.disbursed_at || selected.LoanApplication?.disbursed_at) }}</strong></div>
              <div><span class="muted">Próximo vencimento</span><strong>{{ date(selected.next_due_date) }}</strong></div>
              <div><span class="muted">Estado</span><strong>{{ statusLabel(displayStatus(selected)) }}</strong></div>
            </div>
          </div>

          <div v-if="detailTab==='prestacoes'" class="table-wrap">
            <table class="modern-table">
              <thead><tr><th>Nº</th><th>Vencimento</th><th>Capital</th><th>Juros</th><th>Mora</th><th>Total</th><th>Pago</th><th>Saldo</th><th>Estado</th></tr></thead>
              <tbody>
                <tr v-for="p in selected.PaymentSchedules" :key="p.id">
                  <td>{{ p.installment_number }}</td><td>{{ date(p.due_date) }}</td><td>{{ mzn(p.principal_due) }}</td><td>{{ mzn(p.interest_due) }}</td><td>{{ mzn(p.late_fee) }}</td><td>{{ mzn(Number(p.total_due||0)+Number(p.late_fee||0)) }}</td><td>{{ mzn(p.total_paid) }}</td><td>{{ mzn(scheduleBalance(p)) }}</td><td><StatusBadge :status="p.status" /></td>
                </tr>
                <tr v-if="!(selected.PaymentSchedules||[]).length"><td colspan="9" class="empty-state">Sem prestações geradas.</td></tr>
              </tbody>
            </table>
          </div>

          <div v-if="detailTab==='pagamentos'">
            <LoadingSpinner v-if="detailPaymentsLoading" label="A carregar pagamentos..." />
            <div v-else class="table-wrap">
              <table class="modern-table">
                <thead><tr><th>Referência</th><th>Data</th><th>Valor</th><th>Mora</th><th>Método</th><th>Prestação(ões)</th><th>Registado por</th><th>Comprovativo</th><th>Estado</th></tr></thead>
                <tbody>
                  <tr v-for="p in detailPayments" :key="p.id">
                    <td>{{ p.reference }}</td>
                    <td>{{ p.created_at ? new Date(p.created_at).toLocaleString('pt-MZ') : '—' }}</td>
                    <td>{{ mzn(p.amount) }}</td>
                    <td>{{ mzn(p.applied_late_fee) }}</td>
                    <td>{{ p.method }}</td>
                    <td>{{ (p.PaymentAllocations||[]).filter(a=>a.PaymentSchedule).map(a=>'Nº'+a.PaymentSchedule.installment_number).join(', ') || '—' }}</td>
                    <td>{{ p.registered_by_user?.full_name || 'Sistema/Cliente' }}</td>
                    <td><span :class="p.receipt_file_name?'badge-yesno-yes':'badge-yesno-no'">{{ p.receipt_file_name?'Sim':'Não' }}</span></td>
                    <td><StatusBadge :status="p.status" /></td>
                  </tr>
                  <tr v-if="!detailPayments.length"><td colspan="9" class="empty-state">Sem pagamentos registados para este empréstimo.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="detailTab==='cliente'" class="detail-grid">
            <div><span class="muted">Nome</span><strong>{{ selected.LoanApplication?.Client?.User?.full_name || '—' }}</strong></div>
            <div><span class="muted">Email</span><strong>{{ selected.LoanApplication?.Client?.User?.email || '—' }}</strong></div>
            <div><span class="muted">Telefone</span><strong>{{ selected.LoanApplication?.Client?.User?.phone || '—' }}</strong></div>
            <div><span class="muted">NUIT</span><strong>{{ selected.LoanApplication?.Client?.nuit || '—' }}</strong></div>
            <div><span class="muted">Estado KYC</span><strong>{{ selected.LoanApplication?.Client?.kyc_status || '—' }}</strong></div>
            <div><span class="muted">Estado CRC</span><strong>{{ selected.LoanApplication?.Client?.crc_status || '—' }}</strong></div>
          </div>

          <div v-if="detailTab==='historico'">
            <LoadingSpinner v-if="detailAuditLoading" label="A carregar histórico..." />
            <p v-else-if="detailAuditForbidden" class="empty-state">Sem permissão para consultar o histórico de auditoria.</p>
            <div v-else class="table-wrap">
              <table class="modern-table">
                <thead><tr><th>Data/hora</th><th>Utilizador</th><th>Acção</th></tr></thead>
                <tbody>
                  <tr v-for="a in detailAudit" :key="a.id">
                    <td>{{ new Date(a.created_at).toLocaleString('pt-MZ') }}</td>
                    <td>{{ a.user_name || '—' }} <span class="muted">({{ a.user_role || '—' }})</span></td>
                    <td>{{ auditActionLabel(a.action) }}</td>
                  </tr>
                  <tr v-if="!detailAudit.length"><td colspan="3" class="empty-state">Sem eventos registados.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          </div>
          <div class="modal-actions">
            <button class="btn" @click="modal=null">Fechar</button>
            <button class="btn btn-blue-soft" @click="toggle(selected)">{{ opened[selected.id] ? 'Fechar expandir' : 'Expandir' }}</button>
            <button class="btn btn-primary" @click="openPay(selected)">Registar pagamento</button>
            <button class="btn btn-danger-soft" @click="notify(selected)">Notificar</button>
            <button class="btn" @click="downloadStatementPdf(selected)">Baixar PDF</button>
            <button class="btn" @click="editDisbursement(selected)">Editar desembolso</button>
            <button class="btn btn-blue-soft" @click="recalculate(selected)">Recalcular</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/services/api'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const loading = ref(false)
const loans = ref([])
const opened = ref({})
const modal = ref(null)
const selected = ref(null)
const pay = ref({})
const todayStr = new Date().toISOString().slice(0,10)
const redisburseDate = ref(todayStr)
const page = ref(1), pageSize = ref(10)
const applicationsPath = computed(() => route.path.startsWith('/super') ? '/super/applications?new=1' : '/institution/applications?new=1')

// ── Filtros (client-side: /loans/active/list já carrega tudo de uma vez, tal como o resto
// da aplicação — não há paginação no backend para estes dados, por isso não há risco de
// "filtrar só o que já foi carregado").
const filters = ref({ q: '', status: '', product: '', from: '', to: '', min: null, max: null })
const qDebounced = ref('')
let qDebounceTimer = null
watch(() => filters.value.q, (v) => {
  clearTimeout(qDebounceTimer)
  qDebounceTimer = setTimeout(() => { qDebounced.value = v }, 300)
})
function clearFilters(){ filters.value = { q:'', status:'', product:'', from:'', to:'', min:null, max:null }; qDebounced.value = '' }
const productOptions = computed(() => {
  const names = new Set(loans.value.map(l => l.LoanApplication?.CreditProduct?.name).filter(Boolean))
  return [...names]
})
const filteredLoans = computed(() => loans.value.filter(l => {
  const q = qDebounced.value.trim().toLowerCase()
  if (q) {
    const hay = `${l.LoanApplication?.reference||''} ${l.LoanApplication?.Client?.User?.full_name||''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (filters.value.status && displayStatus(l) !== filters.value.status) return false
  if (filters.value.product && l.LoanApplication?.CreditProduct?.name !== filters.value.product) return false
  const amount = disbursedAmount(l)
  if (filters.value.min != null && filters.value.min !== '' && amount < Number(filters.value.min)) return false
  if (filters.value.max != null && filters.value.max !== '' && amount > Number(filters.value.max)) return false
  const disbursed = l.disbursed_at || l.LoanApplication?.disbursed_at
  if (filters.value.from && (!disbursed || new Date(disbursed) < new Date(filters.value.from))) return false
  if (filters.value.to && (!disbursed || new Date(disbursed) > new Date(new Date(filters.value.to).setHours(23,59,59,999)))) return false
  return true
}))
const pagedLoans = computed(() => filteredLoans.value.slice((page.value-1)*pageSize.value, page.value*pageSize.value))
watch(filteredLoans, () => { page.value = 1 })

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
async function load(){ loading.value=true; try{ const {data}=await api.get('/loans/active/list?limit=100000'); loans.value=(data.data||[]).filter(l=>['active','overdue','completed','approved_pending_disbursement','disbursed_without_schedule'].includes(displayStatus(l))) }catch(e){ toast.error(e.response?.data?.message||'Erro ao carregar empréstimos') } finally{ loading.value=false } }
function toggle(l){ opened.value[l.id]=!opened.value[l.id] }
function viewLoan(l){ selected.value=l; modal.value='view' }

// ── Popup de detalhe (clique na linha) — adicional aos botões existentes, não os substitui.
// Reutiliza exactamente as mesmas funções/endpoints já usados pelos botões da tabela.
const detailTab = ref('resumo')
const detailPayments = ref([])
const detailPaymentsLoading = ref(false)
const detailAudit = ref([])
const detailAuditLoading = ref(false)
const detailAuditForbidden = ref(false)
function openDetail(l){ selected.value=l; detailTab.value='resumo'; detailPayments.value=[]; detailAudit.value=[]; detailAuditForbidden.value=false; modal.value='detail' }
async function loadDetailPayments(l){
  detailPaymentsLoading.value=true
  try{ const {data}=await api.get('/payments',{params:{loan_id:l.id,limit:1000}}); detailPayments.value=data.data||[] }
  catch(e){ toast.error(e.response?.data?.message||'Erro ao carregar pagamentos do empréstimo') }
  finally{ detailPaymentsLoading.value=false }
}
async function loadDetailAudit(l){
  detailAuditLoading.value=true; detailAuditForbidden.value=false
  try{
    const ids=[l.id, l.application_id, ...detailPayments.value.map(p=>p.id)].filter(Boolean)
    const {data}=await api.get('/audit',{params:{entity_id_in:ids.join(','),limit:100}})
    detailAudit.value=data.data||[]
  }catch(e){ if(e.response?.status===403) detailAuditForbidden.value=true; else toast.error(e.response?.data?.message||'Erro ao carregar histórico') }
  finally{ detailAuditLoading.value=false }
}
async function onDetailTab(tab){
  detailTab.value=tab
  if(tab==='pagamentos' && !detailPayments.value.length && !detailPaymentsLoading.value) await loadDetailPayments(selected.value)
  if(tab==='historico' && !detailAudit.value.length && !detailAuditLoading.value){ if(!detailPayments.value.length) await loadDetailPayments(selected.value); await loadDetailAudit(selected.value) }
}
function scheduleBalance(p){ return Math.max(Number(p.total_due||0)+Number(p.late_fee||0)-Number(p.total_paid||0), 0) }
function auditActionLabel(a){ return ({loan_disbursement_updated:'Data de desembolso editada',loan_recalculated:'Empréstimo recalculado',payment_registered:'Pagamento registado',payment_edited:'Pagamento editado',payment_cancelled:'Pagamento cancelado',loan_payment_notification_sent:'Notificação enviada'})[a]||a }
function openPay(l){ selected.value=l; pay.value={loan_id:l.id, method:'bank_transfer', amount:null, external_reference:'', phone_number:'', receipt:null}; modal.value='pay' }
async function savePay(){ try{ const fd=new FormData(); for(const k of ['loan_id','amount','method','external_reference','phone_number']) fd.append(k,pay.value[k]||''); fd.append('receipt',pay.value.receipt); await api.post('/payments/manual',fd,{headers:{'Content-Type':'multipart/form-data'}}); toast.success('Pagamento registado e reflectido na conta do cliente'); modal.value=null; await load() }catch(e){ toast.error(e.response?.data?.message||'Erro ao registar pagamento') } }
async function notify(l){ try{ await api.post(`/loans/${l.id}/notify-payment`); toast.success('Email de cobrança enviado ao cliente e registado em logs') }catch(e){ toast.error(e.response?.data?.message||'Erro ao enviar email de notificação') } }
async function recalculate(l){ if(!confirm('Recalcular este empréstimo a partir do histórico de pagamentos? As prestações e a mora serão reconstruídas.')) return; try{ await api.post(`/loans/${l.id}/recalculate`); toast.success('Empréstimo recalculado.'); await load() }catch(e){ toast.error(e.response?.data?.message||'Erro ao recalcular empréstimo') } }
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
