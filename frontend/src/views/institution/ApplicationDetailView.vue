<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Detalhe do Pedido</h1>
      <p>Ficha detalhada com documentos, histórico, status e acções administrativas.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="act('Actualizar')">Actualizar</button>
        <button class="btn" @click="act('Exportar')">Exportar Excel</button>
        <span class="hero-chip">Dados com isolamento por instituição</span>
      </div>
    </section>
    <div class="kpi-grid">
      <div class="kpi good"><div class="label">Registos</div><div class="value">{{ rows.length }}</div><div class="note">+12% este mês</div></div>
      <div class="kpi"><div class="label">Valor em análise</div><div class="value">{{ mzn(total) }}</div><div class="note">Carteira operacional</div></div>
      <div class="kpi warn"><div class="label">Pendentes</div><div class="value">23</div><div class="note">Requerem validação documental</div></div>
      <div class="kpi danger"><div class="label">Notificações</div><div class="value">3</div><div class="note">Falhas para reenvio</div></div>
    </div>
    
    <div class="modern-grid-2">
      <div class="modern-card">
        <h2>Movimento mensal</h2><p class="muted">Evolução de pedidos, aprovações e desembolsos</p>
        <div class="chart-bars">
          <div class="chart-bar"><div class="bar" style="height:55%"></div><span class="bar-label">Jan</span></div>
          <div class="chart-bar"><div class="bar alt" style="height:38%"></div><span class="bar-label">Fev</span></div>
          <div class="chart-bar"><div class="bar" style="height:72%"></div><span class="bar-label">Mar</span></div>
          <div class="chart-bar"><div class="bar warn" style="height:48%"></div><span class="bar-label">Abr</span></div>
          <div class="chart-bar"><div class="bar" style="height:86%"></div><span class="bar-label">Mai</span></div>
        </div>
      </div>
      <div class="modern-card">
        <h2>Estado da carteira</h2><p class="muted">Distribuição por estado</p>
        <div class="donut"><div>78%<br><span class="muted">saudável</span></div></div>
        <div class="legend"><span><b></b>Aprovado</span><span class="r"><b></b>Rejeitado</span><span class="w"><b></b>Pendente</span><span class="g"><b></b>Outros</span></div>
      </div>
    </div>
    <div class="modern-card">
      <h2>Registos recentes</h2><p class="muted">Botões de visualizar, editar, aprovar, ver status e documentos activados com feedback.</p>
      <table class="modern-table"><thead><tr><th>Ref.</th><th>Cliente</th><th>Instituição</th><th>Valor</th><th>Docs</th><th>Status</th><th>Acções</th></tr></thead>
        <tbody><tr v-for="r in rows" :key="r.id"><td><strong>{{ r.id }}</strong></td><td>{{ r.name }}<br><span class="muted">{{ r.date }}</span></td><td>{{ r.institution }}</td><td>{{ mzn(r.amount) }}</td><td>{{ r.docs }}</td><td><span :class="statusClass(r.status)">{{ r.status }}</span></td><td><div class="action-row"><button class="btn btn-sm" @click="act('Visualizar', r)">Visualizar</button><button class="btn btn-sm btn-blue-soft" @click="act('Editar', r)">Editar</button><button class="btn btn-sm btn-primary" @click="act('Aprovar', r)">Aprovar</button><button class="btn btn-sm" @click="act('Ver status', r)">Status</button><button class="btn btn-sm" @click="act('Ver documento', r)">Documento</button><button class="btn btn-sm btn-danger-soft" @click="remove(r)">Apagar</button></div></td></tr></tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
const toast = useToast()
const rows = ref([
  { id: 'EMP-2401', name: 'Maria da Graça', institution: 'Banco Oportunidade', amount: 45000, status: 'approved', docs: '4/4', date: '05/05/2026' },
  { id: 'EMP-2402', name: 'João Macuácua', institution: 'Fundo Crescer', amount: 80000, status: 'under_review', docs: '3/4', date: '04/05/2026' },
  { id: 'EMP-2403', name: 'Fátima Nhantumbo', institution: 'Banco Oportunidade', amount: 25000, status: 'submitted', docs: '4/4', date: '03/05/2026' },
  { id: 'EMP-2404', name: 'António Mondlane', institution: 'Crédito Rápido', amount: 120000, status: 'rejected', docs: '2/4', date: '02/05/2026' }
])
const total = computed(()=>rows.value.reduce((s,r)=>s+r.amount,0))
function mzn(v){ return Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0}) }
function act(label,row){ if(label==='Aprovar' && row){ row.status='approved'; toast.success(`${row.id} aprovado`) } else if(label==='Editar' && row){ toast.info(`Modo edição aberto para ${row.id}`) } else if(label==='Visualizar' && row){ toast.info(`Visualização: ${row.id} · ${row.name} · ${mzn(row.amount)}`) } else if(label==='Ver status' && row){ toast.info(`Status actual: ${row.status}`) } else if(label==='Ver documento' && row){ toast.info(`Documentos do pedido ${row.id}: ${row.docs}`) } else { toast.success(`${label}: ${row?.id || row?.name || 'registo'} processado`) } }
function remove(row){ rows.value = rows.value.filter(r=>r!==row); toast.success('Registo removido da lista') }
function statusClass(s){ return 'status-pill st-'+String(s||'pending') }
</script>

