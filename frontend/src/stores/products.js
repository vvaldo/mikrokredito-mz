import { defineStore } from 'pinia'
import api from '@/services/api'

export const useProductStore = defineStore('products', {
  state: () => ({ products: [], loading: false }),
  actions: {
    async fetchProducts(params = {}) {
      this.loading = true
      try {
        const { data } = await api.get('/products', { params })
        this.products = data.data
      } finally { this.loading = false }
    },
    async saveProduct(product) {
      if (product.id) {
        const { data } = await api.patch(`/products/${product.id}`, product)
        const idx = this.products.findIndex(p => p.id === product.id)
        if (idx >= 0) this.products[idx] = data.data
        return data.data
      }
      const { data } = await api.post('/products', product)
      this.products.push(data.data)
      return data.data
    },
    async deleteProduct(id) {
      await api.delete(`/products/${id}`)
      this.products = this.products.filter(p => p.id !== id)
    },
  }
})
