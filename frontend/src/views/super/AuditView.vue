<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Auditoria</h1>
      <p>Eventos reais da base de dados: quem fez, quando fez, em que módulo, qual entidade afectada, IP, navegador e valores alterados.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="load">Actualizar</button>
        <button class="btn" @click="exportCsv">Exportar Excel/CSV</button>
        <button class="btn" @click="windowPrint">Exportar PDF</button>
      </div>
    </section>

    <div class="modern-card">
      <h2>Filtros de auditoria</h2>
      <div class="report-filters">
        <div class="form-group"><label>Acção</label><input class="input" v-model="filters.action" placeholder="Ex.: loan, payment, login" /></div>
        <div class="form-group"><label>Entidade</label><input class="input" v-model="filters.entity" placeholder="Ex.: loans, users" /></div>
        <div class="form-group"><label>Data inicial</label><input class="input" type="date" v-model="filters.from" /></div>
        <div class="form-group"><label>Data final</label><input class="input" type="date" v-model="filters.to" /></div>
      </div>
      <div class="action-row"><button class="btn btn-primary" @click="load">Aplicar filtros</button><button class="btn" @click="clearFilters">Limpar</button></div>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="label">Eventos listados</div><div class="value">{{ logs.length }}</div><div class="note">Página actual</div></div>
      <div class="kpi good"><div class="label">Total encontrado</div><div class="value">{{ meta.total || 0 }}</div><div class="note">Base de dados</div></div>
      <div class="kpi warn"><div class="label">Acções críticas</div><div class="value">{{ criticalCount }}</div><div class="note">Aprovação, pagamento, senha, documentos</div></div>
      <div class="kpi danger"><div class="label">Falhas/risco</div><div class="value">{{ riskCount }}</div><div class="note">Rejeição, bloqueio ou erro</div></div>
    </div>

    <div class="modern-card">
      <div class="card-title">Eventos de auditoria</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Utilizador</th><th>Perfil</th><th>Acção</th><th>Entidade</th><th>IP</th><th>Descrição</th><th>Acções</th></tr></thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td class="td-nowrap">{{ date(log.created_at || log.createdAt) }}</td>
              <td><strong>{{ log.user_name || 'Sistema' }}</strong><div class="text-xs text-muted">{{ log.user_id || 'N/D' }}</div></td>
              <td><span class="badge badge-blue">{{ log.user_role || 'N/D' }}</span></td>
              <td><strong>{{ log.action }}</strong></td>
              <td>{{ log.entity || 'N/D' }}<div class="text-xs text-muted">{{ log.entity_id || '' }}</div></td>
              <td class="text-xs">{{ log.ip_address || 'N/D' }}</td>
              <td>{{ log.description || 'Sem descrição' }}</td>
              <td><button class="btn btn-sm" @click="selected=log">Ver detalhe</button></td>
            </tr>
            <tr v-if="!logs.length"><td colspan="8">Sem eventos de auditoria para os filtros escolhidos.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination"><span>Página {{ meta.page || 1 }} · {{ meta.total || 0 }} eventos</span><div class="pagination-controls"><button class="btn btn-sm" :disabled="page<=1" @click="page--;load()">Anterior</button><button class="btn btn-sm" :disabled="logs.length < limit" @click="page++;load()">Seguinte</button></div></div>
    </div>

    <div v-if="selected" class="modal-backdrop" @click.self="selected=null">
      <div class="mk-modal wide">
        <div class="mk-modal-head"><h2>Detalhe da auditoria</h2><button class="modal-x" @click="selected=null">×</button></div>
        <div class="audit-detail-grid">
          <div class="audit-box"><strong>Resumo</strong><pre>{{ JSON.stringify(summary(selected), null, 2) }}</pre></div>
          <div class="audit-box"><strong>Valores novos</strong><pre>{{ JSON.stringify(selected.new_values || {}, null, 2) }}</pre></div>
          <div class="audit-box"><strong>Valores anteriores</strong><pre>{{ JSON.stringify(selected.old_values || {}, null, 2) }}</pre></div>
          <div class="audit-box"><strong>User agent</strong><pre>{{ selected.user_agent || 'N/D' }}</pre></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'; import { useToast } from 'vue-toastification'; import api from '@/services/api'
const toast=useToast(); const logs=ref([]); const meta=ref({}); const selected=ref(null); const page=ref(1); const limit=50; const filters=ref({action:'',entity:'',from:'',to:''});
const criticalWords=['approved','disbursed','payment','password','document','role','permission','created','updated']; const riskWords=['failed','rejected','blocked','deleted','suspended'];
const criticalCount=computed(()=>logs.value.filter(l=>criticalWords.some(w=>String(l.action||'').toLowerCase().includes(w))).length); const riskCount=computed(()=>logs.value.filter(l=>riskWords.some(w=>String(l.action||'').toLowerCase().includes(w))).length)
const date=d=>d?new Date(d).toLocaleString('pt-MZ'):'';
async function load(){try{const params={page:page.value,limit}; Object.entries(filters.value).forEach(([k,v])=>{if(v)params[k]=v}); const {data}=await api.get('/audit',{params}); logs.value=data.data||[]; meta.value=data.meta||{}; toast.success('Auditoria carregada')}catch(e){toast.error(e.response?.data?.message||'Erro ao carregar auditoria')}}
function clearFilters(){filters.value={action:'',entity:'',from:'',to:''}; page.value=1; load()}
function summary(l){return {id:l.id,data:l.created_at||l.createdAt,utilizador:l.user_name,perfil:l.user_role,accao:l.action,entidade:l.entity,entidade_id:l.entity_id,ip:l.ip_address,descricao:l.description}}
function exportCsv(){const rows=[['Data','Utilizador','Perfil','Acção','Entidade','Entidade ID','IP','Descrição'],...logs.value.map(l=>[date(l.created_at||l.createdAt),l.user_name,l.user_role,l.action,l.entity,l.entity_id,l.ip_address,l.description])]; const content=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n'); const blob=new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`auditoria-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href)}
function windowPrint(){window.print()}
onMounted(load)
</script>
