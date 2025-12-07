// src/composables/useTheme.ts
import { ref, onMounted } from 'vue'
import { themeURLs, type ThemeKey } from '@/lib/themes'

const THEME_LINK_ID = 'app-theme-css'
const THEME_LS_KEY = 'eitake.theme'

function ensureLinkEl(): HTMLLinkElement {
  let el = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.id = THEME_LINK_ID
    el.rel = 'stylesheet'
    document.head.appendChild(el)
  }
  return el
}

export function useTheme() {
  const current = ref<ThemeKey>('Chalkboard')
  const keys = Object.keys(themeURLs) as ThemeKey[]

  const applyTheme = (key: ThemeKey) => {
    const href = themeURLs[key]
    const link = ensureLinkEl()
    link.href = href
    current.value = key
    localStorage.setItem(THEME_LS_KEY, key)
    // Optional: set a data attribute for theme-aware tweaks
    document.documentElement.setAttribute('data-theme', key)
  }

  onMounted(() => {
    const saved = (localStorage.getItem(THEME_LS_KEY) as ThemeKey) || 'Chalkboard'
    applyTheme(saved)
  })

  return { current, keys, applyTheme }
}
