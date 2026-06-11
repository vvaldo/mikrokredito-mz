<template>
  <div class="content-inner" v-if="client">

    <!-- Header -->
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:14px">
        <router-link to="/institution/clients" class="btn btn-sm">← Voltar</router-link>
        <div>
          <h1 class="page-title">{{ client.User?.full_name }}</h1>
          <p class="page-sub">KYC: <span :class="kyc.cls">{{ kyc.label }}</span> · Registado em {{ fmt(client.created_at) }}</p>
        </div>
      </div>
      <div class="page-actions">
        <button class="btn btn-sm" @click="editMode = !editMode">
          {{ editMode ? '✕ Cancelar edição' : '✏️ Editar dados' }}
        </button>
        <button class="btn btn-sm btn-blue-soft" @click="downloadProfile">⬇ Baixar perfil PDF</button>
        <button v-if="editMode" class="btn btn-primary" @click="saveClient" :class="{loading:saving}">
          {{ saving ? '' : '💾 Guardar' }}
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid-stat mb-4">
      <div class="stat-card">
        <div class="stat-label">Empréstimos activos</div>
        <div class="stat-value blue">{{ activeLoans.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total emprestado</div>
        <div class="stat-value">{{ mzn(totalBorrowed) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total pago</div>
        <div class="stat-value ok">{{ mzn(totalPaid) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Saldo em dívida</div>
        <div class="stat-value" :class="totalDue > 0 ? 'red' : 'ok'">{{ mzn(totalDue) }}</div>
      </div>
    </div>

    <div class="grid-2 mb-4">
      <!-- Personal data card -->
      <div class="card">
        <div class="card-title">👤 Dados pessoais
          <div style="display:flex;gap:6px">
            <span class="badge" :class="kyc.cls" style="font-size:11px">KYC: {{ kyc.label }}</span>
            <select v-if="editMode" class="form-select" style="width:140px;font-size:11px" v-model="form.kyc_status">
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>
        </div>

        <!-- Photo -->
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <div style="position:relative">
            <div class="avatar xl" :style="client.photo_url ? 'background:transparent' : ''">
              <img v-if="client.photo_url || form.photoBase64" :src="form.photoBase64 || client.photo_url" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
              <span v-else>{{ initials(client.User?.full_name) }}</span>
            </div>
            <button v-if="editMode" class="btn btn-xs btn-blue-soft" style="position:absolute;bottom:-4px;right:-4px;border-radius:50%;width:22px;height:22px;padding:0" @click="$refs.photoInput.click()">+</button>
          </div>
          <div>
            <div style="font-size:15px;font-weight:700">{{ client.User?.full_name }}</div>
            <div style="font-size:12px;color:var(--mk-text-2)">{{ client.User?.email }}</div>
            <div style="font-size:12px;color:var(--mk-text-2)">{{ client.User?.phone }}</div>
          </div>
        </div>
        <input ref="photoInput" type="file" accept="image/*" style="display:none" @change="onPhoto" />

        <template v-if="!editMode">
          <div class="detail-grid">
            <div><span>Data de nascimento</span><strong>{{ fmt(client.date_of_birth) || '—' }}</strong></div>
            <div><span>Género</span><strong>{{ client.gender === 'M' ? 'Masculino' : client.gender === 'F' ? 'Feminino' : '—' }}</strong></div>
            <div><span>Estado civil</span><strong>{{ maritalLabel(client.marital_status) }}</strong></div>
            <div><span>Nacionalidade</span><strong>{{ client.nationality || '—' }}</strong></div>
            <div><span>BI / Passaporte</span><strong>{{ client.bi_number || '—' }}</strong></div>
            <div><span>NUIT</span><strong>{{ client.nuit || '—' }}</strong></div>
            <div><span>Emissão doc.</span><strong>{{ fmt(client.doc_issue_date) || '—' }}</strong></div>
            <div><span>Validade doc.</span><strong>{{ fmt(client.doc_expiry_date) || '—' }}</strong></div>
            <div><span>Província</span><strong>{{ client.province || '—' }}</strong></div>
            <div><span>Distrito</span><strong>{{ client.district || '—' }}</strong></div>
            <div><span>Morada</span><strong>{{ client.address || '—' }}</strong></div>
            <div><span>Profissão</span><strong>{{ client.activity_type || '—' }}</strong></div>
            <div><span>Empregador</span><strong>{{ client.employer_name || '—' }}</strong></div>
            <div><span>Rendimento mensal</span><strong style="color:var(--mk-text-3)">Restrito</strong></div>
          </div>
        </template>

        <template v-else>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Nome completo</label><input class="form-input" v-model="form.full_name"/></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" v-model="form.email" type="email"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Telefone</label><input class="form-input" v-model="form.phone"/></div>
            <div class="form-group"><label class="form-label">Data nascimento</label><input class="form-input" type="date" v-model="form.date_of_birth"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">BI / Passaporte</label><input class="form-input" v-model="form.bi_number"/></div>
            <div class="form-group"><label class="form-label">NUIT</label><input class="form-input" v-model="form.nuit"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Emissão doc.</label><input class="form-input" type="date" v-model="form.doc_issue_date"/></div>
            <div class="form-group"><label class="form-label">Validade doc.</label><input class="form-input" type="date" v-model="form.doc_expiry_date"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Província</label><input class="form-input" v-model="form.province"/></div>
            <div class="form-group"><label class="form-label">Distrito</label><input class="form-input" v-model="form.district"/></div>
          </div>
          <div class="form-group"><label class="form-label">Morada</label><input class="form-input" v-model="form.address"/></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Profissão</label><input class="form-input" v-model="form.activity_type"/></div>
            <div class="form-group"><label class="form-label">Empregador</label><input class="form-input" v-model="form.employer_name"/></div>
          </div>
          <div class="alert alert-warning mt-2" style="font-size:11px">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1L11 10H1L6 1z"/></svg>
            Salário não pode ser alterado pelo gestor. Apenas o cliente pode actualizar.
          </div>
        </template>
      </div>

      <!-- Documents card -->
      <div class="card">
        <div class="card-title">📄 Documentos do cliente
          <button class="btn btn-sm btn-blue-soft" @click="$refs.docInput.click()">+ Upload</button>
        </div>
        <input ref="docInput" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style="display:none" @change="uploadDocs" />

        <div v-if="!docs.length" class="upload-zone" style="height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px"
          @click="$refs.docInput.click()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style="font-size:12px;color:var(--mk-text-2)">Clique para carregar documentos (PDF, JPG, PNG)</span>
        </div>

        <div v-for="doc in docs" :key="doc.id" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(148,163,184,.06)">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">{{ docIcon(doc.type || doc.file_name) }}</span>
            <div>
              <div style="font-size:12px;font-weight:600">{{ docLabel(doc.type) }}</div>
              <div style="font-size:11px;color:var(--mk-text-2)">{{ doc.original_name || doc.file_name }}</div>
              <div style="font-size:10px;color:var(--mk-text-3)">{{ fmt(doc.created_at) }}</div>
            </div>
          </div>
          <div style="display:flex;gap:5px">
            <span class="badge" :class="doc.status === 'verified' ? 'badge-approved' : 'badge-warning'" style="font-size:10px">
              {{ doc.status === 'verified' ? 'Verificado' : 'Pendente' }}
            </span>
            <button class="btn btn-xs btn-blue-soft" @click="downloadDoc(doc)">⬇</button>
          </div>
        </div>
        <div v-if="docs.length > 0" style="margin-top:8px">
          <button class="btn btn-sm btn-blue-soft" style="width:100%" @click="$refs.docInput.click()">+ Adicionar mais documentos</button>
        </div>
      </div>
    </div>

    <!-- Loans history -->
    <div class="card mb-4">
      <div class="card-title">💳 Histórico de empréstimos</div>
      <div v-if="!loans.length" style="padding:20px;text-align:center;color:var(--mk-text-2);font-size:12px">
        Sem empréstimos registados para este cliente.
      </div>
      <div class="table-wrap" v-else>
        <table>
          <thead><tr><th>Referência</th><th>Valor</th><th>Produto</th><th>Prestação</th><th>Progresso</th><th>Estado</th><th>Data</th></tr></thead>
          <tbody>
            <tr v-for="l in loans" :key="l.id">
              <td><span class="ref-chip">{{ l.reference || l.id?.slice(0,8) }}</span></td>
              <td style="font-weight:600;font-size:12px">{{ mzn(l.requested_amount) }}</td>
              <td class="td-muted">{{ l.CreditProduct?.name || '—' }}</td>
              <td style="font-size:12px">{{ mzn(l.monthly_installment) }}/mês</td>
              <td style="min-width:120px">
                <div style="display:flex;align-items:center;gap:7px">
                  <div class="progress" style="flex:1">
                    <div class="progress-fill" :style="{ width: loanProgress(l) + '%', background: l.status === 'overdue' ? 'var(--grad-danger)' : 'var(--grad-primary)' }"></div>
                  </div>
                  <span style="font-size:10px;color:var(--mk-text-2)">{{ loanProgress(l) }}%</span>
                </div>
              </td>
              <td><span class="badge" :class="badgeCls(l.status)" style="font-size:10px">{{ statusLabel(l.status) }}</span></td>
              <td class="td-muted">{{ fmt(l.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Guarantors -->
    <div class="card" v-if="client.guarantors?.length">
      <div class="card-title">🤝 Avalistas</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
        <div v-for="(g,i) in client.guarantors" :key="i"
          style="padding:12px;border:1px solid rgba(26,111,245,.15);border-radius:var(--mk-r);background:rgba(26,111,245,.04)">
          <div style="font-size:12px;font-weight:600">{{ g.name }}</div>
          <div style="font-size:11px;color:var(--mk-text-2)">{{ g.phone }}</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Loading state -->
  <div v-else-if="loading" style="display:flex;align-items:center;justify-content:center;height:200px">
    <div class="spinner-ring"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useBrandingStore } from '@/stores/branding'
import api from '@/services/api'

const route = useRoute(), router = useRouter(), toast = useToast()
const brand = useBrandingStore()
const loading = ref(true), saving = ref(false), editMode = ref(false)
const client = ref(null), docs = ref([]), loans = ref([])
const form = ref({})

const activeLoans  = computed(() => loans.value.filter(l => ['active','disbursed','overdue'].includes(l.status)))
const totalBorrowed= computed(() => loans.value.reduce((s,l) => s + parseFloat(l.requested_amount||0), 0))
const totalPaid    = computed(() => loans.value.reduce((s,l) => s + parseFloat(l.Loan?.total_paid||0), 0))
const totalDue     = computed(() => loans.value.reduce((s,l) => s + parseFloat(l.Loan?.outstanding_balance||0), 0))

const kyc = computed(() => {
  const m = { approved:{cls:'badge-approved',label:'Aprovado'}, rejected:{cls:'badge-rejected',label:'Rejeitado'}, blocked:{cls:'badge-danger',label:'Bloqueado'}, pending:{cls:'badge-warning',label:'Pendente'} }
  return m[client.value?.kyc_status] || m.pending
})

async function load() {
  loading.value = true
  try {
    const id = route.params.id
    const [cRes, dRes, lRes] = await Promise.allSettled([
      api.get(`/clients/${id}`),
      api.get(`/documents`, { params: { client_id: id } }),
      api.get(`/loans`, { params: { client_id: id } }),
    ])
    if (cRes.status === 'fulfilled') {
      client.value = cRes.value.data.data
      form.value = {
        full_name: client.value.User?.full_name || '',
        email: client.value.User?.email || '',
        phone: client.value.User?.phone || '',
        date_of_birth: client.value.date_of_birth?.slice(0,10) || '',
        bi_number: client.value.bi_number || '',
        nuit: client.value.nuit || '',
        doc_issue_date: client.value.doc_issue_date?.slice(0,10) || '',
        doc_expiry_date: client.value.doc_expiry_date?.slice(0,10) || '',
        province: client.value.province || '',
        district: client.value.district || '',
        address: client.value.address || '',
        activity_type: client.value.activity_type || '',
        employer_name: client.value.employer_name || '',
        kyc_status: client.value.kyc_status || 'pending',
        photoBase64: '',
      }
    }
    if (dRes.status === 'fulfilled') docs.value = dRes.value.data.data || []
    if (lRes.status === 'fulfilled') loans.value = lRes.value.data.data || []
  } catch(e) { toast.error('Erro ao carregar cliente') }
  finally { loading.value = false }
}

async function saveClient() {
  saving.value = true
  try {
    const id = route.params.id
    await api.put(`/clients/${id}`, {
      kyc_status:     form.value.kyc_status,
      bi_number:      form.value.bi_number,
      nuit:           form.value.nuit,
      doc_issue_date: form.value.doc_issue_date,
      doc_expiry_date:form.value.doc_expiry_date,
      province:       form.value.province,
      district:       form.value.district,
      address:        form.value.address,
      activity_type:  form.value.activity_type,
      employer_name:  form.value.employer_name,
      photoBase64:    form.value.photoBase64 || undefined,
    })
    // Update user data
    if (client.value.User?.id) {
      await api.put(`/users/${client.value.User.id}`, {
        full_name: form.value.full_name,
        phone:     form.value.phone,
      }).catch(() => {})
    }
    toast.success('✅ Dados do cliente actualizados')
    editMode.value = false
    await load()
  } catch(e) {
    toast.error(e.response?.data?.message || 'Erro ao guardar')
  } finally { saving.value = false }
}

async function uploadDocs(e) {
  const files = Array.from(e.target.files)
  for (const file of files) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('client_id', route.params.id)
    fd.append('type', guessDocType(file.name))
    try {
      await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`${file.name} carregado`)
    } catch(e) {
      toast.error(`Erro ao carregar ${file.name}`)
    }
  }
  await load()
}

async function downloadDoc(doc) {
  try {
    const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a'); a.href = url
    a.download = doc.original_name || doc.file_name || 'documento'
    a.click(); URL.revokeObjectURL(url)
  } catch(e) { toast.error('Erro ao baixar documento') }
}

function downloadProfile() {
  const c = client.value
  if (!c) return
  const w = window.open('', '_blank')
  const logo = brand.logoUrl ? `<img src="${brand.logoUrl}" style="height:40px;object-fit:contain">` : ''
  const loanRows = loans.value.map(l => `
    <tr>
      <td>${l.reference||l.id?.slice(0,8)}</td>
      <td>${mzn(l.requested_amount)}</td>
      <td>${l.CreditProduct?.name||'—'}</td>
      <td>${statusLabel(l.status)}</td>
      <td>${fmt(l.created_at)}</td>
    </tr>`).join('')

  w.document.write(`<!DOCTYPE html><html><head><title>Perfil — ${c.User?.full_name}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;padding:28px;color:#1a202c;max-width:800px;margin:0 auto}
    h1{font-size:20px;font-weight:700;margin:12px 0 4px} h2{font-size:14px;font-weight:600;color:#185FA5;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #185FA5;padding-bottom:12px;margin-bottom:16px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
    .field{padding:8px;background:#f8fafc;border-radius:4px}
    .field label{display:block;font-size:10px;color:#718096;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
    .field strong{font-size:12px;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
    th{background:#185FA5;color:#fff;padding:6px 8px;text-align:left}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
    .badge{padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600}
    .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#718096;display:flex;justify-content:space-between}
    @media print{button{display:none}}
  </style></head><body>
  <div class="header">
    <div>${logo}<h1>${c.User?.full_name}</h1><p style="color:#718096">${c.User?.email} · ${c.User?.phone}</p></div>
    <div style="text-align:right;font-size:11px;color:#718096"><strong>${brand.name}</strong><br>${brand.tagline}<br>Gerado: ${new Date().toLocaleString('pt-MZ')}</div>
  </div>
  <h2>Dados Pessoais</h2>
  <div class="grid">
    <div class="field"><label>Data de nascimento</label><strong>${fmt(c.date_of_birth)||'—'}</strong></div>
    <div class="field"><label>Género</label><strong>${c.gender==='M'?'Masculino':c.gender==='F'?'Feminino':'—'}</strong></div>
    <div class="field"><label>BI / Passaporte</label><strong>${c.bi_number||'—'}</strong></div>
    <div class="field"><label>NUIT</label><strong>${c.nuit||'—'}</strong></div>
    <div class="field"><label>Emissão</label><strong>${fmt(c.doc_issue_date)||'—'}</strong></div>
    <div class="field"><label>Validade</label><strong>${fmt(c.doc_expiry_date)||'—'}</strong></div>
    <div class="field"><label>Província</label><strong>${c.province||'—'}</strong></div>
    <div class="field"><label>Distrito</label><strong>${c.district||'—'}</strong></div>
    <div class="field"><label>Morada</label><strong>${c.address||'—'}</strong></div>
    <div class="field"><label>Profissão</label><strong>${c.activity_type||'—'}</strong></div>
    <div class="field"><label>Empregador</label><strong>${c.employer_name||'—'}</strong></div>
    <div class="field"><label>KYC</label><strong>${c.kyc_status||'—'}</strong></div>
  </div>
  <h2>Histórico de Empréstimos (${loans.value.length})</h2>
  ${loans.value.length ? `<table><thead><tr><th>Referência</th><th>Valor</th><th>Produto</th><th>Estado</th><th>Data</th></tr></thead><tbody>${loanRows}</tbody></table>` : '<p style="color:#718096">Sem empréstimos registados.</p>'}
  <h2>Documentos Submetidos (${docs.value.length})</h2>
  ${docs.value.map(d=>`<div class="field" style="margin-bottom:4px"><label>${docLabel(d.type)}</label><strong>${d.original_name||d.file_name||'—'} — ${d.status||'pendente'}</strong></div>`).join('')||'<p style="color:#718096">Sem documentos.</p>'}
  <div class="footer"><span>${brand.poweredBy}</span><span>CONFIDENCIAL — ${brand.name}</span></div>
  </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 400)
  toast.success('Perfil PDF aberto para impressão')
}

async function onPhoto(e) {
  const file = e.target.files[0]
  if (!file) return
  const r = new FileReader()
  r.onload = ev => { form.value.photoBase64 = ev.target.result }
  r.readAsDataURL(file)
}

const mzn = v => Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})
const fmt  = v => v ? new Date(v).toLocaleDateString('pt-MZ') : '—'
const initials = n => n?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?'
const loanProgress = l => {
  const paid = l.Loan?.installments_paid || 0
  const total = l.term_months || 1
  return Math.min(100, Math.round(paid/total*100))
}
const badgeCls = s => ({approved:'badge-approved',disbursed:'badge-disbursed',active:'badge-disbursed',submitted:'badge-submitted',under_review:'badge-review',rejected:'badge-rejected',overdue:'badge-overdue',completed:'badge-completed'}[s]||'badge-neutral')
const statusLabel = s => ({submitted:'Submetido',under_review:'Em análise',approved:'Aprovado',rejected:'Rejeitado',disbursed:'Desembolsado',active:'Activo',overdue:'Em atraso',completed:'Liquidado',cancelled:'Cancelado',draft:'Rascunho'}[s]||s)
const maritalLabel = s => ({single:'Solteiro(a)',married:'Casado(a)',divorced:'Divorciado(a)',widowed:'Viúvo(a)'}[s]||s||'—')
const guessDocType = name => {
  const n = name.toLowerCase()
  if (n.includes('bi') || n.includes('id')) return 'bi'
  if (n.includes('nuit')) return 'nuit'
  if (n.includes('salario') || n.includes('income')) return 'income_proof'
  if (n.includes('banco') || n.includes('extract')) return 'bank_statement'
  return 'other'
}
const docLabel = t => ({bi:'BI / Passaporte',nuit:'NUIT',bank_statement:'Extracto bancário',income_proof:'Comprovativo de rendimento',business_photo:'Foto do negócio',contract:'Contrato',land_title:'Título de terra',other:'Outro documento'}[t]||t||'Documento')
const docIcon  = n => {
  const s = (n||'').toLowerCase()
  if (s.includes('pdf')) return '📄'
  if (s.endsWith('.jpg')||s.endsWith('.jpeg')||s.endsWith('.png')) return '🖼️'
  return '📎'
}
onMounted(load)
</script>
<style scoped>
.spinner-ring { width:28px;height:28px;border-radius:50%;border:3px solid rgba(26,111,245,.2);border-top-color:var(--blue-600);animation:spin .6s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
