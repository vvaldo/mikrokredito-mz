<template>
  <div class="auth-page">
    <div class="auth-left" :style="{ background: `linear-gradient(145deg, #020917, #0d1b3e, ${branding.primaryColor}33)` }">
      <div class="auth-logo">
        <img v-if="branding.logoUrl" :src="branding.logoUrl" style="width:48px;height:48px;object-fit:contain;border-radius:10px;background:rgba(255,255,255,.1);padding:5px" />
        <div v-else style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L24 8V18L14 24L4 18V8L14 2Z" fill="white" opacity=".9"/><circle cx="14" cy="13" r="4" :fill="branding.dangerColor"/></svg>
        </div>
      </div>
      <h1 class="auth-brand">{{ branding.leftTitle }}</h1>
      <p class="auth-brand-sub">Registe-se para aceder ao sistema</p>
      <div class="auth-features">
        <div v-for="(s,i) in steps" :key="i" class="auth-feature" :style="{ opacity: step > i ? 1 : 0.4 }">
          <div class="auth-feature-icon" :style="{ background: step > i ? 'rgba(74,222,128,.2)' : 'rgba(255,255,255,.12)' }">
            <svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2">
              <template v-if="step > i"><polyline points="1,6 5,10 11,2"/></template>
              <template v-else><text x="6" y="9" text-anchor="middle" fill="white" stroke="none" font-size="9">{{ i+1 }}</text></template>
            </svg>
          </div>
          <span>{{ s }}</span>
        </div>
      </div>
      <p class="auth-powered">{{ branding.poweredBy }}</p>
    </div>

    <div class="auth-right">
      <div class="auth-card" style="max-width:580px">
        <div class="auth-card-header">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <h2>Criar conta — Passo {{ step }}/{{ totalSteps }}</h2>
            <span style="font-size:11px;color:var(--mk-text-2)">{{ Math.round(step/totalSteps*100) }}%</span>
          </div>
          <!-- Progress -->
          <div style="height:3px;background:rgba(148,163,184,.1);border-radius:999px;overflow:hidden;margin-bottom:6px">
            <div style="height:100%;border-radius:999px;transition:width .4s" :style="{ width: (step/totalSteps*100)+'%', background:'linear-gradient(90deg,#1a6ff5,#22d3ee)' }"></div>
          </div>
          <p>{{ stepSubtitles[step-1] }}</p>
        </div>

        <form @submit.prevent="nextStep">
          <!-- STEP 1: Dados pessoais -->
          <template v-if="step === 1">
            <div class="form-section">👤 Dados Pessoais</div>
            <div class="form-group">
              <label class="form-label">Nome completo <span class="req">*</span></label>
              <input class="form-input" v-model="form.full_name" required placeholder="Ex: Maria da Graça Sitoe" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Data de nascimento <span class="req">*</span></label>
                <input class="form-input" type="date" v-model="form.date_of_birth" required />
              </div>
              <div class="form-group">
                <label class="form-label">Género</label>
                <select class="form-select" v-model="form.gender">
                  <option value="">Selecionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Estado civil</label>
                <select class="form-select" v-model="form.marital_status">
                  <option value="">Selecionar</option>
                  <option value="single">Solteiro(a)</option>
                  <option value="married">Casado(a)</option>
                  <option value="divorced">Divorciado(a)</option>
                  <option value="widowed">Viúvo(a)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Nº de dependentes</label>
                <input class="form-input" type="number" v-model="form.dependents" min="0" placeholder="0" />
              </div>
            </div>
            <!-- Foto (opcional) -->
            <div class="form-group">
              <label class="form-label">Foto (opcional)</label>
              <div class="upload-zone" style="height:80px;display:flex;align-items:center;gap:12px;padding:12px"
                @click="$refs.photoInput.click()">
                <img v-if="form.photoBase64" :src="form.photoBase64" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid rgba(26,111,245,.3)" />
                <div v-else style="width:52px;height:52px;border-radius:50%;background:rgba(26,111,245,.1);border:1.5px dashed rgba(26,111,245,.3);display:flex;align-items:center;justify-content:center;font-size:20px">📷</div>
                <div>
                  <div style="font-size:12px;font-weight:500;color:var(--mk-text)">Adicionar foto de perfil</div>
                  <div style="font-size:11px;color:var(--mk-text-2)">JPEG, PNG — máx. 2MB — não obrigatório</div>
                </div>
              </div>
              <input ref="photoInput" type="file" accept="image/*" style="display:none" @change="onPhoto" />
            </div>
          </template>

          <!-- STEP 2: Documentos + Morada -->
          <template v-if="step === 2">
            <div class="form-section">🪪 Documento de Identificação</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tipo de documento <span class="req">*</span></label>
                <select class="form-select" v-model="form.doc_type" required>
                  <option value="">Selecionar</option>
                  <option value="BI">Bilhete de Identidade (BI)</option>
                  <option value="Passaporte">Passaporte</option>
                  <option value="DIRE">DIRE</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Nº do documento <span class="req">*</span></label>
                <input class="form-input" v-model="form.bi_number" required placeholder="Ex: 123456789B" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Data de emissão</label>
                <input class="form-input" type="date" v-model="form.doc_issue_date" />
              </div>
              <div class="form-group">
                <label class="form-label">Data de validade</label>
                <input class="form-input" type="date" v-model="form.doc_expiry_date" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">NUIT</label>
                <input class="form-input" v-model="form.nuit" placeholder="Ex: 123456789" />
              </div>
              <div class="form-group">
                <label class="form-label">Nacionalidade</label>
                <input class="form-input" v-model="form.nationality" placeholder="Moçambicano(a)" />
              </div>
            </div>

            <div class="form-section">📍 Morada</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">País de residência <span class="req">*</span></label>
                <select class="form-select" v-model="form.country" required @change="form.province='';form.district=''">
                  <option value="Mozambique">Moçambique</option>
                  <option value="South Africa">África do Sul</option>
                  <option value="Other">Outro</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Província <span class="req">*</span></label>
                <select class="form-select" v-model="form.province" required @change="form.district=''">
                  <option value="">Selecionar</option>
                  <option v-for="p in provinces" :key="p">{{ p }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Distrito</label>
                <select class="form-select" v-model="form.district">
                  <option value="">Selecionar</option>
                  <option v-for="d in (districts[form.province]||[])" :key="d">{{ d }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Local de nascimento</label>
                <input class="form-input" v-model="form.birth_place" placeholder="Ex: Cidade de Maputo" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Endereço completo</label>
              <input class="form-input" v-model="form.address" placeholder="Rua, bairro, número..." />
            </div>
          </template>

          <!-- STEP 3: Actividade económica -->
          <template v-if="step === 3">
            <div class="form-section">💼 Actividade Profissional</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Profissão / Actividade <span class="req">*</span></label>
                <input class="form-input" v-model="form.activity_type" required placeholder="Ex: Comerciante, Agricultor" />
              </div>
              <div class="form-group">
                <label class="form-label">Tipo de emprego</label>
                <select class="form-select" v-model="form.employment_type">
                  <option value="">Selecionar</option>
                  <option value="self_employed">Conta própria / Informal</option>
                  <option value="employed">Empregado (por conta de outrem)</option>
                  <option value="civil_servant">Funcionário público</option>
                  <option value="retired">Reformado</option>
                </select>
              </div>
            </div>
            <template v-if="form.employment_type === 'employed' || form.employment_type === 'civil_servant'">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nome do empregador</label>
                  <input class="form-input" v-model="form.employer_name" placeholder="Ex: MISAU, BCI, etc." />
                </div>
                <div class="form-group">
                  <label class="form-label">Localização do trabalho</label>
                  <input class="form-input" v-model="form.employer_location" placeholder="Ex: Av. Eduardo Mondlane, Maputo" />
                </div>
              </div>
            </template>
            <div class="form-group">
              <label class="form-label">Rendimento mensal líquido (MZN) <span class="req">*</span></label>
              <input class="form-input" type="number" v-model="form.monthly_income" required placeholder="Ex: 25000" min="0" />
              <p class="form-hint">Informação confidencial — usada apenas para análise de crédito</p>
            </div>

            <div class="form-section">🤝 Avalistas</div>
            <div v-for="(av, i) in form.guarantors" :key="i" style="padding:12px;border:1px solid rgba(26,111,245,.15);border-radius:var(--mk-r);margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <span style="font-size:12px;font-weight:600;color:var(--mk-text-2)">Avalista {{ i+1 }}</span>
                <button type="button" class="btn btn-xs btn-danger-soft" @click="form.guarantors.splice(i,1)">Remover</button>
              </div>
              <div class="form-row">
                <div class="form-group" style="margin:0">
                  <label class="form-label">Nome</label>
                  <input class="form-input" v-model="av.name" placeholder="Nome completo" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Telefone</label>
                  <input class="form-input" v-model="av.phone" placeholder="+258 8x xxx xxxx" />
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-blue-soft" @click="form.guarantors.push({name:'',phone:''})">+ Adicionar avalista</button>
          </template>

          <!-- STEP 4: Conta de acesso -->
          <template v-if="step === 4">
            <div class="form-section">🔐 Acesso ao sistema</div>
            <div class="form-group">
              <label class="form-label">Email <span class="req">*</span></label>
              <div class="search-wrap">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l6 5 6-5"/><rect x="1" y="3" width="14" height="10" rx="2"/></svg>
                <input class="form-input" type="email" v-model="form.email" required placeholder="o_seu@email.com" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Telefone <span class="req">*</span></label>
              <input class="form-input" v-model="form.phone" required placeholder="+258 84 000 0000" />
            </div>
            <div class="form-group">
              <label class="form-label">Palavra-passe <span class="req">*</span></label>
              <div class="search-wrap">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
                <input class="form-input has-icon-right" :type="showPwd?'text':'password'" v-model="form.password" minlength="6" required placeholder="Mínimo 6 caracteres" />
                <button type="button" class="pwd-eye" @click="showPwd=!showPwd">
                  <svg v-if="!showPwd" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2"/><path d="M7.1 7.1C3.9 8.8 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/><path d="M14.2 6.3A10.8 10.8 0 0122 12s-.8 1.4-2.2 2.8"/></svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar palavra-passe <span class="req">*</span></label>
              <div class="search-wrap">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
                <input class="form-input has-icon-right" :class="{ error: pwdMismatch }" :type="showPwd2?'text':'password'" v-model="form.password_confirm" placeholder="Repita a palavra-passe" />
                <button type="button" class="pwd-eye" @click="showPwd2=!showPwd2">
                  <svg v-if="!showPwd2" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2"/><path d="M7.1 7.1C3.9 8.8 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/><path d="M14.2 6.3A10.8 10.8 0 0122 12s-.8 1.4-2.2 2.8"/></svg>
                </button>
              </div>
              <p v-if="pwdMismatch" class="form-error">As palavras-passe não coincidem</p>
            </div>
          </template>

          <div v-if="error" class="alert alert-danger">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="6"/><line x1="7" y1="4.5" x2="7" y2="7.5"/></svg>
            {{ error }}
          </div>

          <div style="display:flex;gap:8px;margin-top:14px">
            <button v-if="step > 1" type="button" class="btn" @click="step--">← Anterior</button>
            <button v-if="step < totalSteps" type="submit" class="btn btn-primary" style="flex:1">
              Próximo →
            </button>
            <button v-else type="submit" class="btn btn-primary" style="flex:1"
              :class="{ loading }" :disabled="loading || pwdMismatch">
              {{ loading ? '' : '✓ Criar conta' }}
            </button>
          </div>
        </form>

        <p class="auth-footer-link" style="margin-top:14px">
          Já tem conta? <RouterLink to="/login">Entrar</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBrandingStore } from '@/stores/branding'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const router   = useRouter()
const auth     = useAuthStore()
const branding = useBrandingStore()
const toast    = useToast()

const step       = ref(1)
const totalSteps = 4
const loading    = ref(false)
const error      = ref('')
const showPwd    = ref(false)
const showPwd2   = ref(false)

const form = ref({
  full_name:'', date_of_birth:'', gender:'', marital_status:'', dependents:0,
  photoBase64:'',
  doc_type:'BI', bi_number:'', doc_issue_date:'', doc_expiry_date:'', nuit:'', nationality:'Moçambicano(a)',
  country:'Mozambique', province:'', district:'', birth_place:'', address:'',
  activity_type:'', employment_type:'', employer_name:'', employer_location:'',
  monthly_income:'', guarantors:[],
  email:'', phone:'', password:'', password_confirm:'',
})

const steps = ['Dados pessoais','Documentos e morada','Actividade profissional','Acesso ao sistema']
const stepSubtitles = ['Informações pessoais básicas','Identificação e localização','Trabalho e avalistas','Email, telefone e senha']

const pwdMismatch = computed(() => step.value === 4 && form.value.password_confirm && form.value.password !== form.value.password_confirm)

const provinces = ['Cabo Delgado','Gaza','Inhambane','Manica','Maputo Cidade','Maputo Província','Nampula','Niassa','Sofala','Tete','Zambézia']
const districts = {
  'Maputo Cidade':['KaMpfumo','KaMaxaquene','KaMavota','KaMubukwana','KaTembe','KaNyaka'],
  'Gaza':['Xai-Xai','Chongoene','Chibuto','Bilene','Guijá','Mabalane'],
  'Nampula':['Nampula Cidade','Monapo','Nacala-Porto','Meconta','Ribáuè'],
}

function nextStep() {
  if (step.value < totalSteps) { step.value++; return }
  submit()
}

async function submit() {
  if (pwdMismatch.value) return
  error.value = ''
  loading.value = true
  try {
    const payload = {
      full_name:       form.value.full_name,
      email:           form.value.email,
      phone:           form.value.phone,
      password:        form.value.password,
      date_of_birth:   form.value.date_of_birth,
      gender:          form.value.gender,
      marital_status:  form.value.marital_status,
      nationality:     form.value.nationality,
      bi_number:       form.value.bi_number,
      nuit:            form.value.nuit,
      province:        form.value.province,
      district:        form.value.district,
      address:         form.value.address,
      birth_place:     form.value.birth_place,
      activity_type:   form.value.activity_type,
      monthly_income:  form.value.monthly_income,
      employment_type: form.value.employment_type,
      employer_name:   form.value.employer_name,
      employer_location: form.value.employer_location,
      guarantors:      form.value.guarantors,
      photoBase64:     form.value.photoBase64,
    }
    await api.post('/auth/register', payload)
    toast.success('✅ Conta criada! Verifique o seu email para confirmar o registo.')
    router.push('/login')
  } catch (e) {
    error.value = e.response?.data?.message || 'Erro ao criar conta.'
    step.value = 4
  } finally { loading.value = false }
}

async function onPhoto(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2*1024*1024) { toast.error('Foto deve ter menos de 2MB'); return }
  const reader = new FileReader()
  reader.onload = ev => { form.value.photoBase64 = ev.target.result }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.auth-page { min-height:100vh; display:grid; grid-template-columns:360px 1fr; }
.auth-left {
  padding:40px 32px; display:flex; flex-direction:column;
  color:rgba(255,255,255,.92); position:relative; overflow:hidden;
}
.auth-brand { font-size:20px; font-weight:800; margin-bottom:5px; letter-spacing:.3px; }
.auth-brand-sub { font-size:12px; opacity:.65; margin-bottom:24px; }
.auth-features { display:flex; flex-direction:column; gap:12px; flex:1; }
.auth-feature { display:flex; align-items:center; gap:10px; font-size:12px; transition:opacity .3s; }
.auth-feature-icon { width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.auth-feature-icon svg { width:10px; height:10px; }
.auth-powered { font-size:10px; opacity:.3; margin-top:24px; }
.auth-right {
  background:var(--mk-surface-3); display:flex;
  align-items:flex-start; justify-content:center; padding:32px 24px; overflow-y:auto;
}
.auth-card {
  background:#ffffffe6; backdrop-filter:blur(20px);
  border:1px solid rgba(26,111,245,.15); border-radius:18px;
  padding:32px 30px 26px; width:100%; max-width:580px;
  box-shadow:0 0 40px rgba(0,123,255,.08), 0 20px 50px rgba(10,35,66,.16);
}
.auth-card-header { margin-bottom:20px; }
.auth-card-header h2 { font-size:18px; font-weight:700; margin-bottom:4px; color:var(--mk-text); }
.auth-card-header p  { font-size:12px; color:var(--mk-text-2); }
.auth-footer-link { font-size:12px; text-align:center; color:var(--mk-text-2); }
.auth-footer-link a { color:var(--blue-400); font-weight:600; }
@media (max-width:768px) { .auth-page { grid-template-columns:1fr; } .auth-left { display:none; } .auth-right { padding:20px 14px; align-items:flex-start; } .auth-card { padding:24px 20px; } }
</style>
