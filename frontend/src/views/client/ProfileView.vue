<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Perfil KYC</h1>
      <p>Dados gravados directamente na base de dados, documentos KYC e redefinição de senha com token por email.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" :disabled="saving" @click="saveProfile">{{ saving ? 'A gravar...' : 'Gravar alterações' }}</button>
        <button class="btn" :disabled="sendingToken" @click="requestToken('email')">Enviar token por email</button>
      </div>
    </section>

    <div v-if="loading" class="modern-card"><p class="muted">A carregar perfil...</p></div>
    <template v-else>
      <div class="kpi-grid">
        <div class="kpi good"><div class="label">Nível de confiança</div><div class="value">{{ trust }}%</div><div class="note">Perfil + documentação</div></div>
        <div class="kpi"><div class="label">Documentos obrigatórios</div><div class="value">{{ submittedRequired }}/4</div><div class="note">BI, NUIT, residência e extracto</div></div>
        <div class="kpi warn"><div class="label">Estado KYC</div><div class="value">{{ kycLabel }}</div><div class="note">Gravado no banco</div></div>
        <div class="kpi danger"><div class="label">Token</div><div class="value">15 min</div><div class="note">Validade da redefinição</div></div>
      </div>

      <div class="modern-grid-2">
        <div class="modern-card">
          <h2>Dados do cliente</h2>

          <!-- Foto -->
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <div class="avatar xl" style="background:var(--mk-surface-2);border:2px dashed var(--mk-border)">
              <img v-if="form.photo_url" :src="form.photo_url" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
              <span v-else style="font-size:20px">📷</span>
            </div>
            <div>
              <button type="button" class="btn btn-sm" @click="$refs.photoInput.click()">📷 {{ form.photo_url ? 'Alterar foto' : 'Carregar foto' }}</button>
              <button v-if="form.photo_url" type="button" class="btn btn-sm btn-danger-soft" style="margin-left:6px" @click="form.photo_url=''">Remover</button>
              <input ref="photoInput" type="file" accept="image/*" style="display:none" @change="onPhoto">
            </div>
          </div>

          <div class="form-section">👤 Dados pessoais</div>
          <div class="form-grid">
            <input class="input" v-model="form.full_name" placeholder="Nome completo">
            <input class="input" v-model="form.email" placeholder="Email">
            <input class="input" v-model="form.phone" placeholder="Telefone / WhatsApp">
            <input class="input" type="date" v-model="form.date_of_birth" placeholder="Data de nascimento">
            <select class="input" v-model="form.gender">
              <option value="">Género</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
            <select class="input" v-model="form.marital_status">
              <option value="">Estado civil</option>
              <option value="single">Solteiro(a)</option>
              <option value="married">Casado(a)</option>
              <option value="divorced">Divorciado(a)</option>
              <option value="widowed">Viúvo(a)</option>
            </select>
            <input class="input" type="number" min="0" v-model="form.dependents" placeholder="Nº de dependentes">
            <input class="input" v-model="form.nationality" placeholder="Nacionalidade">
          </div>

          <div class="form-section">🪪 Identificação</div>
          <div class="form-grid">
            <select class="input" v-model="form.doc_type">
              <option value="BI">Bilhete de Identidade (BI)</option>
              <option value="Passaporte">Passaporte</option>
              <option value="DIRE">DIRE</option>
              <option value="Outro">Outro</option>
            </select>
            <input class="input" v-model="form.bi_number" placeholder="Nº do documento">
            <input class="input" type="date" v-model="form.doc_issue_date" placeholder="Data de emissão">
            <input class="input" type="date" v-model="form.doc_expiry_date" placeholder="Data de validade">
            <input class="input" v-model="form.nuit" placeholder="NUIT">
            <input class="input" v-model="form.birth_place" placeholder="Local de nascimento">
          </div>

          <div class="form-section">📍 Morada</div>
          <div class="form-grid">
            <input class="input" v-model="form.province" placeholder="Província">
            <input class="input" v-model="form.district" placeholder="Distrito">
            <input class="input" v-model="form.address" placeholder="Endereço">
          </div>

          <div class="form-section">💼 Actividade profissional</div>
          <div class="form-grid">
            <input class="input" v-model="form.activity_type" placeholder="Actividade / profissão">
            <select class="input" v-model="form.employment_type">
              <option value="">Tipo de emprego</option>
              <option value="self_employed">Conta própria / Informal</option>
              <option value="employed">Empregado (por conta de outrem)</option>
              <option value="civil_servant">Funcionário público</option>
              <option value="retired">Reformado</option>
            </select>
            <input class="input" v-model="form.employer_name" placeholder="Nome do empregador">
            <input class="input" v-model="form.employer_location" placeholder="Localização do empregador">
            <input class="input" v-model="form.monthly_income" type="number" placeholder="Rendimento mensal" disabled title="Reservado à instituição">
          </div>
          <p class="muted" style="margin-top:-6px;margin-bottom:10px">O rendimento mensal só pode ser alterado pela instituição.</p>

          <div class="form-section">🤝 Avalistas</div>
          <div v-for="(av,i) in form.guarantors" :key="i" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <input class="input" v-model="av.name" placeholder="Nome do avalista">
            <input class="input" v-model="av.phone" placeholder="Telefone">
            <button type="button" class="btn btn-sm btn-danger-soft" @click="form.guarantors.splice(i,1)">✕</button>
          </div>
          <button type="button" class="btn btn-sm btn-blue-soft" @click="form.guarantors.push({name:'',phone:''})">+ Adicionar avalista</button>

          <div><button class="btn btn-primary" style="margin-top:14px" :disabled="saving" @click="saveProfile">Gravar perfil</button></div>
        </div>

        <div class="modern-card">
          <h2>Redefinir senha</h2>
          <p class="muted">Primeiro envie o token. Depois informe o token recebido e a nova senha.</p>
          <div class="form-grid single">
            <input class="input" v-model="password.token" placeholder="Token recebido por email">
            <input class="input" v-model="password.new_password" type="password" placeholder="Nova senha">
          </div>
          <div class="action-row" style="margin-top:12px">
            <button class="btn" :disabled="sendingToken" @click="requestToken('email')">Enviar token</button>
            <button class="btn btn-primary" :disabled="resetting" @click="resetPassword">Alterar senha</button>
          </div>
        </div>
      </div>

      <div class="modern-card">
        <h2>Documentos submetidos</h2>
        <div class="doc-list">
          <div v-for="d in checklist" :key="d.type" class="doc-row">
            <div>
              <strong>{{ d.label }}</strong>
              <p class="muted">{{ d.doc ? `${d.doc.original_name || d.doc.file_name} · ${date(d.doc.created_at)}` : 'Por submeter' }}</p>
            </div>
            <div class="action-row">
              <span :class="d.doc ? 'status-pill st-approved' : 'status-pill st-rejected'">{{ d.doc ? 'Submetido' : 'Falta' }}</span>
              <button v-if="d.doc" type="button" class="btn" @click="downloadDoc(d.doc)">Baixar</button>
              <label class="btn btn-primary">{{ d.doc ? 'Novo upload' : 'Upload' }}<input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" @change="upload(d.type,$event)"></label>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import api, { uploadDocument, downloadDocument } from '@/services/api'
const toast = useToast()
const loading = ref(true), saving = ref(false), sendingToken = ref(false), resetting = ref(false)
const profile = ref(null)
const docs = ref([])
const form = ref({
  full_name:'', email:'', phone:'', nuit:'', bi_number:'', monthly_income:'', province:'', district:'', address:'', activity_type:'',
  date_of_birth:'', gender:'', marital_status:'', dependents:0, nationality:'',
  doc_type:'BI', doc_issue_date:'', doc_expiry_date:'', birth_place:'',
  employment_type:'', employer_name:'', employer_location:'',
  guarantors:[], photo_url:'',
})
const password = ref({ token:'', new_password:'' })
const types = [
  ['bi','BI / Documento de identificação',true],
  ['nuit','NUIT',true],
  ['residence_certificate','Atestado de residência',true],
  ['bank_statement','Extracto bancário dos últimos 3 meses',true],
  ['income_proof','Folha de salário',false],
  ['other','Outros documentos',false],
]
const checklist = computed(()=>types.map(([type,label,required])=>({ type,label,required, doc:docs.value.find(x=>x.type===type) })))
const submittedRequired = computed(()=>checklist.value.filter(x=>x.required && x.doc).length)
const trust = computed(()=>Math.min(100, 30 + submittedRequired.value * 15 + (form.value.monthly_income ? 10 : 0)))
const kycLabel = computed(()=>({ incomplete:'Incompleto', pending_review:'Em revisão', approved:'Aprovado', rejected:'Rejeitado' }[profile.value?.kyc_status] || 'Pendente'))
function date(v){return v ? new Date(v).toLocaleDateString('pt-MZ') : '—'}
async function downloadDoc(d){ await downloadDocument(d.id, d.original_name || d.file_name || 'documento') }
async function load(){
  loading.value = true
  try{
    const {data} = await api.get('/clients/me')
    profile.value = data.data
    docs.value = data.data.Documents || []
    const u = data.data.User || {}
    Object.assign(form.value, {
      full_name:u.full_name||'', email:u.email||'', phone:u.phone||'',
      nuit:data.data.nuit||'', bi_number:data.data.bi_number||'', monthly_income:data.data.monthly_income||'',
      province:data.data.province||'', district:data.data.district||'', address:data.data.address||'', activity_type:data.data.activity_type||'',
      date_of_birth:data.data.date_of_birth?.slice(0,10)||'', gender:data.data.gender||'', marital_status:data.data.marital_status||'',
      dependents:data.data.dependents||0, nationality:data.data.nationality||'',
      doc_type:data.data.doc_type||'BI', doc_issue_date:data.data.doc_issue_date?.slice(0,10)||'', doc_expiry_date:data.data.doc_expiry_date?.slice(0,10)||'',
      birth_place:data.data.birth_place||'',
      employment_type:data.data.employment_type||'', employer_name:data.data.employer_name||'', employer_location:data.data.employer_location||'',
      guarantors:data.data.guarantors||[], photo_url:data.data.photo_url||'',
    })
  } finally { loading.value = false }
}
async function saveProfile(){
  saving.value = true
  try{
    await api.patch('/clients/me', form.value)
    toast.success('Perfil gravado na base de dados.')
    await load()
  } finally { saving.value = false }
}
async function requestToken(channel){
  sendingToken.value = true
  try{
    const {data} = await api.post('/auth/request-password-reset-token', { channel })
    toast.success(data.message || 'Token enviado.')
  } finally { sendingToken.value = false }
}
async function resetPassword(){
  if(!password.value.token || !password.value.new_password) return toast.error('Informe token e nova senha.')
  resetting.value = true
  try{
    await api.post('/auth/reset-password-with-token', password.value)
    password.value = { token:'', new_password:'' }
    toast.success('Senha alterada na base de dados.')
  } finally { resetting.value = false }
}
function onPhoto(e){
  const file = e.target.files?.[0]; if(!file) return
  if (file.size > 2*1024*1024) return toast.error('Foto deve ter menos de 2MB')
  const reader = new FileReader()
  reader.onload = ev => { form.value.photo_url = ev.target.result }
  reader.readAsDataURL(file)
}
async function upload(type,e){
  const file=e.target.files?.[0]; if(!file) return
  await uploadDocument(file, type, null, null)
  toast.success('Documento gravado no servidor e referenciado no banco de dados.')
  await load()
}
onMounted(load)
</script>
<style scoped>.doc-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--color-border-tertiary);padding:12px 0}.doc-row:last-child{border-bottom:0}.doc-list{margin-top:8px}</style>
