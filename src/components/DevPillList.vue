<!-- src/components/DevPillList.vue -->
<template>
  <section
    v-if="isDev"
    class="dpl-root"
    :class="{ 'dpl-root--dropdown': variantComputed === 'dropdown' }"
  >
    <div class="dpl-inner" ref="wrapEl">
      <template v-if="variantComputed === 'dropdown'">
        <button
          ref="triggerEl"
          type="button"
          class="dpl-trigger"
          :class="{ 'dpl-trigger--open': isOpen }"
          @click="toggleOpen"
          :aria-expanded="isOpen"
          :aria-controls="panelId"
        >
          <span class="dpl-trigger-left">
            <span class="dpl-trigger-text">{{ buttonTextComputed }}</span>
            <span v-if="showCountsInButtonComputed" class="dpl-trigger-count">
              ({{ devLinks.length }})
            </span>
          </span>

          <span class="dpl-trigger-caret" aria-hidden="true">
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
          <Transition name="dpl-pop">
            <div
              v-if="isOpen"
              class="dpl-pop-layer"
              :style="popStyle"
              :id="panelId"
              role="dialog"
              aria-modal="false"
            >
              <div class="dpl-panel">
                <div class="dpl-panel-scroll">
                  <section class="dpl-section" aria-label="Developer tools">
                    <header v-if="showSectionTitleComputed" class="dpl-section-head">
                      <h2 class="dpl-section-title">Developer Tools</h2>
                      <span class="dpl-section-count">({{ devLinks.length }})</span>
                    </header>

                    <ul class="dpl-list">
                      <li v-for="link in devLinks" :key="link.to">
                        <button
                          type="button"
                          class="dpl-pill"
                          @click="openLink(link.to)"
                          :title="link.label"
                        >
                          <span class="dpl-icon-wrap">
                            <span class="dpl-icon-fallback">
                              {{ link.icon }}
                            </span>
                          </span>

                          <span class="dpl-pill-main">
                            <span class="dpl-pill-title">
                              {{ link.label }}
                            </span>
                          </span>

                          <span
                            v-if="link.key === 'comments' && pendingCommentsCount > 0"
                            class="dpl-notice-badge"
                            :aria-label="`${pendingCommentsCountDisplay} pending comments`"
                          >
                            {{ pendingCommentsCountDisplay }}
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
        <section class="dpl-section" aria-label="Developer tools">
          <header v-if="showSectionTitleComputed" class="dpl-section-head">
            <h2 class="dpl-section-title">Developer Tools</h2>
            <span class="dpl-section-count">({{ devLinks.length }})</span>
          </header>

          <ul class="dpl-list">
            <li v-for="link in devLinks" :key="link.to">
              <button
                type="button"
                class="dpl-pill"
                @click="openLink(link.to)"
                :title="link.label"
              >
                <span class="dpl-icon-wrap">
                  <span class="dpl-icon-fallback">
                    {{ link.icon }}
                  </span>
                </span>

                <span class="dpl-pill-main">
                  <span class="dpl-pill-title">
                    {{ link.label }}
                  </span>
                </span>

                <span
                  v-if="link.key === 'comments' && pendingCommentsCount > 0"
                  class="dpl-notice-badge"
                  :aria-label="`${pendingCommentsCountDisplay} pending comments`"
                >
                  {{ pendingCommentsCountDisplay }}
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
import { useUserStore } from '@/stores/users'

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
    buttonText: 'Dev',
    startOpen: false,
    closeOnSelect: true,
    showCountsInButton: false
  }
)

const router = useRouter()
const auth = useUserStore()

const isDev = computed(() => auth.isDev)

const devLinks = [
  { key: 'users', label: 'Users', to: '/users', icon: '👤' },
  { key: 'comments', label: 'Comments', to: '/comment-moderation', icon: '💬' }
]

const pendingCommentsCount = ref(0)
const pendingCommentsCountDisplay = computed(() => {
  return pendingCommentsCount.value > 99 ? '99+' : String(pendingCommentsCount.value)
})

const variantComputed = computed(() => props.variant ?? 'inline')
const buttonTextComputed = computed(() => props.buttonText ?? 'Dev')
const showCountsInButtonComputed = computed(() => !!props.showCountsInButton)
const showSectionTitleComputed = computed(() => !!props.showSectionTitle)

const isOpen = ref<boolean>(!!props.startOpen)
const panelId = `dpl-panel-${Math.random().toString(36).slice(2, 10)}`

const wrapEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLElement | null>(null)

const popStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
  width: '320px'
})

let commentsChannel: ReturnType<typeof supabase.channel> | null = null

async function loadPendingCommentsCount() {
  if (!isDev.value) {
    pendingCommentsCount.value = 0
    return
  }

  const { data, error } = await supabase.rpc('get_pending_vn_comments_count')

  if (error) {
    console.error('Failed to load pending comments count:', error)
    return
  }

  pendingCommentsCount.value = Number(data ?? 0)
}

function setupCommentsRealtime() {
  if (!isDev.value || commentsChannel) return

  commentsChannel = supabase
    .channel('dev-pill-pending-comments')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'visual_novel_comments'
      },
      async () => {
        await loadPendingCommentsCount()
      }
    )
    .subscribe()
}

function teardownCommentsRealtime() {
  if (!commentsChannel) return
  supabase.removeChannel(commentsChannel)
  commentsChannel = null
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

function openLink(to: string) {
  if (variantComputed.value === 'dropdown' && props.closeOnSelect) close()
  router.push(to)
}

onMounted(async () => {
  if (isDev.value) {
    await loadPendingCommentsCount()
    setupCommentsRealtime()
  }
})

onBeforeUnmount(() => {
  removeGlobalListeners()
  teardownCommentsRealtime()
})
</script>

<style scoped>
.dpl-root {
  width: 100%;
  color: var(--textbook-on-surface);
}

.dpl-inner {
  padding: 0.4rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dpl-root--dropdown .dpl-inner {
  padding: 0;
  gap: 0;
}

.dpl-trigger {
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

.dpl-trigger:hover {
  transform: translateY(-1px);
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}

.dpl-trigger--open {
  background-color: var(--header-btn-hover);
  color: var(--header-btn-text-hover);
  background-size: 100% 100%;
}

.dpl-trigger-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dpl-trigger-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dpl-trigger-count {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 900;
  color: color-mix(in srgb, var(--header-btn-text-hover) 65%, var(--header-btn-text) 35%);
}

.dpl-trigger-caret {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 10px;
  color: var(--header-btn-text, var(--header-on-surface));
  transition: transform 0.18s ease;
}

.dpl-trigger--open .dpl-trigger-caret {
  transform: rotate(180deg);
}

.dpl-pop-layer {
  position: fixed;
  z-index: 9999;
}

.dpl-pop-enter-active,
.dpl-pop-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
  transform-origin: top center;
  will-change: transform, opacity;
}

.dpl-pop-enter-from,
.dpl-pop-leave-to {
  transform: scaleY(0);
  opacity: 0;
}

.dpl-pop-enter-to,
.dpl-pop-leave-from {
  transform: scaleY(1);
  opacity: 1;
}

.dpl-panel {
  border-radius: var(--radius-lg);
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  box-shadow: var(--modal-shadow);
  overflow: hidden;
  max-height: min(70vh, 520px);
}

.dpl-panel-scroll {
  padding: 10px;
  overflow: auto;
  max-height: min(70vh, 520px);
}

.dpl-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  border-radius: var(--radius-lg);
  border: 2px solid var(--header-border-color);
  background: var(--header-surface);
  box-shadow: var(--header-shadow);
  padding: 0.55rem 0.6rem 0.65rem;
}

.dpl-section-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0 0.15rem 0.1rem;
}

.dpl-section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--header-on-surface);
}

.dpl-section-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--main-text-soft);
}

.dpl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dpl-pill {
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

.dpl-pill:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
  border-color: color-mix(in srgb, var(--accent-primary) 60%, var(--textbook-border) 40%);
}

.dpl-pill:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.dpl-icon-wrap {
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

.dpl-icon-fallback {
  font-weight: 800;
  font-size: 1rem;
  color: var(--textbook-on-surface);
}

.dpl-pill-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.dpl-pill-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 800;
}

.dpl-notice-badge {
  flex: 0 0 auto;
  min-width: 1.45rem;
  height: 1.45rem;
  padding: 0 0.38rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #d92d20;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--textbook-surface) 75%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .dpl-trigger,
  .dpl-trigger:hover,
  .dpl-pop-enter-active,
  .dpl-pop-leave-active,
  .dpl-pill {
    transition: none !important;
  }
}

@media (max-width: 640px) {
  .dpl-inner {
    padding: 0.35rem 0;
  }

  .dpl-root--dropdown .dpl-inner {
    padding: 0;
  }

  .dpl-section {
    padding: 0.45rem 0.5rem 0.55rem;
  }

  .dpl-pill {
    padding: 0.35rem 0.6rem 0.35rem 0.35rem;
    font-size: 0.9rem;
  }

  .dpl-icon-wrap {
    width: 1.9rem;
    height: 1.9rem;
  }

  .dpl-section-title {
    font-size: 0.9rem;
  }

  .dpl-section-count {
    font-size: 0.8rem;
  }

  .dpl-notice-badge {
    min-width: 1.35rem;
    height: 1.35rem;
    font-size: 0.68rem;
  }
}
</style>