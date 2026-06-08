<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Produtos dos Bancos</h1>
      <p>Lista todos os produtos criados pelos gestores. Só produtos aprovados e visíveis entram no simulador/comparador dos clientes, gestores e superadmin.</p>
      <div class="hero-actions"><button class="btn" @click="load">Actualizar</button><button class="btn" @click="exportCsv">Exportar CSV</button></div>
    </section>
    <div class="modern-card">
      <table class="modern-table">
        <thead><tr><th>Produto</th><th>Banco</th><th>Faixa</th><th>Taxa</th><th>Mora</th><th>Prazo</th><th>Estado</th><th>Acções</th></tr></thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td><strong>{{ p.name }}</strong><br><span class="muted">{{ p.description || 'Sem descrição' }}</span></td>
            <td>{{ p.Institution?.name || '—' }}</td>
            <td>{{ mzn(p.min_amount) }} – {{ mzn(p.max_amount) }}</td>
            <td>{{ percent(p.interest_rate) }}/mês</td>
            <td>{{ percent(p.late_fee_rate) }}/dia</td>
            <td>{{ p.min_term_months }}–{{ p.max_term_months }} meses</td>
            <td><span :class="p.status==='active' && p.is_visible ? 'status-pill st-approved' : 'status-pill st-submitted'">{{ p.status==='active' && p.is_visible ? 'Aprovado' : 'Pendente' }}</span></td>
            <td><div class="action-row"><button class="btn btn-sm btn-primary" :disabled="p.status==='active' && p.is_visible" @click="approve(p)">Aprovar</button><button class="btn btn-sm" @click="openEdit(p)">Editar</button><button class="btn btn-sm btn-danger-soft" @click="disable(p)">Desactivar</button></div></td>
          </tr>
          <tr v-if="!products.length"><td colspan="8" class="empty-state">Sem produtos registados.</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="modal" class="modal-backdrop" @click.self="modal=false"><div class="mk-modal wide"><div class="mk-modal-head"><h2>Editar produto</h2><button class="modal-x" @click="modal=false">×</button></div><form @submit.prevent="save"><div class="form-grid"><label class="field"><span>Nome</span><input class="input" v-model="form.name" required></label><label class="field"><span>Valor mínimo</span><input class="input" type="number" v-model.number="form.min_amount" required></label><label class="field"><span>Valor máximo</span><input class="input" type="number" v-model.number="form.max_amount" required></label><label class="field"><span>Taxa mensal (%)</span><input class="input" type="number" step="0.01" v-model.number="form.rate_percent" required></label><label class="field"><span>Juros de mora diária (%)</span><input class="input" type="number" step="0.01" v-model.number="form.late_fee_percent" required></label><label class="field"><span>Prazo mínimo</span><input class="input" type="number" v-model.number="form.min_term_months" required></label><label class="field"><span>Prazo máximo</span><input class="input" type="number" v-model.number="form.max_term_months" required></label></div><label class="field full"><span>Descrição</span><textarea class="input" v-model="form.description"></textarea></label><div class="modal-actions"><button class="btn" type="button" @click="modal=false">Cancelar</button><button class="btn btn-primary">Gravar</button></div></form></div></div>
  </div>
</template>
<script setup>
import { ref,onMounted } from 'vue'; import { useToast } from 'vue-toastification'; import api from '@/services/api'
const toast=useToast(); const products=ref([]); const modal=ref(false); const form=ref({})
const mzn=v=>Number(v||0).toLocaleString('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0}); const percent=v=>(Number(v||0)*100).toFixed(2)+'%'
async function load(){ const {data}=await api.get('/products/admin'); products.value=data.data||[] }
async function approve(p){ await api.post(`/products/${p.id}/approve`); toast.success('Produto aprovado e disponível no simulador.'); await load() }
async function disable(p){ await api.delete(`/products/${p.id}`); toast.success('Produto desactivado.'); await load() }
function openEdit(p){ form.value={...p, rate_percent:Number(p.interest_rate||0)*100, late_fee_percent:Number(p.late_fee_rate||0)*100}; modal.value=true }
async function save(){ const payload={...form.value, interest_rate:Number(form.value.rate_percent)/100, late_fee_rate:Number(form.value.late_fee_percent)/100}; delete payload.rate_percent; delete payload.late_fee_percent; await api.patch(`/products/${form.value.id}`,payload); toast.success('Produto actualizado.'); modal.value=false; await load() }
function exportCsv(){ const rows=[['Produto','Banco','Min','Max','Taxa','Estado'],...products.value.map(p=>[p.name,p.Institution?.name||'',p.min_amount,p.max_amount,p.interest_rate,p.status])]; const blob=new Blob([rows.map(r=>r.join(';')).join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='produtos.csv'; a.click(); URL.revokeObjectURL(a.href) }
onMounted(load)
</script>
