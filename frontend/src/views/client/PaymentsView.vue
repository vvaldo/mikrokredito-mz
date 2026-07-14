<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Meus Pagamentos</h1>
      <p>Histórico real dos seus pagamentos, gravado na base de dados.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="load">Actualizar</button>
        <button class="btn" @click="exportExcel">Exportar Excel</button>
      </div>
    </section>
    <div class="kpi-grid">
      <div class="kpi good"><div class="label">Pagamentos</div><div class="value">{{ rows.length }}</div><div class="note">Registados na sua conta</div></div>
      <div class="kpi"><div class="label">Total confirmado</div><div class="value">{{ mzn(totalConfirmed) }}</div><div class="note">Pagamentos confirmados</div></div>
      <div class="kpi warn"><div class="label">Pendentes</div><div class="value">{{ pendingCount }}</div><div class="note">Aguardam confirmação</div></div>
      <div class="kpi danger"><div class="label">Falhados</div><div class="value">{{ failedCount }}</div><div class="note">Requerem novo pagamento</div></div>
    </div>

    <div class="modern-grid-2">
      <div class="modern-card">
        <h2>Pagamentos por mês</h2><p class="muted">Últimos 6 meses</p>
        <div class="chart-bars">
          <div class="chart-bar" v-for="m in monthlyChart" :key="m.key"><div class="bar" :style="{ height: m.pct + '%' }"></div><span class="bar-label">{{ m.label }}</span></div>
          <p v-if="!monthlyChart.length" class="muted">Sem histórico suficiente.</p>
        </div>
      </div>
      <div class="modern-card">
        <h2>Estado dos pagamentos</h2><p class="muted">Distribuição por estado</p>
        <div class="donut" :style="{ background: donutGradient }"><div>{{ rows.length }}<br><span class="muted">total</span></div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px">
          <span v-for="(s,i) in statusBreakdown" :key="s.status" style="font-size:11px;display:flex;align-items:center;gap:5px">
            <i :style="{ width:'10px', height:'10px', borderRadius:'50%', display:'inline-block', background: donutColors[i % donutColors.length] }"></i>
            {{ statusLabel(s.status) }} ({{ s.count }})
          </span>
        </div>
      </div>
    </div>

    <div class="modern-card">
      <h2>Pagamentos recentes</h2><p class="muted">Só os seus pagamentos. Pode visualizar detalhes e baixar o comprovativo anexado.</p>
      <table class="modern-table">
        <thead><tr><th>Ref.</th><th>Empréstimo</th><th>Valor</th><th>Método</th><th>Data</th><th>Estado</th><th>Comprovativo</th><th>Acções</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td><strong>{{ r.reference }}</strong></td>
            <td>{{ r.Loan?.LoanApplication?.reference || '—' }}</td>
            <td>{{ mzn(r.amount) }}</td>
            <td>{{ methodLabel(r.method) }}</td>
            <td>{{ dateTime(r.created_at) }}</td>
            <td><span :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
            <td>{{ r.receipt_original_name || '—' }}</td>
            <td><div class="action-row">
              <button class="btn btn-sm" @click="view(r)">Visualizar</button>
              <button class="btn btn-sm btn-blue-soft" :disabled="!r.receipt_file_name" @click="downloadReceipt(r)">Baixar comprovativo</button>
            </div></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="8" class="empty-state">Ainda não tem pagamentos registados.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="selected" class="modal-backdrop" @click.self="selected=null">
      <div class="mk-modal">
        <div class="mk-modal-head"><h2>Pagamento {{ selected.reference }}</h2><button class="modal-x" @click="selected=null">×</button></div>
        <div class="detail-grid">
          <div><span class="muted">Empréstimo</span><strong>{{ selected.Loan?.LoanApplication?.reference || '—' }}</strong></div>
          <div><span class="muted">Produto</span><strong>{{ selected.Loan?.LoanApplication?.CreditProduct?.name || '—' }}</strong></div>
          <div><span class="muted">Valor</span><strong>{{ mzn(selected.amount) }}</strong></div>
          <div><span class="muted">Mora aplicada</span><strong>{{ mzn(selected.applied_late_fee) }}</strong></div>
          <div><span class="muted">Método</span><strong>{{ methodLabel(selected.method) }}</strong></div>
          <div><span class="muted">Referência externa</span><strong>{{ selected.external_reference || '—' }}</strong></div>
          <div><span class="muted">Data</span><strong>{{ dateTime(selected.created_at) }}</strong></div>
          <div><span class="muted">Estado</span><strong>{{ statusLabel(selected.status) }}</strong></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/services/api'
const toast = useToast()
const rows = ref([])
const selected = ref(null)
const donutColors = ['var(--erp-green)', 'var(--erp-orange)', 'var(--erp-blue)', 'var(--erp-red)', 'var(--mk-border)']

function mzn(v) { return Number(v || 0).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }) }
function dateTime(v) { return v ? new Date(v).toLocaleString('pt-MZ') : '—' }
function methodLabel(m) { return ({ mpesa: 'M-Pesa', emola: 'e-Mola', bank_transfer: 'Transferência bancária', cash: 'Depósito/POS', reference: 'Referência' })[m] || m }
function statusLabel(s) { return ({ pending: 'Pendente', processing: 'A processar', confirmed: 'Confirmado', failed: 'Falhado', reversed: 'Revertido' })[s] || s }
function statusClass(s) { return 'status-pill st-' + String(s || 'pending') }

const totalConfirmed = computed(() => rows.value.filter(r => r.status === 'confirmed').reduce((s, r) => s + Number(r.amount || 0), 0))
const pendingCount = computed(() => rows.value.filter(r => ['pending', 'processing'].includes(r.status)).length)
const failedCount = computed(() => rows.value.filter(r => ['failed', 'reversed'].includes(r.status)).length)

const statusBreakdown = computed(() => {
  const map = {}
  rows.value.forEach(r => { map[r.status] = (map[r.status] || 0) + 1 })
  return Object.entries(map).map(([status, count]) => ({ status, count }))
})
const donutGradient = computed(() => {
  if (!rows.value.length) return 'var(--mk-border)'
  let acc = 0
  const stops = statusBreakdown.value.map((s, i) => {
    const from = acc
    acc += Math.round(s.count / rows.value.length * 100)
    return `${donutColors[i % donutColors.length]} ${from}% ${acc}%`
  })
  if (acc < 100) stops.push(`var(--mk-border) ${acc}% 100%`)
  return `conic-gradient(${stops.join(', ')})`
})

const monthlyChart = computed(() => {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-MZ', { month: 'short' }), total: 0 })
  }
  rows.value.forEach(r => {
    const key = (r.created_at || '').slice(0, 7)
    const m = months.find(x => x.key === key)
    if (m) m.total += Number(r.amount || 0)
  })
  const max = Math.max(...months.map(m => m.total), 1)
  return months.map(m => ({ ...m, pct: Math.max(6, Math.round(m.total / max * 100)) }))
})

function view(r) { selected.value = r }

async function downloadReceipt(r) {
  try {
    const res = await api.get(`/payments/${r.id}/receipt`, { responseType: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([res.data]))
    a.download = r.receipt_original_name || 'comprovativo'
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e) { toast.error('Erro ao baixar comprovativo') }
}

function exportExcel() {
  const header = ['Referência', 'Empréstimo', 'Valor', 'Método', 'Data', 'Estado']
  const data = rows.value.map(r => [r.reference, r.Loan?.LoanApplication?.reference || '', r.amount, methodLabel(r.method), dateTime(r.created_at), statusLabel(r.status)])
  const html = '<table>' + [header, ...data].map(row => '<tr>' + row.map(c => '<td>' + String(c ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;') + '</td>').join('') + '</tr>').join('') + '</table>'
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'meus-pagamentos.xls'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function load() {
  try {
    const { data } = await api.get('/payments', { params: { limit: 500 } })
    rows.value = data.data || []
  } catch (e) { toast.error(e.response?.data?.message || 'Erro ao carregar pagamentos') }
}
onMounted(load)
</script>
