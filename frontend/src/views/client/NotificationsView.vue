<template>
  <div class="modern-page">
    <section class="modern-hero"><h1>Notificações</h1><p>Todas as notificações do cliente. Ao abrir ou marcar como lida, a contagem reduz e o evento fica registado.</p><div class="hero-actions"><button class="btn btn-primary" @click="markAll">Marcar todas como lidas</button><button class="btn" @click="load">Actualizar</button></div></section>
    <div class="kpi-grid"><div class="kpi danger"><div class="label">Não lidas</div><div class="value">{{ unread }}</div><div class="note">Actualiza automaticamente</div></div><div class="kpi"><div class="label">Total</div><div class="value">{{ list.length }}</div><div class="note">Histórico do cliente</div></div></div>
    <div class="modern-card"><div v-if="loading" class="muted">A carregar...</div><div v-else-if="!list.length" class="notice">Sem notificações.</div><div v-for="n in list" :key="n.id" class="notif-row" @click="open(n)"><div><strong>{{ n.subject || n.event }}</strong><p class="muted">{{ strip(n.body).slice(0,160) }}</p><small>{{ date(n.created_at) }} · {{ n.channel }}</small></div><span :class="n.read_at ? 'status-pill st-approved' : 'status-pill st-rejected'">{{ n.read_at ? 'Lida' : 'Nova' }}</span></div></div>
    <div v-if="selected" class="modal-backdrop" @click.self="selected=null"><div class="mk-modal"><div class="mk-modal-head"><h2>{{ selected.subject || selected.event }}</h2><button class="modal-x" @click="selected=null">×</button></div><div v-html="selected.body"></div><p class="muted" style="margin-top:12px">{{ date(selected.created_at) }} · {{ selected.channel }} · Estado: {{ selected.status }}</p><div class="modal-actions"><button class="btn btn-primary" @click="selected=null">Fechar</button></div></div></div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'
const loading=ref(false), list=ref([]), selected=ref(null)
const unread=computed(()=>list.value.filter(n=>!n.read_at).length)
function strip(v=''){return String(v).replace(/<[^>]*>/g,'')}
function date(v){return v?new Date(v).toLocaleString('pt-MZ'):'—'}
async function load(){loading.value=true; try{const {data}=await api.get('/notifications/my'); list.value=data.data||[]} finally{loading.value=false}}
async function open(n){ if(!n.read_at){await api.post(`/notifications/${n.id}/read`); n.read_at=new Date().toISOString()} selected.value=n }
async function markAll(){await api.post('/notifications/mark-all-read'); await load()}
onMounted(load)
</script>
<style scoped>.notif-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--color-border-tertiary);padding:12px 0;cursor:pointer}.notif-row:hover{background:var(--color-background-secondary)}</style>
