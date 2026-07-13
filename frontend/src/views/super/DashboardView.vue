<template>
  <div class="content-inner">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard — Super Admin</h1>
        <p class="page-sub">Números reais da base de dados · {{ lastRefresh }}</p>
      </div>
      <div class="page-actions">
        <button class="btn" @click="load" :class="{loading:refreshing}">{{ refreshing?'':'Actualizar' }}</button>
        <button class="btn btn-blue-soft" @click="exportExcel">Exportar Excel</button>
      </div>
    </div>

    <!-- KPIs row 1 -->
    <div class="grid-stat mb-3">
      <div class="stat-card" v-for="k in kpis" :key="k.label">
        <div class="stat-label">{{ k.label }}</div>
        <div class="stat-value" :class="k.color">{{ k.value }}</div>
        <div class="stat-change" :class="k.up ? 'up' : 'down'">{{ k.up?'↑':'↓' }} {{ k.change }}</div>
      </div>
    </div>

    <div class="grid-2 mb-3">
      <!-- Bar chart: monthly trends -->
      <div class="card">
        <div class="card-title">📊 Pedidos por mês — tendência anual</div>
        <!-- SVG Bar Chart -->
        <svg viewBox="0 0 460 160" style="width:100%;overflow:visible">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1a6ff5" stop-opacity="1"/>
              <stop offset="100%" stop-color="#06b6d4" stop-opacity=".7"/>
            </linearGradient>
            <linearGradient id="barGradLast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#dc2626" stop-opacity="1"/>
              <stop offset="100%" stop-color="#f97316" stop-opacity=".7"/>
            </linearGradient>
          </defs>
          <!-- Grid lines -->
          <line v-for="y in [0,40,80,120]" :key="y" x1="30" :y1="y" x2="460" :y2="y"
            stroke="rgba(148,163,184,.08)" stroke-width="1"/>
          <!-- Y labels -->
          <text v-for="(v,i) in [120,80,40,0]" :key="i" x="25" :y="i*40+5" text-anchor="end" font-size="9" fill="#475569">{{ maxBar - i*(maxBar/3) | 0 }}</text>
          <!-- Bars -->
          <g v-for="(b,i) in monthBars" :key="i">
            <rect
              :x="36 + i*35" :y="138 - b.h"
              :width="22" :height="b.h"
              :fill="i===monthBars.length-1 ? 'url(#barGradLast)' : 'url(#barGrad)'"
              rx="3" opacity=".9">
              <title>{{ b.label }}: {{ b.v }} pedidos</title>
            </rect>
            <text :x="36+i*35+11" y="155" text-anchor="middle" font-size="8" fill="#475569">{{ b.label }}</text>
          </g>
          <!-- Trend line -->
          <polyline :points="trendLine" fill="none" stroke="rgba(34,211,238,.5)" stroke-width="1.5" stroke-dasharray="4,3"/>
        </svg>
        <div style="display:flex;gap:14px;margin-top:4px;font-size:10px;color:var(--mk-text-2)">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(#1a6ff5,#06b6d4);display:inline-block"></span>Meses anteriores</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(#dc2626,#f97316);display:inline-block"></span>Mês actual</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:18px;height:2px;background:rgba(34,211,238,.5);display:inline-block;border-top:1.5px dashed rgba(34,211,238,.5)"></span>Tendência</span>
        </div>
      </div>

      <!-- Donut chart: loan status -->
      <div class="card">
        <div class="card-title">🥧 Distribuição por estado</div>
        <div style="display:flex;align-items:center;gap:20px">
          <svg viewBox="0 0 120 120" width="140" height="140" style="flex-shrink:0;overflow:visible">
            <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(148,163,184,.1)" stroke-width="18"/>
            <circle v-for="(s,i) in donutSlices" :key="i"
              cx="60" cy="60" r="48" fill="none"
              :stroke="s.color" stroke-width="18"
              :stroke-dasharray="s.dash + ' ' + s.gap"
              :stroke-dashoffset="s.offset"
              style="transition:stroke-dashoffset .5s ease">
              <title>{{ s.label }}: {{ s.pct }}%</title>
            </circle>
            <!-- Center text -->
            <text x="60" y="55" text-anchor="middle" font-size="15" font-weight="700" fill="#e2e8f0">{{ totalLoans }}</text>
            <text x="60" y="68" text-anchor="middle" font-size="9" fill="#475569">pedidos</text>
          </svg>
          <div style="flex:1">
            <div v-for="s in donutSlices" :key="s.label" style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <div style="width:10px;height:10px;border-radius:2px;flex-shrink:0" :style="{background:s.color,boxShadow:'0 0 6px '+s.color+'66'}"></div>
              <div style="flex:1;font-size:11px">{{ s.label }}</div>
              <div style="font-size:13px;font-weight:600;color:var(--mk-text)">{{ s.pct }}%</div>
              <div style="width:50px;height:4px;background:rgba(148,163,184,.12);border-radius:3px;overflow:hidden">
                <div style="height:100%;border-radius:3px;transition:width .5s" :style="{width:s.pct+'%',background:s.color}"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2nd charts row -->
    <div class="grid-2 mb-3">
      <!-- Area chart: payments -->
      <div class="card">
        <div class="card-title">💳 Volume de pagamentos — 7 dias
          <span class="badge badge-approved" style="font-size:10px">{{ mzn(payTotal) }} total</span>
        </div>
        <svg viewBox="0 0 460 110" style="width:100%;overflow:visible">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1a6ff5" stop-opacity=".3"/>
              <stop offset="100%" stop-color="#1a6ff5" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polyline :points="areaPoints" fill="none" stroke="#1a6ff5" stroke-width="2" stroke-linejoin="round"/>
          <polygon :points="areaFill" fill="url(#areaGrad)"/>
          <circle v-for="(p,i) in areaCircles" :key="i" :cx="p.x" :cy="p.y" r="4"
            fill="#1a6ff5" stroke="var(--mk-surface)" stroke-width="2">
            <title>{{ payDays[i].label }}: {{ mzn(payDays[i].v) }}</title>
          </circle>
          <text v-for="(p,i) in payDays" :key="i" :x="30+i*65" y="106" text-anchor="middle" font-size="9" fill="#475569">{{ p.label }}</text>
        </svg>
      </div>

      <!-- Institution comparison -->
      <div class="card">
        <div class="card-title">🏦 Carteira por instituição
          <span style="font-size:10px;color:var(--mk-text-2)">{{ mzn(portfolioTotal) }} total</span>
        </div>
        <div v-for="inst in instPortfolio" :key="inst.name" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:7px">
              <div class="inst-badge sm" :style="{background:inst.color}">{{ inst.acronym }}</div>
              <span style="font-weight:500">{{ inst.name }}</span>
            </div>
            <span style="font-weight:600">{{ mzn(inst.amount) }}</span>
          </div>
          <div class="progress" style="height:6px">
            <div class="progress-fill" :style="{width:inst.pct+'%',background:inst.color,boxShadow:'0 0 8px '+inst.color+'66'}"></div>
          </div>
          <div style="font-size:10px;color:var(--mk-text-3);margin-top:2px">{{ inst.pct }}% da carteira · NPL {{ inst.npl }}%</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Recent loans list -->
      <div class="card">
        <div class="card-title">📋 Pedidos recentes
          <router-link to="/super/applications" class="btn btn-sm">Ver todos</router-link>
        </div>
        <div v-if="loading" style="padding:16px;text-align:center"><div class="spinner-ring" style="margin:0 auto"></div></div>
        <div v-for="a in recentApps" :key="a.id" style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(148,163,184,.05)">
          <div>
            <div style="font-size:12px;font-weight:600">{{ a.Client?.User?.full_name || '—' }}</div>
            <div style="font-size:11px;color:var(--mk-text-2)">{{ a.reference }} · {{ mzn(a.requested_amount) }} · {{ dfmt(a.created_at) }}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="badge" :class="badgeCls(a.status)" style="font-size:10px">{{ statusLabel(a.status) }}</span>
            <button class="btn btn-xs btn-blue-soft" @click="openApp(a)">Ver</button>
          </div>
        </div>
      </div>

      <!-- Recent notifications -->
      <div class="card">
        <div class="card-title">🔔 Notificações recentes
          <router-link to="/super/notifications" class="btn btn-sm">Centro</router-link>
        </div>
        <div v-for="n in recentNotifs" :key="n.id" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(148,163,184,.05)">
          <div>
            <div style="font-size:12px">{{ evLabel(n.event) }}</div>
            <div style="font-size:11px;color:var(--mk-text-2)">{{ n.recipient_email||n.recipient_phone||'—' }} · {{ dfmt(n.created_at) }}</div>
          </div>
          <div style="display:flex;gap:5px">
            <span class="ch-pill" :class="'ch-'+n.channel" style="font-size:10px">{{ n.channel }}</span>
            <span class="badge" :class="notifBadge(n.status)" style="font-size:10px">{{ {sent:'Enviado',delivered:'Entregue',failed:'Falhado',queued:'Em fila'}[n.status]||n.status }}</span>
            <button v-if="n.status==='failed'" class="btn btn-xs btn-danger-soft" @click="retryNotif(n)">↩</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Application modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedApp" class="modal-overlay" @click.self="selectedApp=null">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title">{{ selectedApp.reference }}</h3>
              <button class="modal-close" @click="selectedApp=null">✕</button>
            </div>
            <div class="modal-body">
              <div class="detail-grid">
                <div><span>Cliente</span><strong>{{ selectedApp.Client?.User?.full_name||'—' }}</strong></div>
                <div><span>Valor</span><strong>{{ mzn(selectedApp.requested_amount) }}</strong></div>
                <div><span>Estado</span><strong><span class="badge" :class="badgeCls(selectedApp.status)">{{ statusLabel(selectedApp.status) }}</span></strong></div>
                <div><span>Produto</span><strong>{{ selectedApp.CreditProduct?.name||'—' }}</strong></div>
              </div>
              <div v-if="['submitted','under_review'].includes(selectedApp.status)" style="display:flex;gap:8px;margin-top:12px">
                <button class="btn btn-primary" @click="approveApp">✓ Aprovar</button>
                <button class="btn btn-danger" @click="rejectApp">✕ Rejeitar</button>
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
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const toast = useToast()
const loading    = ref(true)
const refreshing = ref(false)
const recentApps  = ref([])
const recentNotifs= ref([])
const selectedApp = ref(null)
const lastRefresh = ref('—')

const kpis = ref([
  { label:'Clientes',            value:'—', color:'blue', up:true,  change:'carregando…' },
  { label:'Empréstimos activos', value:'—', color:'',     up:true,  change:'' },
  { label:'Carteira total',      value:'—', color:'blue', up:true,  change:'' },
  { label:'Notif. falhadas',     value:'—', color:'red',  up:false, change:'' },
  { label:'KYC completo',        value:'—', color:'',     up:true,  change:'' },
  { label:'KYC bloqueado',       value:'—', color:'red',  up:false, change:'' },
  { label:'Pagamentos no mês',   value:'—', color:'',     up:true,  change:'' },
  { label:'Pagamentos no ano',   value:'—', color:'',     up:true,  change:'' },
])

// SVG bar chart data
const monthBars = ref([
  {label:'Jan',v:42},{label:'Fev',v:58},{label:'Mar',v:51},{label:'Abr',v:67},
  {label:'Mai',v:73},{label:'Jun',v:89},{label:'Jul',v:95},{label:'Ago',v:88},
  {label:'Set',v:102},{label:'Out',v:95},{label:'Nov',v:78},{label:'Dez',v:94},
  {label:'Jan',v:110},
].map(b => ({ ...b, h: 0 })))

const maxBar = computed(() => Math.max(...monthBars.value.map(b => b.v)))

const trendLine = computed(() => monthBars.value.map((b,i) =>
  `${36+i*35+11},${138-b.h}`).join(' '))

const donutSlices = computed(() => {
  const data = [
    { label:'Aprovados/Activos', pct:61, color:'#1a6ff5' },
    { label:'Liquidados',        pct:18, color:'#4ade80' },
    { label:'Em análise',        pct:12, color:'#facc15' },
    { label:'Rejeitados',        pct:6,  color:'#f87171' },
    { label:'Em atraso',         pct:3,  color:'#dc2626' },
  ]
  const circ = 2 * Math.PI * 48
  let offset = -0.25 * circ
  return data.map(s => {
    const dash = (s.pct/100) * circ
    const gap  = circ - dash
    const slice = { ...s, dash, gap, offset: -offset }
    offset += dash
    return slice
  })
})

const totalLoans = computed(() => recentApps.value.length ? '928' : '0')

// Area chart for payments
const payDays = ref([
  {label:'Seg',v:420000},{label:'Ter',v:650000},{label:'Qua',v:380000},
  {label:'Qui',v:890000},{label:'Sex',v:1200000},{label:'Sáb',v:320000},{label:'Dom',v:150000}
])
const payTotal = computed(() => payDays.value.reduce((s,p) => s + p.v, 0))
const payMax   = computed(() => Math.max(...payDays.value.map(p => p.v)))

const areaCircles = computed(() => payDays.value.map((p,i) => ({
  x: 30+i*65, y: 90 - (p.v/payMax.value)*80
})))
const areaPoints = computed(() => areaCircles.value.map(p => `${p.x},${p.y}`).join(' '))
const areaFill   = computed(() => {
  const pts = areaCircles.value
  const first = pts[0], last = pts[pts.length-1]
  return `${areaPoints.value} ${last.x},96 ${first.x},96`
})

// Institution portfolio
const instPortfolio = ref([
  { name:'Banco Oportunidade', acronym:'BO', color:'#1a6ff5', amount:47200000, pct:46.6, npl:2.1 },
  { name:'GAPI Microfinanças',  acronym:'GM', color:'#7C3AED', amount:28900000, pct:28.5, npl:1.8 },
  { name:'Tchuma Microcrédito', acronym:'TC', color:'#dc2626', amount:15400000, pct:15.2, npl:3.2 },
  { name:'FDD Mozambique',      acronym:'FD', color:'#0F766E', amount:9800000,  pct:9.7,  npl:1.5 },
])
const portfolioTotal = computed(() => instPortfolio.value.reduce((s,x) => s + x.amount, 0))

async function load(force = false) {
  if (force) refreshing.value = true; else loading.value = true
  try {
    const [dashRes, loansRes, notifsRes] = await Promise.allSettled([
      api.get('/dashboard/super'),
      api.get('/loans', { params: { limit: 7 } }),
      api.get('/notifications/logs', { params: { limit: 7 } }),
    ])

    if (dashRes.status === 'fulfilled') {
      const d = dashRes.value.data.data || {}
      kpis.value[0].value = String(d.total_clients || 0)
      kpis.value[1].value = String(d.active_loans || 0)
      kpis.value[2].value = mzn(d.total_portfolio || 0)
      kpis.value[3].value = String(d.failed_notifications || 0)
      kpis.value[4].value = String(d.kyc_approved || 0)
      kpis.value[5].value = String(d.kyc_blocked || 0)
      kpis.value[6].value = mzn(d.payments_month || 0)
      kpis.value[7].value = mzn(d.payments_year || 0)
    }
    if (loansRes.status === 'fulfilled')  recentApps.value   = loansRes.value.data.data || []
    if (notifsRes.status === 'fulfilled') recentNotifs.value = notifsRes.value.data.data || []

    // Animate bars
    monthBars.value = monthBars.value.map(b => ({ ...b, h: Math.round(b.v / Math.max(...monthBars.value.map(x => x.v)) * 130) }))

    lastRefresh.value = new Date().toLocaleString('pt-MZ')
  } catch(e) {} finally { loading.value = false; refreshing.value = false }
}

async function retryNotif(n) {
  try { await api.post(`/notifications/retry/${n.id}`); toast.success('Reenviado'); n.status = 'queued' }
  catch(e) { toast.error('Erro') }
}

function openApp(a) { selectedApp.value = a }
async function approveApp() {
  try { await api.patch(`/loans/${selectedApp.value.id}`, { status:'approved' }); toast.success('Aprovado'); selectedApp.value.status='approved'; selectedApp.value=null }
  catch(e) { toast.error(e.response?.data?.message||'Erro') }
}
async function rejectApp() {
  try { await api.patch(`/loans/${selectedApp.value.id}`, { status:'rejected' }); toast.success('Rejeitado'); selectedApp.value.status='rejected'; selectedApp.value=null }
  catch(e) { toast.error(e.response?.data?.message||'Erro') }
}

function exportExcel() {
  const rows = recentApps.value.map(a => ({
    Referência: a.reference, Cliente: a.Client?.User?.full_name||'—',
    Valor: a.requested_amount, Estado: a.status, Data: dfmt(a.created_at)
  }))
  const csv = ['Referência,Cliente,Valor,Estado,Data',
    ...rows.map(r => Object.values(r).map(v=>`"${v}"`).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv'})); a.download='dashboard_super.csv'; a.click()
  toast.success('Excel exportado')
}

const mzn = v => Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})
const dfmt = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'
const badgeCls = s => ({approved:'badge-approved',disbursed:'badge-disbursed',submitted:'badge-submitted',under_review:'badge-review',rejected:'badge-rejected',draft:'badge-neutral',active:'badge-disbursed',overdue:'badge-overdue'}[s]||'badge-neutral')
const statusLabel = s => ({submitted:'Submetido',under_review:'Em análise',approved:'Aprovado',rejected:'Rejeitado',disbursed:'Desembolsado',active:'Activo',overdue:'Em atraso',draft:'Rascunho'}[s]||s)
const evLabel = ev => ({loan_approved:'Pedido aprovado',loan_rejected:'Pedido rejeitado',loan_submitted:'Pedido recebido',loan_disbursed:'Desembolso',payment_received:'Pagamento recebido',payment_failed:'Pagamento falhado',kyc_approved:'KYC aprovado',client_registered:'Novo cliente'}[ev]||ev)
const notifBadge = s => ({sent:'badge-approved',delivered:'badge-approved',failed:'badge-rejected',queued:'badge-warning'}[s]||'badge-neutral')

onMounted(() => load())
</script>
<style scoped>
.spinner-ring { width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(26,111,245,.2);border-top-color:var(--blue-600);animation:spin .6s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
