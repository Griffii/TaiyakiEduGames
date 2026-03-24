<!-- src/components/VisualNovelPillList.vue -->
<template>
  <section
    class="vpl-root"
    :class="{ 'vpl-root--dropdown': variantComputed === 'dropdown' }"
  >
    <div class="vpl-inner" ref="wrapEl">
      <template v-if="variantComputed === 'dropdown'">
        <button
          ref="triggerEl"
          type="button"
          class="vpl-trigger"
          :class="{ 'vpl-trigger--open': isOpen }"
          @click="toggleOpen"
          :aria-expanded="isOpen"
          :aria-controls="panelId"
        >
          <span class="vpl-trigger-left">
            <span class="vpl-trigger-text">{{ buttonTextComputed }}</span>
            <span v-if="showCountsInButtonComputed" class="vpl-trigger-count">
              ({{ novelsSorted.length }})
            </span>
          </span>

          <span class="vpl-trigger-caret" aria-hidden="true">
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

        <Teleport to="body">
          <Transition name="vpl-pop">
            <div
              v-if="isOpen"
              class="vpl-pop-layer"
              :style="popStyle"
              :id="panelId"
              role="dialog"
              aria-modal="false"
            >
              <div class="vpl-panel">
                <div class="vpl-panel-scroll">
                  <p v-if="loading" class="vpl-muted">Loading visual novels…</p>
                  <p v-else-if="error" class="vpl-error">{{ error }}</p>

                  <section v-else class="vpl-section" aria-label="Visual novels">
                    <header v-if="showSectionTitleComputed" class="vpl-section-head">
                      <h2 class="vpl-section-title">Visual Novels</h2>
                      <span class="vpl-section-count">({{ novelsSorted.length }})</span>
                    </header>

                    <p v-if="!novelsSorted.length" class="vpl-muted vpl-center">
                      No visual novels found.
                    </p>

                    <ul v-else class="vpl-list">
                      <li v-for="novel in novelsSorted" :key="novel.id">
                        <button
                          type="button"
                          class="vpl-pill"
                          @click="openNovel(novel)"
                          :title="novel.title"
                        >
                          <span class="vpl-icon-wrap">
                            <img
                              v-if="coverUrl(novel)"
                              :src="coverUrl(novel)"
                              :alt="novel.title"
                              class="vpl-icon"
                              loading="lazy"
                              decoding="async"
                              @error.stop="onImageError(novel.id)"
                            />
                            <span v-else class="vpl-icon-fallback">
                              {{ novel.title?.charAt(0)?.toUpperCase() || '?' }}
                            </span>
                          </span>

                          <span class="vpl-pill-main">
                            <span class="vpl-pill-title">{{ novel.title }}</span>
                          </span>
                        </button>
                      </li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </template>

      <template v-else>
        <p v-if="loading" class="vpl-muted">Loading visual novels…</p>
        <p v-else-if="error" class="vpl-error">{{ error }}</p>

        <section v-else class="vpl-section" aria-label="Visual novels">
          <header v-if="showSectionTitleComputed" class="vpl-section-head">
            <h2 class="vpl-section-title">Visual Novels</h2>
            <span class="vpl-section-count">({{ novelsSorted.length }})</span>
          </header>

          <p v-if="!novelsSorted.length" class="vpl-muted vpl-center">
            No visual novels found.
          </p>

          <ul v-else class="vpl-list">
            <li v-for="novel in novelsSorted" :key="novel.id">
              <button
                type="button"
                class="vpl-pill"
                @click="openNovel(novel)"
                :title="novel.title"
              >
                <span class="vpl-icon-wrap">
                  <img
                    v-if="coverUrl(novel)"
                    :src="coverUrl(novel)"
                    :alt="novel.title"
                    class="vpl-icon"
                    loading="lazy"
                    decoding="async"
                    @error.stop="onImageError(novel.id)"
                  />
                  <span v-else class="vpl-icon-fallback">
                    {{ novel.title?.charAt(0)?.toUpperCase() || '?' }}
                  </span>
                </span>

                <span class="vpl-pill-main">
                  <span class="vpl-pill-title">{{ novel.title }}</span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

type UUID = string

type VisualNovel = {
  id: UUID
  slug: string
  title: string
  cover_image_url?: string | null
  is_published?: boolean | null
}

const props = withDefaults(
  defineProps<{
    showSectionTitle?: boolean
    variant?: 'inline' | 'dropdown'
    buttonText?: string
    startOpen?: boolean
    closeOnSelect?: boolean
    showCountsInButton?: boolean
  }>(),
  {
    showSectionTitle: true,
    variant: 'inline',
    buttonText: 'Visual Novels',
    startOpen: false,
    closeOnSelect: true,
    showCountsInButton: true
  }
)

const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const novels = ref<VisualNovel[]>([])
const failedImages = ref<Set<string>>(new Set())

const appBaseUrl = computed(() => {
  if (typeof window === 'undefined') return import.meta.env.BASE_URL || '/'
  return new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
})

const variantComputed = computed(() => props.variant ?? 'inline')
const buttonTextComputed = computed(() => props.buttonText ?? 'Visual Novels')
const showSectionTitleComputed = computed(() => !!props.showSectionTitle)
const showCountsInButtonComputed = computed(() => !!props.showCountsInButton)

const isOpen = ref<boolean>(!!props.startOpen)
const panelId = `vpl-panel-${Math.random().toString(36).slice(2, 10)}`

const wrapEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLElement | null>(null)

const popStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
  width: '320px'
})

const novelsSorted = computed(() =>
  novels.value.slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''))
)

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function updatePosition() {
  const trigger = triggerEl.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  const preferredWidth = Math.max(300, rect.width)
  const maxWidth = Math.min(440, vw - 16)
  const w = clamp(preferredWidth, 300, maxWidth)

  let left = rect.left
  left = clamp(left, 8, vw - w - 8)

  let top = rect.bottom + 8

  const approxPanelMaxH = Math.floor(vh * 0.7)
  const spaceBelow = vh - top - 8
  if (spaceBelow < 220 && rect.top > 260) {
    top = clamp(rect.top - 8 - approxPanelMaxH, 8, rect.top - 8)
  }

  popStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(w)}px`
  }
}

function toggleOpen() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updatePosition()
      addGlobalListeners()
    })
  } else {
    removeGlobalListeners()
  }
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  removeGlobalListeners()
}

function onDocPointerDown(e: PointerEvent) {
  const t = e.target as Node | null
  if (!t) return

  const trigger = triggerEl.value
  const pop = document.getElementById(panelId)
  if ((trigger && trigger.contains(t)) || (pop && pop.contains(t))) return

  close()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

let listenersOn = false

function addGlobalListeners() {
  if (listenersOn) return
  listenersOn = true
  window.addEventListener('resize', updatePosition, { passive: true })
  window.addEventListener('scroll', updatePosition, { passive: true })
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onKeyDown)
}

function removeGlobalListeners() {
  if (!listenersOn) return
  listenersOn = false
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition)
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onKeyDown)
}

onMounted(async () => {
  try {
    const { data, error: e } = await supabase
      .from('visual_novels')
      .select('id, slug, title, cover_image_url, is_published')
      .eq('is_published', true)
      .order('title', { ascending: true })

    if (e) throw e

    novels.value = (data || []) as VisualNovel[]
  } catch (e: any) {
    console.error(e)
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  removeGlobalListeners()
})

function resolvePublicAssetUrl(path?: string | null): string {
  if (!path) return ''

  const raw = String(path).trim()
  if (!raw) return ''

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw
  }

  if (typeof window !== 'undefined' && raw.startsWith('//')) {
    return `${window.location.protocol}${raw}`
  }

  const clean = raw.replace(/^\.\/+/, '').replace(/^\/+/, '')
  return new URL(clean, appBaseUrl.value).toString()
}

function coverUrl(novel: VisualNovel): string {
  if (failedImages.value.has(novel.id)) return ''

  const raw =
    novel.cover_image_url ||
    ''

  return resolvePublicAssetUrl(raw)
}

function onImageError(id: string) {
  failedImages.value.add(id)
}

function openNovel(novel: VisualNovel) {
  if (variantComputed.value === 'dropdown' && props.closeOnSelect) close()
  router.push(`/visual-novels/${novel.slug}`)
}
</script>

<style scoped>
.vpl-root {
  width: 100%;
  color: var(--textbook-on-surface);
}

.vpl-inner {
  padding: 0.4rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.vpl-root--dropdown .vpl-inner {
  padding: 0;
  gap: 0;
}

.vpl-muted {
  color: var(--main-text-soft);
  font-size: 0.9rem;
}

.vpl-error {
  color: var(--accent-danger);
  font-weight: 600;
}

.vpl-center {
  text-align: center;
}

.vpl-trigger {
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

.vpl-trigger:hover {
  transform: translateY(-1px);
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}

.vpl-trigger--open {
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}

.vpl-trigger-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.vpl-trigger-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vpl-trigger-count {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 900;
  color: color-mix(in srgb, var(--header-btn-text-hover) 65%, var(--header-btn-text) 35%);
}

.vpl-trigger-caret {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 10px;
  color: var(--header-btn-text, var(--header-on-surface));
  transition: transform 0.18s ease;
}

.vpl-trigger--open .vpl-trigger-caret {
  transform: rotate(180deg);
}

.vpl-pop-layer {
  position: fixed;
  z-index: 9999;
}

.vpl-pop-enter-active,
.vpl-pop-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
  transform-origin: top center;
  will-change: transform, opacity;
}

.vpl-pop-enter-from,
.vpl-pop-leave-to {
  transform: scaleY(0);
  opacity: 0;
}

.vpl-pop-enter-to,
.vpl-pop-leave-from {
  transform: scaleY(1);
  opacity: 1;
}

.vpl-panel {
  border-radius: var(--radius-lg);
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  box-shadow: var(--modal-shadow);
  overflow: hidden;
  max-height: min(70vh, 520px);
}

.vpl-panel-scroll {
  padding: 10px;
  overflow: auto;
  max-height: min(70vh, 520px);
}

.vpl-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  border-radius: var(--radius-lg);
  border: 2px solid var(--header-border-color);
  background: var(--header-surface);
  box-shadow: var(--header-shadow);
  padding: 0.55rem 0.6rem 0.65rem;
}

.vpl-section-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0 0.15rem 0.1rem;
}

.vpl-section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--header-on-surface);
}

.vpl-section-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--main-text-soft);
}

.vpl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.vpl-pill {
  --pill-border: var(--textbook-border);

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;

  width: 100%;
  padding: 0.45rem 0.7rem 0.45rem 0.4rem;

  border-radius: 999px;
  border: 2px solid var(--pill-border);
  background: var(--textbook-surface);

  color: var(--textbook-on-surface);
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;

  cursor: pointer;
  text-align: left;

  box-shadow: var(--textbook-shadow);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
}

.vpl-pill:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
  border-color: color-mix(in srgb, var(--accent-primary) 60%, var(--textbook-border) 40%);
}

.vpl-pill:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.vpl-icon-wrap {
  flex: 0 0 auto;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--textbook-border) 60%, #000 40%);
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.32), transparent 55%);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.vpl-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vpl-icon-fallback {
  font-weight: 800;
  font-size: 1rem;
  color: var(--textbook-on-surface);
}

.vpl-pill-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.vpl-pill-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 800;
}

@media (prefers-reduced-motion: reduce) {
  .vpl-trigger,
  .vpl-trigger:hover,
  .vpl-pop-enter-active,
  .vpl-pop-leave-active,
  .vpl-pill {
    transition: none !important;
  }
}

@media (max-width: 640px) {
  .vpl-inner {
    padding: 0.35rem 0;
  }

  .vpl-root--dropdown .vpl-inner {
    padding: 0;
  }

  .vpl-section {
    padding: 0.45rem 0.5rem 0.55rem;
  }

  .vpl-pill {
    padding: 0.35rem 0.6rem 0.35rem 0.35rem;
    font-size: 0.9rem;
  }

  .vpl-icon-wrap {
    width: 1.9rem;
    height: 1.9rem;
  }

  .vpl-section-title {
    font-size: 0.9rem;
  }

  .vpl-section-count {
    font-size: 0.8rem;
  }
}
</style>