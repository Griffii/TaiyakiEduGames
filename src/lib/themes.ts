// src/lib/themes.ts
export const themeURLs = {
  EiTake:     new URL('@/assets/themes/eitake.css', import.meta.url).href,
  Tron:       new URL('@/assets/themes/tron.css', import.meta.url).href,
  Sakura:     new URL('@/assets/themes/sakura.css', import.meta.url).href,
  Halloween:  new URL('@/assets/themes/halloween.css', import.meta.url).href,
  //Christmas:  new URL('@/assets/themes/christmas.css', import.meta.url).href,
} as const;

export type ThemeKey = keyof typeof themeURLs;

/**
 * Per-theme background toggles.
 * Controls whether App.vue renders:
 * - base imageBg layer
 * - asphalt overlay texture layer
 */
export const themeBgSettings: Record<ThemeKey, { bgImage: boolean; overlay: boolean }> = {
  EiTake: { bgImage: false, overlay: true },
  Tron: { bgImage: false, overlay: false },
  Sakura: { bgImage: true, overlay: false },
  Halloween: { bgImage: false, overlay: true },
}