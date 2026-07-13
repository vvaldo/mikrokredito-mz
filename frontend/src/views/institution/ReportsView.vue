<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Relatórios</h1>
      <p>Exportação de dados da sua instituição — clientes, pedidos, pagamentos e notificações.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="loadAll">Actualizar dados</button>
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi good">
        <div class="label">Clientes</div>
        <div class="value">{{ counts.clients }}</div>
        <div class="note">Registados</div>
      </div>
      <div class="kpi">
        <div class="label">Pedidos</div>
        <div class="value">{{ counts.loans }}</div>
        <div class="note">Total</div>
      </div>
      <div class="kpi warn">
        <div class="label">Pagamentos</div>
        <div class="value">{{ counts.payments }}</div>
        <div class="note">Confirmados</div>
      </div>
      <div class="kpi">
        <div class="label">Notificações</div>
        <div class="value">{{ counts.notifs }}</div>
        <div class="note">Enviadas</div>
      </div>
    </div>

    <div class="modern-card">
      <h2>Exportar relatórios</h2>
      <p class="muted" style="margin-bottom:16px">Dados reais da sua instituição, exportados directamente da base de dados.</p>
      <table class="modern-table">
        <thead><tr><th>Módulo</th><th>Descrição</th><th>Registos</th><th>Exportar</th></tr></thead>
        <tbody>
          <tr v-for="r in reports" :key="r.key">
            <td><strong>{{ r.icon }} {{ r.name }}</strong></td>
            <td class="muted">{{ r.desc }}</td>
            <td><span class="status-pill st-approved" v-if="r.count !== null">{{ r.count }}</span><span class="muted" v-else>—</span></td>
            <td>
              <div class="action-row">
                <button class="btn btn-sm btn-primary" :class="{ loading: r.loading }" :disabled="r.loading" @click="exportReport(r, 'csv')">{{ r.loading ? '' : 'CSV' }}</button>
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
const counts = ref({ clients: 0, loans: 0, payments: 0, notifs: 0 })
const reports = ref([
  { key:'clients',  name:'Clientes',     desc:'Base de clientes com KYC e salário',        icon:'👥', count:null, loading:false },
  { key:'loans',    name:'Pedidos',       desc:'Pedidos e empréstimos com estado e valor',   icon:'📋', count:null, loading:false },
  { key:'payments', name:'Pagamentos',    desc:'Transacções confirmadas e falhadas',         icon:'💳', count:null, loading:false },
  { key:'notifications',name:'Notificações', desc:'Logs de envio Email/SMS/WhatsApp',       icon:'🔔', count:null, loading:false },
])

async function loadAll() {
  try {
    const [c,l,p,n] = await Promise.allSettled([
      api.get('/clients', {params:{limit:1}}),
      api.get('/loans', {params:{limit:1}}),
      api.get('/payments', {params:{limit:1}}),
      api.get('/notifications/logs', {params:{limit:1}}),
    ])
    if(c.status==='fulfilled') { counts.value.clients=c.value.data.meta?.total||0; reports.value[0].count=counts.value.clients }
    if(l.status==='fulfilled') { counts.value.loans=l.value.data.meta?.total||0;   reports.value[1].count=counts.value.loans }
    if(p.status==='fulfilled') { counts.value.payments=p.value.data.meta?.total||0;reports.value[2].count=counts.value.payments }
    if(n.status==='fulfilled') { counts.value.notifs=n.value.data.meta?.total||0;  reports.value[3].count=counts.value.notifs }
  } catch(e) {}
}

async function exportReport(r, fmt) {
  r.loading = true
  try {
    let rows = []
    if (r.key === 'clients') {
      const { data } = await api.get('/clients', { params: { limit: 5000 } })
      rows = (data.data||[]).map(x => ({ Nome: x.User?.full_name||'—', Email: x.User?.email||'—', Telefone: x.User?.phone||'—', KYC: x.kyc_status, Província: x.province||'—', Actividade: x.activity_type||'—' }))
    } else if (r.key === 'loans') {
      const { data } = await api.get('/loans', { params: { limit: 5000 } })
      rows = (data.data||[]).map(x => ({ Ref: x.reference||x.id, Cliente: x.Client?.User?.full_name||'—', Produto: x.CreditProduct?.name||'—', Valor: x.requested_amount, Estado: x.status, Data: x.created_at ? new Date(x.created_at).toLocaleDateString('pt-MZ') : '—' }))
    } else if (r.key === 'payments') {
      const { data } = await api.get('/payments', { params: { limit: 5000 } })
      rows = (data.data||[]).map(x => ({ Ref: x.reference, Valor: x.amount, Método: x.method, Estado: x.status, Data: x.created_at ? new Date(x.created_at).toLocaleDateString('pt-MZ') : '—' }))
    } else if (r.key === 'notifications') {
      const { data } = await api.get('/notifications/logs', { params: { limit: 5000 } })
      rows = (data.data||[]).map(x => ({ Canal: x.channel, Evento: x.event, Destinatário: x.recipient_email||x.recipient_phone||'—', Estado: x.status, Tentativas: x.attempts, Data: x.created_at ? new Date(x.created_at).toLocaleString('pt-MZ') : '—' }))
    }
    r.count = rows.length
    if (fmt === 'csv') downloadCSV(rows, r.name)
    else printReport(rows, r.name)
  } catch(e) { toast.error('Erro ao exportar: ' + (e.response?.data?.message || e.message)) }
  finally { r.loading = false }
}

function downloadCSV(rows, name) {
  if (!rows.length) { toast.warning('Sem dados'); return }
  const cols = Object.keys(rows[0])
  const csv = cols.map(c => `"${c}"`).join(',') + '\n' + rows.map(r => cols.map(c => `"${(r[c]??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `${name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  toast.success(`${rows.length} linhas exportadas`)
}

function printReport(rows, name) {
  if (!rows.length) { toast.warning('Sem dados'); return }
  const cols = Object.keys(rows[0])
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>${name}</title><style>body{font-family:Arial,sans-serif;font-size:11px;padding:20px}table{width:100%;border-collapse:collapse}th{background:#185FA5;color:#fff;padding:5px 7px}td{padding:5px 7px;border-bottom:1px solid #e2e8f0}tr:nth-child(even) td{background:#f8fafc}</style></head><body>`)
  w.document.write(`<h2>${name} — ${new Date().toLocaleDateString('pt-MZ')}</h2>`)
  w.document.write('<table><thead><tr>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>')
  rows.forEach(r => { w.document.write('<tr>'+cols.map(c=>`<td>${r[c]??'—'}</td>`).join('')+'</tr>') })
  w.document.write('</tbody></table></body></html>')
  w.document.close(); w.print()
}

onMounted(loadAll)
</script>
