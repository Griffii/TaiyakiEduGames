// src/utils/useTheme.ts
import { ref } from 'vue'
import { themeURLs, themeBgSettings, type ThemeKey } from '@/lib/themes'

const THEME_LINK_ID = 'app-theme-css'
const THEME_LS_KEY = 'eitake.theme'
const DEFAULT_THEME: ThemeKey = 'EiTake'

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

/** Singleton reactive state (shared across all callers) */
const current = ref<ThemeKey>(DEFAULT_THEME)
const bgImageEnabled = ref(true)
const overlayEnabled = ref(true)

/** One-time init guard */
let hasInitialized = false

function ensureLinkEl(): HTMLLinkElement {
  let el = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.id = THEME_LINK_ID
    el.rel = 'stylesheet'
    el.type = 'text/css'
    document.head.appendChild(el)
  }
  return el
}

function normalizeThemeKey(key: unknown): ThemeKey {
  const k = String(key ?? '') as ThemeKey
  return (k in themeURLs ? k : DEFAULT_THEME)
}

function readSavedTheme(): ThemeKey {
  if (!isBrowser) return DEFAULT_THEME
  try {
    return normalizeThemeKey(window.localStorage.getItem(THEME_LS_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

function writeSavedTheme(key: ThemeKey) {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(THEME_LS_KEY, key)
  } catch {
    /* ignore */
  }
}

/** Apply theme + per-theme background toggles */
function applyTheme(key: ThemeKey) {
  if (!isBrowser) return

  const safeKey = normalizeThemeKey(key)
  const href = themeURLs[safeKey]
  const link = ensureLinkEl()

  // Avoid thrashing the DOM/link loading if nothing changed
  if (link.href !== href) link.href = href

  current.value = safeKey
  writeSavedTheme(safeKey)

  // Useful hooks for theme-aware CSS
  document.documentElement.setAttribute('data-theme', safeKey)

  // Per-theme background settings for App.vue stacking
  const bg = themeBgSettings[safeKey] ?? { bgImage: true, overlay: true }
  bgImageEnabled.value = !!bg.bgImage
  overlayEnabled.value = !!bg.overlay

  // Optional debug hooks
  document.documentElement.setAttribute('data-bg-image', bgImageEnabled.value ? 'on' : 'off')
  document.documentElement.setAttribute('data-bg-overlay', overlayEnabled.value ? 'on' : 'off')
}

/** Ensure theme is applied once as soon as the module is used */
function initOnce() {
  if (!isBrowser || hasInitialized) return
  hasInitialized = true
  applyTheme(readSavedTheme())
}

export function useTheme() {
  initOnce()

  const keys = Object.keys(themeURLs) as ThemeKey[]

  return {
    current,
    keys,
    applyTheme, // expose for theme switcher UI
    bgImageEnabled,
    overlayEnabled,
  }
}
