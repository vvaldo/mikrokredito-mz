<template>
  <div class="modern-page">
    <section class="modern-hero">
      <h1>Logotipo e identidade SaaS</h1>
      <p>Área exclusiva do Super Admin. Permite alterar o logotipo, nome da aplicação, subtítulo e rodapé por instituição/cliente.</p>
    </section>

    <div class="modern-card">
      <h2>Seleccionar instituição</h2>
      <p class="muted">As alterações afectam o tenant seleccionado e aparecem no menu/topbar após gravar.</p>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Instituição / Cliente SaaS</label>
          <select class="form-input" v-model="selectedId" @change="loadSelected">
            <option value="">Seleccione...</option>
            <option v-for="i in institutions" :key="i.id" :value="i.id">{{ i.name }} — {{ i.acronym }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="selected" class="modern-grid-2">
      <div class="modern-card">
        <h2>Logotipo actual</h2>
        <div class="brand-preview">
          <img :src="previewUrl || currentLogo" alt="Logotipo" />
          <div>
            <strong>{{ form.app_name || 'MicroCredit SYSTEM' }}</strong><br>
            <span>{{ form.app_subtitle || 'Sistema Integrado de Gestão de Microcrédito' }}</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Carregar novo logotipo</label>
          <input class="form-input" type="file" accept="image/*" @change="pickFile" />
        </div>
        <div class="action-row">
          <button class="btn btn-primary" :disabled="savingLogo || !file" @click="saveLogo">{{ savingLogo ? 'A gravar...' : 'Gravar logotipo' }}</button>
          <button class="btn" @click="resetPreview">Cancelar</button>
        </div>
      </div>

      <div class="modern-card">
        <h2>Identidade da aplicação</h2>
        <div class="form-group"><label class="form-label">Nome da aplicação no menu/topbar</label><input class="form-input" v-model="form.app_name"></div>
        <div class="form-group"><label class="form-label">Subtítulo</label><input class="form-input" v-model="form.app_subtitle"></div>
        <div class="form-group"><label class="form-label">Título do rodapé</label><input class="form-input" v-model="form.footer_title"></div>
        <div class="form-group"><label class="form-label">Subtítulo do rodapé</label><input class="form-input" v-model="form.footer_subtitle"></div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Powered by — nome</label><input class="form-input" v-model="form.powered_by_name"></div>
          <div class="form-group"><label class="form-label">Powered by — website</label><input class="form-input" v-model="form.powered_by_url"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Cor primária</label><input class="form-input" type="color" v-model="form.primary_color"></div>
          <div class="form-group"><label class="form-label">Cor secundária</label><input class="form-input" type="color" v-model="form.secondary_color"></div>
        </div>
        <div class="form-group"><label class="form-label">Texto lateral do login / facilidades</label><textarea class="form-input" rows="6" v-model="form.login_features" placeholder="Uma facilidade por linha"></textarea><small class="muted">Esta informação aparece no painel esquerdo do login.</small></div>
        <div class="action-row"><button class="btn btn-primary" :disabled="savingBrand" @click="saveBranding">{{ savingBrand ? 'A gravar...' : 'Gravar identidade SaaS' }}</button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import api, { assetUrl } from '@/services/api'
const toast = useToast(); const auth = useAuthStore()
const institutions = ref([]), selectedId = ref(''), selected = ref(null)
const file = ref(null), previewUrl = ref(''), savingLogo = ref(false), savingBrand = ref(false)
const form = ref({ app_name:'MicroCredit SYSTEM', app_subtitle:'Sistema Integrado de Gestão de Microcrédito', footer_title:'MicroCredit SYSTEM', footer_subtitle:'Sistema Integrado de Gestão de Microcrédito', powered_by_name:'OTECH - Open Technology', powered_by_url:'www.otech.co.mz', primary_color:'#185FA5', secondary_color:'#A32D2D', login_features:'Multi-tenant — isolamento por instituição\nSimulador com regra do 1/3 salarial\nNotificações via Email, SMS e WhatsApp\nPagamentos M-Pesa e e-Mola integrados\nKYC e upload de documentos' })
const currentLogo = computed(() => selected.value?.logo_url ? `${assetUrl(selected.value.logo_url)}?v=${Date.now()}` : '/default-client-logo.jpg')
async function loadInstitutions(){ const { data } = await api.get('/institutions'); institutions.value = data.data || []; if(!selectedId.value && institutions.value[0]) { selectedId.value = institutions.value[0].id; loadSelected() } }
function loadSelected(){ selected.value = institutions.value.find(i=>i.id===selectedId.value) || null; const b = selected.value?.settings?.branding || {}; form.value = { ...form.value, ...b }; resetPreview() }
function pickFile(e){ file.value = e.target.files?.[0] || null; previewUrl.value = file.value ? URL.createObjectURL(file.value) : '' }
function resetPreview(){ file.value=null; previewUrl.value='' }
function syncLocal(inst){ if(auth.user?.institution_id === inst.id){ auth.user = { ...auth.user, institution: inst }; localStorage.setItem('tenantBranding', JSON.stringify(inst.settings?.branding || {})); localStorage.setItem('tenantLogoUrl', inst.logo_url || ''); localStorage.setItem('tenantLogoVersion', String(Date.now())) } }
async function saveLogo(){ if(!file.value || !selected.value) return; const fd = new FormData(); fd.append('logo', file.value); savingLogo.value=true; try{ const { data } = await api.post(`/institutions/${selected.value.id}/logo`, fd, { headers:{ 'Content-Type':'multipart/form-data' } }); selected.value.logo_url = data.data?.logo_url; const idx=institutions.value.findIndex(i=>i.id===selected.value.id); if(idx>=0) institutions.value[idx].logo_url=selected.value.logo_url; syncLocal(selected.value); toast.success('Logotipo actualizado com sucesso.'); resetPreview() }catch(e){ toast.error(e.response?.data?.message || 'Erro ao gravar logotipo') } finally{ savingLogo.value=false } }
async function saveBranding(){ if(!selected.value) return; savingBrand.value=true; try{ const { data } = await api.patch(`/institutions/${selected.value.id}/branding`, form.value); selected.value = data.data; const idx=institutions.value.findIndex(i=>i.id===selected.value.id); if(idx>=0) institutions.value[idx]=selected.value; syncLocal(selected.value); toast.success('Identidade SaaS actualizada.') }catch(e){ toast.error(e.response?.data?.message || 'Erro ao gravar identidade SaaS') } finally{ savingBrand.value=false } }
onMounted(loadInstitutions)
</script>
<style scoped>
.brand-preview{display:flex;align-items:center;gap:14px;padding:18px;border:1px solid var(--mk-border);border-radius:16px;margin:16px 0;background:#fff}.brand-preview img{width:90px;height:90px;object-fit:contain;border-radius:12px;border:1px solid var(--mk-border);background:#fff}
</style>
