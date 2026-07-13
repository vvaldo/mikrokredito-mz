<template>
  <section class="admin-dashboard">
    <div class="admin-hero">
      <div><h1>Dashboard do Super Admin</h1><p>Visão global padronizada, responsiva e baseada nos relatórios da base de dados.</p></div>
      <div class="export-actions"><button class="btn btn-blue" @click="loadDashboard">Actualizar</button><button class="btn" @click="goReports">Relatórios</button></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Carteira total</div><div class="kpi-value">{{ money(totalPrincipal) }}</div><div class="kpi-foot">Principal consolidado</div></div>
      <div class="kpi-card"><div class="kpi-label">Saldo em dívida</div><div class="kpi-value">{{ money(totalBalance) }}</div><div class="kpi-foot">Saldo aberto</div></div>
      <div class="kpi-card"><div class="kpi-label">Pagamentos</div><div class="kpi-value">{{ money(totalPayments) }}</div><div class="kpi-foot">Confirmados</div></div>
      <div class="kpi-card"><div class="kpi-label">NPL</div><div class="kpi-value">{{ nplRate }}%</div><div class="kpi-foot">Risco consolidado</div></div>
    </div>
    <div class="grid-2">
      <div class="admin-card"><div class="admin-section-title">Carteira por estado</div><div class="table-wrap"><table><thead><tr><th>Estado</th><th>Qtd.</th><th>Principal</th><th>Saldo</th></tr></thead><tbody><tr v-for="r in portfolio" :key="r.status"><td><span class="badge badge-blue">{{ r.status || '-' }}</span></td><td>{{ r.count || 0 }}</td><td>{{ money(r.total_principal) }}</td><td>{{ money(r.total_balance) }}</td></tr></tbody></table></div></div>
      <div class="admin-card"><div class="admin-section-title">Pagamentos por método</div><div class="table-wrap"><table><thead><tr><th>Método</th><th>Qtd.</th><th>Total</th></tr></thead><tbody><tr v-for="r in payments" :key="r.method"><td>{{ r.method || '-' }}</td><td>{{ r.count || 0 }}</td><td>{{ money(r.total) }}</td></tr></tbody></table></div></div>
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
async function loadDashboard(){ const [p,pay,risk]=await Promise.all([api.get('/reports/portfolio'),api.get('/reports/payments-summary'),api.get('/reports/npl')]); portfolio.value=p.data.data||[]; payments.value=pay.data.data||[]; npl.value=risk.data.data||{} }
function goReports(){ router.push('/super/reports') }
onMounted(loadDashboard)
</script>
