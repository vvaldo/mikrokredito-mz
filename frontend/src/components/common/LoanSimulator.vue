<template>
  <div>
    <div class="modern-card" style="padding:14px;margin-bottom:12px" v-if="products.length">
      <h2 style="font-size:14px;margin-bottom:6px">Produto configurado pelo banco</h2>
      <select class="form-select" v-model="selectedProductId" @change="applyProduct">
        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} — {{ p.monthlyRate }}%/mês</option>
      </select>
      <p class="muted" style="margin-top:8px">{{ selectedProduct.description }}</p>
      <div class="doc-check" style="margin-top:8px">
        <span class="status-pill st-approved">Mín: {{ mzn(selectedProduct.min) }}</span>
        <span class="status-pill st-submitted">Máx: {{ mzn(selectedProduct.max) }}</span>
        <span class="status-pill st-under_review">Prazo: {{ selectedProduct.minTerm }}–{{ selectedProduct.maxTerm }} meses</span>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group"><label class="form-label">Valor (MZN)</label><input class="form-input" type="number" v-model.number="form.principal" :min="selectedProduct.min" :max="selectedProduct.max" step="1000" @input="calc" /></div>
      <div class="form-group"><label class="form-label">Prazo (meses)</label><input class="form-input" type="number" v-model.number="form.termMonths" :min="selectedProduct.minTerm" :max="selectedProduct.maxTerm" @input="calc" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Taxa mensal (%)</label><input class="form-input" type="number" v-model.number="form.monthlyRate" step="0.01" readonly style="background:var(--color-background-secondary)" /></div>
      <div class="form-group"><label class="form-label">Fonte de pagamento</label><select class="form-select" v-model="paymentSource" @change="calcElig"><option value="salary">Salário</option><option value="assets">Bens / actividade económica</option><option value="mixed">Salário + bens</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Tipo de juro</label><select class="form-select" v-model="form.type" @change="calc"><option value="reducing_balance">Saldo devedor</option><option value="flat">Taxa flat</option></select></div>
      <div class="form-group"><label class="form-label">Salário líquido mensal</label><input class="form-input" type="number" v-model.number="elig.salary" step="500" :disabled="paymentSource==='assets'" @input="calcElig" /></div>
    </div>

    <div class="modern-card" style="padding:14px;margin:12px 0">
      <h2 style="font-size:14px;margin-bottom:6px">Documentos obrigatórios do cliente</h2>
      <div class="doc-check">
        <label><input type="checkbox" v-model="docs.bi" @change="calcElig"> BI</label>
        <label><input type="checkbox" v-model="docs.nuit" @change="calcElig"> NUIT</label>
        <label><input type="checkbox" v-model="docs.residence" @change="calcElig"> Atestado de residência</label>
        <label><input type="checkbox" v-model="docs.bank" @change="calcElig"> Extracto bancário</label>
        <label><input type="checkbox" v-model="docs.salary" @change="calcElig"> Folha salarial</label>
        <label><input type="checkbox" v-model="docs.assets" @change="calcElig"> Declaração/garantia de bens</label>
      </div>
      <div :class="docsOk ? 'notice' : 'notice danger'">{{ docsOk ? 'Documentação mínima completa para submeter pedido.' : 'Sem BI, NUIT, residência e extracto bancário o pedido fica bloqueado.' }}</div>
      <div :class="amountRule.ok ? 'notice' : 'notice danger'">{{ amountRule.message }}</div>
    </div>

    <template v-if="result">
      <div class="result-block ok" style="margin-bottom:12px"><div class="result-label">Prestação mensal</div><div class="result-value">{{ mzn(result.monthly_installment) }}</div><div class="result-sub">{{ form.monthlyRate }}%/mês · {{ form.termMonths }} meses · {{ typeLabel }}</div></div>
      <div class="grid-3" style="gap:8px;margin-bottom:14px"><div class="stat-card"><div class="stat-value" style="font-size:15px">{{ mzn(result.total_repayable) }}</div><div class="stat-label">Total a pagar</div></div><div class="stat-card"><div class="stat-value" style="font-size:15px">{{ mzn(result.total_interest) }}</div><div class="stat-label">Total juros</div></div><div class="stat-card"><div class="stat-value" style="font-size:15px">{{ mzn(processingFee) }}</div><div class="stat-label">Comissão abertura</div></div></div>

      <div class="card mb-3">
        <div class="card-title">Regra do 1/3 salarial</div>
        <template v-if="paymentSource === 'assets'">
          <div class="alert alert-info"><div><strong>Não aplicada.</strong> O cliente escolheu pagar por bens/actividade económica. A análise segue por garantias, extractos e avaliação do agente.</div></div>
        </template>
        <template v-else-if="eligResult">
          <div class="form-row"><div class="form-group"><label class="form-label">Outros encargos/mês</label><input class="form-input" type="number" v-model.number="elig.burden" step="500" @input="calcElig" /></div><div class="form-group"><label class="form-label">Limite disponível</label><input class="form-input" :value="mzn(eligResult.maxAvail)" readonly /></div></div>
          <div class="flex items-center justify-between mb-2"><span class="text-sm">Utilização do limite</span><StatusBadge :status="eligResult.ok ? 'approved' : 'rejected'" /></div>
          <div class="progress mb-2"><div class="progress-fill" :class="{ danger: !eligResult.ok, warning: eligResult.pct > 80 && eligResult.ok }" :style="{ width: Math.min(eligResult.pct, 100) + '%' }"></div></div>
          <div class="flex items-center justify-between text-xs text-muted" style="margin-bottom:12px"><span>{{ eligResult.pct.toFixed(1) }}% utilizado</span><span>Disponível: <strong>{{ mzn(eligResult.maxAvail) }}/mês</strong></span></div>
          <div v-if="!eligResult.ok" class="alert alert-danger"><div><strong>Excede o limite de 1/3.</strong> Pedido passa para análise por bens/garantias ou deve reduzir valor/prazo.</div></div>
          <div v-else class="alert alert-success"><div><strong>Elegível por salário.</strong> Prestação dentro do limite e documentação obrigatória completa.</div></div>
        </template>
      </div>

      <div class="card mb-3">
        <div class="card-title">Plano de pagamento</div>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>Vencimento</th><th>Capital</th><th>Juro</th><th>Prestação</th><th>Saldo</th></tr></thead><tbody><tr v-for="row in visibleSchedule" :key="row.installment_number"><td class="td-muted">{{ row.installment_number }}</td><td class="td-muted">{{ dueDate(row.installment_number) }}</td><td>{{ mzn(row.principal_due) }}</td><td>{{ mzn(row.interest_due) }}</td><td style="font-weight:500">{{ mzn(row.total_due) }}</td><td class="td-muted">{{ mzn(row.balance_after) }}</td></tr></tbody></table></div>
        <button v-if="result.schedule.length > 6" class="btn btn-sm" style="margin-top:10px;width:100%" @click="showAll = !showAll">{{ showAll ? 'Mostrar menos' : 'Expandir todas as prestações (' + result.schedule.length + ')' }}</button>
      </div>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useLoanStore } from '@/stores/loans'
import api from '@/services/api'
import StatusBadge from './StatusBadge.vue'
import { format, addMonths } from 'date-fns'
import { pt } from 'date-fns/locale'
const props = defineProps({ defaultAmount:{type:Number,default:45000}, defaultTerm:{type:Number,default:18}, defaultRate:{type:Number,default:3.2}, precheckedDocs:{type:Boolean,default:false} })
const emit = defineEmits(['result'])
const loanStore = useLoanStore()
const fallbackProducts = [
  { id:'fallback-rapido50', name:'Crédito Rápido até 50 mil', monthlyRate:3.2, min:5000, max:50000, minTerm:1, maxTerm:24, description:'Produto base de demonstração. Configure e aprove produtos reais para substituir esta lista.' },
]
const products = ref([])
const selectedProductId = ref('')
async function loadProducts(){
  try{
    const { data } = await api.get('/products')
    const rows = Array.isArray(data.data) ? data.data : []
    products.value = rows.map(p => ({
      raw:p,
      id:p.id,
      name:p.name,
      monthlyRate:Number(p.interest_rate || 0) * 100,
      min:Number(p.min_amount || 0),
      max:Number(p.max_amount || 0),
      minTerm:Number(p.min_term_months || 1),
      maxTerm:Number(p.max_term_months || 12),
      description:p.description || 'Produto aprovado pelo Super Admin e configurado pelo banco.',
      institution:p.Institution?.name || p.institution?.name || ''
    }))
  }catch(e){ products.value = [] }
  if(!products.value.length) products.value = fallbackProducts
  if(!selectedProductId.value || !products.value.find(p => p.id === selectedProductId.value)) selectedProductId.value = products.value[0]?.id || ''
  applyProduct()
}
const selectedProduct = computed(() => products.value.find(p => p.id === selectedProductId.value) || products.value[0] || fallbackProducts[0])
const form = ref({ principal: props.defaultAmount, termMonths: props.defaultTerm, monthlyRate: props.defaultRate, type:'reducing_balance' })
const paymentSource = ref('salary')
const elig = ref({ salary:25000, burden:3000 })
const docs = ref({ bi:props.precheckedDocs, nuit:props.precheckedDocs, residence:props.precheckedDocs, bank:props.precheckedDocs, salary:false, assets:false })
const result = ref(null), eligResult = ref(null), showAll = ref(false)
const docsOk = computed(() => docs.value.bi && docs.value.nuit && docs.value.residence && docs.value.bank)
const amountRule = computed(() => { const v = Number(form.value.principal||0); if(v<=50000) return {ok:docsOk.value,message:docsOk.value?'Até 50.000 MZN: elegível para desembolso em menos de 24h.':'Até 50.000 MZN: exige todos os documentos.'}; if(v<=100000) return {ok:docsOk.value,message:docsOk.value?'51.000–100.000 MZN: condicionado à formalização em cartório/escritório.':'51.000–100.000 MZN: exige documentos e formalização.'}; return {ok:docsOk.value && docs.value.assets,message:'Acima de 100.000 MZN: requer bens/garantias e análise manual.'} })
const processingFee = computed(() => result.value ? Math.round(form.value.principal * 0.02) : 0)
const typeLabel = computed(() => form.value.type === 'flat' ? 'Taxa flat' : 'Saldo devedor')
const visibleSchedule = computed(() => showAll.value ? result.value.schedule : result.value.schedule.slice(0,6))
watch(() => props.defaultRate, v => { form.value.monthlyRate = v })
function applyProduct(){ const p=selectedProduct.value; form.value.monthlyRate=p.monthlyRate; if(form.value.principal<p.min || form.value.principal>p.max) form.value.principal=p.min; if(form.value.termMonths<p.minTerm || form.value.termMonths>p.maxTerm) form.value.termMonths=p.minTerm; calc() }
function calc(){ if(!form.value.principal || !form.value.termMonths || !form.value.monthlyRate) return; const r=loanStore.simulateLocal({ principal:form.value.principal, monthlyRate:form.value.monthlyRate/100, termMonths:form.value.termMonths, type:form.value.type }); result.value=r; emit('result',{...r,form:{...form.value}, product:selectedProduct.value, docsOk:docsOk.value, paymentSource:paymentSource.value, processingFee:processingFee.value}); calcElig() }
function calcElig(){ if(!result.value) return; if(paymentSource.value==='assets'){ eligResult.value={ok:docsOk.value && docs.value.assets,maxAvail:0,pct:0}; return } const maxAvail=Math.floor((elig.value.salary||0)/3)-(elig.value.burden||0); const pmt=result.value.monthly_installment; eligResult.value={ ok:pmt<=maxAvail && docsOk.value && amountRule.value.ok, maxAvail:Math.max(maxAvail,0), pct:elig.value.salary>0?(pmt/(elig.value.salary/3))*100:0 } }
function dueDate(n){ return format(addMonths(new Date(), n), 'MMM yyyy', { locale: pt }) }
function mzn(v){ return Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0}) }
onMounted(loadProducts)
</script>
