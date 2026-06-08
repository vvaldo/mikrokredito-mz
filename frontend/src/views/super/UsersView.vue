<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Gestão de Utilizadores</h1>
      <p>CRUD de clientes, agentes, gestores/admins do banco e superadmins.</p>
      <div class="hero-actions"><button class="btn btn-primary" @click="openCreate">+ Novo utilizador</button><button class="btn" @click="load">Actualizar</button></div>
    </section>

    <div class="modern-card">
      <div class="form-row" style="margin-bottom:12px">
        <input class="form-input" v-model="q" placeholder="Pesquisar nome, email ou telefone" @keyup.enter="load">
        <select class="form-select" v-model="role" @change="load"><option value="">Todos perfis</option><option value="super_admin">Super Admin</option><option value="inst_admin">Gestor/Admin Banco</option><option value="inst_agent">Agente Crédito</option><option value="client">Cliente</option></select>
        <select class="form-select" v-model="institutionFilter" @change="load"><option value="">Todos bancos</option><option v-for="i in institutions" :key="i.id" :value="i.id">{{ i.name }}</option></select>
      </div>
      <table class="modern-table"><thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Banco/Instituição</th><th>Estado</th><th>Docs</th><th>Acções</th></tr></thead><tbody>
        <tr v-for="u in users" :key="u.id"><td><strong>{{u.full_name}}</strong><br><span class="muted">{{u.phone||'—'}}</span></td><td>{{u.email}}</td><td>{{roleLabel(u.role)}}</td><td>{{u.Institution?.name||'Global'}}</td><td><span :class="u.status==='active'?'status-pill st-approved':'status-pill st-rejected'">{{u.status}}</span></td><td>{{ docList(u).length }}</td><td><div class="action-row"><button class="btn btn-sm" @click="openEdit(u)">Editar</button><button class="btn btn-sm btn-blue-soft" @click="openDocs(u)">Documentos</button><button class="btn btn-sm" @click="openPassword(u)">Alterar senha</button><button class="btn btn-sm btn-danger-soft" v-if="u.status==='active'" @click="disable(u)">Desabilitar</button><button class="btn btn-sm btn-primary" v-else @click="enable(u)">Activar</button></div></td></tr>
        <tr v-if="!users.length"><td colspan="7" class="empty-state">Sem utilizadores.</td></tr>
      </tbody></table>
    </div>

    <div v-if="modal" class="modal-backdrop" @click.self="modal=false">
      <div class="mk-modal wide"><div class="mk-modal-head"><h2>{{ form.id?'Editar utilizador':'Novo utilizador' }}</h2><button class="modal-x" @click="modal=false">×</button></div>
        <form @submit.prevent="save">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Nome completo</label><input class="input" v-model="form.full_name" required></div>
            <div class="form-group"><label class="form-label">Email</label><input class="input" v-model="form.email" type="email" required></div>
            <div class="form-group"><label class="form-label">Telefone</label><input class="input" v-model="form.phone"></div>
            <div class="form-group"><label class="form-label">Perfil</label><select class="input" v-model="form.role" required><option value="super_admin">Super Admin</option><option value="inst_admin">Gestor/Admin Banco</option><option value="inst_agent">Agente Crédito</option><option value="client">Cliente</option></select></div>
            <div class="form-group" v-if="form.role !== 'super_admin'"><label class="form-label">Banco / Instituição</label><select class="input" v-model="form.institution_id" required><option value="">Seleccione o banco...</option><option v-for="i in institutions" :key="i.id" :value="i.id">{{ i.name }} — {{ i.acronym }}</option></select></div>
            <div class="form-group"><label class="form-label">Estado</label><select class="input" v-model="form.status"><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="blocked">Bloqueado</option></select></div>
            <div class="form-group" v-if="!form.id"><label class="form-label">Senha inicial</label><input class="input" v-model="form.password" placeholder="Senha inicial"></div>
          </div>
          <div class="alert alert-info" v-if="form.role !== 'super_admin' && !form.institution_id" style="margin-top:10px">Para Agente, Gestor/Admin Banco e Cliente, deve seleccionar o banco/instituição.</div>
          <div class="modal-actions"><button class="btn" type="button" @click="modal=false">Cancelar</button><button class="btn btn-primary">Gravar</button></div>
        </form>
      </div>
    </div>

    <div v-if="docsModal" class="modal-backdrop" @click.self="docsModal=false">
      <div class="mk-modal wide"><div class="mk-modal-head"><h2>Documentos de {{ selectedUser?.full_name }}</h2><button class="modal-x" @click="docsModal=false">×</button></div>
        <div v-if="!docList(selectedUser).length" class="empty-state">Sem documentos submetidos.</div>
        <div v-for="d in docList(selectedUser)" :key="d.id" class="doc-row"><div><strong>{{ docLabel(d.type) }}</strong><p class="muted">{{ d.original_name || d.file_name }} · {{ d.status }}</p></div><div class="action-row"><button class="btn btn-sm" @click="downloadDoc(d)">Baixar</button><label class="btn btn-sm btn-blue-soft">Re-submeter<input type="file" hidden @change="e=>reuploadDoc(d,e)"></label><button class="btn btn-sm btn-primary" @click="reviewDoc(d,'approved')">Aprovar</button><button class="btn btn-sm btn-danger-soft" @click="reviewDoc(d,'rejected')">Rejeitar</button></div></div>
      </div>
    </div>

    <div v-if="passwordModal" class="modal-backdrop" @click.self="passwordModal=false">
      <div class="mk-modal"><div class="mk-modal-head"><h2>Alterar senha manualmente</h2><button class="modal-x" @click="passwordModal=false">×</button></div>
        <p class="muted">Super Admin pode alterar a senha de qualquer utilizador. A acção fica registada em auditoria.</p>
        <label class="field"><span>Nova senha para {{ selectedUser?.full_name }}</span><input class="input" type="password" v-model="newPassword" minlength="6" required></label>
        <div class="modal-actions"><button class="btn" @click="passwordModal=false">Cancelar</button><button class="btn btn-primary" @click="savePassword">Alterar senha</button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref,onMounted } from 'vue'; import { useToast } from 'vue-toastification'; import api, { downloadDocument } from '@/services/api'
const toast=useToast(); const users=ref([]), institutions=ref([]), q=ref(''), role=ref(''), institutionFilter=ref(''), modal=ref(false), form=ref({}), docsModal=ref(false), passwordModal=ref(false), selectedUser=ref(null), newPassword=ref('')

function docList(u){ return u?.Client?.Documents || [] }
function docLabel(t){return {bi:'BI',nuit:'NUIT',residence_certificate:'Atestado de residência',bank_statement:'Extracto bancário',income_proof:'Folha salarial'}[t]||t}
function openDocs(u){selectedUser.value=u; docsModal.value=true}
function openPassword(u){selectedUser.value=u; newPassword.value=''; passwordModal.value=true}
async function downloadDoc(d){ await downloadDocument(d.id, d.original_name || d.file_name || 'documento') }
async function reviewDoc(d,status){try{await api.patch(`/documents/${d.id}/review`,{status}); toast.success('Documento actualizado.'); await load(); selectedUser.value=users.value.find(u=>u.id===selectedUser.value.id)}catch(e){toast.error(e.response?.data?.message||'Erro ao rever documento')}}
async function reuploadDoc(d,e){try{const f=e.target.files?.[0]; if(!f)return; const fd=new FormData(); fd.append('file',f); fd.append('doc_type',d.type); fd.append('client_id',selectedUser.value.Client.id); await api.post('/documents/upload',fd,{headers:{'Content-Type':'multipart/form-data'}}); toast.success('Documento re-submetido.'); await load(); selectedUser.value=users.value.find(u=>u.id===selectedUser.value.id)}catch(err){toast.error(err.response?.data?.message||'Erro ao re-submeter documento')}}
async function savePassword(){try{await api.post(`/users/${selectedUser.value.id}/reset-password-manual`,{new_password:newPassword.value}); toast.success('Senha alterada manualmente.'); passwordModal.value=false}catch(e){toast.error(e.response?.data?.message||'Erro ao alterar senha')}}

function roleLabel(r){return {super_admin:'Super Admin',inst_admin:'Gestor/Admin Banco',inst_agent:'Agente Crédito',client:'Cliente'}[r]||r}
async function loadInstitutions(){const {data}=await api.get('/institutions'); institutions.value=data.data||[]}
async function load(){const {data}=await api.get('/users',{params:{q:q.value,role:role.value,institution_id:institutionFilter.value}}); users.value=data.data||[]}
function openCreate(){form.value={full_name:'',email:'',phone:'',role:'client',status:'active',institution_id:'',password:'Mikro@2026'}; modal.value=true}
function openEdit(u){form.value={id:u.id,full_name:u.full_name,email:u.email,phone:u.phone,role:u.role,status:u.status,institution_id:u.institution_id||'',avatar_url:u.avatar_url}; modal.value=true}
async function save(){try{ if(form.value.role==='super_admin') form.value.institution_id=null; if(form.value.id){const {id,...payload}=form.value; await api.patch(`/users/${id}`,payload)}else{await api.post('/users',form.value)} toast.success('Utilizador gravado.'); modal.value=false; await load()}catch(e){toast.error(e.response?.data?.message||'Erro ao gravar utilizador')}}
async function disable(u){await api.post(`/users/${u.id}/disable`); toast.success('Utilizador desabilitado.'); await load()}
async function enable(u){await api.post(`/users/${u.id}/enable`); toast.success('Utilizador activado.'); await load()}
onMounted(async()=>{await loadInstitutions(); await load()})
</script>

<style scoped>.doc-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--color-border-tertiary);padding:10px 0}</style>
