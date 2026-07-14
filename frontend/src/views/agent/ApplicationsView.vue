<template>
  <div class="content-inner">
    <div class="page-header">
      <div><h1 class="page-title">Pedidos por mim submetidos</h1></div>
      <div class="page-actions">
        <select class="form-select" v-model="filterStatus" style="width:150px">
          <option value="">Todos</option>
          <option value="submitted">Submetidos</option>
          <option value="under_review">Em análise</option>
          <option value="approved">Aprovados</option>
          <option value="rejected">Rejeitados</option>
        </select>
        <router-link to="/agent/apply" class="btn btn-primary">+ Novo pedido</router-link>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Referência</th><th>Cliente</th><th>Valor</th><th>Produto</th><th>Estado</th><th>Data</th></tr></thead>
        <tbody>
          <tr v-for="a in filtered" :key="a.id">
            <td><span class="ref-chip">{{ a.reference||a.id?.slice(0,8) }}</span></td>
            <td style="font-weight:500;font-size:12px">{{ a.Client?.User?.full_name||'—' }}</td>
            <td style="font-size:12px">{{ mzn(a.requested_amount) }}</td>
            <td class="td-muted">{{ a.CreditProduct?.name||'—' }}</td>
            <td><span class="badge" :class="badgeCls(a.status)" style="font-size:10px">{{ statusLabel(a.status) }}</span></td>
            <td class="td-muted">{{ fmt(a.created_at) }}</td>
          </tr>
          <tr v-if="!loading&&!filtered.length"><td colspan="6" style="text-align:center;padding:28px;color:var(--mk-text-2)">Sem pedidos encontrados.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
const loading=ref(true),apps=ref([]),filterStatus=ref('')
const filtered=computed(()=>filterStatus.value?apps.value.filter(a=>a.status===filterStatus.value):apps.value)
const mzn=v=>Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})
const fmt=v=>v?new Date(v).toLocaleDateString('pt-MZ'):'—'
const badgeCls=s=>({approved:'badge-approved',disbursed:'badge-disbursed',submitted:'badge-submitted',under_review:'badge-review',rejected:'badge-rejected',draft:'badge-neutral'}[s]||'badge-neutral')
const statusLabel=s=>({submitted:'Submetido',under_review:'Em análise',approved:'Aprovado',rejected:'Rejeitado',disbursed:'Desembolsado',draft:'Rascunho'}[s]||s)
async function load(){loading.value=true;try{const{data}=await api.get('/loans',{params:{limit:100000}});apps.value=data.data||[]}finally{loading.value=false}}
onMounted(load)
</script>
