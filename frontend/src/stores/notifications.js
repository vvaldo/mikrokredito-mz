// src/stores/notifications.js
import { defineStore } from 'pinia'
import api from '@/services/api'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    templates: [],
    rules: [],
    logs: [],
    stats: [],
    logsMeta: { total: 0, page: 1, limit: 50 },
    loading: false,
    queueStatus: null,
    unreadCount: 0,
    recent: [],
  }),

  actions: {
    // ── Sino de notificações (topbar)
    async fetchUnreadCount() {
      try {
        const { data } = await api.get('/notifications/my/unread-count')
        this.unreadCount = data.data?.count || 0
      } catch (e) {}
    },

    async fetchRecent(limit = 8) {
      try {
        const { data } = await api.get('/notifications/my', { params: { limit } })
        this.recent = data.data || []
        this.unreadCount = data.unread ?? this.unreadCount
      } catch (e) {}
    },

    async markRead(id) {
      try {
        await api.post(`/notifications/${id}/read`)
        const n = this.recent.find(x => x.id === id)
        if (n && !n.read_at) { n.read_at = new Date().toISOString(); this.unreadCount = Math.max(0, this.unreadCount - 1) }
      } catch (e) {}
    },

    // ── Templates
    async fetchTemplates(params = {}) {
      this.loading = true
      try {
        const { data } = await api.get('/notifications/templates', { params })
        this.templates = data.data
      } finally { this.loading = false }
    },

    async saveTemplate(template) {
      if (template.id) {
        const { data } = await api.put(`/notifications/templates/${template.id}`, template)
        const idx = this.templates.findIndex(t => t.id === template.id)
        if (idx >= 0) this.templates[idx] = data.data
        return data.data
      } else {
        const { data } = await api.post('/notifications/templates', template)
        this.templates.push(data.data)
        return data.data
      }
    },

    async deleteTemplate(id) {
      await api.delete(`/notifications/templates/${id}`)
      this.templates = this.templates.filter(t => t.id !== id)
    },

    // ── Rules
    async fetchRules() {
      const { data } = await api.get('/notifications/rules')
      this.rules = data.data
    },

    async saveRule(rule) {
      if (rule.id) {
        const { data } = await api.put(`/notifications/rules/${rule.id}`, rule)
        const idx = this.rules.findIndex(r => r.id === rule.id)
        if (idx >= 0) this.rules[idx] = data.data
        return data.data
      } else {
        const { data } = await api.post('/notifications/rules', rule)
        this.rules.push(data.data)
        return data.data
      }
    },

    // ── Logs
    async fetchLogs(params = {}) {
      this.loading = true
      try {
        const { data } = await api.get('/notifications/logs', { params })
        this.logs = data.data
        this.logsMeta = data.meta
      } finally { this.loading = false }
    },

    // ── Stats
    async fetchStats(params = {}) {
      const { data } = await api.get('/notifications/stats', { params })
      this.stats = data.data
    },

    // ── Retry
    async retryFailed(institutionId) {
      const { data } = await api.post('/notifications/retry', { institution_id: institutionId })
      return data
    },

    async retrySingle(logId) {
      const { data } = await api.post(`/notifications/retry/${logId}`)
      return data
    },

    // ── Test
    async sendTest(payload) {
      const { data } = await api.post('/notifications/test', payload)
      return data
    },
  }
})
