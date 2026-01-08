<!-- src/components/ActivityPillList.vue -->
<template>
  <section class="apl-root" :class="{ 'apl-root--dropdown': variant === 'dropdown' }">
    <div class="apl-inner" ref="wrapEl">
      <!-- DROPDOWN MODE -->
      <template v-if="variant === 'dropdown'">
        <!-- Dropdown trigger -->
        <button
          ref="triggerEl"
          type="button"
          class="apl-trigger"
          :class="{ 'apl-trigger--open': isOpen }"
          @click="toggleOpen"
          :aria-expanded="isOpen"
          :aria-controls="panelId"
        >
          <span class="apl-trigger-left">
            <span class="apl-trigger-text">
              {{ buttonTextComputed }}
            </span>

            <span v-if="showCountsInButtonComputed" class="apl-trigger-count">
              ({{ totalCount }})
            </span>
          </span>

          <span class="apl-trigger-caret" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path
                d="M7 10l5 5 5-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>

        <!-- Teleported dropdown panel -->
        <Teleport to="body">
          <Transition name="apl-pop">
            <div
              v-if="isOpen"
              class="apl-pop-layer"
              :style="popStyle"
              :id="panelId"
              role="dialog"
              aria-modal="false"
            >
              <div class="apl-panel">
                <div class="apl-panel-inner">
                  <!-- Status states -->
                  <p v-if="loading" class="apl-muted">Loading activities…</p>
                  <p v-else-if="error" class="apl-error">{{ error }}</p>

                  <template v-else>
                    <p v-if="!hasAny" class="apl-muted apl-center">
                      No activities found.
                    </p>

                    <div v-else class="apl-sections">
                      <template v-if="orderComputed === 'activities-first'">
                        <!-- Games -->
                        <section v-if="showActivities && regularActivities.length" class="apl-section">
                          <header v-if="showSectionTitlesComputed" class="apl-section-head">
                            <h2 class="apl-section-title">Games</h2>
                            <span class="apl-section-count">({{ regularActivities.length }})</span>
                          </header>

                          <ul class="apl-list">
                            <li v-for="a in regularActivities" :key="a.id">
                              <button
                                type="button"
                                class="apl-pill"
                                :class="{ 'apl-pill--xp': isXp(a), 'apl-pill--new': isNew(a) }"
                                @click="openActivity(a)"
                              >
                                <span v-if="isNew(a) || isXp(a)" class="apl-chip-row">
                                  <span v-if="isNew(a)" class="apl-new-badge">NEW</span>
                                  <span v-if="isXp(a)" class="apl-xp-badge">XP</span>
                                </span>

                                <span class="apl-icon-wrap">
                                  <img
                                    v-if="iconUrl(a)"
                                    :src="iconUrl(a)"
                                    :alt="a.name"
                                    class="apl-icon"
                                    loading="lazy"
                                    decoding="async"
                                    @error.stop="onIconError(a.id)"
                                  />
                                  <span v-else class="apl-icon-fallback">
                                    {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                  </span>
                                </span>

                                <span class="apl-pill-text">{{ a.name }}</span>
                              </button>
                            </li>
                          </ul>
                        </section>

                        <!-- Teacher Tools -->
                        <section v-if="showTools && teacherTools.length" class="apl-section">
                          <header v-if="showSectionTitlesComputed" class="apl-section-head">
                            <h2 class="apl-section-title">Teacher Tools</h2>
                            <span class="apl-section-count">({{ teacherTools.length }})</span>
                          </header>

                          <ul class="apl-list">
                            <li v-for="a in teacherTools" :key="a.id">
                              <button
                                type="button"
                                class="apl-pill apl-pill--tool"
                                :class="{ 'apl-pill--xp': isXp(a), 'apl-pill--new': isNew(a) }"
                                @click="openActivity(a)"
                              >
                                <span v-if="isNew(a) || isXp(a)" class="apl-chip-row">
                                  <span v-if="isNew(a)" class="apl-new-badge">NEW</span>
                                  <span v-if="isXp(a)" class="apl-xp-badge">XP</span>
                                </span>

                                <span class="apl-icon-wrap">
                                  <img
                                    v-if="iconUrl(a)"
                                    :src="iconUrl(a)"
                                    :alt="a.name"
                                    class="apl-icon"
                                    loading="lazy"
                                    decoding="async"
                                    @error.stop="onIconError(a.id)"
                                  />
                                  <span v-else class="apl-icon-fallback">
                                    {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                  </span>
                                </span>

                                <span class="apl-pill-text">{{ a.name }}</span>
                              </button>
                            </li>
                          </ul>
                        </section>
                      </template>

                      <template v-else>
                        <!-- Teacher Tools first -->
                        <section v-if="showTools && teacherTools.length" class="apl-section">
                          <header v-if="showSectionTitlesComputed" class="apl-section-head">
                            <h2 class="apl-section-title">Teacher Tools</h2>
                            <span class="apl-section-count">({{ teacherTools.length }})</span>
                          </header>

                          <ul class="apl-list">
                            <li v-for="a in teacherTools" :key="a.id">
                              <button
                                type="button"
                                class="apl-pill apl-pill--tool"
                                :class="{ 'apl-pill--xp': isXp(a), 'apl-pill--new': isNew(a) }"
                                @click="openActivity(a)"
                              >
                                <span v-if="isNew(a) || isXp(a)" class="apl-chip-row">
                                  <span v-if="isNew(a)" class="apl-new-badge">NEW</span>
                                  <span v-if="isXp(a)" class="apl-xp-badge">XP</span>
                                </span>

                                <span class="apl-icon-wrap">
                                  <img
                                    v-if="iconUrl(a)"
                                    :src="iconUrl(a)"
                                    :alt="a.name"
                                    class="apl-icon"
                                    loading="lazy"
                                    decoding="async"
                                    @error.stop="onIconError(a.id)"
                                  />
                                  <span v-else class="apl-icon-fallback">
                                    {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                  </span>
                                </span>

                                <span class="apl-pill-text">{{ a.name }}</span>
                              </button>
                            </li>
                          </ul>
                        </section>

                        <!-- Games second -->
                        <section v-if="showActivities && regularActivities.length" class="apl-section">
                          <header v-if="showSectionTitlesComputed" class="apl-section-head">
                            <h2 class="apl-section-title">Games</h2>
                            <span class="apl-section-count">({{ regularActivities.length }})</span>
                          </header>

                          <ul class="apl-list">
                            <li v-for="a in regularActivities" :key="a.id">
                              <button
                                type="button"
                                class="apl-pill"
                                :class="{ 'apl-pill--xp': isXp(a), 'apl-pill--new': isNew(a) }"
                                @click="openActivity(a)"
                              >
                                <span v-if="isNew(a) || isXp(a)" class="apl-chip-row">
                                  <span v-if="isNew(a)" class="apl-new-badge">NEW</span>
                                  <span v-if="isXp(a)" class="apl-xp-badge">XP</span>
                                </span>

                                <span class="apl-icon-wrap">
                                  <img
                                    v-if="iconUrl(a)"
                                    :src="iconUrl(a)"
                                    :alt="a.name"
                                    class="apl-icon"
                                    loading="lazy"
                                    decoding="async"
                                    @error.stop="onIconError(a.id)"
                                  />
                                  <span v-else class="apl-icon-fallback">
                                    {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                  </span>
                                </span>

                                <span class="apl-pill-text">{{ a.name }}</span>
                              </button>
                            </li>
                          </ul>
                        </section>
                      </template>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </template>

      <!-- INLINE MODE -->
      <template v-else>
        <!-- (Keep your existing inline render exactly as-is here) -->
        <!-- Status states -->
        <p v-if="loading" class="apl-muted">Loading activities…</p>
        <p v-else-if="error" class="apl-error">{{ error }}</p>

        <template v-else>
          <p v-if="!hasAny" class="apl-muted apl-center">No activities found.</p>

          <div v-else class="apl-sections">
            <!-- Keep the same inline sections/pills rendering you already have -->
            <!-- ... -->
          </div>
        </template>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { withLoading } from '@/utils/withLoading'

type UUID = string

type Activity = {
  id: UUID
  slug: string
  name: string
  type?: string | null
  url_path?: string | null
  external_url?: string | null
  icon_url?: string | null
  thumbnail_url?: string | null
  tags?: string[] | null
  status?: string | null
  archived_at?: string | null
}

const props = defineProps<{
  show?: 'activities' | 'tools' | 'both'
  order?: 'activities-first' | 'tools-first'
  showSectionTitles?: boolean

  variant?: 'inline' | 'dropdown'
  buttonText?: string
  startOpen?: boolean
  closeOnSelect?: boolean
  showCountsInButton?: boolean

  /** Optional cap for dropdown width (px). */
  dropdownMaxWidth?: number
}>()

const router = useRouter()

/* Defaults without withDefaults (prevents TS 2440 conflict) */
const variant = computed(() => props.variant ?? 'inline')
const showComputed = computed(() => props.show ?? 'both')
const orderComputed = computed(() => props.order ?? 'activities-first')
const showSectionTitlesComputed = computed(() => props.showSectionTitles ?? true)
const buttonTextComputed = computed(() => props.buttonText ?? 'Menu')
const closeOnSelectComputed = computed(() => props.closeOnSelect ?? true)
const showCountsInButtonComputed = computed(() => props.showCountsInButton ?? true)
const dropdownMaxWidthComputed = computed(() => Number(props.dropdownMaxWidth ?? 360))

const loading = ref(true)
const error = ref<string | null>(null)
const activities = ref<Activity[]>([])
const failedIcons = ref<Set<string>>(new Set())

/* Dropdown state + positioning */
const isOpen = ref<boolean>(!!props.startOpen)
const panelId = `apl-panel-${Math.random().toString(36).slice(2, 10)}`

const triggerEl = ref<HTMLElement | null>(null)
const wrapEl = ref<HTMLElement | null>(null)

const popStyle = ref<Record<string, string>>({})

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function computePopPosition() {
  const el = triggerEl.value
  if (!el) return

  const r = el.getBoundingClientRect()

  const gap = 8
  const pad = 10
  const maxW = dropdownMaxWidthComputed.value

  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  // Width: at least trigger width, capped, and stays within viewport
  const desiredW = Math.max(r.width, 240)
  const width = clamp(desiredW, 220, Math.min(maxW, viewportW - pad * 2))

  // Left: clamp so it stays on-screen horizontally
  const left = clamp(r.left, pad, viewportW - pad - width)

  // Top: DO NOT clamp to pad (this is what caused the “sticky” behavior)
  // Default: directly below trigger
  let top = r.bottom + gap

  // If near bottom, flip upward like TextbookPillList
  const approxPanelMaxH = Math.floor(viewportH * 0.7)
  const spaceBelow = viewportH - top - pad
  if (spaceBelow < 220 && r.top > 260) {
    top = Math.max(pad, r.top - gap - approxPanelMaxH)
  }

  // Max height (safe cap). Do not depend on a clamped top.
  const maxHeight = Math.max(180, Math.min(approxPanelMaxH, viewportH - pad * 2))

  popStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.floor(maxHeight)}px`
  }
}


function openDropdown() {
  isOpen.value = true
  nextTick(() => {
    computePopPosition()
    addGlobalListeners()
  })
}

function closeDropdown() {
  isOpen.value = false
  removeGlobalListeners()
}

function toggleOpen() {
  if (isOpen.value) closeDropdown()
  else openDropdown()
}

/* Close on outside click / Escape; also keep clamped on resize/scroll */
function onDocPointerDown(e: PointerEvent) {
  if (!isOpen.value) return
  const t = e.target as Node | null
  const trigger = triggerEl.value
  // panel is teleported; detect via closest
  const panel = document.getElementById(panelId)
  if (trigger && t && trigger.contains(t)) return
  if (panel && t && panel.contains(t)) return
  closeDropdown()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) closeDropdown()
}

function onViewportChange() {
  if (!isOpen.value) return
  computePopPosition()
}

/* Match TextbookPillList: listeners only while open */
let listenersOn = false
function addGlobalListeners() {
  if (listenersOn) return
  listenersOn = true

  window.addEventListener('resize', onViewportChange, { passive: true })

  // IMPORTANT: keep dropdown anchored to trigger while scrolling.
  // Use capture so we also catch scroll events from nested scroll containers.
  window.addEventListener('scroll', onViewportChange, { passive: true, capture: true } as any)

  document.addEventListener('pointerdown', onDocPointerDown, true)
  window.addEventListener('keydown', onKeydown)
}

function removeGlobalListeners() {
  if (!listenersOn) return
  listenersOn = false

  window.removeEventListener('resize', onViewportChange as any)
  window.removeEventListener('scroll', onViewportChange as any, true as any)

  document.removeEventListener('pointerdown', onDocPointerDown as any, true)
  window.removeEventListener('keydown', onKeydown)
}

onMounted(async () => {
  await withLoading(async () => {
    try {
      const { data, error: e } = await supabase
        .from('activities')
        .select('id, slug, name, type, url_path, external_url, icon_url, thumbnail_url, tags, status, archived_at')
        .is('archived_at', null)
        .order('name', { ascending: true })

      if (e) throw e
      activities.value = (data || []) as Activity[]
    } catch (e: any) {
      console.error(e)
      error.value = e?.message ?? String(e)
    } finally {
      loading.value = false
    }
  }, 250)

  // If startOpen, position + enable listeners
  if (variant.value === 'dropdown' && isOpen.value) {
    await nextTick()
    computePopPosition()
    addGlobalListeners()
  }
})

onBeforeUnmount(() => {
  removeGlobalListeners()
})

function normTags(a: Activity): string[] {
  return (a.tags || []).map(t => String(t).toLowerCase().trim())
}

function isTeacherTool(a: Activity): boolean {
  const tags = normTags(a)
  return tags.includes('teacher tool') || tags.includes('teacher-tool') || tags.includes('teachertool')
}

function isXp(a: Activity): boolean {
  const tags = normTags(a)
  return (
    tags.includes('xp') ||
    tags.includes('XP') ||
    tags.includes('gives_xp') ||
    tags.includes('givesxp') ||
    tags.includes('experience')
  )
}

function isNew(a: Activity): boolean {
  const tags = normTags(a)
  if (a.status && String(a.status).toLowerCase().trim() === 'new') return true
  return tags.includes('new') || tags.includes('recent')
}

const activitiesSorted = computed(() => activities.value.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')))

const teacherTools = computed(() => activitiesSorted.value.filter(a => isTeacherTool(a)))
const regularActivities = computed(() => activitiesSorted.value.filter(a => !isTeacherTool(a)))

const showActivities = computed(() => showComputed.value === 'activities' || showComputed.value === 'both')
const showTools = computed(() => showComputed.value === 'tools' || showComputed.value === 'both')

const hasAny = computed(() => {
  const actCount = showActivities.value ? regularActivities.value.length : 0
  const toolCount = showTools.value ? teacherTools.value.length : 0
  return actCount + toolCount > 0
})

const totalCount = computed(() => {
  const actCount = showActivities.value ? regularActivities.value.length : 0
  const toolCount = showTools.value ? teacherTools.value.length : 0
  return actCount + toolCount
})

function isHttpUrl(s?: string | null): boolean {
  return !!s && /^[a-z][a-z0-9+\-.]*:\/\//i.test(String(s).trim())
}

const ASSET_BUCKET = 'public-assets'
const ICONS_PREFIX = 'game-icons/'

function iconUrl(a: Activity): string {
  if (failedIcons.value.has(a.id)) return ''
  const raw = a.icon_url || a.thumbnail_url || ''
  if (!raw) return ''
  if (isHttpUrl(raw)) return raw

  let key = String(raw).replace(/^\/+/, '')
  if (!key.startsWith(ICONS_PREFIX)) key = ICONS_PREFIX + key
  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(key)
  return data?.publicUrl || ''
}

function onIconError(id: string) {
  failedIcons.value.add(id)
}

function toAbsoluteExternal(raw?: string | null): string {
  if (!raw) return ''
  let s = String(raw).trim()
  if (!s) return ''

  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(s)) return s
  if (/^[a-z][a-z0-9+\-.]*:/i.test(s)) return s
  if (s.startsWith('//')) return (window.location?.protocol || 'https:') + s
  if (/^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(s)) s = 'https://' + s

  try {
    const u = new URL(s, window.location.origin)
    const hasExt = /\.[a-z0-9]+$/i.test(u.pathname.split('/').pop() || '')
    if (!hasExt && !u.search && !u.hash && !u.pathname.endsWith('/')) u.pathname += '/'
    return u.toString()
  } catch {
    return s
  }
}

function normalizeInternalPath(raw?: string | null): string {
  if (!raw) return ''
  let s = String(raw).trim()
  if (!s) return ''
  if (!s.startsWith('/')) s = '/' + s
  return s
}

function openActivity(a: Activity) {
  if (variant.value === 'dropdown' && closeOnSelectComputed.value) {
    closeDropdown()
  }

  if (a.url_path) {
    router.push(normalizeInternalPath(a.url_path))
    return
  }
  if (a.slug) {
    router.push(`/activities/${a.slug}`)
    return
  }
  if (a.external_url) {
    const url = toAbsoluteExternal(a.external_url)
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
  }
  alert('No activity URL is configured.')
}
</script>

<style scoped>
/* =========================
   Root container
   ========================= */
.apl-root {
  width: 100%;
  color: var(--activities-on-surface);
}

.apl-inner {
  padding: 0.4rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.apl-root--dropdown .apl-inner {
  padding: 0;
  gap: 0;
}

/* Text utilities */
.apl-muted {
  color: var(--main-text-soft);
  font-size: 0.9rem;
}

.apl-error {
  color: var(--accent-danger);
  font-weight: 600;
}

.apl-center {
  text-align: center;
}

/* =========================
   Dropdown trigger (smaller)
   ========================= */
.apl-trigger {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;

  padding: 0.3rem 0.55rem;
  border-radius: 12px;

  border: 2px solid var(--header-btn-border-color, var(--header-border-color));
  background-color: var(--header-btn-bg, var(--header-surface));
  color: var(--header-btn-text, var(--header-on-surface));
  font-weight: 900;
  font-size: 13px;
  line-height: 1.1;

  cursor: pointer;
  user-select: none;

  box-shadow: var(--header-shadow);
  background-image: var(--header-btn-fill);
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 0% 100%;

  transition: background-size 0.28s ease, transform 0.12s ease, color 0.18s ease, background-color 0.18s ease;
}

.apl-trigger:hover {
  transform: translateY(-1px);
  background-color: var(--header-btn-hover, var(--header-surface));
  color: var(--header-btn-text-hover, var(--header-on-surface));
  background-size: 100% 100%;
}

.apl-trigger:active {
  transform: translateY(0);
}

.apl-trigger-left {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
}

.apl-trigger-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.apl-trigger-count {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 900;
  color: color-mix(in srgb, var(--header-btn-text, var(--header-on-surface)) 70%, transparent);
}

.apl-trigger-caret {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 10px;

  color: var(--header-btn-text, var(--header-on-surface));
  transition: transform 0.18s ease;
}

.apl-trigger--open .apl-trigger-caret {
  transform: rotate(180deg);
}

/* =========================
   Teleported layer (above everything)
   ========================= */
.apl-pop-layer {
  z-index: 99999;
  pointer-events: auto;
  position: fixed; /* Position & size are provided by :style="popStyle" */
}

/* Panel chrome */
.apl-panel {
  width: 100%;
  max-height: inherit;
  overflow: auto;

  border-radius: var(--radius-lg);
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  box-shadow: var(--modal-shadow);
}

.apl-panel-inner {
  padding: 10px;
}

/* Popover expand/collapse (scaleY) */
.apl-pop-enter-active,
.apl-pop-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
  transform-origin: top center; /* anchor at top */
  will-change: transform, opacity;
}

.apl-pop-enter-from,
.apl-pop-leave-to {
  transform: scaleY(0);
  opacity: 0;
}

.apl-pop-enter-to,
.apl-pop-leave-from {
  transform: scaleY(1);
  opacity: 1;
}

/* =========================
   Sections wrapper
   ========================= */
.apl-sections {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.apl-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  border-radius: var(--radius-lg);
  border: 2px solid var(--header-border-color);
  background: var(--header-surface);
  box-shadow: var(--header-shadow);
  padding: 0.55rem 0.6rem 0.65rem;
}

.apl-section-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0 0.15rem 0.1rem;
}

.apl-section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--header-on-surface);
}

.apl-section-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--main-text-soft);
}

/* =========================
   Vertical list + pills
   ========================= */
.apl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.apl-pill {
  --pill-border: var(--activities-border);

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;

  width: 100%;
  padding: 0.4rem 0.7rem 0.4rem 0.4rem;

  border-radius: 999px;
  border: 2px solid var(--pill-border);
  background: var(--activities-surface);

  color: var(--activities-on-surface);
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;

  cursor: pointer;
  text-align: left;

  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.24);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
}

.apl-pill--tool {
  background: color-mix(in srgb, var(--activities-surface) 82%, var(--neutral-100) 18%);
}

.apl-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.28);
  border-color: color-mix(in srgb, var(--accent-primary) 60%, var(--activities-border) 40%);
}

.apl-pill:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.apl-pill--new,
.apl-pill--xp {
  position: relative;
  overflow: visible;
}

/* NEW + XP chips */
.apl-chip-row {
  position: absolute;
  top: -0.5rem;
  right: 0.5rem;
  display: inline-flex;
  gap: 0.25rem;
  pointer-events: none;
}

.apl-new-badge,
.apl-xp-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 0.05rem 0.45rem 0.15rem;
  border-radius: 999px;

  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.22);
}

.apl-new-badge {
  border: 2px solid color-mix(in srgb, var(--accent-warning) 70%, var(--accent-danger) 30%);
  background: color-mix(in srgb, var(--accent-warning) 70%, var(--neutral-0) 30%);
  color: #3a2100;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.apl-xp-badge {
  border: 2px solid color-mix(in srgb, var(--activities-chip-xp) 70%, #000 30%);
  background: color-mix(in srgb, var(--activities-chip-xp) 75%, var(--neutral-0) 25%);
  color: var(--activities-on-surface);
}

.apl-icon-wrap {
  flex: 0 0 auto;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--activities-border) 60%, #000 40%);
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.32), transparent 55%);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.apl-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.apl-icon-fallback {
  font-weight: 800;
  font-size: 1rem;
  color: var(--activities-on-surface);
}

.apl-pill-text {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .apl-trigger,
  .apl-trigger:hover,
  .apl-pop-enter-active,
  .apl-pop-leave-active,
  .apl-pill,
  .apl-pill:hover {
    transition: none;
  }
}
</style>
