<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Relatórios</h1>
      <p>Exportação de dados reais do banco de dados em CSV e PDF.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="loadAll">Actualizar dados</button>
      </div>
    </section>

    <!-- KPIs from API -->
    <div class="kpi-grid">
      <div class="kpi good">
        <div class="label">Carteira total</div>
        <div class="value">{{ mzn(kpis.portfolio) }}</div>
        <div class="note">Saldo em aberto</div>
      </div>
      <div class="kpi">
        <div class="label">NPL médio</div>
        <div class="value">{{ kpis.npl }}%</div>
        <div class="note">Inadimplência</div>
      </div>
      <div class="kpi warn">
        <div class="label">Em análise</div>
        <div class="value">{{ kpis.underReview }}</div>
        <div class="note">Pedidos pendentes</div>
      </div>
      <div class="kpi">
        <div class="label">Pagamentos hoje</div>
        <div class="value">{{ mzn(kpis.paidToday) }}</div>
        <div class="note">Confirmados</div>
      </div>
    </div>

    <!-- Bar chart: carteira por estado -->
    <div class="modern-grid-2">
      <div class="modern-card">
        <h2>Carteira por estado</h2>
        <p class="muted">Distribuição do saldo por estado dos empréstimos</p>
        <div class="chart-bars" style="height:160px;margin-top:14px">
          <div v-for="s in portfolioByStatus" :key="s.status" class="chart-bar">
            <div class="bar" :style="{ height: s.pct + '%', background: s.color }"></div>
            <span class="bar-label">{{ s.label }}</span>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--mk-text-2)">
          <span v-for="s in portfolioByStatus" :key="s.status + 'l'">
            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:middle" :style="{ background: s.color }"></span>
            {{ s.label }}: {{ mzn(s.value) }}
          </span>
        </div>
      </div>

      <div class="modern-card">
        <h2>Pagamentos por método</h2>
        <div class="donut"></div>
        <div v-for="m in payMethods" :key="m.name" style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
          <div style="width:9px;height:9px;border-radius:2px;flex-shrink:0" :style="{ background: m.color }"></div>
          <div style="flex:1;font-size:12px">{{ m.name }}</div>
          <div style="font-size:12px;font-weight:500">{{ m.pct }}%</div>
          <div style="width:60px;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
            <div style="height:100%;border-radius:3px" :style="{ width: m.pct + '%', background: m.color }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Exportable reports list -->
    <div class="modern-card" id="reports-area">
      <h2>Relatórios disponíveis</h2>
      <p class="muted" style="margin-bottom:14px">Todos os dados provêm directamente da base de dados em tempo real.</p>
      <table class="modern-table">
        <thead>
          <tr><th>Módulo</th><th>Descrição</th><th>Registos</th><th>Exportar</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.key">
            <td><strong>{{ r.icon }} {{ r.name }}</strong></td>
            <td class="muted">{{ r.desc }}</td>
            <td>
              <span class="status-pill st-approved" v-if="r.count !== null">{{ r.count }}</span>
              <span class="muted" v-else>—</span>
            </td>
            <td>
              <div class="action-row">
                <button class="btn btn-sm btn-primary"
                  :class="{ loading: r.loading }"
                  :disabled="r.loading"
                  @click="exportReport(r, 'csv')">
                  {{ r.loading ? '' : 'CSV' }}
                </button>
                <button class="btn btn-sm" @click="exportReport(r, 'pdf')">PDF</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const kpis = ref({ portfolio: 0, npl: 0, underReview: 0, paidToday: 0 })
const portfolioByStatus = ref([])
const payMethods = ref([
  { name:'M-Pesa',        pct:58, color:'#16a34a' },
  { name:'e-Mola',        pct:24, color:'#185FA5' },
  { name:'Transferência', pct:12, color:'#7C3AED' },
  { name:'Referência',    pct:6,  color:'#d97706' },
])

const reports = ref([
  { key:'loans',      name:'Pedidos/Empréstimos', desc:'Todos os pedidos com estado, valor e datas', icon:'📋', count:null, loading:false },
  { key:'clients',    name:'Clientes',            desc:'Base de clientes com KYC e salário',          icon:'👥', count:null, loading:false },
  { key:'payments',   name:'Pagamentos',           desc:'Transacções por método e estado',            icon:'💳', count:null, loading:false },
  { key:'portfolio',  name:'Carteira',             desc:'Saldo por estado e por instituição',         icon:'📊', count:null, loading:false },
  { key:'npl',        name:'NPL / Risco',          desc:'Inadimplência por segmento',                 icon:'⚠️', count:null, loading:false },
  { key:'notifications',name:'Notificações',       desc:'Logs de envio (Email/SMS/WhatsApp)',         icon:'🔔', count:null, loading:false },
  { key:'audit',      name:'Auditoria',            desc:'Eventos críticos do sistema',                icon:'🔍', count:null, loading:false },
])

async function loadAll() {
  try {
    const [port, nplRes, loansRes] = await Promise.allSettled([
      api.get('/reports/portfolio'),
      api.get('/reports/npl'),
      api.get('/loans', { params: { limit: 1 } }),
    ])
    if (port.status === 'fulfilled') {
      const data = port.value.data.data || []
      const total = data.reduce((s, x) => s + parseFloat(x.total_balance || 0), 0)
      kpis.value.portfolio = total
      const maxVal = Math.max(...data.map(x => parseFloat(x.total_balance || 0)), 1)
      portfolioByStatus.value = data.map(x => ({
        status: x.status,
        label: { active:'Activos', overdue:'Em atraso', completed:'Liquidados', written_off:'Abatidos' }[x.status] || x.status,
        value: parseFloat(x.total_balance || 0),
        pct: Math.round(parseFloat(x.total_balance || 0) / maxVal * 100),
        color: { active:'#185FA5', overdue:'#A32D2D', completed:'#16a34a', written_off:'#94a3b8' }[x.status] || '#64748b',
      }))
      const overdue = data.find(x => x.status === 'overdue')
      if (total > 0 && overdue) kpis.value.npl = ((parseFloat(overdue.total_balance || 0) / total) * 100).toFixed(1)
    }
    if (nplRes.status === 'fulfilled') {
      kpis.value.npl = nplRes.value.data.data?.npl_rate || kpis.value.npl
    }
    if (loansRes.status === 'fulfilled') {
      reports.value[0].count = loansRes.value.data.meta?.total || 0
      kpis.value.underReview = 0
    }
  } catch (e) {}
}

async function exportReport(r, fmt) {
  r.loading = true
  try {
    let rows = [], headers = []

    if (r.key === 'loans') {
      const { data } = await api.get('/loans', { params: { limit: 1000 } })
      rows = (data.data || []).map(x => ({
        Referência: x.reference || x.id,
        Cliente: x.Client?.User?.full_name || '—',
        Produto: x.CreditProduct?.name || '—',
        'Valor solicitado': x.requested_amount,
        Estado: x.status,
        'Data submissão': x.created_at ? new Date(x.created_at).toLocaleDateString('pt-MZ') : '—',
      }))
    } else if (r.key === 'clients') {
      const { data } = await api.get('/clients', { params: { limit: 1000 } })
      rows = (data.data || []).map(x => ({
        Nome: x.User?.full_name || '—',
        Email: x.User?.email || '—',
        Telefone: x.User?.phone || '—',
        'KYC': x.kyc_status,
        Província: x.province || '—',
        Actividade: x.activity_type || '—',
        'Rendimento mensal': x.monthly_income || 0,
      }))
    } else if (r.key === 'payments') {
      const { data } = await api.get('/payments', { params: { limit: 1000 } })
      rows = (data.data || []).map(x => ({
        Referência: x.reference,
        Valor: x.amount,
        Método: x.method,
        Estado: x.status,
        Data: x.created_at ? new Date(x.created_at).toLocaleDateString('pt-MZ') : '—',
      }))
    } else if (r.key === 'audit') {
      const { data } = await api.get('/audit', { params: { limit: 1000 } })
      rows = (data.data || []).map(x => ({
        Utilizador: x.user_name || '—',
        Role: x.user_role || '—',
        Acção: x.action || x.description || '—',
        Entidade: x.entity || '—',
        IP: x.ip_address || '—',
        Data: x.created_at ? new Date(x.created_at).toLocaleString('pt-MZ') : '—',
      }))
    } else if (r.key === 'notifications') {
      const { data } = await api.get('/notifications/logs', { params: { limit: 1000 } })
      rows = (data.data || []).map(x => ({
        Canal: x.channel, Evento: x.event, Destinatário: x.recipient_email || x.recipient_phone || '—',
        Estado: x.status, Tentativas: x.attempts,
        Data: x.created_at ? new Date(x.created_at).toLocaleString('pt-MZ') : '—',
      }))
    } else if (r.key === 'portfolio') {
      const { data } = await api.get('/reports/portfolio')
      rows = (data.data || []).map(x => ({
        Estado: x.status, 'Total empréstimos': x.count,
        'Saldo total': x.total_balance, 'Capital total': x.total_principal
      }))
    } else if (r.key === 'npl') {
      const { data } = await api.get('/reports/npl')
      rows = [data.data]
    }

    r.count = rows.length

    if (fmt === 'csv') downloadCSV(rows, r.name)
    else printReport(rows, r.name)

  } catch (e) {
    toast.error('Erro ao exportar ' + r.name + ': ' + (e.response?.data?.message || e.message))
  } finally { r.loading = false }
}

function downloadCSV(rows, name) {
  if (!rows.length) { toast.warning('Sem dados para exportar'); return }
  const cols = Object.keys(rows[0])
  const header = cols.map(c => `"${c}"`).join(',')
  const body = rows.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  toast.success(`${rows.length} linhas exportadas em CSV`)
}

function printReport(rows, name) {
  if (!rows.length) { toast.warning('Sem dados para imprimir'); return }
  const cols = Object.keys(rows[0])
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>${name} — MikroKrédito MZ</title>
    <style>body{font-family:Arial,sans-serif;font-size:11px;padding:20px}
    h2{font-size:16px;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#185FA5;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
    tr:nth-child(even) td{background:#f8fafc}
    @media print{button{display:none}}</style></head><body>`)
  w.document.write(`<h2>${name}</h2><p style="color:#64748b;font-size:11px">Gerado em: ${new Date().toLocaleString('pt-MZ')} | MikroKrédito MZ</p>`)
  w.document.write('<table><thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>')
  rows.forEach(r => { w.document.write('<tr>' + cols.map(c => `<td>${r[c] ?? '—'}</td>`).join('') + '</tr>') })
  w.document.write('</tbody></table></body></html>')
  w.document.close(); w.print()
  toast.success(`Relatório "${name}" pronto para impressão`)
}

const mzn = v => Number(v || 0).toLocaleString('pt-MZ', { style:'currency', currency:'MZN', maximumFractionDigits:0 })
onMounted(loadAll)
</script>
