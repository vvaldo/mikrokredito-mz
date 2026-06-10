<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Dashboard do Banco</h1>
      <p>Visão operacional padronizada, responsiva e ligada à base de dados: clientes, carteira, pagamentos, pedidos recentes e notificações.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="load">Actualizar dados</button>
        <button class="btn" @click="goNewRequest">+ Novo pedido</button>
        <span class="hero-chip">Última actualização: {{ lastRefresh || 'por actualizar' }}</span>
      </div>
      <div class="mobile-menu-hint">No celular, use a barra inferior para navegar entre menus.</div>
    </section>

    <div v-if="loading" class="modern-card">A carregar dados...</div>
    <template v-else>
      <div class="kpi-grid">
        <div class="kpi good"><div class="label">Clientes activos</div><div class="value">{{ stats.clients || 0 }}</div><div class="note">Base de dados</div></div>
        <div class="kpi"><div class="label">Empréstimos activos</div><div class="value">{{ stats.active_loans || 0 }}</div><div class="note">Activos e em atraso</div></div>
        <div class="kpi"><div class="label">Carteira total</div><div class="value">{{ mzn(stats.portfolio_total) }}</div><div class="note">Saldo em aberto</div></div>
        <div class="kpi danger"><div class="label">Notif. falhadas</div><div class="value">{{ stats.failed_notifications || 0 }}</div><div class="note">Requer reenvio</div></div>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="label">Recebido hoje</div><div class="value">{{ mzn(stats.payments?.today) }}</div><div class="note">Pagamentos confirmados</div></div>
        <div class="kpi"><div class="label">Semana</div><div class="value">{{ mzn(stats.payments?.week) }}</div><div class="note">Últimos 7 dias</div></div>
        <div class="kpi"><div class="label">Mês</div><div class="value">{{ mzn(stats.payments?.month) }}</div><div class="note">Mês corrente</div></div>
        <div class="kpi"><div class="label">Ano</div><div class="value">{{ mzn(stats.payments?.year) }}</div><div class="note">Ano corrente</div></div>
      </div>

      <div v-if="Number(stats.failed_notifications || 0) > 0" class="alert alert-danger">
        <strong>{{ stats.failed_notifications }} notificações falhadas.</strong>
        <button class="btn btn-xs btn-danger" @click="retryAll">Reenviar falhadas</button>
      </div>

      <div class="modern-grid-2">
        <div class="modern-card">
          <div class="card-title">Pedidos recentes <button class="btn btn-sm" @click="router.push('/institution/applications')">Ver todos</button></div>
          <div v-if="!recentApplications.length" class="text-muted">Sem pedidos recentes.</div>
          <div v-for="loan in recentApplications" :key="loan.id" class="dash-row">
            <div>
              <div class="text-sm fw-medium">{{ loan.Client?.User?.full_name || 'Cliente' }}</div>
              <div class="text-xs text-muted">{{ loan.reference }} · {{ mzn(loan.requested_amount) }} · {{ date(loan.created_at) }}</div>
            </div>
            <div class="action-row"><StatusBadge :status="loan.status" /><button class="btn btn-xs" @click="openLoan(loan)">Ver/Editar</button></div>
          </div>
        </div>

        <div class="modern-card">
          <div class="card-title">Notificações recentes <button class="btn btn-sm" @click="router.push('/institution/notifications')">Centro</button></div>
          <div v-if="!recentNotifications.length" class="text-muted">Sem notificações.</div>
          <div v-for="n in recentNotifications" :key="n.id" class="dash-row">
            <div><div class="text-sm">{{ n.event }}</div><div class="text-xs text-muted">{{ n.recipient_email || n.recipient_phone }} · {{ date(n.created_at) }}</div></div>
            <div class="action-row"><span class="ch-pill" :class="'ch-' + n.channel">{{ n.channel }}</span><StatusBadge :status="n.status" /><button class="btn btn-xs" @click="viewNotif(n)">Log</button></div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="modal" class="modal-backdrop" @click.self="modal=null">
      <div class="mk-modal wide"><div class="mk-modal-head"><h2>{{ modalTitle }}</h2><button class="modal-x" @click="modal=null">×</button></div>
        <pre class="log-box">{{ JSON.stringify(selected, null, 2) }}</pre>
        <div v-if="modal==='loan'" class="modal-actions"><button class="btn" @click="setStatus('under_review')">Colocar em análise</button><button class="btn btn-primary" @click="setStatus('approved')">Aprovar</button><button class="btn btn-danger" @click="setStatus('rejected')">Desaprovar</button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import { useToast } from 'vue-toastification'; import api from '@/services/api'; import StatusBadge from '@/components/common/StatusBadge.vue'
const router=useRouter(), toast=useToast(); const loading=ref(false); const stats=ref({}); const recentApplications=ref([]); const recentNotifications=ref([]); const lastRefresh=ref(''); const modal=ref(null); const selected=ref(null); const modalTitle=ref('Detalhe')
const mzn=v=>Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0}); const date=d=>d?new Date(d).toLocaleString('pt-MZ'):'';
async function load(){loading.value=true; try{const {data}=await api.get('/dashboard/institution'); stats.value=data.data||{}; recentApplications.value=data.data?.recent_applications||[]; recentNotifications.value=data.data?.recent_notifications||[]; lastRefresh.value=date(data.data?.refreshed_at); toast.success('Dashboard actualizado');}catch(e){toast.error(e.response?.data?.message||'Erro ao carregar dashboard')}finally{loading.value=false}}
function goNewRequest(){router.push('/institution/applications?new=1')} function openLoan(l){selected.value=l; modal.value='loan'; modalTitle.value='Pedido '+l.reference} function viewNotif(n){selected.value=n; modal.value='notif'; modalTitle.value='Log de notificação'}
async function setStatus(status){try{await api.patch('/loans/'+selected.value.id,{status}); toast.success('Estado actualizado na BD'); modal.value=null; await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao alterar estado')}}
async function retryAll(){try{await api.post('/notifications/retry'); toast.success('Reenvio solicitado'); await load()}catch(e){toast.error(e.response?.data?.message||'Erro no reenvio')}} onMounted(load)
</script>
<style scoped>.dash-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:.5px solid var(--mk-border)}.log-box{background:var(--mk-surface-2);padding:12px;border-radius:8px;max-height:360px;overflow:auto;font-size:12px}@media(max-width:760px){.dash-row{align-items:flex-start;flex-direction:column}}</style>
