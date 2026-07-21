<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Bancos / Instituições de Crédito</h1>
      <p>Super Admin pode criar, editar, activar, inactivar e apagar instituições.</p>
      <div class="hero-actions"><button class="btn btn-primary" @click="openCreate">+ Nova instituição</button><button class="btn" @click="load">Actualizar</button><button class="btn" @click="exportCsv">Exportar CSV</button></div>
    </section>

    <div class="modern-card">
      <div class="form-row" style="margin-bottom:12px"><input class="form-input" v-model="q" placeholder="Pesquisar instituição, email, telefone" @input="filter"></div>
      <div class="table-wrap">
      <table class="modern-table"><thead><tr><th>Instituição</th><th>Contacto</th><th>Endereço</th><th>Estado</th><th>Acções</th></tr></thead><tbody>
        <tr v-for="i in filtered" :key="i.id">
          <td><strong>{{ i.name }}</strong><br><span class="muted">{{ i.acronym }} · Licença {{ i.license_number || '—' }}</span></td>
          <td>{{ i.email || '—' }}<br><span class="muted">{{ i.phone || '—' }}</span></td>
          <td>{{ i.province || '—' }}<br><span class="muted">{{ i.address || '—' }}</span></td>
          <td><span :class="statusClass(i.status)">{{ statusLabel(i.status) }}</span></td>
          <td><div class="action-row"><button class="btn btn-sm" @click="openEdit(i)">Editar</button><button class="btn btn-sm btn-primary" v-if="i.status!=='active'" @click="activate(i)">Activar</button><button class="btn btn-sm btn-danger-soft" v-if="i.status==='active'" @click="suspend(i)">Inactivar</button><button class="btn btn-sm btn-danger-soft" @click="remove(i)">Apagar</button></div></td>
        </tr>
        <tr v-if="!filtered.length"><td colspan="5" class="empty-state">Sem instituições.</td></tr>
      </tbody></table>
      </div>
    </div>

    <div v-if="modal" class="modal-backdrop" @click.self="modal=false">
      <div class="mk-modal wide"><div class="mk-modal-head"><h2>{{ form.id ? 'Editar instituição' : 'Nova instituição' }}</h2><button class="modal-x" @click="modal=false">×</button></div>
        <form @submit.prevent="save">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Nome da instituição</label><input class="input" v-model="form.name" required></div>
            <div class="form-group"><label class="form-label">Sigla</label><input class="input" v-model="form.acronym" required maxlength="10"></div>
            <div class="form-group"><label class="form-label">N.º de licença</label><input class="input" v-model="form.license_number"></div>
            <div class="form-group"><label class="form-label">Email</label><input class="input" type="email" v-model="form.email"></div>
            <div class="form-group"><label class="form-label">Telefone</label><input class="input" v-model="form.phone"></div>
            <div class="form-group"><label class="form-label">Website</label><input class="input" v-model="form.website"></div>
            <div class="form-group"><label class="form-label">Província</label><input class="input" v-model="form.province"></div>
            <div class="form-group"><label class="form-label">Cor institucional</label><input class="input" type="color" v-model="form.color"></div>
            <div class="form-group"><label class="form-label">Estado</label><select class="input" v-model="form.status"><option value="pending">Pendente</option><option value="active">Activo</option><option value="suspended">Inactivo/Suspenso</option></select></div>
          </div>
          <div class="form-group"><label class="form-label">Endereço</label><textarea class="input" v-model="form.address" rows="3"></textarea></div>
          <div class="modal-actions"><button class="btn" type="button" @click="modal=false">Cancelar</button><button class="btn btn-primary">Gravar</button></div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref,onMounted } from 'vue'; import { useToast } from 'vue-toastification'; import api from '@/services/api'
const toast=useToast(); const institutions=ref([]), filtered=ref([]), q=ref(''), modal=ref(false), form=ref({})
function statusLabel(s){return {active:'Activo',pending:'Pendente',suspended:'Inactivo'}[s]||s}
function statusClass(s){return s==='active'?'status-pill st-approved':s==='pending'?'status-pill st-pending':'status-pill st-rejected'}
async function load(){const {data}=await api.get('/institutions'); institutions.value=data.data||[]; filter()}
function filter(){const term=q.value.toLowerCase(); filtered.value=institutions.value.filter(i=>!term || [i.name,i.acronym,i.email,i.phone].some(v=>String(v||'').toLowerCase().includes(term)))}
function openCreate(){form.value={name:'',acronym:'',license_number:'',email:'',phone:'',website:'',province:'',address:'',color:'#185FA5',status:'pending'}; modal.value=true}
function openEdit(i){form.value={...i}; modal.value=true}
async function save(){try{ if(form.value.id){const {id,Users,created_at,updated_at,...payload}=form.value; await api.patch(`/institutions/${id}`,payload)}else await api.post('/institutions',form.value); toast.success('Instituição gravada.'); modal.value=false; await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao gravar instituição')}}
async function activate(i){await api.post(`/institutions/${i.id}/activate`); toast.success('Instituição activada.'); await load()}
async function suspend(i){await api.post(`/institutions/${i.id}/suspend`); toast.success('Instituição inactivada.'); await load()}
async function remove(i){if(!confirm(`Apagar ${i.name}?`)) return; try{await api.delete(`/institutions/${i.id}`); toast.success('Instituição apagada.'); await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao apagar instituição')}}
function exportCsv(){const rows=[['Nome','Sigla','Email','Telefone','Estado'],...filtered.value.map(i=>[i.name,i.acronym,i.email||'',i.phone||'',statusLabel(i.status)])]; const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='instituicoes.csv'; a.click()}
onMounted(load)
</script>
