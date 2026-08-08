// src/services/api.js
import axios from 'axios'
import { useToast } from 'vue-toastification'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const toast = useToast()
    const msg = error.response?.data?.message || 'Erro de comunicação com o servidor'

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      toast.error('Sem permissão para esta acção')
    } else if (error.response?.status >= 500) {
      toast.error('Erro interno do servidor. Tente novamente.')
    }

    return Promise.reject(error)
  }
)

export default api

// ── Document upload helper
export async function uploadDocument(file, docType, clientId, loanId) {
  const form = new FormData()
  form.append('file', file)
  form.append('doc_type', docType)
  if (clientId) form.append('client_id', clientId)
  if (loanId) form.append('loan_id', loanId)

  const { data } = await api.post('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}


// ── Shared authenticated blob-download helper. responseType:'blob' means axios never parses
// an error JSON body (403/404/etc.) — it silently wraps it as an opaque Blob, so callers used
// to get a generic "erro" toast no matter what actually failed server-side (missing file on
// disk, permissão negada, ...). This decodes the Blob back to JSON on failure so the real
// backend message reaches the user.
async function downloadBlob(url, fallbackName) {
  let response
  try {
    response = await api.get(url, { responseType: 'blob' })
  } catch (err) {
    let message = 'Erro ao transferir ficheiro'
    if (err.response?.data instanceof Blob) {
      try { message = JSON.parse(await err.response.data.text())?.message || message } catch (_) { /* not JSON */ }
    } else if (err.response?.data?.message) {
      message = err.response.data.message
    }
    throw new Error(message)
  }

  const disposition = response.headers['content-disposition'] || ''
  let filename = fallbackName
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  const normalMatch = disposition.match(/filename="?([^";]+)"?/i)
  if (utf8Match?.[1]) filename = decodeURIComponent(utf8Match[1])
  else if (normalMatch?.[1]) filename = normalMatch[1]

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

// ── Authenticated document download helper
export async function downloadDocument(documentId, fallbackName = 'documento') {
  return downloadBlob(`/documents/${documentId}/download`, fallbackName)
}

// ── Authenticated payment receipt download helper
export async function downloadReceipt(paymentId, fallbackName = 'comprovativo') {
  return downloadBlob(`/payments/${paymentId}/receipt`, fallbackName)
}


export function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
  const origin = apiBase.includes('/api/') ? apiBase.split('/api/')[0] : ''
  return `${origin}${path.startsWith('/') ? path : '/' + path}`
}
