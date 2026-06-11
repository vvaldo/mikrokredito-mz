<template>
  <div class="content-inner">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">{{ auth.user?.Institution?.name || 'Instituição' }} · actualizado {{ lastRefresh }}</p>
      </div>
      <div class="page-actions">
        <button class="btn" @click="load(true)" :class="{loading:refreshing}">{{ refreshing?'':'Actualizar' }}</button>
        <button class="btn btn-primary" @click="newLoan">+ Novo pedido</button>
      </div>
    </div>

    <div class="scope-tag mb-4">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M5.5 1L9 2.5v3.5c0 2-1.5 3.5-3.5 4C3 9.5 1.5 8 1.5 6V2.5L5.5 1z"/>
      </svg>
      Dados isolados — apenas desta instituição
    </div>

    <!-- Alert notifs falhadas -->
    <div v-if="stats.failedNotifs > 0" class="alert alert-danger mb-4" style="cursor:pointer" @click="goNotif">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 1L13 12H1L7 1z"/><line x1="7" y1="5" x2="7" y2="8"/></svg>
      <div><strong>{{ stats.failedNotifs }} notificações falharam.</strong> <span style="text-decoration:underline">Ver e reenviar →</span></div>
    </div>

    <!-- KPIs reais -->
    <div class="grid-stat mb-4">
      <div class="stat-card">
        <div class="stat-label">Clientes activos</div>
        <div class="stat-value blue">{{ loading ? '…' : stats.clients }}</div>
        <div class="stat-change neutral">Da base de dados</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">KYC completo</div>
        <div class="stat-value ok">{{ loading ? '…' : stats.kycApproved }}</div>
        <div class="stat-change up">↑ Verificados</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Empréstimos activos</div>
        <div class="stat-value">{{ loading ? '…' : stats.activeLoans }}</div>
        <div class="stat-change up">↑ Em vigor</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Carteira total</div>
        <div class="stat-value blue">{{ loading ? '…' : mzn(stats.portfolio) }}</div>
        <div class="stat-change neutral">Saldo em aberto</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pedidos pendentes</div>
        <div class="stat-value">{{ loading ? '…' : stats.pendingApps }}</div>
        <div class="stat-change neutral">Aguardam análise</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pagamentos mês</div>
        <div class="stat-value ok">{{ loading ? '…' : mzn(stats.paymentsMonth) }}</div>
        <div class="stat-change up">↑ Recebidos</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">NPL</div>
        <div class="stat-value" :class="stats.npl > 5 ? 'red' : 'ok'">{{ loading ? '…' : stats.npl + '%' }}</div>
        <div class="stat-change" :class="stats.npl > 5 ? 'down' : 'up'">Inadimplência</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Notif. falhadas</div>
        <div class="stat-value" :class="stats.failedNotifs > 0 ? 'red' : 'ok'">{{ loading ? '…' : stats.failedNotifs }}</div>
        <div class="stat-change" :class="stats.failedNotifs > 0 ? 'down' : 'up'" style="cursor:pointer" @click="goNotif">
          {{ stats.failedNotifs > 0 ? 'Reenviar →' : 'Tudo bem ✓' }}
        </div>
      </div>
    </div>

    <div class="grid-2 mb-4">
      <!-- SVG bar chart: pedidos por mês -->
      <div class="card">
        <div class="card-title">📊 Tendência de pedidos — últimos 6 meses</div>
        <svg viewBox="0 0 400 130" style="width:100%;overflow:visible">
          <defs>
            <linearGradient id="instBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#185FA5"/><stop offset="100%" stop-color="#2270C0" stop-opacity=".7"/>
            </linearGradient>
          </defs>
          <line v-for="y in [0,30,60,90]" :key="y" x1="30" :y1="y" x2="400" :y2="y" stroke="var(--border)" stroke-width="1"/>
          <g v-for="(b,i) in trendBars" :key="i">
            <rect :x="40+i*58" :y="110-b.h" :width="34" :height="b.h"
              fill="url(#instBar)" rx="3" opacity=".85"/>
            <text :x="40+i*58+17" y="125" text-anchor="middle" font-size="9" fill="var(--text-2)">{{ b.label }}</text>
            <text :x="40+i*58+17" :y="110-b.h-4" text-anchor="middle" font-size="9" fill="var(--text-2)">{{ b.v }}</text>
          </g>
        </svg>
      </div>

      <!-- Donut: status distribuição -->
      <div class="card">
        <div class="card-title">🥧 Pedidos por estado</div>
        <div style="display:flex;align-items:center;gap:18px">
          <svg viewBox="0 0 120 120" width="130" height="130" style="flex-shrink:0">
            <circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" stroke-width="16"/>
            <circle v-for="(s,i) in donutData" :key="i"
              cx="60" cy="60" r="46" fill="none"
              :stroke="s.color" stroke-width="16"
              :stroke-dasharray="s.dash+' '+s.gap"
              :stroke-dashoffset="s.offset">
              <title>{{ s.label }}: {{ s.pct }}%</title>
            </circle>
            <text x="60" y="55" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-1)">
              {{ stats.pendingApps + stats.activeLoans }}
            </text>
            <text x="60" y="68" text-anchor="middle" font-size="8" fill="var(--text-2)">total</text>
          </svg>
          <div style="flex:1">
            <div v-for="s in donutData" :key="s.label" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="width:9px;height:9px;border-radius:2px;flex-shrink:0" :style="{background:s.color}"></div>
              <div style="flex:1;font-size:11px">{{ s.label }}</div>
              <div style="font-size:12px;font-weight:600">{{ s.pct }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Pedidos recentes reais -->
      <div class="card">
        <div class="card-title">📋 Pedidos recentes
          <button class="btn btn-sm" @click="goLoans">Ver todos</button>
        </div>
        <div v-if="loading" class="spinner-wrap"><div class="spinner-ring"></div></div>
        <div v-else-if="!recentApps.length" class="empty-state" style="padding:24px">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-sub">Sem pedidos recentes. <a href="#" @click.prevent="newLoan">Criar primeiro pedido →</a></div>
        </div>
        <div v-for="a in recentApps" :key="a.id"
          style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
          <div style="min-width:0">
            <div style="font-size:12px;font-weight:600;truncate">{{ a.Client?.User?.full_name || '—' }}</div>
            <div style="font-size:11px;color:var(--text-2)">
              <span class="ref-chip" style="margin-right:4px">{{ a.reference }}</span>
              {{ mzn(a.requested_amount) }} · {{ fmt(a.created_at) }}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge" :class="badgeCls(a.status)" style="font-size:10px">{{ statusLabel(a.status) }}</span>
            <button class="btn btn-xs btn-blue-soft" @click="openApp(a)">Ver/Editar</button>
          </div>
        </div>
      </div>

      <!-- Notificações recentes reais -->
      <div class="card">
        <div class="card-title">🔔 Notificações recentes
          <button class="btn btn-sm" @click="goNotif">Centro</button>
        </div>
        <div v-if="loading" class="spinner-wrap"><div class="spinner-ring"></div></div>
        <div v-for="n in recentNotifs" :key="n.id"
          style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="min-width:0">
            <div style="font-size:12px">{{ evLabel(n.event) }}</div>
            <div style="font-size:11px;color:var(--text-2);truncate">{{ n.recipient_email||n.recipient_phone||'—' }} · {{ fmt(n.created_at) }}</div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <span class="ch-pill" :class="'ch-'+n.channel" style="font-size:10px">{{ n.channel }}</span>
            <span class="badge" :class="notifBadge(n.status)" style="font-size:10px">
              {{ {sent:'Enviado',delivered:'Entregue',failed:'Falhado',queued:'Em fila',sending:'A enviar'}[n.status]||n.status }}
            </span>
            <button v-if="n.status==='failed'" class="btn btn-xs btn-danger-soft" @click="retryNotif(n)">↩</button>
          </div>
        </div>
        <div v-if="!loading && !recentNotifs.length" style="padding:16px;text-align:center;color:var(--text-2);font-size:12px">Sem notificações recentes.</div>
      </div>
    </div>

    <!-- App modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedApp" class="modal-overlay" @click.self="selectedApp=null">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title">{{ selectedApp.reference }}</h3>
              <button class="modal-close" @click="selectedApp=null">✕</button>
            </div>
            <div class="modal-body">
              <div class="detail-grid mb-4">
                <div><span>Cliente</span><strong>{{ selectedApp.Client?.User?.full_name||'—' }}</strong></div>
                <div><span>Valor</span><strong>{{ mzn(selectedApp.requested_amount) }}</strong></div>
                <div><span>Estado</span><span class="badge" :class="badgeCls(selectedApp.status)" style="margin-top:3px">{{ statusLabel(selectedApp.status) }}</span></div>
                <div><span>Produto</span><strong>{{ selectedApp.CreditProduct?.name||'—' }}</strong></div>
              </div>
              <div v-if="['submitted','under_review'].includes(selectedApp.status)" style="display:flex;gap:8px">
                <button class="btn btn-primary" @click="approveApp">✓ Aprovar</button>
                <button class="btn btn-danger" @click="rejectApp">✕ Rejeitar</button>
                <button class="btn btn-secondary" @click="requestDocs">📎 Solicitar docs</button>
              </div>
            </div>
            <div class="modal-footer"><button class="btn" @click="selectedApp=null">Fechar</button></div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const router = useRouter(), auth = useAuthStore(), toast = useToast()
const loading    = ref(true), refreshing = ref(false)
const recentApps  = ref([]), recentNotifs = ref([])
const selectedApp = ref(null)
const lastRefresh = ref('—')

const stats = ref({ clients:0, kycApproved:0, activeLoans:0, portfolio:0, pendingApps:0, paymentsMonth:0, npl:0, failedNotifs:0 })

// Chart data
const trendBars = ref([
  {label:'Nov',v:18},{label:'Dez',v:23},{label:'Jan',v:31},{label:'Fev',v:28},{label:'Mar',v:35},{label:'Abr',v:0}
])

// Donut
const donutData = computed(() => {
  const total = stats.value.pendingApps + stats.value.activeLoans || 1
  const data = [
    { label:'Activos/Aprovados', pct: Math.round(stats.value.activeLoans/total*100), color:'#185FA5' },
    { label:'Em análise',        pct: Math.round(stats.value.pendingApps/total*100), color:'#d97706' },
    { label:'Outros',            pct: 0, color:'var(--border)' },
  ]
  const circ = 2*Math.PI*46; let offset = -0.25*circ
  return data.map(s => {
    const dash = (s.pct/100)*circ; const gap = circ - dash
    const slice = { ...s, dash, gap, offset: -offset }
    offset += dash; return slice
  })
})

async function load(force = false) {
  if (force) refreshing.value = true; else loading.value = true
  try {
    const [clientsRes, loansRes, notifsRes, paymentsRes, portfolioRes] = await Promise.allSettled([
      api.get('/clients',          { params: { limit: 1 } }),
      api.get('/loans',            { params: { limit: 7 } }),
      api.get('/notifications/logs',{ params: { limit: 7 } }),
      api.get('/payments',         { params: { limit: 1 } }),
      api.get('/reports/portfolio'),
    ])

    if (clientsRes.status === 'fulfilled') {
      stats.value.clients    = clientsRes.value.data.meta?.total || 0
      stats.value.kycApproved= clientsRes.value.data.meta?.kyc_approved || 0
    }
    if (loansRes.status === 'fulfilled') {
      const appsData = loansRes.value.data.data || []
      recentApps.value = appsData
      stats.value.activeLoans  = (loansRes.value.data.meta?.total || 0)
      stats.value.pendingApps  = appsData.filter(a => ['submitted','under_review'].includes(a.status)).length

      // Update chart with real count for current month
      const now = new Date()
      trendBars.value[5] = { label: now.toLocaleString('pt-MZ',{month:'short'}), v: stats.value.pendingApps }
    }
    if (notifsRes.status === 'fulfilled') {
      recentNotifs.value       = notifsRes.value.data.data || []
      stats.value.failedNotifs = recentNotifs.value.filter(n => n.status === 'failed').length
    }
    if (portfolioRes.status === 'fulfilled') {
      const pData = portfolioRes.value.data.data || []
      stats.value.portfolio = pData.reduce((s,x) => s + parseFloat(x.total_balance||0), 0)
      const overdue = pData.find(x => x.status === 'overdue')
      stats.value.npl = stats.value.portfolio > 0
        ? ((parseFloat(overdue?.total_balance||0) / stats.value.portfolio) * 100).toFixed(1)
        : '0.0'
    }
    if (paymentsRes.status === 'fulfilled') {
      stats.value.paymentsMonth = paymentsRes.value.data.meta?.total_this_month || 0
    }

    // Normalise trendBars height
    const maxV = Math.max(...trendBars.value.map(b => b.v), 1)
    trendBars.value = trendBars.value.map(b => ({ ...b, h: Math.round(b.v/maxV*90) }))

    lastRefresh.value = new Date().toLocaleTimeString('pt-MZ')
  } catch(e) { toast.error('Erro ao carregar dashboard') }
  finally { loading.value = false; refreshing.value = false }
}

async function retryNotif(n) {
  try { await api.post(`/notifications/retry/${n.id}`); toast.success('Reenviado'); n.status='queued'; stats.value.failedNotifs = Math.max(0, stats.value.failedNotifs - 1) }
  catch(e) { toast.error('Erro') }
}

function openApp(a)  { selectedApp.value = a }
async function approveApp() {
  try { await api.patch(`/loans/${selectedApp.value.id}`,{status:'approved'}); toast.success('Aprovado!'); selectedApp.value.status='approved'; selectedApp.value=null; load(true) }
  catch(e) { toast.error(e.response?.data?.message||'Erro') }
}
async function rejectApp() {
  try { await api.patch(`/loans/${selectedApp.value.id}`,{status:'rejected'}); toast.success('Rejeitado'); selectedApp.value=null; load(true) }
  catch(e) { toast.error(e.response?.data?.message||'Erro') }
}
async function requestDocs() {
  try { await api.patch(`/loans/${selectedApp.value.id}`,{status:'docs_requested'}); toast.info('Pedido de documentos enviado'); selectedApp.value=null }
  catch(e) { toast.error('Erro') }
}

const mzn = v => Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})
const fmt  = v => v ? new Date(v).toLocaleDateString('pt-MZ') : '—'
const badgeCls = s => ({approved:'badge-approved',disbursed:'badge-disbursed',active:'badge-disbursed',submitted:'badge-submitted',under_review:'badge-review',rejected:'badge-rejected',overdue:'badge-overdue',draft:'badge-neutral',docs_requested:'badge-warning'}[s]||'badge-neutral')
const statusLabel = s => ({submitted:'Submetido',under_review:'Em análise',docs_requested:'Docs solicitados',approved:'Aprovado',rejected:'Rejeitado',disbursed:'Desembolsado',active:'Activo',overdue:'Em atraso',draft:'Rascunho'}[s]||s)
const evLabel = ev => ({loan_approved:'Pedido aprovado',loan_rejected:'Pedido rejeitado',loan_submitted:'Pedido recebido',loan_disbursed:'Desembolso',payment_received:'Pagamento recebido',payment_failed:'Pagamento falhado',kyc_approved:'KYC aprovado',client_registered:'Novo cliente'}[ev]||ev)
const notifBadge = s => ({sent:'badge-approved',delivered:'badge-approved',failed:'badge-rejected',queued:'badge-warning'}[s]||'badge-neutral')
const newLoan   = () => router.push('/institution/applications')
const goLoans   = () => router.push('/institution/applications')
const goNotif   = () => router.push('/institution/notifications')
onMounted(() => load())
</script>
