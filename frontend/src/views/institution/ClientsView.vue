<template>
  <div class="modern-page">
    <section class="modern-hero"><h1>Clientes</h1><p>Lista real da base de dados, com KYC, documentos, CRC e bloqueio/desbloqueio.</p><div class="hero-actions"><button class="btn btn-primary" @click="openCreate">+ Novo cliente</button><button class="btn" @click="load">Actualizar</button><button class="btn" @click="exportCsv">Exportar</button></div></section>
    <div class="kpi-grid"><div class="kpi good"><div class="label">Clientes</div><div class="value">{{ clients.length }}</div><div class="note">Base de dados</div></div><div class="kpi"><div class="label">KYC completo</div><div class="value">{{ complete }}</div><div class="note">Aprovados</div></div><div class="kpi warn"><div class="label">KYC bloqueado/incompleto</div><div class="value">{{ blockedKyc }}</div><div class="note">Atenção</div></div><div class="kpi danger"><div class="label">Bloqueados</div><div class="value">{{ blockedUsers }}</div><div class="note">Conta bloqueada</div></div></div>
    <div class="modern-card"><div class="table-head"><div><h2>Lista de clientes</h2><p class="muted">Não é permitido apagar cliente; apenas bloquear/desbloquear.</p></div><input class="input search" v-model="q" @keyup.enter="load" placeholder="Pesquisar cliente, telefone, email"></div>
      <div class="table-wrap">
      <table class="modern-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Salário</th><th>KYC</th><th>CRC</th><th>Docs</th><th>Acções</th></tr></thead><tbody><tr v-for="c in filtered" :key="c.id"><td><strong>{{ c.User?.full_name }}</strong><br><span class="muted">{{ c.User?.email }} · NUIT {{ c.nuit || '—' }}</span></td><td>{{ c.User?.phone || '—' }}</td><td>{{ mzn(c.monthly_income) }}</td><td><StatusBadge :status="c.kyc_status" /></td><td>{{ crcLabel(c.crc_status) }}</td><td>{{ c.Documents?.length || 0 }}</td><td><div class="action-row"><button class="btn btn-sm" @click="viewClient(c)">Visualizar</button><button class="btn btn-sm btn-blue-soft" @click="editClient(c)">Editar</button><button class="btn btn-sm" @click="viewDocs(c)">Docs</button><button class="btn btn-sm btn-primary" @click="createLoan(c)">Novo pedido</button><button class="btn btn-sm btn-danger-soft" @click="toggleBlock(c)">{{ c.User?.status==='blocked'?'Desbloquear':'Bloquear' }}</button></div></td></tr></tbody></table>
      </div>
    </div>

    <div v-if="modal" class="modal-backdrop" @click.self="closeModal"><div class="mk-modal wide"><div class="mk-modal-head"><h2>{{ title }}</h2><button class="modal-x" @click="closeModal">×</button></div>
      <div v-if="modal==='view'">
        <div class="detail-grid mb-4"><div><span class="muted">Nome</span><strong>{{ selected.User?.full_name }}</strong></div><div><span class="muted">Email</span><strong>{{ selected.User?.email }}</strong></div><div><span class="muted">Telefone</span><strong>{{ selected.User?.phone }}</strong></div><div><span class="muted">Salário</span><strong>{{ mzn(selected.monthly_income) }}</strong></div></div>

        <div class="form-section">🪪 KYC</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Estado actual</label><div><StatusBadge :status="selected.kyc_status" /></div></div>
          <div class="form-group"><label class="form-label">Notas de revisão</label><input class="form-input" v-model="review.kyc_notes" placeholder="Motivo, observações..."></div>
        </div>
        <div class="action-row mb-4">
          <button class="btn btn-sm btn-primary" :disabled="selected.kyc_status==='approved'" @click="approveKyc(true)">✅ Aprovar KYC</button>
          <button class="btn btn-sm btn-danger-soft" :disabled="selected.kyc_status==='rejected'" @click="approveKyc(false)">✕ Rejeitar KYC</button>
        </div>

        <div class="form-section">📋 CRC</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Estado CRC</label>
            <select class="form-select" v-model="review.crc_status">
              <option value="nao_consta">Não consta</option>
              <option value="consta">Consta</option>
              <option value="em_verificacao">Em verificação</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Comentário CRC</label><input class="form-input" v-model="review.crc_comment" placeholder="Observações do CRC"></div>
        </div>
        <button class="btn btn-sm btn-primary" @click="saveCrc">💾 Guardar CRC</button>
      </div>
      <div v-if="modal==='docs'">
        <div class="table-wrap">
        <table class="modern-table"><thead><tr><th>Tipo</th><th>Nome</th><th>Estado</th><th></th></tr></thead><tbody><tr v-for="d in selected.Documents" :key="d.id"><td>{{ d.type }}</td><td>{{ d.original_name }}</td><td><StatusBadge :status="d.status" /></td><td><div class="action-row"><button class="btn btn-sm" @click="downloadDoc(d)">Baixar</button><button class="btn btn-sm btn-primary" :disabled="d.status==='approved'" @click="reviewDoc(d,'approved')">Aprovar</button><button class="btn btn-sm btn-danger-soft" :disabled="d.status==='rejected'" @click="reviewDoc(d,'rejected')">Rejeitar</button></div></td></tr>
          <tr v-if="!selected.Documents?.length"><td colspan="4" class="empty-state">Ainda não há documentos carregados.</td></tr>
        </tbody></table>
        </div>
        <div class="form-section" style="margin-top:14px">📎 Carregar novo documento</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-select" v-model="uploadType">
              <option value="bi">BI / Passaporte</option>
              <option value="nuit">NUIT</option>
              <option value="residence_certificate">Atestado de residência</option>
              <option value="bank_statement">Extracto bancário</option>
              <option value="income_proof">Comprovativo de rendimento</option>
              <option value="business_photo">Foto do negócio</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ficheiro</label>
            <input class="form-input" type="file" accept=".pdf,.jpg,.jpeg,.png" @change="onUploadDoc">
          </div>
        </div>
      </div>
    </div></div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'; import { useRouter, useRoute } from 'vue-router'; import { useToast } from 'vue-toastification'; import api,{downloadDocument,uploadDocument} from '@/services/api'; import StatusBadge from '@/components/common/StatusBadge.vue'
const router=useRouter(), route=useRoute(), toast=useToast(); const clients=ref([]), q=ref(''), modal=ref(null), selected=ref(null);
const review=ref({kyc_notes:'', crc_status:'em_verificacao', crc_comment:''}); const uploadType=ref('bi');
const base=computed(()=>route.path.startsWith('/super')?'/super':'/institution');
const filtered=computed(()=>clients.value.filter(c=>[c.User?.full_name,c.User?.email,c.User?.phone,c.nuit].join(' ').toLowerCase().includes(q.value.toLowerCase()))); const complete=computed(()=>clients.value.filter(c=>c.kyc_status==='approved').length); const blockedKyc=computed(()=>clients.value.filter(c=>['incomplete','rejected'].includes(c.kyc_status)).length); const blockedUsers=computed(()=>clients.value.filter(c=>c.User?.status==='blocked').length); const title=computed(()=>modal.value==='docs'?'Documentos':'Cliente');
const mzn=v=>Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0}); const crcLabel=v=>({nao_consta:'Não consta',consta:'Consta',em_verificacao:'Em verificação'}[v]||'Em verificação');
async function load(){try{const {data}=await api.get('/clients',{params:{search:q.value,limit:100000}}); clients.value=data.data||[]}catch(e){toast.error(e.response?.data?.message||'Erro ao carregar clientes')}}
function closeModal(){modal.value=null; selected.value=null} function openCreate(){router.push(`${base.value}/register-client`)} function editClient(c){router.push(`${base.value}/edit-client/${c.id}`)}
function viewClient(c){selected.value=c; review.value={kyc_notes:c.kyc_notes||'', crc_status:c.crc_status||'em_verificacao', crc_comment:c.crc_comment||''}; modal.value='view'}
function viewDocs(c){selected.value=c; modal.value='docs'}
async function toggleBlock(c){try{await api.post(`/clients/${c.id}/block`,{blocked:c.User?.status!=='blocked'}); toast.success('Estado do cliente actualizado'); await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao bloquear/desbloquear')}}
async function reviewDoc(d,status){try{await api.patch(`/documents/${d.id}/review`,{status}); toast.success('Documento actualizado: '+status); const idx=selected.value.Documents.findIndex(x=>x.id===d.id); if(idx>=0) selected.value.Documents[idx].status=status; await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao rever documento')}}
async function approveKyc(approved){
  try{
    await api.post(`/clients/${selected.value.id}/approve-kyc`,{approved, notes:review.value.kyc_notes})
    selected.value.kyc_status = approved ? 'approved' : 'rejected'
    toast.success(approved ? 'KYC aprovado' : 'KYC rejeitado')
    await load()
  }catch(e){toast.error(e.response?.data?.message||'Erro ao rever KYC')}
}
async function saveCrc(){
  try{
    await api.patch(`/clients/${selected.value.id}`,{crc_status:review.value.crc_status, crc_comment:review.value.crc_comment})
    toast.success('CRC actualizado')
    await load()
  }catch(e){toast.error(e.response?.data?.message||'Erro ao gravar CRC')}
}
async function onUploadDoc(e){
  const file=e.target.files?.[0]; if(!file) return
  try{
    await uploadDocument(file, uploadType.value, selected.value.id)
    toast.success('Documento carregado')
    const {data}=await api.get(`/clients/${selected.value.id}`)
    selected.value.Documents = data.data.Documents || []
    await load()
  }catch(err){toast.error(err.response?.data?.message||'Erro ao carregar documento')}
}
function createLoan(c){router.push(`${base.value}/applications?client_id=`+c.id+'&new=1')} async function downloadDoc(d){try{await downloadDocument(d.id,d.original_name)}catch(e){toast.error('Erro ao baixar documento')}} function exportCsv(){const rows=[['Nome','Email','Telefone','NUIT','KYC','CRC'],...clients.value.map(c=>[c.User?.full_name,c.User?.email,c.User?.phone,c.nuit,c.kyc_status,c.crc_status])]; const blob=new Blob([rows.map(r=>r.join(';')).join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='clientes.csv'; a.click(); URL.revokeObjectURL(a.href)} onMounted(load)
</script>
