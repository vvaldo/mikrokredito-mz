// src/stores/auth.js
import { defineStore } from 'pinia'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token'),
    isInitialised: false,
  }),

  getters: {
    isLoggedIn: (s) => !!s.token && !!s.user,
    isClient: (s) => s.user?.role === 'client',
    isInstAdmin: (s) => ['inst_admin', 'inst_agent'].includes(s.user?.role),
    isSuperAdmin: (s) => s.user?.role === 'super_admin',
    defaultRoute: (s) => {
      const role = s.user?.role
      if (role === 'super_admin') return '/super/dashboard'
      if (role === 'inst_admin') return '/institution/dashboard'
      if (role === 'inst_agent') return '/agent/dashboard'
      if (role === 'client') return '/client/home'
      return '/login'
    },
  },

  actions: {
    async init() {
      if (this.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        try {
          const { data } = await api.get('/auth/me')
          this.user = data.data
        } catch {
          this.logout()
        }
      }
      this.isInitialised = true
    },

    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this.token = data.token
      this.user = data.user
      localStorage.setItem('token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    },

    async register(payload) {
      const { data } = await api.post('/auth/register', payload)
      return data
    },

    logout() {
      if (this.token) api.post('/auth/logout').catch(() => {}) // regista o evento; não bloqueia o logout local
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
    },
  }
})
