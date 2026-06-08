import { defineStore } from 'pinia'
import api from '@/services/api'

export const usePaymentStore = defineStore('payments', {
  state: () => ({ payments: [], meta: { total: 0, page: 1, limit: 50 }, loading: false }),
  actions: {
    async fetchPayments(params = {}) {
      this.loading = true
      try {
        const { data } = await api.get('/payments', { params })
        this.payments = data.data
        this.meta = data.meta
      } finally { this.loading = false }
    },
    async initiate(payload) {
      const { data } = await api.post('/payments/initiate', payload)
      return data
    },
    async reconcile() {
      const { data } = await api.post('/payments/reconcile')
      return data
    },
    async getPaymentsSummary(params) {
      const { data } = await api.get('/reports/payments-summary', { params })
      return data.data
    },
  }
})
