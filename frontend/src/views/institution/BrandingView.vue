<template>
  <div class="content-inner">
    <div class="page-header">
      <div>
        <h1 class="page-title">Marca / Personalização</h1>
        <p class="page-sub">Logotipo, favicon, cores e textos do sistema</p>
      </div>
      <div class="page-actions">
        <button class="btn" @click="reset">Repor padrão</button>
        <button class="btn btn-primary" @click="save">💾 Guardar</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px">
      <div>
        <!-- Identity -->
        <div class="card mb-4">
          <div class="card-title">🏷️ Identidade da plataforma</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome da plataforma</label>
              <input class="form-input" v-model="form.name" />
            </div>
            <div class="form-group">
              <label class="form-label">Tagline (topbar)</label>
              <input class="form-input" v-model="form.tagline" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Título painel esquerdo</label>
              <input class="form-input" v-model="form.leftTitle" />
            </div>
            <div class="form-group">
              <label class="form-label">Subtítulo painel esquerdo</label>
              <input class="form-input" v-model="form.leftSub" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Título formulário login</label>
              <input class="form-input" v-model="form.welcomeTitle" />
            </div>
            <div class="form-group">
              <label class="form-label">Subtítulo formulário</label>
              <input class="form-input" v-model="form.welcomeSub" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Texto "Powered by"</label>
            <input class="form-input" v-model="form.poweredBy" />
          </div>
          <div class="form-group">
            <label class="form-label">Política de crédito (caixa no login)</label>
            <textarea class="form-textarea" v-model="form.creditPolicy" rows="3"></textarea>
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:6px">
            <label class="toggle"><input type="checkbox" v-model="form.hideDemoCredentials" /><span class="toggle-track"></span></label>
            <span style="font-size:12px;color:var(--mk-text-1)">Ocultar contas de demonstração no ecrã de login</span>
          </div>
        </div>

        <!-- Security -->
        <div class="card mb-4">
          <div class="card-title">🔒 Segurança</div>
          <div class="form-group" style="max-width:260px">
            <label class="form-label">Terminar sessão por inactividade após (minutos)</label>
            <input class="form-input" type="number" min="1" v-model.number="form.sessionTimeoutMinutes" placeholder="60" />
            <p class="form-hint">Aplica-se a todos os utilizadores. Ao expirar, a sessão termina automaticamente.</p>
          </div>
        </div>

        <!-- UPLOAD Logo + Favicon -->
        <div class="card mb-4">
          <div class="card-title">🖼️ Logotipo e Favicon — Upload de ficheiro</div>
          <div class="form-row">
            <!-- Logo -->
            <div class="form-group">
              <label class="form-label">Logotipo (PNG/SVG/JPG)</label>
              <div class="upload-zone" style="height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px"
                @click="$refs.logoInput.click()"
                @dragover.prevent="dragOverLogo = true"
                @dragleave="dragOverLogo = false"
                @drop.prevent="dropLogo($event)"
                :class="{ 'drag-over': dragOverLogo }">
                <img v-if="form.logoUrl" :src="form.logoUrl" style="max-height:60px;max-width:160px;object-fit:contain" />
                <template v-else>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="2" width="24" height="24" rx="4"/><path d="M9 17l3-3 3 3 3-4 4 4H2z"/>
                    <circle cx="9.5" cy="10.5" r="1.5"/>
                  </svg>
                  <span style="font-size:12px;color:var(--mk-text-2)">Clique ou arraste o logotipo</span>
                </template>
                <span v-if="form.logoUrl" style="font-size:10px;color:var(--mk-text-3);margin-top:4px">Clique para alterar</span>
              </div>
              <input ref="logoInput" type="file" accept="image/*" style="display:none" @change="onLogoChange" />
              <button v-if="form.logoUrl" class="btn btn-sm" style="margin-top:6px;width:100%" @click="form.logoUrl=''">Remover logotipo</button>
            </div>
            <!-- Favicon -->
            <div class="form-group">
              <label class="form-label">Favicon (ICO/PNG/SVG — 32×32px)</label>
              <div class="upload-zone" style="height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px"
                @click="$refs.favInput.click()"
                @dragover.prevent @drop.prevent="dropFav($event)">
                <img v-if="form.faviconUrl" :src="form.faviconUrl" style="width:32px;height:32px;object-fit:contain" />
                <template v-else>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="2" width="24" height="24" rx="4"/><text x="14" y="19" text-anchor="middle" font-size="12" fill="currentColor" stroke="none">F</text>
                  </svg>
                  <span style="font-size:12px;color:var(--mk-text-2)">Clique para upload do favicon</span>
                </template>
              </div>
              <input ref="favInput" type="file" accept="image/*,.ico" style="display:none" @change="onFavChange" />
              <button v-if="form.faviconUrl" class="btn btn-sm" style="margin-top:6px;width:100%" @click="form.faviconUrl=''">Remover favicon</button>
            </div>
          </div>
        </div>

        <!-- Colors -->
        <div class="card mb-4">
          <div class="card-title">🎨 Cores do tema</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Cor primária</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="color" v-model="form.primaryColor" @input="previewColors"
                  style="width:44px;height:36px;border:1px solid rgba(148,163,184,.2);border-radius:6px;cursor:pointer;padding:2px;background:transparent" />
                <input class="form-input" v-model="form.primaryColor" placeholder="#1a6ff5" style="font-family:var(--mk-font-mono)" @input="previewColors" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Cor de destaque (danger)</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="color" v-model="form.dangerColor" @input="previewColors"
                  style="width:44px;height:36px;border:1px solid rgba(148,163,184,.2);border-radius:6px;cursor:pointer;padding:2px;background:transparent" />
                <input class="form-input" v-model="form.dangerColor" placeholder="#dc2626" style="font-family:var(--mk-font-mono)" @input="previewColors" />
              </div>
            </div>
          </div>
        </div>

        <!-- Features list -->
        <div class="card">
          <div class="card-title">✅ Funcionalidades no painel esquerdo do login</div>
          <div v-for="(f, i) in form.features" :key="i" style="display:flex;gap:7px;margin-bottom:7px">
            <input class="form-input" v-model="form.features[i]" :placeholder="'Funcionalidade ' + (i+1)" />
            <button class="btn btn-sm btn-danger" @click="form.features.splice(i,1)">✕</button>
          </div>
          <button class="btn btn-sm btn-blue-soft" style="margin-top:4px" @click="form.features.push('')">+ Adicionar linha</button>
        </div>
      </div>

      <!-- Right: live preview -->
      <div style="position:sticky;top:20px">
        <div class="card">
          <div class="card-title">👁️ Pré-visualização ao vivo</div>
          <!-- Topbar -->
          <div style="border-radius:8px;overflow:hidden;margin-bottom:10px">
            <div :style="{ background: form.primaryColor, padding:'9px 14px', display:'flex', alignItems:'center', gap:'9px' }">
              <div :style="{ width:'26px', height:'26px', borderRadius:'6px', background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }">
                <img v-if="form.logoUrl" :src="form.logoUrl" style="width:100%;height:100%;object-fit:contain" />
                <span v-else style="font-size:10px;color:#fff;font-weight:700">{{ form.name[0] }}</span>
              </div>
              <div>
                <div style="font-size:11px;font-weight:700;color:#fff;letter-spacing:.4px;text-transform:uppercase">{{ form.name }}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.55)">{{ form.tagline }}</div>
              </div>
            </div>
          </div>
          <!-- Login mini preview -->
          <div style="border:1px solid rgba(148,163,184,.1);border-radius:10px;overflow:hidden;font-size:10px">
            <div :style="{ background: `linear-gradient(135deg, #0d1b3e, ${form.primaryColor})`, padding:'14px', color:'#fff', minHeight:'80px' }">
              <div style="font-size:12px;font-weight:700;margin-bottom:3px">{{ form.leftTitle }}</div>
              <div style="opacity:.65;font-size:10px">{{ form.leftSub }}</div>
            </div>
            <div style="padding:12px;background:var(--mk-surface)">
              <div style="font-size:11px;font-weight:600;margin-bottom:8px;color:var(--mk-text)">{{ form.welcomeTitle }}</div>
              <div style="height:22px;border:1px solid rgba(148,163,184,.2);border-radius:5px;background:rgba(255,255,255,.04);margin-bottom:6px"></div>
              <div style="height:22px;border:1px solid rgba(148,163,184,.2);border-radius:5px;background:rgba(255,255,255,.04);margin-bottom:8px"></div>
              <div :style="{ height:'26px', borderRadius:'5px', background: form.primaryColor }"></div>
            </div>
          </div>
          <!-- Swatches -->
          <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
            <div :style="{ width:'34px', height:'34px', borderRadius:'7px', background:form.primaryColor, boxShadow:'0 0 12px '+form.primaryColor+'66' }"></div>
            <div :style="{ width:'34px', height:'34px', borderRadius:'7px', background:form.dangerColor,  boxShadow:'0 0 12px '+form.dangerColor+'66'  }"></div>
            <span style="font-size:11px;color:var(--mk-text-2)">Primária + Destaque</span>
          </div>
          <!-- Favicon preview -->
          <div v-if="form.faviconUrl" style="margin-top:12px;display:flex;align-items:center;gap:8px">
            <img :src="form.faviconUrl" style="width:16px;height:16px;object-fit:contain" />
            <img :src="form.faviconUrl" style="width:32px;height:32px;object-fit:contain" />
            <span style="font-size:11px;color:var(--mk-text-2)">Favicon 16×16 e 32×32</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, ref } from 'vue'
import { useBrandingStore } from '@/stores/branding'
import { useToast } from 'vue-toastification'

const brand = useBrandingStore()
const toast = useToast()
const dragOverLogo = ref(false)

const form = reactive({
  name:'',tagline:'',logoUrl:'',faviconUrl:'',
  primaryColor:'#1a6ff5',dangerColor:'#dc2626',
  welcomeTitle:'',welcomeSub:'',leftTitle:'',leftSub:'',
  poweredBy:'',creditPolicy:'',features:[],hideDemoCredentials:false,sessionTimeoutMinutes:60,
})

function load() {
  Object.assign(form, {
    name:brand.name, tagline:brand.tagline, logoUrl:brand.logoUrl,
    faviconUrl:brand.faviconUrl, primaryColor:brand.primaryColor,
    dangerColor:brand.dangerColor, welcomeTitle:brand.welcomeTitle,
    welcomeSub:brand.welcomeSub, leftTitle:brand.leftTitle, leftSub:brand.leftSub,
    poweredBy:brand.poweredBy, creditPolicy:brand.creditPolicy,
    features:[...(brand.features||[])], hideDemoCredentials:brand.hideDemoCredentials,
    sessionTimeoutMinutes:brand.sessionTimeoutMinutes,
  })
}

async function save() {
  try {
    await brand.save({ ...form, features:[...form.features.filter(f=>f.trim())] })
    toast.success('✅ Configurações guardadas e aplicadas em toda a plataforma')
  } catch (e) {
    toast.error(e.response?.data?.message || 'Erro ao gravar configurações no servidor')
  }
}

async function reset() {
  try {
    await brand.reset()
    load()
    toast.info('Configurações repostas para o padrão SIGEM')
  } catch (e) {
    toast.error(e.response?.data?.message || 'Erro ao repor configurações no servidor')
  }
}

function previewColors() {
  document.documentElement.style.setProperty('--blue-600', form.primaryColor)
  document.documentElement.style.setProperty('--red-600', form.dangerColor)
}

async function onLogoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) { toast.error('Logotipo deve ter menos de 2MB'); return }
  form.logoUrl = await toBase64(file)
  toast.success('Logotipo carregado')
}

async function onFavChange(e) {
  const file = e.target.files[0]
  if (!file) return
  form.faviconUrl = await toBase64(file)
  toast.success('Favicon carregado')
}

async function dropLogo(e) {
  dragOverLogo.value = false
  const file = e.dataTransfer.files[0]
  if (file?.type.startsWith('image/')) {
    form.logoUrl = await toBase64(file)
    toast.success('Logotipo carregado por drag & drop')
  }
}

async function dropFav(e) {
  const file = e.dataTransfer.files[0]
  if (file) { form.faviconUrl = await toBase64(file); toast.success('Favicon carregado') }
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

onMounted(load)
</script>
