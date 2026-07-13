<template>
  <section class="report-page">
    <div class="report-hero">
      <div>
        <h1>Relatórios globais</h1>
        <p>Carteira, pagamentos e risco consolidados a partir da base de dados.</p>
      </div>
      <div class="export-actions">
        <button class="btn btn-blue" @click="loadAll">Actualizar</button>
        <button class="btn" @click="downloadCsv">Exportar CSV/Excel</button>
        <button class="btn btn-red-soft" @click="downloadPdf">Baixar PDF</button>
      </div>
    </div>

    <div class="filter-bar report-card">
      <label>Data inicial<input v-model="filters.from" type="date" /></label>
      <label>Data final<input v-model="filters.to" type="date" /></label>
      <label>Tipo
        <select v-model="activeReport">
          <option value="portfolio">Carteira</option>
          <option value="payments">Pagamentos</option>
          <option value="npl">Risco/NPL</option>
        </select>
      </label>
      <button class="btn btn-blue" @click="loadAll">Aplicar filtros</button>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Carteira total</div><div class="kpi-value">{{ money(totalPrincipal) }}</div><div class="kpi-foot">Valor desembolsado</div></div>
      <div class="kpi-card"><div class="kpi-label">Saldo em dívida</div><div class="kpi-value">{{ money(totalBalance) }}</div><div class="kpi-foot">Capital + juros por pagar</div></div>
      <div class="kpi-card"><div class="kpi-label">Pagamentos</div><div class="kpi-value">{{ money(totalPayments) }}</div><div class="kpi-foot">Confirmados no período</div></div>
      <div class="kpi-card"><div class="kpi-label">NPL</div><div class="kpi-value">{{ nplRate }}%</div><div class="kpi-foot">Taxa de risco</div></div>
    </div>

    <div class="report-card">
      <div class="report-section-title"><span>Dados do relatório</span><span class="badge badge-blue">{{ rows.length }} linhas</span></div>
      <div v-if="loading" class="text-muted">A carregar...</div>
      <div v-else-if="!rows.length" class="empty-state"><div class="empty-state-title">Sem dados</div><div class="empty-state-sub">Ajuste os filtros ou confirme se existem dados registados.</div></div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th v-for="h in headers" :key="h">{{ h }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i"><td v-for="h in headers" :key="h">{{ row[h] }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/services/api'
import { currency, exportCsv, exportHtmlPdf } from '@/utils/exporters'

const loading = ref(false)
const activeReport = ref('portfolio')
const filters = reactive({ from: '', to: '' })
const portfolio = ref([])
const payments = ref([])
const npl = ref({})

const money = currency
const totalPrincipal = computed(() => portfolio.value.reduce((s, r) => s + Number(r.total_principal || 0), 0))
const totalBalance = computed(() => portfolio.value.reduce((s, r) => s + Number(r.total_balance || 0), 0))
const totalPayments = computed(() => payments.value.reduce((s, r) => s + Number(r.total || 0), 0))
const nplRate = computed(() => npl.value?.npl_rate || '0.00')

const rows = computed(() => {
  if (activeReport.value === 'payments') return payments.value.map(r => ({ Método: r.method || '-', Quantidade: r.count || 0, Total: money(r.total) }))
  if (activeReport.value === 'npl') return [{ 'Carteira total': money(npl.value.total_portfolio), 'Saldo vencido': money(npl.value.overdue_balance), 'NPL %': nplRate.value }]
  return portfolio.value.map(r => ({ Estado: r.status || '-', Quantidade: r.count || 0, Principal: money(r.total_principal), Saldo: money(r.total_balance) }))
})
const headers = computed(() => rows.value[0] ? Object.keys(rows.value[0]) : [])

async function loadAll() {
  loading.value = true
  try {
    const params = filters.from && filters.to ? { from: filters.from, to: filters.to } : {}
    const [p, pay, risk] = await Promise.all([
      api.get('/reports/portfolio'),
      api.get('/reports/payments-summary', { params }),
      api.get('/reports/npl')
    ])
    portfolio.value = p.data.data || []
    payments.value = pay.data.data || []
    npl.value = risk.data.data || {}
  } finally { loading.value = false }
}
function downloadCsv() { exportCsv(`relatorio-${activeReport.value}.csv`, rows.value) }
function downloadPdf() {
  const html = `<h1>MicroCredit SYSTEM — Relatório ${activeReport.value}</h1>
    <div class="summary"><div class="box"><div class="muted">Carteira</div><strong>${money(totalPrincipal.value)}</strong></div><div class="box"><div class="muted">Pagamentos</div><strong>${money(totalPayments.value)}</strong></div><div class="box"><div class="muted">NPL</div><strong>${nplRate.value}%</strong></div></div>
    <table><thead><tr>${headers.value.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.value.map(r => `<tr>${headers.value.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  exportHtmlPdf('Relatório MicroCredit SYSTEM', html)
}
onMounted(loadAll)
</script>
