<template>
  <div class="modern-page"><section class="modern-hero"><h1>Gestão de Perfis e Privilégios</h1><p>Atribuir, alterar e desabilitar perfis de acesso.</p><div class="hero-actions"><button class="btn" @click="load">Actualizar</button></div></section>
  <div class="modern-grid-2"><div class="modern-card"><h2>Catálogo de perfis</h2><div v-for="r in roles" :key="r.key" class="role-card"><strong>{{r.label}}</strong><p class="muted">{{r.description}}</p><div class="doc-check"><span v-for="p in r.permissions" :key="p" class="status-pill st-submitted">{{p}}</span></div></div></div><div class="modern-card"><h2>Atribuir/alterar perfil</h2><div class="form-group"><label class="form-label">Utilizador</label><select class="form-select" v-model="assignment.user_id"><option value="">Seleccione</option><option v-for="u in users" :key="u.id" :value="u.id">{{u.full_name}} — {{u.email}}</option></select></div><div class="form-group"><label class="form-label">Perfil</label><select class="form-select" v-model="assignment.role"><option v-for="r in roles" :key="r.key" :value="r.key">{{r.label}}</option></select></div><button class="btn btn-primary btn-block" @click="assign">Gravar perfil</button><button class="btn btn-danger-soft btn-block" style="margin-top:8px" :disabled="!assignment.user_id" @click="disable">Desabilitar perfil/utilizador</button></div></div></div>
</template>
<script setup>
import { ref,onMounted } from 'vue'; import { useToast } from 'vue-toastification'; import api from '@/services/api'
const toast=useToast(); const roles=ref([]), users=ref([]), assignment=ref({user_id:'',role:'client'})
async function load(){ const [r,u]=await Promise.all([api.get('/roles'),api.get('/users')]); roles.value=r.data.data||[]; users.value=u.data.data||[] }
async function assign(){ if(!assignment.value.user_id) return toast.error('Seleccione o utilizador.'); await api.post('/roles/assign',assignment.value); toast.success('Perfil actualizado.'); await load() }
async function disable(){ await api.post(`/roles/disable/${assignment.value.user_id}`); toast.success('Perfil desabilitado.'); await load() }
onMounted(load)
</script>
<style scoped>.role-card{padding:12px 0;border-bottom:1px solid var(--color-border-tertiary)}.role-card:last-child{border-bottom:0}</style>
