<template>
  <div class="modern-page">
    <section class="modern-hero"><h1>Documentos</h1><p>Documentos guardados em pasta do servidor e referenciados na base de dados. Pode baixar ou substituir cada documento.</p></section>
    <div :class="ready ? 'notice' : 'notice danger'">{{ ready ? 'Documentação obrigatória completa.' : 'Ainda existem documentos obrigatórios por submeter.' }}</div>
    <div class="modern-card">
      <h2>Checklist documental</h2>
      <div class="doc-upload-grid single">
        <div v-for="d in checklist" :key="d.type" class="upload-card" :class="{ ok: d.doc }">
          <div><strong>{{ d.label }} <em v-if="!d.required">(opcional)</em></strong><span>{{ d.doc ? `${d.doc.original_name || d.doc.file_name} · ${date(d.doc.created_at)}` : 'Por submeter' }}</span></div>
          <div class="action-row">
            <button v-if="d.doc" type="button" class="btn" @click="downloadDoc(d.doc)">Baixar</button>
            <label class="btn btn-primary">{{ d.doc ? 'Novo upload' : 'Upload' }}<input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" @change="upload(d.type,$event)"></label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import api, { uploadDocument, downloadDocument } from '@/services/api'
const toast=useToast(); const docs=ref([])
const types=[['bi','BI',true],['nuit','NUIT',true],['residence_certificate','Atestado de residência',true],['bank_statement','Extracto bancário — últimos 3 meses',true],['income_proof','Folha de salário',false],['other','Outros documentos',false]]
const checklist=computed(()=>types.map(([type,label,required])=>({type,label,required,doc:docs.value.find(x=>x.type===type)})))
const ready=computed(()=>checklist.value.filter(d=>d.required).every(d=>d.doc))
function date(v){return v?new Date(v).toLocaleDateString('pt-MZ'):'—'}
async function downloadDoc(d){ await downloadDocument(d.id, d.original_name || d.file_name || 'documento') }
async function load(){const {data}=await api.get('/documents'); docs.value=data.data||[]}
async function upload(type,e){const file=e.target.files?.[0]; if(!file)return; await uploadDocument(file,type); toast.success('Documento gravado e referenciado na base de dados.'); await load()}
onMounted(load)
</script>
