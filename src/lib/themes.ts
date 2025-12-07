// src/lib/themes.ts
export const themeURLs = {
  Chalkboard: new URL('@/assets/themes/chalkboard.css', import.meta.url).href,
  Tron:       new URL('@/assets/themes/tron.css', import.meta.url).href,
  Sakura:     new URL('@/assets/themes/sakura.css', import.meta.url).href,
  Halloween:  new URL('@/assets/themes/halloween.css', import.meta.url).href,
  //Christmas:  new URL('@/assets/themes/christmas.css', import.meta.url).href,
} as const;

export type ThemeKey = keyof typeof themeURLs;
