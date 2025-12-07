// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import VueGtag from 'vue-gtag'

import '@/assets/css/fonts.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)


/** Load Themes **/
import { themeURLs } from '@/lib/themes'
const saved = (localStorage.getItem('eitake.theme') as keyof typeof themeURLs) || 'Chalkboard'
const link = document.createElement('link')
link.id = 'app-theme-css'
link.rel = 'stylesheet'
link.href = themeURLs[saved]
document.head.appendChild(link)
document.documentElement.setAttribute('data-theme', saved)


// GA4 — vue-gtag v2
app.use(VueGtag, {
  appName: 'EiTake.app',
  pageTrackerScreenviewEnabled: true,
  config: { id: 'G-DYDRSRRCER' }, // GA4 Measurement ID
}, router)

app.mount('#app')


