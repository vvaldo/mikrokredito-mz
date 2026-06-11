<template>
  <div class="content-inner">
    <div class="page-header">
      <div>
        <h1 class="page-title">Olá, {{ firstName }}! 👋</h1>
        <p class="page-sub">Painel do agente de crédito · {{ today }}</p>
      </div>
      <div class="page-actions">
        <button class="btn" @click="load">Actualizar</button>
        <router-link to="/agent/register-client" class="btn btn-primary">+ Cadastrar cliente</router-link>
      </div>
    </div>

    <div class="scope-tag mb-4">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5.5" cy="5.5" r="4"/><path d="M5.5 3v2.5l1.5 1.5"/></svg>
      Agente de crédito — visualiza apenas os seus clientes e pedidos
    </div>

    <!-- KPIs -->
    <div class="grid-stat mb-4">
      <div class="stat-card">
        <div class="stat-label">Meus clientes</div>
        <div class="stat-value blue">{{ loading ? '…' : stats.clients }}</div>
        <div class="stat-change up">↑ cadastrados por mim</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pedidos submetidos</div>
        <div class="stat-value">{{ loading ? '…' : stats.applications }}</div>
        <div class="stat-change up">Este mês</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Aprovados</div>
        <div class="stat-value ok">{{ loading ? '…' : stats.approved }}</div>
        <div class="stat-change up">Taxa: {{ stats.approvalRate }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Em análise</div>
        <div class="stat-value">{{ loading ? '…' : stats.pending }}</div>
        <div class="stat-change neutral">Aguardam validação</div>
      </div>
    </div>

    <div class="grid-2 mb-4">
      <!-- Recent clients -->
      <div class="card">
        <div class="card-title">Últimos clientes cadastrados
          <router-link to="/agent/clients" class="btn btn-sm">Ver todos</router-link>
        </div>
        <div v-if="loading" style="padding:20px;text-align:center;color:var(--mk-text-2)">A carregar…</div>
        <div v-for="c in recentClients" :key="c.id" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(148,163,184,.06)">
          <div class="avatar" style="width:32px;height:32px;font-size:11px">{{ initials(c.User?.full_name) }}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;truncate">{{ c.User?.full_name }}</div>
            <div style="font-size:11px;color:var(--mk-text-2)">{{ c.User?.phone || c.User?.email }}</div>
          </div>
          <span class="badge" :class="c.kyc_status==='approved'?'badge-approved':'badge-warning'" style="font-size:10px">{{ c.kyc_status }}</span>
          <router-link :to="'/agent/clients'" class="btn btn-xs">Ver</router-link>
        </div>
        <div v-if="!loading && !recentClients.length" style="padding:20px;text-align:center;color:var(--mk-text-2);font-size:12px">
          Ainda sem clientes cadastrados.
          <router-link to="/agent/register-client" style="display:block;margin-top:8px">Cadastrar agora →</router-link>
        </div>
      </div>

      <!-- Recent applications -->
      <div class="card">
        <div class="card-title">Pedidos recentes
          <router-link to="/agent/applications" class="btn btn-sm">Ver todos</router-link>
        </div>
        <div v-for="a in recentApps" :key="a.id" style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(148,163,184,.06)">
          <div>
            <div style="font-size:12px;font-weight:600">{{ a.Client?.User?.full_name || '—' }}</div>
            <div style="font-size:11px;color:var(--mk-text-2)">{{ a.reference }} · {{ mzn(a.requested_amount) }}</div>
          </div>
          <span class="badge" :class="badgeCls(a.status)" style="font-size:10px">{{ statusLabel(a.status) }}</span>
        </div>
        <div v-if="!loading && !recentApps.length" style="padding:20px;text-align:center;color:var(--mk-text-2);font-size:12px">
          Sem pedidos recentes.
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="card">
      <div class="card-title">⚡ Acções rápidas</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
        <router-link to="/agent/register-client" style="text-decoration:none">
          <div style="background:rgba(26,111,245,.08);border:1px solid rgba(26,111,245,.2);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .15s" class="hover-lift">
            <div style="font-size:24px;margin-bottom:6px">👤</div>
            <div style="font-size:12px;font-weight:600;color:var(--blue-400)">Cadastrar cliente</div>
          </div>
        </router-link>
        <router-link to="/agent/apply" style="text-decoration:none">
          <div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .15s">
            <div style="font-size:24px;margin-bottom:6px">📋</div>
            <div style="font-size:12px;font-weight:600;color:var(--mk-success)">Novo pedido</div>
          </div>
        </router-link>
        <router-link to="/agent/simulator" style="text-decoration:none">
          <div style="background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .15s">
            <div style="font-size:24px;margin-bottom:6px">🔢</div>
            <div style="font-size:12px;font-weight:600;color:var(--cyan-400)">Simulador</div>
          </div>
        </router-link>
        <router-link to="/agent/clients" style="text-decoration:none">
          <div style="background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.2);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .15s">
            <div style="font-size:24px;margin-bottom:6px">📂</div>
            <div style="font-size:12px;font-weight:600;color:var(--mk-warning)">Meus clientes</div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
const auth = useAuthStore()
const loading = ref(true)
const recentClients = ref([])
const recentApps = ref([])
const stats = ref({ clients:0, applications:0, approved:0, pending:0, approvalRate:0 })
const firstName = computed(() => auth.user?.full_name?.split(' ')[0] || 'Agente')
const today = computed(() => new Date().toLocaleDateString('pt-MZ', { weekday:'long', day:'numeric', month:'long' }))
async function load() {
  loading.value = true
  try {
    const [c,a] = await Promise.allSettled([
      api.get('/clients',{params:{limit:5,created_by:auth.user?.id}}),
      api.get('/loans',{params:{limit:5,created_by:auth.user?.id}}),
    ])
    if(c.status==='fulfilled'){ recentClients.value=c.value.data.data||[]; stats.value.clients=c.value.data.meta?.total||0 }
    if(a.status==='fulfilled'){
      const apps=a.value.data.data||[]
      recentApps.value=apps
      stats.value.applications=a.value.data.meta?.total||0
      stats.value.approved=apps.filter(x=>x.status==='approved'||x.status==='disbursed').length
      stats.value.pending=apps.filter(x=>['submitted','under_review'].includes(x.status)).length
      stats.value.approvalRate=stats.value.applications>0?Math.round(stats.value.approved/stats.value.applications*100):0
    }
  } finally { loading.value=false }
}
const initials = n => n?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?'
const mzn = v => Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})
const badgeCls = s=>({approved:'badge-approved',disbursed:'badge-disbursed',submitted:'badge-submitted',under_review:'badge-review',rejected:'badge-rejected',draft:'badge-neutral'}[s]||'badge-neutral')
const statusLabel = s=>({submitted:'Submetido',under_review:'Em análise',approved:'Aprovado',rejected:'Rejeitado',disbursed:'Desembolsado',draft:'Rascunho'}[s]||s)
onMounted(load)
</script>
