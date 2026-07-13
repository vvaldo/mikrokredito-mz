<template>
  <div class="content-inner">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isEdit ? 'Editar cliente' : 'Cadastrar novo cliente' }}</h1>
        <p class="page-sub">{{ isEdit ? 'Actualizar dados do cliente' : 'Preencha todos os dados do novo cliente' }}</p>
      </div>
      <button class="btn" @click="$router.back()">← Voltar</button>
    </div>

    <!-- Progress -->
    <div style="display:flex;gap:4px;margin-bottom:20px">
      <div v-for="(s,i) in steps" :key="i"
        style="flex:1;display:flex;flex-direction:column;gap:5px;cursor:pointer"
        @click="goToStep(i+1)">
        <div style="height:3px;border-radius:3px;transition:background .3s"
          :style="{ background: step > i ? 'var(--blue-600)' : step === i+1 ? 'var(--blue-400)' : 'var(--border)' }"></div>
        <div style="font-size:10px;font-weight:600;letter-spacing:.3px"
          :style="{ color: step >= i+1 ? 'var(--blue-600)' : 'var(--text-3)' }">
          {{ i+1 }}. {{ s }}
        </div>
      </div>
    </div>

    <form @submit.prevent="handleNext">
      <!-- ── STEP 1: Pessoal ── -->
      <div v-show="step===1" class="card mb-4 anim-fade">
        <div class="form-section">👤 Dados Pessoais</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nome completo <span class="req">*</span></label>
            <input class="form-input" v-model="f.full_name" required placeholder="Maria da Graça Sitoe" />
          </div>
          <div class="form-group">
            <label class="form-label">Data de nascimento <span class="req">*</span></label>
            <input class="form-input" type="date" v-model="f.date_of_birth" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Género</label>
            <select class="form-select" v-model="f.gender">
              <option value="">Selecionar</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado civil</label>
            <select class="form-select" v-model="f.marital_status">
              <option value="">Selecionar</option>
              <option value="single">Solteiro(a)</option>
              <option value="married">Casado(a)</option>
              <option value="divorced">Divorciado(a)</option>
              <option value="widowed">Viúvo(a)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nº de dependentes</label>
            <input class="form-input" type="number" v-model="f.dependents" min="0" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Nacionalidade</label>
            <input class="form-input" v-model="f.nationality" placeholder="Moçambicano(a)" />
          </div>
        </div>

        <!-- Foto upload -->
        <div class="form-group">
          <label class="form-label">Foto do cliente (opcional)</label>
          <div style="display:flex;align-items:center;gap:14px">
            <div style="position:relative">
              <div class="avatar xl" style="background:var(--bg-card-2);border:2px dashed var(--border)">
                <img v-if="f.photoBase64" :src="f.photoBase64" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
                <span v-else style="font-size:20px">📷</span>
              </div>
              <button type="button" class="btn btn-xs btn-blue-soft"
                style="position:absolute;bottom:-5px;right:-5px;width:22px;height:22px;padding:0;border-radius:50%;font-size:12px"
                @click="$refs.photoInput.click()">+</button>
            </div>
            <div>
              <button type="button" class="btn btn-sm btn-secondary" @click="$refs.photoInput.click()">
                📷 {{ f.photoBase64 ? 'Alterar foto' : 'Carregar foto' }}
              </button>
              <p class="form-hint" style="margin-top:5px">JPEG ou PNG — máx. 2MB — não obrigatório</p>
              <button v-if="f.photoBase64" type="button" class="btn btn-xs btn-danger-soft" style="margin-top:4px" @click="f.photoBase64=''">Remover</button>
            </div>
          </div>
          <input ref="photoInput" type="file" accept="image/*" style="display:none" @change="onPhoto" />
        </div>
      </div>

      <!-- ── STEP 2: Documento + Morada ── -->
      <div v-show="step===2" class="card mb-4 anim-fade">
        <div class="form-section">🪪 Identificação</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo de documento <span class="req">*</span></label>
            <select class="form-select" v-model="f.doc_type">
              <option value="BI">Bilhete de Identidade (BI)</option>
              <option value="Passaporte">Passaporte</option>
              <option value="DIRE">DIRE</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Número do documento <span class="req">*</span></label>
            <input class="form-input" v-model="f.bi_number" required placeholder="Ex: 123456789B" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data de emissão</label>
            <input class="form-input" type="date" v-model="f.doc_issue_date" />
          </div>
          <div class="form-group">
            <label class="form-label">Data de validade</label>
            <input class="form-input" type="date" v-model="f.doc_expiry_date" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">NUIT</label>
            <input class="form-input" v-model="f.nuit" placeholder="Ex: 123456789" />
          </div>
          <div class="form-group">
            <label class="form-label">Local de nascimento</label>
            <input class="form-input" v-model="f.birth_place" placeholder="Ex: Cidade de Maputo" />
          </div>
        </div>

        <div class="form-section">📍 Morada</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Província <span class="req">*</span></label>
            <select class="form-select" v-model="f.province" required @change="f.district=''">
              <option value="">Selecionar</option>
              <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Distrito</label>
            <select class="form-select" v-model="f.district">
              <option value="">Selecionar</option>
              <option v-for="d in (districts[f.province]||[])" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Endereço completo</label>
          <input class="form-input" v-model="f.address" placeholder="Rua, bairro, número..." />
        </div>
      </div>

      <!-- ── STEP 3: Actividade ── -->
      <div v-show="step===3" class="card mb-4 anim-fade">
        <div class="form-section">💼 Actividade Económica</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Profissão / Actividade <span class="req">*</span></label>
            <input class="form-input" v-model="f.activity_type" required placeholder="Ex: Comerciante, Agricultor" />
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de emprego</label>
            <select class="form-select" v-model="f.employment_type">
              <option value="">Selecionar</option>
              <option value="self_employed">Conta própria / Informal</option>
              <option value="employed">Empregado por conta de outrem</option>
              <option value="civil_servant">Funcionário público</option>
              <option value="retired">Reformado</option>
            </select>
          </div>
        </div>
        <template v-if="f.employment_type==='employed'||f.employment_type==='civil_servant'">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome do empregador</label>
              <input class="form-input" v-model="f.employer_name" placeholder="Ex: MISAU, BCI, ENH" />
            </div>
            <div class="form-group">
              <label class="form-label">Localização do empregador</label>
              <input class="form-input" v-model="f.employer_location" placeholder="Ex: Av. Eduardo Mondlane, Maputo" />
            </div>
          </div>
        </template>
        <div class="form-group">
          <label class="form-label">Rendimento mensal líquido (MZN) <span class="req">*</span></label>
          <input class="form-input" type="number" v-model="f.monthly_income" required placeholder="Ex: 25000" min="0" />
        </div>

        <div class="form-section">🤝 Avalistas</div>
        <div v-for="(av,i) in f.guarantors" :key="i"
          style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--mk-r);margin-bottom:8px;background:var(--bg-card-2)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Avalista {{ i+1 }}</span>
            <button type="button" class="btn btn-xs btn-danger-soft" @click="f.guarantors.splice(i,1)">Remover</button>
          </div>
          <div class="form-row">
            <div class="form-group" style="margin:0"><label class="form-label">Nome</label><input class="form-input" v-model="av.name" placeholder="Nome completo"/></div>
            <div class="form-group" style="margin:0"><label class="form-label">Telefone</label><input class="form-input" v-model="av.phone" placeholder="+258 8x xxx xxxx"/></div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-blue-soft" @click="f.guarantors.push({name:'',phone:''})">+ Adicionar avalista</button>
      </div>

      <!-- ── STEP 4: Acesso + Documentos ── -->
      <div v-show="step===4" class="card mb-4 anim-fade">
        <div class="form-section">🔐 Dados de acesso</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email <span class="req">*</span></label>
            <input class="form-input" type="email" v-model="f.email" required placeholder="o_seu@email.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Telefone <span class="req">*</span></label>
            <input class="form-input" v-model="f.phone" required placeholder="+258 84 000 0000" />
          </div>
        </div>
        <div v-if="!isEdit" class="form-row">
          <div class="form-group">
            <label class="form-label">Palavra-passe <span class="req">*</span></label>
            <div class="search-wrap">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
              <input class="form-input has-icon-right" :type="showPwd?'text':'password'" v-model="f.password" minlength="6" :required="!isEdit" placeholder="Mínimo 6 caracteres" />
              <button type="button" class="pwd-eye" @click="showPwd=!showPwd">
                <svg v-if="!showPwd" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2"/><path d="M7.1 7.1C3.9 8.8 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/></svg>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar palavra-passe <span class="req">*</span></label>
            <div class="search-wrap">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
              <input class="form-input has-icon-right" :class="{ error: pwdMismatch }" :type="showPwd2?'text':'password'" v-model="f.password_confirm" :required="!isEdit" placeholder="Repita a palavra-passe" />
              <button type="button" class="pwd-eye" @click="showPwd2=!showPwd2">
                <svg v-if="!showPwd2" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2"/></svg>
              </button>
            </div>
            <p v-if="pwdMismatch" class="form-error">Palavras-passe não coincidem</p>
          </div>
        </div>

        <div class="form-section" style="margin-top:8px">📎 Upload de documentos (opcional)</div>
        <p class="form-hint" style="margin-bottom:10px">BI, NUIT, extracto bancário, comprovativo de rendimento, etc. Pode adicionar mais tarde no perfil do cliente.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
          <div v-for="dt in docTypes" :key="dt.key"
            class="upload-zone"
            style="min-height:70px;display:flex;align-items:center;gap:10px;padding:12px;text-align:left"
            @click="triggerDocUpload(dt.key)">
            <span style="font-size:20px;flex-shrink:0">{{ dt.icon }}</span>
            <div style="min-width:0">
              <div style="font-size:12px;font-weight:600;color:var(--text-1)">{{ dt.label }}</div>
              <div style="font-size:11px;color:var(--text-2);margin-top:2px">
                {{ uploadedDocs[dt.key]?.name || 'Clique para carregar' }}
              </div>
            </div>
            <span v-if="uploadedDocs[dt.key]" style="margin-left:auto;font-size:16px">✅</span>
          </div>
        </div>
        <input ref="docUploadInput" type="file" style="display:none" accept=".pdf,.jpg,.jpeg,.png" @change="onDocUpload" />
      </div>

      <!-- Error -->
      <div v-if="error" class="alert alert-danger mb-3">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/></svg>
        {{ error }}
      </div>

      <!-- Navigation -->
      <div style="display:flex;gap:8px;justify-content:space-between">
        <button v-if="step > 1" type="button" class="btn btn-secondary" @click="step--">← Anterior</button>
        <div style="flex:1"></div>
        <button v-if="step < 4" type="submit" class="btn btn-primary">Próximo →</button>
        <button v-else type="submit" class="btn btn-primary"
          :class="{ loading: saving }" :disabled="saving || pwdMismatch">
          {{ saving ? '' : (isEdit ? '💾 Guardar alterações' : '✅ Cadastrar cliente') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()
const toast  = useToast()

const isEdit  = computed(() => !!route.params.id)
const step    = ref(1)
const saving  = ref(false)
const error   = ref('')
const showPwd = ref(false), showPwd2 = ref(false)
const currentDocType = ref('')
const uploadedDocs  = ref({})

const steps = ['Dados pessoais', 'Documentos e morada', 'Actividade económica', 'Acesso e documentos']

const f = ref({
  full_name:'', date_of_birth:'', gender:'', marital_status:'', dependents:0, nationality:'Moçambicano(a)',
  photoBase64:'',
  doc_type:'BI', bi_number:'', doc_issue_date:'', doc_expiry_date:'', nuit:'', birth_place:'',
  province:'', district:'', address:'',
  activity_type:'', employment_type:'', employer_name:'', employer_location:'',
  monthly_income:'', guarantors:[],
  email:'', phone:'', password:'', password_confirm:'',
})

const pwdMismatch = computed(() => !isEdit.value && f.value.password_confirm && f.value.password !== f.value.password_confirm)

const provinces = ['Cabo Delgado','Gaza','Inhambane','Manica','Maputo Cidade','Maputo Província','Nampula','Niassa','Sofala','Tete','Zambézia']
const districts = {
  'Maputo Cidade':['KaMpfumo','KaMaxaquene','KaMavota','KaMubukwana','KaTembe','KaNyaka'],
  'Gaza':['Xai-Xai','Chongoene','Chibuto','Bilene','Guijá','Mabalane'],
  'Nampula':['Nampula Cidade','Monapo','Nacala-Porto','Meconta','Ribáuè'],
  'Inhambane':['Inhambane Cidade','Vilankulo','Maxixe','Govuro','Zavala'],
  'Sofala':['Beira','Dondo','Búzi','Chibabava','Gorongosa'],
}
const docTypes = [
  { key:'bi',            label:'BI / Passaporte',          icon:'🪪' },
  { key:'nuit',          label:'NUIT',                     icon:'📋' },
  { key:'income_proof',  label:'Comprov. rendimento',      icon:'💰' },
  { key:'bank_statement',label:'Extracto bancário',        icon:'🏦' },
  { key:'business_photo',label:'Foto do negócio',          icon:'🏪' },
  { key:'other',         label:'Outro documento',          icon:'📎' },
]

function goToStep(n) { if (n < step.value) step.value = n }

function handleNext() {
  if (step.value < 4) { step.value++; return }
  submit()
}

async function submit() {
  if (pwdMismatch.value) return
  saving.value = true; error.value = ''
  try {
    if (isEdit.value) {
      await api.patch(`/clients/${route.params.id}`, { ...f.value })
      // Upload pending docs
      for (const [type, file] of Object.entries(uploadedDocs.value)) {
        if (!file?.raw) continue
        const fd = new FormData()
        fd.append('file', file.raw)
        fd.append('client_id', route.params.id)
        fd.append('type', type)
        await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {})
      }
      toast.success('✅ Cliente actualizado com sucesso')
    } else {
      const { data } = await api.post('/auth/register', { ...f.value })
      const clientId = data.data?.client?.id
      // Upload docs if provided
      if (clientId) {
        for (const [type, file] of Object.entries(uploadedDocs.value)) {
          if (!file?.raw) continue
          const fd = new FormData()
          fd.append('file', file.raw)
          fd.append('client_id', clientId)
          fd.append('type', type)
          await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {})
        }
      }
      toast.success('✅ Cliente cadastrado com sucesso!')
    }
    router.back()
  } catch (e) {
    error.value = e.response?.data?.message || 'Erro ao guardar os dados.'
    if (step.value !== 4) step.value = 4
  } finally { saving.value = false }
}

async function onPhoto(e) {
  const file = e.target.files[0]; if (!file) return
  if (file.size > 2*1024*1024) { toast.error('Foto deve ter menos de 2MB'); return }
  const r = new FileReader()
  r.onload = ev => { f.value.photoBase64 = ev.target.result }
  r.readAsDataURL(file)
}

function triggerDocUpload(type) {
  currentDocType.value = type
  document.querySelector('[ref=docUploadInput]')?.click() ||
    document.querySelectorAll('input[type=file]')[1]?.click()
}
function onDocUpload(e) {
  const file = e.target.files[0]; if (!file) return
  uploadedDocs.value[currentDocType.value] = { name: file.name, raw: file }
  toast.success(`${file.name} pronto para envio`)
}

// Load existing client for edit
onMounted(async () => {
  if (isEdit.value) {
    try {
      const { data } = await api.get(`/clients/${route.params.id}`)
      const c = data.data
      Object.assign(f.value, {
        full_name: c.User?.full_name||'', email: c.User?.email||'', phone: c.User?.phone||'',
        date_of_birth: c.date_of_birth?.slice(0,10)||'', gender: c.gender||'',
        marital_status: c.marital_status||'', nationality: c.nationality||'',
        doc_type: c.doc_type||'BI', bi_number: c.bi_number||'', nuit: c.nuit||'',
        doc_issue_date: c.doc_issue_date?.slice(0,10)||'', doc_expiry_date: c.doc_expiry_date?.slice(0,10)||'',
        birth_place: c.birth_place||'', province: c.province||'', district: c.district||'', address: c.address||'',
        activity_type: c.activity_type||'', employment_type: c.employment_type||'',
        employer_name: c.employer_name||'', employer_location: c.employer_location||'',
        monthly_income: c.monthly_income||'', guarantors: c.guarantors||[], dependents: c.dependents||0,
        photoBase64: c.photo_url||'',
      })
    } catch(e) { toast.error('Erro ao carregar dados do cliente') }
  }
})
</script>
