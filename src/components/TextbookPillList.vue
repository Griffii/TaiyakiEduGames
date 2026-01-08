<!-- src/components/TextbookPillList.vue -->
<template>
  <section class="tpl-root" :class="{ 'tpl-root--dropdown': variantComputed === 'dropdown' }">
    <div class="tpl-inner" ref="wrapEl">
      <!-- DROPDOWN MODE -->
      <template v-if="variantComputed === 'dropdown'">
        <!-- Trigger button (styled to match ActivityPillList trigger) -->
        <button ref="triggerEl" type="button" class="tpl-trigger" :class="{ 'tpl-trigger--open': isOpen }"
          @click="toggleOpen" :aria-expanded="isOpen" :aria-controls="panelId">
          <span class="tpl-trigger-left">
            <span class="tpl-trigger-text">{{ buttonTextComputed }}</span>
            <span v-if="showCountsInButtonComputed" class="tpl-trigger-count">
              ({{ sortedTextbooks.length }})
            </span>
          </span>

          <span class="tpl-trigger-caret" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">
              <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </span>
        </button>

        <!-- Teleported dropdown panel -->
        <Teleport to="body">
          <Transition name="tpl-pop">
            <div v-if="isOpen" class="tpl-pop-layer" :style="popStyle" :id="panelId" role="dialog" aria-modal="false">
              <div class="tpl-panel">
                <!-- Scroll container (must scroll if contents exceed menu height) -->
                <div class="tpl-panel-scroll">
                  <!-- Status -->
                  <p v-if="loading" class="tpl-muted">Loading textbooks…</p>
                  <p v-else-if="error" class="tpl-error">{{ error }}</p>
                  <p v-else-if="sortedTextbooks.length === 0" class="tpl-muted tpl-center">
                    No textbooks found.
                  </p>

                  <section v-else class="tpl-section" aria-label="Textbook list">
                    <header v-if="showSectionTitleComputed" class="tpl-section-head">
                      <h2 class="tpl-section-title">Textbooks</h2>
                      <span class="tpl-section-count">({{ sortedTextbooks.length }})</span>
                    </header>

                    <ul class="tpl-list">
                      <li v-for="tb in sortedTextbooks" :key="tb.id">
                        <button type="button" class="tpl-pill" @click="openTextbook(tb)" :title="tb.title">
                          <!-- Icon bubble with cover or initial -->
                          <span class="tpl-icon-wrap">
                            <img v-if="!isBroken(tb.id) && coverUrl(tb)" class="tpl-icon" :src="coverUrl(tb)!"
                              :alt="tb.title" loading="lazy" decoding="async" @error.stop="() => markBroken(tb.id)" />
                            <span v-else class="tpl-icon-fallback">
                              {{ tb.title?.charAt(0)?.toUpperCase() || '?' }}
                            </span>
                          </span>

                          <!-- Main text + meta -->
                          <span class="tpl-pill-main">
                            <span class="tpl-pill-title">
                              {{ tb.title }}
                            </span>

                            <span class="tpl-pill-meta">
                              <span v-if="seriesOnly(tb)" class="tpl-pill-meta-item">
                                {{ seriesOnly(tb) }}
                              </span>
                              <span v-if="tb.year" class="tpl-pill-meta-item tpl-pill-meta-year">
                                {{ tb.year }}
                              </span>
                              <span class="tpl-pill-meta-item tpl-pill-meta-level">
                                {{ levelLabel(tb) }}
                              </span>
                            </span>
                          </span>

                          <!-- Deck / card count chips -->
                          <span class="tpl-pill-chips">
                            <span v-if="typeof tb.deck_count === 'number'" class="tpl-chip">
                              📚 {{ tb.deck_count }}
                            </span>
                            <span v-if="typeof tb.unique_card_count === 'number'" class="tpl-chip">
                              🃏 {{ tb.unique_card_count }}
                            </span>
                          </span>
                        </button>
                      </li>
                    </ul>
                  </section>
                  <!-- Custom Deck Button -->
                  <section class="cd-centered">
                    <CustomDeckButton />
                  </section>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </template>

      <!-- INLINE MODE (original) -->
      <template v-else>
        <!-- Status -->
        <p v-if="loading" class="tpl-muted">Loading textbooks…</p>
        <p v-else-if="error" class="tpl-error">{{ error }}</p>
        <p v-else-if="sortedTextbooks.length === 0" class="tpl-muted tpl-center">
          No textbooks found.
        </p>

        <section v-else class="tpl-section" aria-label="Textbook list">
          <header v-if="showSectionTitleComputed" class="tpl-section-head">
            <h2 class="tpl-section-title">Textbooks</h2>
            <span class="tpl-section-count">({{ sortedTextbooks.length }})</span>
          </header>

          <ul class="tpl-list">
            <li v-for="tb in sortedTextbooks" :key="tb.id">
              <button type="button" class="tpl-pill" @click="openTextbook(tb)" :title="tb.title">
                <span class="tpl-icon-wrap">
                  <img v-if="!isBroken(tb.id) && coverUrl(tb)" class="tpl-icon" :src="coverUrl(tb)!" :alt="tb.title"
                    loading="lazy" decoding="async" @error.stop="() => markBroken(tb.id)" />
                  <span v-else class="tpl-icon-fallback">
                    {{ tb.title?.charAt(0)?.toUpperCase() || '?' }}
                  </span>
                </span>

                <span class="tpl-pill-main">
                  <span class="tpl-pill-title">
                    {{ tb.title }}
                  </span>

                  <span class="tpl-pill-meta">
                    <span v-if="seriesOnly(tb)" class="tpl-pill-meta-item">
                      {{ seriesOnly(tb) }}
                    </span>
                    <span v-if="tb.year" class="tpl-pill-meta-item tpl-pill-meta-year">
                      {{ tb.year }}
                    </span>
                    <span class="tpl-pill-meta-item tpl-pill-meta-level">
                      {{ levelLabel(tb) }}
                    </span>
                  </span>
                </span>

                <span class="tpl-pill-chips">
                  <span v-if="typeof tb.deck_count === 'number'" class="tpl-chip">
                    📚 {{ tb.deck_count }}
                  </span>
                  <span v-if="typeof tb.unique_card_count === 'number'" class="tpl-chip">
                    🃏 {{ tb.unique_card_count }}
                  </span>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { withLoading } from '@/utils/withLoading'
import CustomDeckButton from '@/components/CustomDeckButton.vue'

type Textbook = {
  id: string
  title: string
  slug?: string | null
  series?: string | null
  year?: number | string | null
  tags?: string[] | null
  cover_image_url?: string | null
  deck_count?: number | null
  unique_card_count?: number | null
}


const props = withDefaults(
  defineProps<{
    // existing
    showSectionTitle?: boolean

    // dropdown API
    variant?: 'inline' | 'dropdown'
    buttonText?: string
    startOpen?: boolean
    closeOnSelect?: boolean
    showCountsInButton?: boolean
  }>(),
  {
    showSectionTitle: true,

    variant: 'inline',
    buttonText: 'Textbooks',
    startOpen: false,
    closeOnSelect: true,
    showCountsInButton: false
  }
)

const BUCKET = 'public-assets'
const router = useRouter()

/* ─────────────────────────────────────────────────────────────
   Dropdown state + positioning (teleport)
───────────────────────────────────────────────────────────── */
const variantComputed = computed(() => props.variant ?? 'inline')
const buttonTextComputed = computed(() => props.buttonText ?? 'Textbooks')
const showCountsInButtonComputed = computed(() => !!props.showCountsInButton)
const showSectionTitleComputed = computed(() => !!props.showSectionTitle)

const isOpen = ref<boolean>(!!props.startOpen)
const panelId = `tpl-panel-${Math.random().toString(36).slice(2, 10)}`

const wrapEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLElement | null>(null)

const popStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
  width: '320px'
})

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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function updatePosition() {
  const trigger = triggerEl.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  const preferredWidth = Math.max(280, rect.width)
  const maxWidth = Math.min(420, vw - 16)
  const w = clamp(preferredWidth, 280, maxWidth)

  let left = rect.left
  left = clamp(left, 8, vw - w - 8)

  // Drop directly below the button
  let top = rect.bottom + 8

  // If near bottom, flip upward if possible
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

onBeforeUnmount(() => {
  removeGlobalListeners()
})

/* ─────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────── */
const loading = ref(true)
const error = ref<string | null>(null)
const allTextbooks = ref<Textbook[]>([])

/* Broken cover tracking (icons) */
const brokenIds = reactive(new Set<string>())
const isBroken = (id: string) => brokenIds.has(id)
const markBroken = (id: string) => brokenIds.add(id)

/* Data helpers */
function isHttpUrl(s?: string | null): boolean {
  return !!s && /^https?:\/\//i.test(s)
}

function resolvePublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl || ''
}

function coverUrl(tb: Textbook): string | '' {
  const raw = tb.cover_image_url || ''
  if (!raw) return ''
  return isHttpUrl(raw) ? raw : resolvePublicUrl(String(raw))
}

function seriesOnly(tb: Textbook): string {
  return tb.series ? String(tb.series) : ''
}

function levelLabel(tb: Textbook): string {
  const tags = (tb.tags || []).map(t => String(t).toUpperCase().trim())
  if (tags.includes('ES')) return '小学校'
  if (tags.includes('JHS')) return '中学校'
  if (tags.includes('HS')) return '高校'
  return '他'
}

const sortedTextbooks = computed(() => {
  const books = [...allTextbooks.value]
  const sorter = (a: Textbook, b: Textbook) => {
    const sa = `${a.series || ''}${a.year || ''}${a.title}`
    const sb = `${b.series || ''}${b.year || ''}${b.title}`
    return sa.localeCompare(sb, undefined, { numeric: true })
  }
  books.sort(sorter)
  return books
})

async function loadTextbooks() {
  loading.value = true
  error.value = null
  try {
    const { data: tbs, error: err1 } = await supabase
      .from('textbooks')
      .select('id, title, slug, series, year, tags, cover_image_url')
      .order('title', { ascending: true })

    if (err1) throw err1

    const { data: counts, error: err2 } = await supabase
      .from('v_textbook_deck_card_totals')
      .select('textbook_id, deck_count, unique_card_count')

    if (err2) throw err2

    const map = new Map<string, { deck_count: number | null; unique_card_count: number | null }>()
    for (const r of counts || []) {
      const k = (r as any).textbook_id ?? (r as any).id ?? (r as any).textbook_uuid
      if (!k) continue
      map.set(String(k), {
        deck_count: (r as any).deck_count ?? null,
        unique_card_count: (r as any).unique_card_count ?? null
      })
    }

    allTextbooks.value = (tbs || []).map(tb => {
      const c = map.get(tb.id) || { deck_count: null, unique_card_count: null }
      return { ...tb, ...c }
    }) as Textbook[]
  } catch (e: any) {
    console.error(e)
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

function openTextbook(tb: Textbook) {
  if (variantComputed.value === 'dropdown' && props.closeOnSelect) close()
  router.push({ name: 'textbook_details', params: { id: tb.id } })
}

onMounted(async () => {
  await withLoading(async () => {
    await loadTextbooks()
  }, 150)

  if (variantComputed.value === 'dropdown' && isOpen.value) {
    await nextTick()
    updatePosition()
    addGlobalListeners()
  }
})
</script>

<style scoped>
/* =========================
   Root container
   ========================= */
.tpl-root {
  width: 100%;
  color: var(--textbook-on-surface);
}

.tpl-inner {
  padding: 0.4rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tpl-root--dropdown .tpl-inner {
  padding: 0;
  gap: 0;
}

/* Text utilities */
.tpl-muted {
  color: var(--main-text-soft);
  font-size: 0.9rem;
}

.tpl-error {
  color: var(--accent-danger);
  font-weight: 600;
}

.tpl-center {
  text-align: center;
}

/* =========================
   Dropdown trigger (match ActivityPillList style)
   ========================= */
.tpl-trigger {
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

.tpl-trigger:hover {
  transform: translateY(-1px);
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}

.tpl-trigger--open {
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}

.tpl-trigger-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tpl-trigger-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-trigger-count {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 900;
  color: color-mix(in srgb, var(--header-btn-text-hover) 65%, var(--header-btn-text) 35%);
}

.tpl-trigger-caret {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 10px;

  color: var(--header-btn-text, var(--header-on-surface));
  transition: transform 0.18s ease;
}

.tpl-trigger--open .tpl-trigger-caret {
  transform: rotate(180deg);
}

/* =========================
   Teleported layer + animation
   ========================= */
.tpl-pop-layer {
  position: fixed;
  z-index: 9999;
  /* left/top/width are set inline via popStyle */
}

/* scaleY animation anchored at top */
.tpl-pop-enter-active,
.tpl-pop-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
  transform-origin: top center;
  will-change: transform, opacity;
}

.tpl-pop-enter-from,
.tpl-pop-leave-to {
  transform: scaleY(0);
  opacity: 0;
}

.tpl-pop-enter-to,
.tpl-pop-leave-from {
  transform: scaleY(1);
  opacity: 1;
}

/* Panel container */
.tpl-panel {
  border-radius: var(--radius-lg);
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  box-shadow: var(--modal-shadow);

  overflow: hidden;
  /* hard cap so content never grows beyond the menu */
  max-height: min(70vh, 520px);
}

/* THIS is the scroll area */
.tpl-panel-scroll {
  padding: 10px;
  overflow: auto;
  max-height: min(70vh, 520px);
}

/* Section card */
.tpl-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  border-radius: var(--radius-lg);
  border: 2px solid var(--header-border-color);
  background: var(--header-surface);
  box-shadow: var(--header-shadow);
  padding: 0.55rem 0.6rem 0.65rem;
}

/* Section header */
.tpl-section-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0 0.15rem 0.1rem;
}

.tpl-section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--header-on-surface);
}

.tpl-section-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--main-text-soft);
}

/* =========================
   Vertical list + pills
   ========================= */
.tpl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tpl-pill {
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

.tpl-pill:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
  border-color: color-mix(in srgb, var(--accent-primary) 60%, var(--textbook-border) 40%);
}

.tpl-pill:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* Icon bubble */
.tpl-icon-wrap {
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

.tpl-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tpl-icon-fallback {
  font-weight: 800;
  font-size: 1rem;
  color: var(--textbook-on-surface);
}

/* Pill content */
.tpl-pill-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.tpl-pill-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 800;
}

.tpl-pill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  font-size: 0.78rem;
}

.tpl-pill-meta-item {
  color: var(--main-text-soft);
}

.tpl-pill-meta-year {
  font-weight: 900;
  color: var(--textbook-on-surface);
}

.tpl-pill-meta-level {
  font-weight: 700;
  letter-spacing: 0.03em;
}

/* Deck / card count chips on right */
.tpl-pill-chips {
  flex: 0 0 auto;
  display: inline-flex;
  flex-direction: column;
  gap: 0.18rem;
  align-items: flex-end;
}

.tpl-chip {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--textbook-chip-on);
  background: var(--textbook-chip-bg);
  border: 1px solid var(--textbook-border);
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}

/* Custom Deck Button styling */
.cd-centered {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    /* Small, consistent vertical spacing between sections */
    margin: 0.35rem 0;
    padding: 0.35rem 0;
}


/* Reduced motion */
@media (prefers-reduced-motion: reduce) {

  .tpl-trigger,
  .tpl-trigger:hover,
  .tpl-pop-enter-active,
  .tpl-pop-leave-active,
  .tpl-pill {
    transition: none !important;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .tpl-inner {
    padding: 0.35rem 0;
  }

  .tpl-root--dropdown .tpl-inner {
    padding: 0;
  }

  .tpl-section {
    padding: 0.45rem 0.5rem 0.55rem;
  }

  .tpl-pill {
    padding: 0.35rem 0.6rem 0.35rem 0.35rem;
    font-size: 0.9rem;
  }

  .tpl-icon-wrap {
    width: 1.9rem;
    height: 1.9rem;
  }

  .tpl-section-title {
    font-size: 0.9rem;
  }

  .tpl-section-count {
    font-size: 0.8rem;
  }
}
</style>
