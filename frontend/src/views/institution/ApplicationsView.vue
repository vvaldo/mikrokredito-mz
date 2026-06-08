<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Pedidos de Crédito</h1>
      <p>Todos os pedidos submetidos pelos clientes aparecem aqui para o administrador do banco e para o superadmin.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="openNew">+ Novo pedido</button>
        <button class="btn" @click="load">Actualizar</button>
        <button class="btn" @click="exportCsv">Exportar pedidos</button>
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi good"><div class="label">Pedidos</div><div class="value">{{ items.length }}</div><div class="note">Base de dados</div></div>
      <div class="kpi warn"><div class="label">Submetidos/análise</div><div class="value">{{ pending }}</div><div class="note">Aguardam acção</div></div>
      <div class="kpi"><div class="label">Valor solicitado</div><div class="value">{{ mzn(total) }}</div><div class="note">Total</div></div>
      <div class="kpi danger"><div class="label">Rejeitados</div><div class="value">{{ rejected }}</div><div class="note">Finalizados</div></div>
    </div>

    <div class="modern-card">
      <h2>Lista de pedidos</h2>
      <p v-if="loading" class="muted">A carregar pedidos...</p>
      <table v-else class="modern-table">
        <thead><tr><th>Ref.</th><th>Cliente</th><th>Produto</th><th>Valor desembolsado</th><th>Total com juros</th><th>Docs</th><th>Status</th><th>Acções</th></tr></thead>
        <tbody>
          <tr v-if="items.length===0"><td colspan="8" class="muted">Sem pedidos submetidos.</td></tr>
          <tr v-for="r in items" :key="r.id">
            <td><strong>{{ r.reference }}</strong></td>
            <td>{{ r.Client?.User?.full_name || 'Cliente' }}</td>
            <td>{{ r.CreditProduct?.name || 'Produto' }}</td>
            <td>{{ mzn(disbursedValue(r)) }}</td>
            <td><strong>{{ mzn(totalWithInterest(r)) }}</strong></td>
            <td>{{ docCount(r) }}/4</td>
            <td><span :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
            <td><div class="action-row">
              <button class="btn btn-sm" @click="openView(r)">Visualizar</button>
              <button class="btn btn-sm btn-blue-soft" :disabled="r.status!=='submitted'" @click="changeStatus(r,'under_review')">Enviar para análise</button>
              <button class="btn btn-sm btn-primary" :disabled="r.status!=='under_review' || docCount(r)<4" @click="confirmAction(r,'approved')">Aprovar</button>
              <button class="btn btn-sm btn-danger-soft" :disabled="!['submitted','under_review','docs_requested'].includes(r.status)" @click="confirmAction(r,'rejected')">Desaprovar</button>
              <button class="btn btn-sm btn-primary" :disabled="r.status!=='approved'" @click="disburse(r)">Desembolsar</button>
            </div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="modal-backdrop" @click.self="close">
      <div class="mk-modal wide">
        <div class="mk-modal-head"><h2>{{ modalTitle }}</h2><button class="modal-x" @click="close">×</button></div>
        <div v-if="modal==='view' && selected">
          <div class="detail-grid">
            <div><span class="muted">Ref.</span><strong>{{ selected.reference }}</strong></div>
            <div><span class="muted">Cliente</span><strong>{{ selected.Client?.User?.full_name || '—' }}</strong></div>
            <div><span class="muted">Valor emprestado</span><strong>{{ mzn(selected.approved_amount || selected.requested_amount) }}</strong></div>
            <div><span class="muted">Juros total</span><strong>{{ mzn(totalInterest(selected)) }}</strong></div>
            <div><span class="muted">Total a pagar</span><strong>{{ mzn(selected.total_repayable) }}</strong></div>
            <div><span class="muted">Prestação mensal</span><strong>{{ mzn(selected.monthly_installment) }}</strong></div>
            <div><span class="muted">Status</span><strong>{{ statusLabel(selected.status) }}</strong></div>
            <div><span class="muted">Aprovado em</span><strong>{{ selected.reviewed_at ? date(selected.reviewed_at) : '—' }}</strong></div>
            <div><span class="muted">ID funcionário</span><strong class="small-id">{{ selected.reviewed_by || '—' }}</strong></div>
          </div>
          <h3 style="margin-top:16px">Documentos submetidos</h3>
          <div v-if="(selected.Documents||[]).length===0" class="muted">Sem documentos submetidos.</div>
          <div v-for="d in selected.Documents" :key="d.id" class="doc-row"><div><strong>{{ docLabel(d.type) }}</strong><p class="muted">{{ d.original_name || d.file_name }} · {{ d.status }}</p></div><button class="btn" @click="downloadDoc(d)">Baixar</button></div>
          <h3 style="margin-top:16px">Lista de prestações</h3>
          <div v-if="!paymentSchedules(selected).length" class="muted">A lista de prestações será criada após o desembolso.</div>
          <table v-else class="modern-table"><thead><tr><th>#</th><th>Vencimento</th><th>Capital</th><th>Juro</th><th>Total</th><th>Estado</th></tr></thead><tbody><tr v-for="p in paymentSchedules(selected)" :key="p.id"><td>{{ p.installment_number }}</td><td>{{ date(p.due_date) }}</td><td>{{ mzn(p.principal_amount) }}</td><td>{{ mzn(p.interest_amount) }}</td><td>{{ mzn(p.total_due) }}</td><td>{{ p.status }}</td></tr></tbody></table>
        </div>
        <form v-if="modal==='new'" @submit.prevent="saveNew">
          <div class="form-grid">
            <select class="input" v-model="newForm.client_id" required><option value="">Seleccione cliente existente</option><option v-for="c in clients" :key="c.id" :value="c.id">{{ c.User?.full_name }} — {{ c.User?.email }}</option></select>
            <select class="input" v-model="newForm.product_id" required><option value="">Seleccione produto activo</option><option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} — {{ percent(p.interest_rate) }}/mês</option></select>
            <input class="input" type="number" v-model.number="newForm.requested_amount" placeholder="Valor solicitado" required>
            <input class="input" type="number" v-model.number="newForm.term_months" placeholder="Prazo em meses" required>
          </div>
          <input class="input" v-model="newForm.purpose" placeholder="Finalidade" required>
          <div class="modal-actions"><button class="btn" type="button" @click="close">Cancelar</button><button class="btn btn-primary" type="submit">Submeter pedido</button></div>
        </form>
        <div v-if="modal==='confirm' && selected">
          <p>Confirma alterar o pedido <strong>{{ selected.reference }}</strong> para <strong>{{ statusLabel(action) }}</strong>?</p>
          <textarea v-if="action==='rejected'" class="input" v-model="reason" placeholder="Motivo da desaprovação"></textarea>
          <div class="modal-actions"><button class="btn" @click="close">Cancelar</button><button :class="['btn', action==='approved' ? 'btn-primary' : 'btn-danger-soft']" @click="applyDecision">Confirmar</button></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import api, { downloadDocument } from '@/services/api'
const toast=useToast(); const loading=ref(false); const items=ref([]); const modal=ref(null); const selected=ref(null); const action=ref(null); const reason=ref(''); const clients=ref([]); const products=ref([]); const newForm=ref({client_id:'',product_id:'',requested_amount:null,term_months:12,purpose:''})
const requiredDocs=['bi','nuit','residence_certificate','bank_statement']
const pending=computed(()=>items.value.filter(i=>['submitted','under_review','docs_requested'].includes(i.status)).length)
const rejected=computed(()=>items.value.filter(i=>i.status==='rejected').length)
const total=computed(()=>items.value.reduce((s,i)=>s+Number(i.requested_amount||0),0))
const modalTitle=computed(()=>modal.value==='confirm'?'Confirmar decisão':'Detalhe do pedido')
function mzn(v){return Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0})}
function date(v){return v?new Date(v).toLocaleDateString('pt-MZ'):'—'}
function statusLabel(s){return {submitted:'Submetido',under_review:'Em análise',docs_requested:'Documentos solicitados',approved:'Aprovado',rejected:'Desaprovado',disbursed:'Desembolsado'}[s]||s}
function percent(v){return (Number(v||0)*100).toFixed(2)+'%'}
function statusClass(s){return ['approved','disbursed'].includes(s)?'status-pill st-approved':s==='rejected'?'status-pill st-rejected':'status-pill st-under_review'}
function docLabel(t){return {bi:'BI',nuit:'NUIT',residence_certificate:'Atestado de residência',bank_statement:'Extracto bancário',income_proof:'Folha salarial'}[t]||t}
function docCount(r){ if(r.document_summary) return Number(r.document_summary.submitted||0); const set=new Set((r.Documents||[]).map(d=>d.type)); return requiredDocs.filter(d=>set.has(d)).length}
function totalInterest(r){ return Math.max(0, Number(r.total_repayable||0) - Number(r.approved_amount || r.requested_amount || 0)) }
function totalWithInterest(r){ return Number(r.total_repayable || r.approved_amount || r.requested_amount || 0) }
function disbursedValue(r){ return Number(r.approved_amount || r.requested_amount || 0) }
function paymentSchedules(r){ return r.Loan?.PaymentSchedules || [] }
async function load(){loading.value=true; try{const [lo,cl,pr]=await Promise.all([api.get('/loans',{params:{limit:100}}),api.get('/clients',{params:{limit:200}}),api.get('/products')]); items.value=lo.data.data||[]; clients.value=cl.data.data||[]; products.value=pr.data.data||[]} finally{loading.value=false}}
function close(){modal.value=null;selected.value=null;action.value=null;reason.value=''}
async function openView(r){ try{ const {data}=await api.get('/loans/'+r.id); selected.value=data.data||r }catch(e){ selected.value=r } modal.value='view'}
function openNew(){newForm.value={client_id:'',product_id:'',requested_amount:null,term_months:12,purpose:''}; modal.value='new'}
async function saveNew(){try{await api.post('/loans',newForm.value); toast.success('Pedido criado e enviado para notificações do banco/superadmin.'); close(); await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao criar pedido')}}
function confirmAction(r,a){selected.value=r;action.value=a;modal.value='confirm'}
async function changeStatus(r,status){try{await api.patch(`/loans/${r.id}`,{status}); toast.success('Estado actualizado para '+statusLabel(status)); await load()}catch(e){toast.error(e.response?.data?.message || 'Erro ao actualizar estado')}}
async function applyDecision(){ if(action.value==='approved' && docCount(selected.value)<4) return toast.error('Não pode aprovar sem BI, NUIT, atestado e extracto.'); await changeStatus(selected.value, action.value); close() }
async function disburse(r){try{await api.post(`/loans/${r.id}/disburse`); toast.success('Pedido desembolsado e cliente notificado.'); await load()}catch(e){toast.error(e.response?.data?.message || 'Erro ao desembolsar')}}
async function downloadDoc(d){ await downloadDocument(d.id, d.original_name || d.file_name || 'documento') }
function exportCsv(){toast.success('Exportação preparada.');}
onMounted(load)
</script>
<style scoped>.doc-row{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid var(--color-border-tertiary);padding:10px 0}.small-id{font-size:11px;word-break:break-all}</style>
