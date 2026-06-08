import { defineStore } from 'pinia'
import api, { uploadDocument } from '@/services/api'

export const useDocumentStore = defineStore('documents', {
  state: () => ({ documents: [], loading: false }),
  actions: {
    async fetchDocuments(params = {}) {
      this.loading = true
      try {
        const { data } = await api.get('/documents', { params })
        this.documents = data.data
      } finally { this.loading = false }
    },
    async upload(file, docType, clientId, loanId) {
      const data = await uploadDocument(file, docType, clientId, loanId)
      this.documents.push(data.data)
      return data.data
    },
    async reviewDocument(id, status, reason) {
      const { data } = await api.patch(`/documents/${id}/review`, { status, reason })
      const idx = this.documents.findIndex(d => d.id === id)
      if (idx >= 0) this.documents[idx] = data.data
    },
    async deleteDocument(id) {
      await api.delete(`/documents/${id}`)
      this.documents = this.documents.filter(d => d.id !== id)
    },
  }
})
