<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Auditoria</h1>
      <p>Registo de todas as acções críticas — aprovações, alterações, acessos e operações do sistema.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="load">Actualizar</button>
        <button class="btn" @click="exportCSV">Exportar CSV</button>
        <button class="btn" @click="exportPDF">Imprimir / PDF</button>
      </div>
    </section>

    <!-- Filters -->
    <div class="modern-card" style="padding:14px;margin-bottom:14px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input class="input search" v-model="q" placeholder="Pesquisar utilizador ou acção…" style="flex:1;min-width:180px">
        <select class="input" v-model="filterRole" style="width:150px">
          <option value="">Todos os roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="inst_admin">Admin Inst.</option>
          <option value="inst_agent">Agente</option>
          <option value="client">Cliente</option>
          <option value="system">Sistema</option>
        </select>
        <select class="input" v-model="filterEntity" style="width:140px">
          <option value="">Todas entidades</option>
          <option value="Loan">Empréstimo</option>
          <option value="Client">Cliente</option>
          <option value="Payment">Pagamento</option>
          <option value="Institution">Instituição</option>
          <option value="Product">Produto</option>
        </select>
        <button class="btn" @click="load" :class="{ loading: loading }">{{ loading ? '' : 'Aplicar' }}</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi good">
        <div class="label">Total de eventos</div>
        <div class="value">{{ rows.length }}</div>
        <div class="note">Carregados</div>
      </div>
      <div class="kpi">
        <div class="label">Aprovações</div>
        <div class="value">{{ rows.filter(r => r.action?.includes('approv') || r.action?.includes('aprovado')).length }}</div>
        <div class="note">Este período</div>
      </div>
      <div class="kpi warn">
        <div class="label">Alterações</div>
        <div class="value">{{ rows.filter(r => r.action?.includes('updat') || r.action?.includes('edit')).length }}</div>
        <div class="note">Dados editados</div>
      </div>
      <div class="kpi danger">
        <div class="label">Utilizadores</div>
        <div class="value">{{ new Set(rows.map(r => r.user_id)).size }}</div>
        <div class="note">Distintos activos</div>
      </div>
    </div>

    <div class="modern-card" id="audit-print-area">
      <div class="table-head">
        <div><h2>Registo de auditoria</h2><p class="muted">{{ filtered.length }} eventos encontrados</p></div>
      </div>
      <div v-if="loading" style="padding:32px;text-align:center;color:var(--mk-text-2)">A carregar…</div>
      <div v-else-if="filtered.length === 0" class="empty-state">Nenhum evento encontrado.</div>
      <table v-else class="modern-table">
        <thead>
          <tr>
            <th>Utilizador</th>
            <th>Role</th>
            <th>Acção</th>
            <th>Entidade</th>
            <th>Data/Hora</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.id">
            <td>
              <strong>{{ r.user_name || '—' }}</strong>
              <br><span class="muted">{{ r.user_id?.slice(0, 8) }}…</span>
            </td>
            <td>
              <span class="status-pill" :class="roleClass(r.user_role)">{{ r.user_role || '—' }}</span>
            </td>
            <td style="max-width:280px;word-break:break-word">{{ r.action || r.description || '—' }}</td>
            <td><span class="status-pill st-submitted">{{ r.entity || '—' }}</span></td>
            <td class="muted" style="white-space:nowrap">{{ fmt(r.created_at) }}</td>
            <td class="muted">{{ r.ip_address || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="meta.total > meta.limit" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;font-size:12px;color:var(--mk-text-2)">
        <span>{{ meta.total }} total · página {{ meta.page }} de {{ Math.ceil(meta.total/meta.limit) }}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" :disabled="meta.page <= 1" @click="changePage(-1)">‹ Anterior</button>
          <button class="btn btn-sm" :disabled="meta.page >= Math.ceil(meta.total/meta.limit)" @click="changePage(1)">Próxima ›</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const loading = ref(false)
const rows    = ref([])
const q       = ref('')
const filterRole   = ref('')
const filterEntity = ref('')
const meta = ref({ total: 0, page: 1, limit: 50 })

const filtered = computed(() => {
  let data = rows.value
  if (q.value) {
    const s = q.value.toLowerCase()
    data = data.filter(r =>
      (r.user_name || '').toLowerCase().includes(s) ||
      (r.action || r.description || '').toLowerCase().includes(s)
    )
  }
  if (filterRole.value) data = data.filter(r => r.user_role === filterRole.value)
  if (filterEntity.value) data = data.filter(r => r.entity === filterEntity.value)
  return data
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/audit', {
      params: { page: meta.value.page, limit: meta.value.limit }
    })
    rows.value = data.data || []
    meta.value = { ...meta.value, ...(data.meta || {}) }
  } catch (e) {
    toast.error('Erro ao carregar auditoria')
    rows.value = []
  } finally { loading.value = false }
}

function changePage(delta) {
  meta.value.page = Math.max(1, meta.value.page + delta)
  load()
}

function exportCSV() {
  const cols = ['user_name','user_role','action','entity','ip_address','created_at']
  const header = 'Utilizador,Role,Acção,Entidade,IP,Data'
  const csvRows = filtered.value.map(r =>
    cols.map(c => `"${(r[c] || '').toString().replace(/"/g, '""')}"`).join(',')
  )
  const blob = new Blob([header + '\n' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

function exportPDF() {
  const area = document.getElementById('audit-print-area')
  if (!area) return window.print()
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>Auditoria — MikroKrédito MZ</title>
    <style>body{font-family:sans-serif;font-size:12px;padding:20px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f1f5f9;font-weight:600}</style></head><body>`)
  w.document.write(`<h2>Auditoria — ${new Date().toLocaleDateString('pt-MZ')}</h2>`)
  w.document.write(area.innerHTML)
  w.document.write('</body></html>')
  w.document.close()
  w.print()
}

const fmt = v => v ? new Date(v).toLocaleString('pt-MZ') : '—'
const roleClass = r => ({ super_admin:'st-approved', inst_admin:'st-disbursed', inst_agent:'st-submitted', client:'st-pending', system:'st-queued' }[r] || 'st-pending')

onMounted(load)
</script>
