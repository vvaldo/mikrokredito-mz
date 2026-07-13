<template>
  <section class="audit-page">
    <div class="audit-hero">
      <div><h1>Auditoria</h1><p>Rastreio de eventos, utilizadores, entidades, IP e valores alterados.</p></div>
      <div class="export-actions"><button class="btn btn-blue" @click="loadAudit">Actualizar</button><button class="btn" @click="downloadCsv">Exportar CSV/Excel</button><button class="btn btn-red-soft" @click="downloadPdf">Baixar PDF</button></div>
    </div>

    <div class="filter-bar audit-card">
      <label>Acção<input v-model="filters.action" placeholder="login, update, approve..." /></label>
      <label>Entidade<input v-model="filters.entity" placeholder="users, loans..." /></label>
      <label>De<input v-model="filters.from" type="date" /></label>
      <label>Até<input v-model="filters.to" type="date" /></label>
      <button class="btn btn-blue" @click="loadAudit">Filtrar</button>
    </div>

    <div class="audit-card">
      <div class="audit-section-title"><span>Eventos registados</span><span class="badge badge-blue">{{ meta.total || rows.length }} registos</span></div>
      <div v-if="loading" class="text-muted">A carregar...</div>
      <div v-else-if="!rows.length" class="empty-state"><div class="empty-state-title">Sem auditoria visível</div><div class="empty-state-sub">Confirme se o backend está a gravar audit_logs e se o perfil tem permissão.</div></div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Utilizador</th><th>Perfil</th><th>Acção</th><th>Entidade</th><th>IP</th><th>Antes</th><th>Depois</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td class="td-nowrap">{{ formatDate(row.created_at || row.createdAt) }}</td>
              <td>{{ row.user_name || row.actor_name || row.user_id || '-' }}</td>
              <td>{{ row.user_role || row.role || '-' }}</td>
              <td><span class="badge badge-blue">{{ row.action || '-' }}</span></td>
              <td>{{ row.entity || row.entity_type || '-' }}</td>
              <td class="td-nowrap">{{ row.ip_address || row.ip || '-' }}</td>
              <td><pre class="audit-json">{{ pretty(row.old_values || row.before || row.previous) }}</pre></td>
              <td><pre class="audit-json">{{ pretty(row.new_values || row.after || row.current) }}</pre></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '@/services/api'
import { exportCsv, exportHtmlPdf } from '@/utils/exporters'

const loading = ref(false)
const rows = ref([])
const meta = ref({})
const filters = reactive({ action: '', entity: '', from: '', to: '' })

function formatDate(value) { return value ? new Date(value).toLocaleString('pt-MZ') : '-' }
function pretty(value) {
  if (!value) return '-'
  if (typeof value === 'string') return value
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
function csvRows() {
  return rows.value.map(r => ({ Data: formatDate(r.created_at || r.createdAt), Utilizador: r.user_name || r.actor_name || r.user_id || '-', Perfil: r.user_role || r.role || '-', Accao: r.action || '-', Entidade: r.entity || r.entity_type || '-', IP: r.ip_address || r.ip || '-', Antes: pretty(r.old_values || r.before || r.previous), Depois: pretty(r.new_values || r.after || r.current) }))
}
async function loadAudit() {
  loading.value = true
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
    const { data } = await api.get('/audit', { params })
    rows.value = data.data || []
    meta.value = data.meta || {}
  } finally { loading.value = false }
}
function downloadCsv() { exportCsv('auditoria.csv', csvRows()) }
function downloadPdf() {
  const data = csvRows()
  const headers = data[0] ? Object.keys(data[0]) : []
  const html = `<h1>MicroCredit SYSTEM — Auditoria</h1><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${data.map(r => `<tr>${headers.map(h => `<td>${String(r[h] ?? '').slice(0, 500)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  exportHtmlPdf('Auditoria MicroCredit SYSTEM', html)
}
onMounted(loadAudit)
</script>
