// src/stores/loans.js
import { defineStore } from 'pinia'
import api from '@/services/api'

export const useLoanStore = defineStore('loans', {
  state: () => ({
    applications: [],
    currentApplication: null,
    schedule: [],
    meta: { total: 0, page: 1, limit: 20 },
    simulation: null,
    loading: false,
  }),

  actions: {
    async fetchApplications(params = {}) {
      this.loading = true
      try {
        const { data } = await api.get('/loans', { params })
        this.applications = data.data
        this.meta = data.meta
      } finally { this.loading = false }
    },

    async fetchApplication(id) {
      const { data } = await api.get(`/loans/${id}`)
      this.currentApplication = data.data
      return data.data
    },

    async fetchSchedule(applicationId) {
      const { data } = await api.get(`/loans/${applicationId}/schedule`)
      this.schedule = data.data
      return data.data
    },

    // Simulate on-device (no network needed)
    simulateLocal({ principal, monthlyRate, termMonths, type = 'reducing_balance' }) {
      const r = monthlyRate
      const n = termMonths
      let pmt

      if (type === 'reducing_balance') {
        pmt = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      } else {
        pmt = principal / n + principal * r
      }

      let balance = principal
      const schedule = []
      for (let i = 1; i <= n; i++) {
        const interest = type === 'reducing_balance' ? balance * r : principal * r
        const principalPmt = pmt - interest
        balance -= principalPmt
        schedule.push({
          installment_number: i,
          principal_due: round(principalPmt),
          interest_due: round(interest),
          total_due: round(pmt),
          balance_after: round(Math.max(balance, 0)),
        })
      }

      this.simulation = {
        monthly_installment: round(pmt),
        total_repayable: round(pmt * n),
        total_interest: round(pmt * n - principal),
        schedule,
      }
      return this.simulation
    },

    async submitApplication(payload) {
      const { data } = await api.post('/loans', payload)
      this.applications.unshift(data.data)
      return data
    },

    async updateApplication(id, payload) {
      const { data } = await api.patch(`/loans/${id}`, payload)
      const idx = this.applications.findIndex(a => a.id === id)
      if (idx >= 0) this.applications[idx] = data.data
      this.currentApplication = data.data
      return data
    },

    async disburse(id) {
      const { data } = await api.post(`/loans/${id}/disburse`)
      return data
    },
  }
})

function round(v) { return Math.round(v * 100) / 100 }
