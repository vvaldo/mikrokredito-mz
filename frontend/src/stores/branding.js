// src/stores/branding.js — configurable login + topbar branding
import { defineStore } from 'pinia'

const BRANDING_VERSION = 'mk_v13' // bump to clear old cached values

const DEFAULTS = {
  name:         'MicroCredit SYSTEM',
  tagline:      'Sistema Integrado de Gestão de Microcrédito',
  logoUrl:      '',
  faviconUrl:   '',
  primaryColor: '#185FA5',
  dangerColor:  '#A32D2D',
  welcomeTitle: 'Entrar na plataforma',
  welcomeSub:   'Introduza as suas credenciais para aceder',
  leftTitle:    'MicroCredit SYSTEM',
  leftSub:      'Sistema Integrado de Gestão de Microcrédito',
  poweredBy:    'Powered by: OTECH - Open Technology (www.otech.co.mz)',
  creditPolicy: 'Condição de desembolso: Valores abaixo de 50.000 MZN podem ser desembolsados em menos de 24 horas, desde que todos os documentos obrigatórios estejam validados. De 51.000 a 100.000 MZN, o processo fica condicionado à formalização documental em cartório/escritório.',
  features: [
    'Multi-tenant — isolamento por instituição',
    'Simulador com regra do 1/3 salarial',
    'Notificações via Email, SMS e WhatsApp',
    'Pagamentos M-Pesa e e-Mola integrados',
    'KYC e upload de documentos',
  ],
}

export const useBrandingStore = defineStore('branding', {
  state: () => ({ ...DEFAULTS, loaded: false }),

  actions: {
    load() {
      try {
        const savedVersion = localStorage.getItem('mk_branding_version')
        const saved = localStorage.getItem('mk_branding')
        // Clear old format if version changed
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
    },

    save(patch) {
      Object.assign(this.$state, patch)
      const toSave = {}
      Object.keys(DEFAULTS).forEach(k => { toSave[k] = this[k] })
      localStorage.setItem('mk_branding', JSON.stringify(toSave))
      localStorage.setItem('mk_branding_version', BRANDING_VERSION)
      this.applyColors()
      this.applyFavicon()
    },

    reset() {
      Object.assign(this.$state, { ...DEFAULTS })
      localStorage.removeItem('mk_branding')
      localStorage.setItem('mk_branding_version', BRANDING_VERSION)
      this.applyColors()
      this.applyFavicon()
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
