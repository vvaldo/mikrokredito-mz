<template>
  <div class="content-inner">
    <div class="page-header">
      <div><h1 class="page-title">Marca / Login</h1><p class="page-sub">Personalize o ecrã de login, topbar, favicon e cores</p></div>
      <div class="page-actions">
        <button class="btn btn-danger btn-sm" @click="reset">Repor padrão</button>
        <button class="btn btn-primary" @click="save">Guardar alterações</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 360px;gap:20px">
      <!-- Left: form -->
      <div>
        <!-- Identity -->
        <div class="card mb-4">
          <div class="card-title">Identidade da plataforma</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome da plataforma</label>
              <input class="form-input" v-model="form.name" placeholder="MikroKrédito MZ" />
            </div>
            <div class="form-group">
              <label class="form-label">Tagline (topbar)</label>
              <input class="form-input" v-model="form.tagline" placeholder="Plataforma Nacional de Microcrédito" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Título do painel esquerdo (login)</label>
              <input class="form-input" v-model="form.leftTitle" />
            </div>
            <div class="form-group">
              <label class="form-label">Subtítulo do painel esquerdo</label>
              <input class="form-input" v-model="form.leftSub" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Título do formulário</label>
              <input class="form-input" v-model="form.welcomeTitle" />
            </div>
            <div class="form-group">
              <label class="form-label">Subtítulo do formulário</label>
              <input class="form-input" v-model="form.welcomeSub" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Texto "Powered by"</label>
            <input class="form-input" v-model="form.poweredBy" />
          </div>
          <div class="form-group">
            <label class="form-label">Política de crédito (caixa no login, opcional)</label>
            <textarea class="form-textarea" v-model="form.creditPolicy" rows="3" placeholder="Condição de desembolso..."></textarea>
          </div>
        </div>

        <!-- Colors -->
        <div class="card mb-4">
          <div class="card-title">Cores do tema</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Cor primária (azul)</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="color" v-model="form.primaryColor" style="width:44px;height:36px;border:1px solid var(--mk-border);border-radius:6px;cursor:pointer;padding:2px" />
                <input class="form-input" v-model="form.primaryColor" placeholder="#185FA5" style="font-family:monospace" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Cor de destaque (vermelho)</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="color" v-model="form.dangerColor" style="width:44px;height:36px;border:1px solid var(--mk-border);border-radius:6px;cursor:pointer;padding:2px" />
                <input class="form-input" v-model="form.dangerColor" placeholder="#A32D2D" style="font-family:monospace" />
              </div>
            </div>
          </div>
        </div>

        <!-- Logo & Favicon -->
        <div class="card mb-4">
          <div class="card-title">Logotipo e Favicon</div>
          <div class="form-group">
            <label class="form-label">URL do logotipo (topbar + login)</label>
            <input class="form-input" v-model="form.logoUrl" placeholder="https://… ou /uploads/logos/…" />
            <p class="form-hint">Formatos recomendados: PNG/SVG com fundo transparente, 120×120px+</p>
          </div>
          <div class="form-group">
            <label class="form-label">URL do favicon</label>
            <input class="form-input" v-model="form.faviconUrl" placeholder="https://… ou /favicon.svg" />
            <p class="form-hint">Deixe vazio para usar o favicon padrão (/favicon.svg)</p>
          </div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:8px">
            <div v-if="form.logoUrl" style="width:52px;height:52px;border-radius:10px;overflow:hidden;border:1px solid var(--mk-border)">
              <img :src="form.logoUrl" style="width:100%;height:100%;object-fit:contain" @error="$event.target.style.display='none'" />
            </div>
            <p style="font-size:12px;color:var(--mk-text-2)">Pré-visualização ao guardar</p>
          </div>
        </div>

        <!-- Features list -->
        <div class="card">
          <div class="card-title">Lista de funcionalidades (painel esquerdo do login)</div>
          <div v-for="(f, i) in form.features" :key="i" style="display:flex;gap:8px;margin-bottom:8px">
            <input class="form-input" v-model="form.features[i]" :placeholder="'Funcionalidade ' + (i+1)" />
            <button class="btn btn-sm btn-danger" @click="form.features.splice(i,1)">✕</button>
          </div>
          <button class="btn btn-sm btn-primary mt-2" @click="form.features.push('')">+ Adicionar</button>
        </div>
      </div>

      <!-- Right: preview -->
      <div style="position:sticky;top:20px">
        <div class="card">
          <div class="card-title">Pré-visualização</div>

          <!-- Topbar preview -->
          <div style="border-radius:8px;overflow:hidden;margin-bottom:12px">
            <div :style="{ background: form.primaryColor, padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }">
              <div :style="{ width:'28px', height:'28px', borderRadius:'6px', background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }">
                <img v-if="form.logoUrl" :src="form.logoUrl" style="width:100%;height:100%;object-fit:contain;border-radius:5px" @error="$event.target.style.display='none'" />
                <span v-else style="font-size:14px">M</span>
              </div>
              <div>
                <div style="color:#fff;font-size:12px;font-weight:600">{{ form.name || 'Nome da plataforma' }}</div>
                <div style="color:rgba(255,255,255,.6);font-size:9px">{{ form.tagline || 'Tagline' }}</div>
              </div>
            </div>
          </div>

          <!-- Login preview mini -->
          <div style="border:1px solid var(--mk-border);border-radius:10px;overflow:hidden;font-size:10px">
            <div :style="{ background: `linear-gradient(160deg, ${darkColor}, ${form.primaryColor})`, padding:'14px', color:'#fff', minHeight:'80px' }">
              <div style="font-size:13px;font-weight:600;margin-bottom:3px">{{ form.leftTitle || '—' }}</div>
              <div style="opacity:.7;font-size:10px">{{ form.leftSub || '—' }}</div>
            </div>
            <div style="padding:12px;background:var(--mk-surface)">
              <div style="font-size:12px;font-weight:500;margin-bottom:6px">{{ form.welcomeTitle || '—' }}</div>
              <div style="height:24px;border:1px solid var(--mk-border);border-radius:5px;background:var(--mk-surface-2);margin-bottom:6px"></div>
              <div style="height:24px;border:1px solid var(--mk-border);border-radius:5px;background:var(--mk-surface-2);margin-bottom:8px"></div>
              <div :style="{ height:'28px', borderRadius:'5px', background: form.primaryColor }"></div>
            </div>
          </div>

          <!-- Color swatches -->
          <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
            <div :style="{ width:'36px', height:'36px', borderRadius:'7px', background:form.primaryColor, border:'1px solid rgba(0,0,0,.1)' }"></div>
            <div :style="{ width:'36px', height:'36px', borderRadius:'7px', background:form.dangerColor, border:'1px solid rgba(0,0,0,.1)' }"></div>
            <span style="font-size:11px;color:var(--mk-text-2)">Primária + Destaque</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useBrandingStore } from '@/stores/branding'
import { useToast } from 'vue-toastification'

const brand = useBrandingStore()
const toast = useToast()

const form = reactive({
  name: '', tagline: '', logoUrl: '', faviconUrl: '',
  primaryColor: '#185FA5', dangerColor: '#A32D2D',
  welcomeTitle: '', welcomeSub: '', leftTitle: '', leftSub: '',
  poweredBy: '', creditPolicy: '', features: [],
})

const darkColor = computed(() => {
  const c = form.primaryColor
  if (!c.startsWith('#')) return '#062E55'
  const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16)
  return `rgb(${Math.max(0,r-60)},${Math.max(0,g-60)},${Math.max(0,b-60)})`
})

function load() {
  Object.assign(form, {
    name: brand.name, tagline: brand.tagline, logoUrl: brand.logoUrl,
    faviconUrl: brand.faviconUrl, primaryColor: brand.primaryColor,
    dangerColor: brand.dangerColor, welcomeTitle: brand.welcomeTitle,
    welcomeSub: brand.welcomeSub, leftTitle: brand.leftTitle, leftSub: brand.leftSub,
    poweredBy: brand.poweredBy, creditPolicy: brand.creditPolicy,
    features: [...(brand.features || [])],
  })
}

function save() {
  brand.save({ ...form, features: [...form.features.filter(f => f.trim())] })
  toast.success('Configurações guardadas e aplicadas')
}

function reset() {
  brand.reset()
  load()
  toast.info('Configurações repostas para o padrão')
}

onMounted(load)
</script>
