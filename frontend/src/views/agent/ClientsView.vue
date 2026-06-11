<template>
  <div class="content-inner">
    <div class="page-header">
      <div><h1 class="page-title">Meus clientes</h1><p class="page-sub">Apenas clientes cadastrados por mim</p></div>
      <div class="page-actions">
        <input class="input" v-model="q" placeholder="Pesquisar…" style="width:200px">
        <router-link to="/agent/register-client" class="btn btn-primary">+ Cadastrar</router-link>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Cliente</th><th>Telefone</th><th>KYC</th><th>Pedidos</th><th>Data</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id">
            <td>
              <div style="display:flex;align-items:center;gap:9px">
                <div class="avatar" style="width:30px;height:30px;font-size:10px">{{ initials(c.User?.full_name) }}</div>
                <div>
                  <div style="font-weight:600;font-size:12px">{{ c.User?.full_name }}</div>
                  <div style="font-size:11px;color:var(--mk-text-2)">{{ c.User?.email }}</div>
                </div>
              </div>
            </td>
            <td class="td-muted">{{ c.User?.phone||'—' }}</td>
            <td><span class="badge" :class="c.kyc_status==='approved'?'badge-approved':'badge-warning'" style="font-size:10px">{{ c.kyc_status }}</span></td>
            <td style="font-size:12px">{{ c.LoanApplications?.length||0 }}</td>
            <td class="td-muted">{{ fmt(c.created_at) }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-sm btn-blue-soft" @click="selected=c">Ver perfil</button>
                <router-link to="/agent/apply" class="btn btn-sm">Novo pedido</router-link>
              </div>
            </td>
          </tr>
          <tr v-if="!loading&&!filtered.length"><td colspan="6" style="text-align:center;padding:28px;color:var(--mk-text-2)">Sem clientes encontrados.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
const auth=useAuthStore(), loading=ref(true), clients=ref([]), q=ref(''), selected=ref(null)
const filtered=computed(()=>q.value?clients.value.filter(c=>(c.User?.full_name+c.User?.email+c.User?.phone||'').toLowerCase().includes(q.value.toLowerCase())):clients.value)
const initials=n=>n?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?'
const fmt=v=>v?new Date(v).toLocaleDateString('pt-MZ'):'—'
async function load(){loading.value=true;try{const{data}=await api.get('/clients',{params:{limit:200}});clients.value=data.data||[]}finally{loading.value=false}}
onMounted(load)
</script>
