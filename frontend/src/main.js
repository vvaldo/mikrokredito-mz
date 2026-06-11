import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Toast, {
  position: 'top-right',
  timeout: 3500,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  hideProgressBar: false,
  maxToasts: 5,
  toastClassName: 'mk-toast',
})

// Load branding before mount (applies favicon + colors)
import { useBrandingStore } from './stores/branding'
const bStore = useBrandingStore(pinia)
bStore.load()

app.mount('#app')
