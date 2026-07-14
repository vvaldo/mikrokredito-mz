<template>
  <section class="admin-dashboard">
    <div class="admin-hero">
      <div><h1>Dashboard do Banco</h1><p>Painel institucional padronizado, responsivo e actualizado pela base de dados.</p></div>
      <div class="export-actions"><button class="btn btn-blue" @click="loadDashboard">Actualizar</button><button class="btn" @click="router.push('/institution/reports')">Relatórios</button></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Carteira</div><div class="kpi-value">{{ money(totalPrincipal) }}</div><div class="kpi-foot">Principal institucional</div></div>
      <div class="kpi-card"><div class="kpi-label">Saldo</div><div class="kpi-value">{{ money(totalBalance) }}</div><div class="kpi-foot">Por cobrar</div></div>
      <div class="kpi-card"><div class="kpi-label">Pagamentos</div><div class="kpi-value">{{ money(totalPayments) }}</div><div class="kpi-foot">Confirmados</div></div>
      <div class="kpi-card"><div class="kpi-label">NPL</div><div class="kpi-value">{{ nplRate }}%</div><div class="kpi-foot">Risco</div></div>
    </div>
    <div class="grid-2">
      <div class="admin-card"><div class="admin-section-title">Carteira por estado</div><div class="table-wrap"><table><thead><tr><th>Estado</th><th>Qtd.</th><th>Principal</th><th>Saldo</th></tr></thead><tbody><tr v-for="r in portfolio" :key="r.status"><td><span class="badge badge-blue">{{ r.status || '-' }}</span></td><td>{{ r.count || 0 }}</td><td>{{ money(r.total_principal) }}</td><td>{{ money(r.total_balance) }}</td></tr></tbody></table></div></div>
      <div class="admin-card"><div class="admin-section-title">Pagamentos por método</div><div class="table-wrap"><table><thead><tr><th>Método</th><th>Qtd.</th><th>Total</th></tr></thead><tbody><tr v-for="r in payments" :key="r.method"><td>{{ r.method || '-' }}</td><td>{{ r.count || 0 }}</td><td>{{ money(r.total) }}</td></tr></tbody></table></div></div>
    </div>
    <div class="grid-2">
      <div class="admin-card">
        <div class="admin-section-title">Carteira por estado (gráfico)</div>
        <div class="chart-bars">
          <div class="chart-bar" v-for="r in portfolio" :key="'bar-'+r.status">
            <div class="bar" :class="barClass(r.status)" :style="{ height: barHeight(r) + '%' }"></div>
            <span class="bar-label">{{ r.status || '-' }}</span>
          </div>
          <p v-if="!portfolio.length" class="muted">Sem dados de carteira.</p>
        </div>
      </div>
      <div class="admin-card">
        <div class="admin-section-title">Pagamentos por método (gráfico)</div>
        <div class="donut" :style="{ background: donutGradient }"><div>{{ money(totalPayments) }}</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px">
          <span v-for="(r,i) in payments" :key="'leg-'+r.method" style="font-size:11px;display:flex;align-items:center;gap:5px">
            <i :style="{ width:'10px', height:'10px', borderRadius:'50%', display:'inline-block', background: donutColors[i % donutColors.length] }"></i>
            {{ r.method }} ({{ pct(r.total, totalPayments) }}%)
          </span>
          <p v-if="!payments.length" class="muted">Sem pagamentos confirmados.</p>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { currency } from '@/utils/exporters'
const router = useRouter(); const portfolio = ref([]); const payments = ref([]); const npl = ref({}); const money = currency
const totalPrincipal = computed(() => portfolio.value.reduce((s, r) => s + Number(r.total_principal || 0), 0))
const totalBalance = computed(() => portfolio.value.reduce((s, r) => s + Number(r.total_balance || 0), 0))
const totalPayments = computed(() => payments.value.reduce((s, r) => s + Number(r.total || 0), 0))
const nplRate = computed(() => npl.value?.npl_rate || '0.00')

const donutColors = ['var(--erp-blue)', 'var(--erp-green)', 'var(--erp-orange)', 'var(--erp-red)', 'var(--erp-purple)', 'var(--mk-border)']
function pct(value, total) { return total ? Math.round(Number(value || 0) / total * 100) : 0 }
function barHeight(r) {
  const max = Math.max(...portfolio.value.map(x => Number(x.total_principal || 0)), 1)
  return Math.max(6, Math.round(Number(r.total_principal || 0) / max * 100))
}
function barClass(status) {
  if (status === 'overdue' || status === 'written_off') return 'alt'
  if (status === 'completed') return 'warn'
  return ''
}
const donutGradient = computed(() => {
  if (!payments.value.length) return 'var(--mk-border)'
  let acc = 0
  const stops = payments.value.map((r, i) => {
    const from = acc
    acc += pct(r.total, totalPayments.value)
    return `${donutColors[i % donutColors.length]} ${from}% ${acc}%`
  })
  if (acc < 100) stops.push(`var(--mk-border) ${acc}% 100%`)
  return `conic-gradient(${stops.join(', ')})`
})

async function loadDashboard(){ const [p,pay,risk]=await Promise.all([api.get('/reports/portfolio'),api.get('/reports/payments-summary'),api.get('/reports/npl')]); portfolio.value=p.data.data||[]; payments.value=pay.data.data||[]; npl.value=risk.data.data||{} }
onMounted(loadDashboard)
</script>
