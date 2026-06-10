<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Relatórios</h1>
      <p>Relatórios com dados reais da base de dados, filtros por período e exportação funcional em CSV/Excel e PDF.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="load">Actualizar</button>
        <button class="btn" @click="exportCsv('relatorio-geral')">Exportar Excel/CSV</button>
        <button class="btn" @click="exportPdf">Exportar PDF</button>
      </div>
    </section>

    <div class="modern-card">
      <h2>Filtros</h2>
      <div class="report-filters">
        <div class="form-group"><label>Data inicial</label><input class="input" type="date" v-model="filters.from" /></div>
        <div class="form-group"><label>Data final</label><input class="input" type="date" v-model="filters.to" /></div>
        <div class="form-group"><label>Módulo</label><select class="input" v-model="filters.module"><option value="all">Todos</option><option value="portfolio">Carteira</option><option value="payments">Pagamentos</option><option value="audit">Auditoria</option></select></div>
        <div class="form-group"><label>&nbsp;</label><button class="btn btn-primary" @click="load">Aplicar filtro</button></div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="label">Carteira em aberto</div><div class="value">{{ mzn(portfolioTotal) }}</div><div class="note">Por estado</div></div>
      <div class="kpi good"><div class="label">Total recebido</div><div class="value">{{ mzn(paymentTotal) }}</div><div class="note">Pagamentos confirmados</div></div>
      <div class="kpi warn"><div class="label">NPL</div><div class="value">{{ npl.npl_rate || 0 }}%</div><div class="note">Risco da carteira</div></div>
      <div class="kpi danger"><div class="label">Em atraso</div><div class="value">{{ mzn(npl.overdue_balance) }}</div><div class="note">Saldo vencido</div></div>
    </div>

    <div class="modern-grid-2">
      <div class="modern-card">
        <div class="card-title">Carteira por estado <button class="btn btn-sm" @click="exportCsv('carteira')">Exportar</button></div>
        <div class="table-wrap"><table><thead><tr><th>Estado</th><th>Qtd.</th><th>Capital</th><th>Saldo</th></tr></thead><tbody><tr v-for="r in portfolio" :key="r.status"><td><StatusBadge :status="r.status" /></td><td>{{ r.count }}</td><td>{{ mzn(r.total_principal) }}</td><td>{{ mzn(r.total_balance) }}</td></tr><tr v-if="!portfolio.length"><td colspan="4">Sem dados.</td></tr></tbody></table></div>
      </div>
      <div class="modern-card">
        <div class="card-title">Pagamentos por método <button class="btn btn-sm" @click="exportCsv('pagamentos')">Exportar</button></div>
        <div class="table-wrap"><table><thead><tr><th>Método</th><th>Qtd.</th><th>Total</th></tr></thead><tbody><tr v-for="r in payments" :key="r.method"><td>{{ r.method || 'N/D' }}</td><td>{{ r.count }}</td><td>{{ mzn(r.total) }}</td></tr><tr v-if="!payments.length"><td colspan="3">Sem dados.</td></tr></tbody></table></div>
      </div>
    </div>

    <div class="modern-card">
      <div class="card-title">Pacotes de exportação</div>
      <div v-for="r in reps" :key="r.name" class="export-card">
        <div><strong>{{ r.name }}</strong><div class="text-sm text-muted">{{ r.desc }}</div></div>
        <div class="action-row"><button class="btn btn-sm" @click="exportCsv(r.name.toLowerCase())">Excel/CSV</button><button class="btn btn-sm btn-primary" @click="exportPdf">PDF</button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'; import { useToast } from 'vue-toastification'; import api from '@/services/api'; import StatusBadge from '@/components/common/StatusBadge.vue'
const toast=useToast(); const portfolio=ref([]), payments=ref([]), npl=ref({}); const filters=ref({from:'',to:'',module:'all'});
const reps=[{name:'Clientes',desc:'Base de clientes, KYC e estado documental'},{name:'Pedidos',desc:'Pedidos submetidos, aprovados, rejeitados e desembolsados'},{name:'Empréstimos',desc:'Carteira, saldo, prestações e mora'},{name:'Pagamentos',desc:'Recebimentos por período, método e utilizador'},{name:'Notificações',desc:'Logs enviados, lidos, falhados e reenviados'},{name:'Auditoria',desc:'Eventos críticos por utilizador, perfil e entidade'}];
const mzn=v=>Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0});
const portfolioTotal=computed(()=>portfolio.value.reduce((s,r)=>s+Number(r.total_balance||0),0)); const paymentTotal=computed(()=>payments.value.reduce((s,r)=>s+Number(r.total||0),0));
async function load(){try{const params={}; if(filters.value.from)params.from=filters.value.from; if(filters.value.to)params.to=filters.value.to; const [a,b,c]=await Promise.all([api.get('/reports/portfolio',{params}),api.get('/reports/payments-summary',{params}),api.get('/reports/npl',{params})]); portfolio.value=a.data.data||[]; payments.value=b.data.data||[]; npl.value=c.data.data||{}; toast.success('Relatórios actualizados')}catch(e){toast.error(e.response?.data?.message||'Erro ao carregar relatórios')}}
function rowsForExport(){const rows=[['MICROCREDIT SYSTEM - Relatório'],['Gerado em',new Date().toLocaleString('pt-MZ')],[],['CARTEIRA POR ESTADO'],['Estado','Quantidade','Capital','Saldo'],...portfolio.value.map(r=>[r.status,r.count,r.total_principal,r.total_balance]),[],['PAGAMENTOS POR MÉTODO'],['Método','Quantidade','Total'],...payments.value.map(r=>[r.method,r.count,r.total]),[],['RISCO'],['NPL',npl.value.npl_rate+'%'],['Em atraso',npl.value.overdue_balance||0]]; return rows}
function exportCsv(name='relatorio'){const content=rowsForExport().map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n'); const blob=new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href); toast.success('Exportação gerada')}
function exportPdf(){window.print(); toast.success('Janela de impressão/PDF aberta')}
onMounted(load)
</script>
