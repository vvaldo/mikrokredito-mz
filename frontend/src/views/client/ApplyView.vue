<template>
  <div class="modern-page">
    <section class="modern-hero"><h1>Novo Pedido de Crédito</h1><p>Preencha o valor, prazo, finalidade e documentos do pedido. O banco analisará a solicitação e notificará cada alteração de estado.</p></section>
    <div v-if="loading" class="modern-card"><p class="muted">A carregar dados...</p></div>
    <template v-else>
      <div :class="docsOk ? 'notice' : 'notice danger'">{{ docsOk ? 'Documentos obrigatórios completos. Pode submeter o pedido.' : 'Pedido bloqueado: anexe BI, NUIT, atestado de residência e extracto bancário.' }}</div>
      <div class="modern-grid-2">
        <div class="modern-card">
          <h2>1. Dados do cliente</h2>
          <div class="form-grid">
            <input class="input" v-model="client.full_name" readonly><input class="input" v-model="client.nuit" readonly><input class="input" v-model="client.phone" readonly><input class="input" v-model="client.email" readonly>
          </div>
          <h2 style="margin-top:18px">2. Produto e dados do pedido</h2>
          <div class="form-grid single">
            <label class="field-label">Produto / tipo de crédito<select class="input" v-model="form.product_id" @change="syncProduct"><option disabled value="">Seleccione o produto</option><option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} — {{ percent(p.interest_rate) }}/mês</option></select></label>
            <label class="field-label">Valor solicitado<input class="input" v-model.number="form.requested_amount" type="number" placeholder="Valor solicitado"></label>
            <label class="field-label">Prazo em meses<input class="input" v-model.number="form.term_months" type="number" placeholder="Prazo em meses"></label>
            <label class="field-label">Origem de pagamento<select class="input" v-model="paymentSource"><option value="salary">Pagamento pelo salário</option><option value="assets">Pagamento por bens/garantias</option><option value="both">Salário + bens</option></select></label>
            <label class="field-label">Finalidade<input class="input" v-model="form.purpose" placeholder="Finalidade"></label>
            <label class="field-label">Descrição do pedido<textarea class="input" v-model="form.purpose_detail" placeholder="Explique como pretende usar o crédito"></textarea></label>
          </div>
          <div v-if="limitMessage" class="notice danger" style="margin-top:10px">{{ limitMessage }}</div>
          <div v-else-if="selectedProduct" class="notice" style="margin-top:10px">Limites do produto: {{ mzn(selectedProduct.min_amount) }}–{{ mzn(selectedProduct.max_amount) }} · {{ selectedProduct.min_term_months }}–{{ selectedProduct.max_term_months }} meses.</div>
          <div class="modern-card soft" style="margin-top:12px">
            <h3>Regra do 1/3 salarial</h3>
            <p class="muted" v-if="paymentSource==='assets'">Não aplicada porque o pagamento foi marcado por bens/garantias.</p>
            <template v-else><p>Prestação estimada: <strong>{{ mzn(monthlyInstallment) }}</strong></p><p>Limite permitido: <strong>{{ mzn(limitSalary) }}</strong></p><span :class="salaryOk ? 'status-pill st-approved' : 'status-pill st-rejected'">{{ salaryOk ? 'Dentro da regra' : 'Excede 1/3 do salário' }}</span></template>
          </div>
        </div>
        <div class="modern-card">
          <h2>3. Upload documental no acto do pedido</h2>
          <div class="doc-upload-grid single">
            <div v-for="d in checklist" :key="d.type" class="upload-card" :class="{ ok: d.doc || uploads[d.type] }">
              <div><strong>{{ d.label }}</strong><span>{{ d.doc ? 'Já existe na base de dados' : uploads[d.type]?.name || 'Anexar ficheiro PDF/JPG/PNG' }}</span></div>
              <div class="action-row"><button v-if="d.doc" type="button" class="btn" @click="downloadDoc(d.doc)">Baixar</button><label class="btn btn-primary">{{ d.doc ? 'Substituir' : 'Anexar' }}<input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" @change="selectFile(d.type,$event)"></label></div>
            </div>
          </div>
          <div class="doc-progress"><div :style="{width: progress + '%'}"></div></div><p class="muted">{{ requiredCount }}/4 documentos obrigatórios disponíveis.</p>
          <button class="btn btn-primary btn-block" :disabled="submitting || !canSubmit" @click="submitLoan">{{ submitting ? 'A submeter...' : 'Submeter para aprovação do administrador' }}</button>
        </div>
      </div>
    </template>
    <div v-if="submitted" class="modal-backdrop"><div class="mk-modal"><div class="mk-modal-head"><h2>Pedido submetido</h2></div><p>Referência: <strong>{{ reference }}</strong></p><p class="muted">O pedido foi gravado no banco de dados e enviado ao administrador. Os campos foram limpos para evitar duplicação.</p><div class="modal-actions"><button class="btn btn-primary" @click="closeSuccess">Fechar e voltar ao dashboard</button></div></div></div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api, { uploadDocument, downloadDocument } from '@/services/api'
const router=useRouter(); const toast=useToast(); const loading=ref(true); const submitting=ref(false); const submitted=ref(false); const reference=ref('')
const profile=ref(null), docs=ref([]), products=ref([]), uploads=ref({}), paymentSource=ref('salary')
const client=ref({full_name:'',nuit:'',phone:'',email:''})
const form=ref({product_id:'',requested_amount:50000,term_months:12,purpose:'Crédito pessoal',purpose_detail:'',notary_document_confirmed:false})
const docTypes=[['bi','BI / Documento de identificação'],['nuit','NUIT'],['residence_certificate','Atestado de residência'],['bank_statement','Extracto bancário dos últimos 3 meses']]
const checklist=computed(()=>docTypes.map(([type,label])=>({type,label,doc:docs.value.find(x=>x.type===type)})))
const requiredCount=computed(()=>checklist.value.filter(d=>d.doc || uploads.value[d.type]).length)
const docsOk=computed(()=>requiredCount.value===4)
const progress=computed(()=>requiredCount.value*25)
const selectedProduct=computed(()=>products.value.find(p=>p.id===form.value.product_id))
const monthlyIncome=computed(()=>Number(profile.value?.monthly_income||0))
const rate=computed(()=>Number(selectedProduct.value?.interest_rate||0))
const monthlyInstallment=computed(()=>calcPmt(Number(form.value.requested_amount||0), rate.value, Number(form.value.term_months||1)))
const limitSalary=computed(()=>monthlyIncome.value/3)
const salaryOk=computed(()=>paymentSource.value==='assets' || !monthlyIncome.value || monthlyInstallment.value <= limitSalary.value)
const amountOk=computed(()=>!selectedProduct.value || (Number(form.value.requested_amount||0)>=Number(selectedProduct.value.min_amount||0) && Number(form.value.requested_amount||0)<=Number(selectedProduct.value.max_amount||0)))
const termOk=computed(()=>!selectedProduct.value || (Number(form.value.term_months||0)>=Number(selectedProduct.value.min_term_months||0) && Number(form.value.term_months||0)<=Number(selectedProduct.value.max_term_months||999)))
const limitMessage=computed(()=>{ if(!selectedProduct.value) return ''; if(!amountOk.value) return `Valor fora do limite do produto: ${mzn(selectedProduct.value.min_amount)}–${mzn(selectedProduct.value.max_amount)}`; if(!termOk.value) return `Prazo fora do limite do produto: ${selectedProduct.value.min_term_months}–${selectedProduct.value.max_term_months} meses`; return '' })
const canSubmit=computed(()=>docsOk.value && form.value.product_id && form.value.requested_amount && form.value.term_months && form.value.purpose && salaryOk.value && amountOk.value && termOk.value)
function calcPmt(v,r,n){ if(!v||!n)return 0; if(!r)return v/n; return (v*r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1) }
function mzn(v){return Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})}
function percent(r){return (Number(r||0)*100).toFixed(2)+'%'}
async function downloadDoc(d){ await downloadDocument(d.id, d.original_name || d.file_name || 'documento') }
function selectFile(type,e){const f=e.target.files?.[0]; if(f) uploads.value={...uploads.value,[type]:f}}
function syncProduct(){ const p=selectedProduct.value; if(p){form.value.requested_amount=Number(p.min_amount||50000); form.value.term_months=Number(p.min_term_months||12)} }
async function load(){
  loading.value=true
  try{
    const [me, prod] = await Promise.all([api.get('/clients/me'), api.get('/products?status=active')])
    profile.value=me.data.data; docs.value=profile.value.Documents||[]; const u=profile.value.User||{}
    client.value={full_name:u.full_name||'',nuit:profile.value.nuit||'',phone:u.phone||'',email:u.email||''}
    products.value=prod.data.data || []
    if(products.value[0]){ form.value.product_id=products.value[0].id; syncProduct() }
  } finally {loading.value=false}
}
async function submitLoan(){
  if(!canSubmit.value) return toast.error(limitMessage.value || 'Complete os documentos e a regra de elegibilidade antes de submeter.')
  submitting.value=true
  try{
    for(const [type,file] of Object.entries(uploads.value)){ await uploadDocument(file,type) }
    const payload={...form.value, payment_source:paymentSource.value, notary_document_confirmed:Number(form.value.requested_amount)>50000 && Number(form.value.requested_amount)<=100000}
    const {data}=await api.post('/loans', payload)
    reference.value=data.data.reference
    uploads.value={}; form.value={product_id:'',requested_amount:50000,term_months:12,purpose:'',purpose_detail:'',notary_document_confirmed:false}
    submitted.value=true
  } catch(e){ toast.error(e.response?.data?.message || 'Erro ao submeter pedido') }
  finally { submitting.value=false }
}
function closeSuccess(){ submitted.value=false; router.push('/client/home') }
onMounted(load)
</script>

<style scoped>.field-label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;color:var(--color-text-primary)}.field-label .input{font-weight:400}</style>
