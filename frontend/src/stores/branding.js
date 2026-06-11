// src/stores/branding.js — configurable login + topbar branding
import { defineStore } from 'pinia'
import api from '@/services/api'

const DEFAULTS = {
  name:    'MikroKrédito MZ',
  tagline: 'Plataforma Nacional de Microcrédito',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#185FA5',
  dangerColor:  '#A32D2D',
  welcomeTitle: 'Entrar na plataforma',
  welcomeSub:   'Introduza as suas credenciais para aceder',
  leftTitle:    'MikroKrédito MZ',
  leftSub:      'Sistema Integrado de Gestão de Microcrédito',
  poweredBy:    'Powered by: OTECH - Open Technology (www.otech.co.mz)',
  creditPolicy: '',
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
        const saved = localStorage.getItem('mk_branding')
        if (saved) Object.assign(this.$state, JSON.parse(saved))
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
      this.applyColors()
      this.applyFavicon()
    },

    reset() {
      Object.assign(this.$state, { ...DEFAULTS })
      localStorage.removeItem('mk_branding')
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
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
      link.href = url
      document.title = this.name
    },
  }
})
