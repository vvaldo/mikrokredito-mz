import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import App from './App.vue'
import router from './router'

// Único import de CSS — main.css já importa tudo
import './assets/styles/main.css'

const app    = createApp(App)
const pinia  = createPinia()

app.use(pinia)
app.use(router)
app.use(Toast, {
  position: 'top-right', timeout: 3500, closeOnClick: true,
  pauseOnHover: true, draggable: true, hideProgressBar: false, maxToasts: 5,
})

// Carregar branding e tema antes do mount
import { useBrandingStore } from './stores/branding'
import { useThemeStore }    from './stores/theme'

const pinia2 = app.config.globalProperties.$pinia = pinia
useBrandingStore(pinia).load()
useThemeStore(pinia).load()

app.mount('#app')
