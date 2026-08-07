<template>
  <div class="modern-page">
    <section class="modern-hero"><h1>Pagamentos</h1><p>Pagamentos reais da BD com filtros, exportação, data de submissão e utilizador que registou.</p><div class="hero-actions"><button class="btn btn-primary" @click="openPay">+ Fazer pagamento</button><button class="btn" @click="load">Actualizar</button></div></section>
    <div class="kpi-grid"><div class="kpi good"><div class="label">Hoje</div><div class="value">{{ mzn(summary.today) }}</div></div><div class="kpi"><div class="label">Semana</div><div class="value">{{ mzn(summary.week) }}</div></div><div class="kpi"><div class="label">Mês</div><div class="value">{{ mzn(summary.month) }}</div></div><div class="kpi warn"><div class="label">Ano</div><div class="value">{{ mzn(summary.year) }}</div></div></div>
    <div class="modern-card"><div class="table-head"><div><h2>Lista de pagamentos</h2><p class="muted">Pode exportar tudo ou apenas os pagamentos filtrados.</p></div><div class="action-row"><button class="btn" @click="exportExcel">Exportar Excel</button><button class="btn" @click="exportPdf">Exportar PDF</button></div></div>
      <div class="form-grid" style="margin-bottom:14px"><label class="field"><span>Filtrar por nome</span><input class="input" v-model="filters.name" placeholder="Nome do cliente ou utilizador"></label><label class="field"><span>De</span><input class="input" type="date" v-model="filters.from"></label><label class="field"><span>Até</span><input class="input" type="date" v-model="filters.to"></label><label class="field"><span>Método</span><select class="input" v-model="filters.method"><option value="">Todos</option><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option><option value="bank_transfer">Transferência bancária</option><option value="cash">Depósito/POS</option><option value="reference">Referência</option></select></label></div>
      <LoadingSpinner v-if="loading" label="A carregar pagamentos..." />
      <template v-else>
      <div class="table-wrap">
      <table class="modern-table"><thead><tr><th>Referência</th><th>Cliente</th><th>Empréstimo</th><th>Valor</th><th>Mora</th><th>Método</th><th>Submetido em</th><th>Registado por</th><th>Comprovativo</th><th>Estado</th><th></th></tr></thead><tbody><tr v-for="p in pagedPayments" :key="p.id"><td><strong>{{ p.reference }}</strong><br><span class="muted">{{ p.external_reference }}</span></td><td>{{ clientName(p) }}</td><td>{{ loanRef(p) }}</td><td>{{ mzn(p.amount) }}</td><td>{{ mzn(p.applied_late_fee) }}</td><td>{{ methodLabel(p.method) }}</td><td>{{ dateTime(p.created_at) }}</td><td>{{ p.registered_by_user?.full_name || 'Sistema/Cliente' }}</td><td>{{ p.receipt_original_name || '—' }}</td><td><StatusBadge :status="p.status" /></td><td><div class="action-row"><button class="btn btn-sm" @click="viewPay(p)">Ver</button><button class="btn btn-sm" :disabled="!p.receipt_file_name" @click="downloadReceipt(p)">Ver comprovativo</button></div></td></tr><tr v-if="!filteredPayments.length"><td colspan="11" class="empty-state">Sem pagamentos para o filtro escolhido.</td></tr></tbody></table>
      </div>
      <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="filteredPayments.length" />
      </template>
    </div>
    <div v-if="modal==='pay'" class="modal-backdrop" @click.self="modal=null"><div class="mk-modal wide"><div class="mk-modal-head"><h2>Registar pagamento do mês</h2><button class="modal-x" @click="modal=null">×</button></div><form @submit.prevent="savePay"><div class="form-grid"><label class="field"><span>Empréstimo / Cliente</span><select class="input" v-model="pay.loan_id" required><option value="">Seleccione empréstimo</option><option v-for="l in loans" :value="l.id" :key="l.id">{{ l.LoanApplication?.reference }} — {{ l.LoanApplication?.Client?.User?.full_name }} — saldo {{ mzn(l.outstanding_balance) }}</option></select></label><label class="field"><span>Valor pago</span><input class="input" type="number" v-model.number="pay.amount" required></label><label class="field"><span>Via de pagamento</span><select class="input" v-model="pay.method"><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option><option value="bank_transfer">Transferência bancária</option><option value="cash">Depósito/POS</option><option value="reference">Referência</option></select></label><label class="field"><span>Número de referência/comprovativo</span><input class="input" v-model="pay.external_reference" required></label><label class="field"><span>Telefone, quando aplicável</span><input class="input" v-model="pay.phone_number"></label></div><label class="upload-card"><div><strong>Comprovativo digitalizado</strong><span>{{ pay.receipt?.name || 'Anexar scan/comprovativo obrigatório' }}</span></div><input type="file" @change="e=>pay.receipt=e.target.files?.[0]" required></label><div class="modal-actions"><button class="btn" type="button" @click="modal=null">Cancelar</button><button class="btn btn-primary" type="submit">Gravar pagamento na BD</button></div></form></div></div>

    <div v-if="modal==='view'" class="modal-backdrop" @click.self="modal=null">
      <div class="mk-modal wide">
        <div class="mk-modal-head"><h2>Pagamento {{ selected?.reference }}</h2><button class="modal-x" @click="modal=null">×</button></div>
        <div v-if="selected">
          <div v-if="selected.status==='reversed'" class="alert alert-danger" style="margin-bottom:12px">Pagamento cancelado em {{ dateTime(selected.cancelled_at) }}<span v-if="selected.cancel_reason"> — {{ selected.cancel_reason }}</span></div>
          <div v-if="selected.edited_at" class="alert alert-info" style="margin-bottom:12px">Editado em {{ dateTime(selected.edited_at) }}<span v-if="selected.original_amount!=null"> — valor original: {{ mzn(selected.original_amount) }}</span></div>
          <div v-if="!editingPay" class="detail-grid">
            <div><span class="muted">Cliente</span><strong>{{ clientName(selected) }}</strong></div>
            <div><span class="muted">Empréstimo</span><strong>{{ loanRef(selected) }}</strong></div>
            <div><span class="muted">Valor</span><strong>{{ mzn(selected.amount) }}</strong></div>
            <div><span class="muted">Mora aplicada</span><strong>{{ mzn(selected.applied_late_fee) }}</strong></div>
            <div><span class="muted">Método</span><strong>{{ methodLabel(selected.method) }}</strong></div>
            <div><span class="muted">Referência</span><strong>{{ selected.external_reference || '—' }}</strong></div>
            <div><span class="muted">Telefone</span><strong>{{ selected.phone_number || '—' }}</strong></div>
            <div><span class="muted">Submetido em</span><strong>{{ dateTime(selected.created_at) }}</strong></div>
            <div><span class="muted">Estado</span><strong><StatusBadge :status="selected.status" /></strong></div>
          </div>
          <form v-else class="form-grid" @submit.prevent="saveEditPay">
            <label class="field"><span>Valor pago</span><input class="input" type="number" v-model.number="editForm.amount" required></label>
            <label class="field"><span>Via de pagamento</span><select class="input" v-model="editForm.method"><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option><option value="bank_transfer">Transferência bancária</option><option value="cash">Depósito/POS</option><option value="reference">Referência</option></select></label>
            <label class="field"><span>Nº referência/comprovativo</span><input class="input" v-model="editForm.external_reference"></label>
            <label class="field"><span>Telefone</span><input class="input" v-model="editForm.phone_number"></label>
          </form>
          <div class="modal-actions" style="margin-top:16px">
            <template v-if="editingPay">
              <button class="btn" type="button" @click="editingPay=false">Cancelar edição</button>
              <button class="btn btn-primary" type="button" @click="saveEditPay">Guardar alterações</button>
            </template>
            <template v-else>
              <button class="btn" type="button" @click="modal=null">Fechar</button>
              <template v-if="selected.status==='confirmed'">
                <button class="btn btn-blue-soft" type="button" @click="startEditPay">Editar</button>
                <button class="btn btn-danger-soft" type="button" @click="cancelPay">Cancelar pagamento</button>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'; import { useToast } from 'vue-toastification'; import api from '@/services/api'; import StatusBadge from '@/components/common/StatusBadge.vue'; import AppPagination from '@/components/common/AppPagination.vue'; import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
const toast=useToast(); const loading=ref(false); const payments=ref([]), loans=ref([]), summary=ref({today:0,week:0,month:0,year:0}), modal=ref(null), pay=ref({loan_id:'',amount:null,method:'bank_transfer',external_reference:'',phone_number:'',receipt:null}); const filters=ref({name:'',from:'',to:'',method:''}); const mzn=v=>Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0});
const selected=ref(null); const editingPay=ref(false); const editForm=ref({amount:null,method:'',external_reference:'',phone_number:''})
const page=ref(1), pageSize=ref(10)
const methodLabel=m=>({mpesa:'M-Pesa',emola:'e-Mola',bank_transfer:'Transferência bancária',cash:'Depósito/POS',reference:'Referência'})[m]||m; const dateTime=v=>v?new Date(v).toLocaleString('pt-MZ'):'—'; const clientName=p=>p.Loan?.LoanApplication?.Client?.User?.full_name || p.Loan?.Client?.User?.full_name || 'Cliente'; const loanRef=p=>p.Loan?.LoanApplication?.reference || '—';
const filteredPayments=computed(()=>payments.value.filter(p=>{const q=filters.value.name.trim().toLowerCase(); const name=(clientName(p)+' '+(p.registered_by_user?.full_name||'')).toLowerCase(); if(q&&!name.includes(q))return false; if(filters.value.method&&p.method!==filters.value.method)return false; const d=new Date(p.created_at); if(filters.value.from&&d<new Date(filters.value.from))return false; if(filters.value.to){const to=new Date(filters.value.to); to.setHours(23,59,59,999); if(d>to)return false} return true}))
const pagedPayments=computed(()=>filteredPayments.value.slice((page.value-1)*pageSize.value, page.value*pageSize.value))
watch(filteredPayments, () => { page.value = 1 })
function openPay(){pay.value={loan_id:'',amount:null,method:'bank_transfer',external_reference:'',phone_number:'',receipt:null}; modal.value='pay'}
async function load(){loading.value=true; try{const [p,l,s]=await Promise.all([api.get('/payments?limit=100000'),api.get('/loans/active/list?limit=100000'),api.get('/payments/summary')]); payments.value=p.data.data||[]; loans.value=l.data.data||[]; summary.value=s.data.data||summary.value}catch(e){toast.error(e.response?.data?.message||'Erro ao carregar pagamentos')} finally{loading.value=false}}
async function savePay(){try{const fd=new FormData(); for(const k of ['loan_id','amount','method','external_reference','phone_number']) fd.append(k,pay.value[k]||''); fd.append('receipt',pay.value.receipt); await api.post('/payments/manual',fd,{headers:{'Content-Type':'multipart/form-data'}}); toast.success('Pagamento gravado, mora calculada e cliente notificado'); modal.value=null; await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao gravar pagamento')}}
function viewPay(p){ selected.value=p; editingPay.value=false; modal.value='view' }
function startEditPay(){ editForm.value={amount:selected.value.amount, method:selected.value.method, external_reference:selected.value.external_reference, phone_number:selected.value.phone_number}; editingPay.value=true }
async function saveEditPay(){ try{ await api.patch(`/payments/${selected.value.id}`, editForm.value); toast.success('Pagamento actualizado e saldo recalculado'); editingPay.value=false; modal.value=null; await load() }catch(e){ toast.error(e.response?.data?.message||'Erro ao editar pagamento') } }
async function cancelPay(){ if(!confirm(`Cancelar o pagamento ${selected.value.reference}? O total pago do empréstimo será reduzido.`)) return; const reason=prompt('Motivo do cancelamento (opcional):')||''; try{ await api.post(`/payments/${selected.value.id}/cancel`, { reason }); toast.success('Pagamento cancelado e saldo actualizado'); modal.value=null; await load() }catch(e){ toast.error(e.response?.data?.message||'Erro ao cancelar pagamento') } }
async function downloadReceipt(p){try{const r=await api.get(`/payments/${p.id}/receipt`,{responseType:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([r.data])); a.download=p.receipt_original_name||'comprovativo'; a.click(); URL.revokeObjectURL(a.href)}catch(e){toast.error('Erro ao baixar comprovativo')}} function paymentRows(){return [['Ref','Cliente','Empréstimo','Valor','Mora','Método','Submetido em','Registado por','Estado'],...filteredPayments.value.map(p=>[p.reference,clientName(p),loanRef(p),p.amount,p.applied_late_fee,methodLabel(p.method),dateTime(p.created_at),p.registered_by_user?.full_name||'Sistema/Cliente',p.status])]} function exportExcel(){const rows=paymentRows(); const html='<table>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+String(c??'').replaceAll('&','&amp;').replaceAll('<','&lt;')+'</td>').join('')+'</tr>').join('')+'</table>'; const blob=new Blob([html],{type:'application/vnd.ms-excel'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pagamentos-filtrados.xls'; a.click(); URL.revokeObjectURL(a.href)} function exportPdf(){const rows=paymentRows(); const totalPago=filteredPayments.value.reduce((s,p)=>s+Number(p.amount||0),0); const totalMora=filteredPayments.value.reduce((s,p)=>s+Number(p.applied_late_fee||0),0); const win=window.open('','_blank'); win.document.write('<html><head><title>Pagamentos</title><style>body{font-family:Arial;padding:24px;color:#111827}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;font-size:12px}h1{font-size:18px}.totals{margin-top:18px;border:1px solid #ddd;padding:12px;background:#f8fafc}.totals p{margin:4px 0}</style></head><body><h1>Relatório de Pagamentos</h1><table>'+rows.map((r,i)=>'<tr>'+r.map(c=>(i===0?'<th>':'<td>')+String(c??'')+(i===0?'</th>':'</td>')).join('')+'</tr>').join('')+'</table><div class="totals"><p><strong>Total Pago:</strong> '+mzn(totalPago)+'</p><p><strong>Juros de mora acumulado nos pagamentos filtrados:</strong> '+mzn(totalMora)+'</p><p><strong>Total de registos:</strong> '+filteredPayments.value.length+'</p></div></body></html>'); win.document.close(); win.focus(); win.print()} onMounted(load)
</script>
