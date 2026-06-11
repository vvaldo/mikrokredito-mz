import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({ dark: false }),
  actions: {
    load() {
      this.dark = localStorage.getItem('sigem_theme') === 'dark'
      this.apply()
    },
    toggle() {
      this.dark = !this.dark
      localStorage.setItem('sigem_theme', this.dark ? 'dark' : 'light')
      this.apply()
    },
    apply() {
      document.documentElement.setAttribute('data-theme', this.dark ? 'dark' : 'light')
    }
  }
})
