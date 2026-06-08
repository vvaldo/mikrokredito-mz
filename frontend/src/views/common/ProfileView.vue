<template>
  <div class="modern-page">
    <section class="modern-hero"><h1>Meu perfil</h1><p>Actualize os seus dados e altere a sua senha.</p></section>
    <div class="g2">
      <div class="modern-card"><h2>Dados pessoais</h2><form @submit.prevent="saveProfile"><label class="field"><span>Nome completo</span><input class="input" v-model="form.full_name" required></label><label class="field"><span>Email</span><input class="input" type="email" v-model="form.email" required></label><label class="field"><span>Telefone</span><input class="input" v-model="form.phone"></label><div class="modal-actions"><button class="btn btn-primary">Gravar alterações</button></div></form></div>
      <div class="modern-card"><h2>Alterar senha</h2><form @submit.prevent="changePassword"><label class="field"><span>Senha actual</span><input class="input" type="password" v-model="pwd.current" required></label><label class="field"><span>Nova senha</span><input class="input" type="password" v-model="pwd.new_password" minlength="6" required></label><div class="modal-actions"><button class="btn btn-primary">Alterar senha</button></div></form></div>
    </div>
  </div>
</template>
<script setup>
import { ref,onMounted } from 'vue'; import { useToast } from 'vue-toastification'; import api from '@/services/api'; import { useAuthStore } from '@/stores/auth'
const toast=useToast(), auth=useAuthStore(); const form=ref({full_name:'',email:'',phone:''}); const pwd=ref({current:'',new_password:''})
async function load(){const {data}=await api.get('/auth/me'); form.value={full_name:data.data.full_name,email:data.data.email,phone:data.data.phone||''}}
async function saveProfile(){try{const {data}=await api.patch('/auth/me',form.value); auth.user={...auth.user,...data.data}; toast.success('Perfil actualizado.')}catch(e){toast.error(e.response?.data?.message||'Erro ao gravar perfil')}}
async function changePassword(){try{await api.post('/auth/change-password',pwd.value); toast.success('Senha alterada.'); pwd.value={current:'',new_password:''}}catch(e){toast.error(e.response?.data?.message||'Erro ao alterar senha')}}
onMounted(load)
</script>
