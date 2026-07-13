// src/stores/branding.js — SIGEM-MICROCREDITO configurable branding
import { defineStore } from 'pinia'
import api from '@/services/api'

const BRANDING_VERSION = 'sigem_v14'

const DEFAULTS = {
  name:         'SIGEM-OTECH',
  tagline:      'Sistema Integrado de Gestão de Microcrédito',
  logoUrl:      '',        // base64 or URL
  faviconUrl:   '',
  primaryColor: '#1a6ff5',
  dangerColor:  '#dc2626',
  welcomeTitle: 'Aceder ao SIGEM',
  welcomeSub:   'Sistema Integrado de Gestão de Microcrédito',
  leftTitle:    'SIGEM-OTECH',
  leftSub:      'Sistema Integrado de Gestão de Microcrédito',
  poweredBy:    'Powered by: OTECH - Open Technology (www.otech.co.mz)',
  hideDemoCredentials: false,
  creditPolicy: 'Condição de desembolso: Valores abaixo de 50.000 MZN podem ser desembolsados em menos de 24 horas, desde que todos os documentos obrigatórios estejam validados. De 51.000 a 100.000 MZN, o processo fica condicionado à formalização documental em cartório/escritório.',
  features: [
    'Multi-tenant — isolamento por instituição',
    'Simulador com regra do 1/3 salarial',
    'Notificações via Email, SMS e WhatsApp',
    'Pagamentos M-Pesa e e-Mola integrados',
    'KYC, documentos e upload de comprovativos',
  ],
}

export const useBrandingStore = defineStore('branding', {
  state: () => ({ ...DEFAULTS, loaded: false }),

  actions: {
    load() {
      try {
        const savedVersion = localStorage.getItem('mk_branding_version')
        const saved = localStorage.getItem('mk_branding')
        if (savedVersion !== BRANDING_VERSION) {
          localStorage.removeItem('mk_branding')
          localStorage.setItem('mk_branding_version', BRANDING_VERSION)
        } else if (saved) {
          Object.assign(this.$state, JSON.parse(saved))
        }
      } catch (e) {}
      this.applyColors()
      this.applyFavicon()
      this.loaded = true
      // Sincroniza com o servidor (fonte de verdade partilhada entre dispositivos/sessões)
      this.syncFromServer()
    },

    async syncFromServer() {
      try {
        const { data } = await api.get('/platform-settings')
        if (data?.data && Object.keys(data.data).length) {
          Object.assign(this.$state, data.data)
          localStorage.setItem('mk_branding', JSON.stringify(data.data))
          this.applyColors()
          this.applyFavicon()
        }
      } catch (e) {}
    },

    async save(patch) {
      Object.assign(this.$state, patch)
      const toSave = {}
      Object.keys(DEFAULTS).forEach(k => { toSave[k] = this[k] })
      localStorage.setItem('mk_branding', JSON.stringify(toSave))
      localStorage.setItem('mk_branding_version', BRANDING_VERSION)
      this.applyColors()
      this.applyFavicon()
      await api.put('/platform-settings', toSave)
    },

    async reset() {
      Object.assign(this.$state, { ...DEFAULTS })
      localStorage.removeItem('mk_branding')
      localStorage.setItem('mk_branding_version', BRANDING_VERSION)
      this.applyColors()
      this.applyFavicon()
      await api.put('/platform-settings', { ...DEFAULTS })
    },

    // Convert uploaded file to base64
    async uploadLogo(file) {
      const b64 = await fileToBase64(file)
      this.logoUrl = b64
      return b64
    },

    async uploadFavicon(file) {
      const b64 = await fileToBase64(file)
      this.faviconUrl = b64
      this.applyFavicon()
      return b64
    },

    applyColors() {
      document.documentElement.style.setProperty('--blue-600', this.primaryColor)
      document.documentElement.style.setProperty('--mk-primary', this.primaryColor)
      document.documentElement.style.setProperty('--red-600', this.dangerColor)
      document.documentElement.style.setProperty('--mk-danger', this.dangerColor)
    },

    applyFavicon() {
      const url = this.faviconUrl || '/favicon.svg'
      let link = document.querySelector("link[rel*='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'shortcut icon'
        document.head.appendChild(link)
      }
      link.href = url
      document.title = this.name
    },
  }
})

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
